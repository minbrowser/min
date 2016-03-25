var sessionRestore = {
	save: function () {
		requestIdleCallback(function () {
			var data = {
				version: 2,
				state: JSON.parse(JSON.stringify(tabState)),
			}

			//save all tabs that aren't private

			for (var i = 0; i < data.state.tasks.length; i++) {
				data.state.tasks[i].tabs = data.state.tasks[i].tabs.filter(function (tab) {
					return !tab.private;
				});
			}

			localStorage.setItem("sessionrestoredata", JSON.stringify(data));
		}, {
			timeout: 2250
		});
	},
	restore: function () {
		var data = localStorage.getItem("sessionrestoredata");

		console.log(data, data.version);
		//first run, show the tour
		if (!data) {

			tasks.setSelected(tasks.add()); //create a new task

			var newTab = currentTask.tabs.add({
				url: "https://palmeral.github.io/min/tour"
			});
			addTab(newTab, {
				enterEditMode: false,
			});
			return;
		}

		data = JSON.parse(data);

		localStorage.setItem("sessionrestoredata", "");

		//the data isn't restorable
		if ((data.version && data.version != 2) || (data.state && data.state.tasks && data.state.tasks.length == 0)) {

			tasks.setSelected(tasks.add());

			addTab(currentTask.tabs.add(), {
				leaveEditMode: false //we know we aren't in edit mode yet, so we don't have to leave it
			});
			return;
		}

		console.info("restoring tabs", data.state);

		//restore the tabs	

		var state = data.state;

		var selectedTask = state.tasks.filter(function (item) {
			return item.id == state.selectedTask;
		});

		state.tasks.forEach(function (task) {
			//restore the task item
			var taskItem = tasks.get(tasks.add(task.name, task.id));

			//restore the tabs within the task
			task.tabs.forEach(function (tab) {
				taskItem.tabs.add(tab);
			});
		});

		switchToTask(state.selectedTask);


		/*	} catch (e) {
				//if we can't restore the session, try to start over with a blank tab
				console.warn("failed to restore session");
				console.error(e);

				localStorage.setItem("sessionrestoredata", "");

				alert("An error has occured. Please restart the browser.");

			}*/
	}
}

//TODO make this a preference

sessionRestore.restore();

setInterval(sessionRestore.save, 12500);
