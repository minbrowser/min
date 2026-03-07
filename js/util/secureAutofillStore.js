const Dexie = require('dexie')

const PIN_KEY = 'msearch.security.pinV2'
const LEGACY_PIN_KEY = 'msearch.security.pinHash'
const LEGACY_ADDRESS_KEY = 'msearch.autofill.addresses'
const LEGACY_CARD_KEY = 'msearch.autofill.cards'
const PBKDF2_ITERATIONS = 310000

const db = new Dexie('msearchSecureAutofill')
db.version(1).stores({
  secrets: '&id, updatedAt'
})

let cachedKey = null
let unlockedAt = 0

function toBase64 (buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

function fromBase64 (value) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function getPinConfig () {
  try {
    return JSON.parse(localStorage.getItem(PIN_KEY) || 'null')
  } catch (e) {
    return null
  }
}

function setPinConfig (config) {
  localStorage.setItem(PIN_KEY, JSON.stringify(config))
}

async function sha256 (value) {
  const msgBuffer = new TextEncoder().encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  return toBase64(hashBuffer)
}

async function derivePinHash (pin, saltBytes) {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt: saltBytes,
    iterations: PBKDF2_ITERATIONS,
    hash: 'SHA-256'
  }, keyMaterial, 256)
  return toBase64(bits)
}

async function deriveDataKey (pin, saltBytes) {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({
    name: 'PBKDF2',
    salt: saltBytes,
    iterations: PBKDF2_ITERATIONS,
    hash: 'SHA-256'
  }, keyMaterial, {
    name: 'AES-GCM',
    length: 256
  }, false, ['encrypt', 'decrypt'])
}

async function encryptPayload (payload) {
  if (!cachedKey) {
    throw new Error('Vault is locked')
  }

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(JSON.stringify(payload))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cachedKey, encoded)
  return {
    iv: toBase64(iv),
    data: toBase64(ciphertext)
  }
}

async function decryptPayload (encrypted) {
  if (!cachedKey) {
    throw new Error('Vault is locked')
  }

  if (!encrypted || !encrypted.iv || !encrypted.data) {
    return []
  }

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(encrypted.iv) }, cachedKey, fromBase64(encrypted.data))
  return JSON.parse(new TextDecoder().decode(new Uint8Array(decrypted)))
}

async function readSecret (id) {
  await db.open()
  return db.table('secrets').get(id)
}

async function writeSecret (id, payload) {
  await db.open()
  return db.table('secrets').put({ id, updatedAt: Date.now(), payload })
}

async function listType (type) {
  const secret = await readSecret(type)
  if (!secret) return []
  return decryptPayload(secret.payload)
}

async function storeType (type, rows) {
  const encrypted = await encryptPayload(rows)
  await writeSecret(type, encrypted)
}

const SecureAutofillStore = {
  async isConfigured () {
    return !!getPinConfig() || !!localStorage.getItem(LEGACY_PIN_KEY)
  },
  isUnlocked () {
    return !!cachedKey
  },
  lock () {
    cachedKey = null
    unlockedAt = 0
  },
  getUnlockedAt () {
    return unlockedAt
  },
  async verifyPin (pin) {
    const config = getPinConfig()
    if (config && config.salt && config.pinHash) {
      const salt = fromBase64(config.salt)
      const computedHash = await derivePinHash(pin, salt)
      return computedHash === config.pinHash
    }

    const legacyHash = localStorage.getItem(LEGACY_PIN_KEY)
    if (!legacyHash) {
      return false
    }

    const providedLegacyHash = await sha256(pin)
    const legacyHexHash = Array.from(fromBase64(providedLegacyHash)).map(byte => byte.toString(16).padStart(2, '0')).join('')
    return providedLegacyHash === legacyHash || legacyHexHash === legacyHash
  },
  async setPin (pin) {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const pinHash = await derivePinHash(pin, salt)
    setPinConfig({
      version: 2,
      iterations: PBKDF2_ITERATIONS,
      salt: toBase64(salt),
      pinHash
    })
    localStorage.removeItem(LEGACY_PIN_KEY)
  },
  async removePin () {
    this.lock()
    localStorage.removeItem(PIN_KEY)
    localStorage.removeItem(LEGACY_PIN_KEY)
    await db.table('secrets').clear()
  },
  async unlock (pin) {
    const isValid = await this.verifyPin(pin)
    if (!isValid) {
      return false
    }

    let config = getPinConfig()
    if (!config) {
      await this.setPin(pin)
      config = getPinConfig()
    }

    cachedKey = await deriveDataKey(pin, fromBase64(config.salt))
    unlockedAt = Date.now()
    await this.migrateLegacyData()
    return true
  },
  async migrateLegacyData () {
    let addresses = []
    let cards = []

    try {
      addresses = JSON.parse(localStorage.getItem(LEGACY_ADDRESS_KEY) || '[]')
    } catch (e) {}

    try {
      cards = JSON.parse(localStorage.getItem(LEGACY_CARD_KEY) || '[]')
    } catch (e) {}

    const hasAddresses = Array.isArray(addresses) && addresses.length > 0
    const hasCards = Array.isArray(cards) && cards.length > 0

    if (hasAddresses) {
      await this.storeAddresses(addresses)
      localStorage.removeItem(LEGACY_ADDRESS_KEY)
    }

    if (hasCards) {
      await this.storeCards(cards)
      localStorage.removeItem(LEGACY_CARD_KEY)
    }
  },
  async listAddresses () {
    return listType('addresses')
  },
  async listCards () {
    return listType('cards')
  },
  async storeAddresses (addresses) {
    return storeType('addresses', addresses)
  },
  async storeCards (cards) {
    return storeType('cards', cards)
  },
  async saveAddress (address) {
    const list = await this.listAddresses()
    const idx = list.findIndex(item => item.id === address.id)
    if (idx >= 0) {
      list[idx] = address
    } else {
      list.push(address)
    }
    await this.storeAddresses(list)
  },
  async saveCard (card) {
    const list = await this.listCards()
    const idx = list.findIndex(item => item.id === card.id)
    if (idx >= 0) {
      list[idx] = card
    } else {
      list.push(card)
    }
    await this.storeCards(list)
  },
  async deleteAddress (id) {
    const list = await this.listAddresses()
    await this.storeAddresses(list.filter(item => item.id !== id))
  },
  async deleteCard (id) {
    const list = await this.listCards()
    await this.storeCards(list.filter(item => item.id !== id))
  }
}

module.exports = SecureAutofillStore
