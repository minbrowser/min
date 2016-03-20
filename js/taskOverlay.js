function switchToTask(id) {
	tasks.setSelected(id);

	rerenderTabstrip();

	var taskData = tasks.get(id);

	console.log(taskData);
	console.log(taskData.tabs.getSelected());

	if (taskData.tabs.length > 0) {
		switchToTab(taskData.tabs.getSelected());
	} else {
		addTab();
	}
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

function getTabTile(tab) {
	var el = document.createElement("div");
	el.className = "tab-tile";

	el.setAttribute("data-tab", tab.id);

	var title = document.createElement("div");
	title.className = "tab-title";

	var subtitle = document.createElement("div");
	subtitle.className = "tab-subtitle";

	title.textContent = tab.title || "New Tab";
	subtitle.textContent = urlParser.removeProtocol(tab.url);

	el.appendChild(title);
	el.appendChild(subtitle);

	return el;
}

function getTaskElement(task, taskIndex) {
	var container = document.createElement("div");
	container.className = "task-container";

	//add the input for the task name

	var input = document.createElement("input");
	input.classList.add("task-name");

	input.placeholder = "Task " + (taskIndex + 1);

	container.appendChild(input);

	if (task.tabs) {
		for (var i = 0; i < task.tabs.length; i++) {

			var el = getTabTile(task.tabs[i]);

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

		taskSwitcherButton.classList.add("active");

		empty(taskContainer);

		//show the task elements
		tasks.get().forEach(function (task, index) {
			taskContainer.appendChild(getTaskElement(task, index));
		});

		//un-hide the overlay

		overlay.hidden = false;
	},
	hide: function () {
		taskOverlay.isShown = false;
		overlay.hidden = true;

		taskSwitcherButton.classList.remove("active");
	},
	toggle: function () {
		if (taskOverlay.isShown) {
			taskOverlay.hide();
		} else {
			taskOverlay.show();
		}
	}
}
