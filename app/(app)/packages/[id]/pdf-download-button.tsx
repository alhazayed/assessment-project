'use client'

import { useState } from 'react'
import { PDFDownloadLink, pdf } from '@react-pdf/renderer'
import { FileDown, Loader2 } from 'lucide-react'
import { PackagePdfDocument } from './pdf-template'
import { isNative } from '@/lib/mobile/platform'
import { downloadPdf } from '@/lib/mobile/file-download'
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
  const [nativeLoading, setNativeLoading] = useState(false)

  // On native: generate the PDF blob in-browser and share via native share sheet
  if (isNative()) {
    const handleNativeDownload = async () => {
      setNativeLoading(true)
      try {
        const doc = <PackagePdfDocument pkg={pkg} result={result} completedOn={completedOn} />
        const blob = await pdf(doc).toBlob()
        const objectUrl = URL.createObjectURL(blob)
        await downloadPdf(objectUrl, fileName)
        URL.revokeObjectURL(objectUrl)
      } catch (err) {
        console.error('[PdfDownloadButton] native error', err)
      } finally {
        setNativeLoading(false)
      }
    }

    return (
      <button
        onClick={handleNativeDownload}
        disabled={nativeLoading}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-opacity hover:opacity-80 cursor-pointer disabled:opacity-50"
        style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)', border: '1px solid var(--divider)' }}
      >
        {nativeLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileDown className="w-4 h-4" />
        )}
        {nativeLoading ? labelGenerating : labelDownload}
      </button>
    )
  }

  // On web: use react-pdf's built-in download link
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
