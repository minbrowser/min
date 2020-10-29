/*
Wrapper for node-keytar
Runs in the main process because of https://github.com/atom/node-keytar/issues/250
*/

const keytar = require('keytar')

ipc.handle('keychainGetPassword', function (event, service, account) {
  return keytar.getPassword(service, account)
})

ipc.handle('keychainSetPassword', function (event, service, account, password) {
  return keytar.setPassword(service, account, password)
})

ipc.handle('keychainDeletePassword', function (event, service, account) {
  return keytar.deletePassword(service, account)
})

ipc.handle('keychainFindCredentials', function (event, service) {
  return keytar.findCredentials(service)
})

ipc.handle('keychainFindPassword', function (event, service) {
  return keytar.setPassword(service)
})
