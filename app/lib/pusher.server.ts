import Pusher from "pusher";
import { PUSHER_CHANNELS, PUSHER_EVENTS } from "./pusher.shared";

export { PUSHER_CHANNELS, PUSHER_EVENTS };

declare global {
  // eslint-disable-next-line no-var
  var __pusher: Pusher | undefined;
}

function getPusher(): Pusher {
  if (!globalThis.__pusher) {
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.PUSHER_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.PUSHER_CLUSTER;
    if (!appId || !key || !secret || !cluster) {
      throw new Error("Pusher env vars are missing. Set PUSHER_APP_ID/KEY/SECRET/CLUSTER in .env");
    }
    globalThis.__pusher = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
  }
  return globalThis.__pusher;
}

// ── Trigger helpers (fire-and-forget; never throw to the caller) ─────────────
async function safeTrigger(channel: string, event: string, payload: unknown): Promise<void> {
  try {
    await getPusher().trigger(channel, event, payload);
  } catch (err) {
    console.error(`[pusher] trigger failed for ${channel}/${event}:`, err);
  }
}

export function notifyApplicantCreated(payload: { userId: string; fullName?: string | null }) {
  return safeTrigger(PUSHER_CHANNELS.admin, PUSHER_EVENTS.applicantCreated, payload);
}

export function notifyApplicantStatus(payload: { userId: string; status: string; fullName?: string | null }) {
  return Promise.all([
    safeTrigger(PUSHER_CHANNELS.applicant(payload.userId), PUSHER_EVENTS.applicantStatus, payload),
    safeTrigger(PUSHER_CHANNELS.admin, PUSHER_EVENTS.applicantStatus, payload),
  ]);
}

export function notifyAgencyCreated(payload: { agencyId: string; companyName?: string | null }) {
  return safeTrigger(PUSHER_CHANNELS.admin, PUSHER_EVENTS.agencyCreated, payload);
}

export function notifyAgencyStatus(payload: { agencyId: string; status: string; companyName?: string | null; isVerified?: boolean }) {
  return Promise.all([
    safeTrigger(PUSHER_CHANNELS.agency(payload.agencyId), PUSHER_EVENTS.agencyStatus, payload),
    safeTrigger(PUSHER_CHANNELS.admin, PUSHER_EVENTS.agencyStatus, payload),
  ]);
}

export function notifyPaymentCreated(payload: { paymentId: string; agencyId: string; amount: number; packageName?: string | null }) {
  return safeTrigger(PUSHER_CHANNELS.admin, PUSHER_EVENTS.paymentCreated, payload);
}

export function notifyPaymentStatus(payload: { paymentId: string; agencyId: string; status: string; packageName?: string | null; membershipExpiresAt?: Date | null }) {
  return Promise.all([
    safeTrigger(PUSHER_CHANNELS.agency(payload.agencyId), PUSHER_EVENTS.paymentStatus, {
      ...payload,
      membershipExpiresAt: payload.membershipExpiresAt?.toISOString() ?? null,
    }),
    safeTrigger(PUSHER_CHANNELS.admin, PUSHER_EVENTS.paymentStatus, payload),
  ]);
}
