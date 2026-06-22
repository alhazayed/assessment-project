-- ===================================================================
-- PHASE 4: FULL 18-PACKAGE LIBRARY SEED
-- Adds 14 packages to complement the 4 seeded in 20260620100000.
-- Idempotent: only inserts if the package name doesn't already exist.
-- ===================================================================

do $$ begin

-- Helper function (inline): insert package + assessments if not present
-- Package 5: Relationship Communication
if not exists (select 1 from packages where name_en = 'Relationship Communication Package') then
  with pkg as (
    insert into packages (name_en, name_ar, description_en, description_ar, category, status, color,
      index_name_en, index_name_ar, interpretation_bands, output_dimensions, sort_order, is_prototype)
    values (
      'Relationship Communication Package',
      'باقة التواصل في العلاقات',
      'Assesses communication effectiveness, conflict resolution capacity, and emotional availability in partnerships.',
      'تقيّم فعالية التواصل وقدرة حل التنازعات والتوفر العاطفي في الشراكات.',
      'marriage', 'draft', '#EC4899',
      'Relationship Communication Index', 'مؤشر التواصل العلائقي',
      '[
        {"min":80,"max":100,"band_en":"Strong Communication Foundation","band_ar":"أساس تواصلي قوي","color":"#22c55e"},
        {"min":60,"max":79,"band_en":"Developing Communication Skills","band_ar":"مهارات تواصلية في طور التطوير","color":"#f59e0b"},
        {"min":40,"max":59,"band_en":"Communication Gaps Present","band_ar":"فجوات تواصلية موجودة","color":"#f97316"},
        {"min":0,"max":39,"band_en":"Significant Support Recommended","band_ar":"يُنصح بدعم مكثف","color":"#ef4444"}
      ]'::jsonb,
      '[
        {"key":"emotional_attunement","label_en":"Emotional Attunement","label_ar":"التوافق العاطفي"},
        {"key":"conflict_resolution","label_en":"Conflict Resolution Capacity","label_ar":"قدرة حل التنازعات"},
        {"key":"attachment_security","label_en":"Attachment Security","label_ar":"أمان التعلق"},
        {"key":"communication_clarity","label_en":"Communication Clarity","label_ar":"وضوح التواصل"}
      ]'::jsonb,
      5, true
    ) returning id
  )
  insert into package_assessments (package_id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)
  select pkg.id, code, name_en, name_ar, weight_pct, available, ord from pkg, (values
    ('EQ',         'Emotional Intelligence Assessment',   'تقييم الذكاء العاطفي',               35::numeric, false, 1),
    ('ATTACHMENT', 'Attachment Style Assessment',         'تقييم نمط التعلق',                   30::numeric, false, 2),
    ('IPIP120',    'Big Five Personality Assessment',     'تقييم الشخصية الخمسة الكبرى',        20::numeric, true,  3),
    ('DASS21',     'DASS-21',                             'مقياس الاكتئاب والقلق والإجهاد',     15::numeric, true,  4)
  ) as t(code, name_en, name_ar, weight_pct, available, ord);
end if;

-- Package 6: Emotional Wellbeing
if not exists (select 1 from packages where name_en = 'Emotional Wellbeing Package') then
  with pkg as (
    insert into packages (name_en, name_ar, description_en, description_ar, category, status, color,
      index_name_en, index_name_ar, interpretation_bands, output_dimensions, sort_order, is_prototype)
    values (
      'Emotional Wellbeing Package',
      'باقة الرفاهية العاطفية',
      'Evaluates emotional regulation, psychological wellbeing, and capacity for self-care and resilience.',
      'تقيّم التنظيم العاطفي والرفاهية النفسية والقدرة على الرعاية الذاتية والمرونة.',
      'general', 'draft', '#8B5CF6',
      'Emotional Wellbeing Index', 'مؤشر الرفاهية العاطفية',
      '[
        {"min":75,"max":100,"band_en":"Flourishing","band_ar":"ازدهار","color":"#22c55e"},
        {"min":55,"max":74,"band_en":"Moderate Wellbeing","band_ar":"رفاهية معتدلة","color":"#f59e0b"},
        {"min":35,"max":54,"band_en":"Some Challenges","band_ar":"بعض التحديات","color":"#f97316"},
        {"min":0,"max":34,"band_en":"Support Recommended","band_ar":"يُنصح بالدعم","color":"#ef4444"}
      ]'::jsonb,
      '[
        {"key":"wellbeing_quality","label_en":"Wellbeing Quality","label_ar":"جودة الرفاهية"},
        {"key":"resilience_capacity","label_en":"Resilience Capacity","label_ar":"قدرة المرونة"},
        {"key":"emotional_regulation","label_en":"Emotional Regulation","label_ar":"التنظيم العاطفي"},
        {"key":"distress_indicators","label_en":"Distress Indicators","label_ar":"مؤشرات الضيق"}
      ]'::jsonb,
      6, true
    ) returning id
  )
  insert into package_assessments (package_id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)
  select pkg.id, code, name_en, name_ar, weight_pct, available, ord from pkg, (values
    ('WHO5',       'Wellbeing Assessment (WHO-5)',         'تقييم الرفاهية (WHO-5)',              30::numeric, true,  1),
    ('RESILIENCE', 'Resilience Assessment',               'تقييم المرونة النفسية',              25::numeric, false, 2),
    ('DASS21',     'DASS-21',                             'مقياس الاكتئاب والقلق والإجهاد',     25::numeric, true,  3),
    ('EQ',         'Emotional Intelligence Assessment',   'تقييم الذكاء العاطفي',               20::numeric, false, 4)
  ) as t(code, name_en, name_ar, weight_pct, available, ord);
