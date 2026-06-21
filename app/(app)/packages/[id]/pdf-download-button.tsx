'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { FileDown, Loader2 } from 'lucide-react'
import { PackagePdfDocument } from './pdf-template'
import type { PackageResult, InterpretationBand, OutputDimension } from '@/lib/types'

interface PkgAssessment {
  assessment_code: string
  name_en: string
  weight_pct: number
  is_available: boolean
}

interface PdfDownloadButtonProps {
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
  labelDownload: string
  labelGenerating: string
}

export function PdfDownloadButton({
  pkg,
  result,
  completedOn,
  labelDownload,
  labelGenerating,
}: PdfDownloadButtonProps) {
  const fileName = `${pkg.name_en.replace(/\s+/g, '_')}_Report.pdf`

  return (
    <PDFDownloadLink
      document={
        <PackagePdfDocument pkg={pkg} result={result} completedOn={completedOn} />
      }
      fileName={fileName}
      style={{ textDecoration: 'none' }}
    >
      {({ loading }) => (
        <span
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-opacity hover:opacity-80 cursor-pointer"
          style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)', border: '1px solid var(--divider)' }}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileDown className="w-4 h-4" />
          )}
          {loading ? labelGenerating : labelDownload}
        </span>
      )}
    </PDFDownloadLink>
  )
}
