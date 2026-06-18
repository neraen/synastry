import client from './client';

export type NotifType = 'transit' | 'sky_event' | 'daily_reminder';
export type TriggerType = 'transits' | 'sky_events' | 'daily_reminders';

export interface NotifMessage {
  title: string;
  body: string;
}

export interface NotifStatRow {
  type: string;
  count: number;
}

export interface NotifStats {
  today: NotifStatRow[];
  week: NotifStatRow[];
}

export interface NotifLog {
  id: number;
  type: string;
  title: string | null;
  body: string | null;
  userEmail: string | null;
  triggerData: Record<string, unknown>;
  sentAt: string | null;
}

export interface NotifLogsResponse {
  items: NotifLog[];
  page: number;
  limit: number;
  total: number;
}

export interface TransitPreview {
  type: 'transit';
  found: boolean;
  transit: Record<string, unknown> | null;
  message: NotifMessage | null;
  reason?: string | null;
}

export interface SkyEventPreview {
  type: 'sky_event';
  events: Array<Record<string, unknown>>;
  message: NotifMessage | null;
  reason?: string | null;
}

export interface DailyPreview {
  type: 'daily_reminder';
  title: string;
  body: string;
  templates: string[];
}

export type PreviewResponse = TransitPreview | SkyEventPreview | DailyPreview;

export interface ScheduleJob {
  label: string;
  type: TriggerType;
  cadence: string;
  nextRun: string;
}

export interface ScheduleResponse {
  now: string;
  jobs: ScheduleJob[];
  queue: {
    pending: Record<string, number>;
    failed: number;
  };
}

export const getNotifStats = (): Promise<NotifStats> =>
  client.get('/notifications/stats').then((r) => r.data);

export const getNotifLogs = (params: { type?: string; page?: number; limit?: number } = {}): Promise<NotifLogsResponse> =>
  client.get('/notifications/logs', { params }).then((r) => r.data);

export const previewNotif = (type: NotifType, userEmail?: string): Promise<PreviewResponse> =>
  client.post('/notifications/preview', { type, userEmail }).then((r) => r.data);

export const sendTestPush = (payload: { token?: string; title?: string; body?: string }): Promise<{
  success: boolean;
  tokensTargeted: number;
}> => client.post('/notifications/test-push', payload).then((r) => r.data);

export const triggerNotif = (type: TriggerType): Promise<{ success: boolean; type: TriggerType; sent: number }> =>
  client.post('/notifications/trigger', { type }).then((r) => r.data);

export const getNotifSchedule = (): Promise<ScheduleResponse> =>
  client.get('/notifications/schedule').then((r) => r.data);