end if;

-- Package 7: Professional Development
if not exists (select 1 from packages where name_en = 'Professional Development Package') then
  with pkg as (
    insert into packages (name_en, name_ar, description_en, description_ar, category, status, color,
      index_name_en, index_name_ar, interpretation_bands, output_dimensions, sort_order, is_prototype)
    values (
      'Professional Development Package',
      'باقة التطوير المهني',
      'Targets career advancement readiness, decision-making under pressure, and personality traits supporting professional growth.',
      'تستهدف استعداد الترقية الوظيفية وصنع القرارات تحت الضغط والسمات الشخصية التي تدعم النمو المهني.',
      'employment', 'draft', '#06B6D4',
      'Professional Development Index', 'مؤشر التطوير المهني',
      '[
        {"min":80,"max":100,"band_en":"High Growth Potential","band_ar":"إمكانات نمو عالية","color":"#22c55e"},
        {"min":60,"max":79,"band_en":"Solid Foundation","band_ar":"أساس متين","color":"#f59e0b"},
        {"min":40,"max":59,"band_en":"Developing","band_ar":"في طور التطوير","color":"#f97316"},
        {"min":0,"max":39,"band_en":"Early Stage","band_ar":"مرحلة أولى","color":"#ef4444"}
      ]'::jsonb,
      '[
        {"key":"decision_quality","label_en":"Decision Quality","label_ar":"جودة القرار"},
        {"key":"career_resilience","label_en":"Career Resilience","label_ar":"المرونة المهنية"},
        {"key":"interpersonal_fit","label_en":"Interpersonal Fit","label_ar":"التوافق البيني"},
        {"key":"professional_stability","label_en":"Professional Stability","label_ar":"الاستقرار المهني"}
      ]'::jsonb,
      7, true
    ) returning id
  )
  insert into package_assessments (package_id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)
  select pkg.id, code, name_en, name_ar, weight_pct, available, ord from pkg, (values
    ('DECISION',   'Decision-Making Assessment',          'تقييم صنع القرار',                   30::numeric, false, 1),
    ('RESILIENCE', 'Resilience Assessment',               'تقييم المرونة النفسية',              25::numeric, false, 2),
    ('IPIP120',    'Big Five Personality Assessment',     'تقييم الشخصية الخمسة الكبرى',        25::numeric, true,  3),
    ('EQ',         'Emotional Intelligence Assessment',   'تقييم الذكاء العاطفي',               20::numeric, false, 4)
  ) as t(code, name_en, name_ar, weight_pct, available, ord);
end if;

