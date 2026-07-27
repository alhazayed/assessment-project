import { ASSESSMENT_CONTENT } from '@/lib/assessment-content'

export interface LearnBandSummary {
  labelEn: string
  labelAr: string
  textEn: string
  textAr: string
}

export interface LearnPageDef {
  slug: string
  code: string
  nameEn: string
  nameAr: string
  shortEn: string
  shortAr: string
  overviewEn: string
  overviewAr: string
  measuresDomainEn: string
  measuresDomainAr: string
  bands: LearnBandSummary[]
  citation?: string
}

/**
 * Curated public instrument explainers — safe for AI citation.
 * No copyrighted item text; educational overviews + band summaries only.
 * Canonical ADHD page is `/learn/adhd-screening` (legacy `/learn/asrs-adhd` redirects).
 */
export const LEARN_PAGES: LearnPageDef[] = [
  {
    slug: 'phq-9',
    code: 'PHQ9',
    nameEn: 'PHQ-9 (Patient Health Questionnaire-9)',
    nameAr: 'PHQ-9 — مقياس الصحة النفسية للمريض',
    shortEn: 'Validated 9-item depression screening tool widely used in primary care and research.',
    shortAr: 'أداة فحص للاكتئاب من 9 أسئلة معتمدة في الرعاية الأولية والبحث.',
    overviewEn:
      'The PHQ-9 is a validated 9-item depression screener based on DSM criteria. It is widely used in primary care and research. Screening results are not a diagnosis.',
    overviewAr:
      'مقياس PHQ-9 أداة فحص معتمدة من 9 أسئلة للاكتئاب مبنية على معايير DSM. يُستخدم على نطاق واسع في الرعاية الأولية والبحث. نتيجة الفحص ليست تشخيصاً.',
    measuresDomainEn: 'Depressive symptoms over the past 2 weeks',
    measuresDomainAr: 'أعراض الاكتئاب خلال الأسبوعين الماضيين',
    bands: [
      { labelEn: 'Minimal', labelAr: 'طفيف', textEn: 'Little to no depressive symptoms indicated.', textAr: 'لا تشير النتيجة إلى أعراض اكتئابية ملحوظة.' },
      { labelEn: 'Mild', labelAr: 'خفيف', textEn: 'Subthreshold symptoms that may still affect daily life.', textAr: 'أعراض دون العتبة السريرية قد تؤثر على الحياة اليومية.' },
      { labelEn: 'Moderate', labelAr: 'متوسط', textEn: 'Clinically meaningful symptoms; follow-up is often recommended.', textAr: 'أعراض ذات دلالة سريرية؛ غالباً يُنصح بالمتابعة.' },
      { labelEn: 'Moderately severe', labelAr: 'متوسط إلى شديد', textEn: 'Higher symptom burden; professional evaluation is advised.', textAr: 'عبء أعراض أعلى؛ يُنصح بتقييم مختص.' },
      { labelEn: 'Severe', labelAr: 'شديد', textEn: 'High symptom severity; seek clinical care promptly.', textAr: 'شدة عالية للأعراض؛ اطلب رعاية سريرية دون تأخير.' },
    ],
    citation: 'Kroenke K, Spitzer RL, Williams JB. The PHQ-9. J Gen Intern Med. 2001.',
  },
  {
    slug: 'gad-7',
    code: 'GAD7',
    nameEn: 'GAD-7 (Generalized Anxiety Disorder Scale)',
    nameAr: 'GAD-7 — مقياس اضطراب القلق العام',
    shortEn: '7-item anxiety severity measure with strong sensitivity for generalized anxiety disorder.',
    shortAr: 'مقياس من 7 أسئلة لشدة القلق بحساسية عالية لاضطراب القلق العام.',
    overviewEn:
      'The GAD-7 is a brief validated measure of anxiety severity, especially useful for screening generalized anxiety. It does not replace clinical diagnosis.',
    overviewAr:
      'مقياس GAD-7 أداة موجزة معتمدة لشدة القلق، مفيدة خصوصاً لفحص اضطراب القلق العام. لا يغني عن التشخيص السريري.',
    measuresDomainEn: 'Anxiety symptoms over the past 2 weeks',
    measuresDomainAr: 'أعراض القلق خلال الأسبوعين الماضيين',
    bands: [
      { labelEn: 'Minimal', labelAr: 'طفيف', textEn: 'Anxiety symptoms appear within a typical range.', textAr: 'أعراض القلق ضمن نطاق معتاد.' },
      { labelEn: 'Mild', labelAr: 'خفيف', textEn: 'Mild anxiety that may benefit from self-care and monitoring.', textAr: 'قلق خفيف قد يستفيد من الرعاية الذاتية والمتابعة.' },
      { labelEn: 'Moderate', labelAr: 'متوسط', textEn: 'Moderate anxiety; consider clinician review.', textAr: 'قلق متوسط؛ يُفضل مراجعة مختص.' },
      { labelEn: 'Severe', labelAr: 'شديد', textEn: 'Severe anxiety symptoms; seek professional support.', textAr: 'أعراض قلق شديدة؛ اطلب دعماً مهنياً.' },
    ],
    citation: 'Spitzer RL, Kroenke K, Williams JB, Löwe B. A brief measure for assessing GAD. Arch Intern Med. 2006.',
  },
  {
    slug: 'who-5',
    code: 'WHO5',
    nameEn: 'WHO-5 Well-Being Index',
    nameAr: 'مؤشر الرفاهية WHO-5',
    shortEn: 'WHO-developed 5-item positive mental well-being screener used globally.',
    shortAr: 'مؤشر من 5 أسئلة للرفاهية النفسية الإيجابية من منظمة الصحة العالمية.',
    overviewEn:
      'The WHO-5 measures positive mental well-being over recent weeks. Lower scores suggest poorer well-being and may warrant depression screening.',
    overviewAr:
      'يقيس مؤشر WHO-5 الرفاهية النفسية الإيجابية خلال الأسابيع الأخيرة. الدرجات المنخفضة تشير إلى رفاهية أضعف وقد تستدعي فحص الاكتئاب.',
    measuresDomainEn: 'Positive mental well-being over the past 2 weeks',
    measuresDomainAr: 'الرفاهية النفسية الإيجابية خلال الأسبوعين الماضيين',
    bands: [
      { labelEn: 'Likely low well-being', labelAr: 'رفاهية منخفضة محتملة', textEn: 'Well-being may be substantially reduced; further screening is wise.', textAr: 'قد تكون الرفاهية منخفضة بشكل ملحوظ؛ يُنصح بفحص إضافي.' },
      { labelEn: 'Low', labelAr: 'منخفض', textEn: 'Below-average well-being that can affect daily functioning.', textAr: 'رفاهية دون المتوسط قد تؤثر على الأداء اليومي.' },
      { labelEn: 'Average', labelAr: 'متوسط', textEn: 'Well-being near expected population levels.', textAr: 'رفاهية قريبة من المستويات المتوقعة سكانياً.' },
      { labelEn: 'High', labelAr: 'مرتفع', textEn: 'Positive well-being indicators.', textAr: 'مؤشرات رفاهية إيجابية.' },
    ],
    citation: 'Topp CW, Østergaard SD, Søndergaard S, Bech P. The WHO-5 Well-Being Index. Psychother Psychosom. 2015.',
  },
  {
    slug: 'dass-21',
    code: 'DASS21',
    nameEn: 'DASS-21 (Depression, Anxiety and Stress Scale)',
    nameAr: 'DASS-21 — مقياس الاكتئاب والقلق والضغط',
    shortEn: '21-item scale measuring depression, anxiety, and stress subscales.',
    shortAr: 'مقياس من 21 سؤالاً يقيس الاكتئاب والقلق والضغط النفسي.',
    overviewEn:
      'DASS-21 assesses three related domains—depression, anxiety, and stress—in one short questionnaire. Scores guide screening, not diagnosis.',
    overviewAr:
      'يقيّم مقياس DASS-21 ثلاثة مجالات مرتبطة—الاكتئاب والقلق والضغط—في استبيان قصير واحد. الدرجات للفحص وليست تشخيصاً.',
    measuresDomainEn: 'Depression, anxiety, and stress symptoms',
    measuresDomainAr: 'أعراض الاكتئاب والقلق والضغط النفسي',
    bands: [
      { labelEn: 'Normal', labelAr: 'طبيعي', textEn: 'Scores near typical ranges for the measured subscale.', textAr: 'درجات قريبة من النطاقات المعتادة للمجال المقاس.' },
      { labelEn: 'Mild–moderate', labelAr: 'خفيف إلى متوسط', textEn: 'Elevated symptoms that may benefit from support.', textAr: 'أعراض مرتفعة قد تستفيد من الدعم.' },
      { labelEn: 'Severe–extremely severe', labelAr: 'شديد إلى شديد جداً', textEn: 'High symptom load; clinical evaluation is recommended.', textAr: 'عبء أعراض مرتفع؛ يُنصح بتقييم سريري.' },
    ],
    citation: 'Lovibond SH, Lovibond PF. Manual for the Depression Anxiety Stress Scales. 1995.',
  },
  {
    slug: 'pcl-5',
    code: 'PCL5',
    nameEn: 'PCL-5 (PTSD Checklist for DSM-5)',
    nameAr: 'PCL-5 — قائمة PTSD لـ DSM-5',
    shortEn: '20-item self-report measure of PTSD symptoms aligned with DSM-5 criteria.',
    shortAr: 'مقياس من 20 سؤالاً لأعراض اضطراب ما بعد الصدمة وفق DSM-5.',
    overviewEn:
      'The PCL-5 screens PTSD symptom severity aligned with DSM-5. A positive screen indicates need for clinical assessment, not a diagnosis.',
    overviewAr:
      'تقيس قائمة PCL-5 شدة أعراض اضطراب ما بعد الصدمة وفق DSM-5. الفحص الإيجابي يعني الحاجة لتقييم سريري وليس تشخيصاً.',
    measuresDomainEn: 'PTSD symptom severity',
    measuresDomainAr: 'شدة أعراض اضطراب ما بعد الصدمة',
    bands: [
      { labelEn: 'Below screening threshold', labelAr: 'دون عتبة الفحص', textEn: 'Symptoms may be present but below common screening cutoffs.', textAr: 'قد توجد أعراض لكنها دون عتبات الفحص الشائعة.' },
      { labelEn: 'Above screening threshold', labelAr: 'فوق عتبة الفحص', textEn: 'Elevated PTSD symptoms; seek trauma-informed clinical care.', textAr: 'أعراض مرتفعة لاضطراب ما بعد الصدمة؛ اطلب رعاية سريرية متخصصة بالصدمة.' },
    ],
    citation: 'Weathers FW, Litz BT, Keane TM, Palmieri PA, Marx BP, Schnurr PP. The PTSD Checklist for DSM-5. 2013.',
  },
  {
    slug: 'adhd-screening',
    code: 'ASRS',
    nameEn: 'Adult ADHD Screening (ASRS)',
    nameAr: 'فحص ADHD للبالغين (ASRS)',
    shortEn: 'WHO-supported adult ADHD screening overview: what ASRS measures and when to seek evaluation.',
    shortAr: 'نظرة عامة على فحص ADHD للبالغين بدعم WHO: ماذا يقيس ASRS ومتى تطلب تقييماً.',
    overviewEn:
      'Adult ADHD screening (commonly via ASRS) helps identify attention and hyperactivity/impulsivity patterns that may warrant clinical evaluation. Screening is not diagnostic. V Welfare also offers authenticated ADHD zone check-ins after login.',
    overviewAr:
      'يساعد فحص ADHD للبالغين (غالباً عبر ASRS) على التعرف على أنماط الانتباه وفرط الحركة/الاندفاعية التي قد تستدعي تقييماً سريرياً. الفحص ليس تشخيصاً. توفر V Welfare أيضاً تسجيل مناطق ADHD بعد تسجيل الدخول.',
    measuresDomainEn: 'Adult ADHD screening symptoms',
    measuresDomainAr: 'أعراض فحص ADHD لدى البالغين',
    bands: [
      { labelEn: 'Lower likelihood', labelAr: 'احتمال أقل', textEn: 'Fewer screening markers; still seek care if daily life is impaired.', textAr: 'علامات فحص أقل؛ اطلب الرعاية إذا كان الأداء اليومي متأثراً.' },
      { labelEn: 'Higher likelihood', labelAr: 'احتمال أعلى', textEn: 'More screening markers; discuss evaluation with a qualified clinician.', textAr: 'علامات فحص أكثر؛ ناقش التقييم مع مختص مؤهل.' },
    ],
    citation: 'Kessler RC, Adler L, Ames M, et al. The World Health Organization Adult ADHD Self-Report Scale. Psychol Med. 2005.',
  },
  {
    slug: 'insomnia-isi',
    code: 'ISI',
    nameEn: 'ISI (Insomnia Severity Index)',
    nameAr: 'ISI — مؤشر شدة الأرق',
    shortEn: '7-item clinical measure of insomnia severity and daytime impact.',
    shortAr: 'مقياس من 7 أسئلة لشدة الأرق وتأثيره النهاري.',
    overviewEn:
      'The Insomnia Severity Index rates night-time sleep problems and daytime impact. Higher scores suggest more clinically relevant insomnia.',
    overviewAr:
      'يقيّم مؤشر شدة الأرق مشكلات النوم ليلاً وتأثيرها نهاراً. الدرجات الأعلى تشير إلى أرق ذي أهمية سريرية أكبر.',
    measuresDomainEn: 'Insomnia severity and daytime impairment',
    measuresDomainAr: 'شدة الأرق والتأثير النهاري',
    bands: [
      { labelEn: 'No clinically significant insomnia', labelAr: 'لا أرق سريري ملحوظ', textEn: 'Sleep concerns appear mild or absent.', textAr: 'مخاوف النوم خفيفة أو غير موجودة.' },
      { labelEn: 'Subthreshold', labelAr: 'دون العتبة', textEn: 'Some insomnia symptoms without full clinical severity.', textAr: 'بعض أعراض الأرق دون الشدة السريرية الكاملة.' },
      { labelEn: 'Moderate–severe', labelAr: 'متوسط إلى شديد', textEn: 'Meaningful insomnia; consider evidence-based sleep care.', textAr: 'أرق ذو معنى؛ فكّر في رعاية نوم مبنية على الأدلة.' },
    ],
    citation: 'Bastien CH, Vallières A, Morin CM. Validation of the Insomnia Severity Index. Sleep. 2001.',
  },
  {
    slug: 'alcohol-audit-c',
    code: 'AUDITC',
    nameEn: 'AUDIT-C (Alcohol Use Disorders Identification Test — Consumption)',
    nameAr: 'AUDIT-C — فحص استهلاك الكحول',
    shortEn: 'WHO 3-item screen for hazardous alcohol use.',
    shortAr: 'فحص من 3 أسئلة من WHO لاستخدام الكحول الخطير.',
    overviewEn:
      'AUDIT-C is a brief WHO-linked screen for hazardous drinking patterns. Positive screens should lead to confidential clinical discussion.',
    overviewAr:
      'AUDIT-C فحص موجز مرتبط بمنظمة الصحة العالمية لأنماط الشرب الخطرة. الفحص الإيجابي يستدعي نقاشاً سريرياً سرياً.',
    measuresDomainEn: 'Hazardous alcohol consumption',
    measuresDomainAr: 'استهلاك الكحول الخطير',
    bands: [
      { labelEn: 'Lower risk', labelAr: 'خطر أقل', textEn: 'Consumption pattern below common hazardous cutoffs.', textAr: 'نمط استهلاك دون عتبات الخطر الشائعة.' },
      { labelEn: 'Hazardous / higher risk', labelAr: 'خطر أعلى', textEn: 'Pattern may be hazardous; seek non-judgmental clinical advice.', textAr: 'قد يكون النمط خطراً؛ اطلب مشورة سريرية دون وصم.' },
    ],
    citation: 'Bush K, Kivlahan DR, McDonell MB, Fihn SD, Bradley KA. The AUDIT alcohol consumption questions. Arch Intern Med. 1998.',
  },
  {
    slug: 'ace-questionnaire',
    code: 'ACE',
    nameEn: 'ACE Questionnaire (Adverse Childhood Experiences)',
    nameAr: 'استبيان ACE — تجارب الطفولة السلبية',
    shortEn: '10-item questionnaire on adverse childhood experiences linked to later health outcomes.',
    shortAr: 'استبيان من 10 أسئلة عن تجارب الطفولة السلبية وارتباطها بالصحة لاحقاً.',
    overviewEn:
      'ACE questionnaires summarize adverse childhood experiences associated with later health risks. They are educational/screening tools, not trauma diagnoses.',
    overviewAr:
      'تلخّص استبيانات ACE تجارب الطفولة السلبية المرتبطة بمخاطر صحية لاحقة. هي أدوات تثقيف/فحص وليست تشخيصاً للصدمة.',
    measuresDomainEn: 'Adverse childhood experiences exposure',
    measuresDomainAr: 'التعرض لتجارب الطفولة السلبية',
    bands: [
      { labelEn: 'Lower ACE count', labelAr: 'عدد أقل من تجارب ACE', textEn: 'Fewer reported adversities; protective factors still matter.', textAr: 'تجارب سلبية أقل؛ العوامل الوقائية تبقى مهمة.' },
      { labelEn: 'Higher ACE count', labelAr: 'عدد أعلى من تجارب ACE', textEn: 'More reported adversities; trauma-informed support can help.', textAr: 'تجارب سلبية أكثر؛ الدعم المراعي للصدمة قد يساعد.' },
    ],
    citation: 'Felitti VJ, et al. Relationship of childhood abuse and household dysfunction to many leading causes of death. Am J Prev Med. 1998.',
  },
  {
    slug: 'k-10',
    code: 'K10',
    nameEn: 'K-10 (Kessler Psychological Distress Scale)',
    nameAr: 'K-10 — مقياس كيسلر للضيق النفسي',
    shortEn: '10-item screen of non-specific psychological distress over the past 30 days.',
    shortAr: 'فحص من 10 أسئلة للضيق النفسي غير النوعي خلال آخر 30 يوماً.',
    overviewEn:
      'The K-10 measures mixed anxiety and depressive distress over the past month and is widely used for population screening and triage.',
    overviewAr:
      'يقيس مقياس K-10 مزيجاً من ضيق القلق والاكتئاب خلال الشهر الماضي ويُستخدم على نطاق واسع للفحص السكاني والفرز.',
    measuresDomainEn: 'Non-specific psychological distress (past 30 days)',
    measuresDomainAr: 'الضيق النفسي غير النوعي (آخر 30 يوماً)',
    bands: [
      { labelEn: 'Low distress', labelAr: 'ضيق منخفض', textEn: 'Distress near typical population levels.', textAr: 'ضيق قريب من المستويات السكانية المعتادة.' },
      { labelEn: 'Moderate distress', labelAr: 'ضيق متوسط', textEn: 'Noticeable distress; low-intensity support may help.', textAr: 'ضيق ملحوظ؛ الدعم منخفض الشدة قد يساعد.' },
      { labelEn: 'High–very high', labelAr: 'مرتفع إلى مرتفع جداً', textEn: 'High distress; clinical assessment is recommended.', textAr: 'ضيق مرتفع؛ يُنصح بتقييم سريري.' },
    ],
    citation: 'Kessler RC, et al. Short screening scales to monitor population prevalences and trends in non-specific psychological distress. Psychol Med. 2002.',
  },
  {
    slug: 'pss-10',
    code: 'PSS10',
    nameEn: 'PSS-10 (Perceived Stress Scale)',
    nameAr: 'PSS-10 — مقياس الضغط المدرك',
    shortEn: '10-item measure of how unpredictable, uncontrollable, and overloaded life feels.',
    shortAr: 'مقياس من 10 أسئلة لمدى الشعور بعدم القدرة على التنبؤ والتحكم وزيادة الأعباء.',
    overviewEn:
      'The PSS-10 measures perceived stress—how overloaded and uncontrollable life feels—rather than counting objective events alone.',
    overviewAr:
      'يقيس مقياس PSS-10 الضغط المدرك—مدى شعور الحياة بالإرهاق وفقدان السيطرة—وليس مجرد عدد الأحداث الموضوعية.',
    measuresDomainEn: 'Perceived stress over the past month',
    measuresDomainAr: 'الضغط المدرك خلال الشهر الماضي',
    bands: [
      { labelEn: 'Low stress', labelAr: 'ضغط منخفض', textEn: 'Life demands generally feel manageable.', textAr: 'متطلبات الحياة تبدو قابلة للإدارة عموماً.' },
      { labelEn: 'Moderate stress', labelAr: 'ضغط متوسط', textEn: 'Noticeable perceived stress; coping skills matter.', textAr: 'ضغط مدرك ملحوظ؛ مهارات التأقلم مهمة.' },
      { labelEn: 'High stress', labelAr: 'ضغط مرتفع', textEn: 'High perceived overload; consider support and recovery habits.', textAr: 'إرهاق مدرك مرتفع؛ فكّر في الدعم وعادات الاستعادة.' },
    ],
    citation: 'Cohen S, Kamarck T, Mermelstein R. A global measure of perceived stress. J Health Soc Behav. 1983.',
  },
  {
    slug: 'oci-r',
    code: 'OCIR',
    nameEn: 'OCI-R (Obsessive-Compulsive Inventory — Revised)',
    nameAr: 'OCI-R — قائمة الوسواس القهري المنقحة',
    shortEn: 'Brief screener for obsessive-compulsive symptom dimensions.',
    shortAr: 'فحص موجز لأبعاد أعراض الوسواس القهري.',
    overviewEn:
      'The OCI-R screens obsessive-compulsive symptom dimensions. Elevated scores suggest discussing OCD-informed evaluation with a clinician.',
    overviewAr:
      'يفحص مقياس OCI-R أبعاد أعراض الوسواس القهري. الدرجات المرتفعة تستدعي مناقشة تقييم متخصص مع مختص.',
    measuresDomainEn: 'Obsessive-compulsive symptom severity',
    measuresDomainAr: 'شدة أعراض الوسواس القهري',
    bands: [
      { labelEn: 'Lower range', labelAr: 'نطاق أدنى', textEn: 'Fewer OCD-type symptoms on screening.', textAr: 'أعراض أقل من نمط الوسواس القهري في الفحص.' },
      { labelEn: 'Elevated range', labelAr: 'نطاق مرتفع', textEn: 'Elevated OCD-type symptoms; clinical review advised.', textAr: 'أعراض مرتفعة من نمط الوسواس القهري؛ يُنصح بمراجعة سريرية.' },
    ],
    citation: 'Foa EB, et al. The Obsessive-Compulsive Inventory: development and validation of a short version. Psychol Assess. 2002.',
  },
  {
    slug: 'ess',
    code: 'ESS',
    nameEn: 'ESS (Epworth Sleepiness Scale)',
    nameAr: 'ESS — مقياس إبورث للنعاس',
    shortEn: '8-item screen of daytime sleepiness across common situations.',
    shortAr: 'فحص من 8 أسئلة للنعاس النهاري في مواقف شائعة.',
    overviewEn:
      'The Epworth Sleepiness Scale estimates daytime sleepiness tendency. High scores may warrant sleep evaluation.',
    overviewAr:
      'يقدّر مقياس إبورث ميل النعاس النهاري. الدرجات العالية قد تستدعي تقييماً للنوم.',
    measuresDomainEn: 'Daytime sleepiness',
    measuresDomainAr: 'النعاس النهاري',
    bands: [
      { labelEn: 'Normal range', labelAr: 'نطاق طبيعي', textEn: 'Daytime sleepiness within common norms.', textAr: 'نعاس نهاري ضمن المعدلات الشائعة.' },
      { labelEn: 'Excessive sleepiness', labelAr: 'نعاس مفرط', textEn: 'Higher sleepiness; discuss sleep disorders with a clinician.', textAr: 'نعاس أعلى؛ ناقش اضطرابات النوم مع مختص.' },
    ],
    citation: 'Johns MW. A new method for measuring daytime sleepiness: the Epworth sleepiness scale. Sleep. 1991.',
  },
  {
    slug: 'phq-15',
    code: 'PHQ15',
    nameEn: 'PHQ-15 (Patient Health Questionnaire — Somatic Symptoms)',
    nameAr: 'PHQ-15 — مقياس الأعراض الجسدية',
    shortEn: '15-item screener for common somatic symptom burden.',
    shortAr: 'فحص من 15 سؤالاً لعبء الأعراض الجسدية الشائعة.',
    overviewEn:
      'The PHQ-15 screens somatic symptom burden that often co-occurs with anxiety and depression. It is not a medical diagnosis of physical disease.',
    overviewAr:
      'يفحص مقياس PHQ-15 عبء الأعراض الجسدية التي تتزامن غالباً مع القلق والاكتئاب. ليس تشخيصاً طبياً لمرض عضوي.',
    measuresDomainEn: 'Somatic symptom severity',
    measuresDomainAr: 'شدة الأعراض الجسدية',
    bands: [
      { labelEn: 'Minimal–low', labelAr: 'طفيف إلى منخفض', textEn: 'Lower somatic symptom burden on screening.', textAr: 'عبء أعراض جسدية أقل في الفحص.' },
      { labelEn: 'Medium–high', labelAr: 'متوسط إلى مرتفع', textEn: 'Higher somatic burden; coordinate mental and physical health care.', textAr: 'عبء جسدي أعلى؛ نسّق الرعاية النفسية والجسدية.' },
    ],
    citation: 'Kroenke K, Spitzer RL, Williams JB. The PHQ-15. Psychosom Med. 2002.',
  },
  {
    slug: 'cage',
    code: 'CAGE',
    nameEn: 'CAGE Alcohol Screening Questionnaire',
    nameAr: 'استبيان CAGE لفحص الكحول',
    shortEn: '4-item classic screen for possible alcohol use problems.',
    shortAr: 'فحص كلاسيكي من 4 أسئلة لاحتمال مشكلات استخدام الكحول.',
    overviewEn:
      'CAGE is a classic 4-item alcohol problem screen. Positive answers should prompt supportive clinical follow-up.',
    overviewAr:
      'CAGE فحص كلاسيكي من 4 أسئلة لمشكلات الكحول. الإجابات الإيجابية تستدعي متابعة سريرية داعمة.',
    measuresDomainEn: 'Possible alcohol use problems',
    measuresDomainAr: 'احتمال مشكلات استخدام الكحول',
    bands: [
      { labelEn: 'Negative / low', labelAr: 'سلبي / منخفض', textEn: 'Fewer CAGE indicators reported.', textAr: 'مؤشرات CAGE أقل.' },
      { labelEn: 'Positive screen', labelAr: 'فحص إيجابي', textEn: 'One or more indicators; discuss alcohol use confidentially with a clinician.', textAr: 'مؤشر واحد أو أكثر؛ ناقش استخدام الكحول بسرية مع مختص.' },
    ],
    citation: 'Ewing JA. Detecting alcoholism: the CAGE questionnaire. JAMA. 1984.',
  },
  {
    slug: 'rses',
    code: 'RSES',
    nameEn: 'RSES (Rosenberg Self-Esteem Scale)',
    nameAr: 'RSES — مقياس روزنبرغ لتقدير الذات',
    shortEn: '10-item global self-esteem measure used widely in research and practice.',
    shortAr: 'مقياس من 10 أسئلة لتقدير الذات العام يُستخدم على نطاق واسع.',
    overviewEn:
      'The Rosenberg Self-Esteem Scale measures global self-worth. Low scores may co-occur with depression or social anxiety but are not a diagnosis.',
    overviewAr:
      'يقيس مقياس روزنبرغ تقدير الذات العام. الدرجات المنخفضة قد تتزامن مع الاكتئاب أو القلق الاجتماعي لكنها ليست تشخيصاً.',
    measuresDomainEn: 'Global self-esteem',
    measuresDomainAr: 'تقدير الذات العام',
    bands: [
      { labelEn: 'Lower self-esteem', labelAr: 'تقدير ذات أدنى', textEn: 'Lower self-worth scores; supportive care may help.', textAr: 'درجات أدنى لتقدير الذات؛ الرعاية الداعمة قد تساعد.' },
      { labelEn: 'Average–higher', labelAr: 'متوسط إلى أعلى', textEn: 'Self-esteem nearer typical or higher ranges.', textAr: 'تقدير ذات أقرب للنطاقات المعتادة أو أعلى.' },
    ],
    citation: 'Rosenberg M. Society and the Adolescent Self-Image. 1965.',
  },
  {
    slug: 'mdq',
    code: 'MDQ',
    nameEn: 'MDQ (Mood Disorder Questionnaire)',
    nameAr: 'MDQ — استبيان اضطراب المزاج',
    shortEn: 'Screening questionnaire for possible bipolar spectrum symptoms.',
    shortAr: 'استبيان فحص لأعراض طيف الاضطراب ثنائي القطب المحتملة.',
    overviewEn:
      'The MDQ screens for possible bipolar-spectrum symptoms. A positive screen requires careful clinical differentiation from other mood presentations.',
    overviewAr:
      'يفحص مقياس MDQ أعراض طيف الاضطراب ثنائي القطب المحتملة. الفحص الإيجابي يتطلب تمييزاً سريرياً دقيقاً عن عروض مزاجية أخرى.',
    measuresDomainEn: 'Possible bipolar spectrum symptoms',
    measuresDomainAr: 'أعراض طيف الاضطراب ثنائي القطب المحتملة',
    bands: [
      { labelEn: 'Negative screen', labelAr: 'فحص سلبي', textEn: 'Fewer bipolar-spectrum screening markers.', textAr: 'علامات فحص أقل لطيف ثنائي القطب.' },
      { labelEn: 'Positive screen', labelAr: 'فحص إيجابي', textEn: 'Markers present; seek specialist mood evaluation.', textAr: 'توجد علامات؛ اطلب تقييماً متخصصاً للمزاج.' },
    ],
    citation: 'Hirschfeld RM, et al. Development and validation of a screening instrument for bipolar spectrum disorder: the Mood Disorder Questionnaire. Am J Psychiatry. 2000.',
  },
]

