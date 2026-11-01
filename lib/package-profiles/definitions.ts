import type { Bi, CompositeDef, FiredPattern, Metrics, PatternRule, ProfileDef, ScaleResult } from './types'
import { highestSubscale, lowestSubscale } from './scales'

/*
 * The six launch packages. Every threshold below is the published cut-off of
 * the scale it reads; the citation for each rule is in `evidence`. See the
 * research proposal in project files (packages-research/) for the rationale.
 *
 * Rule kinds: safety (shown first, links to crisis help), clinical (recommend a
 * professional), attention (worth acting on), strength, info.
 */

// ── Shared building blocks ──────────────────────────────────────────────────

const phqAds = (m: Metrics) => m['PHQ9.total'] + m['GAD7.total']

const PHQ_ADS: CompositeDef = {
  label: { en: 'Combined depression and anxiety (PHQ-ADS)', ar: 'مؤشر الاكتئاب والقلق المشترك (PHQ-ADS)' },
  needs: ['PHQ9.total', 'GAD7.total'],
  compute: phqAds,
  max: 48,
  bands: [
    { min: 0, max: 9, label: { en: 'Minimal', ar: 'ضئيل' }, color: '#22c55e' },
    { min: 10, max: 19, label: { en: 'Mild', ar: 'خفيف' }, color: '#eab308' },
    { min: 20, max: 29, label: { en: 'Moderate', ar: 'متوسط' }, color: '#f97316' },
    { min: 30, max: 48, label: { en: 'Severe', ar: 'شديد' }, color: '#ef4444' },
  ],
  evidence: 'Kroenke et al., Psychosom Med 2016',
}

const SAFETY_ITEM9: PatternRule = {
  id: 'safety_self_harm',
  kind: 'safety',
  priority: 0,
  needs: ['PHQ9.item9'],
  when: m => m['PHQ9.item9'] >= 1,
  title: { en: 'You mentioned thoughts of death or self-harm', ar: 'ذكرتَ أفكاراً عن الموت أو إيذاء النفس' },
  text: {
    en: 'In the depression questionnaire you said that, at least on some days, you had thoughts that you would be better off dead or of hurting yourself. These thoughts deserve care straight away, whatever the rest of this report says.',
    ar: 'أشرتَ في استبيان الاكتئاب إلى أنك راودتك، ولو في بعض الأيام، أفكار بأنك ستكون أفضل حالاً لو كنت ميتاً أو أفكار بإيذاء نفسك. هذه الأفكار تستحق الاهتمام فوراً، بغض النظر عن باقي نتائج هذا التقرير.',
  },
  recommendation: {
    en: 'Talk to someone today: a mental health professional, your doctor, or an emergency line. If you are in danger now, contact emergency services.',
    ar: 'تحدّث مع شخص اليوم: أخصائي صحة نفسية أو طبيبك أو خط طوارئ. إذا كنت في خطر الآن، فاتصل بخدمات الطوارئ.',
  },
  evidence: 'PHQ-9 item 9 (Kroenke et al., 2001)',
}

const ANXIOUS_DEPRESSION: PatternRule = {
  id: 'anxious_depression',
  kind: 'clinical',
  priority: 2,
  needs: ['PHQ9.total', 'GAD7.total'],
  when: m => m['PHQ9.total'] >= 10 && m['GAD7.total'] >= 10,
  title: { en: 'Depression and anxiety together', ar: 'اكتئاب وقلق معاً' },
  text: {
    en: 'Both your depression score (PHQ-9) and your anxiety score (GAD-7) are at or above the level where a professional assessment is usually recommended. When the two appear together they tend to feed each other, so they are best looked at as one picture rather than two separate problems.',
    ar: 'درجتك في الاكتئاب (PHQ-9) ودرجتك في القلق (GAD-7) كلتاهما عند المستوى الذي يُنصح عنده عادةً بتقييم متخصص أو فوقه. عندما يظهر الاثنان معاً فإنهما يغذّيان بعضهما، لذا من الأفضل النظر إليهما كصورة واحدة لا كمشكلتين منفصلتين.',
  },
  recommendation: {
    en: 'Book a consultation with a psychologist or doctor. Talking therapy such as CBT treats both depression and anxiety.',
    ar: 'احجز استشارة مع أخصائي نفسي أو طبيب. العلاج بالحديث مثل العلاج المعرفي السلوكي يعالج الاكتئاب والقلق معاً.',
  },
  evidence: 'Kroenke et al., Gen Hosp Psychiatry 2010; Psychosom Med 2016',
}

const INSOMNIA_WITH_DISTRESS: PatternRule = {
  id: 'insomnia_with_distress',
  kind: 'attention',
  priority: 4,
  needs: ['ISI.total', 'PHQ9.total', 'GAD7.total'],
  when: m => m['ISI.total'] >= 15 && phqAds(m) >= 10,
  title: { en: 'Poor sleep is part of the picture', ar: 'قلة النوم جزء من الصورة' },
  text: {
    en: 'Your insomnia score is in the clinical range and you also report low mood or anxiety. Insomnia roughly doubles the risk of later depression and keeps low mood going, so treating sleep directly is one of the most effective steps you can take.',
    ar: 'درجة الأرق لديك في النطاق السريري، وتذكر أيضاً انخفاضاً في المزاج أو قلقاً. الأرق يضاعف تقريباً خطر الإصابة بالاكتئاب لاحقاً ويُبقي المزاج منخفضاً، لذا فإن علاج النوم مباشرةً من أكثر الخطوات فاعلية.',
  },
  recommendation: {
    en: 'Ask about CBT for insomnia (CBT-I), the recommended first treatment for long-term insomnia.',
    ar: 'اسأل عن العلاج المعرفي السلوكي للأرق (CBT-I)، وهو العلاج الأول الموصى به للأرق المزمن.',
  },
  evidence: 'Baglioni et al., J Affect Disord 2011; Qaseem et al., Ann Intern Med 2016',
}

const level = (x: number) => (x >= 3.5 ? 'high' : x <= 2.5 ? 'low' : 'average')

// ── 1. Mental Health Check-up ───────────────────────────────────────────────

