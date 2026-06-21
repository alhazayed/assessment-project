import type { InterpretationBand } from '@/lib/types'

interface AssessmentScore {
  assessment_code: string
  name_en: string
  name_ar: string
  weight_pct: number
  normalized: number
}

interface NarrativeResult {
  summary_en: string
  summary_ar: string
  strengths_en: string[]
  strengths_ar: string[]
  risks_en: string[]
  risks_ar: string[]
  recommendations_en: string[]
  recommendations_ar: string[]
}

// Per-assessment rich narratives by score tier (normalized 0–100)
const ASSESSMENT_NARRATIVES: Record<string, {
  high: { insight_en: string; insight_ar: string; strength_en: string; strength_ar: string }
  mid:  { insight_en: string; insight_ar: string; rec_en: string;     rec_ar: string }
  low:  { insight_en: string; insight_ar: string; risk_en: string;    risk_ar: string }
}> = {
  IPIP120: {
    high: {
      insight_en: 'Your Big Five personality profile shows well-rounded traits — suggesting genuine adaptability, openness to experience, and strong emotional regulation.',
      insight_ar: 'يُظهر ملف شخصيتك الخمس الكبرى سمات متوازنة — تعكس قدرة تكيفية حقيقية وانفتاحاً على التجارب وتنظيماً عاطفياً قوياً.',
      strength_en: 'Well-balanced personality profile across the Big Five dimensions',
      strength_ar: 'ملف شخصية متوازن عبر أبعاد الشخصية الخمسة الكبرى',
    },
    mid: {
      insight_en: 'Your personality profile is generally healthy with some dimensions that may benefit from intentional development.',
      insight_ar: 'ملفك الشخصي صحي بشكل عام مع بعض الأبعاد التي قد تستفيد من التطوير المتعمد.',
      rec_en: 'Reflect on your personality strengths and explore how to leverage them in your daily relationships',
      rec_ar: 'تأمّل في نقاط قوة شخصيتك واستكشف كيفية الاستفادة منها في علاقاتك اليومية',
    },
    low: {
      insight_en: 'Some personality dimensions show patterns that may create friction in important life areas — awareness is the first step toward growth.',
      insight_ar: 'تُظهر بعض أبعاد الشخصية أنماطاً قد تُسبب احتكاكاً في مجالات حياة مهمة — الوعي هو الخطوة الأولى نحو النمو.',
      risk_en: 'Certain personality patterns may benefit from professional reflection or coaching',
      risk_ar: 'قد تستفيد بعض أنماط الشخصية من التأمل المهني أو التوجيه',
    },
  },
  DASS21: {
    high: {
      insight_en: 'Your depression, anxiety, and stress levels are within healthy ranges — your emotional regulation appears solid and resilient.',
      insight_ar: 'مستويات الاكتئاب والقلق والإجهاد لديك ضمن النطاقات الصحية — يبدو تنظيمك العاطفي متيناً ومرناً.',
      strength_en: 'Healthy emotional regulation with low depression, anxiety, and stress indicators',
      strength_ar: 'تنظيم عاطفي صحي مع مؤشرات اكتئاب وقلق وإجهاد منخفضة',
    },
    mid: {
      insight_en: 'Some stress or anxiety indicators are present — this is common and manageable with the right strategies.',
      insight_ar: 'توجد بعض مؤشرات التوتر أو القلق — وهذا شائع ويمكن إدارته بالاستراتيجيات المناسبة.',
      rec_en: 'Practice consistent stress management techniques such as mindfulness, regular physical activity, and sleep hygiene',
      rec_ar: 'مارس تقنيات إدارة الضغط بشكل منتظم كاليقظة الذهنية والنشاط البدني المنتظم ونظافة النوم',
    },
    low: {
      insight_en: 'Elevated distress levels are indicated. These are important signals worth addressing with professional support.',
      insight_ar: 'تشير النتائج إلى مستويات مرتفعة من الضيق. هذه إشارات مهمة تستحق المعالجة بدعم متخصص.',
      risk_en: 'Elevated stress or emotional distress levels that warrant professional attention',
      risk_ar: 'مستويات مرتفعة من التوتر أو الضيق العاطفي تستدعي اهتماماً متخصصاً',
    },
  },
  WHO5: {
    high: {
      insight_en: 'Your wellbeing score reflects a genuinely positive quality of life — you feel engaged, rested, and emotionally content most of the time.',
      insight_ar: 'تعكس درجة رفاهيتك جودة حياة إيجابية حقيقية — تشعر بالتفاعل والراحة والرضا العاطفي معظم الوقت.',
      strength_en: 'Strong psychological wellbeing and positive quality of life',
      strength_ar: 'رفاهية نفسية قوية وجودة حياة إيجابية',
    },
    mid: {
      insight_en: 'Your wellbeing is moderate. Small, consistent lifestyle investments tend to have outsized returns on daily happiness.',
      insight_ar: 'رفاهيتك معتدلة. الاستثمارات الحياتية الصغيرة والمتسقة تميل إلى تحقيق عائدات كبيرة على السعادة اليومية.',
      rec_en: 'Build daily habits that nurture your wellbeing — adequate sleep, connection with others, and meaningful activity',
      rec_ar: 'ابنِ عادات يومية تُغذّي رفاهيتك — نوم كافٍ والتواصل مع الآخرين ونشاط ذو معنى',
    },
    low: {
      insight_en: 'Your wellbeing score is below the healthy threshold — this warrants attention and compassionate self-care or professional support.',
      insight_ar: 'تقل درجة رفاهيتك عن العتبة الصحية — يستحق هذا الاهتمام والرعاية الذاتية الرحيمة أو الدعم المتخصص.',
      risk_en: 'Wellbeing score below the healthy threshold — professional support is recommended',
      risk_ar: 'درجة رفاهية أقل من العتبة الصحية — يُنصح بالحصول على دعم متخصص',
    },
  },
  ATTACHMENT: {
    high: {
      insight_en: 'Your attachment style indicates secure relationship patterns — you can depend on others and be depended upon with comfort and trust.',
      insight_ar: 'يُشير نمط تعلقك إلى أنماط علائقية آمنة — يمكنك الاعتماد على الآخرين والاعتماد عليك بارتياح وثقة.',
      strength_en: 'Secure attachment style with healthy relational patterns',
      strength_ar: 'نمط تعلق آمن مع أنماط علائقية صحية',
    },
    mid: {
      insight_en: 'Your attachment patterns are broadly functional with some areas of relational sensitivity worth exploring.',
      insight_ar: 'أنماط تعلقك تعمل بشكل عام بشكل جيد مع بعض مجالات الحساسية العلائقية التي تستحق الاستكشاف.',
      rec_en: 'Explore your relational patterns through reflection, journaling, or conversations with a trusted person',
      rec_ar: 'استكشف أنماطك العلائقية من خلال التأمل وكتابة اليوميات أو المحادثات مع شخص موثوق',
    },
    low: {
      insight_en: 'Anxious or avoidant attachment patterns may create challenges in close relationships. Understanding these patterns is a powerful first step.',
      insight_ar: 'قد تُخلق أنماط التعلق القلق أو التجنبي تحديات في العلاقات الوثيقة. فهم هذه الأنماط هو خطوة أولى قوية.',
      risk_en: 'Insecure attachment patterns that may affect relationship depth and stability',
      risk_ar: 'أنماط تعلق غير آمنة قد تؤثر على عمق العلاقات واستقرارها',
    },
  },
  EQ: {
    high: {
      insight_en: 'Your emotional intelligence is well-developed — you can read, understand, and manage emotions in yourself and others effectively.',
      insight_ar: 'ذكاؤك العاطفي متطور جيداً — تستطيع قراءة المشاعر وفهمها وإدارتها في نفسك وفي الآخرين بفعالية.',
      strength_en: 'High emotional intelligence — effective empathy, self-awareness, and emotional management',
      strength_ar: 'ذكاء عاطفي عالٍ — تعاطف فعّال ووعي ذاتي وإدارة عاطفية',
    },
    mid: {
      insight_en: 'Your emotional intelligence is developing — some areas of emotional reading or regulation may benefit from targeted practice.',
      insight_ar: 'ذكاؤك العاطفي في طور التطوير — قد تستفيد بعض مجالات القراءة أو التنظيم العاطفي من الممارسة المستهدفة.',
      rec_en: 'Practice active listening and perspective-taking in daily interactions to strengthen your EQ',
      rec_ar: 'مارس الاستماع الفعّال والتفكير من منظور الآخرين في التفاعلات اليومية لتعزيز ذكائك العاطفي',
    },
    low: {
      insight_en: 'Emotional intelligence is a learnable skill. Targeted development in this area can significantly improve your relationships and outcomes.',
      insight_ar: 'الذكاء العاطفي مهارة يمكن تعلمها. يمكن أن يُحسّن التطوير المستهدف في هذا المجال علاقاتك ونتائجك بشكل كبير.',
      risk_en: 'Emotional intelligence development needed — impacting interpersonal effectiveness',
      risk_ar: 'تطوير الذكاء العاطفي مطلوب — مما يؤثر على الفعالية الشخصية',
    },
  },
  RESILIENCE: {
    high: {
      insight_en: 'Your resilience score indicates strong capacity to recover from setbacks, adapt to change, and maintain functioning under pressure.',
      insight_ar: 'تشير درجة مرونتك إلى قدرة قوية على التعافي من الانتكاسات والتكيف مع التغيير والحفاظ على الأداء تحت الضغط.',
      strength_en: 'Strong psychological resilience and adaptive coping capacity',
      strength_ar: 'مرونة نفسية قوية وقدرة تكيفية على المواجهة',
    },
    mid: {
      insight_en: 'Your resilience is moderate — some situations may challenge your recovery ability, but you have a solid foundation to build on.',
      insight_ar: 'مرونتك معتدلة — قد تتحدى بعض المواقف قدرتك على التعافي، لكن لديك أساس متين للبناء عليه.',
      rec_en: 'Strengthen your resilience by identifying your support network and practising reframing challenges as growth opportunities',
      rec_ar: 'عزّز مرونتك بتحديد شبكة دعمك وممارسة إعادة تأطير التحديات كفرص للنمو',
    },
    low: {
      insight_en: 'Lower resilience may mean setbacks hit harder and recovery takes longer. Building this capacity is highly worthwhile.',
      insight_ar: 'قد تعني المرونة المنخفضة أن الانتكاسات تضرب بشدة أكبر ويستغرق التعافي وقتاً أطول. بناء هذه القدرة يستحق الجهد.',
      risk_en: 'Lower resilience affecting ability to recover from challenges and adapt under pressure',
      risk_ar: 'مرونة منخفضة تؤثر على القدرة على التعافي من التحديات والتكيف تحت الضغط',
    },
  },
  DECISION: {
    high: {
      insight_en: 'Your decision-making profile shows structured, balanced thinking — you consider options carefully and commit with confidence.',
      insight_ar: 'يُظهر ملف صنع قرارك تفكيراً منظماً ومتوازناً — تتأمل الخيارات بعناية وتلتزم بثقة.',
      strength_en: 'Effective decision-making with balanced analytical and intuitive thinking',
      strength_ar: 'صنع قرار فعّال مع تفكير تحليلي وبديهي متوازن',
    },
    mid: {
      insight_en: 'Your decision-making is functional with room to develop more systematic or confident approaches in high-stakes situations.',
      insight_ar: 'صنع قراراتك يعمل بشكل جيد مع مجال لتطوير مناهج أكثر منهجية أو ثقة في المواقف عالية المخاطر.',
      rec_en: 'Practice structured decision frameworks for important choices — listing pros, cons, and values alignment',
      rec_ar: 'مارس أُطر القرار المنظمة للخيارات المهمة — بسرد الإيجابيات والسلبيات والتوافق مع القيم',
    },
    low: {
      insight_en: 'Decision-making challenges — such as avoidance, overthinking, or impulsivity — can have ripple effects. Targeted strategies can help.',
      insight_ar: 'تحديات صنع القرار — كالتجنب أو الإفراط في التفكير أو الاندفاعية — يمكن أن تُحدث تأثيرات متتالية. يمكن أن تساعد الاستراتيجيات المستهدفة.',
      risk_en: 'Decision-making patterns that may lead to avoidance or impulsive choices under pressure',
      risk_ar: 'أنماط صنع قرار قد تؤدي إلى التجنب أو الخيارات المتهورة تحت الضغط',
    },
  },
  GRIT: {
    high: {
      insight_en: 'You show high grit — a powerful combination of passion for long-term goals and perseverance through difficulty. This is strongly predictive of achievement.',
      insight_ar: 'تُظهر مثابرة عالية — مزيج قوي من الشغف بالأهداف طويلة المدى والمثابرة عبر الصعوبات. وهذا مؤشر قوي للإنجاز.',
      strength_en: 'High grit — sustained passion and perseverance toward long-term goals',
      strength_ar: 'مثابرة عالية — شغف مستدام ومثابرة نحو الأهداف طويلة المدى',
    },
    mid: {
      insight_en: 'You show moderate grit. Some long-term pursuits may be sustained well, while others may benefit from renewed motivation or strategy.',
      insight_ar: 'تُظهر مثابرة معتدلة. قد تُحافظ على بعض المساعي طويلة الأمد بشكل جيد، بينما قد يستفيد البعض الآخر من تجديد الدافعية أو الاستراتيجية.',
      rec_en: 'Connect your studies or work explicitly to a meaningful long-term purpose to sustain motivation through difficulty',
      rec_ar: 'اربط دراستك أو عملك صراحةً بهدف طويل الأمد ذي معنى للحفاظ على الدافعية عبر الصعوبات',
    },
    low: {
      insight_en: 'Lower grit scores suggest difficulty sustaining effort on long-term goals. Understanding your motivational patterns can unlock meaningful progress.',
      insight_ar: 'تشير درجات المثابرة المنخفضة إلى صعوبة في الحفاظ على الجهد نحو الأهداف طويلة الأمد. فهم أنماط دافعيتك يمكن أن يُفتح مسار تقدم ذي معنى.',
      risk_en: 'Limited perseverance on long-term goals may affect sustained academic or professional achievement',
      risk_ar: 'محدودية المثابرة على الأهداف طويلة الأمد قد تؤثر على الإنجاز الأكاديمي أو المهني المستدام',
    },
  },
  EXEC_FUNC: {
    high: {
      insight_en: 'Strong executive function indicates well-developed planning, working memory, cognitive flexibility, and self-regulation — core tools for academic success.',
      insight_ar: 'تشير الوظائف التنفيذية القوية إلى تطوير جيد للتخطيط والذاكرة العاملة والمرونة المعرفية والتنظيم الذاتي — أدوات أساسية للنجاح الأكاديمي.',
      strength_en: 'Strong executive function — effective planning, cognitive flexibility, and self-regulation',
      strength_ar: 'وظائف تنفيذية قوية — تخطيط فعّال ومرونة معرفية وتنظيم ذاتي',
    },
    mid: {
      insight_en: 'Executive function is adequate, with some areas — like task initiation or sustained attention — that may benefit from targeted support.',
      insight_ar: 'الوظائف التنفيذية مناسبة، مع بعض المجالات — كالبدء في المهام أو الانتباه المستدام — التي قد تستفيد من الدعم المستهدف.',
      rec_en: 'Use structured tools like calendars, time-blocking, and task lists to scaffold your executive function in demanding contexts',
      rec_ar: 'استخدم أدوات منظمة مثل التقويمات وتكتيل الوقت وقوائم المهام لدعم وظائفك التنفيذية في السياقات المتطلبة',
    },
    low: {
      insight_en: 'Executive function challenges can significantly affect academic performance. These are highly responsive to targeted strategies and support.',
      insight_ar: 'يمكن لتحديات الوظائف التنفيذية أن تؤثر بشكل كبير على الأداء الأكاديمي. وهي تستجيب بشكل كبير للاستراتيجيات والدعم المستهدف.',
      risk_en: 'Executive function difficulties affecting planning, focus, and academic task management',
      risk_ar: 'صعوبات في الوظائف التنفيذية تؤثر على التخطيط والتركيز وإدارة المهام الأكاديمية',
    },
  },
}

