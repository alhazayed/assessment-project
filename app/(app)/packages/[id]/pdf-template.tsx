'use client'

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import type { PackageResult, InterpretationBand, OutputDimension } from '@/lib/types'

interface PkgAssessment {
  assessment_code: string
  name_en: string
  weight_pct: number
  is_available: boolean
}

interface PdfReportProps {
  pkg: {
    name_en: string
    color: string
    category: string
    interpretation_bands: InterpretationBand[]
    output_dimensions: OutputDimension[]
    package_assessments?: PkgAssessment[]
  }
  result: PackageResult
  completedOn: string
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
    marginBottom: 24,
    borderBottom: '2px solid #E5E7EB',
    paddingBottom: 16,
  },
  brandLine: {
    fontSize: 8,
    color: '#9CA3AF',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: '#6B7280',
  },
  meta: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 4,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#9CA3AF',
    marginBottom: 8,
  },
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
  scoreNumber: {
    fontSize: 40,
    fontFamily: 'Helvetica-Bold',
  },
  scoreLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 2,
  },
  bandLabel: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  assessmentName: {
    fontSize: 10,
    flex: 1,
  },
  assessmentScore: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    width: 32,
    textAlign: 'right',
  },
  assessmentWeight: {
    fontSize: 8,
    color: '#9CA3AF',
    width: 40,
    textAlign: 'right',
  },
  barOuter: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 8,
  },
  insightCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    border: '1px solid #E5E7EB',
  },
  insightCardTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
  },
  bullet: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  bulletDot: {
    fontSize: 10,
    color: '#6B7280',
    lineHeight: 1.4,
  },
  bulletText: {
    fontSize: 9,
    color: '#374151',
    flex: 1,
    lineHeight: 1.4,
  },
  summaryText: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    borderTop: '1px solid #E5E7EB',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    color: '#9CA3AF',
  },
  disclaimer: {
    fontSize: 7,
    color: '#9CA3AF',
    marginTop: 20,
    lineHeight: 1.5,
    borderTop: '1px solid #E5E7EB',
    paddingTop: 8,
  },
})

function scoreColor(score: number) {
  if (score >= 70) return '#22c55e'
  if (score >= 45) return '#f59e0b'
  return '#ef4444'
}

export function PackagePdfDocument({ pkg, result, completedOn }: PdfReportProps) {
  const band = pkg.interpretation_bands?.find(b =>
    (result.composite_score ?? 0) >= b.min && (result.composite_score ?? 0) <= b.max
  ) ?? pkg.interpretation_bands?.[pkg.interpretation_bands.length - 1]

  const availableAssessments = (pkg.package_assessments ?? [])
    .filter(a => a.is_available)

  const compositeColor = scoreColor(result.composite_score ?? 0)

  return (
    <Document
      title={`${pkg.name_en} — Package Report`}
      author="V Welfare"
      subject="Assessment Package Results"
    >
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brandLine}>V Welfare · Assessment Package Report</Text>
          <Text style={styles.title}>{pkg.name_en}</Text>
          <Text style={styles.subtitle}>Composite Assessment Results</Text>
          <Text style={styles.meta}>Completed {completedOn}</Text>
        </View>

        {/* Composite Score */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Composite Score</Text>
          <View style={styles.scoreBox}>
            <View>
              <Text style={[styles.scoreNumber, { color: compositeColor }]}>
                {result.composite_score ?? 0}
              </Text>
              <Text style={styles.scoreLabel}>out of 100</Text>
            </View>
            <View style={{ flex: 1 }}>
              {band && (
                <>
                  <Text style={[styles.bandLabel, { color: band.color }]}>
                    {band.band_en}
                  </Text>
                  <Text style={styles.scoreLabel}>
                    Range: {band.min}–{band.max}
                  </Text>
                </>
              )}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {pkg.interpretation_bands?.map((b, i) => (
                  <Text
                    key={i}
                    style={{
                      fontSize: 7,
                      color: b === band ? b.color : '#9CA3AF',
                      fontFamily: b === band ? 'Helvetica-Bold' : 'Helvetica',
                    }}
                  >
                    {b.min}–{b.max} {b.band_en}{'  '}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Assessment Scores */}
        {availableAssessments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Individual Assessment Scores</Text>
            {availableAssessments.map(a => {
              const score = result.individual_scores[a.assessment_code]
              if (score === undefined) return null
              const color = scoreColor(score)
              return (
                <View key={a.assessment_code}>
                  <View style={styles.row}>
                    <Text style={styles.assessmentName}>{a.name_en}</Text>
                    <Text style={styles.assessmentWeight}>{a.weight_pct}% wt</Text>
                    <Text style={[styles.assessmentScore, { color }]}>{score}</Text>
                  </View>
                  <View style={styles.barOuter}>
                    <View style={{ height: 4, width: `${score}%`, backgroundColor: color, borderRadius: 2 }} />
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* Strengths */}
        {result.strengths_en.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.insightCard, { borderLeftColor: '#22c55e', borderLeftWidth: 3 }]}>
              <Text style={[styles.insightCardTitle, { color: '#15803d' }]}>Strengths</Text>
              {result.strengths_en.map((s, i) => (
                <View key={i} style={styles.bullet}>
                  <Text style={styles.bulletDot}>·</Text>
                  <Text style={styles.bulletText}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Risks */}
        {result.risk_indicators_en.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.insightCard, { borderLeftColor: '#ef4444', borderLeftWidth: 3 }]}>
              <Text style={[styles.insightCardTitle, { color: '#b91c1c' }]}>Areas for Attention</Text>
              {result.risk_indicators_en.map((r, i) => (
                <View key={i} style={styles.bullet}>
                  <Text style={styles.bulletDot}>·</Text>
                  <Text style={styles.bulletText}>{r}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recommendations */}
        {result.recommendations_en.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.insightCard, { borderLeftColor: '#f59e0b', borderLeftWidth: 3 }]}>
              <Text style={[styles.insightCardTitle, { color: '#b45309' }]}>Recommendations</Text>
              {result.recommendations_en.map((r, i) => (
                <View key={i} style={styles.bullet}>
                  <Text style={styles.bulletDot}>·</Text>
                  <Text style={styles.bulletText}>{r}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          This package is a screening and self-development tool and does not constitute a clinical diagnosis,
          employment decision, legal opinion, or marital recommendation. Results are for personal awareness only.
          V Welfare © {new Date().getFullYear()}
        </Text>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>V Welfare · {pkg.name_en}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}