const checkup: ProfileDef = {
  key: 'mental_health_checkup',
  codes: ['PHQ9', 'GAD7', 'PHQ15', 'WHO5', 'ISI'],
  composite: PHQ_ADS,
  quadrant: {
    label: { en: 'Symptoms and wellbeing', ar: 'الأعراض والرفاهية' },
    needs: ['PHQ9.total', 'GAD7.total', 'WHO5.total'],
    evidence: 'Keyes, J Consult Clin Psychol 2005; Topp et al., Psychother Psychosom 2015',
    classify: m => {
      const distressed = phqAds(m) >= 20
      const lowWellbeing = m['WHO5.total'] <= 12
      if (!distressed && !lowWellbeing) return {
        label: { en: 'Flourishing', ar: 'مزدهر' }, color: '#22c55e',
        text: { en: 'Few symptoms and good wellbeing. You are not just free of problems; you are doing well.', ar: 'أعراض قليلة ورفاهية جيدة. أنت لست خالياً من المشكلات فحسب، بل في حالة جيدة.' },
      }
      if (distressed && !lowWellbeing) return {
        label: { en: 'Coping under strain', ar: 'متماسك تحت الضغط' }, color: '#eab308',
        text: { en: 'Clear symptoms of depression or anxiety, but your day-to-day wellbeing is holding up. This is a good moment to get support, before the strain wears it down.', ar: 'أعراض واضحة للاكتئاب أو القلق، لكن رفاهيتك اليومية ما زالت صامدة. هذا وقت مناسب لطلب الدعم قبل أن يستنزفها الضغط.' },
      }
      if (!distressed && lowWellbeing) return {
        label: { en: 'Languishing', ar: 'فاتر' }, color: '#f97316',
        text: { en: 'Few symptoms, but low wellbeing: life may feel flat or empty without feeling ill. Languishing is a recognised risk state and responds well to small changes in activity, connection and rest.', ar: 'أعراض قليلة لكن رفاهية منخفضة: قد تبدو الحياة باهتة أو فارغة دون شعور بالمرض. الفتور حالة خطر معروفة وتستجيب جيداً لتغييرات صغيرة في النشاط والتواصل والراحة.' },
      }
      return {
        label: { en: 'Struggling', ar: 'يعاني' }, color: '#ef4444',
        text: { en: 'Clear symptoms and low wellbeing together. Please treat this as a sign to reach out for professional support.', ar: 'أعراض واضحة مع رفاهية منخفضة. يُرجى اعتبار ذلك إشارة لطلب دعم متخصص.' },
      }
    },
  },
  rules: [
    SAFETY_ITEM9,
    ANXIOUS_DEPRESSION,
    {
      id: 'depression', kind: 'clinical', priority: 3,
      needs: ['PHQ9.total', 'GAD7.total'],
      when: m => m['PHQ9.total'] >= 10 && m['GAD7.total'] < 10,
      title: { en: 'Signs of depression', ar: 'مؤشرات اكتئاب' },
      text: { en: 'Your PHQ-9 score is at or above 10, the level where a professional assessment for depression is recommended.', ar: 'درجتك في PHQ-9 تساوي 10 أو أكثر، وهو المستوى الذي يُنصح عنده بتقييم متخصص للاكتئاب.' },
      recommendation: { en: 'Book a consultation with a psychologist or doctor.', ar: 'احجز استشارة مع أخصائي نفسي أو طبيب.' },
      evidence: 'Kroenke et al., Gen Hosp Psychiatry 2010',
    },
    {
      id: 'anxiety', kind: 'clinical', priority: 3,
      needs: ['PHQ9.total', 'GAD7.total'],
      when: m => m['GAD7.total'] >= 10 && m['PHQ9.total'] < 10,
      title: { en: 'Signs of an anxiety problem', ar: 'مؤشرات اضطراب قلق' },
      text: { en: 'Your GAD-7 score is at or above 10, the level where a professional assessment for anxiety is recommended.', ar: 'درجتك في GAD-7 تساوي 10 أو أكثر، وهو المستوى الذي يُنصح عنده بتقييم متخصص للقلق.' },
      recommendation: { en: 'Book a consultation; anxiety responds well to CBT.', ar: 'احجز استشارة؛ القلق يستجيب جيداً للعلاج المعرفي السلوكي.' },
      evidence: 'Spitzer et al., Arch Intern Med 2006',
    },
    {
      id: 'low_wellbeing_depression_range', kind: 'clinical', priority: 3,
      needs: ['WHO5.total'],
      when: m => m['WHO5.total'] <= 7,
      title: { en: 'Very low wellbeing', ar: 'رفاهية منخفضة جداً' },
      text: { en: 'Your WHO-5 score is in the range that is often linked with depression, even if other scores look mild.', ar: 'درجتك في WHO-5 ضمن النطاق المرتبط غالباً بالاكتئاب، حتى لو بدت الدرجات الأخرى خفيفة.' },
      recommendation: { en: 'Mention this score to a professional so they can check for depression.', ar: 'اذكر هذه الدرجة لأخصائي ليتحقق من وجود اكتئاب.' },
      evidence: 'Topp et al., Psychother Psychosom 2015',
    },
    {
      id: 'body_first', kind: 'attention', priority: 4,
      needs: ['PHQ15.total', 'PHQ9.total', 'GAD7.total'],
      when: m => m['PHQ15.total'] >= 10 && phqAds(m) < 20,
      title: { en: 'Stress may be showing up in your body', ar: 'قد يظهر الضغط في جسدك' },
      text: { en: 'You report a moderate or high level of physical symptoms (PHQ-15) while your mood and anxiety scores are lower. Physical symptoms are sometimes the main way emotional strain shows itself.', ar: 'تذكر مستوى متوسطاً أو مرتفعاً من الأعراض الجسدية (PHQ-15) بينما درجات المزاج والقلق أقل. أحياناً تكون الأعراض الجسدية هي الطريقة الرئيسية التي يظهر بها الضغط النفسي.' },
      recommendation: { en: 'See a doctor first to check the physical symptoms, then consider whether stress plays a part.', ar: 'راجع طبيباً أولاً لفحص الأعراض الجسدية، ثم فكّر فيما إذا كان للضغط دور فيها.' },
      evidence: 'Kroenke et al., Gen Hosp Psychiatry 2010',
    },
    INSOMNIA_WITH_DISTRESS,
    {
      id: 'insomnia_alone', kind: 'attention', priority: 5,
      needs: ['ISI.total', 'PHQ9.total', 'GAD7.total'],
      when: m => m['ISI.total'] >= 15 && phqAds(m) < 10,
      title: { en: 'Insomnia on its own', ar: 'أرق منفرد' },
      text: { en: 'Your sleep is in the clinical insomnia range while mood and anxiety are low. Treating insomnia now also protects your mood later.', ar: 'نومك ضمن نطاق الأرق السريري بينما المزاج والقلق منخفضان. علاج الأرق الآن يحمي مزاجك لاحقاً أيضاً.' },
      recommendation: { en: 'Ask about CBT for insomnia (CBT-I).', ar: 'اسأل عن العلاج المعرفي السلوكي للأرق (CBT-I).' },
      evidence: 'Li et al., BMC Psychiatry 2016',
    },
    {
      id: 'good_sleep', kind: 'strength', priority: 8,
      needs: ['ISI.total'], when: m => m['ISI.total'] <= 7,
      title: { en: 'Healthy sleep', ar: 'نوم صحي' },
      text: { en: 'No clinically significant insomnia. Good sleep protects mood and concentration.', ar: 'لا يوجد أرق ذو دلالة سريرية. النوم الجيد يحمي المزاج والتركيز.' },
    },
    {
      id: 'good_wellbeing', kind: 'strength', priority: 7,
      needs: ['WHO5.total'], when: m => m['WHO5.total'] >= 18,
      title: { en: 'Good wellbeing', ar: 'رفاهية جيدة' },
      text: { en: 'Your WHO-5 score shows you feel cheerful, active and rested most of the time.', ar: 'تُظهر درجتك في WHO-5 أنك تشعر بالبهجة والنشاط والراحة معظم الوقت.' },
    },
    {
      id: 'low_symptoms', kind: 'strength', priority: 7,
      needs: ['PHQ9.total', 'GAD7.total'], when: m => phqAds(m) < 10,
      title: { en: 'Few symptoms of depression or anxiety', ar: 'أعراض قليلة للاكتئاب أو القلق' },
      text: { en: 'Your combined depression and anxiety score is in the minimal range.', ar: 'درجتك المشتركة للاكتئاب والقلق ضمن النطاق الضئيل.' },
    },
  ],
  defaultHeadline: { en: 'No major concerns in this check-up', ar: 'لا توجد مخاوف كبيرة في هذا الفحص' },
}

