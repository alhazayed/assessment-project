-- Package instrument reconciliation
UPDATE package_assessments
SET
  assessment_code = 'BRS',
  name_en = CASE
    WHEN name_en ILIKE '%brief resilience%' THEN name_en
    ELSE 'Brief Resilience Scale (BRS)'
  END,
  name_ar = CASE
    WHEN coalesce(name_ar, '') = '' THEN 'مقياس المرونة المختصر'
    ELSE name_ar
  END,
  is_available = true
WHERE upper(assessment_code) = 'RESILIENCE';

UPDATE package_assessments
SET
  assessment_code = 'ECRR',
  name_en = 'Experiences in Close Relationships – Revised (ECR-R)',
  name_ar = CASE
    WHEN coalesce(name_ar, '') = '' THEN 'مقياس تجارب العلاقات الوثيقة – المنقح'
    ELSE name_ar
  END,
  is_available = true
WHERE upper(assessment_code) = 'ATTACHMENT';

UPDATE package_assessments pa
SET is_available = true
FROM assessment_definitions ad
WHERE upper(ad.code) = upper(pa.assessment_code)
  AND ad.is_active = true
  AND pa.is_available = false
  AND upper(pa.assessment_code) IN ('PHQ9', 'GAD7', 'PCL5');

UPDATE package_assessments pa
SET is_available = false
WHERE upper(pa.assessment_code) IN ('EQ', 'GRIT', 'EXEC_FUNC', 'ESS', 'DECISION')
  AND NOT EXISTS (
    SELECT 1
    FROM assessment_definitions ad
    WHERE upper(ad.code) = upper(pa.assessment_code)
  );

UPDATE package_assessments pa
SET is_available = false
WHERE pa.is_available = true
  AND NOT EXISTS (
    SELECT 1
    FROM assessment_definitions ad
    WHERE upper(ad.code) = upper(pa.assessment_code)
      AND ad.is_active = true
  );

DO $$
DECLARE
  orphan_available int;
  unmapped_placeholders int;
BEGIN
  SELECT count(*) INTO orphan_available
  FROM package_assessments pa
  WHERE pa.is_available = true
    AND NOT EXISTS (
      SELECT 1 FROM assessment_definitions ad
      WHERE upper(ad.code) = upper(pa.assessment_code) AND ad.is_active = true
    );

  IF orphan_available > 0 THEN
    RAISE EXCEPTION 'package_assessments still has % available rows without an active definition', orphan_available;
  END IF;

  SELECT count(*) INTO unmapped_placeholders
  FROM package_assessments
  WHERE upper(assessment_code) IN ('RESILIENCE', 'ATTACHMENT');

  IF unmapped_placeholders > 0 THEN
    RAISE EXCEPTION 'RESILIENCE/ATTACHMENT remap incomplete: % rows remain', unmapped_placeholders;
  END IF;
END $$;