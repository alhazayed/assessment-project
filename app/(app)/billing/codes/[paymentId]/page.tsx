import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, KeyRound, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLanguage } from '@/lib/get-language'
import { loadBulkOrder } from '@/lib/billing/bulk-order'
import { GROUP_MIN, CELL_MIN, type BulkCodeStatus, type GroupCount } from '@/lib/billing/bulk'
import ReplaceCodeButton from './replace-code-button'

const STATUS: Record<BulkCodeStatus, { en: string; ar: string; color: string; bg: string }> = {
  unused: { en: 'Not used yet', ar: 'لم يُستخدم بعد', color: '#6B7280', bg: '#F1F1F2' },
  redeemed: { en: 'Redeemed', ar: 'تم استخدامه', color: '#B5790B', bg: '#FBF1DC' },
  report_ready: { en: 'Report ready', ar: 'التقرير جاهز', color: '#1B8A5A', bg: '#E6F4EC' },
}

function CountList({ items, lang }: { items: GroupCount[]; lang: 'en' | 'ar' }) {
  return (
    <ul className="space-y-1">
      {items.map((it, i) => (
        <li key={i} className="flex justify-between gap-3 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          <span>{lang === 'ar' ? it.label.ar : it.label.en}</span>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {it.count ?? (lang === 'ar' ? `أقل من ${CELL_MIN}` : `fewer than ${CELL_MIN}`)}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default async function BulkCodesPage(props: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await props.params
  const supabase = await createClient()
  const lang = await getLanguage()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/billing/codes/${paymentId}`)

  const order = await loadBulkOrder(createAdminClient(), user.id, paymentId)
  if (!order) notFound()
  const isAr = lang === 'ar'
  const pkgName = order.package ? (isAr ? order.package.nameAr : order.package.nameEn) : (isAr ? 'باقة' : 'Package')
  const g = order.groupReport

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-4xl">
      <Link href="/billing" className="inline-flex items-center gap-1.5 text-[13px] mb-4" style={{ color: 'var(--text-secondary)' }}>
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {isAr ? 'الفواتير' : 'Billing'}
      </Link>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
        {pkgName} × {order.quantity}
      </h1>
      <p className="text-[14px] mb-6" style={{ color: 'var(--text-secondary)' }}>
        {isAr
          ? `${order.counts.unused} لم تُستخدم · ${order.counts.redeemed} قيد التقييم · ${order.counts.report_ready} تقارير جاهزة`
          : `${order.counts.unused} not used · ${order.counts.redeemed} in progress · ${order.counts.report_ready} reports ready`}
      </p>

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="w-4 h-4" style={{ color: '#1D6296' }} />
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{isAr ? 'الرموز' : 'Codes'}</h2>
        </div>
        <p className="text-[12.5px] mb-4" style={{ color: 'var(--text-muted)' }}>
          {isAr
            ? 'أرسلنا الرموز كاملة إلى بريدك. هنا ترى آخر 4 أحرف من كل رمز وحالته فقط، ولا نعرض من استخدمه.'
            : 'We emailed you the full codes. Here you see the last 4 characters of each code and its status only, never who used it.'}
        </p>
        <ul className="divide-y" style={{ borderColor: 'var(--divider)' }}>
          {order.codes.map(c => {
            const st = STATUS[c.status]
            return (
              <li key={c.id} className="py-2.5 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[12px] w-6 text-end" style={{ color: 'var(--text-muted)' }}>{c.index}</span>
                  <span dir="ltr" className="font-mono text-[13.5px]" style={{ color: 'var(--text-primary)' }}>····-····-{c.hint ?? '····'}</span>
                  <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>
                    {isAr ? st.ar : st.en}
                  </span>
                </div>
                {c.status === 'unused' && order.status === 'succeeded' && (
                  <ReplaceCodeButton paymentId={order.paymentId} codeId={c.id} lang={lang} />
                )}
              </li>
            )
          })}
        </ul>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4" style={{ color: '#1D6296' }} />
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{isAr ? 'التقرير الجماعي (مجهول الهوية)' : 'Group report (anonymised)'}</h2>
        </div>
        {!g ? (
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            {isAr
              ? `يظهر التقرير الجماعي عندما يُكمل ${GROUP_MIN} أشخاص على الأقل تقاريرهم (حالياً ${order.counts.report_ready}). النتائج الفردية تبقى مع أصحابها.`
              : `The group report appears once at least ${GROUP_MIN} people have finished their report (now ${order.counts.report_ready}). Individual results stay with each person.`}
          </p>
        ) : (
          <div className="space-y-5">
            <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              {isAr
                ? `مبني على ${g.completed} تقريراً. يُعرض العدد فقط، والأعداد الأقل من ${CELL_MIN} مخفية. مؤشرات السلامة لا تظهر هنا أبداً، فهي تُتابع مع كل شخص على حدة.`
                : `Based on ${g.completed} reports. Counts only; any count below ${CELL_MIN} is hidden. Safety flags never appear here; they are followed up with each person.`}
            </p>
            {g.quadrant.length > 0 && (
              <div>
                <h3 className="text-[13px] font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{isAr ? 'الصورة العامة' : 'Overall picture'}</h3>
                <CountList items={g.quadrant} lang={lang} />
              </div>
            )}
            {g.patterns.length > 0 && (
              <div>
                <h3 className="text-[13px] font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{isAr ? 'الأنماط الأكثر شيوعاً' : 'Most common patterns'}</h3>
                <CountList items={g.patterns} lang={lang} />
              </div>
            )}
            {g.scales.map(s => (
              <div key={s.code}>
                <h3 className="text-[13px] font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{isAr ? s.name.ar : s.name.en}</h3>
                <CountList items={s.bands} lang={lang} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