// ── 2. Stress, Burnout & Recovery ───────────────────────────────────────────

// OLBI cut-offs: exhaustion mean ≥ 2.25, disengagement mean ≥ 2.10 (Peterson et al., 2008).
const exhausted = (m: Metrics) => m['OLBI.E'] >= 2.25
const disengaged = (m: Metrics) => m['OLBI.D'] >= 2.1
const burnedOut = (m: Metrics) => exhausted(m) && disengaged(m)
const OLBI_EVIDENCE = 'Demerouti et al., J Appl Psychol 2001; Peterson et al., J Adv Nurs 2008'

const burnout: ProfileDef = {
  key: 'stress_burnout_recovery',
  codes: ['OLBI', 'PSS10', 'PHQ9', 'ISI', 'BRS', 'WHO5'],
  quadrant: {
    label: { en: 'Burnout pattern', ar: 'نمط الاحتراق الوظيفي' },
    needs: ['OLBI.E', 'OLBI.D'],
    evidence: OLBI_EVIDENCE,
    classify: m => {
      if (burnedOut(m)) return { label: { en: 'Burnout', ar: 'احتراق وظيفي' }, color: '#ef4444', text: { en: 'Both exhaustion and disengagement from work are above the cut-off.', ar: 'الإنهاك والانفصال عن العمل كلاهما فوق الحد الفاصل.' } }
      if (exhausted(m)) return { label: { en: 'Exhausted but engaged', ar: 'منهك لكن منخرط' }, color: '#f97316', text: { en: 'You are worn out but still care about your work. This is often the stage before burnout.', ar: 'أنت مُنهك لكنك ما زلت تهتم بعملك. هذه غالباً المرحلة التي تسبق الاحتراق.' } }
      if (disengaged(m)) return { label: { en: 'Disengaged', ar: 'منفصل عن العمل' }, color: '#eab308', text: { en: 'Your energy is holding up, but you feel distant from your work. This often points to a problem with meaning, fit or recognition rather than workload.', ar: 'طاقتك صامدة لكنك تشعر بالبعد عن عملك. يشير هذا غالباً إلى مشكلة في المعنى أو الملاءمة أو التقدير أكثر من عبء العمل.' } }
      return { label: { en: 'Engaged', ar: 'منخرط' }, color: '#22c55e', text: { en: 'Exhaustion and disengagement are both below the cut-off.', ar: 'الإنهاك والانفصال كلاهما دون الحد الفاصل.' } }
    },
  },
  rules: [
    SAFETY_ITEM9,
    {
      id: 'burnout_with_depression', kind: 'clinical', priority: 2,
      needs: ['OLBI.E', 'OLBI.D', 'PHQ9.total'],
      when: m => burnedOut(m) && m['PHQ9.total'] >= 10,
      title: { en: 'Burnout with signs of depression', ar: 'احتراق وظيفي مع مؤشرات اكتئاب' },
      text: { en: 'You meet the burnout cut-offs and your depression score is also at or above 10. Burnout and depression overlap heavily; when both are present this is a health issue first, and changes at work alone are unlikely to be enough.', ar: 'تتجاوز الحد الفاصل للاحتراق الوظيفي ودرجتك في الاكتئاب أيضاً 10 أو أكثر. يتداخل الاحتراق والاكتئاب بشدة، وعند وجودهما معاً فهذه مسألة صحية أولاً، ومن غير المرجح أن تكفي التغييرات في العمل وحدها.' },
      recommendation: { en: 'See a psychologist or doctor before deciding on work changes.', ar: 'راجع أخصائياً نفسياً أو طبيباً قبل اتخاذ قرارات بشأن العمل.' },
      evidence: 'Bianchi, Schonfeld & Laurent, Clin Psychol Rev 2015',
    },
    {
      id: 'depression_not_work', kind: 'clinical', priority: 2,
      needs: ['OLBI.E', 'OLBI.D', 'PHQ9.total'],
      when: m => !burnedOut(m) && m['PHQ9.total'] >= 10,
      title: { en: 'Low mood that work does not explain', ar: 'مزاج منخفض لا يفسّره العمل' },
      text: { en: 'Your depression score is at or above 10, but you do not meet the burnout cut-offs. The low mood is probably not only about work, so it is worth looking at directly.', ar: 'درجتك في الاكتئاب 10 أو أكثر، لكنك لا تتجاوز الحد الفاصل للاحتراق الوظيفي. على الأرجح أن انخفاض المزاج لا يتعلق بالعمل وحده، لذا يستحق النظر فيه مباشرةً.' },
      recommendation: { en: 'Book a consultation with a psychologist or doctor.', ar: 'احجز استشارة مع أخصائي نفسي أو طبيب.' },
      evidence: 'Bianchi, Schonfeld & Laurent, Front Public Health 2015',
    },
    {
      id: 'work_burnout', kind: 'attention', priority: 3,
      needs: ['OLBI.E', 'OLBI.D', 'PHQ9.total'],
      when: m => burnedOut(m) && m['PHQ9.total'] < 10,
      title: { en: 'Burnout contained to work', ar: 'احتراق وظيفي محصور في العمل' },
      text: { en: 'You meet the burnout cut-offs without a depressive picture. This is the stage where changes to workload, boundaries and recovery time work best.', ar: 'تتجاوز الحد الفاصل للاحتراق دون صورة اكتئابية. هذه هي المرحلة التي تنجح فيها التغييرات في عبء العمل والحدود ووقت التعافي أكثر من غيرها.' },
      recommendation: { en: 'Look at workload, protected breaks and time fully away from work; coaching or counselling can help plan this.', ar: 'راجع عبء العمل والاستراحات المحمية والوقت البعيد تماماً عن العمل؛ يمكن للتوجيه أو الإرشاد المساعدة في التخطيط لذلك.' },
      evidence: OLBI_EVIDENCE,
    },
    {
      id: 'depleted', kind: 'attention', priority: 3,
      needs: ['PSS10.total', 'BRS.mean', 'ISI.total'],
      when: m => m['PSS10.total'] >= 27 && m['BRS.mean'] < 3 && m['ISI.total'] >= 15,
      title: { en: 'Running on empty', ar: 'تعمل على خزان فارغ' },
      text: { en: 'High stress, low resilience and clinical insomnia together: your load is high and your recovery is not keeping up.', ar: 'ضغط مرتفع ومرونة منخفضة وأرق سريري معاً: الحمل عليك مرتفع والتعافي لا يواكبه.' },
      recommendation: { en: 'Make recovery the first priority: sleep, time off and support, before taking on more.', ar: 'اجعل التعافي الأولوية الأولى: النوم والإجازة والدعم، قبل تحمّل المزيد.' },
      evidence: 'Smith et al., Int J Behav Med 2008',
    },
    {
      id: 'poor_sleep', kind: 'attention', priority: 5,
      needs: ['ISI.total'], when: m => m['ISI.total'] >= 15,
      title: { en: 'Insomnia', ar: 'أرق' },
      text: { en: 'Your sleep is in the clinical insomnia range. Poor sleep is both a result of stress and a reason it keeps going.', ar: 'نومك ضمن نطاق الأرق السريري. قلة النوم نتيجة للضغط وسبب لاستمراره في الوقت نفسه.' },
      recommendation: { en: 'Ask about CBT for insomnia (CBT-I).', ar: 'اسأل عن العلاج المعرفي السلوكي للأرق (CBT-I).' },
      evidence: 'Qaseem et al., Ann Intern Med 2016',
    },
    {
      id: 'strained_but_coping', kind: 'info', priority: 6,
      needs: ['PSS10.total', 'BRS.mean', 'WHO5.total'],
      when: m => m['PSS10.total'] >= 27 && m['BRS.mean'] >= 3 && m['WHO5.total'] > 12,
      title: { en: 'Strained but coping', ar: 'تحت الضغط لكنك متماسك' },
      text: { en: 'Your stress is high, but your resilience and wellbeing are holding up. Protect them now so they stay that way.', ar: 'ضغطك مرتفع لكن مرونتك ورفاهيتك صامدتان. احمِهما الآن لتبقيا كذلك.' },
    },
    {
      id: 'high_resilience', kind: 'strength', priority: 7,
      needs: ['BRS.mean'], when: m => m['BRS.mean'] > 4.3,
      title: { en: 'High resilience', ar: 'مرونة نفسية عالية' },
      text: { en: 'You bounce back quickly from setbacks.', ar: 'تتعافى بسرعة من الانتكاسات.' },
      evidence: 'Smith et al., Int J Behav Med 2008',
    },
    {
      id: 'good_wellbeing', kind: 'strength', priority: 7,
      needs: ['WHO5.total'], when: m => m['WHO5.total'] >= 18,
      title: { en: 'Good wellbeing', ar: 'رفاهية جيدة' },
      text: { en: 'You feel cheerful, active and rested most of the time.', ar: 'تشعر بالبهجة والنشاط والراحة معظم الوقت.' },
    },
    {
      id: 'no_burnout', kind: 'strength', priority: 8,
      needs: ['OLBI.E', 'OLBI.D'], when: m => !exhausted(m) && !disengaged(m),
      title: { en: 'Engaged with your work', ar: 'منخرط في عملك' },
      text: { en: 'Neither exhaustion nor disengagement is above the burnout cut-off.', ar: 'لا الإنهاك ولا الانفصال عن العمل فوق الحد الفاصل للاحتراق.' },
    },
  ],
  defaultHeadline: { en: 'No sign of burnout', ar: 'لا توجد مؤشرات احتراق وظيفي' },
  notes: [{
    en: 'For employers: share only anonymised group results (at least 10 people). Individual reports belong to the employee.',
    ar: 'لأصحاب العمل: شارك النتائج الجماعية المجهولة فقط (10 أشخاص على الأقل). التقارير الفردية ملك للموظف.',
  }],
}

