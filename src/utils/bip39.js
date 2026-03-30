// Production BIP39 — uses @scure/bip39 (audited, standard-compliant)
import {
  generateMnemonic as scureGenerate,
  mnemonicToSeedSync as scureSeedSync,
  validateMnemonic as scureValidate,
} from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'

/**
 * Generate a cryptographically secure 12-word BIP39 mnemonic.
 * Uses the full 2048-word English wordlist.
 */
export function generateMnemonic() {
  return scureGenerate(wordlist, 128)
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
