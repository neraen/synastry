import client from './client';
import type { DashboardStats, TimeSeriesPoint } from '../types';

type Period = '7d' | '30d' | '90d' | 'all';

export const getDashboardStats = (): Promise<DashboardStats> =>
  client.get('/stats/dashboard').then((r) => r.data);

export const getSignupStats = (period: Period = '30d'): Promise<{ data: TimeSeriesPoint[] }> =>
  client.get('/stats/signups', { params: { period } }).then((r) => r.data);

export const getRevenueStats = (period: Period = '30d'): Promise<{ data: TimeSeriesPoint[] }> =>
  client.get('/stats/revenue', { params: { period } }).then((r) => r.data);

export const getLyraUsageStats = (period: Period = '30d'): Promise<{ data: TimeSeriesPoint[] }> =>
  client.get('/stats/lyra-usage', { params: { period } }).then((r) => r.data);

export const getProviderStats = (): Promise<{ data: { name: string; value: number }[] }> =>
  client.get('/stats/providers').then((r) => r.data);