// ── 3. Relationship & Marriage Readiness ────────────────────────────────────

const relationship: ProfileDef = {
  key: 'relationship_readiness',
  codes: ['IPIP120', 'ECRR', 'DERS', 'PHQ9', 'GAD7', 'SWLS'],
  quadrant: {
    label: { en: 'Attachment style', ar: 'نمط التعلّق' },
    needs: ['ECRR.Anxiety', 'ECRR.Avoidance'],
    evidence: 'Fraley, Waller & Brennan, J Pers Soc Psychol 2000',
    classify: m => {
      const anx = m['ECRR.Anxiety'] >= 4
      const avo = m['ECRR.Avoidance'] >= 4
      if (!anx && !avo) return { label: { en: 'Secure', ar: 'آمن' }, color: '#22c55e', text: { en: 'Comfortable with closeness and not preoccupied with rejection.', ar: 'مرتاح للقرب وغير منشغل بالخوف من الرفض.' } }
      if (anx && !avo) return { label: { en: 'Anxious (preoccupied)', ar: 'قلق (منشغل)' }, color: '#eab308', text: { en: 'You want closeness and may worry about whether your partner feels the same. Reassurance and clear communication matter a lot to you.', ar: 'ترغب في القرب وقد تقلق إن كان شريكك يشعر بالمثل. الطمأنة والتواصل الواضح مهمان جداً لك.' } }
      if (!anx && avo) return { label: { en: 'Avoidant (dismissing)', ar: 'تجنّبي (مستقل)' }, color: '#eab308', text: { en: 'You value independence and may find it hard to depend on a partner or share feelings deeply.', ar: 'تقدّر الاستقلالية وقد تجد صعوبة في الاعتماد على شريك أو مشاركة مشاعرك بعمق.' } }
      return { label: { en: 'Fearful', ar: 'خائف' }, color: '#f97316', text: { en: 'You may want closeness and fear it at the same time. Past hurt often plays a part, and this pattern changes well with support.', ar: 'قد ترغب في القرب وتخشاه في الوقت نفسه. غالباً ما يكون للجراح السابقة دور، وهذا النمط يتحسن جيداً مع الدعم.' } }
    },
  },
  rules: [
    SAFETY_ITEM9,
    {
      id: 'state_before_trait', kind: 'attention', priority: 2,
      needs: ['PHQ9.total', 'GAD7.total'],
      when: m => phqAds(m) >= 20,
      title: { en: 'Current distress may colour this profile', ar: 'الضيق الحالي قد يؤثر على هذا الملف' },
      text: { en: 'Your combined depression and anxiety score is moderate or higher. Distress can temporarily raise neuroticism and attachment anxiety scores, so read the personality and attachment results with that in mind.', ar: 'درجتك المشتركة للاكتئاب والقلق متوسطة أو أعلى. يمكن للضيق أن يرفع مؤقتاً درجات العصابية وقلق التعلّق، لذا اقرأ نتائج الشخصية والتعلّق مع مراعاة ذلك.' },
      recommendation: { en: 'Get support for the low mood or anxiety first, then retake the personality and attachment parts.', ar: 'احصل على دعم لانخفاض المزاج أو القلق أولاً، ثم أعد اختبارَي الشخصية والتعلّق.' },
      evidence: 'Kroenke et al., Psychosom Med 2016',
    },
    {
      id: 'conflict_reactivity', kind: 'attention', priority: 3,
      needs: ['IPIP120.N', 'DERS.total'],
      when: m => m['IPIP120.N'] >= 3.5 && m['DERS.total'] >= 77,
      title: { en: 'Strong emotional reactions in conflict', ar: 'ردود فعل عاطفية قوية في الخلافات' },
      text: { en: 'High neuroticism together with above-average difficulty regulating emotions. In a relationship this can show up as arguments that escalate quickly or take long to settle. It is the main growth area in this profile.', ar: 'عصابية مرتفعة مع صعوبة أعلى من المتوسط في تنظيم المشاعر. في العلاقة قد يظهر ذلك في خلافات تتصاعد بسرعة أو تستغرق وقتاً طويلاً لتهدأ. هذا هو مجال النمو الرئيسي في هذا الملف.' },
      recommendation: { en: 'Emotion regulation skills (for example DBT skills or couples communication training) work well here.', ar: 'مهارات تنظيم المشاعر (مثل مهارات العلاج الجدلي السلوكي أو تدريب التواصل للأزواج) فعّالة هنا.' },
      evidence: 'Malouff et al., J Res Pers 2010; Aldao et al., Clin Psychol Rev 2010',
    },
    {
      id: 'current_distress', kind: 'attention', priority: 4,
      needs: ['PHQ9.total', 'GAD7.total'],
      when: m => phqAds(m) < 20 && (m['PHQ9.total'] >= 10 || m['GAD7.total'] >= 10),
      title: { en: 'Low mood or anxiety right now', ar: 'انخفاض في المزاج أو قلق حالياً' },
      text: { en: 'Your depression or anxiety score is at the level where a professional view is recommended.', ar: 'درجتك في الاكتئاب أو القلق عند المستوى الذي يُنصح عنده برأي متخصص.' },
      recommendation: { en: 'Consider a consultation, ideally before major relationship decisions.', ar: 'فكّر في استشارة، ويُفضّل أن يكون ذلك قبل القرارات الكبيرة في العلاقة.' },
    },
    {
      id: 'low_agreeableness', kind: 'info', priority: 6,
      needs: ['IPIP120.A'], when: m => m['IPIP120.A'] <= 2.5,
      title: { en: 'Direct and independent-minded', ar: 'صريح ومستقل الرأي' },
      text: { en: 'Lower agreeableness means you say what you think. Partners can read this as criticism, so softening how you start difficult conversations helps.', ar: 'انخفاض الوداعة يعني أنك تقول ما تفكر فيه. قد يفهم الشريك ذلك كانتقاد، لذا يساعد تلطيف طريقة بدء المحادثات الصعبة.' },
      evidence: 'Malouff et al., J Res Pers 2010',
    },
    {
      id: 'steady_partner', kind: 'strength', priority: 6,
      needs: ['IPIP120.N', 'IPIP120.A', 'IPIP120.C'],
      when: m => m['IPIP120.N'] <= 2.5 && m['IPIP120.A'] >= 3.5 && m['IPIP120.C'] >= 3.5,
      title: { en: 'Steady partner traits', ar: 'سمات شريك مستقر' },
      text: { en: 'Emotionally steady, warm and reliable: the three traits most consistently linked to partner satisfaction.', ar: 'ثابت عاطفياً ودافئ وموثوق: وهي السمات الثلاث الأكثر ارتباطاً برضا الشريك.' },
      evidence: 'Malouff et al., J Res Pers 2010',
    },
    {
      id: 'good_regulation', kind: 'strength', priority: 7,
      needs: ['DERS.total'], when: m => m['DERS.total'] <= 52,
      title: { en: 'Good emotion regulation', ar: 'تنظيم جيد للمشاعر' },
      text: { en: 'You generally manage strong feelings well.', ar: 'تتعامل عموماً مع المشاعر القوية بشكل جيد.' },
    },
    {
      id: 'satisfied_with_life', kind: 'strength', priority: 7,
      needs: ['SWLS.total'], when: m => m['SWLS.total'] >= 25,
      title: { en: 'Satisfied with life', ar: 'راضٍ عن حياتك' },
      text: { en: 'You come to a relationship from a place of overall satisfaction.', ar: 'تدخل العلاقة وأنت في حالة رضا عام.' },
    },
  ],
  extras: results => personalityLine(results.IPIP120),
  defaultHeadline: { en: 'A steady base for a relationship', ar: 'أساس مستقر لعلاقة' },
  notes: [
    { en: 'This is a profile for reflection and discussion, not a pass or fail verdict on readiness or compatibility. If both partners take it, compare the profiles together, ideally with a counsellor.', ar: 'هذا ملف للتأمل والنقاش، وليس حكماً بالنجاح أو الرسوب على الاستعداد أو التوافق. إذا أجراه الشريكان، فقارنا الملفين معاً، ويُفضّل أن يكون ذلك مع مرشد.' },
    PERSONALITY_NOTE(),
  ],
}

