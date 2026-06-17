import client from './client';

export interface EvalResultSummary {
  id: number;
  source: string;
  generationType: string;
  referenceType: string | null;
  referenceId: string | null;
  userEmail: string | null;
  deterministicScore: number | null;
  judgeScore: number | null;
  compositeScore: number | null;
  passed: boolean | null;
  judgeCostUsd: number | null;
  createdAt: string;
}

export interface EvalScoreRow {
  category: string;
  criterion: string;
  score: number;
  maxScore: number;
  rationale: string | null;
}

export interface EvalRatingRow {
  id: number;
  score: number;
  notes: string | null;
  admin: string | null;
  createdAt: string;
}

export interface EvalResultDetail extends EvalResultSummary {
  inputData: Record<string, unknown> | null;
  outputData: Record<string, unknown> | null;
  scores: EvalScoreRow[];
  ratings: EvalRatingRow[];
  feedback: { positive: number; negative: number } | null;
}

export interface EvalTypeStat {
  type: string;
  count: number;
  avgComposite: number;
  avgJudge: number;
  passRate: number;
  humanAvg5: number | null;
  humanAvg100: number | null;
  judgeHumanGap: number | null;
  feedback: { positive: number; negative: number } | null;
}

export const getEvalDashboard = (params: { from?: string; to?: string } = {}): Promise<{
  from: string;
  to: string;
  byType: EvalTypeStat[];
}> => client.get('/eval/dashboard', { params }).then((r) => r.data);

export const getEvalResults = (params: { page?: number; type?: string; source?: string } = {}): Promise<{
  data: EvalResultSummary[];
  total: number;
  page: number;
  limit: number;
}> => client.get('/eval/results', { params }).then((r) => r.data);

export const getEvalResult = (id: number): Promise<EvalResultDetail> =>
  client.get(`/eval/results/${id}`).then((r) => r.data);

export const rateEvalResult = (id: number, score: number, notes?: string): Promise<{ success: boolean; ratingId: number }> =>
  client.post(`/eval/results/${id}/rate`, { score, notes }).then((r) => r.data);

export const scoreProduction = (generationType: string, referenceId: string | number, runJudge = true): Promise<{
  success: boolean;
  result: EvalResultSummary;
}> => client.post('/eval/score-production', { generationType, referenceId, runJudge }).then((r) => r.data);
