import { db } from '@/lib/database';
import type { InterviewSchedule } from '@/lib/database';

export type InterviewScheduleInput = {
  applicant_id: string;
  stage: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  mode: string;
  location: string | null;
  interviewer: string | null;
  notes: string | null;
  result: string;
};

export type InterviewScheduleWithApplicant = InterviewSchedule & {
  job_applicants: {
    full_name: string;
    position: string;
    tracking_code: string;
    status: string;
  } | null;
};

export async function fetchSchedulesForApplicant(applicantId: string): Promise<InterviewSchedule[]> {
  const { data, error } = await db
    .from('interview_schedules')
    .select('*')
    .eq('applicant_id', applicantId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data as InterviewSchedule[];
}

export async function fetchAllSchedulesWithApplicants(): Promise<InterviewScheduleWithApplicant[]> {
  const { data, error } = await db
    .from('interview_schedules')
    .select('*, job_applicants(full_name, position, tracking_code, status)')
    .order('scheduled_date', { ascending: true, nullsFirst: false });
  if (error || !data) return [];
  return data as unknown as InterviewScheduleWithApplicant[];
}

export async function createInterviewSchedule(input: InterviewScheduleInput) {
  return db.from('interview_schedules').insert(input);
}

export async function updateInterviewSchedule(id: string, input: Partial<InterviewScheduleInput>) {
  return db
    .from('interview_schedules')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id);
}

export async function deleteInterviewSchedule(id: string) {
  return db.from('interview_schedules').delete().eq('id', id);
}