-- IPIP-NEO-120 (IPIP120) shipped with an empty scoring_logic, so calcBand()
-- returned null and every submission was stored with a blank severity_band
-- (the admin results table showed an empty pill and the patient result page
-- showed no interpretation). Give it Big-Five profile bands — the same names as
-- BFI44, which already carry bilingual labels and interpretation content —
-- scaled to the 120-item raw total range (120-600; each item is 1-5).
update assessment_definitions
set scoring_logic = '[
  {"min":120,"max":299,"severity_en":"Reserved & Structured Profile","severity_ar":"شخصية متحفظة ومنظمة","color":"#3b82f6"},
  {"min":300,"max":360,"severity_en":"Moderate Trait Expression","severity_ar":"تعبير معتدل عن السمات","color":"#14b8a6"},
  {"min":361,"max":420,"severity_en":"Balanced Personality Profile","severity_ar":"شخصية متوازنة","color":"#22c55e"},
  {"min":421,"max":480,"severity_en":"Expressive & Engaged Profile","severity_ar":"شخصية تعبيرية ومنخرطة","color":"#a855f7"},
  {"min":481,"max":600,"severity_en":"Highly Active & Open Profile","severity_ar":"شخصية نشطة ومنفتحة","color":"#f97316"}
]'::jsonb
where code = 'IPIP120';

-- Backfill severity_band on any IPIP120 submissions saved before the fix.
update assessment_submissions s
set severity_band = (
  select band->>'severity_en'
  from assessment_definitions d, jsonb_array_elements(d.scoring_logic) band
  where d.id = s.definition_id
    and s.total_score >= (band->>'min')::int
    and s.total_score <= (band->>'max')::int
  limit 1
)
where s.definition_id in (select id from assessment_definitions where code = 'IPIP120')
  and (s.severity_band is null or s.severity_band = '');
