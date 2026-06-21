-- ===================================================================
-- PHASE 5: 9 MORE PACKAGES (sort_order 19–27) — VWelfare catalog
-- Idempotent: only inserts if the package name doesn't already exist.
-- ===================================================================

do $$ begin

-- Package 19: V Academic Success Profile
if not exists (select 1 from packages where name_en = 'V Academic Success Profile') then
  with pkg as (
    insert into packages (name_en, name_ar, description_en, description_ar, category, color, status, sort_order, is_prototype, interpretation_bands, output_dimensions)
    values (
      'V Academic Success Profile',
      'ملف النجاح الأكاديمي V',
      'Assess the psychological factors that drive academic persistence, performance, and student wellbeing.',
      'تقييم العوامل النفسية التي تدفع المثابرة الأكاديمية والأداء ورفاهية الطالب.',
      'academic', '#0369A1', 'active', 19, false,
      '[{"min":80,"max":100,"band_en":"Academic Flourishing","band_ar":"ازدهار أكاديمي","color":"#22c55e"},{"min":60,"max":79,"band_en":"On Track","band_ar":"في المسار الصحيح","color":"#f59e0b"},{"min":40,"max":59,"band_en":"Developing","band_ar":"في طور التطوير","color":"#f97316"},{"min":0,"max":39,"band_en":"Needs Support","band_ar":"يحتاج دعماً","color":"#ef4444"}]'::jsonb,
      '[{"key":"academic_persistence","label_en":"Academic Persistence","label_ar":"المثابرة الأكاديمية"},{"key":"wellbeing","label_en":"Student Wellbeing","label_ar":"رفاهية الطالب"},{"key":"stress_management","label_en":"Stress Management","label_ar":"إدارة الضغط"},{"key":"executive_function","label_en":"Executive Function","label_ar":"الوظائف التنفيذية"}]'::jsonb
    ) returning id
  )
  insert into package_assessments (package_id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)
  select pkg.id, code, name_en, name_ar, weight, avail, ord
  from pkg, (values
    ('GRIT',      'Grit Scale',                    'مقياس المثابرة',                   35::numeric, true, 1),
    ('WHO5',      'WHO-5 Wellbeing Index',          'مؤشر الرفاهية WHO-5',              25::numeric, true, 2),
    ('EXEC_FUNC', 'Executive Function Assessment',  'تقييم الوظائف التنفيذية',          25::numeric, true, 3),
    ('DASS21',    'DASS-21',                        'مقياس الاكتئاب والقلق والإجهاد',   15::numeric, true, 4)
  ) as a(code, name_en, name_ar, weight, avail, ord);
end if;

-- Package 20: V Career Direction Profile
if not exists (select 1 from packages where name_en = 'V Career Direction Profile') then
  with pkg as (
    insert into packages (name_en, name_ar, description_en, description_ar, category, color, status, sort_order, is_prototype, interpretation_bands, output_dimensions)
    values (
      'V Career Direction Profile',
      'ملف التوجه المهني V',
      'Support career exploration and development planning by assessing personality, persistence, and professional strengths.',
      'دعم استكشاف المسار المهني والتخطيط للتطوير من خلال تقييم الشخصية والمثابرة ونقاط القوة المهنية.',
      'employment', '#7C3AED', 'active', 20, false,
      '[{"min":80,"max":100,"band_en":"Career Ready","band_ar":"جاهز مهنياً","color":"#22c55e"},{"min":60,"max":79,"band_en":"Well Positioned","band_ar":"في وضع جيد","color":"#f59e0b"},{"min":40,"max":59,"band_en":"Developing","band_ar":"في طور التطوير","color":"#f97316"},{"min":0,"max":39,"band_en":"Foundation Building","band_ar":"بناء الأساس","color":"#ef4444"}]'::jsonb,
      '[{"key":"career_readiness","label_en":"Career Readiness","label_ar":"الاستعداد المهني"},{"key":"professional_resilience","label_en":"Professional Resilience","label_ar":"المرونة المهنية"},{"key":"interpersonal_skills","label_en":"Interpersonal Skills","label_ar":"المهارات التواصلية"},{"key":"goal_persistence","label_en":"Goal Persistence","label_ar":"المثابرة نحو الأهداف"}]'::jsonb
    ) returning id
  )
  insert into package_assessments (package_id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)
  select pkg.id, code, name_en, name_ar, weight, avail, ord
  from pkg, (values
    ('IPIP120',    'Big Five Personality (IPIP-120)', 'الشخصية الخمسة الكبرى IPIP-120',  35::numeric, true, 1),
    ('GRIT',       'Grit Scale',                     'مقياس المثابرة',                   30::numeric, true, 2),
    ('RESILIENCE', 'Brief Resilience Scale',          'مقياس المرونة المختصر',            20::numeric, true, 3),
    ('EQ',         'Emotional Intelligence',          'الذكاء العاطفي',                   15::numeric, true, 4)
  ) as a(code, name_en, name_ar, weight, avail, ord);
