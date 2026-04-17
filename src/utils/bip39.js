// Production BIP39 — uses @scure/bip39 (audited, standard-compliant)
import {
  generateMnemonic as scureGenerate,
  mnemonicToSeedSync as scureSeedSync,
  validateMnemonic as scureValidate,
} from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'

/**
 * Generate a cryptographically secure BIP39 mnemonic.
 * Uses the full 2048-word English wordlist.
 * @param {number} wordCount - Number of words (12 or 24). Default: 12
 * @returns {string} The generated mnemonic phrase
 */
export function generateMnemonic(wordCount = 12) {
  // BIP39: 12 words = 128 bits entropy, 24 words = 256 bits entropy
  const entropy = wordCount === 24 ? 256 : 128
  return scureGenerate(wordlist, entropy)
}

/**
 * Validate a mnemonic phrase against the BIP39 wordlist and checksum.
 */
export function validateMnemonic(mnemonic) {
  return scureValidate(mnemonic.trim(), wordlist)
}

/**
 * Derive a 64-byte seed from a mnemonic (PBKDF2, 2048 rounds).
 */
export function mnemonicToSeedSync(mnemonic, passphrase = '') {
  return scureSeedSync(mnemonic.trim(), passphrase)
}