function PERSONALITY_NOTE(): Bi {
  return {
    en: 'Personality levels are shown as low (item average 2.5 or below), average, or high (3.5 or above) until population norms for this platform are available.',
    ar: 'تُعرض مستويات الشخصية كمنخفضة (متوسط البنود 2.5 أو أقل) أو متوسطة أو مرتفعة (3.5 أو أكثر) إلى أن تتوفر معايير سكانية لهذه المنصة.',
  }
}

/** One info line naming the person's most and least pronounced Big Five domains. */
function personalityLine(ipip: ScaleResult | undefined): FiredPattern[] {
  const hi = highestSubscale(ipip)
  const lo = lowestSubscale(ipip)
  if (!hi || !lo || hi.key === lo.key) return []
  return [{
    id: 'personality_shape', kind: 'info', priority: 9,
    title: { en: 'Your personality in brief', ar: 'شخصيتك باختصار' },
    text: {
      en: `Your most pronounced trait is ${hi.label.en} (${level(hi.score)}), and your least pronounced is ${lo.label.en} (${level(lo.score)}).`,
      ar: `أبرز سماتك هي ${hi.label.ar}، وأقلها بروزاً هي ${lo.label.ar}.`,
    },
    evidence: 'Johnson, J Res Pers 2014',
  }]
}

