var addTabButton = document.getElementById("add-tab-button");

addTabButton.addEventListener("click", function (e) {
	var newTab = currentTask.tabs.add({}, currentTask.tabs.getIndex(currentTask.tabs.getSelected()) + 1);
	addTab(newTab);
});
