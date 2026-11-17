-- Portal Recruitment: skema awal Supabase.
-- Jalankan seluruh file ini satu kali melalui Supabase Dashboard > SQL Editor.
-- Data semua modul aplikasi disimpan di public.portal_records (JSONB); kolom id
-- dan table_name menjaga kompatibilitas dengan bentuk data semua halaman lama.

create table if not exists public.portal_records (
  table_name text not null,
  id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (table_name, id)
);

create index if not exists portal_records_module_idx on public.portal_records (table_name);
create index if not exists portal_records_payload_gin_idx on public.portal_records using gin (payload jsonb_path_ops);
create index if not exists portal_records_email_idx on public.portal_records (lower(payload->>'email'));
create index if not exists portal_records_applicant_idx on public.portal_records ((payload->>'applicant_id'));
create index if not exists portal_records_request_number_idx on public.portal_records ((payload->>'request_number'));
create unique index if not exists portal_records_application_code_uq
  on public.portal_records (lower(payload->>'tracking_code'))
  where table_name = 'job_applicants' and payload ? 'tracking_code';

comment on table public.portal_records is
  'Penyimpanan kompatibilitas JSONB untuk modul Portal Recruitment. table_name adalah nama modul dan payload berisi kolom record.';

-- Role staf tidak diambil dari browser/user-editable metadata.
-- Role staf harus diaktifkan oleh administrator di public.portal_records.
create or replace function public.portal_is_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.portal_records p
    where p.table_name = 'profiles'
      and p.id = auth.uid()::text
      and lower(coalesce(p.payload->>'role', 'unknown')) in (
        'recruitment', 'recruitment_admin', 'rt_admin', 'rt', 'rekrutmen', 'rekrutment', 'rekrutmen_admin',
        'training', 'training_admin', 'trainer', 'pelatihan', 'hr', 'hr_admin', 'human_resource', 'human_resources', 'sdm',
        'comben', 'cb_admin', 'compensation', 'compensation_benefit', 'compensation_and_benefit',
        'admin', 'administrator', 'super_admin', 'superadmin', 'atasan'
      )
  );
$$;
revoke all on function public.portal_is_staff() from public;
grant execute on function public.portal_is_staff() to anon, authenticated;

-- Karyawan aktif yang masuk dengan alias NIP hanya mendapat akses RLS pada
-- PRK dan lampirannya. Identitas diverifikasi lewat email Auth + master aktif,
-- bukan user_metadata yang dapat diedit dari browser.
create or replace function public.portal_is_active_employee()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.employee_master e
    where lower(trim(coalesce(e.status::text, ''))) = 'active'
      and lower(coalesce(auth.jwt()->>'email', '')) in (
        lower(trim(e.employee_id::text)) || '@bsu.co.id',
        lower(trim(e.employee_id::text)) || '@portal.bsu.co.id'
      )
  );
$$;
revoke all on function public.portal_is_active_employee() from public;
grant execute on function public.portal_is_active_employee() to anon, authenticated;

create or replace function public.portal_candidate_owns_applicant(target_id text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.portal_records a
    where a.table_name = 'job_applicants'
      and a.id = target_id
      and lower(a.payload->>'email') = lower(coalesce(auth.jwt()->>'email', ''))
  );
$$;
revoke all on function public.portal_candidate_owns_applicant(text) from public;
grant execute on function public.portal_candidate_owns_applicant(text) to anon, authenticated;

-- Automatically creates an application profile for every Supabase Auth user.
create or replace function public.portal_create_profile_for_auth_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  user_email text := coalesce(new.email, new.raw_user_meta_data->>'email', '');
  user_name text := coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1), 'Pengguna');
  user_role text := case when lower(coalesce(new.raw_user_meta_data->>'role', '')) = 'candidate' then 'candidate' else 'unknown' end;
  profile_payload jsonb;
begin
  profile_payload := jsonb_build_object(
    'id', new.id::text,
    'email', user_email,
    'name', user_name,
    'role', user_role,
    'nip', coalesce(new.raw_user_meta_data->>'nip', ''),
    'phone', coalesce(new.raw_user_meta_data->>'phone', ''),
    'domicile', coalesce(new.raw_user_meta_data->>'domicile', ''),
    'education', coalesce(new.raw_user_meta_data->>'education', ''),
    'created_at', now(),
    'updated_at', now()
  );
  insert into public.portal_records (table_name, id, payload)
  values ('profiles', new.id::text, profile_payload)
  on conflict (table_name, id) do update
    set payload = public.portal_records.payload || excluded.payload,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists portal_auth_user_profile on auth.users;