end if;

-- Package 21: V Athlete Mental Performance Profile
if not exists (select 1 from packages where name_en = 'V Athlete Mental Performance Profile') then
  with pkg as (
    insert into packages (name_en, name_ar, description_en, description_ar, category, color, status, sort_order, is_prototype, interpretation_bands, output_dimensions)
    values (
      'V Athlete Mental Performance Profile',
      'ملف الأداء النفسي الرياضي V',
      'Assess the psychological strengths associated with athletic performance: mental toughness, resilience, emotional control, and recovery.',
      'تقييم نقاط القوة النفسية المرتبطة بالأداء الرياضي: الصلابة النفسية والمرونة والتحكم العاطفي والتعافي.',
      'general', '#0369A1', 'active', 21, false,
      '[{"min":80,"max":100,"band_en":"Elite Mental Readiness","band_ar":"جاهزية نفسية نخبوية","color":"#22c55e"},{"min":60,"max":79,"band_en":"Competitive","band_ar":"تنافسي","color":"#f59e0b"},{"min":40,"max":59,"band_en":"Developing","band_ar":"في طور التطوير","color":"#f97316"},{"min":0,"max":39,"band_en":"Foundation Phase","band_ar":"مرحلة التأسيس","color":"#ef4444"}]'::jsonb,
      '[{"key":"mental_toughness","label_en":"Mental Toughness","label_ar":"الصلابة النفسية"},{"key":"performance_resilience","label_en":"Performance Resilience","label_ar":"مرونة الأداء"},{"key":"competitive_drive","label_en":"Competitive Drive","label_ar":"الدافعية التنافسية"},{"key":"emotional_control","label_en":"Emotional Control","label_ar":"التحكم العاطفي"}]'::jsonb
    ) returning id
  )
  insert into package_assessments (package_id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)
  select pkg.id, code, name_en, name_ar, weight, avail, ord
  from pkg, (values
    ('GRIT',       'Grit Scale',              'مقياس المثابرة',          30::numeric, true, 1),
    ('RESILIENCE', 'Brief Resilience Scale',  'مقياس المرونة المختصر',   30::numeric, true, 2),
    ('WHO5',       'WHO-5 Wellbeing Index',   'مؤشر الرفاهية WHO-5',     20::numeric, true, 3),
    ('EQ',         'Emotional Intelligence',  'الذكاء العاطفي',           20::numeric, true, 4)
  ) as a(code, name_en, name_ar, weight, avail, ord);
end if;

-- Package 22: V Family Resilience Profile
if not exists (select 1 from packages where name_en = 'V Family Resilience Profile') then
  with pkg as (
    insert into packages (name_en, name_ar, description_en, description_ar, category, color, status, sort_order, is_prototype, interpretation_bands, output_dimensions)
    values (
      'V Family Resilience Profile',
      'ملف المرونة الأسرية V',
      'Assess family strengths, coping resources, emotional wellbeing, and resilience factors that support healthy family functioning.',
      'تقييم نقاط قوة الأسرة وموارد التكيف والرفاهية العاطفية وعوامل المرونة التي تدعم الأداء الأسري الصحي.',
      'marriage', '#10b981', 'active', 22, false,
      '[{"min":80,"max":100,"band_en":"Thriving Family","band_ar":"أسرة مزدهرة","color":"#22c55e"},{"min":60,"max":79,"band_en":"Stable","band_ar":"مستقرة","color":"#f59e0b"},{"min":40,"max":59,"band_en":"Under Pressure","band_ar":"تحت ضغط","color":"#f97316"},{"min":0,"max":39,"band_en":"Needs Support","band_ar":"تحتاج دعماً","color":"#ef4444"}]'::jsonb,
      '[{"key":"family_resilience","label_en":"Family Resilience","label_ar":"المرونة الأسرية"},{"key":"emotional_wellbeing","label_en":"Emotional Wellbeing","label_ar":"الرفاهية العاطفية"},{"key":"communication_quality","label_en":"Communication Quality","label_ar":"جودة التواصل"},{"key":"stress_management","label_en":"Stress Management","label_ar":"إدارة الضغط"}]'::jsonb
    ) returning id
  )
  insert into package_assessments (package_id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)
  select pkg.id, code, name_en, name_ar, weight, avail, ord
  from pkg, (values
    ('RESILIENCE', 'Brief Resilience Scale',        'مقياس المرونة المختصر',         35::numeric, true, 1),
    ('WHO5',       'WHO-5 Wellbeing Index',          'مؤشر الرفاهية WHO-5',           25::numeric, true, 2),
    ('EQ',         'Emotional Intelligence',         'الذكاء العاطفي',                25::numeric, true, 3),
    ('ATTACHMENT', 'Attachment Style Assessment',    'تقييم نمط التعلق',              15::numeric, true, 4)
  ) as a(code, name_en, name_ar, weight, avail, ord);