-- Package 8: Team Leadership
if not exists (select 1 from packages where name_en = 'Team Leadership Package') then
  with pkg as (
    insert into packages (name_en, name_ar, description_en, description_ar, category, status, color,
      index_name_en, index_name_ar, interpretation_bands, output_dimensions, sort_order, is_prototype)
    values (
      'Team Leadership Package',
      'باقة قيادة الفريق',
      'Focuses on team influence, collaborative problem-solving, and group dynamics management skills.',
      'تركز على التأثير في الفريق وحل المشاكل بشكل تعاوني ومهارات إدارة ديناميكيات المجموعة.',
      'leadership', 'draft', '#F59E0B',
      'Team Leadership Index', 'مؤشر قيادة الفريق',
      '[
        {"min":80,"max":100,"band_en":"Strong Team Leader","band_ar":"قائد فريق قوي","color":"#22c55e"},
        {"min":60,"max":79,"band_en":"Emerging Team Leader","band_ar":"قائد فريق ناشئ","color":"#f59e0b"},
        {"min":40,"max":59,"band_en":"Developing","band_ar":"في طور التطوير","color":"#f97316"},
        {"min":0,"max":39,"band_en":"Early Stage","band_ar":"مرحلة أولى","color":"#ef4444"}
      ]'::jsonb,
      '[
        {"key":"team_influence","label_en":"Team Influence","label_ar":"التأثير في الفريق"},
        {"key":"collaborative_capacity","label_en":"Collaborative Capacity","label_ar":"قدرة التعاون"},
        {"key":"adaptive_response","label_en":"Adaptive Response","label_ar":"الاستجابة التكيفية"}
      ]'::jsonb,
      8, true
    ) returning id
  )
  insert into package_assessments (package_id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)
  select pkg.id, code, name_en, name_ar, weight_pct, available, ord from pkg, (values
    ('EQ',         'Emotional Intelligence Assessment',   'تقييم الذكاء العاطفي',               35::numeric, false, 1),
    ('IPIP120',    'Big Five Personality Assessment',     'تقييم الشخصية الخمسة الكبرى',        25::numeric, true,  2),
    ('RESILIENCE', 'Resilience Assessment',               'تقييم المرونة النفسية',              20::numeric, false, 3),
    ('DECISION',   'Decision-Making Assessment',          'تقييم صنع القرار',                   20::numeric, false, 4)
  ) as t(code, name_en, name_ar, weight_pct, available, ord);
end if;

-- Package 9: Executive Decision-Making
if not exists (select 1 from packages where name_en = 'Executive Decision-Making Package') then
  with pkg as (
    insert into packages (name_en, name_ar, description_en, description_ar, category, status, color,
      index_name_en, index_name_ar, interpretation_bands, output_dimensions, sort_order, is_prototype)
    values (
      'Executive Decision-Making Package',
      'باقة صنع القرار التنفيذي',
      'Evaluates strategic decision capacity, cognitive flexibility, and resilience under high-stakes conditions.',
      'تقيّم القدرة على اتخاذ القرارات الاستراتيجية والمرونة المعرفية والصمود في ظروف عالية المخاطر.',
      'leadership', 'draft', '#DC2626',
      'Executive Decision Index', 'مؤشر القرار التنفيذي',
      '[
        {"min":80,"max":100,"band_en":"Strategic Decision Strength","band_ar":"قوة القرار الاستراتيجي","color":"#22c55e"},
        {"min":60,"max":79,"band_en":"Sound Decision Foundation","band_ar":"أساس قرار متين","color":"#f59e0b"},
        {"min":40,"max":59,"band_en":"Developing","band_ar":"في طور التطوير","color":"#f97316"},
        {"min":0,"max":39,"band_en":"Needs Development","band_ar":"يحتاج إلى تطوير","color":"#ef4444"}
      ]'::jsonb,
      '[
        {"key":"strategic_thinking","label_en":"Strategic Thinking","label_ar":"التفكير الاستراتيجي"},
        {"key":"pressure_decision","label_en":"Decision Under Pressure","label_ar":"القرار تحت الضغط"},
        {"key":"leadership_resilience","label_en":"Leadership Resilience","label_ar":"مرونة القيادة"}
      ]'::jsonb,
      9, true
    ) returning id
  )
  insert into package_assessments (package_id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)
  select pkg.id, code, name_en, name_ar, weight_pct, available, ord from pkg, (values
    ('DECISION',   'Decision-Making Assessment',          'تقييم صنع القرار',                   35::numeric, false, 1),
    ('RESILIENCE', 'Resilience Assessment',               'تقييم المرونة النفسية',              25::numeric, false, 2),
    ('IPIP120',    'Big Five Personality Assessment',     'تقييم الشخصية الخمسة الكبرى',        20::numeric, true,  3),
    ('EQ',         'Emotional Intelligence Assessment',   'تقييم الذكاء العاطفي',               20::numeric, false, 4)
  ) as t(code, name_en, name_ar, weight_pct, available, ord);
end if;

