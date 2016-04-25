function addTaskFromOverlay() {
	tasks.setSelected(tasks.add());
	taskOverlay.hide();

	rerenderTabstrip();
	addTab();
}

var overlay = document.getElementById("task-overlay");
var taskContainer = document.getElementById("task-area");
var taskSwitcherButton = document.getElementById("switch-task-button");
var addTaskButton = document.getElementById("add-task");

taskSwitcherButton.addEventListener("click", function () {
	taskOverlay.toggle();
});

addTaskButton.addEventListener("click", function (e) {
	switchToTask(tasks.add());
	taskOverlay.hide();
});

function getTaskOverlayTabElement(tab, task) {

	var item = createSearchbarItem({
		title: tab.title || "New Tab",
		secondaryText: urlParser.removeProtocol(tab.url),
		classList: ["task-tab-item"],
		delete: function () {
			task.tabs.destroy(tab.id);
			destroyWebview(tab.id);

			//if there are no tabs left, remove the task

			if (task.tabs.count() == 0) {
				destroyTask(task.id);
				if (tasks.get().length == 0) {
					addTaskFromOverlay();
				} else {
					//re-render the overlay to remove the task element
					getTaskContainer(task.id).remove();
				}
			}
		},
	});

	item.setAttribute("data-tab", tab.id);

	return item;
}

function getTaskElement(task, taskIndex) {
	var container = document.createElement("div");
	container.className = "task-container";

	container.setAttribute("data-task", task.id);

	var taskActionContainer = document.createElement("div");
	taskActionContainer.className = "task-action-container";

	//add the input for the task name

	var input = document.createElement("input");
	input.classList.add("task-name");

	input.placeholder = "Task " + (taskIndex + 1);

	input.value = task.name || "Task " + (taskIndex + 1);

	input.addEventListener("keyup", function (e) {
		if (e.keyCode == 13) {
			this.blur();
		}

		tasks.get(task.id).name = this.value;
	});

	input.addEventListener("focus", function () {
		this.select();
	});

	taskActionContainer.appendChild(input);

	//delete button

	var deleteButton = document.createElement("i");
	deleteButton.className = "fa fa-trash-o";

	deleteButton.addEventListener("click", function (e) {
		destroyTask(task.id);
		container.remove();

		if (tasks.get().length == 0) { //create a new task
			addTaskFromOverlay();
		}
	});

	taskActionContainer.appendChild(deleteButton);

	container.appendChild(taskActionContainer);

	var tabContainer = document.createElement("div");
	tabContainer.className = "task-tabs-container";

	if (task.tabs) {
		for (var i = 0; i < task.tabs.length; i++) {

			var el = getTaskOverlayTabElement(task.tabs[i], task);

			el.addEventListener("click", function (e) {
				switchToTask(task.id);
				switchToTab(this.getAttribute("data-tab"));

				taskOverlay.hide();
			});

			tabContainer.appendChild(el);
		}
	}

	container.appendChild(tabContainer);

	return container;
}

var dragula = require("dragula");

var taskOverlay = {
	isShown: false,
	dragula: dragula({
		direction: "vertical",
	}),
	show: function () {

		/* disabled in focus mode */
		if (isFocusMode) {
			showFocusModeError();
			return;
		}

		leaveTabEditMode();

		taskOverlay.isShown = true;
		taskSwitcherButton.classList.add("active");

		taskOverlay.dragula.containers = [];
		empty(taskContainer);

		//show the task elements
		tasks.get().forEach(function (task, index) {
			var el = getTaskElement(task, index);

			taskContainer.appendChild(el);
			taskOverlay.dragula.containers.push(el.getElementsByClassName("task-tabs-container")[0]);
		});

		//scroll to the selected element and focus it

		var currentTabElement = document.querySelector('.task-tab-item[data-tab="{id}"]'.replace("{id}", currentTask.tabs.getSelected()));

		if (currentTabElement) {
			currentTabElement.scrollIntoViewIfNeeded();
			currentTabElement.classList.add("fakefocus");
		}

		//un-hide the overlay

		overlay.hidden = false;
	},
	hide: function () {
		if (taskOverlay.isShown) {
			taskOverlay.isShown = false;
			overlay.hidden = true;

			//if the current task has been deleted, switch to the first task
			if (!tasks.get(currentTask.id)) {
				switchToTask(tasks.get()[0].id);
			}

			taskSwitcherButton.classList.remove("active");
		}
	},
	toggle: function () {
		if (taskOverlay.isShown) {
			taskOverlay.hide();
		} else {
			taskOverlay.show();
		}
	}
}

//swipe down on the tabstrip to show the task overlay
//this was the old expanded mode gesture, so it's remapped to the overlay
tabContainer.addEventListener("mousewheel", function (e) {
	if (e.deltaY < -30 && e.deltaX < 10) {
		taskOverlay.show();
		e.stopImmediatePropagation();
	}
});

function getTaskContainer(id) {
	return document.querySelector('.task-container[data-task="{id}"]'.replace("{id}", id));
}

function syncStateAndOverlay() {
	var selectedTask = currentTask.id;

	var tabSet = {};
	//get a list of all of the currently open tabs

	tasks.get().forEach(function (task) {
		task.tabs.get().forEach(function (tab) {
			tabSet[tab.id] = tab;
		})
	});

	//loop through each task

	tasks.get().forEach(function (task) {

		var container = getTaskContainer(task.id);

		//if the task still exists, update the tabs
		if (container) {
			//remove all of the old tabs
			task.tabs.get().forEach(function (tab) {
				task.tabs.destroy(tab.id);
			});

			//add the new tabs
			var newTabs = container.getElementsByClassName("task-tab-item");

			if (newTabs.length != 0) {
				for (var i = 0; i < newTabs.length; i++) {
					task.tabs.add(tabSet[newTabs[i].getAttribute("data-tab")]);
				}
			} else {
				//the task has no tabs, remove it

				destroyTask(task.id);
				container.remove();
			}
		} else {
			//the task no longer exists, remove it

			destroyTask(task.id);
		}
	});
}

taskOverlay.dragula.on("drop", function () {
	syncStateAndOverlay();
})