// ── 4. Personal Growth & Wellbeing ──────────────────────────────────────────

const growth: ProfileDef = {
  key: 'personal_growth',
  codes: ['IPIP120', 'WHO5', 'SWLS', 'FFMQ', 'BRS', 'RSES'],
  rules: [
    {
      id: 'low_wellbeing_depression_range', kind: 'clinical', priority: 2,
      needs: ['WHO5.total'], when: m => m['WHO5.total'] <= 7,
      title: { en: 'Very low wellbeing', ar: 'رفاهية منخفضة جداً' },
      text: { en: 'Your WHO-5 score is in the range often linked with depression. A growth plan works best once this is looked at.', ar: 'درجتك في WHO-5 ضمن النطاق المرتبط غالباً بالاكتئاب. تنجح خطة النمو أكثر بعد النظر في ذلك.' },
      recommendation: { en: 'Take the Mental Health Check-up or speak with a professional.', ar: 'أجرِ الفحص الشامل للصحة النفسية أو تحدّث مع أخصائي.' },
      evidence: 'Topp et al., Psychother Psychosom 2015',
    },
    {
      id: 'hidden_strain', kind: 'attention', priority: 3,
      needs: ['IPIP120.N', 'WHO5.total'],
      when: m => m['IPIP120.N'] >= 3.5 && m['WHO5.total'] > 7 && m['WHO5.total'] <= 12,
      title: { en: 'Sensitive to stress, with low wellbeing', ar: 'حساس للضغط مع رفاهية منخفضة' },
      text: { en: 'High neuroticism is the broadest personality risk factor for anxiety and low mood, and your wellbeing is currently low.', ar: 'العصابية المرتفعة هي أوسع عوامل الخطر الشخصية للقلق وانخفاض المزاج، ورفاهيتك منخفضة حالياً.' },
      recommendation: { en: 'The Mental Health Check-up would show whether anything more needs attention.', ar: 'سيُظهر الفحص الشامل للصحة النفسية إن كان هناك ما يحتاج إلى اهتمام أكبر.' },
      evidence: 'Kotov et al., Psychol Bull 2010',
    },
    {
      id: 'self_worth', kind: 'attention', priority: 4,
      needs: ['RSES.total', 'BRS.mean'],
      when: m => m['RSES.total'] <= 14 && m['BRS.mean'] < 3,
      title: { en: 'Low self-esteem and resilience', ar: 'تقدير ذات ومرونة منخفضان' },
      text: { en: 'Low self-esteem together with low resilience makes setbacks feel heavier.', ar: 'انخفاض تقدير الذات مع انخفاض المرونة يجعل الانتكاسات تبدو أثقل.' },
      recommendation: { en: 'Self-compassion practice and noticing small wins are good starting points; a counsellor can help.', ar: 'ممارسة التعاطف مع الذات وملاحظة الإنجازات الصغيرة نقطتا انطلاق جيدتان؛ ويمكن للمرشد المساعدة.' },
    },
    {
      id: 'thriving', kind: 'strength', priority: 5,
      needs: ['WHO5.total', 'SWLS.total', 'BRS.mean'],
      when: m => m['WHO5.total'] > 12 && m['SWLS.total'] >= 25 && m['BRS.mean'] >= 3,
      title: { en: 'Thriving', ar: 'مزدهر' },
      text: { en: 'Good wellbeing, satisfaction with life and normal or high resilience.', ar: 'رفاهية جيدة ورضا عن الحياة ومرونة طبيعية أو مرتفعة.' },
      evidence: 'Keyes, J Consult Clin Psychol 2005',
    },
    {
      id: 'high_resilience', kind: 'strength', priority: 7,
      needs: ['BRS.mean'], when: m => m['BRS.mean'] > 4.3,
      title: { en: 'High resilience', ar: 'مرونة نفسية عالية' },
      text: { en: 'You bounce back quickly from setbacks.', ar: 'تتعافى بسرعة من الانتكاسات.' },
    },
    {
      id: 'high_self_esteem', kind: 'strength', priority: 7,
      needs: ['RSES.total'], when: m => m['RSES.total'] >= 26,
      title: { en: 'High self-esteem', ar: 'تقدير ذات مرتفع' },
      text: { en: 'You hold a positive, stable view of yourself.', ar: 'لديك نظرة إيجابية ومستقرة لنفسك.' },
    },
    {
      id: 'conscientious', kind: 'strength', priority: 8,
      needs: ['IPIP120.C'], when: m => m['IPIP120.C'] >= 3.5,
      title: { en: 'Organised and dependable', ar: 'منظّم وموثوق' },
      text: { en: 'High conscientiousness is one of the most reliable predictors of reaching goals.', ar: 'يقظة الضمير المرتفعة من أكثر المؤشرات موثوقية على تحقيق الأهداف.' },
      evidence: 'Barrick & Mount, Pers Psychol 1991',
    },
  ],
  extras: results => {
    const out = personalityLine(results.IPIP120)
    const lo = lowestSubscale(results.FFMQ)
    if (lo) out.push({
      id: 'mindfulness_lever', kind: 'info', priority: 6,
      title: { en: 'Your mindfulness growth area', ar: 'مجال النمو في اليقظة الذهنية' },
      text: {
        en: `Your lowest mindfulness skill is "${lo.label.en}" (average ${lo.score.toFixed(1)} of 5). Practising this one skill is the most direct way to raise your overall mindfulness.`,
        ar: `أضعف مهارات اليقظة الذهنية لديك هي "${lo.label.ar}" (المتوسط ${lo.score.toFixed(1)} من 5). ممارسة هذه المهارة بالذات هي أقصر طريق لرفع يقظتك الذهنية عموماً.`,
      },
      evidence: 'Baer et al., Assessment 2006',
    })
    return out
  },
  defaultHeadline: { en: 'A balanced wellbeing profile', ar: 'ملف رفاهية متوازن' },
  notes: [PERSONALITY_NOTE()],
}

