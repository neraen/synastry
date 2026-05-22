export interface User {
  id: number;
  email: string;
  displayName: string | null;
  authProvider: 'google' | 'apple' | 'email';
  isPremium: boolean;
  premiumExpiresAt: string | null;
  subscriptionPlatform: 'ios' | 'android' | 'stripe' | null;
  revenuecatId: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  createdAt: string | null;
  lastLoginAt: string | null;
  lyraMessageCount: number;
  natalChartGenerated: boolean;
}

export interface UserDetail extends User {
  conversations: ConversationSummary[];
}

export interface ConversationSummary {
  id: number;
  title: string;
  messageCount: number;
  firstMessageAt: string | null;
  lastMessageAt: string | null;
}

export interface Conversation {
  id: number;
  userId: number;
  userEmail: string;
  title: string;
  messageCount: number;
  firstMessageAt: string;
  lastMessageAt: string;
}

export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string | null;
  tokenCount: number | null;
}

export interface DashboardStats {
  totalUsers: number;
  premiumUsers: number;
  freeUsers: number;
  conversionRate: number;
  totalLyraMessages: number;
  averageMessagesPerUser: number;
  signupsToday: number;
  signupsThisWeek: number;
  signupsThisMonth: number;
  mrr: number;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
