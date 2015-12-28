var addTabButton = $(".add-tab");

addTabButton.on("click", function (e) {
	var newTab = tabs.add({}, tabs.getIndex(tabs.getSelected()) + 1);
	addTab(newTab);
});
