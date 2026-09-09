import { User, KitListItem, PrepKit, Flashcard, PracticeSessionStats } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(response.status, data.message || `Request failed with status ${response.status}`, data);
  }

  return data as T;
}

export const api = {
  auth: {
    async register(data: { email: string; password: string; name: string }) {
      const res = await fetchJson<{ user: User; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (typeof window !== 'undefined' && res.token) {
        localStorage.setItem('auth_token', res.token);
      }
      return res;
    },
    async login(data: { email: string; password: string }) {
      const res = await fetchJson<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (typeof window !== 'undefined' && res.token) {
        localStorage.setItem('auth_token', res.token);
      }
      return res;
    },
    async logout() {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
      }
      return fetchJson<{ message: string }>('/auth/logout', { method: 'POST' });
    },
    async me() {
      return fetchJson<{ user: User }>('/auth/me');
    },
  },

  kits: {
    async list() {
      return fetchJson<{ kits: KitListItem[] }>('/kits');
    },
    async get(id: string) {
      return fetchJson<{ id: string; kit: PrepKit; updatedAt: string }>(`/kits/${id}`);
    },
    async generate(data: { jd: string; companyUrl: string; days: number; companyName?: string; location?: string }) {
      return fetchJson<{ id: string; kit: PrepKit; message: string }>('/kits/generate', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async update(id: string, kit: PrepKit) {
      return fetchJson<{ message: string; kit: PrepKit }>(`/kits/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ kit }),
      });
    },
    async regenerate(id: string, target: string) {
      return fetchJson<{ message: string; kit: PrepKit }>(`/kits/${id}/regenerate`, {
        method: 'POST',
        body: JSON.stringify({ target }),
      });
    },
    async delete(id: string) {
      return fetchJson<{ message: string }>(`/kits/${id}`, { method: 'DELETE' });
    },
  },

  practice: {
    async getDeck(kitId: string) {
      return fetchJson<{ deck: Flashcard[]; stats: PracticeSessionStats }>(`/kits/${kitId}/deck`);
    },
    async recordConfidence(kitId: string, cardId: string, confidence: number) {
      return fetchJson<{ message: string; card: Flashcard; stats: PracticeSessionStats }>(`/kits/${kitId}/confidence`, {
        method: 'POST',
        body: JSON.stringify({ cardId, confidence }),
      });
    },
  },
};
