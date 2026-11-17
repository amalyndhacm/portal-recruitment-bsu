-- Grant Recruitment-module access to authenticated, active employees using
-- official NIP email aliases. This does not grant admin/HR/Comben access.
-- Run once in Supabase SQL Editor for the project's existing database.

create or replace function public.portal_is_active_employee()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employee_master e
    where lower(trim(coalesce(e.status::text, ''))) = 'active'
      and lower(coalesce(auth.jwt()->>'email', '')) in (
        lower(trim(e.employee_id::text)) || '@bsu.co.id',
        lower(trim(e.employee_id::text)) || '@portal.bsu.co.id'
      )
  );
$$;
revoke all on function public.portal_is_active_employee() from public;
grant execute on function public.portal_is_active_employee() to anon, authenticated;

-- Active NIP accounts can read and manage Recruitment records only.
-- Employee PRK access remains controlled by the existing PRK policies.
drop policy if exists portal_active_employee_recruitment_manage on public.portal_records;
create policy portal_active_employee_recruitment_manage
on public.portal_records for all to authenticated
using (
  public.portal_is_active_employee()
  and table_name in (
    'job_openings',
    'job_applicants',
    'recruitment_activities',
    'applicant_status_history',
    'interview_schedules',
    'candidate_assessments',
    'candidate_offerings',
    'candidate_onboardings',
    'recruitment_sources',
    'recruitment_recap',
    'talent_pool_recap',
    'message_templates'
  )
)
with check (
  public.portal_is_active_employee()
  and table_name in (
    'job_openings',
    'job_applicants',
    'recruitment_activities',
    'applicant_status_history',
    'interview_schedules',
    'candidate_assessments',
    'candidate_offerings',
    'candidate_onboardings',
    'recruitment_sources',
    'recruitment_recap',
    'talent_pool_recap',
    'message_templates'
  )
);

-- Job flyers are public-read but only active employees may upload, replace,
-- or delete them through the Recruitment vacancy-management screen.
drop policy if exists portal_active_employee_job_flyers_insert on storage.objects;
create policy portal_active_employee_job_flyers_insert
on storage.objects for insert to authenticated
with check (
  public.portal_is_active_employee()
  and bucket_id = 'job-flyers'
);

drop policy if exists portal_active_employee_job_flyers_update on storage.objects;
create policy portal_active_employee_job_flyers_update
on storage.objects for update to authenticated
using (
  public.portal_is_active_employee()
  and bucket_id = 'job-flyers'
)
with check (
  public.portal_is_active_employee()
  and bucket_id = 'job-flyers'
);

drop policy if exists portal_active_employee_job_flyers_delete on storage.objects;
create policy portal_active_employee_job_flyers_delete
on storage.objects for delete to authenticated
using (
  public.portal_is_active_employee()
  and bucket_id = 'job-flyers'
);
