import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const PAGE_SIZE = 100

function getAgeGroup(dob: string | null, referenceDate: string): string {
  if (!dob) return 'Unknown'
  const birth = new Date(dob)
  const ref = new Date(referenceDate)
  if (isNaN(birth.getTime())) return 'Unknown'
  let age = ref.getFullYear() - birth.getFullYear()
  const m = ref.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--
  if (age < 0) return 'Unknown'
  if (age < 18) return 'Under 18'
  if (age <= 24) return '18–24'
  if (age <= 34) return '25–34'
  if (age <= 44) return '35–44'
  if (age <= 54) return '45–54'
  return '55+'
}

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const assessment = searchParams.get('assessment') || ''
    const severity = searchParams.get('severity') || ''
    const from = searchParams.get('from') || ''
    const to = searchParams.get('to') || ''
    const gender = searchParams.get('gender') || ''
    const ageGroup = searchParams.get('ageGroup') || ''
    const country = searchParams.get('country') || ''
    const education = searchParams.get('education') || ''
    const employment = searchParams.get('employment') || ''
    const medication = searchParams.get('medication') || ''
    const minScore = searchParams.get('minScore') || ''
    const maxScore = searchParams.get('maxScore') || ''
    const page = Math.max(1, Math.min(parseInt(searchParams.get('page') || '1', 10), 10000))
    const offset = (page - 1) * PAGE_SIZE

    const db = createAdminClient()

    let query = db.from('assessment_submissions')
      .select(`
        id, total_score, severity_band, high_risk_flag, submitted_at,
        patient_id, definition_id,
        guest_dob, guest_gender, guest_education, guest_country,
        assessment_definitions(name_en, code),
        profiles(gender, date_of_birth, country_of_residence, educational_status,
          patient_profiles(employment_status, has_psychiatric_medications))
      `, { count: 'exact' })
      .order('submitted_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (from) query = query.gte('submitted_at', from)
    if (to) query = query.lte('submitted_at', to + 'T23:59:59')
    if (severity === 'high_risk') query = query.eq('high_risk_flag', true)
    if (minScore) query = query.gte('total_score', parseInt(minScore))
    if (maxScore) query = query.lte('total_score', parseInt(maxScore))

    const { data: subs, count } = await query

    let results = (subs || []).map((s: any) => {
      const p = s.profiles
      const pp = Array.isArray(p?.patient_profiles) ? p.patient_profiles[0] : p?.patient_profiles
      const dob = p?.date_of_birth || s.guest_dob || null
      const medVal = pp?.has_psychiatric_medications
      return {
        id: s.id,
        assessment_name: s.assessment_definitions?.name_en || '',
        code: s.assessment_definitions?.code || '',
        total_score: s.total_score,
        severity_band: s.severity_band,
        high_risk_flag: s.high_risk_flag,
        submitted_at: s.submitted_at,
        // Anonymized demographics — no name, email, or direct identifiers
        gender: (p?.gender || s.guest_gender || 'Unknown').replace(/^./, (c: string) => c.toUpperCase()),
        age_group: getAgeGroup(dob, s.submitted_at),
        country: p?.country_of_residence || s.guest_country || 'Unknown',
        education: p?.educational_status || s.guest_education || 'Unknown',
        employment: pp?.employment_status || 'Unknown',
        medication: medVal === true ? 'Yes' : medVal === false ? 'No' : 'Unknown',
      }
    })

    // In-memory filters for joined/derived columns
    if (assessment) results = results.filter((r: any) => r.code === assessment)
    if (severity && severity !== 'high_risk') results = results.filter((r: any) => (r.severity_band || '').toLowerCase().includes(severity.toLowerCase()))
    if (gender) results = results.filter((r: any) => r.gender.toLowerCase() === gender.toLowerCase())
    if (ageGroup) results = results.filter((r: any) => r.age_group === ageGroup)
    if (country) results = results.filter((r: any) => r.country.toLowerCase().includes(country.toLowerCase()))
    if (education) results = results.filter((r: any) => r.education === education)
    if (employment) results = results.filter((r: any) => r.employment === employment)
    if (medication) results = results.filter((r: any) => r.medication === medication)

    const { data: defs } = await db.from('assessment_definitions').select('code, name_en').order('name_en')
    const assessments = (defs || []).map((d: any) => ({ code: d.code, name: d.name_en }))

    return NextResponse.json({
      results,
      assessments,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
