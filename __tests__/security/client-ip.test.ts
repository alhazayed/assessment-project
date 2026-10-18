/**
 * Rate-limit client IP tests (access audit B7).
 * Run: npx tsx --test __tests__/security/client-ip.test.ts
 */
import assert from 'node:assert/strict'
import { test, describe } from 'node:test'
import { getClientIp } from '../../lib/security/client-ip'

const req = (headers: Record<string, string>) => new Request('https://app.vwelfare.com/api/x', { headers })

describe('getClientIp', () => {
  test('ignores a client-sent cf-connecting-ip', () => {
    assert.equal(getClientIp(req({ 'cf-connecting-ip': '1.2.3.4', 'x-real-ip': '9.9.9.9' })), '9.9.9.9')
    assert.equal(getClientIp(req({ 'cf-connecting-ip': '1.2.3.4' })), 'unknown')
  })
  test('prefers x-real-ip, then the first x-forwarded-for entry', () => {
    assert.equal(getClientIp(req({ 'x-real-ip': '9.9.9.9', 'x-forwarded-for': '8.8.8.8' })), '9.9.9.9')
    assert.equal(getClientIp(req({ 'x-forwarded-for': '8.8.8.8, 10.0.0.1' })), '8.8.8.8')
  })
  test('rejects values that are not IP addresses', () => {
    assert.equal(getClientIp(req({ 'x-real-ip': 'admin-login:evil' })), 'unknown')
  })
})