const CATEGORY_SUMMARY: Record<string, {
  high: { en: string; ar: string }
  mid:  { en: string; ar: string }
  low:  { en: string; ar: string }
}> = {
  marriage: {
    high: {
      en: 'Your results indicate strong overall readiness for marriage and long-term partnership. Your profile shows the emotional, psychological, and interpersonal foundations that support a healthy, stable relationship.',
      ar: 'تشير نتائجك إلى استعداد عالٍ للزواج والشراكة طويلة الأمد. يُظهر ملفك الأسس العاطفية والنفسية والتواصلية التي تدعم علاقة صحية ومستقرة.',
    },
    mid: {
      en: 'Your results show moderate readiness for marriage, with genuine strengths alongside areas that continued personal development could strengthen before or during a long-term relationship.',
      ar: 'تُظهر نتائجك استعداداً معتدلاً للزواج، مع نقاط قوة حقيقية إلى جانب مجالات يمكن أن يُقوّيها التطوير الشخصي المستمر قبل أو أثناء العلاقة طويلة الأمد.',
    },
    low: {
      en: 'Your results suggest some important areas to address before entering a long-term commitment. This is not a barrier — it is an invitation to invest in yourself.',
      ar: 'تُشير نتائجك إلى بعض المجالات المهمة التي ينبغي معالجتها قبل الدخول في التزام طويل الأمد. هذا ليس عائقاً — بل هو دعوة للاستثمار في نفسك.',
    },
  },
  employment: {
    high: {
      en: 'Your profile indicates strong workplace readiness. You demonstrate the personality stability, emotional resilience, and interpersonal skills that support success in professional environments.',
      ar: 'يُشير ملفك إلى استعداد وظيفي قوي. تُظهر الاستقرار الشخصي والمرونة العاطفية والمهارات الشخصية التي تدعم النجاح في البيئات المهنية.',
    },
    mid: {
      en: 'Your workplace readiness is solid with areas where focused development could significantly enhance your professional effectiveness and career satisfaction.',
      ar: 'استعدادك الوظيفي متين مع مجالات يمكن أن يُعزز فيها التطوير المركّز بشكل كبير فعاليتك المهنية والرضا الوظيفي.',
    },
    low: {
      en: 'Some areas of your profile indicate challenges that may affect workplace functioning. With targeted development, these are addressable.',
      ar: 'تُشير بعض مجالات ملفك إلى تحديات قد تؤثر على الأداء في بيئة العمل. مع التطوير المستهدف، يمكن معالجة هذه المجالات.',
    },
  },
  leadership: {
    high: {
      en: 'Your results indicate strong leadership potential. Your profile shows the personality traits, emotional intelligence, and resilience patterns that characterize effective leaders.',
      ar: 'تُشير نتائجك إلى إمكانات قيادية قوية. يُظهر ملفك سمات الشخصية والذكاء العاطفي وأنماط المرونة التي تُميّز القادة الفعّالين.',
    },
    mid: {
      en: 'Your leadership potential is developing with genuine strengths and clear growth edges. Many effective leaders invest continuously in developing their profile.',
      ar: 'إمكاناتك القيادية في طور التطوير مع نقاط قوة حقيقية وحواف نمو واضحة. يستثمر كثير من القادة الفعّالين باستمرار في تطوير ملفهم.',
    },
    low: {
      en: 'Leadership is a journey, not a destination. Your current results highlight specific areas where intentional investment can unlock meaningful leadership growth.',
      ar: 'القيادة رحلة وليست وجهة. تُسلّط نتائجك الحالية الضوء على مجالات محددة يمكن أن يُطلق فيها الاستثمار المتعمد نمواً قيادياً ذا معنى.',
    },
  },
  academic: {
    high: {
      en: 'Your results indicate strong academic potential. Your wellbeing, stress management, and perseverance profile supports sustained academic engagement and achievement.',
      ar: 'تُشير نتائجك إلى إمكانية أكاديمية عالية. تدعم رفاهيتك وإدارة الضغط وملف المثابرة الانخراط الأكاديمي المستدام والإنجاز.',
    },
    mid: {
      en: 'Your academic potential profile is broadly positive. Some areas, when strengthened, could meaningfully enhance your performance and satisfaction in learning environments.',
      ar: 'ملف إمكانيتك الأكاديمية إيجابي بشكل عام. يمكن لبعض المجالات، عند تعزيزها، أن تُحسّن بشكل ملموس أداءك والرضا في بيئات التعلم.',
    },
    low: {
      en: 'Some results indicate factors that may be affecting your academic performance. Understanding these patterns is the foundation for meaningful improvement.',
      ar: 'تُشير بعض النتائج إلى عوامل قد تؤثر على أدائك الأكاديمي. فهم هذه الأنماط هو الأساس للتحسين الهادف.',
    },
  },
  general: {
    high: {
      en: 'Your overall profile indicates a strong foundation across the assessed dimensions, reflecting genuine psychological and interpersonal strengths.',
      ar: 'يُشير ملفك الإجمالي إلى أساس قوي عبر الأبعاد المُقيَّمة، يعكس نقاط قوة نفسية وتواصلية حقيقية.',
    },
    mid: {
      en: 'Your overall profile shows a healthy foundation with specific areas that, with focused attention, could meaningfully enhance your outcomes.',
      ar: 'يُظهر ملفك الإجمالي أساساً صحياً مع مجالات محددة يمكن أن تُحسّن بشكل ملموس نتائجك مع الاهتمام المركّز.',
    },
    low: {
      en: 'Your results identify some important areas to develop. Growth in these areas will meaningfully improve your quality of life and outcomes.',
      ar: 'تُحدّد نتائجك بعض المجالات المهمة للتطوير. سيُحسّن النمو في هذه المجالات بشكل ملموس جودة حياتك ونتائجك.',
    },
  },
}

