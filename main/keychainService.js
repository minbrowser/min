/* Uses Electron's safeStorage to encrypt a password file - encryption key gets stored in the system keychain */

const safeStorage = require('electron').safeStorage
const passwordFilePath = path.join(userDataPath, 'passwordStore')

/*
file format:
{
  version: 1,
  credentials: [
    {
      domain:,
      username:,
      password:
    }
  ]
}
*/

async function readSavedPasswordFile () {
  let file
  try {
    file = await fsPromises.readFile(passwordFilePath)
  } catch (e) {
    if (e.code !== 'ENOENT') {
      console.warn(e)
      throw new Error(e)
    }
  }

  if (file) {
    const decryptResult = await safeStorage.decryptStringAsync(file)

    if (decryptResult.shouldReEncrypt) {
      console.warn('shouldReEncrypt=true for saved password file, re-encrypting')
      await writeSavedPasswordFile(decryptResult.result)
    }

    return JSON.parse(decryptResult.result)
  } else {
    return {
      version: 1,
      credentials: []
    }
  }
}

async function writeSavedPasswordFile (content) {
  const encrypted = await safeStorage.encryptStringAsync(
    typeof content === 'string' ? content : JSON.stringify(content)
  )
  await fsPromises.writeFile(passwordFilePath, encrypted)
}

async function credentialStoreSetPasswordBulk (accounts) {
  const fileContent = await readSavedPasswordFile()

  fileContent.credentials = accounts
  await writeSavedPasswordFile(fileContent)
}

async function credentialStoreSetPassword (account) {
  const fileContent = await readSavedPasswordFile()

  // delete duplicate credentials
  for (let i = 0; i < fileContent.credentials.length; i++) {
    if (fileContent.credentials[i].domain === account.domain &&
        fileContent.credentials[i].username === account.username) {
      fileContent.credentials.splice(i, 1)
      i--
    }
  }

  fileContent.credentials.push(account)
  await writeSavedPasswordFile(fileContent)
}

// Serialize all password store operations to prevent concurrent
// reads and writes from overwriting each other's changes.
let passwordStoreQueue = Promise.resolve()

function queuePasswordStoreOperation (operation) {
  const result = passwordStoreQueue.then(operation)

  // Keep the queue usable even if an operation fails.
  passwordStoreQueue = result.catch(() => {})

  return result
}

ipc.handle('credentialStoreSetPasswordBulk', function (event, accounts) {
  return queuePasswordStoreOperation(() =>
    credentialStoreSetPasswordBulk(accounts)
  )
})

ipc.handle('credentialStoreSetPassword', function (event, account) {
  return queuePasswordStoreOperation(() =>
    credentialStoreSetPassword(account)
  )
})

ipc.handle('credentialStoreDeletePassword', function (event, account) {
  return queuePasswordStoreOperation(async () => {
    const fileContent = await readSavedPasswordFile()

    // delete matching credentials
    for (let i = 0; i < fileContent.credentials.length; i++) {
      if (fileContent.credentials[i].domain === account.domain &&
          fileContent.credentials[i].username === account.username) {
        fileContent.credentials.splice(i, 1)
        i--
      }
    }

    return writeSavedPasswordFile(fileContent)
  })
})

ipc.handle('credentialStoreGetCredentials', function () {
  return queuePasswordStoreOperation(async () => {
    return (await readSavedPasswordFile()).credentials
  })
})
