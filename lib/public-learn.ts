import { ASSESSMENT_CONTENT } from '@/lib/assessment-content'

export interface LearnPageDef {
  slug: string
  code: string
  nameEn: string
  nameAr: string
  shortEn: string
  shortAr: string
  citation?: string
}

/** Curated public instrument explainers — safe for AI citation (no copyrighted item text). */
export const LEARN_PAGES: LearnPageDef[] = [
  {
    slug: 'phq-9',
    code: 'PHQ9',
    nameEn: 'PHQ-9 (Patient Health Questionnaire-9)',
    nameAr: 'PHQ-9 — مقياس الصحة النفسية للمريض',
    shortEn: 'Validated 9-item depression screening tool widely used in primary care and research.',
    shortAr: 'أداة فحص للاكتئاب من 9 أسئلة معتمدة في الرعاية الأولية والبحث.',
    citation: 'Kroenke K, Spitzer RL, Williams JB. The PHQ-9. J Gen Intern Med. 2001.',
  },
  {
    slug: 'gad-7',
    code: 'GAD7',
    nameEn: 'GAD-7 (Generalized Anxiety Disorder Scale)',
    nameAr: 'GAD-7 — مقياس اضطراب القلق العام',
    shortEn: '7-item anxiety severity measure with strong sensitivity for generalized anxiety disorder.',
    shortAr: 'مقياس من 7 أسئلة لشدة القلق بحساسية عالية لاضطراب القلق العام.',
    citation: 'Spitzer RL, Kroenke K, Williams JB, Löwe B. A brief measure for assessing GAD. Arch Intern Med. 2006.',
  },
  {
    slug: 'who-5',
    code: 'WHO5',
    nameEn: 'WHO-5 Well-Being Index',
    nameAr: 'مؤشر الرفاهية WHO-5',
    shortEn: 'WHO-developed 5-item positive mental well-being screener used globally.',
    shortAr: 'مؤشر من 5 أسئلة للرفاهية النفسية الإيجابية من منظمة الصحة العالمية.',
    citation: 'Topp CW, Østergaard SD, Søndergaard S, Bech P. The WHO-5 Well-Being Index. Psychother Psychosom. 2015.',
  },
  {
    slug: 'dass-21',
    code: 'DASS21',
    nameEn: 'DASS-21 (Depression, Anxiety and Stress Scale)',
    nameAr: 'DASS-21 — مقياس الاكتئاب والقلق والضغط',
    shortEn: '21-item scale measuring depression, anxiety, and stress subscales.',
    shortAr: 'مقياس من 21 سؤالاً يقيس الاكتئاب والقلق والضغط النفسي.',
    citation: 'Lovibond SH, Lovibond PF. Manual for the Depression Anxiety Stress Scales. 1995.',
  },
  {
    slug: 'pcl-5',
    code: 'PCL5',
    nameEn: 'PCL-5 (PTSD Checklist for DSM-5)',
    nameAr: 'PCL-5 — قائمة PTSD لـ DSM-5',
    shortEn: '20-item self-report measure of PTSD symptoms aligned with DSM-5 criteria.',
    shortAr: 'مقياس من 20 سؤالاً لأعراض اضطراب ما بعد الصدمة وفق DSM-5.',
    citation: 'Weathers FW, Litz BT, Keane TM, Palmieri PA, Marx BP, Schnurr PP. The PTSD Checklist for DSM-5. 2013.',
  },
  {
    slug: 'asrs-adhd',
    code: 'ASRS',
    nameEn: 'ASRS (Adult ADHD Self-Report Scale)',
    nameAr: 'ASRS — مقياس ADHD للبالغين',
    shortEn: 'WHO-supported adult ADHD screener; screening only, not diagnostic.',
    shortAr: 'أداة فحص ADHD للبالغين بدعم WHO؛ للفحص وليس للتشخيص.',
    citation: 'Kessler RC, Adler L, Ames M, et al. The World Health Organization Adult ADHD Self-Report Scale. Psychol Med. 2005.',
  },
  {
    slug: 'insomnia-isi',
    code: 'ISI',
    nameEn: 'ISI (Insomnia Severity Index)',
    nameAr: 'ISI — مؤشر شدة الأرق',
    shortEn: '7-item clinical measure of insomnia severity and daytime impact.',
    shortAr: 'مقياس من 7 أسئلة لشدة الأرق وتأثيره النهاري.',
    citation: 'Bastien CH, Vallières A, Morin CM. Validation of the Insomnia Severity Index. Sleep. 2001.',
  },
  {
    slug: 'alcohol-audit-c',
    code: 'AUDITC',
    nameEn: 'AUDIT-C (Alcohol Use Disorders Identification Test — Consumption)',
    nameAr: 'AUDIT-C — فحص استهلاك الكحول',
    shortEn: 'WHO 3-item screen for hazardous alcohol use.',
    shortAr: 'فحص من 3 أسئلة من WHO لاستخدام الكحول الخطير.',
    citation: 'Bush K, Kivlahan DR, McDonell MB, Fihn SD, Bradley KA. The AUDIT alcohol consumption questions. Arch Intern Med. 1998.',
  },
  {
    slug: 'ace-questionnaire',
    code: 'ACE',
    nameEn: 'ACE Questionnaire (Adverse Childhood Experiences)',
    nameAr: 'استبيان ACE — تجارب الطفولة السلبية',
    shortEn: '10-item questionnaire on adverse childhood experiences linked to later health outcomes.',
    shortAr: 'استبيان من 10 أسئلة عن تجارب الطفولة السلبية وارتباطها بالصحة لاحقاً.',
    citation: 'Felitti VJ, et al. Relationship of childhood abuse and household dysfunction to many leading causes of death. Am J Prev Med. 1998.',
  },
  {
    slug: 'adhd-screening',
    code: 'ASRS',
    nameEn: 'Adult ADHD Screening',
    nameAr: 'فحص ADHD للبالغين',
    shortEn: 'Overview of adult ADHD screening, regulation zones, and when to seek clinical evaluation.',
    shortAr: 'نظرة عامة على فحص ADHD للبالغين ومتى تطلب تقييماً سريرياً.',
    citation: 'Kessler RC, et al. WHO Adult ADHD Self-Report Scale. 2005.',
  },
]

export function getLearnPageBySlug(slug: string): LearnPageDef | undefined {
  return LEARN_PAGES.find(p => p.slug === slug)
}

export function getLearnContent(code: string) {
  return ASSESSMENT_CONTENT[code] ?? null
}

export function getRelatedLearnPages(codes: string[], currentSlug: string): LearnPageDef[] {
  return LEARN_PAGES.filter(p => codes.includes(p.code) && p.slug !== currentSlug).slice(0, 4)
}
