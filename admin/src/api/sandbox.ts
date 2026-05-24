import client from './client';

export interface SandboxResult {
  id: number;
  type: 'horoscope' | 'compatibility';
  userId: number;
  userEmail: string;
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown> | null;
  createdAt: string;
}

export interface RunHoroscopeParams {
  userId: number;
}

export interface RunCompatibilityParams {
  userId: number;
  partnerName: string;
  birthDate: string;
  birthTime?: string;
  birthCity: string;
  latitude: number;
  longitude: number;
  timezone?: number;
  timezoneName?: string;
  question?: string;
}

export const runHoroscope = (params: RunHoroscopeParams): Promise<{ success: boolean; sandboxId: number; result: Record<string, unknown> }> =>
  client.post('/sandbox/horoscope', params).then((r) => r.data);

export const runCompatibility = (params: RunCompatibilityParams): Promise<{ success: boolean; sandboxId: number; result: Record<string, unknown> }> =>
  client.post('/sandbox/compatibility', params).then((r) => r.data);

export const getSandboxResults = (params: { page?: number; type?: string } = {}): Promise<{
  data: SandboxResult[];
  total: number;
  page: number;
  limit: number;
}> => client.get('/sandbox/results', { params }).then((r) => r.data);
