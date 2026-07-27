export interface FaqItem {
  id: string
  questionEn: string
  questionAr: string
  answerEn: string
  answerAr: string
}

export const PLATFORM_FAQ: FaqItem[] = [
  {
    id: 'what-is-v-welfare',
    questionEn: 'What is V Welfare?',
    questionAr: 'ما هي V Welfare؟',
    answerEn:
      'V Welfare is a bilingual (Arabic and English) mental health platform offering free, validated psychometric screening tools, mood tracking, journaling, and optional clinician connection. It helps individuals understand their mental health and share results securely with professionals when they choose.',
    answerAr:
      'V Welfare منصة صحة نفسية ثنائية اللغة (عربي وإنجليزي) تقدم أدوات فحص نفسي مجانية معتمدة، وتتبع المزاج، واليوميات، واتصالاً اختيارياً بالمختصين. تساعد الأفراد على فهم صحتهم النفسية ومشاركة النتائج بأمان عند اختيارهم.',
  },
  {
    id: 'is-this-a-diagnosis',
    questionEn: 'Are V Welfare assessments a medical diagnosis?',
    questionAr: 'هل تقييمات V Welfare تشخيصاً طبياً؟',
    answerEn:
      'No. Screening tools on V Welfare identify symptom levels and suggest follow-up — they do not replace evaluation by a qualified clinician. Only a licensed professional can provide a diagnosis and treatment plan.',
    answerAr:
      'لا. أدوات الفحص في V Welfare تحدد مستويات الأعراض وتقترح المتابعة — ولا تغني عن تقييم مختص مؤهل. التشخيص وخطة العلاج من اختصاصي مرخّص فقط.',
  },
  {
    id: 'languages',
    questionEn: 'Is the platform available in Arabic and English?',
    questionAr: 'هل المنصة متاحة بالعربية والإنجليزية؟',
    answerEn:
      'Yes. The entire user experience — assessments, results explanations, mood tracking, and support pages — is available in both Arabic (RTL) and English. You can switch language from the header toggle.',
    answerAr:
      'نعم. تجربة المستخدم كاملة — التقييمات، تفسير النتائج، تتبع المزاج، وصفحات الدعم — متاحة بالعربية (RTL) والإنجليزية. يمكنك تبديل اللغة من رأس الصفحة.',
  },
  {
    id: 'privacy',
    questionEn: 'Who can see my assessment results?',
    questionAr: 'من يرى نتائج تقييماتي؟',
    answerEn:
      'Your results are private to your account by default. Clinicians only see data you explicitly authorize through secure connection and permission settings. See our Privacy Policy for GDPR-aligned rights including export and deletion.',
    answerAr:
      'نتائجك خاصة بحسابك افتراضياً. يرى الأطباء فقط البيانات التي تفوّضها صراحة عبر اتصال آمن وإعدادات الأذونات. راجع سياسة الخصوصية لحقوقك بما يتوافق مع GDPR.',
  },
  {
    id: 'free',
    questionEn: 'Are assessments free?',
    questionAr: 'هل التقييمات مجانية؟',
    answerEn:
      'Yes. Validated screening assessments are free after you create an account. Some future subscription packages for advanced features may be offered separately.',
    answerAr:
      'نعم. تقييمات الفحص المعتمدة مجانية بعد إنشاء حساب. قد تُعرض لاحقاً باقات اشتراك لميزات متقدمة بشكل منفصل.',
  },
  {
    id: 'crisis',
    questionEn: 'What if I am in crisis or thinking about self-harm?',
    questionAr: 'ماذا إذا كنت في أزمة أو أفكر بإيذاء نفسي؟',
    answerEn:
      'V Welfare is not an emergency service. If you are in immediate danger, contact local emergency services. For mental health crisis lines: Saudi Arabia 920033360, UAE 800HOPE (4673), international +1-800-273-8255.',
    answerAr:
      'V Welfare ليست خدمة طوارئ. إذا كنت في خطر فوري، اتصل بخدمات الطوارئ المحلية. خطوط الأزمات: السعودية 920033360، الإمارات 800HOPE (4673)، دولياً +1-800-273-8255.',
  },
  {
    id: 'clinicians',
    questionEn: 'How do clinicians use V Welfare?',
    questionAr: 'كيف يستخدم الأطباء V Welfare؟',
    answerEn:
      'Licensed clinicians can invite patients, assign assessments, review results with permission, send secure messages, and receive high-risk alerts. Visit the Clinicians page or contact info@vwelfare.com.',
    answerAr:
      'يمكن للمختصين المرخّصين دعوة المرضى، وتعيين التقييمات، ومراجعة النتائج بإذن، وإرسال رسائل آمنة، وتلقي تنبيهات الخطر. زر صفحة الأطباء أو info@vwelfare.com.',
  },
  {
    id: 'which-assessment',
    questionEn: 'Which assessment should I take?',
    questionAr: 'أي تقييم يجب أن آخذ؟',
    answerEn:
      'Browse our Learn library for instrument overviews (PHQ-9 for depression, GAD-7 for anxiety, WHO-5 for wellbeing, etc.) or use the guided recommender on the Assessments page after signing in.',
    answerAr:
      'تصفح مكتبة التعلم (PHQ-9 للاكتئاب، GAD-7 للقلق، WHO-5 للرفاهية، إلخ) أو استخدم الموصي الموجّه في صفحة التقييمات بعد تسجيل الدخول.',
  },
]
