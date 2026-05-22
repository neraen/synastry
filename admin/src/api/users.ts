import client from './client';
import type { PaginatedResponse, User, UserDetail } from '../types';

interface UsersParams {
  page?: number;
  limit?: number;
  search?: string;
  filter?: 'all' | 'premium' | 'free';
  sort?: string;
  order?: 'asc' | 'desc';
}

export const getUsers = (params: UsersParams = {}): Promise<PaginatedResponse<User>> =>
  client.get('/users', { params }).then((r) => r.data);

export const getUser = (id: number): Promise<UserDetail> =>
  client.get(`/users/${id}`).then((r) => r.data);

export const togglePremium = (
  id: number,
  isPremium: boolean,
  expiresAt?: string
): Promise<{ success: boolean; isPremium: boolean }> =>
  client.patch(`/users/${id}/premium`, { isPremium, expiresAt }).then((r) => r.data);

export const deleteUser = (id: number): Promise<{ success: boolean }> =>
  client.delete(`/users/${id}`).then((r) => r.data);
