export const toCharCodeArray = (str) => str.split('').map(c => c.charCodeAt(0));

/**
 * Returns a function that generates a Rabin fingerprint hash function
 * @param p The prime to use as a base for the Rabin fingerprint algorithm
 */
export const simpleHashFn = (p) => (arrayValues, lastHash, lastCharCode) => {
  return lastHash ?
    // See the abracadabra example: https://en.wikipedia.org/wiki/Rabin%E2%80%93Karp_algorithm
    (lastHash - lastCharCode * Math.pow(p, arrayValues.length - 1)) * p + arrayValues[arrayValues.length - 1] :
    arrayValues.reduce((total, x, i) => total + x * Math.pow(p, arrayValues.length - i - 1), 0);
}

/*
 * Sets the specific bit location
 */
export const setBit = (buffer, bitLocation) =>
  buffer[bitLocation / 8 | 0] |= 1 << bitLocation % 8;

/**
 * Returns true if the specified bit location is set
 */
export const isBitSet = (buffer, bitLocation) =>
  !!(buffer[bitLocation / 8 | 0] & 1 << bitLocation % 8);

export class BloomFilter {
  /**
   * Constructs a new BloomFilter instance.
   * If you'd like to initialize with a specific size just call BloomFilter.from(Array.from(Uint8Array(size).values()))
   * Note that there is purposely no remove call because adding that would introduce false negatives.
   *
   * @param bitsPerElement Used along with estimatedNumberOfElements to figure out the size of the BloomFilter
   *   By using 10 bits per element you'll have roughly 1% chance of false positives.
   * @param estimatedNumberOfElements Used along with bitsPerElementto figure out the size of the BloomFilter
   * @param hashFns An array of hash functions to use. These can be custom but they should be of the form
   *   (arrayValues, lastHash, lastCharCode) where the last 2 parameters are optional and are used to make
   *   a rolling hash to save computation.
   */
  constructor(bitsPerElement = 10, estimatedNumberOfElements = 50000, hashFns) {
    if (bitsPerElement.constructor === Uint8Array) {
      // Re-order params
      this.buffer = bitsPerElement;
      if (estimatedNumberOfElements.constructor === Array) {
        hashFns = estimatedNumberOfElements;
      }
      // Calculate new buffer size
      this.bufferBitSize = this.buffer.length * 8;
    } else if (bitsPerElement.constructor === Array) {
      // Re-order params
      let arrayLike = bitsPerElement;
      if (estimatedNumberOfElements.constructor === Array) {
        hashFns = estimatedNumberOfElements;
      }
      // Calculate new buffer size
      this.bufferBitSize = arrayLike.length * 8;
      this.buffer = new Uint8Array(arrayLike);
    } else {
      // Calculate the needed buffer size in bytes
      this.bufferBitSize = bitsPerElement * estimatedNumberOfElements;
      this.buffer = new Uint8Array(Math.ceil(this.bufferBitSize / 8));
    }
    this.hashFns = hashFns || [simpleHashFn(11), simpleHashFn(17), simpleHashFn(23)];
    this.setBit = setBit.bind(this, this.buffer);
    this.isBitSet = isBitSet.bind(this, this.buffer);
  }


  /**
   * Construct a Bloom filter from a previous array of data
   * Note that the hash functions must be the same!
   */
  static from(arrayLike, hashFns) {
    return new BloomFilter(arrayLike, hashFns);
  }

  /**
   * Serializing the current BloomFilter into a JSON friendly format.
   * You would typically pass the result into JSON.stringify.
   * Note that BloomFilter.from only works if the hash functions are the same.
   */
  toJSON() {
    return Array.from(this.buffer.values());
  }

  /**
   * Print the buffer, mostly used for debugging only
   */
  print() {
    console.log(this.buffer);
  }

  /**
   * Given a string gets all the locations to check/set in the buffer
   * for that string.
   * @param charCodes An array of the char codes to use for the hash
   */
  getLocationsForCharCodes(charCodes) {
    return this.hashFns.map(h => h(charCodes) % this.bufferBitSize);
  }

  /**
   * Obtains the hashes for the specified charCodes
   * See "Rabin fingerprint" in https://en.wikipedia.org/wiki/Rabin%E2%80%93Karp_algorithm for more information.
   *
   * @param charCodes An array of the char codes to use for the hash
   * @param lastHashes If specified, it will pass the last hash to the hashing
   * function for a faster computation.  Must be called with lastCharCode.
   * @param lastCharCode if specified, it will pass the last char code
   *  to the hashing function for a faster computation. Must be called with lastHashes.
   */
  getHashesForCharCodes(charCodes, lastHashes, lastCharCode) {
    return this.hashFns.map((h, i) => h(charCodes, lastHashes ? lastHashes[i] : undefined, lastCharCode, this.bufferBitSize));
  }

  /**
   * Adds he specified string to the set
   */
  add(data) {
    if (data.constructor !== Array) {
      data = toCharCodeArray(data);
    }

    this.getLocationsForCharCodes(data).forEach(this.setBit);
  }

  /**
   * Checks whether an element probably exists in the set, or definitely doesn't.
   * @param str Either a string to check for existance or an array of the string's char codes
   *   The main reason why you'd want to pass in a char code array is because passing a string
   *   will use JS directly to get the char codes which is very inneficient compared to calling
   *   into C++ code to get it and then making the call.
   *
   * Returns true if the element probably exists in the set
   * Returns false if the element definitely does not exist in the set
   */
  exists(data) {
    if (data.constructor !== Array) {
      data = toCharCodeArray(data);
    }
    return this.getLocationsForCharCodes(data).every(this.isBitSet);
  }

  /**
   * Checks if any substring of length substringLenght probably exists or definitely doesn't
   * If false is returned then no substring of the specified string of the specified lengthis in the bloom filter
   * @param data The substring or char array to check substrings on.
   */
  substringExists(data, substringLength) {
    if (data.constructor !== Uint8Array) {
      if (data.constructor !== Array) {
        data = toCharCodeArray(data);
      }
      data = new Uint8Array(data);
    }

    let lastHashes, lastCharCode;
    for (let i = 0; i < data.length - substringLength + 1; i++) {

      lastHashes = this.getHashesForCharCodes(data.subarray(i, i + substringLength), lastHashes, lastCharCode);
      if (lastHashes.map(x => x % this.bufferBitSize).every(this.isBitSet)) {
        return true;
      }
      lastCharCode = data[i];
    }
    return false;
  }
}
