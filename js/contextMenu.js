document.getElementById('tabs').addEventListener('contextmenu', (e) => {
  e.preventDefault();
  e.stopPropagation();

  if (e.target.classList.contains('tab-input')){

    remote = electron.remote, Menu = remote.Menu;

    InputMenu = Menu.buildFromTemplate([{
      label: l('undo'),
      role: 'undo',
    }, {
      label: l('redo'),
      role: 'redo',
    }, {
      type: 'separator',
    }, {
      label: l('cut'),
      role: 'cut',
    }, {
      label: l('copy'),
      role: 'copy',
    }, {
      label: l('paste'),
      role: 'paste',
    }, {
      type: 'separator',
    }, {
      label: l('selectAll'),
      role: 'selectall',
    },
    ]);
      InputMenu.popup(remote.getCurrentWindow());
  }
});


