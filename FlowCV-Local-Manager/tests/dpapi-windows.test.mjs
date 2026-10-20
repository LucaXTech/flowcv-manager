import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { windowsDpapi } from '../bridge.mjs';

if (process.platform !== 'win32') {
  console.log('SKIP: DPAPI disponibile solo su Windows');
  process.exit(0);
}

const secret = 'flowcv-dpapi-test-' + randomBytes(20).toString('hex');
const encrypted = await windowsDpapi(secret, 'encrypt');
assert.notEqual(encrypted, secret);
const base64Plaintext = await windowsDpapi(encrypted, 'decrypt');
assert.equal(Buffer.from(base64Plaintext, 'base64').toString('utf8'), secret);
console.log('PASS: Windows DPAPI cifra e decifra correttamente');
