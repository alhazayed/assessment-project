import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, Phone, ExternalLink, ArrowLeft } from 'lucide-react'
import { CRISIS_LINES, CRISIS_HELPLINE_URL } from '@/lib/crisis-resources'

export const metadata: Metadata = {
  title: 'Emergency Resources | V Welfare',
  description: 'Crisis support and emergency mental health resources. If you are in immediate danger, contact emergency services.',
  robots: { index: true, follow: true },
}

export default function EmergencyPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: '#FFF5F5' }}>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to home
        </Link>

        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-red-900 mb-2">Emergency &amp; Crisis Support</h1>
          <p className="text-gray-600 text-sm">
            If you or someone you know is in immediate danger, please contact emergency services right away.
            V Welfare is a screening tool — not emergency care.
          </p>
        </div>

        <div className="bg-white rounded-2xl border-l-4 border-red-500 p-5 mb-6 shadow-sm">
          <p className="text-gray-700 leading-relaxed">
            You are not alone. Reaching out for help is a sign of strength. Trained crisis counselors
            are available 24/7. If you are thinking about harming yourself, please call one of the
            numbers below immediately.
          </p>
        </div>

        <div className="space-y-3 mb-8">
          {CRISIS_LINES.map(line => (
            <a
              key={line.number}
              href={`tel:${line.tel ?? line.number.replace(/\D/g, '')}`}
              className="flex items-center gap-4 bg-white rounded-2xl p-4 border-2 border-blue-800 hover:bg-blue-50 transition-colors shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-800 flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{line.country_en}</p>
                <p className="text-lg font-bold text-blue-900">{line.number}</p>
              </div>
            </a>
          ))}
        </div>

        <a
          href={CRISIS_HELPLINE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-white font-semibold mb-6 transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#1D6296' }}
        >
          <ExternalLink className="w-4 h-4" aria-hidden="true" />
          Find a helpline in your country
        </a>

        <div className="bg-blue-50 rounded-2xl p-6 text-center mb-6">
          <p className="text-3xl mb-2" aria-hidden="true">💙</p>
          <p className="text-blue-900 font-medium leading-relaxed">
            Your wellbeing matters. Professional mental health support is available and recovery is possible.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 text-sm text-gray-600 space-y-2">
          <p className="font-semibold text-gray-800">Additional resources</p>
          <p>Crisis Text Line (US): Text HOME to 741741</p>
          <p>International Association for Suicide Prevention: <a href="https://www.iasp.info/resources/Crisis_Centres/" className="text-blue-700 underline" target="_blank" rel="noopener noreferrer">iasp.info</a></p>
          <p className="pt-2 text-xs text-gray-400 border-t border-gray-100">
            V Welfare does not provide emergency services. This page is for informational purposes only.
          </p>
        </div>
      </div>
    </main>
  )
}
