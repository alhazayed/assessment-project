'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// @react-pdf/renderer is a very heavy dependency (this page was shipping
// ~477KB of First Load JS because of it) that was previously bundled eagerly
// into this page even before the user clicked "download". next/dynamic with
// ssr:false can only be called from a Client Component, and this button is
// rendered from a Server Component page — so the dynamic import lives here,
// in a small client wrapper the server page can import instead.
export const PdfDownloadButtonLazy = dynamic(
  () => import('./pdf-download-button').then(m => m.PdfDownloadButton),
  {
    ssr: false,
    loading: () => (
      <span
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium"
        style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--text-secondary)', border: '1px solid var(--divider)' }}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
      </span>
    ),
  }
)
