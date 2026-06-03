import { createCookieSessionStorage } from "react-router";

const REG_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days — long enough that
// an applicant can finish step 1, close the browser, and come back the next
// day (or week) to resume. The cookie is just a pointer to the in-progress
// User row in Mongo; the data itself never expires.

const storage = createCookieSessionStorage({
  cookie: {
    name: "__reg",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET!],
    secure: process.env.NODE_ENV === "production",
    maxAge: REG_COOKIE_MAX_AGE,
  },
});

export async function getRegUserId(request: Request): Promise<string | null> {
  const session = await storage.getSession(request.headers.get("Cookie"));
  return session.get("uid") ?? null;
}

export async function buildRegCookie(userId: string): Promise<string> {
  const session = await storage.getSession();
  session.set("uid", userId);
  return storage.commitSession(session);
}

// Returns a fresh Set-Cookie header if an in-progress registration exists,
// or null if there's nothing to refresh. Each step loader can include this in
// its response headers so the 30-day window resets on every visit — i.e. as
// long as the applicant comes back at least once a month, they never lose
// their in-progress data.
export async function refreshRegCookie(request: Request): Promise<string | null> {
  const uid = await getRegUserId(request);
  if (!uid) return null;
  return buildRegCookie(uid);
}

export async function destroyRegCookie(request: Request): Promise<string> {
  const session = await storage.getSession(request.headers.get("Cookie"));
  return storage.destroySession(session);
}