-- Package 10: Student Success
if not exists (select 1 from packages where name_en = 'Student Success Package') then
  with pkg as (
    insert into packages (name_en, name_ar, description_en, description_ar, category, status, color,
      index_name_en, index_name_ar, interpretation_bands, output_dimensions, sort_order, is_prototype)
    values (
      'Student Success Package',
      'باقة نجاح الطالب',
      'Emphasizes executive function, stress management, and wellbeing as predictors of academic achievement.',
      'تركز على الوظائف التنفيذية وإدارة الإجهاد والرفاهية كمؤشرات للإنجاز الأكاديمي.',
      'academic', 'draft', '#10B981',
      'Student Success Index', 'مؤشر نجاح الطالب',
      '[
        {"min":80,"max":100,"band_en":"Strong Academic Potential","band_ar":"إمكانية أكاديمية قوية","color":"#22c55e"},
        {"min":60,"max":79,"band_en":"Good Academic Foundation","band_ar":"أساس أكاديمي جيد","color":"#f59e0b"},
        {"min":40,"max":59,"band_en":"Developing","band_ar":"في طور التطوير","color":"#f97316"},
        {"min":0,"max":39,"band_en":"Support Recommended","band_ar":"يُنصح بالدعم","color":"#ef4444"}
      ]'::jsonb,
      '[
        {"key":"executive_readiness","label_en":"Executive Readiness","label_ar":"الجاهزية التنفيذية"},
        {"key":"stress_management","label_en":"Stress Management","label_ar":"إدارة الإجهاد"},
        {"key":"learning_wellbeing","label_en":"Learning Wellbeing","label_ar":"رفاهية التعلم"}
      ]'::jsonb,
      10, true
    ) returning id
  )
  insert into package_assessments (package_id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)
  select pkg.id, code, name_en, name_ar, weight_pct, available, ord from pkg, (values
    ('EXEC_FUNC',  'Executive Function Assessment',        'تقييم الوظائف التنفيذية',            30::numeric, false, 1),
    ('RESILIENCE', 'Resilience Assessment',               'تقييم المرونة النفسية',              25::numeric, false, 2),
    ('WHO5',       'Wellbeing Assessment (WHO-5)',         'تقييم الرفاهية (WHO-5)',              25::numeric, true,  3),
    ('DASS21',     'Stress Assessment (DASS-21)',           'تقييم الإجهاد (DASS-21)',             20::numeric, true,  4)
  ) as t(code, name_en, name_ar, weight_pct, available, ord);
end if;

-- Package 11: Career Readiness for Graduates
if not exists (select 1 from packages where name_en = 'Career Readiness Package') then
  with pkg as (
    insert into packages (name_en, name_ar, description_en, description_ar, category, status, color,
      index_name_en, index_name_ar, interpretation_bands, output_dimensions, sort_order, is_prototype)
    values (
      'Career Readiness Package',
      'باقة جاهزية الخريجين الوظيفية',
      'Integrates personality, emotional regulation, and resilience for recent graduates entering the workforce.',
      'تدمج الشخصية والتنظيم العاطفي والمرونة للخريجين الحديثين الذين يدخلون سوق العمل.',
      'employment', 'draft', '#0891B2',
      'Career Readiness Index', 'مؤشر جاهزية المسار الوظيفي',
      '[
        {"min":80,"max":100,"band_en":"Career Ready","band_ar":"جاهز للعمل","color":"#22c55e"},
        {"min":60,"max":79,"band_en":"Developing Readiness","band_ar":"جاهزية في طور التطوير","color":"#f59e0b"},
        {"min":40,"max":59,"band_en":"Emerging","band_ar":"ناشئ","color":"#f97316"},
        {"min":0,"max":39,"band_en":"Pre-Career Development","band_ar":"تطوير ما قبل المهنة","color":"#ef4444"}
      ]'::jsonb,
      '[
        {"key":"workplace_adaptability","label_en":"Workplace Adaptability","label_ar":"التكيف مع بيئة العمل"},
        {"key":"professional_maturity","label_en":"Professional Maturity","label_ar":"النضج المهني"},
        {"key":"resilience_under_work","label_en":"Resilience Under Work Pressure","label_ar":"المرونة تحت ضغط العمل"}
      ]'::jsonb,
      11, true
    ) returning id
  )
  insert into package_assessments (package_id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)
  select pkg.id, code, name_en, name_ar, weight_pct, available, ord from pkg, (values
    ('IPIP120',    'Big Five Personality Assessment',     'تقييم الشخصية الخمسة الكبرى',        30::numeric, true,  1),
    ('RESILIENCE', 'Resilience Assessment',               'تقييم المرونة النفسية',              25::numeric, false, 2),
    ('EQ',         'Emotional Intelligence Assessment',   'تقييم الذكاء العاطفي',               25::numeric, false, 3),
    ('DASS21',     'Stress Assessment (DASS-21)',           'تقييم الإجهاد (DASS-21)',             20::numeric, true,  4)
  ) as t(code, name_en, name_ar, weight_pct, available, ord);
