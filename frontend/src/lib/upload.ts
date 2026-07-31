import { getToken } from './auth';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

/**
 * Separate from lib/api.ts's apiFetch — that one assumes a JSON body, this
 * one sends multipart/form-data and must NOT set Content-Type itself (the
 * browser sets it, including the multipart boundary, from the FormData).
 */
export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/uploads/files`, { method: 'POST', headers, body: formData });
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const message = Array.isArray(payload?.message) ? payload.message.join(', ') : (payload?.message ?? res.statusText);
    throw new Error(message);
  }

  return payload.url as string;
}
