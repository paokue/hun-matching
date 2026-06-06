import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createCookieSessionStorage, redirect } from "react-router";

const JWT_SECRET = process.env.JWT_SECRET!;
const SESSION_SECRET = process.env.SESSION_SECRET!;

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__hanmatching_session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [SESSION_SECRET],
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
});

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: object, expiresIn = "7d") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  } catch {
    return null;
  }
}

export async function createUserSession(
  userId: string,
  role: string,
  redirectTo: string,
  extraCookies: string[] = [],
) {
  const session = await sessionStorage.getSession();
  const token = signToken({ userId, role });
  session.set("token", token);
  const sessionCookie = await sessionStorage.commitSession(session);
  // Multiple Set-Cookie headers must be expressed as an array of tuples so
  // each cookie survives into the response.
  const headers: HeadersInit = [
    ["Set-Cookie", sessionCookie],
    ...extraCookies.map((c) => ["Set-Cookie", c] as [string, string]),
  ];
  return redirect(redirectTo, { headers });
}

export async function getUserFromSession(request: Request) {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const token = session.get("token");
  if (!token) return null;
  const payload = verifyToken(token);
  return payload;
}

export async function requireUser(request: Request) {
  const user = await getUserFromSession(request);
  if (!user) throw redirect("/login");
  return user;
}

export async function requireAgency(request: Request) {
  const user = await getUserFromSession(request);
  if (!user || user.role !== "agency") throw redirect("/agency/login");
  return user;
}

export async function requireAdmin(request: Request) {
  const user = await getUserFromSession(request);
  if (!user || user.role !== "admin") throw redirect("/admin/login");
  return user;
}

export async function logout(request: Request, redirectTo = "/") {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  return redirect(redirectTo, {
    headers: { "Set-Cookie": await sessionStorage.destroySession(session) },
  });
}
