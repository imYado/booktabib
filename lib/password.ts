import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>
const KEYLEN = 64

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = await scryptAsync(password, salt, KEYLEN)
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, saltB64, hashB64] = stored.split('$')
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false
  const expected = Buffer.from(hashB64, 'base64')
  const actual = await scryptAsync(password, Buffer.from(saltB64, 'base64'), expected.length)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

// Checked when an email has no account, so a wrong email takes as long as a wrong password
// and response times don't reveal which emails are registered.
const DUMMY_HASH = `scrypt$${Buffer.alloc(16).toString('base64')}$${Buffer.alloc(KEYLEN).toString('base64')}`

export async function verifyPasswordOrDummy(password: string, stored: string | undefined) {
  const ok = await verifyPassword(password, stored ?? DUMMY_HASH)
  return ok && stored !== undefined
}

// The most used passwords of 8 characters or more, which are tried first in any attack.
const COMMON = new Set(
  [
    '12345678 123456789 1234567890 11111111 00000000 88888888 12341234 87654321 11223344 12344321 123123123',
    '987654321 147258369 123456123 1q2w3e4r 1qaz2wsx qwertyui qwertyuiop asdfghjk zxcvbnm1 password password1',
    'password12 password123 passw0rd p@ssw0rd iloveyou sunshine princess football baseball superman whatever',
    'trustno1 letmein1 welcome1 abcd1234 abc12345 aa123456 qwerty123 q1w2e3r4 computer michelle jennifer starwars',
    'liverpool chelsea1 iloveyou1 babygirl lovelove booktabib booktabib1 booktabib123 admin123 administrator',
    'doctor123 clinic123 kurdistan baghdad1 iraq1234',
  ]
    .join(' ')
    .split(' '),
)

/** Whether a new password is too short, too long, or easy to guess. */
export function isWeakPassword(password: string, email = '') {
  if (password.length < 8 || password.length > 200) return true
  const lower = password.toLowerCase()
  if (COMMON.has(lower) || /^(.)\1+$/.test(password)) return true
  const name = email.toLowerCase().split('@')[0]
  return !!email && (lower === email.toLowerCase() || (name.length >= 4 && lower.includes(name)))
}
