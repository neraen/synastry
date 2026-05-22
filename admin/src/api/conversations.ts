import client from './client';
import type { Conversation, Message, PaginatedResponse } from '../types';

interface ConversationsParams {
  page?: number;
  limit?: number;
  userId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export const getConversations = (params: ConversationsParams = {}): Promise<PaginatedResponse<Conversation>> =>
  client.get('/conversations', { params }).then((r) => r.data);

export const getConversationMessages = (
  id: number,
  params: { page?: number; limit?: number } = {}
): Promise<{ data: Message[]; total: number; userEmail: string; title: string }> =>
  client.get(`/conversations/${id}/messages`, { params }).then((r) => r.data);
