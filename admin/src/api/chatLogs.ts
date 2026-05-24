import client from './client';
import type { PaginatedResponse } from '../types';

export interface ChatLog {
  id: number;
  userId: number;
  userEmail: string;
  userDisplayName: string | null;
  userMessage: string;
  assistantResponse: string | null;
  messageCount: number;
  createdAt: string;
}

interface ChatLogsParams {
  page?: number;
  limit?: number;
  userId?: number;
  search?: string;
}

export const getChatLogs = (params: ChatLogsParams = {}): Promise<PaginatedResponse<ChatLog>> =>
  client.get('/chat-logs', { params }).then((r) => r.data);
