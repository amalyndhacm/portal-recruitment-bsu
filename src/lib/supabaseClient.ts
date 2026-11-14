/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js';

type ApiError = { message: string; code?: string; details?: string; hint?: string };
type ApiResult<T = any> = { data: T; error: ApiError | null; count?: number | null };
type Filter = { column: string; operator: string; value: any };
type SortOrder = { column: string; ascending: boolean; nullsFirst?: boolean };
type StoredRecord = { id: string; table_name: string; payload: Record<string, any>; created_at: string; updated_at: string };

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
const client = createClient(supabaseUrl || 'https://example.supabase.co', supabaseAnonKey || 'missing-anon-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

const TABLES = new Set([
  'applicant_status_history', 'candidate_assessments', 'candidate_offerings', 'candidate_onboardings',
  'chatbot_messages', 'documentation_uploads', 'employee_activities', 'employee_admin', 'employee_discipline',
  'employee_requests', 'employees', 'home_gallery_items', 'home_gallery_settings', 'incentive_payments',
  'interview_schedules', 'job_applicants', 'job_openings', 'message_templates', 'personnel_actions',
  'profiles', 'recruitment_activities', 'recruitment_recap', 'recruitment_sources', 'resign_reasons',
  'salary_recap', 'talent_pool_recap', 'training_activities', 'training_recap', 'travel_admin',
  'weekly_reports', 'workforce_demographics', 'mp_comparison_summary',
]);
const message = (error: unknown): ApiError => {
  if (error instanceof Error) return { message: error.message };
  if (typeof error === 'string') return { message: error };
  if (error && typeof error === 'object') {
    const source = error as Record<string, unknown>;
    const messageText = [source.message, source.error_description, source.details, source.hint]
      .find((value): value is string => typeof value === 'string' && value.trim().length > 0 && value !== '[object Object]');
    let fallback = 'Terjadi kesalahan saat berkomunikasi dengan Supabase.';
    if (!messageText) {
      try { fallback = JSON.stringify(error) || fallback; } catch { /* Gunakan pesan fallback. */ }
    }
    return {
      message: messageText || fallback,
      ...(typeof source.code === 'string' ? { code: source.code } : {}),
      ...(typeof source.details === 'string' ? { details: source.details } : {}),
      ...(typeof source.hint === 'string' ? { hint: source.hint } : {}),
    };
  }
  return { message: error == null ? 'Terjadi kesalahan yang tidak diketahui.' : String(error) };
};
const text = (value: unknown) => value == null ? null : String(value);
const columnValue = (row: Record<string, any>, column: string) => row[column];

function compare(actual: any, operator: string, expected: any): boolean {
  const op = operator.toLowerCase();
  if (op === 'is') {
    if (expected === null || String(expected).toLowerCase() === 'null') return actual == null;
    if (String(expected).toLowerCase() === 'true') return actual === true || String(actual).toLowerCase() === 'true';
    if (String(expected).toLowerCase() === 'false') return actual === false || String(actual).toLowerCase() === 'false';
    return actual === expected;
  }
  if (op === 'not.is') return !compare(actual, 'is', expected);
  if (op === 'in') return Array.isArray(expected) && expected.some((item) => text(item) === text(actual));
  if (op === 'not.in') return !compare(actual, 'in', expected);
  if (op === 'contains') {
    if (actual == null) return false;
    if (typeof actual === 'string') return actual.includes(String(expected));
    if (Array.isArray(actual)) return Array.isArray(expected) ? expected.every((v) => actual.includes(v)) : actual.includes(expected);
    if (typeof actual === 'object' && expected && typeof expected === 'object') return Object.entries(expected).every(([key, value]) => key in actual && JSON.stringify(actual[key]) === JSON.stringify(value));
    return false;
  }
  if (actual == null) return (op === 'neq' || op === 'not.eq') && expected != null;
  const a = typeof actual === 'number' ? actual : String(actual).toLocaleLowerCase();
  const b = typeof actual === 'number' ? Number(expected) : String(expected ?? '').toLocaleLowerCase();
  switch (op) {
    case 'eq': return text(actual) === text(expected);
    case 'neq': case 'not.eq': return text(actual) !== text(expected);
    case 'gt': return a > b;
    case 'gte': return a >= b;
    case 'lt': return a < b;
    case 'lte': return a <= b;
    case 'like': case 'ilike': case 'not.like': case 'not.ilike': {
      const pattern = String(expected ?? '').replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.');
      const found = new RegExp(`^${pattern}$`, op.includes('ilike') ? 'i' : '').test(String(actual));
      return op.startsWith('not.') ? !found : found;
    }
    default: return false;
  }
}

function projectRow(row: Record<string, any>, selection: string): Record<string, any> {
  const fields: string[] = [];
  let start = 0;
  let depth = 0;
  for (let i = 0; i < selection.length; i += 1) {
    if (selection[i] === '(') depth += 1;
    else if (selection[i] === ')') depth -= 1;
    else if (selection[i] === ',' && depth === 0) { fields.push(selection.slice(start, i).trim()); start = i + 1; }
  }
  fields.push(selection.slice(start).trim());
  const result: Record<string, any> = fields.includes('*') ? { ...row } : { id: row.id };
  for (const field of fields) {
    if (field === '*') continue;
    const relation = field.match(/^([a-z_][a-z0-9_]*)\s*\((.*)\)$/i);
    if (relation) {
      const key = relation[1];
      const childSelection = relation[2];
      const child = row[key];
      result[key] = Array.isArray(child) ? child.map((item) => projectRow(item, childSelection)) : child ? projectRow(child, childSelection) : null;
    } else if (field && Object.prototype.hasOwnProperty.call(row, field)) result[field] = row[field];
  }
  return result;
}

class QueryBuilder implements PromiseLike<ApiResult<any>> {
  private operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private selection = '*';
  private payload: any;
  private filters: Filter[] = [];
  private orGroups: Filter[][] = [];
  private orders: SortOrder[] = [];
  private maxRows?: number;
  private rangeValue?: [number, number];
  private singleMode: 'single' | 'maybeSingle' | null = null;
  private returning = false;
  private countMode?: string;
  private head = false;
  private conflict?: string;
  private executed?: Promise<ApiResult<any>>;

  constructor(private readonly table: string) {}
  select(columns = '*', options?: { count?: string; head?: boolean }) {
    this.selection = columns || '*';
    this.returning = this.operation !== 'select';
    this.countMode = options?.count;
    this.head = Boolean(options?.head);
    return this;
  }
  insert(values: unknown, _options?: unknown) { void _options; this.operation = 'insert'; this.payload = values; return this; }
  update(values: unknown) { this.operation = 'update'; this.payload = values; return this; }
  delete() { this.operation = 'delete'; return this; }
  upsert(values: unknown, options?: { onConflict?: string }) { this.operation = 'upsert'; this.payload = values; this.conflict = options?.onConflict; return this; }
  eq(column: string, value: unknown) { return this.addFilter(column, 'eq', value); }
  neq(column: string, value: unknown) { return this.addFilter(column, 'neq', value); }
  gt(column: string, value: unknown) { return this.addFilter(column, 'gt', value); }
  gte(column: string, value: unknown) { return this.addFilter(column, 'gte', value); }
  lt(column: string, value: unknown) { return this.addFilter(column, 'lt', value); }
  lte(column: string, value: unknown) { return this.addFilter(column, 'lte', value); }
  is(column: string, value: unknown) { return this.addFilter(column, 'is', value); }
  not(column: string, operator: string, value: unknown) { return this.addFilter(column, `not.${operator}`, value); }
  like(column: string, value: unknown) { return this.addFilter(column, 'like', value); }
  ilike(column: string, value: unknown) { return this.addFilter(column, 'ilike', value); }
  contains(column: string, value: unknown) { return this.addFilter(column, 'contains', value); }
  in(column: string, values: unknown[]) { return this.addFilter(column, 'in', values); }
  filter(column: string, operator: string, value: unknown) { return this.addFilter(column, operator, value); }
  match(values: Record<string, unknown>) { for (const [key, value] of Object.entries(values)) this.eq(key, value); return this; }
  or(expression: string) {
    const group: Filter[] = [];
    for (const term of expression.split(',')) {
      const match = term.match(/^([a-z_][a-z0-9_]*)\.(eq|neq|gt|gte|lt|lte|is|like|ilike)\.(.*)$/i);
      if (match) group.push({ column: match[1], operator: match[2], value: match[3] });
    }
    if (group.length) this.orGroups.push(group);
    return this;
  }
  order(column: string, options: { ascending?: boolean; nullsFirst?: boolean } = {}) {
    this.orders.push({ column, ascending: options.ascending !== false, nullsFirst: options.nullsFirst }); return this;
  }
  limit(count: number) { this.maxRows = count; return this; }
  range(from: number, to: number) { this.rangeValue = [from, to]; return this; }
  single() { this.singleMode = 'single'; return this; }
  maybeSingle() { this.singleMode = 'maybeSingle'; return this; }
  private addFilter(column: string, operator: string, value: unknown) { this.filters.push({ column, operator, value }); return this; }

  private async loadRecords(): Promise<StoredRecord[]> {
    if (!TABLES.has(this.table)) throw new Error(`Tabel tidak diizinkan: ${this.table}`);
    return this.loadRecordsForTable(this.table);
  }

  private async run(): Promise<ApiResult<any>> {
    if (this.executed) return this.executed;
    this.executed = (async () => {
      try {
        if (!supabaseConfigured) throw new Error('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY pada .env.');
        if (this.operation === 'insert' || this.operation === 'upsert') {
          const now = new Date().toISOString();
          const inputRows = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((item) => ({ ...(item || {}) }));
          const records = inputRows.map((item) => {
            const id = String(item.id || crypto.randomUUID());
            const payload = { ...item, id, created_at: item.created_at || now, updated_at: item.updated_at || now };
            return { table_name: this.table, id, payload, created_at: payload.created_at, updated_at: payload.updated_at };
          });
          const query = client.from('portal_records').upsert(records, { onConflict: 'table_name,id' });
          const response = this.returning ? await query.select('id, table_name, payload, created_at, updated_at') : await query;
          if (response.error) throw response.error;
          const rows = ((response.data || records) as StoredRecord[]).map((record) => ({ ...record.payload, id: record.id }));
          let resultRows: any = this.returning ? rows.map((row) => projectRow(row, this.selection)) : null;
          if (this.singleMode === 'single' && Array.isArray(resultRows)) {
            if (resultRows.length !== 1) throw new Error(`Expected one row, received ${resultRows.length}`);
            resultRows = resultRows[0];
          } else if (this.singleMode === 'maybeSingle' && Array.isArray(resultRows)) {
            if (resultRows.length > 1) throw new Error(`Expected at most one row, received ${resultRows.length}`);
            resultRows = resultRows[0] ?? null;
          }
          return { data: resultRows, error: null, count: this.countMode ? rows.length : null };
        }

        const records = await this.loadRecords();
        let rows: Record<string, any>[] = records.map((record) => ({ ...record.payload, id: record.id }));
        if (this.operation === 'select' || this.operation === 'update' || this.operation === 'delete') {
          const passes = (row: Record<string, any>) => this.filters.every((filter) => compare(columnValue(row, filter.column), filter.operator, filter.value))
            && this.orGroups.every((group) => group.some((filter) => compare(columnValue(row, filter.column), filter.operator, filter.value)));
          const matched = rows.filter(passes);
          if (this.operation === 'update') {
            const now = new Date().toISOString();
            const changes = (Array.isArray(this.payload) ? this.payload[0] : this.payload) || {};
            const updates = matched.map((row) => {
              const payload = { ...row, ...changes, id: row.id, created_at: row.created_at || now, updated_at: changes.updated_at || now };
              return { table_name: this.table, id: String(row.id), payload, created_at: payload.created_at, updated_at: payload.updated_at };
            });
            if (updates.length) {
              const response = await client.from('portal_records').upsert(updates, { onConflict: 'table_name,id' });
              if (response.error) throw response.error;
            }
            rows = updates.map((record) => record.payload);
          } else if (this.operation === 'delete') {
            const ids = matched.map((row) => String(row.id));
            if (ids.length) {
              const response = await client.from('portal_records').delete().eq('table_name', this.table).in('id', ids);
              if (response.error) throw response.error;
            }
            rows = matched;
          } else rows = matched;
        }

        if (this.table === 'interview_schedules' && this.selection.includes('job_applicants(')) {
          const applicants = await this.loadRelatedApplicants(rows.map((row) => String(row.applicant_id || '')));
          rows = rows.map((row) => ({ ...row, job_applicants: applicants.get(String(row.applicant_id)) || null }));
        }
        const totalCount = rows.length;
        if (this.operation === 'select') {
          for (const order of [...this.orders].reverse()) {
            rows.sort((a, b) => {
              const left = columnValue(a, order.column);
              const right = columnValue(b, order.column);
              if (left == null || right == null) {
                if (left == null && right == null) return 0;
                const nullFirst = order.nullsFirst ?? !order.ascending;
                return left == null ? (nullFirst ? -1 : 1) : (nullFirst ? 1 : -1);
              }
              const result = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right));
              return order.ascending ? result : -result;
            });
          }
          if (this.rangeValue) rows = rows.slice(this.rangeValue[0], this.rangeValue[1] + 1);
          else if (this.maxRows != null) rows = rows.slice(0, this.maxRows);
          rows = rows.map((row) => projectRow(row, this.selection));
        }
        let data: any = this.head ? null : rows;
        if (this.singleMode === 'single') {
          if (Array.isArray(data) && data.length !== 1) throw new Error(`Expected one row, received ${data.length}`);
          data = Array.isArray(data) ? data[0] : data;
        } else if (this.singleMode === 'maybeSingle') {
          if (Array.isArray(data) && data.length > 1) throw new Error(`Expected at most one row, received ${data.length}`);
          data = Array.isArray(data) ? data[0] ?? null : data;
        }
        return { data, error: null, count: this.countMode ? totalCount : null };
      } catch (error) {
        const err = message(error);
        return { data: null, error: err, count: null };
      }
    })();
    return this.executed;
  }

  private async loadRelatedApplicants(ids: string[]) {
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    const map = new Map<string, Record<string, any>>();
    if (!uniqueIds.length) return map;
    const records = await this.loadRecordsForTable('job_applicants');
    for (const record of records) if (uniqueIds.includes(record.id)) map.set(record.id, { ...record.payload, id: record.id });
    return map;
  }
  private async loadRecordsForTable(table: string): Promise<StoredRecord[]> {
    const records: StoredRecord[] = [];
    const pageSize = 1000;
    for (let start = 0; ; start += pageSize) {
      const { data, error } = await client
        .from('portal_records')
        .select('id, table_name, payload, created_at, updated_at')
        .eq('table_name', table)
        .order('id', { ascending: true })
        .range(start, start + pageSize - 1);
      if (error) throw error;
      const page = (data || []) as StoredRecord[];
      records.push(...page);
      if (page.length < pageSize) break;
    }
    return records;
  }
  then<TResult1 = ApiResult<any>, TResult2 = never>(
    onfulfilled?: ((value: ApiResult<any>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> { return this.run().then(onfulfilled, onrejected); }
}

export const db = {
  from(table: string) { return new QueryBuilder(table); },
  auth: client.auth,
  storage: client.storage,
  functions: client.functions,
  rpc(name: string, args?: Record<string, unknown>) { return client.rpc(name, args); },
};

export type AuthUser = { id: string; email?: string; user_metadata?: Record<string, unknown>; role?: string };
export type Session = NonNullable<Awaited<ReturnType<typeof client.auth.getSession>>['data']['session']>;
