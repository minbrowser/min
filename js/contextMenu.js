window.electron = require('electron')
window.remote = electron.remote
window.Menu = remote.Menu;


InputMenu = window.Menu.buildFromTemplate([{
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
  
  document.body.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
  
    let node = e.target;

    if (node.nodeName.match(/^(input|textarea)$/i) || node.isContentEditable) {
        InputMenu.popup(remote.getCurrentWindow());
    }
  });