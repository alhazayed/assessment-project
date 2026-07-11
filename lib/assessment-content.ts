export interface BandContent {
  explanation: string
  whatThisMeans: string[]
  recommendations: string[]
  relatedDisorders: { name: string; description: string }[]
}

export interface AssessmentContent {
  overview: string
  measuresDomain: string
  bands: Record<string, BandContent>
  relatedCodes: string[]
}

export const ASSESSMENT_CONTENT: Record<string, AssessmentContent> = {
  PHQ9: {
    overview: 'The PHQ-9 (Patient Health Questionnaire) is a validated 9-item tool derived from the DSM criteria for Major Depressive Disorder. It is one of the most widely used depression screening instruments globally, with demonstrated sensitivity of 88% and specificity of 88% at a cutoff of ≥10.',
    measuresDomain: 'Depressive symptoms over the past 2 weeks',
    bands: {
      'Minimal': {
        explanation: 'A score in the minimal range (0–4) indicates little to no depressive symptomatology. Research shows that scores in this range are associated with normal mood fluctuations rather than clinical depression.',
        whatThisMeans: [
          'No clinically significant depressive episode is indicated',
          'Transient low mood in response to life events is normal at this level',
          'Your emotional wellbeing appears to be within the expected range',
        ],
        recommendations: [
          'Continue healthy lifestyle habits — regular exercise, sleep, and social connection are protective',
          'Rescreen in 6–12 months or when life stressors arise',
        ],
        relatedDisorders: [],
      },
      'Mild': {
        explanation: 'A mild PHQ-9 score (5–9) signals the presence of subthreshold depressive symptoms. Studies show that even mild depression is associated with meaningful functional impairment (Kroenke & Spitzer, 2002). Approximately 25% of individuals at this level progress to major depression without intervention.',
        whatThisMeans: [
          'Some depressive symptoms are present but do not yet meet the threshold for a clinical diagnosis',
          'Mood, energy, or interest may be mildly affected in daily life',
          'Watchful waiting and lifestyle adjustment are typically the first step',
        ],
        recommendations: [
          'Consider structured exercise — meta-analyses show it is as effective as antidepressants for mild depression',
          'Behavioural activation (staying engaged in valued activities) is evidence-based at this level',
          'Consider a follow-up screening in 4–6 weeks',
          'Talk to a GP or counsellor if symptoms persist or worsen',
        ],
        relatedDisorders: [
          { name: 'Adjustment Disorder with Depressed Mood', description: 'A stress-related condition in which depressive symptoms arise following an identifiable stressor.' },
          { name: 'Persistent Depressive Disorder (Dysthymia)', description: 'A chronic, low-grade form of depression lasting at least 2 years, often underdiagnosed.' },
        ],
      },
      'Moderate': {
        explanation: 'A moderate PHQ-9 score (10–14) is clinically significant. At a cutoff of ≥10, the PHQ-9 identifies Major Depressive Disorder with sensitivity >80% and specificity >85%. Scores in this range are associated with notable impairment in work, relationships, and daily functioning.',
        whatThisMeans: [
          'Your score meets the screening threshold for a probable depressive episode',
          'Functional impairment in daily activities, concentration, or relationships is likely',
          'Clinical evaluation is strongly recommended',
        ],
        recommendations: [
          'Seek evaluation from a GP, psychiatrist, or licensed psychologist',
          'Cognitive Behavioural Therapy (CBT) has a strong evidence base for moderate depression (effect size d ≈ 0.87)',
          'Antidepressant medication (SSRIs) may be considered in discussion with a clinician',
          'Interpersonal Therapy (IPT) is also evidence-based for this severity level',
        ],
        relatedDisorders: [
          { name: 'Major Depressive Disorder (MDD)', description: 'Characterised by persistent low mood, anhedonia, and related symptoms causing significant impairment.' },
          { name: 'Persistent Depressive Disorder', description: 'Chronic depression of lower intensity; may coexist with an acute episode ("double depression").' },
          { name: 'Bipolar Depression', description: 'Depressive episodes can occur within Bipolar Disorder — important to screen for manic/hypomanic history (see MDQ).' },
        ],
      },
      'Moderately severe': {
        explanation: 'A moderately severe score (15–19) indicates a significant depressive episode. At this level, the PHQ-9 consistently maps to DSM-5 Major Depressive Disorder, moderate-to-severe subtype. Functional impairment is expected across multiple life domains.',
        whatThisMeans: [
          'A probable moderate-to-severe Major Depressive Episode is indicated',
          'Significant impairment in occupational, social, and personal functioning is expected',
          'Urgent clinical evaluation is recommended — do not delay seeking help',
        ],
        recommendations: [
          'Consult a psychiatrist or psychologist as soon as possible',
          'Combined treatment (psychotherapy + medication) is superior to either alone at this severity',
          'Safety assessment (suicidality) should be conducted by a clinician',
          'Consider whether environmental stressors can be reduced in the short term',
        ],
        relatedDisorders: [
          { name: 'Major Depressive Disorder — Moderate to Severe', description: 'Significant depressive episode with broad functional impact.' },
          { name: 'Bipolar Disorder', description: 'A prior manic or hypomanic episode would change the diagnosis and treatment approach significantly.' },
          { name: 'Anxiety Disorders', description: 'Comorbid anxiety is present in up to 60% of people with MDD — consider the GAD-7.' },
          { name: 'Somatic Symptom Disorder', description: 'Physical symptoms (fatigue, pain) often overlap with depression.' },
        ],
      },
      'Severe': {
        explanation: 'A severe PHQ-9 score (20–27) indicates a severe depressive episode. This range is associated with high rates of psychomotor disturbance, suicidal ideation, and significant functional collapse. This is a medical emergency level of concern.',
        whatThisMeans: [
          'A severe Major Depressive Episode is strongly indicated',
          'Significant risk of suicidal ideation must be assessed by a clinician immediately',
          'This score warrants urgent mental health intervention',
        ],
        recommendations: [
          'Seek immediate mental health care — contact a crisis line or emergency services if in danger',
          'Psychiatric evaluation and possible hospital-level care may be appropriate',
          'Medication management is typically necessary at this severity level',
          'Do not attempt to manage this alone — involve a trusted person and a clinical team',
        ],
        relatedDisorders: [
          { name: 'Severe Major Depressive Disorder with Psychotic Features', description: 'Severe depression can include psychotic symptoms (delusions, hallucinations) requiring specialist care.' },
          { name: 'Bipolar Disorder', description: 'Severe depressive episodes can be the presenting phase of Bipolar I or II.' },
          { name: 'Anxiety and PTSD', description: 'High comorbidity at this severity — trauma history should be explored.' },
        ],
      },
    },
    relatedCodes: ['GAD7', 'DASS21', 'ISI', 'PCL5', 'MDQ'],
  },

  GAD7: {
    overview: 'The GAD-7 (Generalised Anxiety Disorder Scale) is a validated 7-item tool developed by Spitzer et al. (2006). It measures the severity of generalised anxiety disorder symptoms with a sensitivity of 89% and specificity of 82% at a cutoff of ≥10 for GAD diagnosis.',
    measuresDomain: 'Generalised anxiety symptoms over the past 2 weeks',
    bands: {
      'Minimal': {
        explanation: 'A minimal GAD-7 score (0–4) indicates little to no anxiety symptoms. Anxiety is a normal human emotion; at this level it is adaptive rather than pathological.',
        whatThisMeans: [
          'No clinically significant anxiety disorder is indicated',
          'Occasional worry or nervousness is normal and expected',
        ],
        recommendations: [
          'Maintain stress management skills such as mindfulness and regular physical activity',
          'Rescreen if anxiety levels increase or life stressors emerge',
        ],
        relatedDisorders: [],
      },
      'Mild': {
        explanation: 'A mild GAD-7 score (5–9) suggests subclinical anxiety symptoms. These are meaningful: research shows mild anxiety is associated with impaired quality of life and productivity. This level is often referred to as "subthreshold GAD."',
        whatThisMeans: [
          'Some anxiety symptoms are present and may affect concentration, sleep, or relaxation',
          'Worry may feel excessive at times but remains manageable',
        ],
        recommendations: [
          'Mindfulness-based stress reduction (MBSR) has good evidence at this level',
          'Limit caffeine and alcohol, which exacerbate anxiety',
          'Regular aerobic exercise reduces anxiety via downregulation of the HPA axis',
          'Consider self-guided CBT workbooks if symptoms persist',
        ],
        relatedDisorders: [
          { name: 'Adjustment Disorder with Anxiety', description: 'Anxiety arising as a response to an identifiable stressor.' },
          { name: 'Social Anxiety Disorder', description: 'Anxiety specifically linked to social situations — often missed in GAD screening.' },
        ],
      },
      'Moderate': {
        explanation: 'A moderate GAD-7 score (10–14) is clinically significant, meeting the diagnostic threshold for probable Generalised Anxiety Disorder. At this level, the GAD-7 has a positive predictive value of approximately 75% for a DSM-defined GAD diagnosis.',
        whatThisMeans: [
          'Your score meets the screening threshold for GAD',
          'Chronic excessive worry, tension, and difficulty relaxing are likely present',
          'Physical symptoms such as muscle tension, sleep problems, or GI disturbance may also occur',
        ],
        recommendations: [
          'Cognitive Behavioural Therapy (CBT) is the gold-standard treatment for GAD (NNT ≈ 3–4)',
          'SSRIs (e.g., escitalopram, sertraline) or SNRIs are first-line pharmacological options — discuss with a clinician',
          'Worry postponement and scheduled worry time are effective CBT techniques',
          'Seek evaluation from a psychologist or GP',
        ],
        relatedDisorders: [
          { name: 'Generalised Anxiety Disorder (GAD)', description: 'Excessive, uncontrollable worry across multiple domains causing significant distress.' },
          { name: 'Panic Disorder', description: 'Recurrent unexpected panic attacks; often comorbid with GAD.' },
          { name: 'Social Anxiety Disorder', description: 'Fear of social scrutiny; may overlap with or be distinct from GAD.' },
          { name: 'Health Anxiety (Illness Anxiety Disorder)', description: 'Persistent fear of having or acquiring a serious illness.' },
        ],
      },
      'Severe': {
        explanation: 'A severe GAD-7 score (15–21) indicates severe generalised anxiety. This level is associated with marked functional impairment across occupational, social, and personal domains. Comorbid depression is present in over 60% of cases at this severity.',
        whatThisMeans: [
          'Severe, disabling anxiety symptoms are present',
          'Daily functioning is significantly impaired',
          'Physical symptoms of anxiety (tension, fatigue, insomnia) are likely prominent',
        ],
        recommendations: [
          'Urgent evaluation by a psychiatrist or psychologist is recommended',
          'Combined CBT and SSRI/SNRI treatment is superior to either alone at this severity',
          'Short-term anxiolytics may be considered for acute relief — discuss with a clinician',
          'Safety assessment may be warranted given high comorbidity with depression',
        ],
        relatedDisorders: [
          { name: 'Generalised Anxiety Disorder — Severe', description: 'Pervasive, debilitating worry significantly impacting daily life.' },
          { name: 'Major Depressive Disorder', description: 'Co-occurs in up to 60% of severe GAD cases — screen with PHQ-9.' },
          { name: 'OCD', description: 'Obsessive thoughts may be differentiated from GAD worry by their egodystonic nature.' },
          { name: 'PTSD', description: 'Hypervigilance and anxiety can be PTSD symptoms rather than primary GAD.' },
        ],
      },
    },
    relatedCodes: ['PHQ9', 'DASS21', 'ISI', 'PCL5', 'MDQ'],
  },

  DASS21: {
    overview: 'The DASS-21 (Depression Anxiety Stress Scales) is a validated 21-item self-report instrument developed by Lovibond & Lovibond (1995) at UNSW. It measures three overlapping but distinct constructs: depression, anxiety, and stress — providing a multidimensional picture of psychological distress.',
    measuresDomain: 'Depression, anxiety, and stress symptoms over the past week',
    bands: {
      'Normal range': {
        explanation: 'A score in the normal range (0–13) across DASS-21 subscales indicates that depression, anxiety, and stress levels are within the expected population range. The DASS-21 was standardised on community samples; "normal" reflects the typical range of psychological distress.',
        whatThisMeans: [
          'Your overall psychological distress is within normal limits',
          'Depression, anxiety, and stress dimensions all appear manageable',
        ],
        recommendations: [
          'Maintain protective factors: social support, sleep, exercise, and meaningful activity',
          'Rescreen during periods of heightened stress',
        ],
        relatedDisorders: [],
      },
      'Mild–moderate distress': {
        explanation: 'A mild-to-moderate DASS-21 score (14–25) indicates noticeable psychological distress across one or more of the depression, anxiety, or stress subscales. This level is associated with early functional impact and is an important window for preventive intervention.',
        whatThisMeans: [
          'Moderate levels of depression, anxiety, and/or stress are present',
          'Daily functioning may be starting to be affected',
          'This is an important time to address symptoms before they escalate',
        ],
        recommendations: [
          'Identify and address key stressors — problem-solving therapy has evidence at this level',
          'Mindfulness-based cognitive therapy (MBCT) reduces relapse in recurrent distress',
          'Consider counselling or psychotherapy to build coping skills',
        ],
        relatedDisorders: [
          { name: 'Adjustment Disorder', description: 'Stress-response syndromes with emotional or behavioural symptoms following an identifiable stressor.' },
          { name: 'Burnout', description: 'Chronic work-related stress leading to exhaustion, cynicism, and reduced efficacy — not a formal DSM diagnosis but clinically significant.' },
        ],
      },
      'Moderate–severe distress': {
        explanation: 'A moderate-to-severe DASS-21 score (26–40) indicates clinically significant psychological distress. At this level, scores correspond to the moderate-to-severe range across DSM-defined disorders of depression and anxiety. Functional impairment is expected.',
        whatThisMeans: [
          'Clinically significant levels of distress across depression, anxiety, and/or stress dimensions',
          'Significant impact on occupational, social, or personal functioning is likely',
          'Clinical evaluation is strongly recommended',
        ],
        recommendations: [
          'Seek evaluation from a mental health professional',
          'CBT addressing all three dimensions (depression, anxiety, stress) is recommended',
          'Pharmacological treatment may be appropriate — discuss with a clinician',
          'Stress management and lifestyle intervention alone are insufficient at this level',
        ],
        relatedDisorders: [
          { name: 'Major Depressive Disorder', description: 'Elevated depression subscale scores suggest probable MDD.' },
          { name: 'Generalised Anxiety Disorder', description: 'Elevated anxiety/stress subscores suggest GAD.' },
          { name: 'Burnout with Secondary Depression', description: 'Occupational stress can precipitate clinical depression and anxiety.' },
        ],
      },
      'Severe distress': {
        explanation: 'A severe DASS-21 score (41–63) indicates very high levels of depression, anxiety, and/or stress. This range corresponds to severe clinical presentations and is associated with significant suicidal risk, social withdrawal, and inability to function in daily roles.',
        whatThisMeans: [
          'Severe psychological distress is present across multiple dimensions',
          'Immediate clinical attention is warranted',
          'Daily functioning is likely severely compromised',
        ],
        recommendations: [
          'Seek urgent mental health evaluation — contact a crisis service if at risk of self-harm',
          'Inpatient or intensive outpatient psychiatric care may be appropriate',
          'Combined psychotherapy and medication is recommended',
          'Involve a trusted support person in getting help',
        ],
        relatedDisorders: [
          { name: 'Severe Major Depressive Disorder', description: 'Severe depressive episode with high risk of suicidal ideation.' },
          { name: 'Severe Anxiety Disorder', description: 'Debilitating anxiety severely limiting daily life.' },
          { name: 'PTSD', description: 'Trauma is a common underlying driver of severe multi-domain distress.' },
          { name: 'Bipolar Disorder', description: 'Severe mood disturbance warrants bipolar screening.' },
        ],
      },
    },
    relatedCodes: ['PHQ9', 'GAD7', 'ISI', 'PCL5', 'MDQ'],
  },

  ISI: {
    overview: 'The ISI (Insomnia Severity Index) is a validated 7-item questionnaire developed by Morin (1993) and widely used in sleep research. It assesses the nature, severity, and impact of insomnia with a sensitivity of 82.4% and specificity of 82.1% at a cutoff of ≥15 for insomnia disorder.',
    measuresDomain: 'Sleep difficulty and its daytime impact over the past 2 weeks',
    bands: {
      'No clinically significant insomnia': {
        explanation: 'An ISI score of 0–7 indicates that your sleep is within the clinically normal range. While you may occasionally experience poor nights, this does not constitute a sleep disorder.',
        whatThisMeans: [
          'No clinically significant sleep disorder is indicated',
          'Occasional sleep difficulty is normal and not cause for concern',
        ],
        recommendations: [
          'Maintain good sleep hygiene: consistent bed/wake times, dark/cool room, limited screens before bed',
          'Regular exercise improves sleep quality (avoid vigorous exercise within 3 hours of bedtime)',
        ],
        relatedDisorders: [],
      },
      'Subthreshold insomnia': {
        explanation: 'An ISI score of 8–14 indicates subthreshold insomnia. This means sleep difficulties are present and impacting daytime functioning, but do not yet fully meet the diagnostic criteria for Insomnia Disorder. Approximately 40% of individuals at this level progress to clinical insomnia within a year.',
        whatThisMeans: [
          'Sleep is disrupted enough to affect how you feel and function during the day',
          'You may notice fatigue, concentration problems, or irritability related to poor sleep',
          'Early intervention can prevent progression to clinical insomnia disorder',
        ],
        recommendations: [
          'Implement structured sleep restriction and stimulus control techniques',
          'Avoid caffeine after 2pm and alcohol within 4 hours of bedtime',
          'Use relaxation techniques (progressive muscle relaxation, diaphragmatic breathing) before bed',
          'Consider a brief course of digital CBT-I (CBT for Insomnia)',
        ],
        relatedDisorders: [
          { name: 'Circadian Rhythm Sleep Disorder', description: 'Misalignment between internal body clock and desired sleep schedule.' },
          { name: 'Anxiety Disorders', description: 'Worry and hyperarousal are major drivers of sleep-onset insomnia.' },
        ],
      },
      'Moderate insomnia': {
        explanation: 'An ISI score of 15–21 meets the diagnostic threshold for moderate Insomnia Disorder. At this level, sleep disturbance causes significant daytime impairment. Cognitive Behavioural Therapy for Insomnia (CBT-I) is the first-line evidence-based treatment, superior to pharmacotherapy in long-term outcomes.',
        whatThisMeans: [
          'A clinical Insomnia Disorder is indicated',
          'Daytime impairment (fatigue, cognitive difficulties, mood disturbance) is significant',
          'Your sleep disturbance is likely maintaining other psychological symptoms',
        ],
        recommendations: [
          'CBT-I is the gold-standard treatment — seek a CBT-I certified therapist or a validated digital program',
          'Sleep restriction therapy (counterintuitive but highly effective) is the core CBT-I technique',
          'Short-term pharmacotherapy (e.g., melatonin receptor agonists, low-dose doxepin) may bridge until CBT-I takes effect',
          'Address comorbid depression or anxiety, which commonly perpetuate insomnia',
        ],
        relatedDisorders: [
          { name: 'Insomnia Disorder', description: 'Chronic difficulty initiating or maintaining sleep with daytime consequences, present ≥3 nights/week for ≥3 months.' },
          { name: 'Major Depressive Disorder', description: 'Sleep disruption is both a symptom and a perpetuating factor in depression.' },
          { name: 'Sleep Apnoea', description: 'Obstructive sleep apnoea causes non-restorative sleep — consider a sleep study if snoring or witnessed apnoeas are present.' },
          { name: 'Restless Legs Syndrome', description: 'Unpleasant limb sensations at rest causing sleep-onset difficulty.' },
        ],
      },
      'Severe insomnia': {
        explanation: 'An ISI score of 22–28 indicates severe Insomnia Disorder with marked impairment. Severe insomnia is associated with significantly elevated risk of depression, immune dysfunction, cardiovascular disease, and occupational accidents.',
        whatThisMeans: [
          'Severe sleep disorder with major impact on all aspects of daily functioning',
          'The health consequences of prolonged severe insomnia warrant urgent clinical attention',
        ],
        recommendations: [
          'Urgent clinical evaluation by a sleep medicine specialist or psychiatrist is recommended',
          'CBT-I remains first-line but may require face-to-face delivery at this severity',
          'Rule out organic causes (sleep apnoea, restless legs, thyroid dysfunction) via medical workup',
          'Short-term pharmacotherapy under medical supervision may be necessary',
        ],
        relatedDisorders: [
          { name: 'Severe Insomnia Disorder', description: 'Debilitating sleep disorder with multi-system health consequences.' },
          { name: 'Major Depressive Disorder', description: 'Severe insomnia is a major precipitant and symptom of depression.' },
          { name: 'Obstructive Sleep Apnoea', description: 'Consider polysomnography (sleep study) to rule out this common comorbidity.' },
          { name: 'Bipolar Disorder', description: 'Decreased need for sleep (not insomnia per se) can be an early marker of mania.' },
        ],
      },
    },
    relatedCodes: ['PHQ9', 'GAD7', 'DASS21'],
  },

  ASRS: {
    overview: 'The ASRS-v1.1 (Adult ADHD Self-Report Scale) was developed with the WHO to screen for adult ADHD. The 6-item screener identifies adults likely to have ADHD with sensitivity of 68.7% and specificity of 99.5%. It is a screening tool — not diagnostic — and must be followed by clinical evaluation.',
    measuresDomain: 'Attention and hyperactivity/impulsivity symptoms in daily life',
    bands: {
      'Below screening threshold': {
        explanation: 'A score below the ASRS screening threshold (0–13) suggests that ADHD symptoms are unlikely at a clinically significant level. Adult ADHD affects approximately 2.5–4% of the adult population.',
        whatThisMeans: [
          'ADHD is unlikely based on this screening',
          'Occasional attention difficulties are normal and not indicative of ADHD',
        ],
        recommendations: [
          'If concentration difficulties persist, consider environmental factors (stress, sleep deprivation, burnout)',
          'Rescreen if symptoms worsen or new concerns arise',
        ],
        relatedDisorders: [],
      },
      'Symptoms possible': {
        explanation: 'An ASRS score in the "symptoms possible" range (14–17) indicates that some ADHD symptoms are present above normal levels. At this level, formal evaluation is warranted to rule in or out ADHD and differentiate from other conditions that mimic ADHD (anxiety, depression, sleep deprivation).',
        whatThisMeans: [
          'ADHD symptoms are present at a level warranting further evaluation',
          'These symptoms may or may not represent true ADHD — differential diagnosis is important',
          'Functioning may be affected by attention or self-regulation difficulties',
        ],
        recommendations: [
          'Seek evaluation from a psychiatrist or psychologist experienced in adult ADHD',
          'A comprehensive evaluation includes clinical interview, rating scales, and neuropsychological testing',
          'In the interim, organisational strategies (time-blocking, externalising memory with lists/reminders) can help',
          'Address sleep quality and stress — both significantly impair attention and are often mistaken for ADHD',
        ],
        relatedDisorders: [
          { name: 'ADHD — Inattentive Presentation', description: 'Predominant difficulty with sustained attention, organisation, and follow-through without prominent hyperactivity.' },
          { name: 'Anxiety Disorders', description: 'Worry and hyperarousal can closely mimic ADHD-related inattention.' },
          { name: 'Depression', description: 'Poor concentration and psychomotor slowing in depression overlap with ADHD symptoms.' },
          { name: 'Learning Disabilities', description: 'Dyslexia and other specific learning disorders frequently co-occur with ADHD.' },
        ],
      },
      'Highly consistent with ADHD': {
        explanation: 'An ASRS score highly consistent with ADHD (18–24) has a very high specificity (>99%) for adult ADHD. This means a positive screen at this level is rarely a false positive. However, a full clinical evaluation remains essential for diagnosis and to identify comorbidities.',
        whatThisMeans: [
          'Your symptom profile is strongly consistent with adult ADHD',
          'Attention, impulse control, and/or hyperactivity symptoms are significantly impacting your daily life',
          'Formal clinical evaluation is strongly recommended',
        ],
        recommendations: [
          'Seek psychiatric or psychological evaluation — a comprehensive ADHD assessment is needed for diagnosis',
          'If diagnosed, evidence-based treatments include: stimulant medications (methylphenidate, amphetamines), non-stimulants (atomoxetine), and ADHD-focused CBT',
          'Workplace/academic accommodations may be available with a formal diagnosis',
          'Screen for common comorbidities: anxiety, depression, sleep disorders, and substance use',
        ],
        relatedDisorders: [
          { name: 'ADHD — Combined Presentation', description: 'Both inattentive and hyperactive-impulsive symptoms are prominent.' },
          { name: 'Oppositional Defiant Disorder / Conduct Issues', description: 'Emotional dysregulation and oppositional behaviour are common ADHD comorbidities in adults.' },
          { name: 'Substance Use Disorders', description: 'Undiagnosed ADHD significantly increases the risk of substance use as a form of self-medication.' },
          { name: 'Bipolar Disorder', description: 'Overlapping features (impulsivity, distractibility) require careful differential diagnosis.' },
          { name: 'Autism Spectrum Disorder', description: 'ASD and ADHD co-occur in approximately 50% of cases.' },
        ],
      },
    },
    relatedCodes: ['ISI', 'PHQ9', 'GAD7'],
  },

  AUDITC: {
    overview: 'The AUDIT-C (Alcohol Use Disorders Identification Test — Consumption) is a validated 3-item screen developed by the WHO. It detects hazardous and harmful alcohol use with sensitivity of 86% for identifying alcohol misuse in men and 73% in women.',
    measuresDomain: 'Alcohol consumption frequency and quantity',
    bands: {
      'Low risk': {
        explanation: 'An AUDIT-C score of 0–2 indicates low-risk alcohol use. Your drinking pattern does not currently appear to place you at elevated risk for alcohol-related harm.',
        whatThisMeans: [
          'Your alcohol use is within low-risk guidelines',
          'No evidence of hazardous or harmful drinking at this level',
        ],
        recommendations: [
          'Continue to stay within national low-risk guidelines (typically ≤14 standard drinks/week for men, ≤7 for women)',
          'Be mindful of situations that may lead to increased drinking (stress, social pressure)',
        ],
        relatedDisorders: [],
      },
      'Moderate risk (females) / Low risk (males)': {
        explanation: 'An AUDIT-C score of 3–4 signals moderate risk, particularly for women, whose lower average body water percentage results in higher blood alcohol concentrations per unit consumed. For men, this score still warrants awareness of drinking patterns.',
        whatThisMeans: [
          'Your drinking pattern may be approaching or exceeding recommended limits',
          'At-risk drinking can progress to alcohol use disorder over time without awareness',
        ],
        recommendations: [
          'Track your weekly units using a diary or app — awareness is a powerful behaviour change tool',
          'Brief motivational interviewing (MI) has strong evidence for reducing at-risk drinking',
          'Consider alcohol-free days each week',
          'Discuss your alcohol use with a GP if you are concerned',
        ],
        relatedDisorders: [
          { name: 'Alcohol Use Disorder — Mild', description: 'A problematic pattern of alcohol use causing clinically significant impairment or distress.' },
          { name: 'Anxiety Disorders', description: 'Alcohol is often used to self-medicate anxiety, creating a maintaining cycle.' },
        ],
      },
      'High risk': {
        explanation: 'An AUDIT-C score of 5–12 indicates hazardous or harmful alcohol use. At this level, the risk of developing Alcohol Use Disorder (AUD) is significantly elevated. Research shows that high-risk drinkers have a 4-fold increased risk of alcohol-related health complications.',
        whatThisMeans: [
          'Your drinking pattern is hazardous and poses significant health and social risks',
          'Physical dependence may have developed — abrupt cessation can be medically dangerous',
          'Alcohol at this level significantly worsens depression, anxiety, and sleep',
        ],
        recommendations: [
          'Seek medical evaluation before attempting to reduce or stop — alcohol withdrawal can be life-threatening',
          'Brief interventions by a GP reduce harmful drinking by 20–30%',
          'Consider referral to an addiction specialist or alcohol treatment programme',
          'Support groups (AA, SMART Recovery) are evidence-based adjuncts to treatment',
        ],
        relatedDisorders: [
          { name: 'Alcohol Use Disorder (AUD)', description: 'Characterised by impaired control over drinking, social impairment, risky use, and tolerance/withdrawal.' },
          { name: 'Liver Disease', description: 'Prolonged heavy alcohol use causes fatty liver, hepatitis, and cirrhosis.' },
          { name: 'Alcohol-Related Brain Damage', description: 'Including Wernicke-Korsakoff syndrome (thiamine deficiency related).' },
          { name: 'Major Depressive Disorder', description: 'Heavy alcohol use is both a risk factor for and consequence of depression.' },
          { name: 'Anxiety Disorders', description: 'Alcohol-induced anxiety during withdrawal perpetuates a drinking cycle.' },
        ],
      },
    },
    relatedCodes: ['DAST10', 'PHQ9', 'GAD7'],
  },

  DAST10: {
    overview: 'The DAST-10 (Drug Abuse Screening Test) is a validated 10-item instrument developed by Skinner (1982). It screens for drug use disorders (excluding alcohol and tobacco) with sensitivity of 79% and specificity of 77% for identifying a DSM-defined substance use disorder.',
    measuresDomain: 'Drug use consequences over the past 12 months',
    bands: {
      'No problems reported': {
        explanation: 'A DAST-10 score of 0 indicates no significant drug-related problems in the past year. Drug use, if any, does not appear to be causing harm.',
        whatThisMeans: ['No drug-related problems are indicated at this time'],
        recommendations: ['Rescreen if circumstances change or drug use begins or increases'],
        relatedDisorders: [],
      },
      'Low level': {
        explanation: 'A DAST-10 score of 1–2 indicates a low level of drug-related problems. Some use is occurring with minimal harm, but this warrants brief intervention to prevent escalation.',
        whatThisMeans: [
          'Drug use is present but currently causing minimal harm',
          'Early-stage intervention is the most effective time to address use',
        ],
        recommendations: [
          'Brief motivational intervention with a GP or counsellor is recommended',
          'Identify triggers and high-risk situations for drug use',
        ],
        relatedDisorders: [
          { name: 'Substance Use Disorder — Mild', description: 'Early-stage problematic drug use with limited but real consequences.' },
        ],
      },
      'Moderate level': {
        explanation: 'A DAST-10 score of 3–5 indicates a moderate level of drug-related problems. Clinical assessment and intervention are recommended. At this level, drug use is causing significant negative consequences.',
        whatThisMeans: [
          'Drug use is causing moderate harm to health, relationships, or functioning',
          'Professional assessment and structured intervention are needed',
        ],
        recommendations: [
          'Seek evaluation from an addiction medicine specialist or psychiatrist',
          'Motivational enhancement therapy (MET) and CBT are evidence-based treatments',
          'Address underlying mental health conditions that may be driving use (depression, trauma, ADHD)',
        ],
        relatedDisorders: [
          { name: 'Substance Use Disorder — Moderate', description: 'Problematic drug use with significant impairment in multiple domains.' },
          { name: 'ADHD', description: 'Undiagnosed ADHD is a significant risk factor for substance use disorders.' },
          { name: 'PTSD and Trauma', description: 'Substance use commonly co-occurs with trauma as a coping mechanism.' },
        ],
      },
      'Substantial level': {
        explanation: 'A DAST-10 score of 6–8 indicates substantial drug-related problems. This level is associated with a high probability of a DSM-defined Severe Substance Use Disorder. Intensive treatment is needed.',
        whatThisMeans: [
          'Drug use is causing substantial harm and may include physical dependence',
          'Abrupt cessation of some substances (opioids, benzodiazepines) can be medically dangerous',
          'Professional treatment is necessary',
        ],
        recommendations: [
          'Seek urgent evaluation by an addiction medicine specialist',
          'Medically supervised detoxification may be required',
          'Residential or intensive outpatient treatment should be considered',
          'Medication-assisted treatment (MAT) — e.g., buprenorphine for opioids — is evidence-based',
        ],
        relatedDisorders: [
          { name: 'Severe Substance Use Disorder', description: 'Significant drug dependence with broad impact on physical and mental health.' },
          { name: 'Hepatitis B/C, HIV', description: 'Associated risks for intravenous drug use — consider testing.' },
          { name: 'Major Depressive Disorder', description: 'High comorbidity; depression often underlies or results from heavy drug use.' },
          { name: 'PTSD', description: 'Trauma history is a major driver of severe substance use.' },
        ],
      },
      'Severe level': {
        explanation: 'A DAST-10 score of 9–10 indicates a severe level of drug-related problems, meeting criteria for severe Substance Use Disorder. This is a medical emergency level of concern requiring immediate professional intervention.',
        whatThisMeans: [
          'Drug use is severely impacting all areas of life',
          'High risk of medical complications from use or withdrawal',
          'Immediate professional help is essential',
        ],
        recommendations: [
          'Seek emergency medical care or addiction medicine services immediately',
          'Do not attempt to stop alone — withdrawal from some substances is life-threatening',
          'Long-term residential treatment or MAT programmes are likely needed',
        ],
        relatedDisorders: [
          { name: 'Severe Opioid / Stimulant / Sedative Use Disorder', description: 'Severe dependence requiring medically managed treatment.' },
          { name: 'Severe Mental Illness Comorbidity', description: 'Dual diagnosis (substance use + mental illness) requires integrated treatment.' },
          { name: 'Overdose Risk', description: 'Severe use disorder carries high mortality risk from overdose.' },
        ],
      },
    },
    relatedCodes: ['AUDITC', 'PHQ9', 'PCL5'],
  },

  MDQ: {
    overview: 'The MDQ (Mood Disorder Questionnaire) is a validated 13-item self-report screening tool for Bipolar Spectrum Disorders, developed by Hirschfeld et al. (2000). It has a sensitivity of 73% and specificity of 90% for detecting Bipolar I Disorder. It is a screening tool, not diagnostic.',
    measuresDomain: 'Manic and hypomanic symptom history',
    bands: {
      'Screen negative': {
        explanation: 'A negative MDQ screen (0–6 symptoms) makes a Bipolar Spectrum Disorder less likely. However, the MDQ is more sensitive for Bipolar I than Bipolar II, so a negative result does not completely rule out bipolar spectrum conditions.',
        whatThisMeans: [
          'A bipolar spectrum disorder is less likely based on this screen',
          'If you have concerns about mood cycling, discuss them with a clinician for a full evaluation',
        ],
        recommendations: [
          'If depressive episodes are present (see PHQ-9), note that depression is the predominant phase of bipolar disorder — a negative MDQ does not fully exclude Bipolar II',
          'Longitudinal mood charting can be helpful if mood cycles are suspected',
        ],
        relatedDisorders: [],
      },
      'Screen positive': {
        explanation: 'A positive MDQ screen (≥7 symptoms occurring simultaneously with moderate-severe functional impairment) has a 90% specificity for Bipolar I Disorder. A positive screen strongly warrants psychiatric evaluation. Misdiagnosing bipolar disorder as unipolar depression and prescribing antidepressants alone can trigger manic episodes.',
        whatThisMeans: [
          'Your responses suggest a possible Bipolar Spectrum Disorder',
          'A positive screen requires full psychiatric evaluation for accurate diagnosis',
          'This is a particularly important result if you have previously been treated for depression alone',
        ],
        recommendations: [
          'Seek psychiatric evaluation as soon as possible — bipolar disorder requires specialist management',
          'Do not start or continue antidepressants without a mood stabiliser until bipolar disorder is ruled out',
          'Mood stabilisers (lithium, valproate, lamotrigine) and atypical antipsychotics are first-line treatments',
          'Psychoeducation and structured routines are important non-pharmacological components',
        ],
        relatedDisorders: [
          { name: 'Bipolar I Disorder', description: 'Full manic episodes (≥7 days, requiring hospitalisation or with psychotic features) alternating with depressive episodes.' },
          { name: 'Bipolar II Disorder', description: 'Hypomanic episodes (less severe than full mania) alternating with major depressive episodes.' },
          { name: 'Cyclothymia', description: 'Chronic mood instability with numerous hypomanic and depressive periods not meeting full episode criteria.' },
          { name: 'Borderline Personality Disorder', description: 'Intense, rapidly shifting moods can mimic bipolar cycling — careful differential diagnosis is required.' },
          { name: 'ADHD', description: 'Impulsivity and distractibility overlap between ADHD and bipolar hypomania.' },
        ],
      },
    },
    relatedCodes: ['PHQ9', 'GAD7', 'DASS21'],
  },

  PCL5: {
    overview: 'The PCL-5 (PTSD Checklist for DSM-5) is a 20-item self-report measure assessing the full range of DSM-5 PTSD symptoms. It is widely used by the US Department of Veterans Affairs and has demonstrated sensitivity of 82% and specificity of 78% at a cutoff of ≥33 for PTSD diagnosis.',
    measuresDomain: 'PTSD symptoms following a traumatic event (past month)',
    bands: {
      'Below threshold': {
        explanation: 'A PCL-5 score below the diagnostic threshold (0–31) indicates that PTSD symptomatology is not at a clinically concerning level. Sub-threshold trauma reactions (acute stress responses) are common after stressful events and often resolve naturally.',
        whatThisMeans: [
          'PTSD is unlikely based on this screen',
          'Some trauma-related symptoms may be present but are below the clinical threshold',
        ],
        recommendations: [
          'Normal recovery from stress involves gradual symptom reduction over weeks — monitor if symptoms persist',
          'If a specific traumatic event occurred recently, consider psychological first aid principles: safety, calm, connectedness',
          'Rescreen if symptoms worsen or a new trauma occurs',
        ],
        relatedDisorders: [
          { name: 'Acute Stress Disorder', description: 'Trauma symptoms lasting 3 days–1 month following a traumatic event; often precedes PTSD.' },
        ],
      },
      'Probable PTSD': {
        explanation: 'A PCL-5 score ≥32 indicates probable PTSD, corresponding to the diagnostic threshold established in clinical validation studies. PTSD affects approximately 7–8% of the general population lifetime and is associated with significant comorbidity, disability, and reduced quality of life. Trauma-focused psychotherapy has among the strongest evidence bases in psychiatric treatment.',
        whatThisMeans: [
          'Your symptom profile is consistent with a PTSD diagnosis',
          'Intrusive memories, avoidance, negative mood/cognitions, and hyperarousal are likely impacting your daily life',
          'PTSD does not resolve on its own at this severity — evidence-based treatment is needed',
        ],
        recommendations: [
          'Seek evaluation from a trauma-specialist clinician (psychologist, psychiatrist)',
          'EMDR (Eye Movement Desensitisation and Reprocessing) has the strongest evidence for PTSD — recommended by WHO',
          'Trauma-focused CBT (TF-CBT), Prolonged Exposure (PE), and Cognitive Processing Therapy (CPT) are all first-line treatments',
          'SSRIs (sertraline, paroxetine) are first-line pharmacological options',
          'Avoid alcohol and substance use — commonly worsen PTSD symptom severity',
        ],
        relatedDisorders: [
          { name: 'PTSD', description: 'Post-traumatic stress characterised by re-experiencing, avoidance, negative alterations in cognition/mood, and hyperarousal lasting >1 month.' },
          { name: 'Complex PTSD (C-PTSD)', description: 'Results from prolonged/repeated trauma (childhood abuse, domestic violence). Includes difficulties with affect regulation, self-concept, and relationships beyond standard PTSD.' },
          { name: 'Major Depressive Disorder', description: 'Co-occurs in up to 50% of PTSD cases — assess with PHQ-9.' },
          { name: 'Generalised Anxiety Disorder', description: 'Hypervigilance in PTSD can be misattributed to GAD — trauma history is essential to assess.' },
          { name: 'Dissociative Disorders', description: 'Dissociation (depersonalisation, derealisation) is a common PTSD feature, particularly in Complex PTSD.' },
          { name: 'Substance Use Disorders', description: 'Self-medication with alcohol or drugs is common in PTSD and worsens long-term prognosis.' },
        ],
      },
    },
    relatedCodes: ['PHQ9', 'GAD7', 'DASS21', 'ISI', 'AUDITC'],
  },

  WHO5: {
    overview: 'The WHO-5 Well-Being Index is a short, validated questionnaire developed by the World Health Organization measuring current mental well-being over the past two weeks. It has been translated into over 30 languages and validated across diverse populations. A raw score of 0–25 is multiplied by 4 to yield a percentage (0–100). Scores below 50% indicate poor well-being and warrant further investigation for depression.',
    measuresDomain: 'Positive mental well-being over the past 2 weeks',
    bands: {
      'Likely Depression': {
        explanation: 'A WHO-5 score in this range (raw 0–7, percentage 0–28%) is strongly associated with clinical depression. Topp et al. (2015) found that scores below 50% identify major depression with a sensitivity of 93% when using the PHQ-9 as a criterion standard. This is not a diagnostic finding but a signal that more comprehensive evaluation is needed.',
        whatThisMeans: [
          'Your well-being is significantly below the expected population average',
          'Low WHO-5 scores are robustly correlated with depression across multiple cultures',
          'This score suggests you may benefit from a formal clinical evaluation',
        ],
        recommendations: [
          'Complete a PHQ-9 to assess depressive symptom severity more specifically',
          'Consult a GP, psychiatrist, or psychologist — this score range warrants clinical attention',
          'Prioritise basic self-care: sleep routine, movement, nutrition, and social contact',
          'Avoid self-isolating; reach out to trusted people in your life',
        ],
        relatedDisorders: [
          { name: 'Major Depressive Disorder', description: 'Characterised by persistent low mood, loss of interest, and functional impairment lasting at least 2 weeks.' },
          { name: 'Dysthymia (Persistent Depressive Disorder)', description: 'A chronic low-grade depression lasting 2+ years, often missed because individuals adapt to it.' },
          { name: 'Burnout', description: 'Prolonged work-related stress leading to exhaustion, detachment, and inefficacy — frequently associated with low WHO-5 scores.' },
        ],
      },
      'Low': {
        explanation: 'A score in the Low range (raw 8–12, percentage 32–48%) indicates diminished well-being that, while not definitively indicative of clinical depression, represents a meaningful decline from optimal functioning. Research shows that individuals in this range report reduced productivity, social withdrawal, and sleep difficulties.',
        whatThisMeans: [
          'Well-being is below average and may be affecting your daily life',
          'You may be experiencing fatigue, reduced enjoyment, or emotional flatness',
          'This level warrants monitoring and self-care adjustments',
        ],
        recommendations: [
          'Evaluate sources of chronic stress and consider what can be reduced or delegated',
          'Re-engage with activities that previously brought joy or meaning',
          'Consider brief psychological intervention (e.g. problem-solving therapy or CBT self-help)',
          'Rescreen in 4 weeks; consult a clinician if no improvement',
        ],
        relatedDisorders: [
          { name: 'Adjustment Disorder', description: 'Emotional distress in response to a specific stressor, resolving within 6 months of the stressor ending.' },
          { name: 'Generalised Anxiety Disorder', description: 'Pervasive, uncontrollable worry can co-occur with low well-being and is worth assessing separately.' },
        ],
      },
      'Moderate': {
        explanation: 'A Moderate score (raw 13–17, percentage 52–68%) reflects reasonable but not optimal well-being. Most functional domains are intact, but there may be subtle signs of stress or reduced vitality. Population studies show that the average well-being score in healthy adults typically falls in the upper half of this range.',
        whatThisMeans: [
          'Your well-being is roughly average for the general population',
          'You likely function well day-to-day with occasional challenges',
          'There is meaningful room for improvement in well-being',
        ],
        recommendations: [
          'Invest in wellbeing-enhancing habits: social connection, physical activity, and restorative sleep',
          'Practice gratitude or mindfulness — both have evidence for improving WHO-5 scores over time',
          'Rescreen every 6 months or following significant life changes',
        ],
        relatedDisorders: [],
      },
      'Good': {
        explanation: 'A Good well-being score (raw 18–25, percentage 72–100%) reflects flourishing mental health. High WHO-5 scores are associated with positive affect, strong social relationships, resilience to stress, and lower rates of physical illness. This is the expected target range for most adults.',
        whatThisMeans: [
          'Your mental well-being is in the healthy range',
          'You likely experience life satisfaction, energy, and positive emotions regularly',
          'Continue the habits and conditions supporting your current well-being',
        ],
        recommendations: [
          'Maintain and share the conditions that support your well-being with others',
          'Annual rescreening is sufficient unless major life changes occur',
        ],
        relatedDisorders: [],
      },
    },
    relatedCodes: ['PHQ9', 'WEMWBS', 'PSS10', 'RSES'],
  },

  K10: {
    overview: 'The Kessler Psychological Distress Scale (K-10) is a 10-item questionnaire developed by Ronald Kessler and colleagues at Harvard. It measures non-specific psychological distress — a mix of anxiety and depressive symptoms — over the past 30 days. The K-10 is used internationally for population screening and to triage individuals into mental health services. Each item is rated on a 1–5 frequency scale, giving a total range of 10–50.',
    measuresDomain: 'Non-specific psychological distress (anxiety and depression) over the past 30 days',
    bands: {
      'Low distress': {
        explanation: 'Scores of 10–15 indicate low psychological distress. The K-10 was normed on large Australian and US population samples; this range corresponds to the approximately 50th percentile of the general population and is not associated with diagnosable mental health conditions.',
        whatThisMeans: [
          'Your current level of psychological distress is within the normal range',
          'No clinically significant anxiety or depressive symptoms are indicated',
          'You are likely coping effectively with daily stressors',
        ],
        recommendations: [
          'Continue protective habits: adequate sleep, exercise, and social support',
          'Annual rescreening is appropriate',
        ],
        relatedDisorders: [],
      },
      'Moderate distress': {
        explanation: 'Scores of 16–21 suggest moderate psychological distress. In population research (Andrews & Slade, 2001), this range is associated with a higher likelihood of having a mental health condition but does not confirm diagnosis. Many individuals at this level have sub-threshold anxiety or depressive symptoms that respond well to low-intensity interventions.',
        whatThisMeans: [
          'You are experiencing a noticeable level of anxiety and/or depressive symptoms',
          'Your distress may be affecting your concentration, sleep, or relationships',
          'Evidence-based low-intensity interventions are well-suited to this level',
        ],
        recommendations: [
          'Complete a GAD-7 and PHQ-9 to characterise symptoms more specifically',
          'Guided self-help or structured online mental health programmes are effective at this level',
          'Consider speaking to a GP or psychologist for an initial assessment',
          'Ensure adequate sleep, reduce stimulants, and increase physical activity',
        ],
        relatedDisorders: [
          { name: 'Generalised Anxiety Disorder', description: 'Uncontrollable, pervasive worry with physical symptoms of tension and arousal.' },
          { name: 'Major Depressive Disorder', description: 'Persistent depressed mood, anhedonia, and associated symptoms lasting at least 2 weeks.' },
        ],
      },
      'High distress': {
        explanation: 'Scores of 22–29 indicate high psychological distress. Research across multiple countries shows that 30–50% of individuals in this range meet criteria for a diagnosable anxiety or depressive disorder. Clinical assessment is strongly recommended.',
        whatThisMeans: [
          'Your distress level is significantly above the general population average',
          'Functional impairment in work, relationships, or self-care is likely',
          'Professional assessment and support are recommended',
        ],
        recommendations: [
          'Schedule an appointment with a mental health professional promptly',
          'Discuss both psychological and pharmacological treatment options with your clinician',
          'Reach out to trusted friends or family; social support is a protective factor',
          'If you are in crisis or having thoughts of self-harm, contact emergency services or a crisis helpline',
        ],
        relatedDisorders: [
          { name: 'Major Depressive Disorder', description: 'May present with persistent sadness, loss of interest, sleep disturbance, and hopelessness.' },
          { name: 'Panic Disorder', description: 'Recurrent unexpected panic attacks with ongoing worry about future attacks.' },
          { name: 'Generalised Anxiety Disorder', description: 'Excessive worry across multiple domains with physical symptoms.' },
        ],
      },
      'Very high distress': {
        explanation: 'Scores of 30–50 indicate very high psychological distress. Population studies show that 70–80% of individuals in this range meet criteria for a diagnosable mental health condition, most commonly an anxiety disorder or major depression. Urgent mental health care is warranted.',
        whatThisMeans: [
          'This level of distress is severe and likely significantly impairing daily functioning',
          'There is a high probability of a clinically significant mental health condition',
          'Immediate professional support is strongly recommended',
        ],
        recommendations: [
          'Contact a mental health professional or your GP urgently',
          'If experiencing thoughts of suicide or self-harm, contact emergency services immediately',
          'Do not manage this alone — professional support is essential at this level',
        ],
        relatedDisorders: [
          { name: 'Major Depressive Disorder with Severe Features', description: 'Including possible psychotic features, suicidal ideation, or complete functional breakdown.' },
          { name: 'Anxiety Disorders', description: 'Panic disorder, GAD, social anxiety — often co-occurring with severe depression.' },
          { name: 'Burnout / Occupational Stress', description: 'Chronic workplace stress can produce very high K-10 scores even without a formal diagnosis.' },
        ],
      },
    },
    relatedCodes: ['PHQ9', 'GAD7', 'DASS21', 'WHO5', 'PSS10'],
  },

  OCIR: {
    overview: 'The Obsessive-Compulsive Inventory – Revised (OCI-R) is an 18-item self-report scale developed by Foa et al. (2002) to measure the distress associated with obsessive-compulsive symptoms. It assesses six symptom subtypes: washing, obsessing, hoarding, ordering, checking, and neutralising. A clinical cutoff of 21 has demonstrated good sensitivity and specificity for OCD in clinical and non-clinical populations.',
    measuresDomain: 'OCD symptoms across six subtypes: washing, obsessing, hoarding, ordering, checking, neutralising',
    bands: {
      'Below clinical threshold': {
        explanation: 'Scores below 21 are below the clinical cutoff for OCD established by Foa et al. (2002). While some repetitive thoughts or behaviours are universal, scores at this level do not indicate clinically significant OCD. The OCI-R has a specificity of approximately 90% at this cutoff, meaning very few people without OCD score above it.',
        whatThisMeans: [
          'Your obsessive-compulsive symptoms, if any, are within the normal range',
          'The checking, ordering, or repetitive behaviours you may engage in are not at a clinical level',
          'No further OCD-specific assessment is indicated based on this score alone',
        ],
        recommendations: [
          'If certain intrusive thoughts are distressing, brief mindfulness-based approaches can help',
          'Rescreen if symptoms increase or begin interfering with daily life',
        ],
        relatedDisorders: [],
      },
      'Mild OCD symptoms': {
        explanation: 'Scores of 21–40 suggest clinically significant OCD symptoms that exceed the established cutoff. At this level, intrusive thoughts or compulsive behaviours are likely causing some distress or functional interference. Research shows that early intervention significantly improves outcomes in OCD.',
        whatThisMeans: [
          'You are likely experiencing obsessive thoughts or compulsive behaviours that cause distress',
          'These symptoms may be time-consuming or interfering with daily activities',
          'A clinical evaluation is recommended to determine whether a formal OCD diagnosis is appropriate',
        ],
        recommendations: [
          'Consult a psychologist or psychiatrist experienced in OCD assessment',
          'Exposure and Response Prevention (ERP) is the gold-standard psychological treatment for OCD',
          'Avoid reassurance-seeking and compulsion-performing as these maintain the OCD cycle',
          'Consider SSRI medication in consultation with a psychiatrist — first-line pharmacotherapy for OCD',
        ],
        relatedDisorders: [
          { name: 'OCD', description: 'Characterised by recurrent intrusive thoughts (obsessions) and repetitive behaviours (compulsions) aimed at reducing distress.' },
          { name: 'Body Dysmorphic Disorder', description: 'Obsessive preoccupation with perceived physical flaws, related to OCD on the OC-spectrum.' },
          { name: 'Hoarding Disorder', description: 'Persistent difficulty discarding possessions, causing significant clutter and distress.' },
        ],
      },
      'Moderate OCD symptoms': {
        explanation: 'Scores of 41–60 reflect a moderate level of OCD symptom severity. At this level, obsessive thoughts and/or compulsive rituals are likely occupying a significant portion of daily time and causing meaningful distress. Clinical research indicates that individuals at this level typically show clear functional impairment.',
        whatThisMeans: [
          'OCD symptoms are moderately severe and significantly impacting daily functioning',
          'Rituals or avoidance may be consuming hours of your day',
          'Clinician-guided treatment is strongly recommended',
        ],
        recommendations: [
          'Seek specialist OCD treatment from a trained therapist (ERP-specialist)',
          'Discuss SSRI medication with a psychiatrist — medications like fluvoxamine, sertraline, or fluoxetine have strong evidence',
          'Involve family members in treatment where appropriate to avoid unintentional accommodation of compulsions',
        ],
        relatedDisorders: [
          { name: 'OCD', description: 'At moderate severity, compulsions typically occupy 1–3 hours daily and impair occupational and social functioning.' },
          { name: 'Generalised Anxiety Disorder', description: 'The worry in GAD can be difficult to distinguish from OCD obsessions — clinical interview is essential.' },
          { name: 'Tic Disorders', description: 'Co-occur in 10–40% of OCD cases, especially in childhood-onset OCD.' },
        ],
      },
      'Severe OCD symptoms': {
        explanation: 'Scores of 61–72 represent severe OCD symptom burden. At this level, obsessions and compulsions are likely dominating daily life. Severe OCD is associated with extreme functional impairment, social isolation, and reduced quality of life comparable to or exceeding that of other severe mental health conditions.',
        whatThisMeans: [
          'OCD symptoms at this level are causing severe functional impairment',
          'Daily rituals and avoidance may be nearly constant',
          'Intensive treatment — possibly including intensive outpatient or inpatient programmes — may be needed',
        ],
        recommendations: [
          'Seek urgent referral to an OCD specialist or specialist mental health service',
          'Intensive ERP (multiple sessions per week) combined with SSRI or clomipramine has the strongest evidence',
          'Consider whether environmental modifications are enabling compulsions and discuss with your clinician',
          'Deep Brain Stimulation (DBS) and other neuromodulation techniques are available for treatment-resistant severe OCD',
        ],
        relatedDisorders: [
          { name: 'Severe OCD', description: 'When compulsions occupy more than 3 hours/day and severely impair functioning, inpatient treatment may be indicated.' },
          { name: 'Major Depressive Disorder', description: 'Depression commonly co-occurs with severe OCD — the two conditions mutually worsen each other.' },
          { name: 'Excoriation / Trichotillomania', description: 'Skin-picking and hair-pulling are OC-spectrum disorders that may co-occur with OCD.' },
        ],
      },
    },
    relatedCodes: ['GAD7', 'PHQ9', 'IESR', 'DASS21'],
  },

  IESR: {
    overview: 'The Impact of Event Scale – Revised (IES-R) is a 22-item self-report measure of subjective distress caused by traumatic life events. Developed by Weiss and Marmar (1997), it covers three core dimensions of trauma response: Intrusion (re-experiencing), Avoidance, and Hyperarousal. It corresponds closely (though not perfectly) to the DSM PTSD criteria. Scores above 33 are often used as a screening threshold for probable PTSD.',
    measuresDomain: 'Post-traumatic stress symptoms in the past 7 days across intrusion, avoidance, and hyperarousal',
    bands: {
      'Subclinical': {
        explanation: 'Scores below 24 indicate subclinical levels of post-traumatic stress. It is normal to experience some distress following trauma, and low IES-R scores suggest that current symptoms are not reaching a clinically significant threshold. Recovery from trauma often involves initial distress that resolves over weeks to months.',
        whatThisMeans: [
          'You may have experienced a traumatic event but current symptoms are within a manageable range',
          'Your trauma response does not currently meet the threshold for probable PTSD',
          'Resiliency and natural recovery processes appear to be functioning well',
        ],
        recommendations: [
          'Continue to allow yourself to process the event at a comfortable pace',
          'Maintain social support — connection is a powerful protective factor after trauma',
          'Rescreen in 4 weeks if symptoms persist or worsen',
        ],
        relatedDisorders: [],
      },
      'Mild PTSD symptoms': {
        explanation: 'Scores of 24–32 suggest mild but clinically relevant post-traumatic stress symptoms. Research by Creamer et al. (2003) found that IES-R scores in this range correlate with subthreshold PTSD — symptoms that cause distress and functional interference but do not meet full diagnostic criteria.',
        whatThisMeans: [
          'You are experiencing some intrusive memories, avoidance, or heightened arousal related to a traumatic event',
          'These symptoms may be affecting your sleep, concentration, or daily activities',
          'Early intervention can prevent symptom escalation',
        ],
        recommendations: [
          'Consider trauma-focused therapy such as Trauma-Focused CBT or EMDR',
          'Avoid alcohol and substance use as coping — they worsen PTSD outcomes',
          'Ground yourself using sensory grounding techniques when triggered',
          'Speak with a trauma-informed clinician for a formal assessment',
        ],
        relatedDisorders: [
          { name: 'Acute Stress Disorder', description: 'PTSD-like symptoms lasting 3 days to 1 month after a traumatic event — can progress to PTSD if untreated.' },
          { name: 'Adjustment Disorder', description: 'Emotional disturbance following a stressor, milder than PTSD with less specific symptom requirements.' },
        ],
      },
      'Moderate PTSD symptoms': {
        explanation: 'Scores of 33–36 approach the clinical threshold for probable PTSD. Multiple validation studies have identified this range as the point at which the IES-R has acceptable sensitivity and specificity for diagnosing PTSD using the DSM-IV and DSM-5 criteria. Clinical assessment is strongly recommended.',
        whatThisMeans: [
          'Your symptoms are at a level consistent with probable PTSD — a formal clinical diagnosis is needed',
          'Intrusive memories, avoidance behaviours, or hyperarousal may be significantly affecting your daily life',
          'Evidence-based trauma-focused treatments are effective at this level',
        ],
        recommendations: [
          'Seek a formal PTSD assessment from a trauma-informed clinician',
          'EMDR (Eye Movement Desensitisation and Reprocessing) and CPT (Cognitive Processing Therapy) are first-line treatments',
          'Medication (SSRIs, SNRIs) can be helpful adjuncts to trauma-focused therapy',
          'Disclose your history to a trusted clinician — trauma processing requires a safe, therapeutic relationship',
        ],
        relatedDisorders: [
          { name: 'PTSD', description: 'Post-Traumatic Stress Disorder — characterised by re-experiencing, avoidance, negative cognitions, and hyperarousal persisting beyond 1 month.' },
          { name: 'Complex PTSD', description: 'Arising from prolonged or repeated trauma, including difficulties with emotion regulation, self-perception, and relationships.' },
          { name: 'Major Depressive Disorder', description: 'Co-occurs in up to 50% of PTSD cases and should be assessed in parallel.' },
        ],
      },
      'Severe PTSD symptoms': {
        explanation: 'Scores above 37 strongly suggest probable PTSD. Research by Neal et al. (1994) found that at this level, approximately 75–80% of individuals meet full DSM criteria for PTSD when formally assessed. This score range is associated with significant functional impairment across occupational, social, and relational domains.',
        whatThisMeans: [
          'Your post-traumatic stress symptoms are severe and likely meet criteria for PTSD',
          'Daily functioning, relationships, and quality of life are probably significantly impaired',
          'Urgent access to trauma-specialised mental health care is recommended',
        ],
        recommendations: [
          'Seek urgent referral to a trauma specialist or PTSD treatment programme',
          'First-line treatments: Prolonged Exposure (PE), EMDR, and CPT — all have strong randomised controlled trial evidence',
          'SSRIs (sertraline, paroxetine) are FDA-approved for PTSD — discuss with a psychiatrist',
          'Safety planning is important if you are experiencing suicidal ideation — PTSD significantly increases suicide risk',
          'Avoid trauma triggers where possible while undergoing treatment',
        ],
        relatedDisorders: [
          { name: 'PTSD', description: 'At severe levels, PTSD may include dissociative features, severe avoidance, and profound alterations in self-perception.' },
          { name: 'Complex PTSD', description: 'Characterised by emotional dysregulation, identity disturbance, and relational difficulties beyond standard PTSD.' },
          { name: 'Substance Use Disorders', description: 'Alcohol and drug misuse are common self-medication strategies in severe PTSD.' },
          { name: 'Major Depressive Disorder', description: 'Frequently co-occurring; may require separate treatment targeting depressive symptoms.' },
        ],
      },
    },
    relatedCodes: ['PCL5', 'PHQ9', 'GAD7', 'ISI', 'DASS21'],
  },

  PSS10: {
    overview: 'The Perceived Stress Scale (PSS-10) is the most widely used psychological instrument for measuring the perception of stress. Developed by Sheldon Cohen and colleagues (1983), it assesses the degree to which situations in one\'s life are perceived as unpredictable, uncontrollable, and overwhelming. Crucially, it measures perceived stress — not objective stressors — reflecting subjective appraisal of life demands versus coping resources.',
    measuresDomain: 'Perceived stress — sense of control, overload, and unpredictability over the past month',
    bands: {
      'Low stress': {
        explanation: 'PSS-10 scores of 0–13 fall in the low stress range. Cohen et al.\'s normative data indicate this range is typical of individuals reporting high coping efficacy and few overwhelming demands. Low PSS-10 scores are associated with better immune function, lower cortisol levels, and reduced cardiovascular risk.',
        whatThisMeans: [
          'You perceive your life as generally manageable and within your control',
          'Your stress appraisal is healthy and adaptive',
          'Your sense of coping resources exceeds current demands',
        ],
        recommendations: [
          'Maintain the habits supporting your coping capacity',
          'Build on social support networks — they buffer against future stress increases',
          'Annual rescreening is appropriate',
        ],
        relatedDisorders: [],
      },
      'Moderate stress': {
        explanation: 'PSS-10 scores of 14–26 represent moderate perceived stress — the most common range in general adult populations. While this level does not indicate clinical pathology, chronic moderate stress is a well-established risk factor for depression, anxiety disorders, cardiovascular disease, and immune system suppression (Cohen & Williamson, 1988).',
        whatThisMeans: [
          'You are experiencing a meaningful level of stress that is affecting your daily experience',
          'Your sense of control over important life domains may feel strained at times',
          'Without management, chronic moderate stress can escalate to clinical levels',
        ],
        recommendations: [
          'Identify and prioritise your top stressors — many respond to practical problem-solving',
          'Mindfulness-Based Stress Reduction (MBSR) has strong evidence for reducing PSS-10 scores',
          'Regular aerobic exercise is among the most effective stress reduction interventions',
          'Consider time management strategies and ensure adequate recovery time between demands',
        ],
        relatedDisorders: [
          { name: 'Burnout', description: 'Chronic workplace stress often presents with moderate to high PSS scores and should be distinguished from clinical depression.' },
          { name: 'Generalised Anxiety Disorder', description: 'Chronic uncontrollable worry shares features with high perceived stress — assess with GAD-7 if suspected.' },
        ],
      },
      'High stress': {
        explanation: 'PSS-10 scores of 27–40 indicate high perceived stress. Research consistently shows that individuals in this range have significantly elevated rates of depression (Cohen & Williamson, 1988), anxiety disorders, sleep disorders, and somatic complaints. High perceived stress is also a significant predictor of health-risk behaviours including substance misuse and smoking.',
        whatThisMeans: [
          'Your current stress level is significantly elevated and likely affecting multiple life domains',
          'Physical symptoms of stress (headaches, fatigue, sleep problems) may be present',
          'Professional support can help develop effective coping strategies',
        ],
        recommendations: [
          'Consult a psychologist or counsellor — CBT for stress management has strong evidence',
          'Evaluate whether workload, relationships, or environmental factors can be modified',
          'Screen for depression (PHQ-9) and anxiety (GAD-7) — they frequently co-occur with high PSS scores',
          'Consider mindfulness, relaxation training, or biofeedback if not already in use',
          'Reduce caffeine and alcohol — both exacerbate the stress response',
        ],
        relatedDisorders: [
          { name: 'Major Depressive Disorder', description: 'High perceived stress is both a risk factor for and consequence of depression.' },
          { name: 'Generalised Anxiety Disorder', description: 'The overlap between high perceived stress and GAD is substantial — clinical differentiation required.' },
          { name: 'Somatic Symptom Disorder', description: 'Physical symptoms amplified by high stress levels.' },
        ],
      },
    },
    relatedCodes: ['GAD7', 'PHQ9', 'DASS21', 'WHO5', 'WEMWBS'],
  },

  RSES: {
    overview: 'The Rosenberg Self-Esteem Scale (RSES) is one of the most widely used self-esteem measures globally. Developed by Morris Rosenberg (1965), it assesses global self-worth using 10 items reflecting both positive and negative feelings about the self. Scores range from 0–30. It has been validated in over 50 countries and across the lifespan, and is frequently used in clinical research to measure self-esteem as both an outcome and a risk factor.',
    measuresDomain: 'Global self-esteem — positive and negative feelings about oneself',
    bands: {
      'Low self-esteem': {
        explanation: 'Scores of 0–14 indicate low self-esteem. Research by Mann et al. (2004) and others has established that low self-esteem is a transdiagnostic risk factor for depression, anxiety, eating disorders, and social difficulties. Longitudinal studies show that low self-esteem in adolescence predicts poorer mental and physical health in adulthood.',
        whatThisMeans: [
          'You tend to have a predominantly negative view of your own worth and abilities',
          'Low self-esteem is associated with vulnerability to depression and anxiety',
          'Social situations may feel threatening or expose feelings of inadequacy',
        ],
        recommendations: [
          'Cognitive-behavioural therapy (CBT) targeting self-esteem has strong evidence — consider seeking a therapist',
          'Compassion-Focused Therapy (CFT) is particularly effective for shame-based low self-esteem',
          'Challenge self-critical thoughts: write down evidence for AND against negative self-beliefs',
          'Set and achieve small, realistic goals to build a track record of competence',
          'Screen for depression and social anxiety — they commonly co-occur with low self-esteem',
        ],
        relatedDisorders: [
          { name: 'Major Depressive Disorder', description: 'Negative self-evaluation is a core feature of depression and both causes and perpetuates it.' },
          { name: 'Social Anxiety Disorder', description: 'Fear of negative evaluation by others is closely tied to low self-esteem.' },
          { name: 'Eating Disorders', description: 'Body image and self-worth are deeply intertwined — EAT-26 assessment may be relevant.' },
          { name: 'Borderline Personality Disorder', description: 'Characterised by unstable self-image and identity disturbance alongside emotional dysregulation.' },
        ],
      },
      'Normal self-esteem': {
        explanation: 'Scores of 15–25 fall within the normal range for self-esteem. Most adults in general population studies score in this range. Normal self-esteem is associated with adaptive functioning, resilience to stress, and the ability to maintain positive relationships.',
        whatThisMeans: [
          'Your sense of self-worth is within the expected population range',
          'You likely have a reasonably balanced view of your strengths and weaknesses',
          'You possess enough self-esteem to navigate most challenges effectively',
        ],
        recommendations: [
          'Continue practices that support self-worth: maintaining meaningful relationships, competence-building, and acts of self-compassion',
          'Rescreening is not urgent unless specific concerns arise',
        ],
        relatedDisorders: [],
      },
      'High self-esteem': {
        explanation: 'Scores of 26–30 indicate high self-esteem. Generally, high self-esteem is associated with positive outcomes including life satisfaction, resilience, and psychological well-being. However, research by Baumeister et al. (2005) highlights that very high self-esteem requires distinguishing between secure/stable self-esteem (healthy) and fragile/contingent self-esteem, which can be associated with narcissistic traits or defensive responding.',
        whatThisMeans: [
          'You have a strongly positive view of your own worth and capabilities',
          'High self-esteem is generally protective against depression and anxiety',
          'This is typically a healthy finding',
        ],
        recommendations: [
          'Ensure your positive self-regard is balanced with empathy and openness to feedback from others',
          'Rescreening is not indicated',
        ],
        relatedDisorders: [],
      },
    },
    relatedCodes: ['PHQ9', 'GAD7', 'LSAS', 'EAT26', 'WEMWBS'],
  },

  GDS15: {
    overview: 'The Geriatric Depression Scale – Short Form (GDS-15) was developed by Sheikh and Yesavage (1986) as a screening tool for depression specifically in older adults. Unlike many depression scales, it uses a simple Yes/No format and avoids somatic items that may be confounded by physical illness common in elderly populations. It is validated for use in adults aged 65 and above and is widely used in geriatric care settings.',
    measuresDomain: 'Depressive symptoms in older adults, with focus on cognitive and affective symptoms rather than somatic',
    bands: {
      'Normal': {
        explanation: 'Scores of 0–4 are within the normal range for the GDS-15. Sheikh and Yesavage\'s validation study found that non-depressed elderly individuals typically score in this range. The absence of significant depressive symptoms is associated with better functional independence, social engagement, and quality of life in older adults.',
        whatThisMeans: [
          'No clinically significant depressive symptoms are indicated',
          'Your emotional well-being appears to be within the expected range for an older adult',
          'Continue monitoring annually or after significant life changes',
        ],
        recommendations: [
          'Maintain physical activity — it is one of the strongest protective factors against late-life depression',
          'Social engagement and purpose-driven activities are key for well-being in older age',
          'Annual rescreening recommended as part of routine health check',
        ],
        relatedDisorders: [],
      },
      'Mild depression': {
        explanation: 'Scores of 5–8 suggest mild depression in older adults. Research shows that even mild depression in the elderly is associated with increased functional decline, more frequent healthcare visits, and reduced quality of life. Late-life depression is under-recognised and under-treated — many older adults do not identify or report depressive symptoms.',
        whatThisMeans: [
          'Some depressive symptoms are present that warrant attention',
          'You may be experiencing reduced enjoyment, mild withdrawal, or subtle memory concerns related to mood',
          'A fuller clinical evaluation is recommended',
        ],
        recommendations: [
          'Discuss these findings with your GP or geriatric care provider',
          'Low-intensity interventions (structured activity, social engagement, problem-solving therapy) are effective at this level',
          'Rule out underlying medical conditions (thyroid disorder, vitamin deficiencies) that can cause depressive symptoms in older adults',
          'Review medications — many commonly prescribed drugs in older adults can cause or worsen depression',
        ],
        relatedDisorders: [
          { name: 'Late-Life Depression', description: 'Depression in older adults often presents atypically — with somatic complaints, irritability, or cognitive symptoms rather than classic sadness.' },
          { name: 'Adjustment Disorder', description: 'Common after significant life changes (bereavement, retirement, illness) in older adulthood.' },
        ],
      },
      'Moderate depression': {
        explanation: 'Scores of 9–11 indicate moderate depression. At this level, the GDS-15 has a sensitivity of approximately 84% and specificity of 95% for major depression in the elderly (Sheikh & Yesavage, 1986). Moderate late-life depression is associated with cognitive decline acceleration, increased medical comorbidity, and elevated suicide risk in older males.',
        whatThisMeans: [
          'Depressive symptoms are at a clinically significant level requiring intervention',
          'Functioning in daily activities, social connection, and physical health may be impaired',
          'Professional mental health evaluation and treatment are recommended',
        ],
        recommendations: [
          'Seek assessment from a geriatric psychiatrist or geriatrician with mental health expertise',
          'Both psychotherapy (CBT, problem-solving therapy) and antidepressants (particularly SSRIs) are effective in late-life depression',
          'Ensure adequate physical activity and social support structures are in place',
          'Monitor for suicidal ideation — older males are at the highest demographic risk for suicide',
        ],
        relatedDisorders: [
          { name: 'Major Depressive Disorder', description: 'Full diagnostic assessment required — late-life onset depression has distinct treatment considerations.' },
          { name: 'Mild Cognitive Impairment (MCI)', description: 'Depression in older adults can mimic or exacerbate cognitive decline — neuropsychological testing may be warranted.' },
          { name: 'Bereavement Disorder', description: 'Prolonged grief reactions can present with GDS-15 scores in this range.' },
        ],
      },
      'Severe depression': {
        explanation: 'Scores of 12–15 indicate severe depression in older adults. This level is associated with the highest rates of functional impairment, medical complications, and suicide risk in the elderly population. Urgent mental health intervention is indicated.',
        whatThisMeans: [
          'Severe depressive symptoms are present that require urgent attention',
          'Risk of self-harm or suicide should be assessed immediately by a clinician',
          'Independent functioning and quality of life are likely significantly compromised',
        ],
        recommendations: [
          'Seek urgent referral to geriatric psychiatric services',
          'If there is any concern about suicide risk, contact emergency services or go to the nearest emergency department',
          'Combination treatment (medication + psychotherapy) is most effective at this level',
          'Involve family or caregivers in safety planning with clinical guidance',
        ],
        relatedDisorders: [
          { name: 'Major Depressive Disorder with Psychotic Features', description: 'More common in older adults — may present with nihilistic or somatic delusions.' },
          { name: 'Vascular Depression', description: 'Late-life depression often has a vascular component — brain MRI can reveal underlying white matter changes.' },
          { name: 'Dementia with Behavioural Symptoms', description: 'Depression is the most common neuropsychiatric symptom of early dementia — careful differentiation is required.' },
        ],
      },
    },
    relatedCodes: ['PHQ9', 'WHO5', 'ISI', 'PHQ15'],
  },

  ESS: {
    overview: 'The Epworth Sleepiness Scale (ESS) was developed by Dr Murray Johns in 1991 at the Epworth Hospital in Melbourne, Australia. It measures daytime sleepiness — the tendency to fall asleep in common daily situations — as an indicator of overall sleep adequacy. A score above 10 indicates excessive daytime sleepiness (EDS) warranting investigation. The ESS is widely used in sleep medicine to screen for disorders such as obstructive sleep apnoea, narcolepsy, and idiopathic hypersomnia.',
    measuresDomain: 'Daytime sleepiness and sleep adequacy across 8 common situations',
    bands: {
      'Normal daytime sleepiness': {
        explanation: 'Scores of 0–10 fall within the normal range for daytime sleepiness. Johns\' original normative data from healthy adults showed a mean ESS score of 5.9 (±2.2). Scores in this range indicate that your sleep is generally providing adequate restoration without excessive daytime drowsiness.',
        whatThisMeans: [
          'Your daytime alertness is within the normal range',
          'Your sleep appears to be sufficiently restorative for daily functioning',
          'No sleep disorder is suggested by this score alone',
        ],
        recommendations: [
          'Maintain consistent sleep and wake times — circadian regularity is the foundation of good sleep',
          'Aim for 7–9 hours of sleep per night (adult recommendation)',
          'Annual rescreening is not typically needed unless symptoms emerge',
        ],
        relatedDisorders: [],
      },
      'Excessive daytime sleepiness': {
        explanation: 'Scores of 11–16 indicate excessive daytime sleepiness (EDS). This level has high clinical significance. Research by Johns (1994) and subsequent studies show that EDS at this level is associated with impaired driving, reduced workplace performance, and decreased quality of life. Obstructive Sleep Apnoea (OSA) is the most common cause of EDS in adults.',
        whatThisMeans: [
          'Your daytime sleepiness exceeds the normal population range',
          'You may be struggling to stay awake in situations requiring sustained attention (driving, work)',
          'An underlying sleep disorder — most commonly obstructive sleep apnoea — may be present',
        ],
        recommendations: [
          'Consult a GP or sleep medicine specialist for evaluation',
          'A polysomnography (overnight sleep study) or home sleep apnoea test may be recommended',
          'Until evaluated, avoid driving or operating machinery if falling asleep is a risk',
          'Review sleep hygiene: consistent bedtime, dark/cool/quiet room, avoid screens 1 hour before bed',
          'Assess for medication side effects and alcohol use — both cause daytime sedation',
        ],
        relatedDisorders: [
          { name: 'Obstructive Sleep Apnoea (OSA)', description: 'Repeated airway collapse during sleep, causing oxygen desaturation and sleep fragmentation — the leading cause of ESS elevation.' },
          { name: 'Narcolepsy', description: 'A neurological disorder causing uncontrollable episodes of sleep, cataplexy, and REM intrusion into wakefulness.' },
          { name: 'Depression', description: 'Hypersomnia and daytime fatigue are common in atypical depression and bipolar disorder depression.' },
        ],
      },
      'Severe excessive sleepiness': {
        explanation: 'Scores of 17–24 indicate severe excessive daytime sleepiness. At this level, falling asleep in active situations (talking, eating, while stopped in traffic) is likely occurring. Research links severe EDS to a 4.5-fold increased risk of motor vehicle accidents, significant occupational impairment, and substantially reduced quality of life.',
        whatThisMeans: [
          'Your daytime sleepiness is severely excessive and may be dangerous in certain situations',
          'You are likely experiencing significant difficulty staying awake throughout the day',
          'Urgent medical evaluation for an underlying sleep disorder is needed',
        ],
        recommendations: [
          'Do not drive or operate heavy machinery until evaluated and cleared by a clinician',
          'Seek urgent sleep medicine referral — severe EDS requires prompt investigation',
          'Obstructive sleep apnoea, narcolepsy, or idiopathic hypersomnia should be formally ruled in or out',
          'If prescribed stimulants for a medical condition, review with your doctor — stimulant medications may help narcolepsy or hypersomnia under clinical supervision',
        ],
        relatedDisorders: [
          { name: 'Obstructive Sleep Apnoea', description: 'Severe ESS scores are strongly predictive of moderate-to-severe OSA in the absence of other explanation.' },
          { name: 'Narcolepsy Type 1', description: 'Hypocretin deficiency causing uncontrollable sleep attacks, cataplexy, and severe EDS (often ESS > 16).' },
          { name: 'Idiopathic Hypersomnia', description: 'Excessive daytime sleepiness without other identifiable cause — characterised by long, non-refreshing sleep.' },
          { name: 'Bipolar Disorder (Depressive Phase)', description: 'Hypersomnia can be pronounced in bipolar depression and may elevate ESS scores.' },
        ],
      },
    },
    relatedCodes: ['ISI', 'PHQ9', 'DASS21', 'PHQ15'],
  },

  EAT26: {
    overview: 'The Eating Attitudes Test (EAT-26) is one of the most widely used standardised measures of symptoms and concerns characteristic of eating disorders. Developed by Garner et al. (1982), the 26-item version assesses dieting behaviours, preoccupation with food and body weight, and bulimic behaviours. A score of 20 or above is considered clinically significant and warrants further evaluation by a healthcare provider.',
    measuresDomain: 'Eating disorder symptoms: dieting attitudes, food preoccupation, and bulimic behaviours',
    bands: {
      'Normal eating attitudes': {
        explanation: 'Scores below 20 are below the clinical cutoff for eating disorder concerns. Most individuals without an eating disorder score in this range. While some concern about eating or weight is universal, scores at this level do not suggest clinically problematic attitudes.',
        whatThisMeans: [
          'Your eating attitudes and behaviours are within the normal range',
          'No clinically significant eating disorder concerns are indicated by this score',
          'Some preoccupation with food or body image is normal and not pathological at this level',
        ],
        recommendations: [
          'Maintain a balanced, flexible approach to eating and body image',
          'Rescreen if concerns about eating attitudes emerge or increase',
        ],
        relatedDisorders: [],
      },
      'Abnormal eating attitudes': {
        explanation: 'Scores of 20 and above on the EAT-26 exceed the clinical cutoff established by Garner et al. (1982). Research shows that at this threshold, the EAT-26 identifies individuals with clinically significant eating concerns with good sensitivity. This does not diagnose an eating disorder but indicates that further clinical evaluation is warranted. Eating disorders are serious mental health conditions with the highest mortality rate of any psychiatric illness.',
        whatThisMeans: [
          'Your eating attitudes or behaviours may be at a clinically problematic level',
          'Concerns about weight, food restriction, or purging behaviours may be significantly affecting your life',
          'A comprehensive evaluation by an eating disorder specialist is strongly recommended',
        ],
        recommendations: [
          'Consult a GP or eating disorder specialist as soon as possible — early treatment significantly improves prognosis',
          'Cognitive-Behavioural Therapy for Eating Disorders (CBT-E) is the gold-standard psychological treatment',
          'Nutritional rehabilitation with a dietitian experienced in eating disorders is an essential component of treatment',
          'For severe restriction, medical monitoring may be needed to address physical complications',
          'Avoid social comparison, diet culture messaging, and "clean eating" content that can reinforce harmful beliefs',
        ],
        relatedDisorders: [
          { name: 'Anorexia Nervosa', description: 'Characterised by severe food restriction, intense fear of weight gain, and distorted body image — highest mortality of any psychiatric disorder.' },
          { name: 'Bulimia Nervosa', description: 'Cycles of binge eating followed by compensatory behaviours (purging, restriction, excessive exercise).' },
          { name: 'Binge Eating Disorder', description: 'Recurrent binge eating episodes without compensatory behaviours, associated with guilt and distress.' },
          { name: 'Avoidant/Restrictive Food Intake Disorder (ARFID)', description: 'Food avoidance based on sensory characteristics or fear of aversive consequences, not weight/shape concerns.' },
          { name: 'Major Depressive Disorder', description: 'Depression commonly co-occurs with eating disorders and requires parallel treatment.' },
        ],
      },
    },
    relatedCodes: ['PHQ9', 'RSES', 'DASS21', 'GAD7'],
  },

  CAGE: {
    overview: 'The CAGE Questionnaire is a 4-item screening tool for alcohol misuse and dependence, developed by John Ewing at the University of North Carolina in 1968. Its name is an acronym of its four questions: Cut down, Annoyed, Guilty, Eye-opener. Despite its brevity, it has been validated in numerous clinical settings and is widely used as an initial alcohol screening tool in primary care.',
    measuresDomain: 'Alcohol misuse and dependence using four behavioural indicators',
    bands: {
      'Low risk': {
        explanation: 'Scores of 0–1 on the CAGE indicate low risk for an alcohol use disorder. Most individuals without problematic drinking score 0. A single positive response may indicate some alcohol-related concern but does not suggest a diagnosable disorder.',
        whatThisMeans: [
          'Your responses do not indicate a significant alcohol use problem at this time',
          'If you answered one question positively, it may be worth reflecting on your drinking patterns',
          'Standard guidelines recommend no more than 14 units per week for adults (UK) or 14 drinks/week for men, 7 for women (US)',
        ],
        recommendations: [
          'Stay within recommended alcohol limits',
          'Rescreen if your drinking patterns change significantly',
        ],
        relatedDisorders: [],
      },
      'Likely alcohol use disorder': {
        explanation: 'A CAGE score of 2 or above has a sensitivity of approximately 74% and specificity of 91% for alcohol use disorder (Ewing, 1984; Mayfield et al., 1974). Two or more positive responses strongly suggest that alcohol use has become problematic and warrants further assessment using a more comprehensive tool such as the AUDIT and clinical interview.',
        whatThisMeans: [
          'Your responses suggest a pattern of alcohol use that may have become problematic',
          'Concerns about cutting down, feeling guilty, or morning drinking are significant indicators',
          'A formal clinical assessment for Alcohol Use Disorder (AUD) is recommended',
        ],
        recommendations: [
          'Speak honestly with your GP or an addiction specialist about your alcohol use',
          'Complete the AUDIT-C for a more detailed alcohol use assessment',
          'Abrupt cessation of heavy alcohol use can be medically dangerous — consult a clinician before stopping',
          'Evidence-based treatments include brief interventions, CBT, motivational interviewing, and medication (naltrexone, acamprosate)',
          'Alcohol support groups (AA, SMART Recovery) provide community-based support',
        ],
        relatedDisorders: [
          { name: 'Alcohol Use Disorder', description: 'A pattern of problematic alcohol use including tolerance, withdrawal, craving, and functional impairment.' },
          { name: 'Major Depressive Disorder', description: 'Alcohol misuse and depression have a bidirectional relationship — each worsens the other.' },
          { name: 'Anxiety Disorders', description: 'Alcohol is commonly used to self-medicate anxiety, but creates a rebound anxiety cycle that worsens long-term.' },
          { name: 'Liver Disease / Pancreatitis', description: 'Physical consequences of chronic heavy drinking requiring medical monitoring.' },
        ],
      },
    },
    relatedCodes: ['AUDITC', 'DAST10', 'PHQ9', 'GAD7'],
  },

  ACE: {
    overview: 'The Adverse Childhood Experiences (ACE) Questionnaire is based on the landmark Kaiser Permanente ACE Study (Felitti et al., 1998), which followed over 17,000 adults and found strong dose-response relationships between childhood adversity and adult physical and mental health outcomes. ACE scores are not diagnostic — they quantify cumulative exposure to adversity and associated health risk. The 10 ACE categories include abuse (physical, emotional, sexual), neglect (physical, emotional), and household dysfunction.',
    measuresDomain: 'Cumulative exposure to adverse childhood experiences across abuse, neglect, and household dysfunction categories',
    bands: {
      'Low ACE score': {
        explanation: 'ACE scores of 0–1 indicate low cumulative exposure to adverse childhood experiences. While a score of 0 does not guarantee a trauma-free childhood, it suggests that the major categories of ACE were not experienced. The original Kaiser study found that those with ACE scores of 0 had the lowest rates of adult health problems.',
        whatThisMeans: [
          'Your childhood was relatively free from the types of adversity measured by the ACE questionnaire',
          'Your risk for ACE-related health outcomes is lower relative to higher scores',
          'Protective childhood factors (stable home, supportive relationships) appear to have been present',
        ],
        recommendations: [
          'Understanding ACEs can still be valuable for understanding population health and advocating for at-risk children',
          'No specific intervention is indicated based on this score',
        ],
        relatedDisorders: [],
      },
      'Moderate ACE score': {
        explanation: 'ACE scores of 2–3 indicate moderate exposure to childhood adversity. The ACE study found that individuals with scores in this range have meaningfully elevated rates of depression, anxiety, substance use disorders, and certain physical health conditions compared to those with no ACEs. However, many individuals with this score level live healthy, functional lives — resilience factors (supportive relationships, secure attachment with at least one caregiver) play a significant moderating role.',
        whatThisMeans: [
          'You experienced several types of adversity in childhood that may have lasting effects',
          'The impact of ACEs varies widely based on resilience factors, social support, and subsequent life experiences',
          'Understanding this history may help explain patterns you observe in yourself — emotional regulation, relationships, stress responses',
        ],
        recommendations: [
          'Trauma-informed therapy (TF-CBT, EMDR, somatic approaches) can be highly effective for processing childhood adversity',
          'The effects of ACEs are not deterministic — positive adult experiences and relationships can buffer their impact',
          'If you are experiencing anxiety, depression, or substance use concerns, consider whether unresolved childhood adversity may be a contributing factor',
        ],
        relatedDisorders: [
          { name: 'Complex PTSD', description: 'Prolonged childhood trauma often underlies Complex PTSD — including difficulties with emotion regulation and self-concept.' },
          { name: 'Major Depressive Disorder', description: 'ACEs are one of the strongest known childhood predictors of adult depression.' },
          { name: 'Attachment Difficulties', description: 'Early adversity disrupts attachment formation and may affect relationship patterns across the lifespan.' },
        ],
      },
      'High ACE score': {
        explanation: 'ACE scores of 4 and above are associated with dramatically elevated health risks. The original ACE study found that individuals with 4+ ACEs had a 2-fold increase in heart disease, a 3.5-fold increase in depression risk, and a 12-fold increase in suicide attempts compared to those with no ACEs. Crucially, these risks are not inevitable — they represent population-level probabilities, and many individuals with high ACE scores thrive with appropriate support.',
        whatThisMeans: [
          'Your childhood involved significant cumulative adversity across multiple domains',
          'The health implications of high ACE scores are real and well-documented — but modifiable',
          'Understanding your ACE history is an important first step in trauma-informed self-care',
        ],
        recommendations: [
          'Seek support from a trauma-informed mental health professional — the type and duration of trauma you experienced warrants specialist care',
          'EMDR, Trauma-Focused CBT, Somatic Experiencing, and Narrative Therapy all have evidence for high-ACE populations',
          'Focus on building safety, predictability, and trusting relationships — these are the foundational conditions for healing',
          'Physical health monitoring is important — ACEs increase risk for cardiovascular disease, autoimmune conditions, and cancer',
          'If you are a parent, it is worth noting that ACEs can be interrupted — supportive parenting can significantly reduce the risk of intergenerational transmission',
        ],
        relatedDisorders: [
          { name: 'Complex PTSD / Developmental Trauma', description: 'The most common outcome of high ACE exposure — affecting identity, relationships, emotion regulation, and sense of safety.' },
          { name: 'Substance Use Disorders', description: 'Often a coping mechanism for unprocessed trauma — substance use is 7 times more common in individuals with 5+ ACEs.' },
          { name: 'Borderline Personality Disorder', description: 'Strong association with childhood abuse and neglect — may be reconceptualised as complex trauma response.' },
          { name: 'Physical Health Conditions', description: 'Cardiovascular disease, autoimmune conditions, chronic pain — ACEs alter biological stress systems (HPA axis) with lifelong effects.' },
        ],
      },
    },
    relatedCodes: ['PCL5', 'IESR', 'PHQ9', 'AUDITC', 'DAST10'],
  },

  PSS4: {
    overview: 'The PSS-4 is a 4-item abbreviated version of the Perceived Stress Scale developed by Cohen and Williamson (1988). It provides a rapid measure of perceived stress suitable for situations where time is limited. While less reliable than the 10-item version, it correlates strongly with the PSS-10 (r ≈ 0.85) and is appropriate for quick triage and population-level screening. Items assess perceived control and overload over the past month.',
    measuresDomain: 'Brief measure of perceived stress — sense of control and feeling overwhelmed in the past month',
    bands: {
      'Low stress': {
        explanation: 'PSS-4 scores of 0–4 indicate low perceived stress. This level reflects a sense of personal control and manageability over current life circumstances. Research by Cohen and Williamson (1988) found that low PSS-4 scores are associated with better immune function, lower rates of depression, and positive health behaviours.',
        whatThisMeans: [
          'You perceive your current life demands as manageable',
          'Your sense of control over important areas of your life is intact',
          'No significant psychological stress is indicated',
        ],
        recommendations: [
          'Continue the lifestyle habits that are supporting your resilience',
          'Rescreening in 6–12 months is appropriate',
        ],
        relatedDisorders: [],
      },
      'Moderate stress': {
        explanation: 'PSS-4 scores of 5–9 reflect moderate perceived stress. This level corresponds to the most common range in general adult populations, particularly during periods of work or life pressure. Moderate stress at this level may have functional costs but typically does not indicate clinical pathology.',
        whatThisMeans: [
          'You are experiencing a noticeable level of stress in your daily life',
          'Your sense of control over life demands may feel strained at times',
          'Proactive stress management can prevent escalation',
        ],
        recommendations: [
          'Identify primary stressors and apply problem-solving strategies where possible',
          'Regular physical activity is among the most effective brief stress reduction strategies',
          'Mindfulness practices have evidence for reducing perceived stress over 8 weeks',
        ],
        relatedDisorders: [
          { name: 'Burnout', description: 'Chronic moderate stress without adequate recovery is the primary pathway to occupational burnout.' },
          { name: 'Generalised Anxiety Disorder', description: 'If stress feels uncontrollable and pervasive, consider completing the GAD-7.' },
        ],
      },
      'High stress': {
        explanation: 'PSS-4 scores of 10–16 indicate high perceived stress. Research consistently shows that individuals in this range have significantly elevated rates of depression, anxiety, and somatic symptoms. High PSS-4 scores predict future mental health deterioration if not addressed.',
        whatThisMeans: [
          'Your perceived stress is significantly elevated and likely affecting your daily functioning',
          'Physical symptoms of stress — headaches, sleep problems, fatigue — may be present',
          'Professional support can be valuable at this level',
        ],
        recommendations: [
          'Consider completing the PSS-10 for a more detailed stress profile',
          'Screen for depression and anxiety — PHQ-9 and GAD-7 are appropriate',
          'Consult a psychologist or counsellor — CBT-based stress management has strong evidence',
          'Evaluate whether significant life stressors (work, relationships, finances) can be modified',
        ],
        relatedDisorders: [
          { name: 'Major Depressive Disorder', description: 'High perceived stress is both a risk factor and early warning sign of depression.' },
          { name: 'Generalised Anxiety Disorder', description: 'Chronic high stress and GAD share many features — clinical differentiation is needed.' },
        ],
      },
    },
    relatedCodes: ['PSS10', 'GAD7', 'PHQ9', 'WHO5'],
  },

  PHQ15: {
    overview: 'The Patient Health Questionnaire-15 (PHQ-15) is a 15-item scale developed by Kroenke, Spitzer, and Williams (2002) as part of the PHQ suite. It assesses somatic symptom severity — physical complaints that may have a psychological or medically unexplained component. The PHQ-15 does not diagnose somatic symptom disorder, but higher scores predict healthcare utilisation, disability, and co-occurring mental health conditions including depression and anxiety.',
    measuresDomain: 'Somatic symptom severity: physical symptoms that may be related to psychological distress',
    bands: {
      'Minimal': {
        explanation: 'PHQ-15 scores of 0–4 indicate minimal somatic symptom burden. This level is consistent with the absence of clinically significant unexplained physical symptoms. Most individuals without a somatic symptom disorder or significant medical comorbidity score in this range.',
        whatThisMeans: [
          'Your physical symptom burden is within the normal range',
          'No clinically significant somatic symptoms are indicated',
          'Physical complaints, if any, are minor and not disrupting daily functioning',
        ],
        recommendations: [
          'Continue regular physical health monitoring',
          'Rescreen if new or worsening physical symptoms emerge',
        ],
        relatedDisorders: [],
      },
      'Low': {
        explanation: 'PHQ-15 scores of 5–9 indicate a low but clinically relevant level of somatic symptoms. Research by Kroenke et al. (2002) found that scores in this range are associated with increased healthcare visits, mild functional impairment, and somewhat elevated rates of co-occurring depression and anxiety.',
        whatThisMeans: [
          'Some physical symptoms are present that may be stress-related or have a psychological component',
          'These symptoms may be contributing to healthcare visits or mild daily disruption',
          'Both physical and psychological evaluation may be beneficial',
        ],
        recommendations: [
          'Discuss these symptoms with your GP to rule out underlying medical causes',
          'Assess whether stress or psychological factors may be amplifying physical symptoms',
          'Regular exercise and adequate sleep can reduce functional somatic symptoms',
        ],
        relatedDisorders: [
          { name: 'Somatic Symptom Disorder', description: 'Characterised by disproportionate thoughts, feelings, and behaviours related to somatic symptoms.' },
          { name: 'Major Depressive Disorder', description: 'Somatic symptoms are common in depression, particularly fatigue, sleep disturbance, and pain.' },
        ],
      },
      'Medium': {
        explanation: 'PHQ-15 scores of 10–14 indicate medium somatic symptom severity. At this level, the PHQ-15 is associated with significant functional impairment (comparable to chronic medical conditions), frequent healthcare visits, and substantially elevated rates of diagnosable depression and anxiety disorders.',
        whatThisMeans: [
          'You are experiencing multiple bothersome physical symptoms that are affecting your daily life',
          'There is a significant likelihood that psychological factors are contributing to your symptom experience',
          'Integrated medical and psychological care is likely to be most beneficial',
        ],
        recommendations: [
          'Seek a comprehensive evaluation from a GP and consider a mental health referral',
          'Cognitive-Behavioural Therapy (CBT) has strong evidence for somatic symptom disorder and medically unexplained symptoms',
          'SSRIs and SNRIs can reduce somatic symptom severity in the context of co-occurring depression/anxiety',
          'Mindfulness-Based Cognitive Therapy (MBCT) can reduce symptom preoccupation and catastrophisation',
        ],
        relatedDisorders: [
          { name: 'Somatic Symptom Disorder', description: 'Persistent physical symptoms with excessive health anxiety and maladaptive behaviours.' },
          { name: 'Illness Anxiety Disorder', description: 'Preoccupation with having or acquiring a serious illness, with high health anxiety.' },
          { name: 'Fibromyalgia', description: 'A medical syndrome characterised by widespread musculoskeletal pain, fatigue, and cognitive difficulties.' },
        ],
      },
      'High': {
        explanation: 'PHQ-15 scores of 15–30 indicate high somatic symptom severity. Research shows that individuals in this range have functional impairment comparable to major medical conditions, high rates of depression (60%+) and anxiety disorders, and substantially elevated healthcare costs. Integrated care — addressing both physical and psychological dimensions — is essential.',
        whatThisMeans: [
          'Your somatic symptom burden is severe and likely significantly impacting your daily functioning',
          'Multiple body systems may be affected simultaneously',
          'A comprehensive integrated care approach is strongly recommended',
        ],
        recommendations: [
          'Seek care from a clinician experienced in psychosomatic medicine or integrated care',
          'A thorough medical workup is important to identify any treatable physical causes',
          'Intensive CBT or multidisciplinary pain management programmes have strong evidence for high somatic burden',
          'Treat co-occurring depression and anxiety — this often substantially reduces somatic symptom severity',
          'Pain clinics and specialist somatic symptom disorder programmes can provide comprehensive support',
        ],
        relatedDisorders: [
          { name: 'Somatic Symptom Disorder', description: 'At this severity, the disorder meets the threshold for a formal diagnosis requiring integrated medical and psychiatric care.' },
          { name: 'Major Depressive Disorder', description: 'Present in the majority of individuals with high PHQ-15 scores.' },
          { name: 'Chronic Fatigue Syndrome (ME/CFS)', description: 'Characterised by debilitating fatigue, post-exertional malaise, and multiple somatic symptoms.' },
          { name: 'Functional Neurological Symptom Disorder', description: 'Neurological symptoms (weakness, non-epileptic seizures) without identifiable neurological disease.' },
        ],
      },
    },
    relatedCodes: ['PHQ9', 'GAD7', 'ESS', 'ISI', 'DASS21'],
  },

  WEMWBS: {
    overview: 'The Warwick-Edinburgh Mental Well-Being Scale (WEMWBS) was developed by Tennant et al. (2007) at the Universities of Warwick and Edinburgh. Unlike most mental health assessments that focus on symptoms or deficits, WEMWBS measures positive mental well-being using 14 positively-worded items covering emotional, psychological, and social dimensions. It is widely used in public health research and clinical settings to track well-being outcomes. Scores range from 14–70.',
    measuresDomain: 'Positive mental well-being: emotional function, positive relationships, psychological functioning over the past 2 weeks',
    bands: {
      'Low well-being': {
        explanation: 'WEMWBS scores of 14–40 indicate low positive mental well-being. Tennant et al. (2007) found that clinical populations with depression or anxiety typically score in this range. Low WEMWBS scores are associated with reduced quality of life, functional impairment, and vulnerability to mental health deterioration.',
        whatThisMeans: [
          'Your positive mental well-being is significantly below the population average',
          'You may be experiencing low positive emotions, reduced purpose, and diminished vitality',
          'Low WEMWBS scores often co-occur with depression or anxiety symptoms',
        ],
        recommendations: [
          'Complete a PHQ-9 and GAD-7 to assess for co-occurring depression or anxiety',
          'Positive psychology interventions (gratitude practice, behavioural activation, strengths-based approaches) have evidence for WEMWBS improvement',
          'Physical activity has the strongest evidence base for improving mental well-being — 30 minutes of moderate activity, 5 days/week',
          'Social connection is a powerful driver of well-being — prioritise meaningful interactions',
          'Consider seeking support from a psychologist if well-being remains low despite self-help efforts',
        ],
        relatedDisorders: [
          { name: 'Major Depressive Disorder', description: 'Low well-being is strongly correlated with depression — PHQ-9 screening is recommended.' },
          { name: 'Burnout', description: 'Occupational burnout is characterised by exhaustion and low well-being without necessarily meeting depression criteria.' },
          { name: 'Generalised Anxiety Disorder', description: 'Chronic anxiety significantly depletes well-being resources and is worth assessing separately.' },
        ],
      },
      'Moderate well-being': {
        explanation: 'WEMWBS scores of 41–58 reflect moderate positive mental well-being. This is approximately the range of the general adult population mean (approximately 51–53 in UK population studies). While this range is not indicative of pathology, there is substantial room to enhance well-being.',
        whatThisMeans: [
          'Your positive mental well-being is approximately average for the general adult population',
          'You experience positive emotions, purpose, and connection reasonably regularly',
          'Enhancement of well-being is possible and worthwhile even from this level',
        ],
        recommendations: [
          'Invest in evidence-based well-being practices: connection, physical activity, meaning, mindfulness',
          'Examine whether work-life balance, relationships, or purpose could be enriched',
          'Annual WEMWBS rescreening can track well-being trajectories over time',
        ],
        relatedDisorders: [],
      },
      'High well-being': {
        explanation: 'WEMWBS scores of 59–70 reflect high positive mental well-being — the upper quartile of the population. High WEMWBS scores are associated with greater resilience, stronger immune function, more satisfying relationships, and better occupational performance. Research by Keyes (2002) describes this level as "languishing-to-flourishing" — a state of optimal psychological functioning.',
        whatThisMeans: [
          'Your positive mental well-being is in the high range — a protective and desirable state',
          'You frequently experience positive emotions, engage with life meaningfully, and function effectively',
          'This well-being level is associated with significant health and social benefits',
        ],
        recommendations: [
          'Reflect on what conditions are supporting your high well-being and preserve them',
          'Sharing and modelling well-being practices can benefit those around you',
          'Rescreening every 12 months is appropriate',
        ],
        relatedDisorders: [],
      },
    },
    relatedCodes: ['WHO5', 'PHQ9', 'GAD7', 'RSES', 'PSS10'],
  },

  LSAS: {
    overview: 'The Liebowitz Social Anxiety Scale – Self-Report (LSAS-SR) was adapted from the clinician-administered LSAS developed by Michael Liebowitz (1987). It assesses fear and avoidance across 24 social situations, covering both performance situations (speaking in public, writing while observed) and social interactions (meeting strangers, dating). The LSAS is the gold-standard measure for social anxiety severity and is widely used in clinical trials. The self-report version correlates highly (r ≈ 0.93) with the original clinician version.',
    measuresDomain: 'Social anxiety: fear and avoidance across social interaction and performance situations',
    bands: {
      'No or mild social anxiety': {
        explanation: 'LSAS-SR scores of 0–55 indicate no significant or mild social anxiety. Social anxiety exists on a continuum and some degree of social nervousness is universal and adaptive. Scores at this level do not suggest a clinically significant social anxiety disorder, though mild social anxiety may still create some discomfort in specific situations.',
        whatThisMeans: [
          'Your social anxiety, if present, is within the normal range',
          'Some nervousness in social or performance situations is universal and healthy',
          'No clinically significant social anxiety disorder is suggested',
        ],
        recommendations: [
          'Practice gradual, voluntary exposure to mildly challenging social situations to build confidence',
          'Rescreening is appropriate if social anxiety concerns increase',
        ],
        relatedDisorders: [],
      },
      'Moderate social anxiety': {
        explanation: 'LSAS-SR scores of 56–65 indicate moderate social anxiety. Research by Mennin et al. (2002) found that scores in this range are associated with meaningful functional interference — social situations are regularly avoided or endured with significant distress. Moderate social anxiety may limit social relationships, career opportunities, and quality of life.',
        whatThisMeans: [
          'Your social anxiety is at a level that is meaningfully affecting your daily life',
          'You may frequently avoid social situations or experience significant distress within them',
          'Evidence-based treatment can significantly reduce social anxiety at this level',
        ],
        recommendations: [
          'Cognitive-Behavioural Therapy (CBT) for social anxiety is highly effective — consider individual or group formats',
          'Avoid complete avoidance of feared situations — graduated exposure is the key mechanism of change',
          'Challenge catastrophic cognitions: most social mistakes have far less impact than anxiety predicts',
          'Social skills training can be helpful alongside CBT for some individuals',
        ],
        relatedDisorders: [
          { name: 'Social Anxiety Disorder', description: 'Persistent fear of social situations in which scrutiny by others may occur, leading to avoidance and significant impairment.' },
          { name: 'Generalised Anxiety Disorder', description: 'The worry in GAD can extend to social situations — clinical differentiation from SAD requires assessment of the range of worry topics.' },
          { name: 'Avoidant Personality Disorder', description: 'A pervasive pattern of social inhibition, feelings of inadequacy, and hypersensitivity to negative evaluation — may co-occur with severe social anxiety.' },
        ],
      },
      'Marked social anxiety': {
        explanation: 'LSAS-SR scores of 66–80 indicate marked social anxiety. At this level, avoidance is likely substantial across multiple situations, and anticipatory anxiety (dread before social events) may be prolonged. Research by Heimberg et al. (1999) and others shows that marked social anxiety is associated with significant occupational, educational, and relational impairment.',
        whatThisMeans: [
          'Social anxiety is causing significant and wide-ranging interference in your daily life',
          'You may frequently miss social, professional, or educational opportunities due to avoidance',
          'Professional treatment is strongly recommended',
        ],
        recommendations: [
          'Seek CBT from a therapist specialised in social anxiety or anxiety disorders',
          'SSRIs (sertraline, escitalopram, paroxetine) and SNRIs (venlafaxine) have FDA approval for social anxiety disorder — discuss with a psychiatrist',
          'Group CBT can be particularly powerful for social anxiety as it provides real-time social exposure within a therapeutic context',
          'Reduce "safety behaviours" (scripted responses, avoiding eye contact, excessive preparation) — they maintain anxiety',
        ],
        relatedDisorders: [
          { name: 'Social Anxiety Disorder', description: 'At marked severity, the disorder typically meets full DSM-5 criteria and causes significant functional impairment.' },
          { name: 'Depression', description: 'Social isolation resulting from severe social anxiety frequently leads to secondary depression.' },
          { name: 'Selective Mutism', description: 'An extreme form of social anxiety resulting in complete inability to speak in certain social situations — more common in children.' },
        ],
      },
      'Severe social anxiety': {
        explanation: 'LSAS-SR scores of 81–95 indicate severe social anxiety. This level represents the upper range of social anxiety disorder severity, often associated with near-complete avoidance of social or performance situations. Career choices, relationships, and daily activities may all be severely constrained by social anxiety at this level.',
        whatThisMeans: [
          'Your social anxiety is severe and likely dominating major life decisions and daily functioning',
          'Avoidance is probably extensive — many important social situations may be avoided entirely',
          'Specialist mental health treatment is strongly recommended',
        ],
        recommendations: [
          'Seek specialist anxiety treatment — consider referral to a CBT-specialist or anxiety disorder clinic',
          'Intensive CBT programmes or combined CBT + pharmacotherapy have the strongest evidence for severe social anxiety',
          'Virtual reality exposure therapy (VRET) is emerging as an effective alternative for severe avoidance',
          'Address secondary depression if present — it significantly complicates social anxiety treatment',
        ],
        relatedDisorders: [
          { name: 'Social Anxiety Disorder (Generalised Type)', description: 'Fear and avoidance spanning most social situations — associated with more severe impairment than non-generalised type.' },
          { name: 'Avoidant Personality Disorder', description: 'Co-occurs in 20–50% of cases of severe social anxiety — may require longer-term psychotherapy addressing core schemas.' },
          { name: 'Major Depressive Disorder', description: 'Secondary depression due to social isolation and missed opportunities is very common at this level.' },
          { name: 'Substance Use Disorders', description: 'Alcohol is commonly used to manage severe social anxiety in social situations, creating additional risk.' },
        ],
      },
      'Very severe social anxiety': {
        explanation: 'LSAS-SR scores of 96–144 indicate very severe social anxiety. At this level, social anxiety is profoundly disabling. Research shows that very severe social anxiety is comparable in functional impairment to major depression and psychotic disorders. Treatment is essential and effective — even very severe social anxiety responds to evidence-based interventions.',
        whatThisMeans: [
          'Your social anxiety is at the most severe end of the clinical spectrum',
          'It is very likely causing extreme functional impairment across virtually all social domains',
          'Urgent access to specialist mental health services is recommended',
        ],
        recommendations: [
          'Seek urgent referral to an anxiety disorder specialist or mental health service',
          'Combined CBT and medication is the most effective approach for very severe social anxiety',
          'Be patient with treatment — severe social anxiety requires sustained engagement, but significant improvement is achievable',
          'Accommodation of avoidance by family members should be gently reduced with clinical guidance, not overnight',
          'If you are experiencing secondary depression with suicidal thoughts, contact emergency mental health services',
        ],
        relatedDisorders: [
          { name: 'Social Anxiety Disorder', description: 'At very severe levels, social anxiety is completely disabling across virtually all social and performance situations.' },
          { name: 'Avoidant Personality Disorder', description: 'Very high LSAS scores correlate strongly with APD — a deeply ingrained pattern requiring long-term treatment.' },
          { name: 'Agoraphobia', description: 'Fear and avoidance of situations where escape may be difficult — may co-occur with severe social anxiety.' },
          { name: 'Major Depressive Disorder', description: 'Almost universal at this severity level — requires parallel assessment and treatment.' },
        ],
      },
    },
    relatedCodes: ['GAD7', 'DASS21', 'RSES', 'PHQ9', 'OCIR'],
  },

  CESD: {
    overview: 'The CES-D (Center for Epidemiologic Studies Depression Scale) is a 20-item public domain instrument developed by Radloff (1977). It is one of the most widely used depression screening tools in population research, with a clinical threshold of ≥16 yielding sensitivity of ~91% and specificity of 72% for major depression.',
    measuresDomain: 'Frequency of depressive symptoms experienced in the past week',
    bands: {
      'No significant symptoms': {
        explanation: 'A score below 10 reflects minimal or no depressive symptomatology. Any mood fluctuations at this level are within the normal range of everyday emotional experience.',
        whatThisMeans: ['No clinically significant depressive episode is indicated', 'Mood fluctuations at this level are typical and adaptive', 'Your emotional functioning appears to be within the healthy range'],
        recommendations: ['Maintain current healthy habits — regular exercise, sleep, and social connection are protective factors', 'Consider rescreening during periods of significant life stress'],
        relatedDisorders: [],
      },
      'Mild depressive symptoms': {
        explanation: 'Scores of 10–15 indicate subthreshold depressive symptoms. Research shows that even mild depression is associated with meaningful functional impairment and elevated risk for progression to a full depressive episode if left unaddressed.',
        whatThisMeans: ['Some depressive features are present but below the clinical threshold', 'Low mood, fatigue, or reduced enjoyment may be mildly affecting daily life', 'Watchful waiting with lifestyle intervention is the recommended first step'],
        recommendations: ['Structured exercise has meta-analytic support equivalent to antidepressants for mild depression', 'Behavioural activation — scheduling rewarding activities — is evidence-based at this level', 'Consider a follow-up screen in 4–6 weeks', 'Speak to a GP or counsellor if symptoms persist for more than 2 weeks'],
        relatedDisorders: [
          { name: 'Adjustment Disorder with Depressed Mood', description: 'Stress-related depressive symptoms arising after an identifiable stressor.' },
          { name: 'Persistent Depressive Disorder (Dysthymia)', description: 'A chronic low-grade depressive condition often missed because it feels like "just how I am".' },
        ],
      },
      'Moderate depressive symptoms': {
        explanation: 'A CES-D score of 16–23 crosses the validated clinical threshold for probable depression. Scores in this range are associated with significant impairment in work, relationships, and daily activities.',
        whatThisMeans: ['Your score meets the screening threshold for probable major depressive disorder', 'Functional impairment in daily life, concentration, and social engagement is likely', 'Professional evaluation is strongly recommended'],
        recommendations: ['Seek evaluation from a GP, psychiatrist, or licensed psychologist', 'Cognitive Behavioural Therapy (CBT) has a strong evidence base for moderate depression', 'Antidepressant medication (SSRIs) may be considered in consultation with a clinician', 'Also complete the PHQ-9 for a second clinical perspective on severity'],
        relatedDisorders: [
          { name: 'Major Depressive Disorder (MDD)', description: 'Characterised by persistent low mood, anhedonia, and related symptoms causing significant impairment.' },
          { name: 'Bipolar Disorder', description: 'Depressive episodes can occur within Bipolar I or II — important to screen for manic history.' },
          { name: 'Anxiety Disorders', description: 'Comorbid anxiety is present in up to 60% of people with MDD — consider the GAD-7.' },
        ],
      },
      'Severe depressive symptoms': {
        explanation: 'Scores of 24 or above reflect severe and likely pervasive depressive symptoms requiring urgent clinical attention.',
        whatThisMeans: ['A severe depressive episode is strongly indicated', 'Functional impairment is expected across multiple life domains', 'Urgent clinical evaluation is recommended — do not attempt to manage this alone'],
        recommendations: ['Seek immediate mental health care — contact a crisis line or emergency services if you are in danger', 'Combined treatment (psychotherapy + medication) is superior to either alone at this severity', 'Safety assessment (suicidal ideation) should be conducted by a clinician', 'Contact info@vwelfare.com if you need help navigating mental health resources'],
        relatedDisorders: [
          { name: 'Severe Major Depressive Disorder', description: 'A severe episode with broad functional collapse, potentially including suicidal ideation.' },
          { name: 'Bipolar Disorder', description: 'Severe depressive episodes can be the presenting phase of Bipolar I or II.' },
          { name: 'PTSD', description: 'Trauma history should be explored as a comorbid or contributing factor.' },
        ],
      },
    },
    relatedCodes: ['PHQ9', 'DASS21', 'GAD7', 'ISI', 'MDQ'],
  },

  SPIN: {
    overview: 'The Social Phobia Inventory (SPIN) is a 17-item validated self-report scale developed by Connor et al. (2000) at Duke University. It measures fear, avoidance, and physiological distress in social situations, with sensitivity of 79% and specificity of 90% at the clinical cutoff of ≥19.',
    measuresDomain: 'Social anxiety symptoms (fear, avoidance, physiological arousal) in the past week',
    bands: {
      'None/Minimal social anxiety': {
        explanation: 'A SPIN score of 0–20 indicates no clinically significant social anxiety. Social nervousness in novel situations is normal and adaptive at this level.',
        whatThisMeans: ['No clinically significant social anxiety disorder is indicated', 'Some social nervousness is entirely normal and adaptive', 'Your social functioning appears to be in the healthy range'],
        recommendations: ['No clinical action is required at this level', 'Mindfulness practice can further enhance comfort in social situations if desired'],
        relatedDisorders: [],
      },
      'Mild social anxiety': {
        explanation: 'Scores of 21–30 reflect mild but clinically meaningful social anxiety. Avoidance and distress in social situations may cause minor but noticeable interference.',
        whatThisMeans: ['Mild social anxiety features are present that may limit your participation in some situations', 'Social avoidance or distress is present but not yet severely impairing', 'Self-help approaches are often effective at this level'],
        recommendations: ['Gradual exposure to feared social situations is the evidence-based first step', 'Self-help CBT resources targeting social anxiety may be helpful', 'Consider a single session with a therapist for skills introduction if avoidance is increasing'],
        relatedDisorders: [
          { name: 'Social Anxiety Disorder', description: 'A persistent pattern of intense fear and avoidance of social situations.' },
        ],
      },
      'Moderate social anxiety': {
        explanation: 'A SPIN score of 31–40 indicates moderate social anxiety disorder features causing significant interference in social, occupational, or academic domains.',
        whatThisMeans: ['Moderate social anxiety disorder features are present', 'Avoidance of social situations is likely affecting your career, relationships, or daily activities', 'Professional support is recommended'],
        recommendations: ['CBT with exposure components has the strongest evidence base for social anxiety', 'Group CBT is particularly effective and provides direct social exposure practice', 'SSRIs (sertraline, paroxetine) have strong evidence for SAD — discuss with a clinician'],
        relatedDisorders: [
          { name: 'Social Anxiety Disorder (SAD)', description: 'Meets the clinical threshold for SAD, previously called Social Phobia.' },
          { name: 'Generalised Anxiety Disorder', description: 'Social anxiety often co-occurs with GAD — consider the GAD-7.' },
        ],
      },
      'Severe social anxiety': {
        explanation: 'Scores of 41–55 indicate severe social anxiety disorder. Significant avoidance, fear, and physiological distress are causing substantial impairment in multiple life areas.',
        whatThisMeans: ['Severe social anxiety disorder features are indicated', 'Social avoidance is likely severely limiting your life opportunities', 'Urgent professional evaluation is recommended'],
        recommendations: ['Seek evaluation from a clinical psychologist or psychiatrist specialising in anxiety disorders', 'CBT + SSRI combination therapy is most effective at this severity', 'Avoid continuing to accommodate avoidance — each avoidance episode reinforces the fear'],
        relatedDisorders: [
          { name: 'Social Anxiety Disorder — Severe', description: 'Pervasive social fear causing substantial impairment.' },
          { name: 'Panic Disorder', description: 'Panic attacks in social situations often co-occur — consider the PDSS.' },
          { name: 'Depression', description: 'Social isolation from SAD frequently leads to secondary depression.' },
        ],
      },
      'Very severe social anxiety': {
        explanation: 'A score of 56 or above reflects very severe social phobia with pervasive and debilitating fear and avoidance of nearly all social situations.',
        whatThisMeans: ['Very severe social anxiety disorder is indicated', 'Social functioning is likely severely compromised across all domains', 'Urgent specialist referral is required'],
        recommendations: ['Seek urgent evaluation from a psychiatrist or specialist anxiety clinic', 'Intensive outpatient CBT programmes may be indicated', 'Combined pharmacological and psychological treatment is the standard of care at this level'],
        relatedDisorders: [
          { name: 'Social Anxiety Disorder — Very Severe', description: 'Near-complete social avoidance causing life-wide impairment.' },
          { name: 'Agoraphobia', description: 'Avoidance can extend to public places when social fear is this pervasive.' },
          { name: 'Major Depressive Disorder', description: 'Secondary depression due to chronic isolation is common at this severity.' },
        ],
      },
    },
    relatedCodes: ['LSAS', 'GAD7', 'PSWQ', 'ASI3', 'PCL5'],
  },

  IPIP120: {
    overview: 'The IPIP-NEO-120 is a 120-item public-domain personality inventory measuring the five major personality domains — Neuroticism, Extraversion, Openness to Experience, Agreeableness, and Conscientiousness — and 30 specific facets (six per domain). Developed from the International Personality Item Pool (IPIP) by Goldberg et al. as a free alternative to the commercial NEO-PI-R, the IPIP-NEO shows comparable validity and reliability. Each domain captures a broad dimension of personality; the 30 facets provide the granular picture. Domain scores range from 24 to 120; the midpoint is 72. Results are descriptive, not diagnostic — there is no "good" or "bad" personality profile.',
    measuresDomain: 'Five major personality domains (OCEAN) and 30 specific personality facets',
    bands: {
      'Reserved & Structured Profile': {
        explanation: 'An overall IPIP-120 total in the 120–299 range reflects a personality orientation that tends toward introversion, practicality, emotional sensitivity, and/or more structured or conventional approaches. The total is only a summary — your five domain scores (each 24–120) and the 30 facets tell the real story. For example, high Conscientiousness with low Extraversion describes many highly effective, disciplined people who prefer working independently.',
        whatThisMeans: ['You likely prefer familiar environments, routine, and depth over breadth in social connection', 'Practicality and conscientiousness can be strengths even with a lower overall total', 'A higher Neuroticism domain indicates emotional sensitivity that can be both a source of depth and of distress', 'This is a common and functional personality profile — the total does not indicate a problem'],
        recommendations: ['Review your individual OCEAN domain and facet scores — they are far more informative than the total', 'High introversion paired with high Conscientiousness predicts strong performance in focused, independent work', 'If the Neuroticism domain is elevated, evidence-based approaches (CBT, mindfulness) help manage emotional reactivity'],
        relatedDisorders: [],
      },
      'Moderate Trait Expression': {
        explanation: 'A total of 300–360 reflects moderate expression across the Big Five. You show a mix of introversion and extraversion, emotional stability and sensitivity, and a blend of open and conventional tendencies. Moderate profiles are the most common in population samples; which specific domains and facets are higher vs. lower is what matters.',
        whatThisMeans: ['You adapt reasonably well across social, work, and personal contexts', 'Extreme tendencies in any single domain are unlikely — your overall profile is relatively balanced', 'Strengths and challenges depend on your specific domain and facet pattern'],
        recommendations: ['Explore your domain and facet scores to identify your strongest and lowest traits', 'Moderate Conscientiousness suggests room to strengthen organisation, goal-setting, or follow-through', 'Moderate Agreeableness means you can be both collaborative and assertive depending on context'],
        relatedDisorders: [],
      },
      'Balanced Personality Profile': {
        explanation: 'A total of 361–420 reflects broadly balanced personality expression. You show meaningful engagement across multiple domains — likely a combination of openness, social engagement, warmth, and organisation — while Neuroticism is moderate or below average. This profile is associated with adaptability and wellbeing.',
        whatThisMeans: ['You engage positively across social and intellectual domains with moderate emotional stability', 'A balance of Openness and Conscientiousness supports both creative thinking and follow-through', 'Agreeableness at this level supports healthy, cooperative relationships without necessarily being conflict-avoidant'],
        recommendations: ['Identify your two or three highest facets — these are your personality strengths to leverage', 'Balanced profiles adapt well across roles; consider how your particular trait combination fits your career and relationships', 'High Openness + Conscientiousness pairs creativity with the discipline to execute'],
        relatedDisorders: [],
      },
      'Expressive & Engaged Profile': {
        explanation: 'A total of 421–480 reflects high expression across the Big Five. You likely show above-average Openness, Extraversion, Agreeableness, and Conscientiousness, with lower Neuroticism. This profile is associated with intellectual curiosity, social energy, warmth, and organised goal-pursuit.',
        whatThisMeans: ['You tend to be socially engaged, intellectually curious, warm, and organised', 'This combination is associated with leadership effectiveness, relationship satisfaction, and creative achievement', 'Very high Openness can make finishing projects harder — balancing novelty-seeking with follow-through helps'],
        recommendations: ['Leverage high Openness and Conscientiousness in creative, intellectually demanding roles', 'High Agreeableness can lead to over-accommodating others — assertiveness skills complement this strength', 'Check the facet breakdown: very high Extraversion benefits from built-in recovery time'],
        relatedDisorders: [],
      },
      'Highly Active & Open Profile': {
        explanation: 'A total of 481–600 reflects very high expression across most Big Five domains — particularly Openness, Extraversion, Agreeableness, and Conscientiousness — with minimal Neuroticism. This is the highest-engagement profile, associated with intellectual vitality, social drive, and organisational strength.',
        whatThisMeans: ['You are likely highly socially engaged, intellectually curious, warm, and achievement-oriented', 'This profile appears more often in leadership, entrepreneurial, creative, and helping professions', 'Very high Openness can mean breadth of interests over depth — intentional focus is valuable', 'Very high Agreeableness can conflict with assertiveness and boundary-setting'],
        recommendations: ['Identify the 1–2 facets where your score is highest and pursue roles that leverage them', 'Very high Extraversion + Openness with high Conscientiousness is characteristic of effective leaders and innovators', 'Watch for "too much of a good thing": very high Agreeableness can make saying no hard; very high Openness can scatter attention'],
        relatedDisorders: [],
      },
    },
    relatedCodes: ['BFI44', 'RSES', 'PSS10', 'SWLS'],
  },

  BFI44: {
    overview: 'The Big Five Inventory (BFI-44; John, Donahue & Kentle, 1991) measures the five major personality dimensions — Openness to Experience, Conscientiousness, Extraversion, Agreeableness, and Neuroticism (OCEAN). Unlike clinical scales, the BFI-44 is descriptive rather than diagnostic; no profile is inherently "good" or "bad". The five factors are among the most replicated findings in personality psychology, showing cross-cultural stability and consistent associations with life outcomes. Subscale scores are more informative than the total, which reflects the overall level of engagement, organisation, and openness vs. emotional reactivity and introversion.',
    measuresDomain: 'Five stable personality dimensions: Openness, Conscientiousness, Extraversion, Agreeableness, and Neuroticism (OCEAN)',
    bands: {
      'Reserved & Structured Profile': {
        explanation: 'This profile (total score 44–109) reflects a personality orientation that tends toward introversion, practicality, emotional sensitivity, and/or more structured or conventional approaches. Individual subscale patterns tell the real story — for example, high Conscientiousness with low Extraversion describes many highly effective and disciplined individuals who prefer working independently.',
        whatThisMeans: ['You likely prefer familiar environments, routine, and depth over breadth in social connection', 'Practicality and conscientiousness may be strengths even with a lower total score', 'High Neuroticism within this profile indicates emotional sensitivity that can be both a source of depth and of distress', 'This is a common and functional personality profile — the total score does not indicate a problem'],
        recommendations: ['Review your individual OCEAN subscale scores for a more meaningful picture', 'High introversion paired with high Conscientiousness predicts strong performance in focused, independent work', 'If Neuroticism is elevated, evidence-based approaches (CBT, mindfulness) can help manage emotional reactivity', 'The full IPIP-120 provides richer domain-level detail if you want to explore your personality further'],
        relatedDisorders: [],
      },
      'Moderate Trait Expression': {
        explanation: 'A total score of 110–132 reflects moderate expression across the Big Five traits. You show a mix of introversion and extraversion, emotional stability and sensitivity, and a blend of open and conventional tendencies. Moderate profiles are the most common in population samples.',
        whatThisMeans: ['You adapt reasonably well across social, work, and personal contexts', 'Extreme tendencies in any single dimension are unlikely — your profile is relatively balanced', 'Strengths and challenges depend on which specific traits are higher vs. lower within this range'],
        recommendations: ['Explore your individual subscale scores to identify your strongest and lowest traits', 'Moderate Conscientiousness suggests there may be room to strengthen organisation, goal-setting habits, or follow-through', 'Moderate Agreeableness indicates you can be both collaborative and assertive depending on context — a valuable combination'],
        relatedDisorders: [],
      },
      'Balanced Personality Profile': {
        explanation: 'A total score of 133–154 reflects broadly balanced personality expression. You show meaningful engagement across multiple dimensions — likely a combination of openness, social engagement, warmth, and organisation — while Neuroticism is moderate or below average. This profile is associated with adaptability and wellbeing.',
        whatThisMeans: ['You engage positively across social and intellectual domains with moderate emotional stability', 'A balance of openness and conscientiousness supports both creative thinking and follow-through', 'Agreeableness at this level supports healthy, cooperative relationships without necessarily being conflict-avoidant'],
        recommendations: ['Identify your two or three highest subscales — these are your personality strengths to leverage', 'Balanced profiles tend to adapt well across roles; consider how your particular trait combination fits your career and relationships', 'High Openness + Conscientiousness is particularly associated with creativity paired with the discipline to execute'],
        relatedDisorders: [],
      },
      'Expressive & Engaged Profile': {
        explanation: 'A total score of 155–176 reflects high expression across the Big Five dimensions. You likely show above-average Openness, Extraversion, Agreeableness, and Conscientiousness, with lower Neuroticism. This profile is associated with intellectual curiosity, social energy, warmth, and organised goal-pursuit.',
        whatThisMeans: ['You tend to be socially engaged, intellectually curious, warm, and organised', 'This combination is associated with leadership effectiveness, relationship satisfaction, and creative achievement', 'High Extraversion with high Agreeableness predicts strong interpersonal skills and team contribution', 'Very high Openness may lead to difficulty finishing projects — balancing novelty-seeking with follow-through is useful'],
        recommendations: ['Leverage high Openness and Conscientiousness in creative, intellectually demanding roles', 'High Agreeableness may sometimes lead to over-accommodating others — assertiveness skills can complement this strength', 'If Extraversion is very high, ensure you build in recovery time and solitude to prevent overstimulation'],
        relatedDisorders: [],
      },
      'Highly Active & Open Profile': {
        explanation: 'A total score of 177–220 reflects very high expression across most Big Five dimensions — particularly Openness, Extraversion, Agreeableness, and Conscientiousness — with minimal Neuroticism. This is the highest-engagement personality profile and is associated with intellectual vitality, social drive, and organisational strength.',
        whatThisMeans: ['You are likely highly socially engaged, intellectually curious, warm, and achievement-oriented', 'This profile is found more often in leadership, entrepreneurial, creative, and helping professions', 'Very high Openness can mean breadth of interests over depth in any single area — intentional focus is valuable', 'Very high Agreeableness may sometimes conflict with assertiveness and boundary-setting needs'],
        recommendations: ['Identify the 1–2 subscales where your score is highest and explore careers and roles that leverage them most directly', 'Very high Extraversion and Openness with high Conscientiousness is characteristic of highly effective leaders and innovators', 'Watch for the "too much of a good thing" effect: very high Agreeableness can lead to difficulty saying no; very high Openness can lead to scattered attention', 'Explore the IPIP-120 for a detailed 30-facet breakdown of your personality'],
        relatedDisorders: [],
      },
    },
    relatedCodes: ['IPIP120', 'RSES', 'PSS10'],
  },

  PSWQ: {
    overview: 'The Penn State Worry Questionnaire (PSWQ) is a 16-item validated scale developed by Meyer, Miller, Metzger & Borkovec (1990) measuring the trait of pathological worry — uncontrollable, excessive worry. It is the gold-standard self-report measure of the worry component of GAD, with high internal consistency (α ≈ 0.94).',
    measuresDomain: 'Trait-level tendency to worry excessively and uncontrollably',
    bands: {
      'Low pathological worry': {
        explanation: 'A PSWQ score of 16–35 indicates low pathological worry. Worry at this level is adaptive, purposeful, and controllable — a normal part of problem-solving.',
        whatThisMeans: ['Your worry is within the normal, adaptive range', 'You are generally able to dismiss worrisome thoughts when they are not productive', 'No clinical intervention is indicated for worry specifically'],
        recommendations: ['Continue current stress-management practices', 'Mindfulness practices can further develop the ability to relate to thoughts without fusing with them'],
        relatedDisorders: [],
      },
      'Moderate worry': {
        explanation: 'Scores of 36–52 reflect moderate pathological worry — beginning to feel less controllable with some interference in daily functioning, sleep, or concentration.',
        whatThisMeans: ['Worry is becoming more difficult to control and may be affecting your daily life', 'You may find yourself worrying about multiple domains simultaneously', 'Preventive action is recommended to avoid escalation'],
        recommendations: ['Worry postponement techniques (scheduling a "worry time") are evidence-based at this level', 'Progressive Muscle Relaxation and deep breathing can reduce the physiological component of worry', 'Self-help CBT workbooks for GAD/worry are effective for this severity'],
        relatedDisorders: [
          { name: 'Generalised Anxiety Disorder (GAD)', description: 'Excessive uncontrollable worry about multiple domains — the core feature measured by the PSWQ.' },
          { name: 'Health Anxiety', description: 'Worry may focus specifically on physical symptoms and health concerns.' },
        ],
      },
      'High worry': {
        explanation: 'A PSWQ score of 53–67 indicates high, clinically significant pathological worry strongly associated with GAD and expected to cause significant distress and functional interference.',
        whatThisMeans: ['Your worry level is clinically high and is likely causing significant distress', 'Worry may feel completely uncontrollable and pervasive', 'Professional support is recommended'],
        recommendations: ['CBT for GAD — particularly the worry intolerance model — has the strongest evidence base', 'Acceptance and Commitment Therapy (ACT) is effective for reducing experiential avoidance', 'Consider completing the GAD-7 for a complementary clinical perspective', 'Discuss medication options (SSRIs, venlafaxine) with a clinician if worry is severely impairing'],
        relatedDisorders: [
          { name: 'Generalised Anxiety Disorder', description: 'High PSWQ scores are a hallmark feature of GAD; clinical evaluation is recommended.' },
          { name: 'Major Depressive Disorder', description: 'Comorbid depression is present in over 60% of GAD cases.' },
          { name: 'Panic Disorder', description: 'Worry about having panic attacks is a common maintaining factor.' },
        ],
      },
      'Pathological worry': {
        explanation: 'A PSWQ score of 68 or above indicates pathological, uncontrollable worry at its most severe — pervasive, consuming large amounts of time, and causing severe distress and functional impairment.',
        whatThisMeans: ['Your worry is at a pathological level causing severe distress', 'Worry likely dominates much of your waking time and disrupts sleep', 'Urgent professional evaluation and treatment are required'],
        recommendations: ['Seek evaluation from a psychologist or psychiatrist specialising in anxiety disorders', 'CBT + pharmacotherapy combination is most effective at this severity level', 'Avoid caffeine, excessive work, and social isolation — all of which amplify pathological worry', 'Contact info@vwelfare.com for a guided referral to appropriate care'],
        relatedDisorders: [
          { name: 'Generalised Anxiety Disorder — Severe', description: 'Severe, pervasive uncontrollable worry causing life-wide impairment.' },
          { name: 'OCD', description: 'Worry and obsessions can overlap; OCI-R can help differentiate.' },
          { name: 'PTSD', description: 'Hypervigilance and intrusive worry are features of both GAD and PTSD.' },
        ],
      },
    },
    relatedCodes: ['GAD7', 'DASS21', 'ASI3', 'PSS10', 'OCIR'],
  },

  OLBI: {
    overview: 'The Oldenburg Burnout Inventory (OLBI) is a 16-item validated occupational burnout scale developed by Demerouti et al. (2001). It measures two core burnout dimensions: Exhaustion (physical, cognitive, and affective depletion) and Disengagement (distancing from work content). It is considered one of the most psychometrically robust burnout measures available.',
    measuresDomain: 'Occupational burnout across exhaustion and disengagement dimensions',
    bands: {
      'Low burnout': {
        explanation: 'A score of 16–28 on the OLBI indicates low occupational burnout. You appear to have adequate resources to meet your work demands, maintaining both energy and engagement.',
        whatThisMeans: ['Your energy and engagement levels at work are healthy', 'Work demands are not currently overwhelming your resources', 'Your current work-life balance appears to be sustainable'],
        recommendations: ['Maintain current protective practices — regular breaks, varied tasks, and social support at work are key buffers', 'Periodic reassessment during periods of increased workload is recommended'],
        relatedDisorders: [],
      },
      'Moderate burnout': {
        explanation: 'OLBI scores of 29–42 reflect moderate burnout — notable exhaustion and/or disengagement that, if left unaddressed, is likely to escalate with significant health and performance consequences.',
        whatThisMeans: ['Significant exhaustion or disengagement from work is present', 'Your work performance, motivation, or health may already be affected', 'Action is needed now — moderate burnout rarely resolves without active change'],
        recommendations: ['Identify and reduce the primary work stressors (workload, lack of control, unfairness)', 'Take regular recovery time — daily micro-breaks and longer restorative breaks', 'Discuss workload adjustments with a manager or HR', 'Consider a few sessions with an occupational therapist or psychologist specialising in workplace wellbeing'],
        relatedDisorders: [
          { name: 'Adjustment Disorder', description: 'Work-related stress causing clinically significant distress or impairment.' },
          { name: 'Major Depressive Disorder', description: 'Chronic burnout has a well-documented pathway to clinical depression.' },
        ],
      },
      'High burnout': {
        explanation: 'An OLBI score of 43 or above indicates high burnout. At this level, both exhaustion and disengagement are severe, with substantially elevated risk of clinical depression, anxiety disorders, and cardiovascular problems.',
        whatThisMeans: ['Severe occupational burnout is indicated — this is a serious concern', 'Your physical and mental health are at significant risk if the current situation continues', 'Urgent action to reduce job demands and increase recovery is required'],
        recommendations: ['Consult a GP or mental health professional — burnout at this level often requires medical leave', 'Consider whether a temporary or permanent change in role, hours, or employer is necessary', 'Complete the PHQ-9 and GAD-7 to check for comorbid depression and anxiety', 'Contact info@vwelfare.com for support navigating workplace wellness resources'],
        relatedDisorders: [
          { name: 'Major Depressive Disorder', description: 'High burnout and MDD are frequently comorbid and mutually reinforcing.' },
          { name: 'Generalised Anxiety Disorder', description: 'Chronic work stress maintains high anxiety that meets GAD criteria in many burnout cases.' },
          { name: 'Cardiovascular Disease', description: 'Chronic burnout is an independent risk factor for hypertension and coronary heart disease.' },
        ],
      },
    },
    relatedCodes: ['PSS10', 'DASS21', 'PHQ9', 'GAD7', 'ISI'],
  },

  UCLA: {
    overview: 'The UCLA Loneliness Scale (Version 3) is a 20-item validated measure of subjective loneliness developed by Russell (1996). It is the most widely used and psychometrically robust loneliness measure for adults, with demonstrated reliability (α ≈ 0.89–0.94) across cultures.',
    measuresDomain: 'Subjective loneliness and perceived social isolation',
    bands: {
      'Low loneliness': {
        explanation: 'A score of 20–34 indicates low loneliness. You perceive your social relationships as generally satisfying and feel connected to those around you.',
        whatThisMeans: ['Your perceived social connectedness is in the healthy range', 'You feel generally understood and close to others', 'Your social support network appears adequate for your needs'],
        recommendations: ['Nurture existing relationships — quality of social connection matters more than quantity', 'Continue investing in close relationships; they are a primary buffer against stress and illness'],
        relatedDisorders: [],
      },
      'Moderate loneliness': {
        explanation: 'Scores of 35–49 reflect moderate loneliness. Research consistently shows that chronic loneliness at this level has health consequences comparable to smoking 15 cigarettes per day.',
        whatThisMeans: ['You are experiencing meaningful loneliness that is likely affecting your wellbeing', 'You may feel misunderstood, disconnected, or that your relationships lack depth', 'Active effort to expand or deepen social connections is warranted'],
        recommendations: ['Identify barriers to social connection — anxiety, busyness, or past relational hurt are the most common', 'Consider joining activity-based groups aligned with your interests', 'If social anxiety is a barrier, consider the SPIN assessment and CBT-based social skills work', 'Volunteering is one of the most consistently effective loneliness interventions in the research literature'],
        relatedDisorders: [
          { name: 'Social Anxiety Disorder', description: 'Fear of social situations often drives loneliness even when the person desires connection.' },
          { name: 'Major Depressive Disorder', description: 'Loneliness and depression are bidirectionally reinforcing.' },
        ],
      },
      'High loneliness': {
        explanation: 'A UCLA score of 50–64 indicates high loneliness — a clinically concerning level with well-documented links to depression, sleep disruption, elevated cortisol, and increased all-cause mortality risk.',
        whatThisMeans: ['Your loneliness is at a clinically concerning level', 'You may feel fundamentally disconnected from others, even when people are physically present', 'Professional support is recommended alongside active social reconnection efforts'],
        recommendations: ['Seek support from a psychologist or counsellor to address both the loneliness and underlying barriers', 'Complete the PHQ-9 and PSS-10 to check for comorbid depression and stress', 'Consider whether grief, relocation, relationship breakdown, or social anxiety are maintaining the loneliness', 'Structured community involvement provides low-pressure social contact'],
        relatedDisorders: [
          { name: 'Major Depressive Disorder', description: 'Chronic loneliness is one of the strongest predictors of depression onset.' },
          { name: 'Social Anxiety Disorder', description: 'The desire for connection combined with fear of judgment creates the loneliness trap.' },
          { name: 'Prolonged Grief Disorder', description: 'Bereavement and the loss of a primary relationship are leading causes of severe loneliness.' },
        ],
      },
      'Very high loneliness': {
        explanation: 'A score of 65 or above indicates very high loneliness — a serious public health concern causing significant distress and health risk.',
        whatThisMeans: ['Very high loneliness is causing significant distress and health risk', 'You may feel that no one truly knows or understands you', 'Urgent clinical support and social reconnection are required'],
        recommendations: ['Seek immediate support from a mental health professional', 'Complete the PHQ-9 to screen for comorbid depression, which is highly likely at this score', 'Contact info@vwelfare.com for guidance on social support resources in your area'],
        relatedDisorders: [
          { name: 'Major Depressive Disorder — Severe', description: 'Very high loneliness and severe depression are frequently concurrent.' },
          { name: 'Suicidality', description: 'Chronic loneliness is a significant risk factor for suicidal ideation — professional assessment is essential.' },
        ],
      },
    },
    relatedCodes: ['PHQ9', 'GAD7', 'SPIN', 'RSES', 'PSS10'],
  },

  ASI3: {
    overview: 'The Anxiety Sensitivity Index-3 (ASI-3) is an 18-item validated scale developed by Taylor et al. (2007) measuring anxiety sensitivity — the fear of anxiety-related sensations based on beliefs they will have harmful physical, psychological, or social consequences. High AS is one of the strongest known risk factors for panic disorder and social anxiety.',
    measuresDomain: 'Fear of anxiety sensations across physical, cognitive, and social domains',
    bands: {
      'Low anxiety sensitivity': {
        explanation: 'An ASI-3 score of 0–17 indicates low anxiety sensitivity. You are unlikely to catastrophise physical sensations of anxiety, which is associated with lower risk of anxiety disorders.',
        whatThisMeans: ['You do not tend to fear your own anxiety responses', 'Physical symptoms of anxiety do not typically frighten you', 'This is a protective profile for anxiety disorders'],
        recommendations: ['Your low anxiety sensitivity is a protective factor — maintain it through continued tolerance of normal discomfort'],
        relatedDisorders: [],
      },
      'Moderate anxiety sensitivity': {
        explanation: 'Scores of 18–35 reflect moderate anxiety sensitivity — some tendency to interpret anxiety symptoms as more threatening than they are.',
        whatThisMeans: ['Some tendency to fear anxiety-related sensations is present', 'Certain physical or cognitive symptoms of anxiety may feel alarming', 'You may sometimes misinterpret normal bodily sensations as signs of serious illness or danger'],
        recommendations: ['Interoceptive awareness exercises can reduce fear of internal sensations', 'Psychoeducation about the fight-or-flight response helps demystify anxiety sensations', 'If panic episodes are occurring, consider an evaluation for panic disorder'],
        relatedDisorders: [
          { name: 'Panic Disorder', description: 'Catastrophic misinterpretation of physical sensations is the central mechanism of panic disorder.' },
          { name: 'Health Anxiety (Somatic Symptom Disorder)', description: 'High anxiety sensitivity contributes to health-related worry and somatic monitoring.' },
        ],
      },
      'High anxiety sensitivity': {
        explanation: 'An ASI-3 score of 36–53 indicates high anxiety sensitivity with substantially elevated risk for panic disorder, social phobia, and PTSD. The "fear of fear" cycle is likely active.',
        whatThisMeans: ['High anxiety sensitivity is present and is likely fuelling anxiety symptoms', 'You may fear that anxiety sensations signal dangerous physical illness or mental breakdown', 'This level of AS is associated with panic attacks and health anxiety in many individuals'],
        recommendations: ['Interoceptive exposure (deliberately inducing mild anxiety sensations safely) is the gold-standard treatment for high AS', 'CBT for panic disorder is highly effective — even without a formal diagnosis', 'Consider also completing the GAD-7 and PDSS'],
        relatedDisorders: [
          { name: 'Panic Disorder', description: 'High ASI-3 scores are the primary cognitive risk factor for developing panic disorder.' },
          { name: 'Social Anxiety Disorder', description: 'Social AS subscale items specifically predict social anxiety.' },
          { name: 'PTSD', description: 'Anxiety sensitivity elevates reactivity to trauma-related physiological cues.' },
        ],
      },
      'Very high anxiety sensitivity': {
        explanation: 'A score of 54 or above represents very high anxiety sensitivity — a significant clinical risk factor likely contributing to or maintaining current anxiety disorder symptoms.',
        whatThisMeans: ['Very high anxiety sensitivity is causing significant distress and fuelling anxiety symptoms', 'You are likely experiencing frequent fear responses to your own physical or mental states', 'Urgent clinical evaluation and treatment are recommended'],
        recommendations: ['Seek evaluation from a clinical psychologist specialising in anxiety disorders', 'Interoceptive exposure and CBT have high success rates even at this severity', 'Avoid excessive body checking and reassurance-seeking — these behaviours maintain high AS', 'Contact info@vwelfare.com for a referral to anxiety disorder specialists'],
        relatedDisorders: [
          { name: 'Panic Disorder — Severe', description: 'Very high ASI-3 scores at this level are almost always associated with active panic disorder.' },
          { name: 'Agoraphobia', description: 'Fear of having panic attacks in public places develops from severe anxiety sensitivity.' },
          { name: 'Illness Anxiety Disorder', description: 'Physical anxiety sensitivity can manifest as health-focused worry.' },
        ],
      },
    },
    relatedCodes: ['GAD7', 'PDSS', 'SPIN', 'PSWQ', 'PCL5'],
  },

  CDRISC: {
    overview: 'The Connor-Davidson Resilience Scale (CD-RISC-25) is a 25-item validated resilience measure developed by Connor & Davidson (2003) at Duke University. HIGHER scores indicate GREATER resilience — the ability to thrive despite adversity. The published general population mean is approximately 80 out of 100.',
    measuresDomain: 'Psychological resilience — the capacity to adapt and recover from adversity',
    bands: {
      'Low resilience': {
        explanation: 'A CD-RISC-25 score below 50 indicates low resilience — associated with greater vulnerability to depression, anxiety, and PTSD following adversity. Resilience is a modifiable trait that can be actively built.',
        whatThisMeans: ['Your current resilience capacity is lower than average', 'Stressful events may feel overwhelming and harder to recover from', 'You may feel less confident in your ability to handle new challenges'],
        recommendations: ['Resilience is a learnable skill — evidence-based interventions can meaningfully increase CD-RISC scores', 'Building secure social relationships is the single most evidence-supported resilience factor', 'Consider completing the PHQ-9 and GAD-7 — low resilience is associated with elevated depression and anxiety', 'Trauma-focused therapy (EMDR, TF-CBT) is recommended if past trauma is contributing to low resilience'],
        relatedDisorders: [
          { name: 'Major Depressive Disorder', description: 'Low resilience is both a risk factor for and a consequence of chronic depression.' },
          { name: 'PTSD', description: 'Low pre-trauma resilience is the strongest predictor of PTSD development after trauma exposure.' },
          { name: 'Adjustment Disorder', description: 'Difficulty adapting to stressors is the defining feature of low resilience.' },
        ],
      },
      'Moderate resilience': {
        explanation: 'A CD-RISC-25 score of 50–69 reflects moderate resilience. You have meaningful resilience resources but may still find significant adversity challenging to navigate without support.',
        whatThisMeans: ['You have some resilience resources but also areas for development', 'You can manage everyday stressors but may struggle with major adversity', 'Targeted development of specific resilience skills can meaningfully improve outcomes'],
        recommendations: ['Identify your specific resilience strengths and build on them', 'Physical fitness, sleep quality, and social connection are the three strongest modifiable resilience factors', 'Cognitive reappraisal training — finding meaning or growth in adversity — is effective at this level'],
        relatedDisorders: [
          { name: 'Adjustment Disorder', description: 'Moderate resilience can still be overwhelmed by acute stressors.' },
          { name: 'Burnout', description: 'Moderate resilience may not be sufficient for high-demand work environments.' },
        ],
      },
      'Good resilience': {
        explanation: 'Scores of 70–84 indicate good resilience — above the general population mean. You have well-developed capacities for adapting to stress and adversity.',
        whatThisMeans: ['Your resilience is above average', 'You generally recover well from setbacks and adapt to change', 'Your sense of purpose, social support, and problem-solving skills are likely well-developed'],
        recommendations: ['Continue investing in your resilience foundations — relationships, purpose, and physical health', 'Consider mentoring others or taking on roles that leverage your resilience strengths', 'Even high resilience can be depleted by chronic, severe adversity — monitor stress levels proactively'],
        relatedDisorders: [],
      },
      'Very high resilience': {
        explanation: 'A CD-RISC-25 score of 85–100 places you in the top range of resilience — associated with exceptional recovery from adversity and high psychological flourishing.',
        whatThisMeans: ['Your resilience capacity is exceptional', 'You likely feel confident managing adversity and find ways to grow through challenges', 'This profile is associated with leadership capacity and psychological flourishing'],
        recommendations: ['Your resilience is a significant strength — leverage it in roles that involve leading others through change', 'Even very high resilience benefits from maintenance — continued investment in relationships, meaning, and health is key'],
        relatedDisorders: [],
      },
    },
    relatedCodes: ['PSS10', 'DASS21', 'PCL5', 'WHO5', 'WEMWBS'],
  },

  WHOQOL: {
    overview: 'The WHOQOL-BREF is a 26-item quality of life instrument developed by the WHO WHOQOL Group (1998). It assesses QoL across four domains: Physical Health, Psychological, Social Relationships, and Environment. HIGHER scores indicate BETTER quality of life. Validated in over 40 countries.',
    measuresDomain: 'Quality of life across physical, psychological, social, and environmental domains',
    bands: {
      'Poor quality of life': {
        explanation: 'A WHOQOL-BREF score of 26–65 indicates poor quality of life. Significant impairment in physical health, psychological wellbeing, social functioning, and/or environmental conditions is indicated.',
        whatThisMeans: ['Your quality of life is currently significantly impaired', 'Multiple life domains may be contributing to low wellbeing', 'Comprehensive evaluation of specific domain scores will help identify the primary areas to address'],
        recommendations: ['Identify which domains (physical, psychological, social, environmental) are contributing most to the low score', 'Complete domain-specific assessments — PHQ-9 for psychological, ISI for sleep, UCLA for social', 'Seek professional support across the relevant domains — a holistic care plan is needed', 'Contact info@vwelfare.com for guidance on accessing integrated care'],
        relatedDisorders: [
          { name: 'Major Depressive Disorder', description: 'Low psychological domain scores are strongly linked to depression.' },
          { name: 'Chronic Physical Illness', description: 'Low physical domain scores often co-occur with chronic health conditions.' },
          { name: 'Social Isolation', description: 'Low social domain scores are associated with loneliness and lack of support.' },
        ],
      },
      'Below average quality of life': {
        explanation: 'Scores of 66–91 reflect below-average quality of life. Your wellbeing across one or more domains is lower than typical and may be causing meaningful distress.',
        whatThisMeans: ['Your quality of life is below average across the assessed domains', 'One or two domains are likely pulling your overall score down', 'Targeted intervention in the weakest domains can meaningfully improve overall QoL'],
        recommendations: ['Review domain-specific scores to identify priority areas', 'Psychological domain improvements tend to have the largest impact on overall QoL', 'Community resources, health services, and social activities can address environmental and social domain gaps'],
        relatedDisorders: [
          { name: 'Persistent Depressive Disorder', description: 'Chronic low-grade depression that significantly erodes quality of life.' },
          { name: 'Chronic Stress', description: 'Sustained stress across multiple domains cumulatively reduces QoL.' },
        ],
      },
      'Average to good quality of life': {
        explanation: 'A WHOQOL-BREF score of 92–117 indicates average to good quality of life. You are generally functioning well across the four domains.',
        whatThisMeans: ['Your quality of life is broadly in the healthy range', 'Individual domains may vary — check which areas are strongest and which could be improved', 'You have a solid foundation of wellbeing across most life areas'],
        recommendations: ['Focus on the specific domain with the lowest score for targeted improvement', 'Positive psychology interventions (gratitude practices, strengths-based work) can improve scores further', 'Continue investing in social relationships — the most robust predictor of sustained QoL'],
        relatedDisorders: [],
      },
      'Good quality of life': {
        explanation: 'A score of 118–130 indicates good to excellent quality of life. You report high levels of physical functioning, psychological wellbeing, social satisfaction, and environmental resources.',
        whatThisMeans: ['Your quality of life is excellent across the assessed domains', 'You have strong resources and satisfaction across all four dimensions', 'This profile is associated with high resilience, health longevity, and life satisfaction'],
        recommendations: ['Maintain the conditions that support your current QoL — these are your protective factors', 'Consider completing the WEMWBS or WHO-5 for a positive wellbeing perspective that complements QoL measurement'],
        relatedDisorders: [],
      },
    },
    relatedCodes: ['WHO5', 'WEMWBS', 'PHQ9', 'PSS10', 'CDRISC'],
  },

  // ─── DERS ──────────────────────────────────────────────────────────────────
  DERS: {
    overview: 'The Difficulties in Emotion Regulation Scale (DERS; Gratz & Roemer, 2004) is a 36-item measure of six functionally distinct dimensions of emotion dysregulation. Unlike scales that count emotional symptoms, the DERS probes the mechanisms of emotional dysfunction: whether emotions are noticed and understood (Awareness, Clarity), accepted without self-judgment (Nonacceptance), tolerated so that goals and actions can be maintained (Goals, Impulse), and managed through effective coping (Strategies). The DERS is the most cited measure of emotion dysregulation in the psychological literature and is widely used in research on borderline personality disorder, PTSD, eating disorders, and substance misuse.',
    measuresDomain: 'Six facets of emotion dysregulation: emotional clarity, awareness, nonacceptance, goal disruption, impulse control, and access to regulation strategies',
    bands: {
      'Minimal difficulties': {
        explanation: 'A DERS total in the 36–52 range indicates few significant difficulties regulating emotions. Emotional responses are generally experienced with awareness, accepted without harsh self-judgment, and managed through effective strategies. Upsets resolve without substantial behavioural disruption.',
        whatThisMeans: ['Emotional awareness and clarity are intact — you can usually name and understand what you feel', 'You are unlikely to feel overwhelmed or out of control by emotional responses', 'You have access to a repertoire of effective regulation strategies and use them flexibly'],
        recommendations: ['Continue practices that support emotional wellbeing — mindfulness, physical activity, and social connection all buffer against dysregulation', 'Rescreening during significant life changes (bereavement, relationship breakdown, burnout) can catch early shifts'],
        relatedDisorders: [],
      },
      'Average range': {
        explanation: 'A DERS score of 53–76 falls within the typical range for community adults. Some difficulties managing emotions in challenging circumstances may occur, but these are not currently causing pervasive or severe impairment. Subscale profiles are informative — elevations on specific subscales (e.g., Impulse, Nonacceptance) warrant attention even within an average total score.',
        whatThisMeans: ['Some emotional challenges are present, particularly under high stress', 'Occasional difficulties accepting or tolerating distress may emerge', 'Regulation capacity may be uneven — more limited under pressure'],
        recommendations: ['Emotion regulation skills training (DBT skills, ACT defusion techniques) can strengthen weaker facets', 'Review the subscale profile to identify the most clinically relevant dimensions', 'Mindfulness-based interventions and cognitive emotion regulation strategies have strong evidence for this range'],
        relatedDisorders: [
          { name: 'Adjustment Disorder', description: 'Difficulties regulating emotions in response to an identifiable stressor.' },
          { name: 'Generalised Anxiety Disorder', description: 'Chronic worry and difficulty tolerating uncertain emotional states.' },
        ],
      },
      'Elevated difficulties': {
        explanation: 'A DERS score of 77–95 is above the community average and approaching the range seen in clinical outpatient populations. Meaningful interference from emotional dysregulation in daily functioning is likely — in relationships, work performance, or subjective wellbeing. Research identifies this zone as clinically significant, particularly when accompanied by elevated Impulse and Strategies subscales.',
        whatThisMeans: ['Emotional experiences are often intense and feel difficult to influence', 'Strong emotions may disrupt goal-directed behaviour and concentration', 'You may react impulsively or shut down when distressed rather than accessing adaptive coping', 'Self-judgment and shame around emotions can prolong and intensify distress'],
        recommendations: ['Individual psychotherapy — particularly DBT, ACT, or Emotion-Focused Therapy — has strong evidence for reducing dysregulation', 'DBT Skills Training groups targeting specific elevated subscales are highly effective', 'Physical exercise and structured daily routines reduce emotional reactivity by stabilising baseline arousal', 'A professional consultation is recommended to discuss the profile in depth'],
        relatedDisorders: [
          { name: 'Borderline Personality Disorder', description: 'Intense and unstable emotional responses with marked impulse dyscontrol.' },
          { name: 'PTSD', description: 'Trauma-related emotion dysregulation including emotional numbing and reactivity.' },
          { name: 'Major Depressive Disorder', description: 'Depression frequently involves both emotional blunting and uncontrollable negative affect.' },
          { name: 'Eating Disorders', description: 'Binge eating, restriction, and purging are often driven by emotion dysregulation.' },
        ],
      },
      'Significant difficulties': {
        explanation: 'A DERS total of 96 or above falls in the range typically observed in clinical inpatient and high-severity outpatient samples. Emotional experiences at this level are likely pervasive, intense, and significantly interfering with multiple life domains. This level of dysregulation is associated with elevated risk for self-harm, substance misuse, interpersonal conflict, and occupational impairment.',
        whatThisMeans: ['Emotions feel overwhelming, uncontrollable, or intolerable much of the time', 'Shame, anger, or despair about your emotional responses themselves is likely frequent', 'Goal-directed behaviour, concentration, and impulse control are substantially compromised', 'Access to effective coping strategies feels very limited when emotionally activated'],
        recommendations: ['Dialectical Behaviour Therapy (DBT) is the gold-standard intervention for severe emotion dysregulation — seek a DBT-trained clinician', 'Prioritise professional mental health support; this level of dysregulation benefits from structured clinical guidance', 'Crisis safety planning may be warranted if emotional distress reaches unsafe levels', 'Pharmacological consultation may help stabilise affect as an adjunct to psychotherapy'],
        relatedDisorders: [
          { name: 'Borderline Personality Disorder', description: 'Severe emotion dysregulation with impulsivity and identity instability — the condition most studied with the DERS.' },
          { name: 'Complex PTSD', description: 'Severe, pervasive dysregulation arising from prolonged interpersonal trauma.' },
          { name: 'Bipolar Disorder', description: 'Affective instability including extreme mood episodes with dysregulated behaviour.' },
          { name: 'Substance Use Disorder', description: 'Many individuals use substances as an emotion regulation strategy at this severity level.' },
          { name: 'Non-suicidal Self-Injury', description: 'Self-harm as a short-term emotion regulation tactic is strongly linked to elevated DERS scores.' },
        ],
      },
    },
    relatedCodes: ['DASS21', 'GAD7', 'PHQ9', 'PCL5', 'RSES', 'FFMQ'],
  },

  // ─── PANAS ─────────────────────────────────────────────────────────────────
  PANAS: {
    overview: 'The Positive and Negative Affect Schedule (PANAS; Watson, Clark & Tellegen, 1988) is a 20-item measure of two orthogonal mood dimensions: Positive Affect (PA) and Negative Affect (NA). PA reflects the extent to which a person feels enthusiastic, active, and alert — high PA is a marker of active engagement with life and is associated with wellbeing, energy, and social connection. NA reflects subjective distress and aversive mood states — high NA is associated with anxiety, depression, and perceived stress. Crucially, PA and NA are independent: a person can be simultaneously high on both, low on both, or high on one and low on the other. The PANAS is the most widely used measure of affective valence in psychological research.',
    measuresDomain: 'Two independent mood dimensions: Positive Affect (energy, enthusiasm, alertness) and Negative Affect (distress, fear, irritability)',
    bands: {
      'Low positive affect': {
        explanation: 'A Positive Affect score below 25 indicates markedly low engagement with positive emotional states. Low PA is one of the clearest psychological markers of depression — specifically the anhedonic subtype characterised by loss of energy, motivation, and pleasure rather than sadness alone. Research by Watson & Clark shows that low PA is more strongly associated with depression than with anxiety.',
        whatThisMeans: ['Energy, enthusiasm, and motivation feel consistently low', 'Positive experiences may feel flat, empty, or hard to engage with', 'This profile is associated with anhedonia — the absence of positive emotion rather than presence of negative emotion', 'Low PA can persist even when acute distress has subsided'],
        recommendations: ['Behavioural activation — systematically scheduling rewarding activities — is the evidence-based first step for increasing PA', 'Physical exercise has the strongest evidence for increasing positive affect, with effects appearing within a single session', 'Social engagement and connection are powerful PA-boosters; isolation deepens the low-PA cycle', 'Assessment for depressive disorder is recommended at this level'],
        relatedDisorders: [
          { name: 'Major Depressive Disorder (anhedonic subtype)', description: 'Characterised by emptiness and low energy rather than sadness alone.' },
          { name: 'Persistent Depressive Disorder', description: 'Chronic low-grade low PA with loss of enjoyment over years.' },
        ],
      },
      'Moderate positive affect': {
        explanation: 'A Positive Affect score in the 25–35 range reflects moderate engagement with positive emotional experience. This is near the population mean and suggests that positive emotional states are accessible, though perhaps not consistently vivid or frequent.',
        whatThisMeans: ['Positive emotions are present but may not be consistently vivid', 'Motivation and energy fluctuate with circumstances', 'This range reflects typical emotional functioning and is not clinically concerning in isolation'],
        recommendations: ['Activities that reliably generate flow, meaning, or connection strengthen PA over time', 'Mindfulness-based savouring practices increase PA by amplifying awareness of positive experiences', 'Review NA score alongside this — moderate PA with high NA suggests anxiety or stress worth addressing'],
        relatedDisorders: [],
      },
      'High positive affect': {
        explanation: 'A Positive Affect score above 35 indicates strong, consistent positive engagement. High PA is a robust predictor of subjective wellbeing, life satisfaction, physical health, and social connectedness. It is a protective factor against depression and burnout.',
        whatThisMeans: ['You consistently experience energy, enthusiasm, and active engagement with life', 'High PA is associated with resilience, better health outcomes, and more satisfying relationships', 'If NA is also elevated, the high activation may partly reflect stress-driven arousal rather than flourishing'],
        recommendations: ['Maintain the conditions that support your current PA level — regular meaningful activity, social connection, and adequate sleep', 'If NA is also elevated, explore stress-reduction and whether the high arousal is sustainable'],
        relatedDisorders: [],
      },
    },
    relatedCodes: ['WHO5', 'WEMWBS', 'PHQ9', 'GAD7', 'SWLS', 'CESD'],
  },

  // ─── ECRR ──────────────────────────────────────────────────────────────────
  ECRR: {
    overview: 'The Experiences in Close Relationships – Revised (ECR-R; Fraley, Waller & Brennan, 2000) is a 36-item assessment of adult romantic attachment on two dimensions derived from Bowlby\'s attachment theory. The Avoidance subscale captures discomfort with closeness and dependency — high scorers value self-reliance and suppress attachment needs. The Anxiety subscale captures fear of abandonment and hyperactivation of attachment needs — high scorers are vigilant to rejection and crave reassurance. Together these dimensions produce four attachment profiles: Secure (low avoidance + low anxiety), Preoccupied (low avoidance + high anxiety), Dismissing (high avoidance + low anxiety), and Fearful (high avoidance + high anxiety). Attachment style shapes relational communication, emotional regulation, and relationship satisfaction.',
    measuresDomain: 'Adult romantic attachment: Avoidance (discomfort with closeness and dependency) and Anxiety (fear of abandonment and need for reassurance)',
    bands: {
      'Secure attachment': {
        explanation: 'A profile with low scores on both Avoidance and Anxiety (subscale means below 2.5) suggests a secure attachment orientation. Secure attachment — the most common style, found in roughly 55–65% of adults — is characterised by comfort with emotional intimacy, a positive working model of both self and others, and the capacity to depend on partners without losing autonomy.',
        whatThisMeans: ['You feel generally comfortable with closeness, dependency, and emotional vulnerability in relationships', 'You have a positive view of both yourself and your partners as reliably available and well-intentioned', 'You can soothe yourself during relationship difficulties without excessive reassurance-seeking or withdrawal', 'Conflict is generally approached as a problem to solve rather than a threat to the relationship'],
        recommendations: ['Secure attachment makes you a strong relational partner — understanding your partner\'s attachment style can help bridge communication gaps', 'Significant trauma, loss, or betrayal can temporarily destabilise even secure attachment — periodic awareness is useful'],
        relatedDisorders: [],
      },
      'Preoccupied attachment': {
        explanation: 'A profile with low Avoidance but elevated Anxiety (avoidance below 2.5, anxiety above 3.5) suggests preoccupied attachment. Preoccupied individuals deeply desire closeness but are hypervigilant to rejection. Relationships feel emotionally intense and often consuming — small signals of distance can trigger significant anxiety.',
        whatThisMeans: ['You crave intimacy but often worry that partners don\'t feel as strongly', 'Small signals of distance or disapproval can trigger intense anxiety and reassurance-seeking', 'You may find it difficult to self-regulate emotionally when the relationship feels uncertain', 'Relationships can feel all-consuming with significant energy invested in monitoring the connection'],
        recommendations: ['Individual therapy — particularly Emotion-Focused Therapy (EFT) or attachment-based approaches — can develop self-soothing capacity', 'Learning to tolerate uncertainty and self-regulate without immediate reassurance breaks the anxious cycle', 'Understanding the anxious-avoidant relationship spiral can prevent escalation with a dismissing partner', 'Mindfulness and somatic practices help create pause between attachment trigger and response'],
        relatedDisorders: [
          { name: 'Dependent Personality Features', description: 'Excessive need for reassurance and fear of separation from close others.' },
          { name: 'Generalised Anxiety Disorder', description: 'Attachment anxiety often co-occurs with general anxiety about loss and safety.' },
          { name: 'Borderline Personality Disorder', description: 'Intense fear of abandonment is a core feature of BPD and strongly linked to anxious attachment.' },
        ],
      },
      'Dismissing attachment': {
        explanation: 'A profile with elevated Avoidance but low Anxiety (avoidance above 3.5, anxiety below 2.5) suggests dismissing attachment. Dismissing individuals value independence and self-reliance, tend to minimise attachment needs, and feel uncomfortable with emotional vulnerability and dependency.',
        whatThisMeans: ['You tend to rely on yourself and feel uncomfortable depending on others emotionally', 'Intimacy and vulnerability may feel threatening rather than rewarding', 'Partners may experience you as emotionally distant or difficult to connect with deeply', 'Under stress, your tendency is to withdraw rather than seek support'],
        recommendations: ['Recognising the early experiences that shaped avoidance can reduce its power over current relationships', 'Gradual experiments in emotional vulnerability — sharing something personal, asking for help — can rewire avoidant responses', 'Attachment-focused therapy helps access underlying attachment needs that have been suppressed'],
        relatedDisorders: [
          { name: 'Avoidant Personality Features', description: 'Emotional withdrawal and difficulty with intimacy driven by underlying fear of rejection.' },
          { name: 'Alexithymia', description: 'Difficulty identifying and expressing emotions, common in dismissing attachment.' },
        ],
      },
      'Fearful attachment': {
        explanation: 'A profile with both elevated Avoidance and elevated Anxiety (both subscale means above 3.5) suggests fearful attachment. Fearful individuals simultaneously desire closeness and fear intimacy — they approach and avoid connection in the same relationship. Past relational pain, betrayal, or trauma is commonly associated with this profile.',
        whatThisMeans: ['You simultaneously want and fear intimacy — closeness feels both desirable and threatening', 'The risk of emotional hurt, rejection, or dependency feels ever-present', 'You may oscillate between emotional closeness and sudden withdrawal within the same relationship', 'Past relational trauma or betrayal is commonly associated with fearful attachment'],
        recommendations: ['Trauma-informed therapy (EMDR, EFT, schema therapy) addresses the underlying relational wound driving the conflict', 'Developing earned security through corrective emotional experiences in therapy or trusted relationships is the core therapeutic goal', 'Psychoeducation about attachment theory helps normalise the experience and reduce shame', 'Group therapy can provide a safe relational context for practicing secure relating'],
        relatedDisorders: [
          { name: 'Complex PTSD', description: 'Fearful attachment is closely linked to chronic interpersonal trauma and C-PTSD.' },
          { name: 'Borderline Personality Disorder', description: 'Approach-avoidance relational patterns are central to BPD phenomenology.' },
          { name: 'Dissociation', description: 'Emotional and relational dissociation can develop as a self-protective response in fearful attachment.' },
        ],
      },
    },
    relatedCodes: ['RSES', 'GAD7', 'PHQ9', 'UCLA', 'DERS', 'IESR'],
  },

  // ─── FFMQ ──────────────────────────────────────────────────────────────────
  FFMQ: {
    overview: 'The Five Facet Mindfulness Questionnaire (FFMQ; Baer et al., 2006) is a 39-item measure of dispositional mindfulness across five empirically derived facets: (1) Observing — noticing internal and external sensory experiences; (2) Describing — labelling experiences with words; (3) Acting with Awareness — attending to present-moment activity rather than functioning on autopilot; (4) Non-judging of inner experience — refraining from evaluating thoughts and feelings as good or bad; and (5) Non-reacting to inner experience — allowing thoughts and feelings to pass without getting caught up in them. The FFMQ was developed by factor-analysing five existing mindfulness scales, and is widely used to evaluate mindfulness-based interventions (MBSR, MBCT) and as an individual profile of psychological flexibility and wellbeing.',
    measuresDomain: 'Five facets of dispositional mindfulness: observing, describing, acting with awareness, non-judging of inner experience, and non-reacting to inner experience',
    bands: {
      'Low mindfulness': {
        explanation: 'An FFMQ total below 86 indicates low dispositional mindfulness. This range is typical of individuals who have not engaged in formal mindfulness practice and who tend to engage with life on autopilot, react automatically to emotional triggers, and evaluate inner experiences harshly. Baer et al. (2006) found scores in this range in community samples with no meditation history.',
        whatThisMeans: ['Much of daily activity occurs on autopilot, with limited deliberate awareness of the present moment', 'Thoughts and feelings are often judged as good, bad, right, or wrong rather than simply observed', 'Emotional reactions tend to be automatic and unexamined, driven by habit rather than choice', 'The subscale profile will identify specific strengths and gaps — not all facets are equally underdeveloped'],
        recommendations: ['Structured mindfulness training (MBSR 8-week programme or MBCT) is the evidence-based approach for building all five facets systematically', 'Daily mindfulness practice — as little as 10 minutes per day — produces measurable changes within 8 weeks', 'Body-scan and breath-awareness practices specifically target the Observing and Acting with Awareness facets', 'Labelling emotions and sensations in words (Describe facet) is a key skill in both mindfulness and DBT'],
        relatedDisorders: [
          { name: 'PTSD / Hypervigilance', description: 'Low mindfulness is associated with trauma-related reactivity and avoidance of internal experience.' },
          { name: 'Generalised Anxiety Disorder', description: 'Rumination and difficulty with present-moment focus are hallmarks of both low mindfulness and GAD.' },
          { name: 'Depression', description: 'Low mindfulness correlates with depressive rumination and lack of present-moment engagement.' },
        ],
      },
      'Below average': {
        explanation: 'An FFMQ total in the 86–117 range falls below the average for community samples (mean ~118; Baer et al., 2006). Some mindful capacities are present but inconsistently applied. There may be pockets of awareness alongside substantial automatic reactivity, self-judgment, or present-moment inattention.',
        whatThisMeans: ['Mindfulness is present as an occasional capacity rather than a consistent orientation', 'Certain facets may be relatively strong while others are underdeveloped — consult the subscale profile', 'Automatic pilot, self-criticism about emotions, and difficulty non-reacting are likely present'],
        recommendations: ['Identify your strongest and weakest facets from the subscale profile for targeted skill development', 'Brief informal mindfulness practices throughout the day (3-minute breathing space) can be easier entry points than formal sitting practice', 'MBCT is particularly effective if low scores appear on the Non-judging or Acting with Awareness facets'],
        relatedDisorders: [
          { name: 'Anxiety Disorders', description: 'Cognitive reactivity and worry reflect below-average Non-reacting and Acting with Awareness.' },
          { name: 'Stress-Related Conditions', description: 'Chronic stress reduces present-moment awareness and increases automaticity.' },
        ],
      },
      'Average to above average': {
        explanation: 'An FFMQ total in the 118–155 range falls at or above the community average. This reflects a meaningful capacity for present-moment awareness, non-reactive observation of internal experience, and emotional labelling. Research shows individuals in this range benefit further from continued practice and stress-reduction programmes.',
        whatThisMeans: ['You have a solid foundation of mindful awareness accessible in daily life', 'You can usually observe your thoughts and feelings without being completely swept away by them', 'Some facets are likely well-developed; others may have room to grow', 'This level is associated with lower stress reactivity, better emotion regulation, and higher wellbeing'],
        recommendations: ['Continue any existing mindfulness practice and explore deepening it', 'Explore advanced practices — loving-kindness, Vipassana, or mindful movement — to develop lower-scoring facets', 'Teaching or sharing mindfulness with others consolidates your own development'],
        relatedDisorders: [],
      },
      'High mindfulness': {
        explanation: 'An FFMQ total above 155 — substantially above the community mean and approaching the range typical of experienced meditators and meditation teachers — reflects a deeply developed mindfulness orientation across multiple facets. This level is associated with significantly lower psychological distress, higher wellbeing, and greater emotional regulation capacity.',
        whatThisMeans: ['Mindful awareness is a consistent feature of your daily experience, not just an occasional skill', 'You can observe thoughts and feelings with equanimity, without needing to suppress or act on them', 'Research links high dispositional mindfulness to better stress response, emotional regulation, and interpersonal functioning'],
        recommendations: ['Continue and deepen your practice — long-term meditators show sustained benefits that accumulate over years', 'Consider sharing or teaching mindfulness, which consolidates your own development', 'Note: a very high Observe score without correspondingly high Non-judging or Non-reacting may indicate heightened sensory sensitivity rather than mindful integration'],
        relatedDisorders: [],
      },
    },
    relatedCodes: ['PSS10', 'DASS21', 'GAD7', 'DERS', 'WHO5', 'OLBI'],
  },
}

