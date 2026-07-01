-- Enable RLS on clinical_notes table (CRITICAL SECURITY FIX)
-- Clinical notes contain sensitive mental health observations
-- Must restrict access to: clinician who wrote, patient who it concerns, and admins

-- Ensure table exists
-- Note: table created in earlier migration, adding RLS now

alter table clinical_notes enable row level security;

-- Policy 1: Clinician can read and write only their own notes
create policy "cn_clinician_own" on clinical_notes
  for all to authenticated
  using (clinician_id = auth.uid())
  with check (clinician_id = auth.uid());

-- Policy 2: Patient can read notes written about them
create policy "cn_patient_read" on clinical_notes
  for select to authenticated
  using (patient_id = auth.uid());

-- Policy 3: Admins can read all notes (for compliance/audit)
create policy "cn_admin_read" on clinical_notes
  for select to authenticated
  using (exists (
    select 1 from profiles
    where id = auth.uid()
    and role in ('admin', 'superadmin')
  ));

-- Policy 4: Admins cannot write notes (prevents data manipulation)
-- Admins can only view and audit, not create/modify notes

-- Index for common query patterns
create index if not exists idx_clinical_notes_patient_clinician_created
  on clinical_notes(patient_id, clinician_id, created_at desc);

create index if not exists idx_clinical_notes_clinician_patient_created
  on clinical_notes(clinician_id, patient_id, created_at desc);
