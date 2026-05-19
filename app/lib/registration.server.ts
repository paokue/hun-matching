import { createCookieSessionStorage } from "react-router";

const storage = createCookieSessionStorage({
  cookie: {
    name: "__reg",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET!],
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 2, // 2 hours
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

export async function destroyRegCookie(request: Request): Promise<string> {
  const session = await storage.getSession(request.headers.get("Cookie"));
  return storage.destroySession(session);
}
