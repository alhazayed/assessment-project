/**
 * Generic Arabic band narratives used when a scale-specific translation
 * is not yet available. Keeps AR UX equal for explanation structure.
 */

export type ArBandFallback = {
  explanation: string
  whatThisMeans: string[]
  recommendations: string[]
}

function bandKey(band: string): 'minimal' | 'mild' | 'moderate' | 'severe' | 'positive' | 'general' {
  const b = band.toLowerCase()
  if (b.includes('minimal') || b.includes('none') || b.includes('normal') || b.includes('low') || b.includes('negative') || b.includes('below') || b.includes('no ')) {
    return 'minimal'
  }
  if (b.includes('mild') || b.includes('subthreshold')) return 'mild'
  if (b.includes('moderate')) return 'moderate'
  if (b.includes('severe') || b.includes('high') || b.includes('extreme')) return 'severe'
  if (b.includes('high wellbeing') || b.includes('excellent') || b.includes('good')) return 'positive'
  return 'general'
}

const FALLBACKS: Record<ReturnType<typeof bandKey>, ArBandFallback> = {
  minimal: {
    explanation: 'تشير نتيجتك الحالية إلى مستوى منخفض من الأعراض في هذا المجال. هذا غالباً يعكس حالة ضمن النطاق المتوقع، مع مساحة للبناء على عادات داعمة.',
    whatThisMeans: [
      'لا تبدو الأعراض في هذا المجال مرتفعة حالياً',
      'يمكنك الاستفادة من تعزيز الروتين الصحي والوعي الذاتي',
    ],
    recommendations: [
      'حافظ على عادات النوم والحركة والتواصل الاجتماعي',
      'أعد الفحص إذا تغيّرت ظروف حياتك أو شعرت بتراجع',
    ],
  },
  mild: {
    explanation: 'تشير نتيجتك إلى أعراض خفيفة أو دون العتبة السريرية. هذه الإشارات تستحق الانتباه حتى إن لم تكن شديدة — الوعي المبكر يساعد على الوقاية.',
    whatThisMeans: [
      'قد تلاحظ تأثيراً طفيفاً على يومك أو طاقتك أو تركيزك',
      'المراقبة والتعديلات البسيطة غالباً ما تكون الخطوة الأولى',
    ],
    recommendations: [
      'جرّب تقنيات بسيطة لإدارة التوتر والحركة المنتظمة',
      'أعد الفحص خلال أسابيع قليلة لتتبّع التغيّر',
      'تحدث مع مختص إذا استمرت الأعراض أو ازدادت',
    ],
  },
  moderate: {
    explanation: 'تشير نتيجتك إلى مستوى متوسط من الأعراض قد يؤثر على حياتك اليومية. يُفضَّل أخذ هذه النتيجة بجدية وطلب دعم مناسب.',
    whatThisMeans: [
      'قد يظهر تأثير على العمل أو العلاقات أو النوم',
      'التقييم السريري من مختص مؤهل مُستحسَن',
    ],
    recommendations: [
      'فكّر في استشارة مختص بالصحة النفسية',
      'استخدم أدوات المنصة للمتابعة، دون الاعتماد عليها كتشخيص',
      'أشرك شخصاً موثوقاً في رحلة الدعم إن أمكن',
    ],
  },
  severe: {
    explanation: 'تشير نتيجتك إلى مستوى مرتفع من الأعراض يستدعي اهتماماً عاجلاً. هذه أداة فحص وليست تشخيصاً — لكن طلب المساعدة الآن خطوة مهمة.',
    whatThisMeans: [
      'قد يكون الضعف الوظيفي ملحوظاً في عدة مجالات',
      'يُنصح بشدة بالتواصل مع مختص أو خط دعم',
    ],
    recommendations: [
      'اطلب مساعدة مهنية في أقرب وقت ممكن',
      'إذا كنت في أزمة أو خطر، تواصل مع خدمات الطوارئ أو خط أزمات',
      'لا تواجه هذا وحدك — أخبر شخصاً تثق به',
    ],
  },
  positive: {
    explanation: 'تشير نتيجتك إلى مستوى إيجابي في هذا الجانب من رفاهيتك. هذه نقطة قوة يمكن البناء عليها في بقية حياتك.',
    whatThisMeans: [
      'لديك موارد داخلية أو عادات داعمة تستحق الاستمرار',
      'الحفاظ على ما يعمل مهم بقدر معالجة التحديات',
    ],
    recommendations: [
      'واصل الممارسات التي تدعم رفاهيتك',
      'شارك نقاط قوتك مع مسارات أخرى (مثل التوتر أو النوم) عند الحاجة',
    ],
  },
  general: {
    explanation: 'تعكس هذه النتيجة ملامح تجربتك الحالية في هذا المقياس. استخدمها كمرآة للوعي الذاتي — لا كتشخيص طبي.',
    whatThisMeans: [
      'كل نتيجة هي لقطة زمنية قابلة للتغيّر',
      'الجمع بين عدة مقاييس يعطي صورة أوضح عن نفسك',
    ],
    recommendations: [
      'راجع التوصيات المرتبطة بهذا التقييم',
      'تابع نتيجتك عبر الزمن عبر النبضات القصيرة',
    ],
  },
}

export function getArabicBandFallback(band: string): ArBandFallback {
  return FALLBACKS[bandKey(band)]
}