end if;

-- Package 23: V Relationship Communication Profile
if not exists (select 1 from packages where name_en = 'V Relationship Communication Profile') then
  with pkg as (
    insert into packages (name_en, name_ar, description_en, description_ar, category, color, status, sort_order, is_prototype, interpretation_bands, output_dimensions)
    values (
      'V Relationship Communication Profile',
      'ملف التواصل في العلاقات V',
      'Assess communication patterns, emotional expression, and interpersonal effectiveness within intimate and family relationships.',
      'تقييم أنماط التواصل والتعبير العاطفي والفعالية الشخصية في العلاقات الحميمة والأسرية.',
      'marriage', '#DB2777', 'active', 23, false,
      '[{"min":80,"max":100,"band_en":"Highly Effective","band_ar":"فعّال للغاية","color":"#22c55e"},{"min":60,"max":79,"band_en":"Generally Effective","band_ar":"فعّال بشكل عام","color":"#f59e0b"},{"min":40,"max":59,"band_en":"Developing Skills","band_ar":"تطوير المهارات","color":"#f97316"},{"min":0,"max":39,"band_en":"Needs Development","band_ar":"يحتاج تطويراً","color":"#ef4444"}]'::jsonb,
      '[{"key":"communication_effectiveness","label_en":"Communication Effectiveness","label_ar":"فعالية التواصل"},{"key":"emotional_expression","label_en":"Emotional Expression","label_ar":"التعبير العاطفي"},{"key":"conflict_resolution","label_en":"Conflict Resolution","label_ar":"حل النزاعات"},{"key":"relational_security","label_en":"Relational Security","label_ar":"الأمان العلائقي"}]'::jsonb
    ) returning id
  )
  insert into package_assessments (package_id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)
  select pkg.id, code, name_en, name_ar, weight, avail, ord
  from pkg, (values
    ('EQ',         'Emotional Intelligence',         'الذكاء العاطفي',                35::numeric, true, 1),
    ('ATTACHMENT', 'Attachment Style Assessment',    'تقييم نمط التعلق',              30::numeric, true, 2),
    ('RESILIENCE', 'Brief Resilience Scale',         'مقياس المرونة المختصر',          20::numeric, true, 3),
    ('DASS21',     'DASS-21',                        'مقياس الاكتئاب والقلق والإجهاد', 15::numeric, true, 4)
  ) as a(code, name_en, name_ar, weight, avail, ord);
end if;

