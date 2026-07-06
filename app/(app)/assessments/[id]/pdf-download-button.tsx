'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { FileDown, Loader2 } from 'lucide-react'
import { AssessmentPdfDocument } from './pdf-template'

interface Props {
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
  labelDownload: string
  labelGenerating: string
}

export function AssessmentPdfDownloadButton(props: Props) {
  const fileName = `${props.assessmentCode}_Result_${props.completedOn.replace(/[^0-9a-zA-Z]/g, '_')}.pdf`

  return (
    <PDFDownloadLink
      document={<AssessmentPdfDocument {...props} />}
      fileName={fileName}
      style={{ textDecoration: 'none' }}
    >
      {({ loading }) => (
        <span
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-opacity hover:opacity-80 cursor-pointer"
          style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)', border: '1px solid var(--divider)' }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          {loading ? props.labelGenerating : props.labelDownload}
        </span>
      )}
    </PDFDownloadLink>
  )
}
