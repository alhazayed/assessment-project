'use client'

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

interface AssessmentPdfProps {
  lang: 'en' | 'ar'
  patientName: string
  assessmentName: string
  assessmentCode: string
  completedOn: string
  score: number
  band: string
  highRisk: boolean
  explanation: string
  whatThisMeans: string[]
  recommendations: string[]
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a2e',
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 48,
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #E5E7EB',
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: { width: 32, height: 32 },
  brandBlock: { flex: 1 },
  brandLine: {
    fontSize: 8,
    color: '#9CA3AF',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#111827' },
  meta: { fontSize: 9, color: '#9CA3AF', textAlign: 'right' },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { fontSize: 9, color: '#6B7280', width: 100 },
  value: { fontSize: 9, color: '#111827', flex: 1 },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    border: '1px solid #E5E7EB',
  },
  scoreNumber: { fontSize: 32, fontFamily: 'Helvetica-Bold', color: '#1D6296' },
  bandBadge: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  highRiskBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    padding: 10,
    marginBottom: 14,
    border: '1px solid #FCA5A5',
  },
  highRiskText: { fontSize: 9, color: '#991B1B', fontFamily: 'Helvetica-Bold' },
  bodyText: { fontSize: 9.5, lineHeight: 1.5, color: '#374151' },
  bullet: { flexDirection: 'row', marginBottom: 4, gap: 6 },
  bulletDot: { fontSize: 9, color: '#1D6296' },
  bulletText: { fontSize: 9.5, lineHeight: 1.4, color: '#374151', flex: 1 },
  disclaimer: {
    fontSize: 7.5,
    color: '#9CA3AF',
    marginTop: 20,
    paddingTop: 12,
    borderTop: '1px solid #E5E7EB',
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: '#9CA3AF' },
})

function bandColor(band: string) {
  const b = band.toLowerCase()
  if (b.includes('minimal') || b.includes('none') || b.includes('normal') || b.includes('low')) return { bg: '#D1FAE5', text: '#065F46' }
  if (b.includes('mild')) return { bg: '#FEF3C7', text: '#92400E' }
  if (b.includes('moderate')) return { bg: '#FFEDD5', text: '#9A3412' }
  return { bg: '#FEE2E2', text: '#991B1B' }
}

export function AssessmentPdfDocument({
  lang, patientName, assessmentName, assessmentCode, completedOn,
  score, band, highRisk, explanation, whatThisMeans, recommendations,
}: AssessmentPdfProps) {
  const isAr = lang === 'ar'
  const colors = bandColor(band)
  const generatedDate = new Date().toLocaleDateString(isAr ? 'ar' : 'en', { year: 'numeric', month: 'long', day: 'numeric' })

  const L = {
    reportTitle: isAr ? 'تقرير نتائج التقييم' : 'Assessment Result Report',
    generated: isAr ? 'تاريخ الإصدار' : 'Generated',
    patient: isAr ? 'المريض' : 'Patient',
    assessment: isAr ? 'التقييم' : 'Assessment',
    completed: isAr ? 'تاريخ الإكمال' : 'Completed',
    score: isAr ? 'النتيجة' : 'Score',
    highRisk: isAr ? 'نتيجة عالية الخطورة — يُنصح بمتابعة سريرية' : 'High-risk result — clinical follow-up recommended',
    whatItMeans: isAr ? 'ماذا تعني هذه النتيجة' : 'What This Means',
    recommendations: isAr ? 'التوصيات' : 'Recommendations',
    disclaimer: isAr
      ? 'هذا التقرير أداة فحص وتوعية ذاتية ولا يُشكّل تشخيصاً سريرياً. النتائج مخصصة للوعي الشخصي فقط ويجب مناقشتها مع أخصائي رعاية صحية نفسية مرخّص قبل اتخاذ أي قرار سريري. إذا كنت تفكر في إيذاء نفسك، يرجى الاتصال بخدمات الطوارئ المحلية أو خط أزمات الصحة النفسية فوراً.'
      : 'This report is a screening and self-awareness tool and does not constitute a clinical diagnosis. Results are intended for personal awareness only and should be discussed with a licensed mental health professional before any clinical decision is made. If you are having thoughts of harming yourself, please contact local emergency services or a mental health crisis line immediately.',
    footerBrand: 'V Welfare',
    confidential: isAr ? 'تقرير سري' : 'Confidential Report',
  }

  return (
    <Document title={`V Welfare — ${assessmentName} — ${patientName}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image style={styles.logo} src="/logo.png" />
          <View style={styles.brandBlock}>
            <Text style={styles.brandLine}>V WELFARE · MENTAL HEALTH PLATFORM</Text>
            <Text style={styles.title}>{L.reportTitle}</Text>
          </View>
          <Text style={styles.meta}>{L.generated}{'\n'}{generatedDate}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.row}><Text style={styles.label}>{L.patient}</Text><Text style={styles.value}>{patientName}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{L.assessment}</Text><Text style={styles.value}>{assessmentName} ({assessmentCode})</Text></View>
          <View style={styles.row}><Text style={styles.label}>{L.completed}</Text><Text style={styles.value}>{completedOn}</Text></View>
        </View>

        {highRisk && (
          <View style={styles.highRiskBox}>
            <Text style={styles.highRiskText}>⚠ {L.highRisk}</Text>
          </View>
        )}

        <View style={styles.scoreBox}>
          <Text style={styles.scoreNumber}>{score}</Text>
          <View>
            <Text style={{ fontSize: 8, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4 }}>{L.score}</Text>
            <Text style={[styles.bandBadge, { backgroundColor: colors.bg, color: colors.text }]}>{band}</Text>
          </View>
        </View>

        {explanation && (
          <View style={styles.section}>
            <Text style={styles.bodyText}>{explanation}</Text>
          </View>
        )}

        {whatThisMeans.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{L.whatItMeans}</Text>
            {whatThisMeans.map((point, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletDot}>·</Text>
                <Text style={styles.bulletText}>{point}</Text>
              </View>
            ))}
          </View>
        )}

        {recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{L.recommendations}</Text>
            {recommendations.map((rec, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletDot}>·</Text>
                <Text style={styles.bulletText}>{rec}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.disclaimer}>{L.disclaimer}</Text>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{L.footerBrand} · {L.confidential}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
