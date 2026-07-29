/** Shared category catalog for landing + authenticated assessments pages. */

export type AssessmentCategoryId =
  | 'mood'
  | 'anxiety'
  | 'stress'
  | 'trauma'
  | 'wellbeing'
  | 'sleep'
  | 'substance'
  | 'personality'
  | 'other'

export interface AssessmentCategory {
  id: AssessmentCategoryId
  labelEn: string
  labelAr: string
  codes: string[]
}

export const ASSESSMENT_CATEGORIES: AssessmentCategory[] = [
  {
    id: 'mood',
    labelEn: 'Mood & Depression',
    labelAr: 'المزاج والاكتئاب',
    codes: ['PHQ9', 'GDS15', 'MDQ', 'DASS21', 'CESD', 'ASRM', 'PANAS'],
  },
  {
    id: 'anxiety',
    labelEn: 'Anxiety',
    labelAr: 'القلق',
    codes: ['GAD7', 'LSAS', 'OCIR', 'SPIN', 'PDSS', 'PSWQ', 'ASI3'],
  },
  {
    id: 'stress',
    labelEn: 'Stress',
    labelAr: 'الضغط النفسي',
    codes: ['PSS10', 'PSS4', 'K10'],
  },
  {
    id: 'trauma',
    labelEn: 'Trauma & PTSD',
    labelAr: 'الصدمة واضطراب ما بعد الصدمة',
    codes: ['PCL5', 'IESR', 'ACE'],
  },
  {
    id: 'wellbeing',
    labelEn: 'Well-being',
    labelAr: 'الرفاهية وتقدير الذات',
    codes: ['WHO5', 'SWLS', 'RSES', 'BRS', 'CDRISC', 'WHOQOL', 'UCLA'],
  },
  {
    id: 'sleep',
    labelEn: 'Sleep',
    labelAr: 'النوم',
    codes: ['ISI'],
  },
  {
    id: 'substance',
    labelEn: 'Substance use',
    labelAr: 'تعاطي المواد',
    codes: ['AUDIT', 'CAGE', 'DAST10'],
  },
  {
    id: 'personality',
    labelEn: 'Personality & mindfulness',
    labelAr: 'الشخصية واليقظة',
    codes: ['BFI44', 'IPIP120', 'FFMQ', 'ECRR'],
  },
  {
    id: 'other',
    labelEn: 'Other',
    labelAr: 'أخرى',
    codes: ['ASRS', 'EAT26', 'PHQ15', 'DERS', 'OLBI'],
  },
]

export function categoryForCode(code: string): AssessmentCategory | undefined {
  return ASSESSMENT_CATEGORIES.find(c => c.codes.includes(code))
}
