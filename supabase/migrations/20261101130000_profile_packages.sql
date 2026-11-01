-- ===================================================================
-- PROFILE PACKAGES (launch set of six)
--
-- Replaces the weighted-average packages with "profile" packages: each
-- scale is read on its own published bands and the combined report is
-- built from evidence-based pattern rules in lib/package-profiles.
--
-- 1. packages.profile_key links a package row to its rule set in code.
-- 2. Every existing weighted-average package is archived. They averaged
--    unrelated scales into a 0-100 index, and 9 of the 12 active ones
--    contained scales that do not exist (EQ, GRIT, EXEC_FUNC, ESS).
--    At the time of writing no package results or purchases exist.
-- 3. Six profile packages are inserted. A component scale is marked
--    available only if an active assessment definition with that code
--    exists, so this can run before or after the English-assessments
--    migration that adds ACSI28; re-running it refreshes availability.
--
-- Idempotent: safe to run more than once.
-- ===================================================================

alter table packages add column if not exists profile_key text;
create unique index if not exists packages_profile_key_key on packages(profile_key) where profile_key is not null;

-- 2. Archive the old weighted-average packages.
update packages
   set status = 'archived', updated_at = now()
 where profile_key is null
   and scoring_method = 'weighted_average'
   and status <> 'archived';

-- 3. Insert / refresh the six profile packages.
with defs(profile_key, sort_order, status, category, color, name_en, name_ar, description_en, description_ar, purpose_en, purpose_ar) as (
  values
  ('mental_health_checkup', 1, 'active', 'general', '#1D6296',
   'Mental Health Check-up', 'الفحص الشامل للصحة النفسية',
   'An all-round baseline: depression, anxiety, physical symptoms, wellbeing and sleep, read together in one report.',
   'خط أساس شامل: الاكتئاب والقلق والأعراض الجسدية والرفاهية والنوم، تُقرأ معاً في تقرير واحد.',
   'Shows how much distress you have, how well you are actually doing, and how you are sleeping, using the PHQ family of scales and WHO-5.',
   'يُظهر مقدار الضيق لديك، ومدى حسن حالك فعلياً، وكيف تنام، باستخدام مقاييس عائلة PHQ ومقياس WHO-5.'),
  ('stress_burnout_recovery', 2, 'active', 'employment', '#0f766e',
   'Stress, Burnout & Recovery', 'الضغط والاحتراق الوظيفي والتعافي',
   'Separates work burnout from depression and shows your load (stress, sleep) next to your reserves (resilience, wellbeing).',
   'يميّز الاحتراق الوظيفي عن الاكتئاب ويعرض الحمل عليك (الضغط والنوم) إلى جانب مواردك (المرونة والرفاهية).',
   'For working adults and employers. Burnout and depression overlap, so the report checks both before suggesting a recovery plan.',
   'للبالغين العاملين وأصحاب العمل. يتداخل الاحتراق مع الاكتئاب، لذا يفحص التقرير الاثنين قبل اقتراح خطة تعافٍ.'),
  ('relationship_readiness', 3, 'active', 'marriage', '#be185d',
   'Relationship & Marriage Readiness', 'الاستعداد للعلاقة والزواج',
   'Personality, attachment style, emotion regulation and current mood: a profile to reflect on and discuss, not a pass or fail verdict.',
   'الشخصية ونمط التعلّق وتنظيم المشاعر والمزاج الحالي: ملف للتأمل والنقاش، وليس حكماً بالنجاح أو الرسوب.',
   'For people preparing for marriage, engaged couples (each partner takes it) and premarital counsellors.',
   'للمقبلين على الزواج والمخطوبين (يجريه كل شريك) ومرشدي ما قبل الزواج.'),
  ('personal_growth', 4, 'active', 'general', '#7c3aed',
   'Personal Growth & Wellbeing', 'النمو الشخصي والرفاهية',
   'A strengths-first portrait: personality, mindfulness, resilience, self-esteem and life satisfaction, with your growth areas named.',
   'صورة تبدأ بنقاط القوة: الشخصية واليقظة الذهنية والمرونة وتقدير الذات والرضا عن الحياة، مع تحديد مجالات نموك.',
   'For self-development and coaching clients who are doing well and want to grow.',
   'لمن يسعون إلى تطوير الذات وعملاء التوجيه الذين هم في حالة جيدة ويرغبون في النمو.'),
  ('athlete_performance', 5, 'active', 'general', '#c2410c',
   'Athlete Mental Performance & Health', 'الأداء الذهني وصحة الرياضي',
   'Mental skills for competition plus the mental health screen recommended by the International Olympic Committee, in one report.',
   'المهارات الذهنية للمنافسة مع فحص الصحة النفسية الذي توصي به اللجنة الأولمبية الدولية، في تقرير واحد.',
   'For competitive athletes, clubs and sport psychologists. ACSI-28 is validated in English only; the Arabic wording is an unvalidated translation.',
   'للرياضيين المتنافسين والأندية والأخصائيين النفسيين الرياضيين. مقياس ACSI-28 مُعتمد بالإنجليزية فقط؛ والصياغة العربية ترجمة غير مُتحقق منها.'),
  -- Draft until package reports can go through clinician review before release.
  ('mood_clarity', 6, 'draft', 'general', '#4338ca',
   'Mood Clarity', 'وضوح المزاج',
   'A deeper look at low mood: how severe it is, whether there are signs of bipolar-spectrum mood swings, and how anxiety and sleep fit in.',
   'نظرة أعمق على انخفاض المزاج: مدى شدته، وهل توجد مؤشرات لتقلبات مزاج من طيف ثنائي القطب، وكيف يرتبط به القلق والنوم.',
   'For people who suspect depression or were flagged by the Check-up. Bipolarity is checked first because it changes treatment.',
   'لمن يشتبهون بالاكتئاب أو ظهرت لديهم مؤشرات في الفحص الشامل. يُفحص طيف ثنائي القطب أولاً لأنه يغيّر العلاج.')
)
insert into packages (profile_key, sort_order, status, category, color, name_en, name_ar, description_en, description_ar,
                      purpose_en, purpose_ar, scoring_method, interpretation_bands, output_dimensions, is_prototype, icon)
