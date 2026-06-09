import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { submission_id, assessment_name, assessment_name_ar } = await request.json()
    if (!submission_id) return NextResponse.json({ error: 'submission_id required' }, { status: 400 })

    // Verify the submission belongs to this user before notifying admins
    const { data: submission } = await supabase
      .from('assessment_submissions')
      .select('id, high_risk_flag, patient_id')
      .eq('id', submission_id)
      .eq('patient_id', user.id)
      .single()

    if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    if (!submission.high_risk_flag) return NextResponse.json({ ok: true }) // No-op if not high risk

    // Use admin client to insert notifications for admin/superadmin users (bypasses RLS)
    const db = createAdminClient()
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
          body_en: `Assessment: ${assessment_name ?? 'Unknown'}`,
          body_ar: `التقييم: ${assessment_name_ar ?? assessment_name ?? 'Unknown'}`,
          link: '/x/control/results',
        }))
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('notify-high-risk error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
