// Real Google Classroom integration via Google Identity Services (GIS) + Classroom REST API.
// Runs entirely in the browser — the webmaster provides their own OAuth Client ID
// (created in Google Cloud Console) which is persisted to localStorage.
//
// Docs:
//   - GIS token client:    https://developers.google.com/identity/oauth2/web/guides/use-token-model
//   - Classroom REST API:  https://developers.google.com/classroom/reference/rest

const CLIENT_ID_KEY = "academic-stream-gclassroom-client-id";
const GIS_SRC = "https://accounts.google.com/gsi/client";

export const CLASSROOM_SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
  "https://www.googleapis.com/auth/classroom.announcements.readonly",
  "https://www.googleapis.com/auth/classroom.topics.readonly",
].join(" ");

export function getClientId(): string {
  return localStorage.getItem(CLIENT_ID_KEY) ?? "";
}
export function setClientId(id: string) {
  localStorage.setItem(CLIENT_ID_KEY, id.trim());
}

// Cached access token (in-memory only; not persisted).
let cachedToken: { token: string; expiresAt: number } | null = null;

function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Identity Services")));
      return;
    }
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(s);
  });
}

export async function requestAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.token;

  const clientId = getClientId();
  if (!clientId) throw new Error("Google OAuth Client ID is not configured.");

  await loadGis();
  const google = (window as any).google;

  return new Promise<string>((resolve, reject) => {
    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: CLASSROOM_SCOPES,
        callback: (resp: any) => {
          if (resp.error) return reject(new Error(resp.error_description || resp.error));
          if (!resp.access_token) return reject(new Error("No access token returned by Google."));
          const expiresIn = Number(resp.expires_in ?? 3600) * 1000;
          cachedToken = { token: resp.access_token, expiresAt: Date.now() + expiresIn };
          resolve(resp.access_token);
        },
        error_callback: (err: any) => reject(new Error(err?.message || "Google sign-in was cancelled.")),
      });
      client.requestAccessToken({ prompt: "" });
    } catch (e: any) {
      reject(new Error(e?.message || "Failed to initialize Google OAuth client."));
    }
  });
}

async function gapi<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`https://classroom.googleapis.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Classroom API error (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

export interface GCourse { id: string; name: string; section?: string; descriptionHeading?: string; description?: string; }
export interface GCourseWork {
  id: string; courseId: string; title: string; description?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours?: number; minutes?: number };
  maxPoints?: number; alternateLink?: string; workType?: string;
}
export interface GAnnouncement { id: string; courseId: string; text: string; creationTime: string; alternateLink?: string; }
export interface GTopic { topicId: string; courseId: string; name: string; }

export async function listCourses(token: string): Promise<GCourse[]> {
  const data = await gapi<{ courses?: GCourse[] }>("/courses?courseStates=ACTIVE&pageSize=100", token);
  return data.courses ?? [];
}
export async function listCourseWork(token: string, courseId: string): Promise<GCourseWork[]> {
  const data = await gapi<{ courseWork?: GCourseWork[] }>(
    `/courses/${courseId}/courseWork?pageSize=100`, token,
  );
  return data.courseWork ?? [];
}
export async function listAnnouncements(token: string, courseId: string): Promise<GAnnouncement[]> {
  const data = await gapi<{ announcements?: GAnnouncement[] }>(
    `/courses/${courseId}/announcements?pageSize=100`, token,
  );
  return data.announcements ?? [];
}
export async function listTopics(token: string, courseId: string): Promise<GTopic[]> {
  const data = await gapi<{ topic?: GTopic[] }>(`/courses/${courseId}/topics?pageSize=100`, token);
  return data.topic ?? [];
}

export function dueDateToIso(work: GCourseWork): string {
  if (!work.dueDate) return new Date(Date.now() + 14 * 86400000).toISOString();
  const { year, month, day } = work.dueDate;
  const h = work.dueTime?.hours ?? 23;
  const m = work.dueTime?.minutes ?? 59;
  return new Date(Date.UTC(year, month - 1, day, h, m)).toISOString();
}
