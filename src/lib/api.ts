/* Thin typed client for the Bookings API. The browser calls /api on this app's origin;
   src/routes/api/$.ts forwards those requests to the Python server (API_URL, default http://127.0.0.1:8787). */
import type { Insights, LocationRef, ManageInfo, Me, PublicInfo, State } from "./types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : null,
  });
  const j = (await r.json().catch(() => ({}))) as { error?: string };
  if (!r.ok) throw new ApiError(r.status, j.error || `HTTP ${r.status}`);
  return j as T;
}

export const api = {
  get: <T>(path: string) => req<T>("GET", path),
  post: <T>(path: string, body: unknown = {}) => req<T>("POST", path, body),
  patch: <T>(path: string, body: unknown = {}) => req<T>("PATCH", path, body),
  put: <T>(path: string, body: unknown = {}) => req<T>("PUT", path, body),
  del: <T>(path: string) => req<T>("DELETE", path),
};

/** Mutation responses are either the full state or `{ ..., state }`. */
export type WithState<T = Record<string, unknown>> = T & { state?: State };
export function unwrap(res: WithState | State): State {
  const w = res as WithState;
  return w.state ? w.state : (res as State);
}

export const loc = (id: string) => `/api/locations/${id}`;
export const listLocations = () => api.get<LocationRef[]>("/api/locations");
export const getState = (id: string) => api.get<State>(`${loc(id)}/state`);
export const signIn = (id: string, pin: string) =>
  api.post<{ staff: Me }>(`${loc(id)}/auth/pin`, { pin });
export const getInsights = (id: string, days: number) =>
  api.get<Insights>(`${loc(id)}/insights?days=${days}`);
export const search = (id: string, q: string) =>
  api.get<{ results: { kind: string; id: string; title: string; sub: string }[] }>(
    `${loc(id)}/search?q=${encodeURIComponent(q)}`,
  );

export const pub = {
  info: (slug: string) => api.get<PublicInfo>(`/api/public/${slug}`),
  availability: (slug: string, q: Record<string, string>) =>
    api.get<{ slots: string[]; reason?: string }>(
      `/api/public/${slug}/availability?${new URLSearchParams(q)}`,
    ),
  book: (slug: string, body: unknown) =>
    api.post<{
      ok: boolean;
      id: string;
      staff: string;
      service: string;
      date: string;
      time: string;
      business: string;
      manage: string;
      deposit: number;
    }>(`/api/public/${slug}/book`, body),
  manage: (slug: string, token: string) =>
    api.get<ManageInfo>(`/api/public/${slug}/manage/${token}`),
  manageCancel: (slug: string, token: string) =>
    api.post<{ ok: boolean; late: boolean; fee: number }>(
      `/api/public/${slug}/manage/${token}/cancel`,
      {},
    ),
  manageMove: (slug: string, token: string, body: { date: string; time: string }) =>
    api.post<{ ok: boolean; date: string; time: string }>(
      `/api/public/${slug}/manage/${token}/move`,
      body,
    ),
  kiosk: (slug: string, q: string) =>
    api.post<{
      name: string;
      checked_in: string[];
      membership: {
        name: string;
        status: string;
        remaining: number | null;
        expires: string;
      } | null;
    }>(`/api/public/${slug}/kiosk`, { q }),
};