export interface IpipDomainInfo {
  label: string
  label_ar: string
  color: string
  low: string
  low_ar: string
  average: string
  average_ar: string
  high: string
  high_ar: string
}

export const IPIP_DOMAINS: Record<string, IpipDomainInfo> = {
  N: {
    label: 'Neuroticism', label_ar: 'العصابية',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    low: 'Emotionally stable, calm, even-tempered, and resilient under stress.',
    low_ar: 'مستقر عاطفياً، هادئ، ومرن تحت الضغط.',
    average: 'Moderate emotional reactivity — experiences stress and negative emotions at a typical level.',
    average_ar: 'تفاعل عاطفي معتدل — يعاني من التوتر والمشاعر السلبية بمستوى نموذجي.',
    high: 'Prone to emotional instability, anxiety, moodiness, and heightened reactions to stress.',
    high_ar: 'عُرضة لعدم الاستقرار العاطفي، القلق، تقلبات المزاج، والتفاعلات المفرطة مع الضغط.',
  },
  E: {
    label: 'Extraversion', label_ar: 'الانبساطية',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    low: 'Introverted — prefers solitude, is reserved, and recharges from quiet, independent activities.',
    low_ar: 'انطوائي — يفضل العزلة والهدوء ويستمد طاقته من الأنشطة المستقلة.',
    average: 'Balanced sociability — comfortable in both social and solitary settings.',
    average_ar: 'اجتماعية متوازنة — مرتاح في البيئات الاجتماعية والمنفردة على حد سواء.',
    high: 'Highly extraverted — energetic, sociable, talkative, and draws energy from social interaction.',
    high_ar: 'انبساطي للغاية — نشيط، اجتماعي، مفوّه، يستمد طاقته من التفاعل الاجتماعي.',
  },
  O: {
    label: 'Openness to Experience', label_ar: 'الانفتاح على التجربة',
    color: 'text-violet-700 bg-violet-50 border-violet-200',
    low: 'Conventional and practical — prefers routine, familiarity, and established ways of doing things.',
    low_ar: 'تقليدي وعملي — يفضل الروتين والمألوف والأساليب المعتادة.',
    average: 'Moderate curiosity and openness — interested in new ideas but also values stability.',
    average_ar: 'فضول واستعداد للتجربة معتدل — مهتم بالأفكار الجديدة مع تقدير الاستقرار.',
    high: 'Highly imaginative, curious, and open to new experiences, ideas, and unconventional viewpoints.',
    high_ar: 'خيال عالٍ، فضول واسع، وانفتاح على التجارب والأفكار الجديدة ووجهات النظر غير التقليدية.',
  },
  A: {
    label: 'Agreeableness', label_ar: 'القبول',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    low: 'Competitive and questioning — values self-interest, may be skeptical of others\' motives.',
    low_ar: 'تنافسي ومتشكك — يقدر مصلحته الخاصة وقد يشكك في دوافع الآخرين.',
    average: 'Moderately agreeable — cooperative and considerate while also asserting own needs.',
    average_ar: 'قبول معتدل — متعاون ومراعٍ مع التعبير عن احتياجاته الخاصة.',
    high: 'Highly cooperative, empathetic, and trusting — prioritises harmony and others\' wellbeing.',
    high_ar: 'تعاوني للغاية، متعاطف، وموثوق — يولي الأولوية للانسجام ورفاهية الآخرين.',
  },
  C: {
    label: 'Conscientiousness', label_ar: 'يقظة الضمير',
    color: 'text-sky-700 bg-sky-50 border-sky-200',
    low: 'Flexible and spontaneous — may be disorganised, impulsive, or prefer going with the flow.',
    low_ar: 'مرن وعفوي — قد يكون غير منظم أو اندفاعي أو يفضل التكيف مع الظروف.',
    average: 'Moderately conscientious — generally organised and dependable with some flexibility.',
    average_ar: 'يقظة الضمير المعتدلة — منظم وموثوق بشكل عام مع بعض المرونة.',
    high: 'Highly organised, disciplined, and goal-directed — strong work ethic and attention to detail.',
    high_ar: 'منظم للغاية، منضبط، وموجه نحو الأهداف — أخلاقيات عمل قوية واهتمام بالتفاصيل.',
  },
}

