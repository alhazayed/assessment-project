import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Info, LifeBuoy, Stethoscope } from 'lucide-react'
import type { Bi, FiredPattern, ProfileReport } from '@/lib/package-profiles/types'

const KIND_STYLE: Record<FiredPattern['kind'], { color: string; Icon: typeof Info }> = {
  safety: { color: '#dc2626', Icon: LifeBuoy },
  clinical: { color: '#ea580c', Icon: Stethoscope },
  attention: { color: '#d97706', Icon: AlertTriangle },
  info: { color: '#1D6296', Icon: Info },
  strength: { color: '#16a34a', Icon: CheckCircle2 },
}

const L = {
  concerns: { en: 'What stands out', ar: 'أبرز النتائج' },
  strengths: { en: 'Strengths', ar: 'نقاط القوة' },
  more: { en: 'More about you', ar: 'المزيد عنك' },
  scales: { en: 'Your results, scale by scale', ar: 'نتائجك مقياساً بمقياس' },
  scalesHint: {
    en: 'Each scale is scored on its own published bands. Scores are not averaged across scales.',
    ar: 'يُحتسب كل مقياس وفق نطاقاته المنشورة الخاصة به. لا يتم حساب متوسط الدرجات بين المقاييس.',
  },
  next: { en: 'Suggested next step', ar: 'الخطوة التالية المقترحة' },
  evidence: { en: 'Evidence', ar: 'المرجع' },
  taken: { en: 'Taken', ar: 'تاريخ الإجراء' },
  help: { en: 'Get help now', ar: 'احصل على المساعدة الآن' },
  notes: { en: 'About this report', ar: 'حول هذا التقرير' },
  missing: { en: 'Not included because the assessment was not completed:', ar: 'غير مُدرج لأن التقييم لم يكتمل:' },
  of: { en: 'of', ar: 'من' },
  avg: { en: 'average', ar: 'متوسط' },
}

function PatternCard({ p, isAr }: { p: FiredPattern; isAr: boolean }) {
  const { color, Icon } = KIND_STYLE[p.kind]
  const tx = (b: Bi) => (isAr ? b.ar : b.en)
  return (
    <div className="card p-4" style={{ borderInlineStart: `3px solid ${color}` }}>
      <div className="flex items-start gap-2.5">
        <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color }} aria-hidden />
        <div className="min-w-0">
          <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{tx(p.title)}</p>
          <p className="text-[13px] mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{tx(p.text)}</p>
          {p.recommendation && (
            <p className="text-[13px] mt-2 leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              <span className="font-semibold">{tx(L.next)}: </span>{tx(p.recommendation)}
            </p>
          )}
          {p.kind === 'safety' && (
            <Link href="/emergency" className="inline-block mt-3 text-[13px] font-semibold px-3 py-1.5 rounded-lg" style={{ backgroundColor: color, color: '#fff' }}>
              {tx(L.help)}
            </Link>
          )}
          {p.evidence && (
            <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
              {tx(L.evidence)}: <bdi dir="ltr">{p.evidence}</bdi>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-alt)' }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

export function PackageProfileReport({ report, isAr }: { report: ProfileReport; isAr: boolean }) {
  const tx = (b: Bi) => (isAr ? b.ar : b.en)
  const concerns = report.patterns.filter(p => p.kind === 'safety' || p.kind === 'clinical' || p.kind === 'attention')
  const strengths = report.patterns.filter(p => p.kind === 'strength')
  const info = report.patterns.filter(p => p.kind === 'info')
  const fmtDate = (d: string | null) =>
    d ? new Intl.DateTimeFormat(isAr ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d)) : ''
  const headColor = report.safety ? KIND_STYLE.safety.color : concerns[0] ? KIND_STYLE[concerns[0].kind].color : KIND_STYLE.strength.color

  return (
    <div className="space-y-6">
      {/* Headline */}
      <div className="card p-6" style={{ borderTop: `4px solid ${headColor}` }}>
        <p className="text-[22px] font-extrabold leading-snug" style={{ color: 'var(--text-primary)' }}>{tx(report.headline)}</p>
        {(report.composite || report.quadrant) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            {report.composite && (
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{tx(report.composite.label)}</p>
                <p className="text-[20px] font-extrabold" style={{ color: report.composite.color }}>
                  {report.composite.score}
                  <span className="text-[13px] font-normal ms-1" style={{ color: 'var(--text-muted)' }}>/ {report.composite.max} · {tx(report.composite.band)}</span>
                </p>
                <div className="mt-2"><Bar value={report.composite.score} max={report.composite.max} color={report.composite.color} /></div>
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }} dir="ltr">{report.composite.evidence}</p>
              </div>
            )}
            {report.quadrant && (
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{tx(report.quadrant.label)}</p>
                <p className="text-[18px] font-bold" style={{ color: report.quadrant.color }}>{tx(report.quadrant.result)}</p>
                <p className="text-[13px] mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{tx(report.quadrant.text)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {concerns.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{tx(L.concerns)}</h2>
          {concerns.map(p => <PatternCard key={p.id} p={p} isAr={isAr} />)}
        </section>
      )}

      {strengths.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{tx(L.strengths)}</h2>
          {strengths.map(p => <PatternCard key={p.id} p={p} isAr={isAr} />)}
        </section>
      )}

      {info.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{tx(L.more)}</h2>
          {info.map(p => <PatternCard key={p.id} p={p} isAr={isAr} />)}
        </section>
      )}

      {/* Scale by scale */}
      <section className="card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--divider)' }}>
          <h2 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{tx(L.scales)}</h2>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{tx(L.scalesHint)}</p>
        </div>
        <div>
          {report.scales.map(s => (
            <div key={s.code} className="px-5 py-4" style={{ borderBottom: '1px solid var(--divider)' }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{tx(s.name)}</p>
                  {s.submitted_at && (
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{tx(L.taken)}: {fmtDate(s.submitted_at)}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {s.max !== null && (
                    <span className="text-[13px] font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                      {s.total}<span className="font-normal" style={{ color: 'var(--text-muted)' }}> / {s.max}</span>
                    </span>
                  )}
                  {s.band && (
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${s.bandColor ?? '#64748b'}1a`, color: s.bandColor ?? 'var(--text-secondary)' }}
                    >
                      {tx(s.band)}
                    </span>
                  )}
                </div>
              </div>
              {s.subscales.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 mt-3">
                  {s.subscales.map(sub => (
                    <div key={sub.key} className="min-w-0">
                      <div className="flex items-center justify-between gap-2 text-[12px] mb-1">
                        <span className="truncate" style={{ color: 'var(--text-secondary)' }}>{tx(sub.label)}</span>
                        <span className="font-mono flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                          {sub.metric === 'mean' ? sub.score.toFixed(1) : sub.score} {tx(L.of)} {sub.max}
                        </span>
                      </div>
                      <Bar value={sub.score - sub.min} max={sub.max - sub.min} color="#1D6296" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {(report.notes.length > 0 || report.missing.length > 0) && (
        <section className="p-4 rounded-xl" style={{ backgroundColor: 'var(--surface-alt)', border: '1px solid var(--divider)' }}>
          <p className="text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{tx(L.notes)}</p>
          <ul className="space-y-1.5">
            {report.notes.map((n, i) => (
              <li key={i} className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{tx(n)}</li>
            ))}
            {report.missing.length > 0 && (
              <li className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{tx(L.missing)} {report.missing.join(', ')}</li>
            )}
          </ul>
        </section>
      )}
    </div>
  )
}
