var fetchFreq = 20000;        // (20000ms) interval to check for new posts at
var unreadCount = 0;          // updates extension badge
var xhr;                      // xmlhttprequest object
var newPostsFound = true;     // sent to popup.html to identify when posts has been updated
var posts;                    // array of front page's json data most recently loaded
var backgroundPostsSave;      // array of json data to store front page with new posts first
var currentSubreddit = null;  // value of subreddit that is currently loaded, null is the front page
var invalidSubreddit = false; // set to true when user inputs invalid input into form

getPosts();                       // initial getPosts() run to setup front page
setInterval(getPosts, fetchFreq); // run getPosts() every 10000ms

//receive message from popup.js and send back updated reddit front page
chrome.runtime.onMessage.addListener(function(response, sender, sendResponse) {
	if(response.isNew || response.reset) {
		unreadCount = 0;
		invalidSubreddit = false; //set to false until we know it isn't
		posts = null;
		if(response.isNew) {
			currentSubreddit = response.subreddit; //sets popup to user form input
		} else { 
			currentSubreddit = null; //sets popup back to front page
		}
		getPosts(currentSubreddit, sendResponse);
		return true; //call sendResponse asychronously
	}
	if(newPostsFound && !response.isNew) {	
		//update posts to display new found posts first
		posts = backgroundPostsSave;
	}
	//send back posts array, true/false if there's new posts, and number of unread posts
	sendResponse({
		frontPage: posts, 
		areNewPosts: newPostsFound, 
		unread: unreadCount,
		isNotFront: currentSubreddit
	});
	//set unread back to 0 when popup is opened
	unreadCount = 0;
});

function getPosts(sendResponse) {
	xhrRequest(currentSubreddit, sendResponse);
}

function xhrRequest(subreddit, sendResponse) {
	//don't bother doing xhr if request is invalid
	if(invalidSubreddit) {
		return;
	}
	//begin asynchronous xhr
	xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if(xhr.readyState == 4) {
			if(xhr.status == 200) {
				processJSON(sendResponse);
			} else {
				invalidSubreddit = true;
				sendResponse({invalid: true});
				return;
			}
		}
	}
	if(currentSubreddit == null) {
		xhr.open("GET", 'https://www.reddit.com/.json', true);
	} else {
		xhr.open("GET", 'https://www.reddit.com/r/'+subreddit+'/.json', true);
	}
	xhr.send(null);
	return xhr;
}

function processJSON(sendResponse) {
	/* create JSON file from xhr request. JSON follows levels of:
	 * json
	 * -- data
	 * ---- children[0]
	 * ------ data
	 * -------- attributes
	 * -------- attributes
	 * ---- children[1]
	 */
	var resp = JSON.parse(xhr.responseText);

	var newList = resp.data.children;

	//update list if there's new posts present
	newList = checkNewPosts(newList);

	//update badge to display number of unread posts (except on subreddit change)
	if(unreadCount > 0 && sendResponse == null) {
		chrome.browserAction.setBadgeBackgroundColor({
			color: [255, 0, 0, 255]
		});
		chrome.browserAction.setBadgeText({text: '' + unreadCount});
	}
	
	//update current background state of front page
	posts = newList;
	//only sendResponse if new subreddit is being loaded
	if(sendResponse != null) {
		undreadCount = 0;
		sendResponse({
			frontPage: posts,
			areNewPosts: newPostsFound, 
			unread: unreadCount,
			invalid: false
		});
	}
}

function checkNewPosts(newList) {
	//if this is the first xhr request
	if(posts == null) {
		newPostsFound = false; //set to false so new post animation isn't played
		backgroundPostsSave = newList;
		return newList;
	} else {
		var newListSave = [];
		//save ordering of new
		for(var i=0; i<newList.length; i++) {
			newListSave.push(newList[i]);
		}
		var sortedNew = newList.sort(comparePosts);
		var sortedPosts = posts.sort(comparePosts);
		var listsAreSame = true;
		for(var i = 0; i < newList.length; i++) {
			if(sortedNew[i].data.created != sortedPosts[i].data.created) {
				listsAreSame = false;
			}
		}
		//evaluates if a new post is present on the front page
		if(!listsAreSame) {
			for(var i=0; i < newList.length; i++) {
				var matchFound = false;
				for(var j=0; j < posts.length; j++) {
					//compare every post in newList to posts 
					if(sortedNew[i].data.created == sortedPosts[j].data.created) {
						matchFound = true;
						break;
					}
				}
				//if there is no match, a new post has been found
				if(!matchFound) {
					//remove new posts from newList and add them to beginning of list
					var temp = sortedNew[i];
					var tempCount = 0;
					//find the new post from sortedNew in newList
					for(var k=0; k < newListSave.length; k++) {
						if(temp.data.created == newListSave[k].data.created) {
							break;
						}
						tempCount++;
					}
					//remove new post
					newListSave.splice(tempCount, 1);
					//insert new post at beginning
					newListSave.unshift(temp);
					unreadCount++;
					//save the state of posts to display when popup is opened
					backgroundPostsSave = newListSave;
				}
			}
			newPostsFound = true;
		}
		//return changed/unchanged newList
		return newListSave;
	}
}

//used in array.sort() to sort posts by their date created
function comparePosts(a, b) {
	return Number(a.data.created) - Number(b.data.created); 
}