end if;

-- Package 12: Personal Growth
if not exists (select 1 from packages where name_en = 'Personal Growth Package') then
  with pkg as (
    insert into packages (name_en, name_ar, description_en, description_ar, category, status, color,
      index_name_en, index_name_ar, interpretation_bands, output_dimensions, sort_order, is_prototype)
    values (
      'Personal Growth Package',
      'باقة النمو الشخصي',
      'Holistic assessment of personality traits, goal persistence, and adaptive capacity for intentional life development.',
      'تقييم شامل لسمات الشخصية والمثابرة على الأهداف والقدرة على التكيف للتطوير المقصود للحياة.',
      'general', 'draft', '#7C3AED',
      'Personal Growth Index', 'مؤشر النمو الشخصي',
      '[
        {"min":80,"max":100,"band_en":"Strong Growth Orientation","band_ar":"توجه نمو قوي","color":"#22c55e"},
        {"min":60,"max":79,"band_en":"Active Growth","band_ar":"نمو نشط","color":"#f59e0b"},
        {"min":40,"max":59,"band_en":"Emerging Growth","band_ar":"نمو ناشئ","color":"#f97316"},
        {"min":0,"max":39,"band_en":"Growth Foundation Building","band_ar":"بناء أساس النمو","color":"#ef4444"}
      ]'::jsonb,
      '[
        {"key":"grit_persistence","label_en":"Grit & Persistence","label_ar":"المثابرة والإصرار"},
        {"key":"personality_strengths","label_en":"Personality Strengths","label_ar":"نقاط قوة الشخصية"},
        {"key":"adaptive_resilience","label_en":"Adaptive Resilience","label_ar":"المرونة التكيفية"}
      ]'::jsonb,
      12, true
    ) returning id
  )
  insert into package_assessments (package_id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)
  select pkg.id, code, name_en, name_ar, weight_pct, available, ord from pkg, (values
    ('GRIT',       'Grit Scale',                          'مقياس المثابرة',                     30::numeric, false, 1),
    ('IPIP120',    'Big Five Personality Assessment',     'تقييم الشخصية الخمسة الكبرى',        25::numeric, true,  2),
    ('RESILIENCE', 'Resilience Assessment',               'تقييم المرونة النفسية',              25::numeric, false, 3),
    ('EQ',         'Emotional Intelligence Assessment',   'تقييم الذكاء العاطفي',               20::numeric, false, 4)
  ) as t(code, name_en, name_ar, weight_pct, available, ord);
end if;

-- Package 13: Stress Resilience
if not exists (select 1 from packages where name_en = 'Stress Resilience Package') then
  with pkg as (
    insert into packages (name_en, name_ar, description_en, description_ar, category, status, color,
      index_name_en, index_name_ar, interpretation_bands, output_dimensions, sort_order, is_prototype)
    values (
      'Stress Resilience Package',
      'باقة صمود الإجهاد',
      'Measures psychological resilience, stress responses, and wellbeing to support proactive mental health management.',
      'تقيس المرونة النفسية واستجابات الإجهاد والرفاهية لدعم إدارة الصحة النفسية الاستباقية.',
      'general', 'draft', '#EF4444',
      'Stress Resilience Index', 'مؤشر صمود الإجهاد',
      '[
        {"min":75,"max":100,"band_en":"Resilient","band_ar":"صامد","color":"#22c55e"},
        {"min":55,"max":74,"band_en":"Moderately Resilient","band_ar":"صمود معتدل","color":"#f59e0b"},
        {"min":35,"max":54,"band_en":"Vulnerable to Stress","band_ar":"عرضة للإجهاد","color":"#f97316"},
        {"min":0,"max":34,"band_en":"High Stress Vulnerability","band_ar":"هشاشة عالية للإجهاد","color":"#ef4444"}
      ]'::jsonb,
      '[
        {"key":"resilience_core","label_en":"Resilience Core","label_ar":"جوهر المرونة"},
        {"key":"stress_response","label_en":"Stress Response Pattern","label_ar":"نمط الاستجابة للإجهاد"},
        {"key":"emotional_buffer","label_en":"Emotional Buffer Capacity","label_ar":"سعة الحاجز العاطفي"}
      ]'::jsonb,
      13, true
    ) returning id
  )
  insert into package_assessments (package_id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)
  select pkg.id, code, name_en, name_ar, weight_pct, available, ord from pkg, (values
    ('RESILIENCE', 'Resilience Assessment',               'تقييم المرونة النفسية',              35::numeric, false, 1),
    ('DASS21',     'DASS-21',                             'مقياس الاكتئاب والقلق والإجهاد',     30::numeric, true,  2),
    ('WHO5',       'Wellbeing Assessment (WHO-5)',         'تقييم الرفاهية (WHO-5)',              20::numeric, true,  3),
    ('EQ',         'Emotional Intelligence Assessment',   'تقييم الذكاء العاطفي',               15::numeric, false, 4)
  ) as t(code, name_en, name_ar, weight_pct, available, ord);
