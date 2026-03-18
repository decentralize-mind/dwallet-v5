// Production crypto utilities
// Real secp256k1 HD key derivation via @scure/bip32
// Real AES-256-GCM encryption via Web Crypto API
// Zero Buffer dependency — pure browser APIs only

import { HDKey } from "@scure/bip32";
import { keccak_256 } from "@noble/hashes/sha3";

// ── Uint8Array → hex (no Buffer needed) ──────────────────────────────────────
function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── Key Derivation (BIP44 real secp256k1) ────────────────────────────────────
export function deriveWalletFromSeed(seed, index = 0) {
  const root  = HDKey.fromMasterSeed(seed);
  const child = root.derive(`m/44'/60'/0'/0/${index}`);
  if (!child.privateKey) throw new Error("Failed to derive private key");

  const privateKeyHex = "0x" + toHex(child.privateKey);
  const pubKey        = child.publicKey; // 33-byte compressed
  const addressBytes  = keccak_256(pubKey.slice(1)).slice(-20);
  const rawAddress    = "0x" + toHex(addressBytes);
  const address       = toChecksumAddress(rawAddress);

  return { privateKey: privateKeyHex, address };
}

function toChecksumAddress(address) {
  const addr = address.toLowerCase().replace("0x", "");
  const hash = toHex(keccak_256(new TextEncoder().encode(addr)));
  let result = "0x";
  for (let i = 0; i < addr.length; i++) {
    result += parseInt(hash[i], 16) >= 8 ? addr[i].toUpperCase() : addr[i];
  }
  return result;
}

export function isValidAddress(address) {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

export function formatAddress(address, chars = 6) {
  if (!address) return "";
  return address.slice(0, chars) + "..." + address.slice(-4);
}

// ── AES-256-GCM encryption (Web Crypto API) ───────────────────────────────────
async function deriveKey(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(data, password) {
  const salt      = crypto.getRandomValues(new Uint8Array(16));
  const iv        = crypto.getRandomValues(new Uint8Array(12));
  const key       = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, key, new TextEncoder().encode(data)
  );
  const packed = new Uint8Array(16 + 12 + ciphertext.byteLength);
  packed.set(salt, 0);
  packed.set(iv, 16);
  packed.set(new Uint8Array(ciphertext), 28);
  return btoa(String.fromCharCode(...packed));
}

export async function decryptData(base64, password) {
  const packed     = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const salt       = packed.slice(0, 16);
  const iv         = packed.slice(16, 28);
  const ciphertext = packed.slice(28);
  const key        = await deriveKey(password, salt);
  const plaintext  = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}