create trigger portal_auth_user_profile
after insert on auth.users
for each row execute function public.portal_create_profile_for_auth_user();

-- Public approval QR verification returns only the non-sensitive fields the page displays.
create or replace function public.portal_verify_employee_request(request_id text)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id,
    'request_number', p.payload->'request_number',
    'request_date', p.payload->'request_date',
    'position_needed', p.payload->'position_needed',
    'overall_status', p.payload->'overall_status',
    'submitted_by_name', p.payload->'submitted_by_name',
    'submitted_by_role', p.payload->'submitted_by_role',
    'created_at', p.payload->'created_at',
    'approval_status', p.payload->'approval_status',
    'approver_name', p.payload->'approver_name',
    'approver_role', p.payload->'approver_role',
    'approved_at', p.payload->'approved_at',
    'acknowledgement_status', p.payload->'acknowledgement_status',
    'acknowledger_name', p.payload->'acknowledger_name',
    'acknowledger_role', p.payload->'acknowledger_role',
    'acknowledged_at', p.payload->'acknowledged_at'
  )
  from public.portal_records p
  where p.table_name = 'employee_requests'
    and p.id = request_id
    and p.payload->>'trashed_at' is null
  limit 1;
$$;
revoke all on function public.portal_verify_employee_request(text) from public;
grant execute on function public.portal_verify_employee_request(text) to anon, authenticated;

-- A per-browser random capability token keeps anonymous chatbot transcripts private.
create or replace function public.portal_chatbot_messages(session_id text, session_secret text)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(p.payload order by p.payload->>'created_at'), '[]'::jsonb)
  from public.portal_records p
  where p.table_name = 'chatbot_messages'
    and p.payload->>'session_id' = session_id
    and p.payload->>'session_secret' = session_secret
    and length(coalesce(session_secret, '')) >= 32;
$$;

create or replace function public.portal_delete_chatbot_session(session_id text, session_secret text)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if length(coalesce(session_secret, '')) < 32 then return false; end if;
  delete from public.portal_records p
  where p.table_name = 'chatbot_messages'
    and p.payload->>'session_id' = session_id
    and p.payload->>'session_secret' = session_secret;
  get diagnostics deleted_count = row_count;
  return true;
end;
$$;
revoke all on function public.portal_chatbot_messages(text, text) from public;
revoke all on function public.portal_delete_chatbot_session(text, text) from public;
grant execute on function public.portal_chatbot_messages(text, text) to anon, authenticated;
grant execute on function public.portal_delete_chatbot_session(text, text) to anon, authenticated;

alter table public.portal_records enable row level security;
grant select, insert, update, delete on public.portal_records to anon, authenticated;

drop policy if exists portal_records_select on public.portal_records;
create policy portal_records_select on public.portal_records for select to anon, authenticated
using (
  public.portal_is_staff()
  or (table_name = 'job_openings' and lower(coalesce(payload->>'is_active', 'false')) = 'true')
  or (table_name = 'home_gallery_items' and lower(coalesce(payload->>'is_published', 'false')) = 'true')
  or table_name = 'home_gallery_settings'
  or (table_name = 'profiles' and auth.uid() is not null and id = auth.uid()::text)
  or (table_name = 'job_applicants' and auth.uid() is not null and lower(payload->>'email') = lower(coalesce(auth.jwt()->>'email', '')))
  or (
    auth.uid() is not null
    and table_name in ('interview_schedules', 'candidate_assessments', 'candidate_offerings', 'candidate_onboardings', 'applicant_status_history')
    and public.portal_candidate_owns_applicant(payload->>'applicant_id')
  )
);

drop policy if exists portal_records_insert on public.portal_records;
create policy portal_records_insert on public.portal_records for insert to anon, authenticated
with check (
  public.portal_is_staff()
  or (table_name = 'job_applicants' and (auth.uid() is null or lower(payload->>'email') = lower(coalesce(auth.jwt()->>'email', ''))))
  or (table_name = 'chatbot_messages' and length(coalesce(payload->>'session_secret', '')) >= 32)
);