end if;

-- Package 14: Personality & Attachment Compatibility
if not exists (select 1 from packages where name_en = 'Personality & Attachment Compatibility Package') then
  with pkg as (
    insert into packages (name_en, name_ar, description_en, description_ar, category, status, color,
      index_name_en, index_name_ar, interpretation_bands, output_dimensions, sort_order, is_prototype)
    values (
      'Personality & Attachment Compatibility Package',
      'باقة توافق الشخصية والتعلق',
      'Focuses on personality compatibility and secure attachment development for long-term partnership success.',
      'تركز على توافق الشخصية وتطوير التعلق الآمن لنجاح الشراكة طويلة الأمد.',
      'marriage', 'draft', '#DB2777',
      'Compatibility Readiness Index', 'مؤشر جاهزية التوافق',
      '[
        {"min":80,"max":100,"band_en":"Strong Compatibility Foundation","band_ar":"أساس توافق قوي","color":"#22c55e"},
        {"min":60,"max":79,"band_en":"Developing Compatibility","band_ar":"توافق في طور التطوير","color":"#f59e0b"},
        {"min":40,"max":59,"band_en":"Compatibility Areas to Address","band_ar":"مجالات توافق تستحق الاهتمام","color":"#f97316"},
        {"min":0,"max":39,"band_en":"Significant Work Recommended","band_ar":"يُنصح بعمل مكثف","color":"#ef4444"}
      ]'::jsonb,
      '[
        {"key":"attachment_security","label_en":"Attachment Security","label_ar":"أمان التعلق"},
        {"key":"personality_compatibility","label_en":"Personality Compatibility","label_ar":"توافق الشخصية"},
        {"key":"emotional_readiness","label_en":"Emotional Readiness","label_ar":"الاستعداد العاطفي"}
      ]'::jsonb,
      14, true
    ) returning id
  )
  insert into package_assessments (package_id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)
  select pkg.id, code, name_en, name_ar, weight_pct, available, ord from pkg, (values
    ('ATTACHMENT', 'Attachment Style Assessment',         'تقييم نمط التعلق',                   35::numeric, false, 1),
    ('IPIP120',    'Big Five Personality Assessment',     'تقييم الشخصية الخمسة الكبرى',        30::numeric, true,  2),
    ('EQ',         'Emotional Intelligence Assessment',   'تقييم الذكاء العاطفي',               20::numeric, false, 3),
    ('WHO5',       'Wellbeing Assessment (WHO-5)',         'تقييم الرفاهية (WHO-5)',              15::numeric, true,  4)
  ) as t(code, name_en, name_ar, weight_pct, available, ord);
end if;

-- Package 15: Cognitive Mastery
if not exists (select 1 from packages where name_en = 'Cognitive Mastery Package') then
  with pkg as (
    insert into packages (name_en, name_ar, description_en, description_ar, category, status, color,
      index_name_en, index_name_ar, interpretation_bands, output_dimensions, sort_order, is_prototype)
    values (
      'Cognitive Mastery Package',
      'باقة الإتقان المعرفي',
      'Integrates executive function, grit, and emotional resilience for advanced learning and cognitive performance.',
      'تدمج الوظائف التنفيذية والمثابرة والمرونة العاطفية للتعلم المتقدم والأداء المعرفي.',
      'academic', 'draft', '#059669',
      'Cognitive Mastery Index', 'مؤشر الإتقان المعرفي',
      '[
        {"min":80,"max":100,"band_en":"High Cognitive Mastery","band_ar":"إتقان معرفي عالٍ","color":"#22c55e"},
        {"min":60,"max":79,"band_en":"Good Cognitive Foundation","band_ar":"أساس معرفي جيد","color":"#f59e0b"},
        {"min":40,"max":59,"band_en":"Developing","band_ar":"في طور التطوير","color":"#f97316"},
        {"min":0,"max":39,"band_en":"Targeted Support Recommended","band_ar":"يُنصح بدعم موجّه","color":"#ef4444"}
      ]'::jsonb,
      '[
        {"key":"executive_mastery","label_en":"Executive Mastery","label_ar":"الإتقان التنفيذي"},
        {"key":"academic_grit","label_en":"Academic Grit","label_ar":"المثابرة الأكاديمية"},
        {"key":"cognitive_resilience","label_en":"Cognitive Resilience","label_ar":"المرونة المعرفية"}
      ]'::jsonb,
      15, true
    ) returning id
  )
  insert into package_assessments (package_id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)
  select pkg.id, code, name_en, name_ar, weight_pct, available, ord from pkg, (values
    ('EXEC_FUNC',  'Executive Function Assessment',        'تقييم الوظائف التنفيذية',            35::numeric, false, 1),
    ('GRIT',       'Grit Scale',                          'مقياس المثابرة',                     30::numeric, false, 2),
    ('RESILIENCE', 'Resilience Assessment',               'تقييم المرونة النفسية',              20::numeric, false, 3),
    ('WHO5',       'Wellbeing Assessment (WHO-5)',         'تقييم الرفاهية (WHO-5)',              15::numeric, true,  4)
  ) as t(code, name_en, name_ar, weight_pct, available, ord);