// ── 5. Athlete Mental Performance & Health ──────────────────────────────────

const welfareClear = (m: Metrics) =>
  m['PHQ9.total'] < 10 && m['GAD7.total'] < 10 && m['ISI.total'] < 15 && m['EAT26.total'] < 20 && (m['AUDIT.c'] ?? m['AUDIT.total']) < 4

const SMHAT = 'Gouttebarge et al., Br J Sports Med 2021 (IOC SMHAT-1)'

const athlete: ProfileDef = {
  key: 'athlete_performance',
  codes: ['ACSI28', 'GAD7', 'PHQ9', 'ISI', 'AUDIT', 'EAT26', 'BRS'],
  rules: [
    SAFETY_ITEM9,
    {
      id: 'eating_risk', kind: 'clinical', priority: 2,
      needs: ['EAT26.total'], when: m => m['EAT26.total'] >= 20,
      title: { en: 'Possible disordered eating', ar: 'احتمال اضطراب في الأكل' },
      text: { en: 'Your EAT-26 score is at or above 20, the level where an assessment for an eating problem is recommended. Disordered eating is common in sport and affects both health and performance.', ar: 'درجتك في EAT-26 تساوي 20 أو أكثر، وهو المستوى الذي يُنصح عنده بتقييم لمشكلة في الأكل. اضطرابات الأكل شائعة في الرياضة وتؤثر على الصحة والأداء معاً.' },
      recommendation: { en: 'See a sports doctor or psychologist with experience in eating problems.', ar: 'راجع طبيباً رياضياً أو أخصائياً نفسياً لديه خبرة في مشكلات الأكل.' },
      evidence: SMHAT,
    },
    {
      id: 'depression', kind: 'clinical', priority: 2,
      needs: ['PHQ9.total'], when: m => m['PHQ9.total'] >= 10,
      title: { en: 'Signs of depression', ar: 'مؤشرات اكتئاب' },
      text: { en: 'Your PHQ-9 score is at or above 10. In the IOC screening tool this calls for a referral to a sports mental health professional.', ar: 'درجتك في PHQ-9 تساوي 10 أو أكثر. في أداة الفحص التابعة للجنة الأولمبية الدولية يستدعي ذلك الإحالة إلى أخصائي صحة نفسية رياضية.' },
      recommendation: { en: 'Speak with your team doctor or a sport psychologist.', ar: 'تحدّث مع طبيب الفريق أو أخصائي نفسي رياضي.' },
      evidence: SMHAT,
    },
    {
      id: 'worry_is_anxiety', kind: 'clinical', priority: 2,
      needs: ['GAD7.total', 'ACSI28.freedom_worry'],
      when: m => m['GAD7.total'] >= 10 && m['ACSI28.freedom_worry'] <= 4,
      title: { en: 'Performance worry is part of wider anxiety', ar: 'قلق الأداء جزء من قلق أوسع' },
      text: { en: 'You score low on freedom from worry in competition and your general anxiety score is at or above 10. The worry is not only about sport, so mental skills coaching alone is unlikely to be enough.', ar: 'درجتك منخفضة في التحرر من القلق أثناء المنافسة ودرجة القلق العام لديك 10 أو أكثر. القلق لا يقتصر على الرياضة، لذا من غير المرجح أن يكفي التدريب على المهارات الذهنية وحده.' },
      recommendation: { en: 'See a sport psychologist or clinician for the anxiety, alongside any performance work.', ar: 'راجع أخصائياً نفسياً رياضياً أو معالجاً للقلق، إلى جانب أي عمل على الأداء.' },
      evidence: 'Smith et al., J Sport Exerc Psychol 1995; ' + SMHAT,
    },
    {
      id: 'anxiety', kind: 'clinical', priority: 3,
      needs: ['GAD7.total', 'ACSI28.freedom_worry'],
      when: m => m['GAD7.total'] >= 10 && m['ACSI28.freedom_worry'] > 4,
      title: { en: 'Signs of an anxiety problem', ar: 'مؤشرات اضطراب قلق' },
      text: { en: 'Your GAD-7 score is at or above 10. In the IOC screening tool this calls for a referral.', ar: 'درجتك في GAD-7 تساوي 10 أو أكثر. في أداة الفحص التابعة للجنة الأولمبية الدولية يستدعي ذلك الإحالة.' },
      recommendation: { en: 'Speak with your team doctor or a sport psychologist.', ar: 'تحدّث مع طبيب الفريق أو أخصائي نفسي رياضي.' },
      evidence: SMHAT,
    },
    {
      id: 'alcohol', kind: 'attention', priority: 3,
      needs: ['AUDIT.c'], when: m => m['AUDIT.c'] >= 4,
      title: { en: 'Risky drinking', ar: 'شرب كحول محفوف بالمخاطر' },
      text: { en: 'Your score on the first three AUDIT questions (AUDIT-C) is 4 or more, which suggests risky drinking. For women the usual cut-off is 3.', ar: 'درجتك في أسئلة AUDIT الثلاثة الأولى (AUDIT-C) تساوي 4 أو أكثر، ما يشير إلى شرب محفوف بالمخاطر. الحد المعتاد للنساء هو 3.' },
      recommendation: { en: 'Talk with your team doctor about cutting down; alcohol slows recovery and adaptation to training.', ar: 'تحدّث مع طبيب الفريق عن التقليل؛ فالكحول يبطئ التعافي والتكيّف مع التدريب.' },
      evidence: SMHAT,
    },
    {
      id: 'insomnia', kind: 'attention', priority: 4,
      needs: ['ISI.total'], when: m => m['ISI.total'] >= 15,
      title: { en: 'Insomnia', ar: 'أرق' },
      text: { en: 'Your sleep is in the clinical insomnia range. Sleep is one of the strongest drivers of recovery and performance.', ar: 'نومك ضمن نطاق الأرق السريري. النوم من أقوى محركات التعافي والأداء.' },
      recommendation: { en: 'Review training timing, travel and evening routines with your staff; ask about CBT-I if it persists.', ar: 'راجع مع الجهاز الفني توقيت التدريب والسفر والروتين المسائي؛ واسأل عن العلاج المعرفي السلوكي للأرق إذا استمر.' },
      evidence: SMHAT,
    },
    {
      id: 'ready_to_compete', kind: 'strength', priority: 5,
      needs: ['PHQ9.total', 'GAD7.total', 'ISI.total', 'EAT26.total', 'AUDIT.total', 'ACSI28.total'],
      when: m => welfareClear(m) && m['ACSI28.total'] >= 42,
      title: { en: 'Ready to train and compete', ar: 'جاهز للتدريب والمنافسة' },
      text: { en: 'No welfare flags, and your overall coping skills are above the middle of the scale.', ar: 'لا توجد مؤشرات تتعلق بالصحة النفسية، ومهارات التكيّف لديك عموماً فوق منتصف المقياس.' },
    },
    {
      id: 'high_resilience', kind: 'strength', priority: 7,
      needs: ['BRS.mean'], when: m => m['BRS.mean'] > 4.3,
      title: { en: 'High resilience', ar: 'مرونة نفسية عالية' },
      text: { en: 'You bounce back quickly from setbacks such as losses and injuries.', ar: 'تتعافى بسرعة من الانتكاسات مثل الخسائر والإصابات.' },
    },
  ],
  extras: results => {
    const hi = highestSubscale(results.ACSI28)
    const lo = lowestSubscale(results.ACSI28)
    if (!hi || !lo || hi.key === lo.key) return []
    return [{
      id: 'skills_profile', kind: 'info', priority: 6,
      title: { en: 'Your mental skills profile', ar: 'ملف مهاراتك الذهنية' },
      text: {
        en: `Your strongest mental skill is "${hi.label.en}" (${hi.score} of 12) and the one with most room to grow is "${lo.label.en}" (${lo.score} of 12). Build your mental skills training around the second.`,
        ar: `أقوى مهاراتك الذهنية هي "${hi.label.ar}" (${hi.score} من 12) والمهارة التي لديها أكبر مجال للنمو هي "${lo.label.ar}" (${lo.score} من 12). ابنِ تدريبك على المهارات الذهنية حول الثانية.`,
      },
      evidence: 'Smith et al., J Sport Exerc Psychol 1995',
    }]
  },
  defaultHeadline: { en: 'No welfare concerns', ar: 'لا توجد مخاوف تتعلق بالصحة النفسية' },
  notes: [
    { en: 'ACSI-28 is validated in English only. The Arabic wording is a translation that has not been validated.', ar: 'مقياس ACSI-28 مُعتمد باللغة الإنجليزية فقط. الصياغة العربية ترجمة لم يتم التحقق من صحتها.' },
    { en: 'The welfare part follows the IOC Sport Mental Health Assessment Tool (SMHAT-1), using ISI for sleep and EAT-26 for eating in place of the athlete-specific scales. It is a screen, not the IOC tool itself.', ar: 'يتبع جزء الصحة النفسية أداة الفحص التابعة للجنة الأولمبية الدولية (SMHAT-1)، مع استخدام ISI للنوم وEAT-26 للأكل بدلاً من المقاييس الخاصة بالرياضيين. إنه فحص وليس أداة اللجنة نفسها.' },
  ],
}

