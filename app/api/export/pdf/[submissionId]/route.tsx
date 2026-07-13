import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { checkRateLimit } from '@/lib/rate-limit'
import { buildContentDisposition } from '@/lib/security/file-export'
import { clinicianCanAccessPatient } from '@/lib/clinician-access'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', padding: 40, backgroundColor: '#ffffff' },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#12273C', marginBottom: 8 },
  subtitle: { fontSize: 10, color: '#6B7280', marginBottom: 24 },
  row: { flexDirection: 'row', marginBottom: 6 },
  label: { fontSize: 10, color: '#6B7280', width: 120 },
  value: { fontSize: 10, color: '#111827', flex: 1 },
  footer: { marginTop: 32, fontSize: 8, color: '#9CA3AF' },
})

async function resolveUser(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const admin = createAdminClient()
    const { data: { user } } = await admin.auth.getUser(token)
    return user
  }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET(
  request: Request,
  { params }: { params: { submissionId: string } }
) {
  const user = await resolveUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const submissionId = params.submissionId
  if (!submissionId || !/^[0-9a-f-]{36}$/i.test(submissionId)) {
    return NextResponse.json({ error: 'Invalid submission id' }, { status: 400 })
  }

  const rl = await checkRateLimit(`export-pdf:${user.id}`, { limit: 10, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'PDF export limit reached' }, { status: 429, headers: { 'Retry-After': '3600' } })
  }

  const supabase = createClient()
  const { data: submission, error } = await supabase
    .from('assessment_submissions')
    .select(`
      id,
      patient_id,
      submitted_at,
      total_score,
      severity_band,
      high_risk_flag,
      assessment_definitions (name_en, code)
    `)
    .eq('id', submissionId)
    .single()

  if (error || !submission) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!submission.patient_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? 'patient'

  let authorized = submission.patient_id === user.id
  if (!authorized && role === 'clinician') {
    authorized = await clinicianCanAccessPatient(supabase, user.id, submission.patient_id)
  }
  if (!authorized && ['admin', 'superadmin'].includes(role)) {
    authorized = true
  }
  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const def = submission.assessment_definitions as { name_en?: string; code?: string } | null
  const assessmentName = def?.name_en ?? def?.code ?? 'Assessment'
  const generatedDate = new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })

  const pdfDoc = (
    <Document title={`V Welfare — ${assessmentName} Result`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Assessment Result</Text>
        <Text style={styles.subtitle}>V Welfare · Generated {generatedDate}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Assessment</Text>
          <Text style={styles.value}>{assessmentName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{new Date(submission.submitted_at).toLocaleDateString()}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Score</Text>
          <Text style={styles.value}>{submission.total_score}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Severity</Text>
          <Text style={styles.value}>{submission.severity_band}</Text>
        </View>
        {submission.high_risk_flag && (
          <View style={styles.row}>
            <Text style={styles.label}>Risk flag</Text>
            <Text style={styles.value}>High risk — clinical follow-up recommended</Text>
          </View>
        )}
        <Text style={styles.footer}>
          Confidential — for personal or clinical use only. Not a medical diagnosis.
        </Text>
      </Page>
    </Document>
  )

  const buffer = await renderToBuffer(pdfDoc)
  const safeCode = (def?.code ?? 'assessment').replace(/[^a-z0-9]/gi, '_')

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': buildContentDisposition(`vwelfare_${safeCode}_${submissionId.slice(0, 8)}.pdf`),
      'Cache-Control': 'no-store',
    },
  })
}
