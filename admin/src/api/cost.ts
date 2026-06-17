import client from './client';

export interface CostTotals {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  costUsd: number;
}

export interface CostGroup {
  key: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface CostDaily {
  day: string;
  calls: number;
  costUsd: number;
}

export interface CostSummary {
  from: string;
  to: string;
  totals: CostTotals;
  byType: CostGroup[];
  byModel: CostGroup[];
  byProvider: CostGroup[];
  dailySeries: CostDaily[];
}

export interface CostUser {
  userId: number;
  email: string;
  calls: number;
  costUsd: number;
}

export interface CallLogRow {
  id: number;
  provider: string;
  model: string;
  generationType: string;
  referenceType: string | null;
  referenceId: string | null;
  userEmail: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  costUsd: number;
  latencyMs: number | null;
  success: boolean;
  createdAt: string;
}

interface Window {
  from?: string;
  to?: string;
}

export const getCostSummary = (params: Window = {}): Promise<CostSummary> =>
  client.get('/cost/summary', { params }).then((r) => r.data);

export const getCostByUser = (params: Window & { limit?: number } = {}): Promise<{ data: CostUser[] }> =>
  client.get('/cost/by-user', { params }).then((r) => r.data);

export const getCostCalls = (params: { page?: number; type?: string } = {}): Promise<{
  data: CallLogRow[];
  total: number;
  page: number;
  limit: number;
}> => client.get('/cost/calls', { params }).then((r) => r.data);
