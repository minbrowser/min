function addTaskFromOverlay() {
	tasks.setSelected(tasks.add());
	rerenderTabstrip();
	taskOverlay.hide();
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
					taskOverlay.show();
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

	if (task.tabs) {
		for (var i = 0; i < task.tabs.length; i++) {

			var el = getTaskOverlayTabElement(task.tabs[i], task);

			el.addEventListener("click", function (e) {
				switchToTask(task.id);
				switchToTab(this.getAttribute("data-tab"));

				taskOverlay.hide();
			});

			container.appendChild(el);
		}
	}

	return container;
}

var taskOverlay = {
	isShown: false,
	show: function () {

		taskOverlay.isShown = true;

		leaveTabEditMode();

		taskSwitcherButton.classList.add("active");

		empty(taskContainer);

		//show the task elements
		tasks.get().forEach(function (task, index) {
			taskContainer.appendChild(getTaskElement(task, index));
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
