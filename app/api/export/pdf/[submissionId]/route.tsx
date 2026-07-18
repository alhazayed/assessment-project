import React from 'react'
import { NextResponse } from 'next/server'
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

// Per-submission PDF export. This is the endpoint the mobile Results screen calls
// (GET /api/export/pdf/<submissionId> with a Bearer token). It also accepts a web
// cookie session. Authorization is enforced here (owner / admin / active-
// relationship clinician) before any PHI is read via the service-role client.

export const dynamic = 'force-dynamic'

const BRAND = { primary: '#1D6296', dark: '#12273C', accent: '#F3650A' }
const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', backgroundColor: '#ffffff', padding: 0 },
  accentBar: { height: 4, backgroundColor: BRAND.accent },
  header: { backgroundColor: BRAND.dark, paddingHorizontal: 40, paddingVertical: 28 },
  brandName: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#ffffff', marginBottom: 3 },
  brandTagline: { fontSize: 9, color: '#7EB7DB', letterSpacing: 1 },
  body: { paddingHorizontal: 40, paddingTop: 28, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 9, fontFamily: 'Helvetica-Bold', color: BRAND.primary, textTransform: 'uppercase',
    letterSpacing: 1.2, marginBottom: 10, marginTop: 22, borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB', paddingBottom: 4,
  },
  row: { flexDirection: 'row', marginBottom: 5 },
  label: { fontSize: 9, color: '#6B7280', width: 130 },
  value: { fontSize: 9, color: '#111827', flex: 1 },
  badge: { fontSize: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-start', marginTop: 6 },
  footer: { marginTop: 32, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  footerText: { fontSize: 7, color: '#9CA3AF' },
})

function severityBg(band: string) {
  const b = (band || '').toLowerCase()
  if (b.includes('minimal') || b.includes('none') || b.includes('normal') || b.includes('low')) return '#D1FAE5'
  if (b.includes('mild')) return '#FEF3C7'
  if (b.includes('moderate')) return '#FFEDD5'
  return '#FEE2E2'
}
function severityFg(band: string) {
  const b = (band || '').toLowerCase()
  if (b.includes('minimal') || b.includes('none') || b.includes('normal') || b.includes('low')) return '#065F46'
  if (b.includes('mild')) return '#92400E'
  if (b.includes('moderate')) return '#9A3412'
  return '#991B1B'
}

async function resolveUserId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: { user } } = await createAdminClient().auth.getUser(token)
    return user?.id ?? null
  }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function GET(request: Request, { params }: { params: { submissionId: string } }) {
  try {
    const userId = await resolveUserId(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rl = await checkRateLimit(`reports:${userId}`, { limit: 5, windowMs: 60 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Report generation limit reached. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '3600' } })
    }

    const submissionId = params.submissionId
    if (!submissionId || !/^[0-9a-f-]{36}$/i.test(submissionId)) {
      return NextResponse.json({ error: 'Invalid submission id' }, { status: 400 })
    }

    const db = createAdminClient()
    const { data: sub } = await db
      .from('assessment_submissions')
      .select('id, patient_id, total_score, severity_band, high_risk_flag, submitted_at, assessment_definitions(name_en, code)')
      .eq('id', submissionId)
      .maybeSingle()

    if (!sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })

    // Authorization: patient-owner, admin/superadmin, or a clinician with an
    // ACTIVE relationship to the patient.
    let allowed = sub.patient_id === userId
    if (!allowed) {
      const { data: prof } = await db.from('profiles').select('role').eq('id', userId).single()
      if (prof && ['admin', 'superadmin'].includes(prof.role)) {
        allowed = true
      } else {
        const { data: rel } = await db
          .from('clinician_patient_relationships')
          .select('id')
          .eq('clinician_id', userId)
          .eq('patient_id', sub.patient_id)
          .eq('status', 'active')
          .maybeSingle()
        allowed = !!rel
      }
    }
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: patient } = await db.from('profiles').select('full_name_en').eq('id', sub.patient_id).single()
    const def = (sub.assessment_definitions as unknown as { name_en?: string; code?: string } | null)
    const assessmentName = def?.name_en ?? def?.code ?? 'Assessment'
    const generatedDate = new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })

    const pdfDoc = (
      <Document title={`V Welfare — Assessment Report`}>
        <Page size="A4" style={styles.page}>
          <View style={styles.accentBar} />
          <View style={styles.header}>
            <Text style={styles.brandName}>V Welfare</Text>
            <Text style={styles.brandTagline}>MENTAL HEALTH PLATFORM</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.sectionTitle}>Assessment Result</Text>
            <View style={styles.row}><Text style={styles.label}>Patient</Text><Text style={styles.value}>{patient?.full_name_en ?? '—'}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Assessment</Text><Text style={styles.value}>{assessmentName}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Date</Text><Text style={styles.value}>{new Date(sub.submitted_at).toLocaleDateString()}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Total Score</Text><Text style={styles.value}>{sub.total_score}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Severity Band</Text><Text style={styles.value}>{sub.severity_band}</Text></View>
            <View style={[styles.badge, { backgroundColor: severityBg(sub.severity_band) }]}>
              <Text style={{ fontSize: 8, color: severityFg(sub.severity_band) }}>
                {sub.severity_band}{sub.high_risk_flag ? '  ⚠ High Risk — clinical follow-up recommended' : ''}
              </Text>
            </View>
            <View style={styles.footer}>
              <Text style={styles.footerText}>V Welfare — Confidential Clinical Report · Generated {generatedDate}</Text>
              <Text style={styles.footerText}>This report is for clinical use only and does not constitute a diagnosis.</Text>
            </View>
          </View>
        </Page>
      </Document>
    )

    const buffer = await renderToBuffer(pdfDoc)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="vwelfare_report_${submissionId}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('export/pdf error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
