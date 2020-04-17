
var ipc = require('electron').ipcRenderer;
promptData = ipc.sendSync('prompt',{
  text: 'Login Required',
  values: [{ placeholder: l('login'), id: 'login', type: 'text' }, { placeholder: l('password'), id: 'password', type: 'password' }],
  ok: l('dialogConfirmButton'),
  cancel: l('dialogSkipButton'),
  width: 300,
  height: 200,
});
ipc.send('loginPromptResponse', promptData); // Returning credendials to viewManager.js
window.close()