end if;

-- Package 16: Adaptive Leadership
if not exists (select 1 from packages where name_en = 'Adaptive Leadership Package') then
  with pkg as (
    insert into packages (name_en, name_ar, description_en, description_ar, category, status, color,
      index_name_en, index_name_ar, interpretation_bands, output_dimensions, sort_order, is_prototype)
    values (
      'Adaptive Leadership Package',
      'باقة القيادة التكيفية',
      'Assesses personality flexibility, decision-making agility, and resilience for leading organizational change.',
      'تقيّم مرونة الشخصية وخفة حركة صنع القرار والمرونة لقيادة التغيير التنظيمي.',
      'leadership', 'draft', '#EA580C',
      'Adaptive Leadership Index', 'مؤشر القيادة التكيفية',
      '[
        {"min":80,"max":100,"band_en":"Highly Adaptive Leader","band_ar":"قائد تكيفي عالٍ","color":"#22c55e"},
        {"min":60,"max":79,"band_en":"Adaptive Leader","band_ar":"قائد تكيفي","color":"#f59e0b"},
        {"min":40,"max":59,"band_en":"Developing Adaptability","band_ar":"تطوير القدرة التكيفية","color":"#f97316"},
        {"min":0,"max":39,"band_en":"Early Adaptive Stage","band_ar":"مرحلة التكيف الأولى","color":"#ef4444"}
      ]'::jsonb,
      '[
        {"key":"personality_agility","label_en":"Personality Agility","label_ar":"خفة الشخصية"},
        {"key":"change_decision","label_en":"Decision Under Change","label_ar":"القرار في ظل التغيير"},
        {"key":"change_resilience","label_en":"Change Resilience","label_ar":"المرونة أمام التغيير"}
      ]'::jsonb,
      16, true
    ) returning id
  )
  insert into package_assessments (package_id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)
  select pkg.id, code, name_en, name_ar, weight_pct, available, ord from pkg, (values
    ('IPIP120',    'Big Five Personality Assessment',     'تقييم الشخصية الخمسة الكبرى',        30::numeric, true,  1),
    ('DECISION',   'Decision-Making Assessment',          'تقييم صنع القرار',                   25::numeric, false, 2),
    ('RESILIENCE', 'Resilience Assessment',               'تقييم المرونة النفسية',              25::numeric, false, 3),
    ('EQ',         'Emotional Intelligence Assessment',   'تقييم الذكاء العاطفي',               20::numeric, false, 4)
  ) as t(code, name_en, name_ar, weight_pct, available, ord);
end if;