export function generateRichNarrative(
  category: string,
  assessments: AssessmentScore[],
  compositeScore: number,
  band: InterpretationBand | null,
): NarrativeResult {
  const strengths_en: string[] = []
  const strengths_ar: string[] = []
  const risks_en: string[] = []
  const risks_ar: string[] = []
  const recommendations_en: string[] = []
  const recommendations_ar: string[] = []

  for (const a of assessments) {
    const ctx = ASSESSMENT_NARRATIVES[a.assessment_code]
    if (!ctx) {
      // Fallback for unknown assessments
      if (a.normalized >= 70) {
        strengths_en.push(`Strong performance in ${a.name_en} (${a.normalized}/100)`)
        strengths_ar.push(`أداء قوي في ${a.name_ar} (${a.normalized}/100)`)
      } else if (a.normalized < 45) {
        risks_en.push(`${a.name_en} may benefit from further development (${a.normalized}/100)`)
        risks_ar.push(`${a.name_ar} قد يستفيد من مزيد من التطوير (${a.normalized}/100)`)
      } else {
        recommendations_en.push(`Continue building your ${a.name_en} skills`)
        recommendations_ar.push(`استمر في تطوير مهارات ${a.name_ar}`)
      }
      continue
    }

    if (a.normalized >= 70) {
      strengths_en.push(ctx.high.strength_en)
      strengths_ar.push(ctx.high.strength_ar)
    } else if (a.normalized < 45) {
      risks_en.push(ctx.low.risk_en)
      risks_ar.push(ctx.low.risk_ar)
      recommendations_en.push(ctx.low.insight_en)
      recommendations_ar.push(ctx.low.insight_ar)
    } else {
      recommendations_en.push(ctx.mid.rec_en)
      recommendations_ar.push(ctx.mid.rec_ar)
    }
  }

  // Executive summary
  const catNarrative = CATEGORY_SUMMARY[category] ?? CATEGORY_SUMMARY['general']
  const tier = compositeScore >= 70 ? 'high' : compositeScore >= 45 ? 'mid' : 'low'
  const bandDesc_en = band ? `Your composite score of ${compositeScore}/100 places you in the "${band.band_en}" range. ` : ''
  const bandDesc_ar = band ? `نتيجتك التركيبية ${compositeScore}/100 تضعك في نطاق "${band.band_ar}". ` : ''
  const summary_en = bandDesc_en + catNarrative[tier].en
  const summary_ar = bandDesc_ar + catNarrative[tier].ar

  return { summary_en, summary_ar, strengths_en, strengths_ar, risks_en, risks_ar, recommendations_en, recommendations_ar }
}
