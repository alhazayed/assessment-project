import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const BRAND = { primary: '#1D6296', accent: '#F3650A', dark: '#12273C' }

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    padding: 0,
  },
  header: {
    backgroundColor: BRAND.dark,
    paddingHorizontal: 40,
    paddingVertical: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: { flex: 1 },
  brandName: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#ffffff', marginBottom: 3 },
  brandTagline: { fontSize: 9, color: '#7EB7DB', letterSpacing: 1 },
  reportLabel: {
    fontSize: 9,
    color: '#7EB7DB',
    textAlign: 'right',
    marginTop: 6,
  },
  body: { paddingHorizontal: 40, paddingTop: 28, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 22,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 4,
  },
  row: { flexDirection: 'row', marginBottom: 5 },
  label: { fontSize: 9, color: '#6B7280', width: 110 },
  value: { fontSize: 9, color: '#111827', flex: 1 },
  submissionCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  submissionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 3 },
  badge: {
    fontSize: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  footer: {
    marginTop: 32,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: '#9CA3AF' },
  accentBar: { height: 4, backgroundColor: BRAND.accent },
})

function severityBg(band: string) {
  const b = band.toLowerCase()
  if (b.includes('minimal') || b.includes('none') || b.includes('normal') || b.includes('low')) return '#D1FAE5'
  if (b.includes('mild')) return '#FEF3C7'
  if (b.includes('moderate')) return '#FFEDD5'
  return '#FEE2E2'
}

function severityText(band: string) {
  const b = band.toLowerCase()
  if (b.includes('minimal') || b.includes('none') || b.includes('normal') || b.includes('low')) return '#065F46'
  if (b.includes('mild')) return '#92400E'
  if (b.includes('moderate')) return '#9A3412'
  return '#991B1B'
}

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get('patient_id')
  if (!patientId) return NextResponse.json({ error: 'patient_id required' }, { status: 400 })

  // Authorization: only the patient themselves OR admin/superadmin may access this report
  if (user.id !== patientId) {
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    const privileged = profile && ['admin', 'superadmin'].includes(profile.role)
    if (!privileged) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [profileRes, submissionsRes, moodRes] = await Promise.all([
    supabase.from('profiles').select('full_name_en, full_name_ar, date_of_birth, gender, country_of_residence, created_at').eq('id', patientId).single(),
    supabase.from('assessment_submissions')
      .select('submitted_at, total_score, severity_band, high_risk_flag, assessment_definitions(name_en, code)')
      .eq('patient_id', patientId)
      .order('submitted_at', { ascending: false })
      .limit(20),
    supabase.from('mood_logs')
      .select('mood_score, anxiety_score')
      .eq('patient_id', patientId)
      .gte('log_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
  ])

  const profile = profileRes.data
  const submissions: any[] = submissionsRes.data || []
  const moods: any[] = moodRes.data || []

  if (!profile) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

  const avgMood = moods.length ? (moods.reduce((s: number, m: any) => s + m.mood_score, 0) / moods.length).toFixed(1) : 'N/A'
  const avgAnxiety = moods.length ? (moods.reduce((s: number, m: any) => s + m.anxiety_score, 0) / moods.length).toFixed(1) : 'N/A'
  const highRiskCount = submissions.filter((s: any) => s.high_risk_flag).length
  const generatedDate = new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })

  const pdfDoc = (
    <Document title={`V Welfare — Patient Report — ${profile.full_name_en}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.accentBar} />
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brandName}>V Welfare</Text>
            <Text style={styles.brandTagline}>MENTAL HEALTH PLATFORM</Text>
          </View>
          <Text style={styles.reportLabel}>Clinical Patient Report{'\n'}Generated {generatedDate}</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <View style={styles.row}><Text style={styles.label}>Full Name</Text><Text style={styles.value}>{profile.full_name_en}</Text></View>
          {profile.date_of_birth && (
            <View style={styles.row}><Text style={styles.label}>Date of Birth</Text><Text style={styles.value}>{profile.date_of_birth}</Text></View>
          )}
          {profile.gender && (
            <View style={styles.row}><Text style={styles.label}>Gender</Text><Text style={styles.value}>{profile.gender}</Text></View>
          )}
          {profile.country_of_residence && (
            <View style={styles.row}><Text style={styles.label}>Country</Text><Text style={styles.value}>{profile.country_of_residence}</Text></View>
          )}
          <View style={styles.row}><Text style={styles.label}>Member Since</Text><Text style={styles.value}>{new Date(profile.created_at).toLocaleDateString()}</Text></View>

          <Text style={styles.sectionTitle}>Mood Summary (Last 30 Days)</Text>
          <View style={styles.row}><Text style={styles.label}>Check-ins</Text><Text style={styles.value}>{moods.length}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Avg Mood Score</Text><Text style={styles.value}>{avgMood} / 10</Text></View>
          <View style={styles.row}><Text style={styles.label}>Avg Anxiety Score</Text><Text style={styles.value}>{avgAnxiety} / 10</Text></View>

          <Text style={styles.sectionTitle}>Assessment History ({submissions.length} submissions)</Text>
          {highRiskCount > 0 && (
            <View style={{ backgroundColor: '#FEE2E2', borderRadius: 6, padding: 8, marginBottom: 10 }}>
              <Text style={{ fontSize: 9, color: '#991B1B', fontFamily: 'Helvetica-Bold' }}>
                ⚠  {highRiskCount} high-risk result{highRiskCount > 1 ? 's' : ''} recorded — clinical follow-up recommended
              </Text>
            </View>
          )}
          {submissions.length === 0 ? (
            <Text style={{ fontSize: 9, color: '#9CA3AF' }}>No assessments completed yet.</Text>
          ) : (
            submissions.map((s: any, i: number) => (
              <View key={i} style={styles.submissionCard}>
                <Text style={styles.submissionTitle}>{s.assessment_definitions?.name_en ?? s.assessment_definitions?.code ?? 'Assessment'}</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>Date</Text>
                  <Text style={styles.value}>{new Date(s.submitted_at).toLocaleDateString()}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Score</Text>
                  <Text style={styles.value}>{s.total_score}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: severityBg(s.severity_band) }]}>
                  <Text style={{ fontSize: 8, color: severityText(s.severity_band) }}>
                    {s.severity_band}{s.high_risk_flag ? '  ⚠ High Risk' : ''}
                  </Text>
                </View>
              </View>
            ))
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>V Welfare — Confidential Clinical Report</Text>
            <Text style={styles.footerText}>Generated {generatedDate} · This report is for clinical use only</Text>
          </View>
        </View>
      </Page>
    </Document>
  )

  const buffer = await renderToBuffer(pdfDoc)
  const safeName = profile.full_name_en.replace(/[^a-z0-9]/gi, '_')
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="vwelfare_report_${safeName}_${new Date().toISOString().split('T')[0]}.pdf"`,
    },
  })
}
