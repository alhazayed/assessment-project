import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { submission_id } = await request.json()
    if (!submission_id) return NextResponse.json({ error: 'submission_id required' }, { status: 400 })

    // Verify the submission belongs to this user before notifying admins
    const { data: submission } = await supabase
      .from('assessment_submissions')
      .select('id, high_risk_flag, patient_id, definition_id')
      .eq('id', submission_id)
      .eq('patient_id', user.id)
      .single()

    if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    if (!submission.high_risk_flag) return NextResponse.json({ ok: true })

    const db = createAdminClient()

    // Deduplication: skip if any admin was already notified for this submission
    const { count: existingCount } = await db
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'high_risk')
      .contains('link', submission_id)

    if ((existingCount ?? 0) > 0) return NextResponse.json({ ok: true, deduplicated: true })

    // Fetch assessment name from DB — never trust client-supplied strings
    const { data: def } = await db
      .from('assessment_definitions')
      .select('name_en, name_ar')
      .eq('id', submission.definition_id)
      .single()

    const nameEn = def?.name_en ?? 'Unknown'
    const nameAr = def?.name_ar ?? nameEn

    const { data: admins } = await db
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'superadmin'])

    if (admins && admins.length > 0) {
      await db.from('notifications').insert(
        admins.map(a => ({
          user_id: a.id,
          type: 'high_risk',
          title_en: '⚠ High-risk flag raised',
          title_ar: '⚠ تم رفع علامة خطورة عالية',
          body_en: `Assessment: ${nameEn} — submission ${submission_id}`,
          body_ar: `التقييم: ${nameAr} — رمز التقديم ${submission_id}`,
          link: `/x/control/results?submission=${submission_id}`,
        }))
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('notify-high-risk error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