select profile_key, sort_order, status, category, color, name_en, name_ar, description_en, description_ar,
       purpose_en, purpose_ar, 'profile_rules', '[]'::jsonb, '[]'::jsonb, false, 'layers'
  from defs
on conflict (profile_key) where profile_key is not null do update
   set sort_order = excluded.sort_order,
       category = excluded.category,
       color = excluded.color,
       name_en = excluded.name_en, name_ar = excluded.name_ar,
       description_en = excluded.description_en, description_ar = excluded.description_ar,
       purpose_en = excluded.purpose_en, purpose_ar = excluded.purpose_ar,
       scoring_method = 'profile_rules',
       updated_at = now();

-- Component scales (order matters: it is the order users take them in).
delete from package_assessments
 where package_id in (select id from packages where profile_key is not null);

with comp(profile_key, code, name_en, name_ar, ord) as (
  values
  ('mental_health_checkup', 'PHQ9',  'Depression (PHQ-9)', 'الاكتئاب (PHQ-9)', 1),
  ('mental_health_checkup', 'GAD7',  'Anxiety (GAD-7)', 'القلق (GAD-7)', 2),
  ('mental_health_checkup', 'PHQ15', 'Physical symptoms (PHQ-15)', 'الأعراض الجسدية (PHQ-15)', 3),
  ('mental_health_checkup', 'WHO5',  'Wellbeing (WHO-5)', 'الرفاهية (WHO-5)', 4),
  ('mental_health_checkup', 'ISI',   'Insomnia (ISI)', 'الأرق (ISI)', 5),

  ('stress_burnout_recovery', 'OLBI',  'Burnout (OLBI)', 'الاحتراق الوظيفي (OLBI)', 1),
  ('stress_burnout_recovery', 'PSS10', 'Perceived stress (PSS-10)', 'الضغط المُدرَك (PSS-10)', 2),
  ('stress_burnout_recovery', 'PHQ9',  'Depression (PHQ-9)', 'الاكتئاب (PHQ-9)', 3),
  ('stress_burnout_recovery', 'ISI',   'Insomnia (ISI)', 'الأرق (ISI)', 4),
  ('stress_burnout_recovery', 'BRS',   'Resilience (BRS)', 'المرونة النفسية (BRS)', 5),
  ('stress_burnout_recovery', 'WHO5',  'Wellbeing (WHO-5)', 'الرفاهية (WHO-5)', 6),

  ('relationship_readiness', 'IPIP120', 'Big Five personality (IPIP-NEO-120)', 'العوامل الخمسة للشخصية (IPIP-NEO-120)', 1),
  ('relationship_readiness', 'ECRR',    'Attachment (ECR-R)', 'التعلّق (ECR-R)', 2),
  ('relationship_readiness', 'DERS',    'Emotion regulation (DERS)', 'تنظيم المشاعر (DERS)', 3),
  ('relationship_readiness', 'PHQ9',    'Depression (PHQ-9)', 'الاكتئاب (PHQ-9)', 4),
  ('relationship_readiness', 'GAD7',    'Anxiety (GAD-7)', 'القلق (GAD-7)', 5),
  ('relationship_readiness', 'SWLS',    'Life satisfaction (SWLS)', 'الرضا عن الحياة (SWLS)', 6),

  ('personal_growth', 'IPIP120', 'Big Five personality (IPIP-NEO-120)', 'العوامل الخمسة للشخصية (IPIP-NEO-120)', 1),
  ('personal_growth', 'WHO5',    'Wellbeing (WHO-5)', 'الرفاهية (WHO-5)', 2),
  ('personal_growth', 'SWLS',    'Life satisfaction (SWLS)', 'الرضا عن الحياة (SWLS)', 3),
  ('personal_growth', 'FFMQ',    'Mindfulness (FFMQ)', 'اليقظة الذهنية (FFMQ)', 4),
  ('personal_growth', 'BRS',     'Resilience (BRS)', 'المرونة النفسية (BRS)', 5),
  ('personal_growth', 'RSES',    'Self-esteem (RSES)', 'تقدير الذات (RSES)', 6),

  ('athlete_performance', 'ACSI28', 'Athletic coping skills (ACSI-28)', 'مهارات التكيّف الرياضي (ACSI-28)', 1),
  ('athlete_performance', 'GAD7',   'Anxiety (GAD-7)', 'القلق (GAD-7)', 2),
  ('athlete_performance', 'PHQ9',   'Depression (PHQ-9)', 'الاكتئاب (PHQ-9)', 3),
  ('athlete_performance', 'ISI',    'Insomnia (ISI)', 'الأرق (ISI)', 4),
  ('athlete_performance', 'AUDIT',  'Alcohol use (AUDIT)', 'استخدام الكحول (AUDIT)', 5),
  ('athlete_performance', 'EAT26',  'Eating attitudes (EAT-26)', 'اتجاهات الأكل (EAT-26)', 6),
  ('athlete_performance', 'BRS',    'Resilience (BRS)', 'المرونة النفسية (BRS)', 7),

  ('mood_clarity', 'PHQ9', 'Depression (PHQ-9)', 'الاكتئاب (PHQ-9)', 1),
  ('mood_clarity', 'GAD7', 'Anxiety (GAD-7)', 'القلق (GAD-7)', 2),
  ('mood_clarity', 'MDQ',  'Mood swings screen (MDQ)', 'فحص تقلبات المزاج (MDQ)', 3),
  ('mood_clarity', 'ASRM', 'Elevated mood (ASRM)', 'ارتفاع المزاج (ASRM)', 4),
  ('mood_clarity', 'ISI',  'Insomnia (ISI)', 'الأرق (ISI)', 5)
),
pkgs as (select id, profile_key from packages where profile_key is not null)
insert into package_assessments (package_id, assessment_code, name_en, name_ar, weight_pct, is_available, sort_order)
select p.id, c.code, c.name_en, c.name_ar, 0,
       exists (select 1 from assessment_definitions d where d.code = c.code and d.is_active),
       c.ord
  from comp c join pkgs p on p.profile_key = c.profile_key;
