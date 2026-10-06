import { randomBytes } from 'node:crypto'

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Random id that is hard to guess, e.g. for booking references (BT-7K2M9Q4XHD). */
export function randomId(length = 10, prefix = '') {
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length]
  return prefix + out
}

export function randomToken() {
  return randomBytes(32).toString('base64url')
}