-- Package 24: V Trauma & Resilience Profile
if not exists (select 1 from packages where name_en = 'V Trauma & Resilience Profile') then
  with pkg as (
    insert into packages (name_en, name_ar, description_en, description_ar, category, color, status, sort_order, is_prototype, interpretation_bands, output_dimensions)
    values (
      'V Trauma & Resilience Profile',
      'ملف الصدمة والمرونة V',
      'Screen trauma-related impacts and identify resilience and recovery resources. This is a screening tool — not a diagnostic instrument.',
      'فحص التأثيرات المرتبطة بالصدمة وتحديد موارد المرونة والتعافي. هذه أداة فحص — وليست أداة تشخيص.',
      'general', '#6b7280', 'active', 24, false,
      '[{"min":80,"max":100,"band_en":"Strong Recovery","band_ar":"تعافٍ قوي","color":"#22c55e"},{"min":60,"max":79,"band_en":"Adapting","band_ar":"في طور التكيف","color":"#f59e0b"},{"min":40,"max":59,"band_en":"Struggling","band_ar":"يواجه صعوبة","color":"#f97316"},{"min":0,"max":39,"band_en":"Needs Professional Support","band_ar":"يحتاج دعماً متخصصاً","color":"#ef4444"}]'::jsonb,
      '[{"key":"recovery_capacity","label_en":"Recovery Capacity","label_ar":"قدرة التعافي"},{"key":"psychological_resilience","label_en":"Psychological Resilience","label_ar":"المرونة النفسية"},{"key":"emotional_wellbeing","label_en":"Emotional Wellbeing","label_ar":"الرفاهية العاطفية"},{"key":"trauma_impact","label_en":"Trauma Impact Indicators","label_ar":"مؤشرات تأثير الصدمة"}]'::jsonb
    ) returning id
  )
  insert into package_assessments (package_id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)
  select pkg.id, code, name_en, name_ar, weight, avail, ord
  from pkg, (values
    ('RESILIENCE', 'Brief Resilience Scale',         'مقياس المرونة المختصر',          35::numeric, true,  1),
    ('WHO5',       'WHO-5 Wellbeing Index',           'مؤشر الرفاهية WHO-5',            25::numeric, true,  2),
    ('DASS21',     'DASS-21',                         'مقياس الاكتئاب والقلق والإجهاد', 25::numeric, true,  3),
    ('PCL5',       'PCL-5 Trauma Checklist',          'قائمة فحص الصدمة PCL-5',         15::numeric, false, 4)
  ) as a(code, name_en, name_ar, weight, avail, ord);
end if;

-- Package 25: V Anxiety & Stress Profile
if not exists (select 1 from packages where name_en = 'V Anxiety & Stress Profile') then
  with pkg as (
    insert into packages (name_en, name_ar, description_en, description_ar, category, color, status, sort_order, is_prototype, interpretation_bands, output_dimensions)
    values (
      'V Anxiety & Stress Profile',
      'ملف القلق والضغط النفسي V',
      'Assess anxiety symptoms, perceived stress burden, and coping resources. This is a screening tool for awareness — not a clinical diagnosis.',
      'تقييم أعراض القلق وعبء الضغط المُدرَك وموارد التكيف. هذه أداة فحص للوعي — وليست تشخيصاً سريرياً.',
      'general', '#f59e0b', 'active', 25, false,
      '[{"min":80,"max":100,"band_en":"Calm & Coping Well","band_ar":"هادئ ويتكيف جيداً","color":"#22c55e"},{"min":60,"max":79,"band_en":"Manageable","band_ar":"قابل للإدارة","color":"#f59e0b"},{"min":40,"max":59,"band_en":"Moderate Concern","band_ar":"قلق معتدل","color":"#f97316"},{"min":0,"max":39,"band_en":"High Burden","band_ar":"عبء مرتفع","color":"#ef4444"}]'::jsonb,
      '[{"key":"anxiety_level","label_en":"Anxiety Level","label_ar":"مستوى القلق"},{"key":"stress_burden","label_en":"Stress Burden","label_ar":"عبء الضغط"},{"key":"coping_capacity","label_en":"Coping Capacity","label_ar":"قدرة التكيف"},{"key":"wellbeing","label_en":"Emotional Wellbeing","label_ar":"الرفاهية العاطفية"}]'::jsonb
    ) returning id
  )
  insert into package_assessments (package_id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)
  select pkg.id, code, name_en, name_ar, weight, avail, ord
  from pkg, (values
    ('DASS21',     'DASS-21 (Anxiety & Stress Subscales)', 'مقياس DASS-21 (أبعاد القلق والإجهاد)', 35::numeric, true,  1),
    ('WHO5',       'WHO-5 Wellbeing Index',                'مؤشر الرفاهية WHO-5',                  25::numeric, true,  2),
    ('RESILIENCE', 'Brief Resilience Scale',               'مقياس المرونة المختصر',                 25::numeric, true,  3),
    ('GAD7',       'GAD-7 Anxiety Scale',                  'مقياس GAD-7 للقلق',                    15::numeric, false, 4)
  ) as a(code, name_en, name_ar, weight, avail, ord);
end if;