export function getIpipDomainLevel(score: number): 'low' | 'average' | 'high' {
  if (score < 65) return 'low'
  if (score <= 88) return 'average'
  return 'high'
}
export function getAssessmentContent(code: string): AssessmentContent | null {
  return ASSESSMENT_CONTENT[code] ?? null
}

export function getBandContent(code: string, band: string): BandContent | null {
  const content = ASSESSMENT_CONTENT[code]
  if (!content) return null
  return content.bands[band] ?? Object.values(content.bands).at(-1) ?? null
}

export function getLocalizedBandContent(code: string, band: string, lang: string, arContent?: Record<string, import('./assessment-content-ar').AssessmentContentAr>): BandContent | null {
  const content = ASSESSMENT_CONTENT[code]
  if (!content) return null
  const bc = content.bands[band] ?? Object.values(content.bands).at(-1) ?? null
  if (!bc || lang !== 'ar' || !arContent) return bc
  const arAssessment = arContent[code]
  const arBand = arAssessment?.bands[band] ?? arAssessment?.bands[Object.keys(content.bands).at(-1) ?? ''] ?? null
  return {
    explanation: arBand?.explanation ?? bc.explanation,
    whatThisMeans: arBand?.whatThisMeans ?? bc.whatThisMeans,
    recommendations: arBand?.recommendations ?? bc.recommendations,
    relatedDisorders: arBand?.relatedDisorders ?? bc.relatedDisorders,
  }
}

export function getLocalizedAssessmentMeta(code: string, lang: string, arContent?: Record<string, import('./assessment-content-ar').AssessmentContentAr>): { overview: string; measuresDomain: string } | null {
  const content = ASSESSMENT_CONTENT[code]
  if (!content) return null
  if (lang !== 'ar' || !arContent) return { overview: content.overview, measuresDomain: content.measuresDomain }
  const ar = arContent[code]
  return {
    overview: ar?.overview ?? content.overview,
    measuresDomain: ar?.measuresDomain ?? content.measuresDomain,
  }
}