// ── 6. Mood Clarity ─────────────────────────────────────────────────────────

const bipolarFlag = (m: Metrics) => m['MDQ.total'] >= 7 || m['ASRM.total'] >= 6

const mood: ProfileDef = {
  key: 'mood_clarity',
  codes: ['PHQ9', 'GAD7', 'MDQ', 'ASRM', 'ISI'],
  composite: PHQ_ADS,
  rules: [
    SAFETY_ITEM9,
    {
      id: 'possible_bipolar', kind: 'clinical', priority: 1,
      needs: ['MDQ.total', 'ASRM.total'], when: bipolarFlag,
      title: { en: 'Possible bipolar-spectrum pattern', ar: 'نمط محتمل من طيف الاضطراب ثنائي القطب' },
      text: { en: 'Your answers on the mood swings screen (MDQ 7 or more) or the elevated mood scale (ASRM 6 or more) suggest periods of unusually high or irritable mood. This matters because depression in bipolar disorder is treated differently from other depression.', ar: 'تشير إجاباتك في فحص تقلبات المزاج (MDQ 7 أو أكثر) أو مقياس ارتفاع المزاج (ASRM 6 أو أكثر) إلى فترات من المزاج المرتفع أو العصبي بشكل غير معتاد. هذا مهم لأن الاكتئاب في الاضطراب ثنائي القطب يُعالج بطريقة مختلفة عن غيره.' },
      recommendation: { en: 'See a psychiatrist for an assessment before starting any treatment for depression, including antidepressants.', ar: 'راجع طبيباً نفسياً لإجراء تقييم قبل بدء أي علاج للاكتئاب، بما في ذلك مضادات الاكتئاب.' },
      evidence: 'Hirschfeld et al., Am J Psychiatry 2000; Altman et al., Biol Psychiatry 1997',
    },
    {
      id: 'unipolar_depression', kind: 'clinical', priority: 3,
      needs: ['PHQ9.total', 'MDQ.total', 'ASRM.total'],
      when: m => m['PHQ9.total'] >= 10 && !bipolarFlag(m),
      title: { en: 'Depression without signs of bipolarity', ar: 'اكتئاب دون مؤشرات ثنائية القطب' },
      text: { en: 'Your depression score is at or above 10 and the screens for elevated mood are negative.', ar: 'درجتك في الاكتئاب 10 أو أكثر وفحوص ارتفاع المزاج سلبية.' },
      recommendation: { en: 'Book a consultation with a psychologist or doctor; depression responds well to treatment.', ar: 'احجز استشارة مع أخصائي نفسي أو طبيب؛ الاكتئاب يستجيب جيداً للعلاج.' },
      evidence: 'Kroenke et al., Gen Hosp Psychiatry 2010',
    },
    ANXIOUS_DEPRESSION,
    INSOMNIA_WITH_DISTRESS,
    {
      id: 'mood_clear', kind: 'strength', priority: 6,
      needs: ['PHQ9.total', 'MDQ.total', 'ASRM.total'],
      when: m => m['PHQ9.total'] < 5 && !bipolarFlag(m),
      title: { en: 'Stable mood', ar: 'مزاج مستقر' },
      text: { en: 'Minimal depressive symptoms and no signs of elevated mood.', ar: 'أعراض اكتئاب ضئيلة ولا مؤشرات على ارتفاع المزاج.' },
    },
  ],
  defaultHeadline: { en: 'No depressive or bipolar pattern on this screen', ar: 'لا يوجد نمط اكتئابي أو ثنائي القطب في هذا الفحص' },
  notes: [{
    en: 'The platform\'s MDQ counts symptoms only; the full MDQ also asks whether they happened together and caused problems. A positive screen is a reason for assessment, not a diagnosis.',
    ar: 'يحسب مقياس MDQ على المنصة الأعراض فقط؛ أما النسخة الكاملة فتسأل أيضاً إن كانت الأعراض حدثت معاً وسببت مشكلات. النتيجة الإيجابية سبب لإجراء تقييم وليست تشخيصاً.',
  }],
}

export const PROFILE_DEFS: Record<string, ProfileDef> = Object.fromEntries(
  [checkup, burnout, relationship, growth, athlete, mood].map(d => [d.key, d]),
)