-- Package 26: V Depression Screening Profile
if not exists (select 1 from packages where name_en = 'V Depression Screening Profile') then
  with pkg as (
    insert into packages (name_en, name_ar, description_en, description_ar, category, color, status, sort_order, is_prototype, interpretation_bands, output_dimensions)
    values (
      'V Depression Screening Profile',
      'ملف فحص الاكتئاب V',
      'Screen for depressive symptoms and evaluate wellbeing and protective resources. For awareness and support planning — not clinical diagnosis.',
      'فحص أعراض الاكتئاب وتقييم الرفاهية والموارد الوقائية. للوعي وتخطيط الدعم — وليس للتشخيص السريري.',
      'general', '#DC2626', 'active', 26, false,
      '[{"min":80,"max":100,"band_en":"Positive Wellbeing","band_ar":"رفاهية إيجابية","color":"#22c55e"},{"min":60,"max":79,"band_en":"Mild Symptoms","band_ar":"أعراض خفيفة","color":"#f59e0b"},{"min":40,"max":59,"band_en":"Moderate Symptoms","band_ar":"أعراض معتدلة","color":"#f97316"},{"min":0,"max":39,"band_en":"Significant Symptoms","band_ar":"أعراض ملحوظة","color":"#ef4444"}]'::jsonb,
      '[{"key":"mood","label_en":"Mood Indicators","label_ar":"مؤشرات المزاج"},{"key":"wellbeing","label_en":"Psychological Wellbeing","label_ar":"الرفاهية النفسية"},{"key":"resilience","label_en":"Protective Resilience","label_ar":"المرونة الوقائية"},{"key":"functional_impact","label_en":"Functional Impact","label_ar":"التأثير الوظيفي"}]'::jsonb
    ) returning id
  )
  insert into package_assessments (package_id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)
  select pkg.id, code, name_en, name_ar, weight, avail, ord
  from pkg, (values
    ('DASS21',     'DASS-21 (Depression Subscale)', 'مقياس DASS-21 (بُعد الاكتئاب)', 40::numeric, true,  1),
    ('WHO5',       'WHO-5 Wellbeing Index',         'مؤشر الرفاهية WHO-5',           30::numeric, true,  2),
    ('RESILIENCE', 'Brief Resilience Scale',        'مقياس المرونة المختصر',          20::numeric, true,  3),
    ('PHQ9',       'PHQ-9 Depression Scale',        'مقياس PHQ-9 للاكتئاب',          10::numeric, false, 4)
  ) as a(code, name_en, name_ar, weight, avail, ord);
end if;

-- Package 27: V Healthy Lifestyle Profile
if not exists (select 1 from packages where name_en = 'V Healthy Lifestyle Profile') then
  with pkg as (
    insert into packages (name_en, name_ar, description_en, description_ar, category, color, status, sort_order, is_prototype, interpretation_bands, output_dimensions)
    values (
      'V Healthy Lifestyle Profile',
      'ملف نمط الحياة الصحية V',
      'Evaluate lifestyle factors — sleep quality, stress burden, wellbeing, and recovery — that influence mental health and sustainable performance.',
      'تقييم عوامل نمط الحياة — جودة النوم وعبء الضغط والرفاهية والتعافي — التي تؤثر على الصحة النفسية والأداء المستدام.',
      'general', '#16a34a', 'active', 27, false,
      '[{"min":80,"max":100,"band_en":"Optimal Lifestyle","band_ar":"نمط حياة مثالي","color":"#22c55e"},{"min":60,"max":79,"band_en":"Balanced","band_ar":"متوازن","color":"#f59e0b"},{"min":40,"max":59,"band_en":"Needs Attention","band_ar":"يحتاج اهتماماً","color":"#f97316"},{"min":0,"max":39,"band_en":"High Risk Factors","band_ar":"عوامل خطر مرتفعة","color":"#ef4444"}]'::jsonb,
      '[{"key":"lifestyle_wellness","label_en":"Lifestyle Wellness","label_ar":"عافية نمط الحياة"},{"key":"stress_management","label_en":"Stress Management","label_ar":"إدارة الضغط"},{"key":"recovery_capacity","label_en":"Recovery Capacity","label_ar":"قدرة التعافي"},{"key":"sleep_health","label_en":"Sleep Health","label_ar":"صحة النوم"}]'::jsonb
    ) returning id
  )
  insert into package_assessments (package_id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)
  select pkg.id, code, name_en, name_ar, weight, avail, ord
  from pkg, (values
    ('WHO5',       'WHO-5 Wellbeing Index',               'مؤشر الرفاهية WHO-5',                35::numeric, true,  1),
    ('RESILIENCE', 'Brief Resilience Scale',              'مقياس المرونة المختصر',               30::numeric, true,  2),
    ('DASS21',     'DASS-21 (Stress Subscale)',            'مقياس DASS-21 (بُعد الإجهاد)',        20::numeric, true,  3),
    ('ESS',        'Epworth Sleepiness Scale',            'مقياس إبورث للنعاس',                 15::numeric, false, 4)
  ) as a(code, name_en, name_ar, weight, avail, ord);
end if;

end $$;
