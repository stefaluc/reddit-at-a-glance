function init() {
	chrome.browserAction.setBadgeText({text: ''});
	var posts = [];
	var unreadCount = 0;

	chrome.runtime.sendMessage(unreadCount, function(response) {
		posts = response.frontPage;
		var newPostsPresent = response.areNewPosts;
		unreadCount = response.unread;

		var list = document.getElementById('front_page');
		for(var i=0;i < posts.length; i++) {
			var cur_child = posts[i];
			var img_url = cur_child.data.url;
			var entry = document.createElement('li'); //entire post
			//adds animation to new posts
			if(newPostsPresent && unreadCount > 0) {
				entry.id = 'new_post';
				unreadCount--;
			}
			//check if link contains image next to it
			if(img_url.endsWith(".jpg") || img_url.endsWith(".png") 
				|| img_url.endsWith(".gifv") || img_url.endsWith(".gif")) {
				//if link is a gif, need to use thumbnail instead of image
				if(img_url.endsWith(".gifv" || ".gif")) { 
					img_url = cur_child.data.thumbnail;
				} 
				var image = document.createElement('img');
				image.src = img_url; image.height = 50; image.width = 60;
				entry.appendChild(image); 
			}
			//check if post is self post 
			else if(img_url.includes("www.reddit.com")) {
				img_url = "assets/images/self.png"
				var image = document.createElement('img');
				image.src = img_url; image.height = 50; image.width = 60;
				var image_div = document.createElement('div');
				image_div.appendChild(image);
				entry.appendChild(image_div); 
			}
			//if post isn't image or self, doesn't need thumbnail

			//create title of post and link to comment section
			var title_link = document.createElement('a');
			title_link.href = 'https://www.reddit.com' + cur_child.data.permalink;
			title_link.target = '_blank';
			var title_text = document.createTextNode(cur_child.data.title);

			//append heirarchy of tags
			title_link.appendChild(title_text);
			entry.appendChild(title_link);
			list.appendChild(entry);
		}
	});
	/*chrome.extension.onConnect.addListener(function(port) {
		console.log("Connected .....");
		port.onMessage.addListener(function(msg, response) {
		    console.log("message recieved"+ msg);
		    port.postMessage(unreadCount);
			posts = response;
		  });
	});*/
}

window.onload = function() {
	init();
}