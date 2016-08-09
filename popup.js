//clear badge off of extension icon to show new posts have been viewed
chrome.browserAction.setBadgeText({text: ''});
var posts = [];
var unreadCount;
var isNewSubreddit = false;
var newSubreddit;
var errorText = false;
var switchFrontPage = true;

//initializes popup window with formatted posts queued up in background.js
function init(response) {
	posts = response.frontPage;
	var newPostsPresent = response.areNewPosts;
	unreadCount = response.unread;

	var list = document.getElementById('container'); //div tag to be populated
	//incrementally load reddit posts to div container in popup.html
	for(var i=0;i < posts.length; i++) {
		var cur_child = posts[i];
		var img_url = cur_child.data.url;
		var entry = document.createElement('div'); //entire post
		//adds animation to new posts
		if(newPostsPresent && unreadCount > 0) {
			entry.className = 'new_post';
			//only queue up animation once
			if(i == 0) {
				//animation fires once full page is loaded
				$(document).ready(function() {
					$(".new_post").animate({backgroundColor: "#FFFFFF"}, 1500);
				});
			}
			unreadCount--;
		} else {
			entry.className = 'post';
		}
		//check if link contains image next to it
		if(img_url.endsWith(".jpg") || img_url.endsWith(".png") 
			|| img_url.endsWith(".gifv") || img_url.endsWith(".gif")) {
			//if link is a gif, need to use thumbnail instead of image
			if(img_url.endsWith(".gifv" || ".gif")) { 
				img_url = cur_child.data.thumbnail;
			} 
			var image = document.createElement('img'); image.className = 'image';
			image.src = img_url; image.height = 50; image.width = 60;
			entry.appendChild(image); 
		}
		//check if post is self post 
		else if(img_url.includes("www.reddit.com")) {
			img_url = "assets/images/self.png"
			var image = document.createElement('img'); image.className = 'image';
			image.src = img_url; image.height = 50; image.width = 60;
			var image_div = document.createElement('div');
			image_div.appendChild(image);
			entry.appendChild(image_div); 
		}
		//if post isn't image or self, doesn't need thumbnail

		var text_container = document.createElement('div');
		text_container.className = 'text_container';

		var title = getPostTitle(cur_child);
		var postInfo = getPostInfo(cur_child)

		//append hierarchy of tags
		text_container.appendChild(title);
		text_container.appendChild(postInfo);
		entry.appendChild(text_container);
		list.appendChild(entry);
	}
}

//on popup open
window.onload = function() {
	if(!isNewSubreddit) {
		//initialize reddit with current background state of posts
		chrome.runtime.sendMessage({isNew : isNewSubreddit}, function(response) {
			//display reset to front if background state is not on front page
			if(response.isNotFront) {
				createResetToFront();
			}
			init(response);
		});
	}
	document.getElementById('iform').onsubmit = function(event) {
		return false; //stops form from reloading page
	};
	//initialize reddit with form input
	document.getElementById('iform').onkeydown = function(event) {
		if(event.keyCode == 13) {
			//display link to return to front page (only once)
			if(switchFrontPage) {
				createResetToFront();
			}
			isNewSubreddit = true;
			newSubreddit = document.getElementById('subreddit').value;
			document.getElementById('container').innerHTML = ''; //clear window of posts
			//send message to load new subreddit and initialize window with new info
			chrome.runtime.sendMessage({
					isNew: isNewSubreddit, subreddit: newSubreddit} , function(response) {
				if(response.invalid && !errorText) { //display error text
					var error = document.createElement('div'); error.id = 'error';
					error.appendChild(document.createTextNode('Please submit a valid subreddit name'));
					document.getElementById('title').appendChild(error);
					errorText = true;
				} else if(!response.invalid && errorText) { //remove error text and init
					document.getElementById('title').removeChild(document.getElementById('error'));
					errorText = false;
					init(response); 
				} else if(!response.invalid) { //init
					init(response);
				}
			});
		}
	};
}
//displays reset option below change subreddit form
function createResetToFront() {
	var reset = document.createElement('span'); reset.id = 'reset';
	reset.onclick = resetToFront; 
	reset.appendChild(document.createTextNode('Return to front page'));
	title.appendChild(reset);
	switchFrontPage = false;
}
//reset window to front page
function resetToFront(event) {
	//remove error text if present
	if(errorText) {
		document.getElementById('title').removeChild(document.getElementById('error'));
		errorText = false;
	}
	//send message to get front page
	chrome.runtime.sendMessage({reset: true}, function(response) {
		document.getElementById('title').removeChild(document.getElementById('reset'));
		document.getElementById('container').innerHTML = ''; //clear window of posts
		init(response);
		switchFrontPage = true;
	});
}

function getPostTitle(post) {
	var titleContainer = document.createElement('div'); titleContainer.className = 'title_container';;
	//create title and link of post 
	var titleLink = document.createElement('a');
	titleLink.href = post.data.url; titleLink.target = '_blank';
	var titleText = document.createTextNode(post.data.title);
	titleLink.appendChild(titleText);
	//create origin link
	var originText = parseOriginLink(post.data.url);
	var originLink = document.createElement('a'); originLink.target = '_blank';
	originLink.className = 'origin';
	originLink.href = 'https://www.reddit.com/domain/' + originText;
	originLink.appendChild(document.createTextNode(originText));

	titleContainer.appendChild(titleLink);
	titleContainer.appendChild(document.createTextNode('   ('));
	titleContainer.appendChild(originLink);
	titleContainer.appendChild(document.createTextNode(')'));
	return titleContainer;
}

function parseOriginLink(link) {
	//remove https://
	var pos1 = link.search('/');
	link = link.slice(pos1+2);
	//remove everything past first forward slash
	var pos2 = link.search('/');
	link = link.slice(0, pos2);
	return link;
}

function getPostInfo(post) {
	var post_info = document.createElement('div'); post_info.className = 'post_info';

	//get amount of hours since post was submitted
	var currentTime = new Date().getTime();
	var postTime = post.data.created_utc;
	var hoursAgo = document.createTextNode(Math.floor((Math.floor(currentTime / 1000) 
														- postTime) / 3600));
	//get subreddit that post was submitted to
	var subredditText = post.data.subreddit;
	var subredditLink = document.createElement('a'); subredditLink.className = 'info';
	subredditLink.href = 'https://www.reddit.com/r/' + subredditText; subredditLink.target = '_blank';
	subredditLink.appendChild(document.createTextNode(subredditText));
	//get link to user that submitted post
	var userText = post.data.author;
	var userLink = document.createElement('a'); userLink.className = 'info';
	userLink.href = 'https://www.reddit.com/user/' + userText; userLink.target = '_blank';
	userLink.appendChild(document.createTextNode(userText));
	//get link to comment section of post
	var commentNum = post.data.num_comments;
	var commentLink = document.createElement('a'); commentLink.className = 'comment';
	commentLink.href = 'https://www.reddit.com' + post.data.permalink; commentLink.target = '_blank';
	commentLink.appendChild(document.createTextNode(commentNum + ' comments'));
	//create text nodes
	var info1 = document.createTextNode('submitted ');
	var info2 = document.createTextNode(' hours ago by '); 
	var info3 = document.createTextNode(' to ');
	var info4 = document.createElement('br');

	//append info to div
	post_info.appendChild(info1); post_info.appendChild(hoursAgo);
	post_info.appendChild(info2); post_info.appendChild(userLink);
	post_info.appendChild(info3); post_info.appendChild(subredditLink);
	post_info.appendChild(info4); post_info.appendChild(commentLink);

	return post_info;
}