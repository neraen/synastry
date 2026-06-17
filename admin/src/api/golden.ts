import client from './client';

export interface GoldenCase {
  id: number;
  name: string;
  generationType: string;
  inputData: Record<string, unknown>;
  expectations: Record<string, unknown> | null;
  active: boolean;
  updatedAt: string;
}

export interface GoldenRun {
  id: number;
  label: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  caseCount: number;
  avgScore: number | null;
  totalCostUsd: number;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface GoldenRunResult {
  id: number;
  generationType: string;
  caseName: string | null;
  compositeScore: number | null;
  judgeScore: number | null;
  passed: boolean | null;
}

export interface DiffRow {
  caseId: number;
  caseName: string;
  type: string;
  scoreA: number | null;
  scoreB: number | null;
  delta: number | null;
}

export const getGoldenCases = (): Promise<{ data: GoldenCase[] }> =>
  client.get('/eval/golden/cases').then((r) => r.data);

export const createGoldenCase = (payload: Partial<GoldenCase>): Promise<{ success: boolean; case: GoldenCase }> =>
  client.post('/eval/golden/cases', payload).then((r) => r.data);

export const updateGoldenCase = (id: number, payload: Partial<GoldenCase>): Promise<{ success: boolean; case: GoldenCase }> =>
  client.put(`/eval/golden/cases/${id}`, payload).then((r) => r.data);

export const deleteGoldenCase = (id: number): Promise<{ success: boolean }> =>
  client.delete(`/eval/golden/cases/${id}`).then((r) => r.data);

export const createGoldenRun = (label?: string): Promise<{ success: boolean; run: GoldenRun }> =>
  client.post('/eval/golden/runs', { label }).then((r) => r.data);

export const getGoldenRuns = (): Promise<{ data: GoldenRun[] }> =>
  client.get('/eval/golden/runs').then((r) => r.data);

export const getGoldenRun = (id: number): Promise<{ run: GoldenRun; results: GoldenRunResult[] }> =>
  client.get(`/eval/golden/runs/${id}`).then((r) => r.data);

export const getGoldenDiff = (a: number, b: number): Promise<{ runA: GoldenRun; runB: GoldenRun; rows: DiffRow[] }> =>
  client.get('/eval/golden/runs/diff', { params: { a, b } }).then((r) => r.data);