drop policy if exists portal_records_update on public.portal_records;
create policy portal_records_update on public.portal_records for update to authenticated
using (public.portal_is_staff())
with check (public.portal_is_staff());

drop policy if exists portal_records_delete on public.portal_records;
create policy portal_records_delete on public.portal_records for delete to authenticated
using (public.portal_is_staff());

drop policy if exists portal_employee_prk_select on public.portal_records;
create policy portal_employee_prk_select on public.portal_records for select to authenticated
using (table_name = 'employee_requests' and public.portal_is_active_employee());
drop policy if exists portal_employee_prk_insert on public.portal_records;
create policy portal_employee_prk_insert on public.portal_records for insert to authenticated
with check (table_name = 'employee_requests' and public.portal_is_active_employee());
drop policy if exists portal_employee_prk_update on public.portal_records;
create policy portal_employee_prk_update on public.portal_records for update to authenticated
using (table_name = 'employee_requests' and public.portal_is_active_employee())
with check (table_name = 'employee_requests' and public.portal_is_active_employee());

-- Active NIP employees share the Recruitment workspace without receiving
-- access to unrelated HR, Comben, or administrator records.
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

-- Private-by-default buckets: home gallery and job flyers are public-read; uploads/deletes require a staff role.
insert into storage.buckets (id, name, public)
values ('home-gallery', 'home-gallery', true), ('prk-documents', 'prk-documents', false), ('job-flyers', 'job-flyers', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists portal_public_media_read on storage.objects;
create policy portal_public_media_read on storage.objects for select to anon, authenticated
using (bucket_id in ('home-gallery', 'job-flyers'));
drop policy if exists portal_staff_prk_media_read on storage.objects;
create policy portal_staff_prk_media_read on storage.objects for select to authenticated
using (public.portal_is_staff() and bucket_id = 'prk-documents');
drop policy if exists portal_employee_prk_media_read on storage.objects;
create policy portal_employee_prk_media_read on storage.objects for select to authenticated
using (public.portal_is_active_employee() and bucket_id = 'prk-documents');
drop policy if exists portal_staff_media_insert on storage.objects;
create policy portal_staff_media_insert on storage.objects for insert to authenticated
with check (public.portal_is_staff() and bucket_id in ('home-gallery', 'prk-documents', 'job-flyers'));
drop policy if exists portal_employee_prk_media_insert on storage.objects;
create policy portal_employee_prk_media_insert on storage.objects for insert to authenticated
with check (public.portal_is_active_employee() and bucket_id = 'prk-documents');
drop policy if exists portal_staff_media_update on storage.objects;
create policy portal_staff_media_update on storage.objects for update to authenticated
using (public.portal_is_staff() and bucket_id in ('home-gallery', 'prk-documents', 'job-flyers'))
with check (public.portal_is_staff() and bucket_id in ('home-gallery', 'prk-documents', 'job-flyers'));
drop policy if exists portal_employee_prk_media_update on storage.objects;
create policy portal_employee_prk_media_update on storage.objects for update to authenticated
using (public.portal_is_active_employee() and bucket_id = 'prk-documents')
with check (public.portal_is_active_employee() and bucket_id = 'prk-documents');
drop policy if exists portal_active_employee_job_flyers_insert on storage.objects;
create policy portal_active_employee_job_flyers_insert on storage.objects for insert to authenticated
with check (public.portal_is_active_employee() and bucket_id = 'job-flyers');
drop policy if exists portal_active_employee_job_flyers_update on storage.objects;
create policy portal_active_employee_job_flyers_update on storage.objects for update to authenticated
using (public.portal_is_active_employee() and bucket_id = 'job-flyers')
with check (public.portal_is_active_employee() and bucket_id = 'job-flyers');
drop policy if exists portal_active_employee_job_flyers_delete on storage.objects;
create policy portal_active_employee_job_flyers_delete on storage.objects for delete to authenticated
using (public.portal_is_active_employee() and bucket_id = 'job-flyers');
drop policy if exists portal_staff_media_delete on storage.objects;
create policy portal_staff_media_delete on storage.objects for delete to authenticated
using (public.portal_is_staff() and bucket_id in ('home-gallery', 'prk-documents', 'job-flyers'));
