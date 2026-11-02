/**
 * Individual package purchases: price lookup and report access.
 *
 * Run: npx tsx --test __tests__/packages/purchase.test.ts
 */

import assert from 'node:assert/strict'
import { test, describe } from 'node:test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProduct, packageSaleState, isPackageProductId } from '../../lib/billing/product'
import { hasPackageAccess, isPurchaseActive } from '../../lib/billing/package-access'

const PKG_ID = '11111111-2222-4333-8444-555555555555'
const USER = '99999999-8888-4777-8666-555555555555'

/** Minimal stand-in for the Supabase query builder: every filter is recorded and ignored. */
function fakeDb(tables: Record<string, unknown[]>): SupabaseClient {
  const builder = (rows: unknown[]) => {
    const b: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'is', 'not', 'in', 'order', 'limit']) b[m] = () => b
    b.maybeSingle = async () => ({ data: rows[0] ?? null, error: null })
    b.then = (resolve: (v: unknown) => unknown) => resolve({ data: rows, error: null })
    return b
  }
  return { from: (t: string) => builder(tables[t] ?? []) } as unknown as SupabaseClient
}

describe('product lookup', () => {
  test('tiers keep their fixed prices', async () => {
    const r = await resolveProduct(fakeDb({}), 'standard')
    assert.ok(r.ok)
    if (r.ok) {
      assert.equal(r.product.kind, 'tier')
      assert.equal(r.product.priceUSD, 24.99)
      assert.equal(r.product.packageId, null)
    }
  })

  test('a package is priced from packages.price_cents', async () => {
    const db = fakeDb({ packages: [{ id: PKG_ID, name_en: 'Check-up', name_ar: 'فحص', status: 'active', price_cents: 1900 }] })
    const r = await resolveProduct(db, PKG_ID)
    assert.ok(r.ok)
    if (r.ok) {
      assert.equal(r.product.kind, 'package')
      assert.equal(r.product.priceUSD, 19)
      assert.equal(r.product.packageId, PKG_ID)
      assert.equal(r.product.tier, null)
    }
  })

  test('a package with no price, or not active, is not for sale', async () => {
    for (const row of [
      { id: PKG_ID, name_en: 'x', name_ar: 'x', status: 'active', price_cents: null },
      { id: PKG_ID, name_en: 'x', name_ar: 'x', status: 'draft', price_cents: 2900 },
      { id: PKG_ID, name_en: 'x', name_ar: 'x', status: 'archived', price_cents: 2900 },
    ]) {
      const r = await resolveProduct(fakeDb({ packages: [row] }), PKG_ID)
      assert.deepEqual(r, { ok: false, error: 'not_for_sale' })
    }
  })

  test('unknown ids and junk are invalid', async () => {
    assert.deepEqual(await resolveProduct(fakeDb({}), PKG_ID), { ok: false, error: 'invalid' })
    assert.deepEqual(await resolveProduct(fakeDb({}), 'gold'), { ok: false, error: 'invalid' })
    assert.deepEqual(await resolveProduct(fakeDb({}), { amount: 1 }), { ok: false, error: 'invalid' })
    assert.equal(isPackageProductId("x' or 1=1"), false)
  })

  test('sale state', () => {
    assert.equal(packageSaleState(null), 'invalid')
    assert.equal(packageSaleState({ status: 'active', price_cents: 0 }), 'not_for_sale')
    assert.equal(packageSaleState({ status: 'active', price_cents: 3900 }), 'for_sale')
  })
})

describe('report access', () => {
  const now = new Date('2026-11-01T12:00:00Z')

  test('a purchase with no expiry, or a future one, is active', () => {
    assert.equal(isPurchaseActive([{ expires_at: null }], now), true)
    assert.equal(isPurchaseActive([{ expires_at: '2026-12-01T00:00:00Z' }], now), true)
    assert.equal(isPurchaseActive([{ expires_at: '2026-10-01T00:00:00Z' }], now), false)
    assert.equal(isPurchaseActive([], now), false)
  })

  test('buyers get access; others do not', async () => {
    const buyer = fakeDb({ package_purchases: [{ id: 'p1', expires_at: null }], profiles: [{ role: 'patient' }] })
    const stranger = fakeDb({ package_purchases: [], profiles: [{ role: 'patient' }] })
    assert.equal(await hasPackageAccess(buyer, USER, PKG_ID), true)
    assert.equal(await hasPackageAccess(stranger, USER, PKG_ID), false)
  })

  test('staff can open any report; clinicians cannot without buying', async () => {
    assert.equal(await hasPackageAccess(fakeDb({ profiles: [{ role: 'superadmin' }] }), USER, PKG_ID), true)
    assert.equal(await hasPackageAccess(fakeDb({ profiles: [{ role: 'admin' }] }), USER, PKG_ID), true)
    assert.equal(await hasPackageAccess(fakeDb({ profiles: [{ role: 'clinician' }] }), USER, PKG_ID), false)
  })
})