/** Map assessment definition codes (and aliases) → public learn slug. */
const CODE_TO_SLUG: Record<string, string> = Object.fromEntries(
  LEARN_PAGES.map(p => [p.code, p.slug]),
)
CODE_TO_SLUG.AUDIT = 'alcohol-audit-c'
CODE_TO_SLUG.AUDITC = 'alcohol-audit-c'
CODE_TO_SLUG.ASRS = 'adhd-screening'

/** Legacy slug kept for redirects / inbound links. */
export const LEARN_LEGACY_REDIRECTS: Record<string, string> = {
  'asrs-adhd': 'adhd-screening',
}

export function getLearnPageBySlug(slug: string): LearnPageDef | undefined {
  return LEARN_PAGES.find(p => p.slug === slug)
}

export function getLearnSlugByCode(code: string): string | undefined {
  return CODE_TO_SLUG[code]
}

/** Optional clinical detail from internal content (English). Prefer LearnPageDef bilingual fields for public UI. */
export function getLearnContent(code: string) {
  return ASSESSMENT_CONTENT[code] ?? null
}

export function getRelatedLearnPages(codes: string[], currentSlug: string): LearnPageDef[] {
  const slugs = new Set(
    codes.map(c => CODE_TO_SLUG[c]).filter((s): s is string => Boolean(s) && s !== currentSlug),
  )
  return LEARN_PAGES.filter(p => slugs.has(p.slug)).slice(0, 4)
}
