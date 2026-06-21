-- ===================================================================
-- PACKAGES MODULE — idempotent policy + trigger + seed fix
-- Run this if the main migration failed partway through.
-- ===================================================================

-- Drop existing policies (safe to run even if they don't exist)
drop policy if exists "packages_authenticated_read"            on packages;
drop policy if exists "packages_admin_write"                   on packages;
drop policy if exists "package_assessments_authenticated_read" on package_assessments;
drop policy if exists "package_assessments_admin_write"        on package_assessments;
drop policy if exists "package_interpretations_authenticated_read" on package_interpretations;
drop policy if exists "package_interpretations_admin_write"    on package_interpretations;
drop policy if exists "package_results_own_select"             on package_results;
drop policy if exists "package_results_own_insert"             on package_results;
drop policy if exists "package_results_own_update"             on package_results;
drop policy if exists "package_results_admin_all"              on package_results;

-- Re-enable RLS (safe to repeat)
alter table packages                enable row level security;
alter table package_assessments     enable row level security;
alter table package_interpretations enable row level security;
alter table package_results         enable row level security;

-- Recreate policies
create policy "packages_authenticated_read"
  on packages for select using (auth.role() = 'authenticated');

create policy "packages_admin_write"
  on packages for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','superadmin')));

create policy "package_assessments_authenticated_read"
  on package_assessments for select using (auth.role() = 'authenticated');

create policy "package_assessments_admin_write"
  on package_assessments for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','superadmin')));

create policy "package_interpretations_authenticated_read"
  on package_interpretations for select using (auth.role() = 'authenticated');

create policy "package_interpretations_admin_write"
  on package_interpretations for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','superadmin')));

create policy "package_results_own_select"
  on package_results for select using (auth.uid() = user_id);

create policy "package_results_own_insert"
  on package_results for insert with check (auth.uid() = user_id);

create policy "package_results_own_update"
  on package_results for update using (auth.uid() = user_id);

create policy "package_results_admin_all"
  on package_results for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','superadmin')));

-- Trigger (create or replace the function, drop + recreate trigger)
create or replace function packages_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists packages_updated_at on packages;
create trigger packages_updated_at
  before update on packages
  for each row execute function packages_set_updated_at();

-- Indexes (idempotent)
create index if not exists idx_packages_status           on packages(status);
create index if not exists idx_packages_category         on packages(category);
create index if not exists idx_package_assessments_pkg   on package_assessments(package_id);
create index if not exists idx_package_results_user      on package_results(user_id);
create index if not exists idx_package_results_pkg       on package_results(package_id);

-- Seed data — only if no packages exist yet
do $$
begin
  if (select count(*) from packages) = 0 then

    -- Marriage Readiness
    with p as (insert into packages (name_en,name_ar,description_en,description_ar,category,status,color,index_name_en,index_name_ar,interpretation_bands,output_dimensions,sort_order,is_prototype) values (
      'Marriage Readiness Package','باقة الاستعداد للزواج',
      'A comprehensive battery evaluating emotional, psychological, and interpersonal readiness for marriage.',
      'بطارية شاملة تقيّم الاستعداد العاطفي والنفسي والعلائقي للزواج.',
      'marriage','draft','#7C3AED','Marriage Readiness Index','مؤشر الاستعداد للزواج',
      '[{"min":80,"max":100,"band_en":"High Readiness","band_ar":"استعداد عالٍ","color":"#22c55e"},{"min":60,"max":79,"band_en":"Moderate Readiness","band_ar":"استعداد معتدل","color":"#f59e0b"},{"min":40,"max":59,"band_en":"Needs Development","band_ar":"يحتاج إلى تطوير","color":"#f97316"},{"min":0,"max":39,"band_en":"Significant Areas Require Attention","band_ar":"مجالات مهمة تستدعي الاهتمام","color":"#ef4444"}]'::jsonb,
      '[{"key":"emotional_readiness","label_en":"Emotional Readiness","label_ar":"الاستعداد العاطفي"},{"key":"relationship_stability","label_en":"Relationship Stability Indicators","label_ar":"مؤشرات استقرار العلاقة"},{"key":"communication_strength","label_en":"Communication Strength Indicators","label_ar":"مؤشرات قوة التواصل"},{"key":"emotional_regulation","label_en":"Emotional Regulation Indicators","label_ar":"مؤشرات التنظيم العاطفي"},{"key":"risk_factors","label_en":"Potential Risk Factors","label_ar":"عوامل الخطر المحتملة"}]'::jsonb,
      1,true) returning id)
    insert into package_assessments (package_id,assessment_code,name_en,name_ar,weight_pct,is_available,sort_order)
    select p.id,code,ne,na,wp,av,ord from p,(values
      ('IPIP120','Big Five Personality Assessment','تقييم الشخصية الخمسة الكبرى',30::numeric,true,1),
      ('ATTACHMENT','Attachment Style Assessment','تقييم نمط التعلق',25::numeric,false,2),
      ('EQ','Emotional Intelligence Assessment','تقييم الذكاء العاطفي',25::numeric,false,3),
      ('DASS21','DASS-21','مقياس الاكتئاب والقلق والإجهاد',20::numeric,true,4)
    ) as t(code,ne,na,wp,av,ord);

    -- Employment Readiness
    with p as (insert into packages (name_en,name_ar,description_en,description_ar,category,status,color,index_name_en,index_name_ar,interpretation_bands,output_dimensions,sort_order,is_prototype) values (
      'Employment Readiness Package','باقة الاستعداد الوظيفي',
      'Evaluates workplace suitability and work-related strengths for career readiness.',
      'تقيّم الملاءمة المهنية والجوانب المرتبطة بالعمل وجاهزية المسار المهني.',
      'employment','draft','#0369A1','Employment Readiness Index','مؤشر الاستعداد الوظيفي',
      '[{"min":80,"max":100,"band_en":"High Readiness","band_ar":"استعداد عالٍ","color":"#22c55e"},{"min":60,"max":79,"band_en":"Moderate Readiness","band_ar":"استعداد معتدل","color":"#f59e0b"},{"min":40,"max":59,"band_en":"Developing","band_ar":"في طور التطوير","color":"#f97316"},{"min":0,"max":39,"band_en":"Significant Development Needed","band_ar":"يحتاج تطويراً جوهرياً","color":"#ef4444"}]'::jsonb,
      '[{"key":"professional_reliability","label_en":"Professional Reliability","label_ar":"الموثوقية المهنية"},{"key":"teamwork_potential","label_en":"Teamwork Potential","label_ar":"إمكانات العمل الجماعي"},{"key":"adaptability","label_en":"Adaptability","label_ar":"القدرة على التكيف"},{"key":"emotional_stability","label_en":"Emotional Stability","label_ar":"الاستقرار العاطفي"},{"key":"workplace_risk","label_en":"Workplace Risk Indicators","label_ar":"مؤشرات المخاطر المهنية"}]'::jsonb,
      2,true) returning id)
    insert into package_assessments (package_id,assessment_code,name_en,name_ar,weight_pct,is_available,sort_order)
    select p.id,code,ne,na,wp,av,ord from p,(values
      ('IPIP120','Big Five Personality Assessment','تقييم الشخصية الخمسة الكبرى',30::numeric,true,1),
      ('EQ','Emotional Intelligence Assessment','تقييم الذكاء العاطفي',25::numeric,false,2),
      ('DASS21','Stress Assessment (DASS-21)','تقييم الإجهاد (DASS-21)',25::numeric,true,3),
      ('RESILIENCE','Resilience Assessment','تقييم المرونة النفسية',20::numeric,false,4)
    ) as t(code,ne,na,wp,av,ord);

    -- Leadership Potential
    with p as (insert into packages (name_en,name_ar,description_en,description_ar,category,status,color,index_name_en,index_name_ar,interpretation_bands,output_dimensions,sort_order,is_prototype) values (
      'Leadership Potential Package','باقة الإمكانات القيادية',
      'Evaluates leadership-related strengths, communication capacity, and team influence potential.',
      'تقيّم مقومات القيادة وقدرات التواصل وإمكانات التأثير في الفريق.',
      'leadership','draft','#D97706','Leadership Potential Index','مؤشر الإمكانات القيادية',
      '[{"min":80,"max":100,"band_en":"Strong Leadership Potential","band_ar":"إمكانات قيادية قوية","color":"#22c55e"},{"min":60,"max":79,"band_en":"Emerging Leadership Potential","band_ar":"إمكانات قيادية ناشئة","color":"#f59e0b"},{"min":40,"max":59,"band_en":"Developing","band_ar":"في طور التطوير","color":"#f97316"},{"min":0,"max":39,"band_en":"Early Stage Development","band_ar":"مرحلة التطوير الأولى","color":"#ef4444"}]'::jsonb,
      '[{"key":"leadership_strength","label_en":"Leadership Strength Indicators","label_ar":"مؤشرات القوة القيادية"},{"key":"communication_capacity","label_en":"Communication Capacity","label_ar":"قدرة التواصل"},{"key":"team_influence","label_en":"Team Influence Potential","label_ar":"إمكانات التأثير في الفريق"},{"key":"development_areas","label_en":"Development Areas","label_ar":"مجالات التطوير"}]'::jsonb,
      3,true) returning id)
    insert into package_assessments (package_id,assessment_code,name_en,name_ar,weight_pct,is_available,sort_order)
    select p.id,code,ne,na,wp,av,ord from p,(values
      ('IPIP120','Big Five Personality Assessment','تقييم الشخصية الخمسة الكبرى',30::numeric,true,1),
      ('EQ','Emotional Intelligence Assessment','تقييم الذكاء العاطفي',25::numeric,false,2),
      ('RESILIENCE','Resilience Assessment','تقييم المرونة النفسية',25::numeric,false,3),
      ('DECISION','Decision-Making Assessment','تقييم صنع القرار',20::numeric,false,4)
    ) as t(code,ne,na,wp,av,ord);

    -- Academic Success
    with p as (insert into packages (name_en,name_ar,description_en,description_ar,category,status,color,index_name_en,index_name_ar,interpretation_bands,output_dimensions,sort_order,is_prototype) values (
      'Academic Success Package','باقة النجاح الأكاديمي',
      'Evaluates factors associated with academic achievement including persistence, resilience, and learning readiness.',
      'تقيّم العوامل المرتبطة بالتحصيل الأكاديمي كالمثابرة والصمود والجاهزية للتعلم.',
      'academic','draft','#059669','Academic Success Potential Index','مؤشر إمكانية النجاح الأكاديمي',
      '[{"min":80,"max":100,"band_en":"High Academic Potential","band_ar":"إمكانية أكاديمية عالية","color":"#22c55e"},{"min":60,"max":79,"band_en":"Good Academic Potential","band_ar":"إمكانية أكاديمية جيدة","color":"#f59e0b"},{"min":40,"max":59,"band_en":"Developing","band_ar":"في طور التطوير","color":"#f97316"},{"min":0,"max":39,"band_en":"Significant Support Recommended","band_ar":"يُنصح بدعم مكثف","color":"#ef4444"}]'::jsonb,
      '[{"key":"persistence","label_en":"Persistence Indicators","label_ar":"مؤشرات المثابرة"},{"key":"study_resilience","label_en":"Study Resilience","label_ar":"الصمود الدراسي"},{"key":"stress_impact","label_en":"Stress Impact","label_ar":"أثر الضغط"},{"key":"learning_readiness","label_en":"Learning Readiness","label_ar":"الجاهزية للتعلم"}]'::jsonb,
      4,true) returning id)
    insert into package_assessments (package_id,assessment_code,name_en,name_ar,weight_pct,is_available,sort_order)
    select p.id,code,ne,na,wp,av,ord from p,(values
      ('GRIT','Grit Scale','مقياس المثابرة',30::numeric,false,1),
      ('WHO5','Wellbeing Assessment (WHO-5)','تقييم الرفاهية (WHO-5)',25::numeric,true,2),
      ('DASS21','Stress Assessment (DASS-21)','تقييم الإجهاد (DASS-21)',25::numeric,true,3),
      ('EXEC_FUNC','Executive Function Assessment','تقييم الوظائف التنفيذية',20::numeric,false,4)
    ) as t(code,ne,na,wp,av,ord);

  end if;
end $$;
