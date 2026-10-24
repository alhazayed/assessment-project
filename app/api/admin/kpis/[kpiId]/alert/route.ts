import { requireAdmin, adminRouteError } from '@/lib/admin-auth'
import { NextResponse } from 'next/server'

// KPI alert thresholds are not implemented: there is no table to store them
// in. These handlers used to return success (and a default config) without
// saving anything, which told admins an alert was configured when it was
// not. Until a kpi_alerts table exists, both methods say so honestly.

const NOT_IMPLEMENTED = {
  error: 'KPI alerts are not implemented yet; no alert configuration is stored.',
}

export async function PATCH() {
  try {
    await requireAdmin()
    return NextResponse.json(NOT_IMPLEMENTED, { status: 501 })
  } catch (error) {
    return adminRouteError(error)
  }
}

export async function GET() {
  try {
    await requireAdmin()
    return NextResponse.json(NOT_IMPLEMENTED, { status: 501 })
  } catch (error) {
    return adminRouteError(error)
  }
}
