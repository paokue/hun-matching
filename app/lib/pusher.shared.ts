// Channel and event names shared between server (trigger) and client (subscribe).
// No imports / side effects — safe to load in any environment.

export const PUSHER_CHANNELS = {
  admin: "admin-events",
  agency: (id: string) => `agency-${id}`,
  applicant: (id: string) => `applicant-${id}`,
};

export const PUSHER_EVENTS = {
  applicantCreated: "applicant:created",
  applicantStatus: "applicant:status",
  agencyCreated: "agency:created",
  agencyStatus: "agency:status",
  paymentCreated: "payment:created",
  paymentStatus: "payment:status",
} as const;