-- Package 17: Workplace EQ & Collaboration
if not exists (select 1 from packages where name_en = 'Workplace EQ & Collaboration Package') then
  with pkg as (
    insert into packages (name_en, name_ar, description_en, description_ar, category, status, color,
      index_name_en, index_name_ar, interpretation_bands, output_dimensions, sort_order, is_prototype)
    values (
      'Workplace EQ & Collaboration Package',
      'باقة الذكاء العاطفي والتعاون الوظيفي',
      'Emphasizes emotional intelligence, stress management, and relationship skills for collaborative workplace success.',
      'تركز على الذكاء العاطفي وإدارة الإجهاد ومهارات العلاقات لنجاح بيئة العمل التعاونية.',
      'employment', 'draft', '#2563EB',
      'Workplace EQ Index', 'مؤشر الذكاء العاطفي الوظيفي',
      '[
        {"min":80,"max":100,"band_en":"High Collaborative EQ","band_ar":"ذكاء عاطفي تعاوني عالٍ","color":"#22c55e"},
        {"min":60,"max":79,"band_en":"Solid Collaborative EQ","band_ar":"ذكاء عاطفي تعاوني متين","color":"#f59e0b"},
        {"min":40,"max":59,"band_en":"Developing EQ","band_ar":"ذكاء عاطفي في طور التطوير","color":"#f97316"},
        {"min":0,"max":39,"band_en":"EQ Development Priority","band_ar":"أولوية تطوير الذكاء العاطفي","color":"#ef4444"}
      ]'::jsonb,
      '[
        {"key":"workplace_eq","label_en":"Workplace Emotional Intelligence","label_ar":"الذكاء العاطفي الوظيفي"},
        {"key":"collaboration_strength","label_en":"Collaboration Strength","label_ar":"قوة التعاون"},
        {"key":"workplace_stress","label_en":"Workplace Stress Management","label_ar":"إدارة إجهاد بيئة العمل"}
      ]'::jsonb,
      17, true
    ) returning id
  )
  insert into package_assessments (package_id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)
  select pkg.id, code, name_en, name_ar, weight_pct, available, ord from pkg, (values
    ('EQ',         'Emotional Intelligence Assessment',   'تقييم الذكاء العاطفي',               35::numeric, false, 1),
    ('DASS21',     'Stress Assessment (DASS-21)',           'تقييم الإجهاد (DASS-21)',             25::numeric, true,  2),
    ('IPIP120',    'Big Five Personality Assessment',     'تقييم الشخصية الخمسة الكبرى',        20::numeric, true,  3),
    ('RESILIENCE', 'Resilience Assessment',               'تقييم المرونة النفسية',              20::numeric, false, 4)
  ) as t(code, name_en, name_ar, weight_pct, available, ord);
end if;

-- Package 18: Holistic Life Readiness
if not exists (select 1 from packages where name_en = 'Holistic Life Readiness Package') then
  with pkg as (
    insert into packages (name_en, name_ar, description_en, description_ar, category, status, color,
      index_name_en, index_name_ar, interpretation_bands, output_dimensions, sort_order, is_prototype)
    values (
      'Holistic Life Readiness Package',
      'باقة الاستعداد الشامل للحياة',
      'Comprehensive profile integrating personality, emotional intelligence, wellbeing, and resilience across all life domains.',
      'ملف شامل يدمج الشخصية والذكاء العاطفي والرفاهية والمرونة عبر جميع مجالات الحياة.',
      'general', 'draft', '#6366F1',
      'Life Readiness Index', 'مؤشر الاستعداد للحياة',
      '[
        {"min":80,"max":100,"band_en":"Comprehensive Life Readiness","band_ar":"استعداد شامل للحياة","color":"#22c55e"},
        {"min":60,"max":79,"band_en":"Solid Life Foundation","band_ar":"أساس حياتي متين","color":"#f59e0b"},
        {"min":40,"max":59,"band_en":"Developing Life Readiness","band_ar":"استعداد حياتي في طور التطوير","color":"#f97316"},
        {"min":0,"max":39,"band_en":"Building Your Foundation","band_ar":"بناء أساسك الحياتي","color":"#ef4444"}
      ]'::jsonb,
      '[
        {"key":"personality_foundation","label_en":"Personality Foundation","label_ar":"أساس الشخصية"},
        {"key":"emotional_intelligence","label_en":"Emotional Intelligence","label_ar":"الذكاء العاطفي"},
        {"key":"life_resilience","label_en":"Life Resilience","label_ar":"مرونة الحياة"},
        {"key":"overall_wellbeing","label_en":"Overall Wellbeing","label_ar":"الرفاهية الشاملة"}
      ]'::jsonb,
      18, true
    ) returning id
  )
  insert into package_assessments (package_id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)
  select pkg.id, code, name_en, name_ar, weight_pct, available, ord from pkg, (values
    ('IPIP120',    'Big Five Personality Assessment',     'تقييم الشخصية الخمسة الكبرى',        25::numeric, true,  1),
    ('EQ',         'Emotional Intelligence Assessment',   'تقييم الذكاء العاطفي',               25::numeric, false, 2),
    ('RESILIENCE', 'Resilience Assessment',               'تقييم المرونة النفسية',              25::numeric, false, 3),
    ('WHO5',       'Wellbeing Assessment (WHO-5)',         'تقييم الرفاهية (WHO-5)',              25::numeric, true,  4)
  ) as t(code, name_en, name_ar, weight_pct, available, ord);
end if;

end $$;
