console.log('apm-automations-preloadScript loaded');
const { contextBridge, ipcRenderer } = require('electron');

var electron = require('electron')
var ipc = electron.ipcRenderer
contextBridge.exposeInMainWorld('electron', {
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  sendSync: (channel, data) => {
    ipcRenderer.sendSync(channel, data);
  },
  receive: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  invoke: async (channel, data) => {
    try {
      const result = await ipcRenderer.invoke(channel, data);
      return result;
    } catch (error) {
      console.error(`Error invoking ${channel}:`, error);
      throw error; // Rethrow the error for the caller to handle
    }
  },
});

(()=>{
    if(window.location.href.includes("meet.google.com")){
        navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    }
})();

function insertTextById(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.focus();
    el.value = '';
    document.execCommand('insertText', false, value);
  }
}

function clickButtonByClassName(className) {
  const button = document.getElementsByClassName(className)?.[0];
  button?.click();
}

function clickButtonById(id) {
  const button = document.getElementById(id);
  button?.click();
}

function insertTextByClassName(className, value) {
  const el = document.getElementsByClassName(className)[0];
  if (el) {
    el.focus();
    el.value = '';
    document.execCommand('insertText', false, value);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

ipc.on('password-login:appfolio', (event, account) => {
      console.log("password-login:appfolio",account,event)

  if (document.getElementById('user_email')) {
    insertTextById('user_email', account.email);
  } else {
    insertTextById('user_email_search', account.email);
  }
  if (document.getElementById('user_password')) {
    insertTextById('user_password', account.pass);
  } else {
    insertTextById('user_password_search', account.pass);
  }
  if (
    document.getElementsByClassName('alert alert-danger')?.length <
    1
  ) {
    clickButtonById('log_in_button');
  }
  if(!document.getElementsByClassName("alert alert-danger login-alert")[0]){
    ipc.send('get-2fa', account);
  }
});

ipc.on('click-2fa:appfolio', (event, account) => {
    console.log("click-2fa:appfolio",account,event)
    if(document.getElementById("send_verification_code")){
        clickButtonById('send_verification_code')
        ipc.send('add-2fa', account);
    }else if(document.getElementById("user_verification_code")){
        ipc.send('add-2fa', account);
    }

});

ipc.on('twofa:appfolio', (event, code) => {
    console.log("twofa:appfolio",code)
    if(code){
        insertTextById('user_verification_code', code);
        sleep(2000).then(() => {
            clickButtonById('sign_in_button');
        });
    }
});

ipc.on('password-login:buildium', (event, account) => {
    console.log("password-login:buildium",account,event);
    if(document.getElementById("emailAddressInput")){
        console.log("emailAddressInput",account.email)
        insertTextById('emailAddressInput', account.email);
        insertTextById('passwordInput', account.pass);
        clickButtonByClassName('btn btn--primary save login__sign-in-button');
        ipc.send('trigger-2fa', account);
    }

});

ipc.on('password-login:rentvine', (event, account) => {
  insertTextById('emailTextbox', account.email);
  insertTextById('passwordTextbox', account.pass);
  clickButtonByClassName('btn btn-lg btn-success btn-block');
});

ipc.on('password-login:propertyware', (event, account) => {
  if (window.loginPageLoaded !== 'true') {
    var myHeaders = new Headers();
    var formdata = new FormData();
    formdata.append('email', account.email);
    formdata.append('password', account.pass);
    formdata.append('captchaAvailable', 'false');

    var requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: formdata,
      redirect: 'follow',
    };

    fetch(account.urls.PW_LOGIN_API, requestOptions)
      .then((response) => response.text())
      .then((result) => {
        const isCaptchaPage =
          result.search(
            'human visitor and to prevent automated spam submission'
          ) > -1;
        if (isCaptchaPage) {
          document.write(result);
        }
        const isLoginPage = result.search('panel login-panel') > -1;
        if (isLoginPage) {
          document.getElementsByClassName(
            'panel login-panel'
          )[0].children[0].innerHTML =
            "<div class='center'><h5> Can't authenticate <h6> " +
            account.email +
            '</h6><div>Credentials are invalid.<div></h5></div>';
          insertTextById('loginEmail',account.email);
          insertTextByClassName('text mbtm', account.pass);
        }
        if (!isLoginPage && !isCaptchaPage) {
          window.location = account.urls.PW_HOME;
        }
      })
      .catch((error) => console.log('error', error));
    window.loginPageLoaded = 'true';
  }
});

ipc.on('twofa:buildium', (event, code) => {
    console.log("code",code)
  insertTextById('verificationCodeInput', code);
  clickButtonByClassName('form-element__checkbox-label');
  clickButtonByClassName(
    'btn btn--primary form-actions__button save verify-two-factor-authentication__verify-button'
  );
});

ipc.on('tranquil-browser:ping', () => {
  console.log('tranquil-browser:ping')
  window.electron.sendToHost("tranquil-browser:pong");

});