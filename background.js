var fetchFreq = 10000;
var unreadCount = 0;
var posts;
var xhr;
var newPostsFound = true;

function getPosts() {
	console.log('getposts reached.')
	//begin arraysynchronous xhr
	xhr = new XMLHttpRequest();
	xhr.onload = function() {
		if(xhr.readyState == 4 && xhr.status == 200) {
			processJSON();
		}
	}
	xhr.open("GET", 'https://www.reddit.com/.json', true);
	xhr.send(null);
}

//used in array.sort() to sort posts by their date created
function comparePosts(a, b) {
	return Number(a.data.created) - Number(b.data.created); 
}

function checkNewPosts(newList) {
	//if this is the first xhr request
	if(posts == null) {
		unreadCount += newList.length;
		newPostsFound = false;
		return newList;
	} else {
		var numNewPosts = 0;
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
				var count = 0;
				for(var j=0; j < posts.length; j++) {
					//compare every post in newList to posts 
					if(sortedNew[i].data.created == sortedPosts[j].data.created) {
						count++;
					}
				}
				//if count is not equal to posts.length (25), a new post has been found
				if(!(count == posts.length)) {
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
					numNewPosts++;
				}
			}
			newPostsFound = true;
			unreadCount = numNewPosts;
		} else {
			unreadCount = 0;
			newPostsFound = false;
		}
		//return changed/unchanged newList
		return newListSave;
	}
}

function processJSON() {
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

	//update badge to display number of unread posts
	if(unreadCount > 0) {
		chrome.browserAction.setBadgeBackgroundColor({
			color: [255, 0, 0, 255]
		});
		chrome.browserAction.setBadgeText({text: '' + unreadCount});
	}
	posts = newList;
}

getPosts();
//run getPosts() every 10000ms
setInterval(getPosts, fetchFreq);

//receive message from popup.js and send back updated reddit front page
chrome.runtime.onMessage.addListener(function(response, sender, sendResponse) {
	//set unread back to 0 when popup is opened
	unreadCount = response;
	//send back posts array, true/false if there's new posts, and number of unread posts
	sendResponse({frontPage: posts, areNewPosts: newPostsFound, unread: unreadCount});
});