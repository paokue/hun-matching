import nodemailer, { type Transporter } from "nodemailer";

declare global {
  // eslint-disable-next-line no-var
  var __mailer: Transporter | undefined;
}

function getTransporter(): Transporter | null {
  if (globalThis.__mailer) return globalThis.__mailer;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    console.warn("[mail] SMTP_HOST/USER/PASS missing — email notifications disabled.");
    return null;
  }

  globalThis.__mailer = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return globalThis.__mailer;
}

const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || "";
const APP_NAME = process.env.APP_NAME || "HanMatching";
const APP_URL = process.env.APP_URL || "";

// Fire-and-forget: log errors but never throw to the caller. Keeps action
// handlers fast and prevents a mail outage from breaking user flows.
async function safeSend(opts: { to: string; subject: string; html: string; text?: string }) {
  const tx = getTransporter();
  if (!tx) return;
  if (!opts.to) {
    console.warn("[mail] no recipient — skipping send.");
    return;
  }
  try {
    await tx.sendMail({
      from: `"${APP_NAME}" <${process.env.SMTP_USER}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text ?? opts.html.replace(/<[^>]+>/g, ""),
      html: opts.html,
    });
  } catch (err) {
    console.error("[mail] send failed:", err);
  }
}

function wrap(title: string, bodyHtml: string, ctaUrl?: string, ctaLabel?: string): string {
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#f43f5e,#db2777);padding:18px 24px;color:#fff;font-weight:700;font-size:16px;">${APP_NAME}</div>
        <div style="padding:24px;color:#0f172a;">
          <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;">${title}</h2>
          <div style="font-size:14px;line-height:1.6;color:#334155;">${bodyHtml}</div>
          ${ctaUrl && ctaLabel ? `<p style="margin-top:20px;"><a href="${ctaUrl}" style="display:inline-block;background:#f43f5e;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">${ctaLabel}</a></p>` : ""}
        </div>
        <div style="padding:14px 24px;background:#f8fafc;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;">Automated notification — please do not reply.</div>
      </div>
    </div>
  `;
}

function row(label: string, value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return `<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px;">${label}</td><td style="padding:6px 0;color:#0f172a;font-weight:600;font-size:13px;">${value}</td></tr>`;
}

export async function sendAdminNewApplicantEmail(payload: {
  userId: string;
  fullName?: string | null;
  profileId?: string | null;
  phone?: string | null;
}) {
  const cta = APP_URL ? `${APP_URL}/admin/applicants` : "";
  const html = wrap(
    "New applicant registered",
    `<p>A new applicant just registered on ${APP_NAME}.</p>
     <table style="margin-top:8px;border-collapse:collapse;">
       ${row("Name", payload.fullName)}
       ${row("Profile ID", payload.profileId)}
       ${row("Phone", payload.phone)}
     </table>`,
    cta,
    "Review applicants"
  );
  return safeSend({ to: ADMIN_EMAIL, subject: `New applicant: ${payload.fullName ?? payload.profileId ?? payload.userId}`, html });
}

export async function sendAdminNewAgencyEmail(payload: {
  agencyId: string;
  companyName?: string | null;
  email?: string | null;
}) {
  const cta = APP_URL ? `${APP_URL}/admin/agencies` : "";
  const html = wrap(
    "New agency registered",
    `<p>A new agency just signed up on ${APP_NAME}.</p>
     <table style="margin-top:8px;border-collapse:collapse;">
       ${row("Company", payload.companyName)}
       ${row("Email", payload.email)}
     </table>`,
    cta,
    "Review agencies"
  );
  return safeSend({ to: ADMIN_EMAIL, subject: `New agency: ${payload.companyName ?? payload.agencyId}`, html });
}

export async function sendAdminNewPaymentEmail(payload: {
  paymentId: string;
  agencyId: string;
  amount: number;
  packageName?: string | null;
  companyName?: string | null;
}) {
  const cta = APP_URL ? `${APP_URL}/admin/payments` : "";
  const html = wrap(
    "New payment submitted",
    `<p>A new payment is awaiting verification.</p>
     <table style="margin-top:8px;border-collapse:collapse;">
       ${row("Agency", payload.companyName)}
       ${row("Package", payload.packageName)}
       ${row("Amount", `$${payload.amount}`)}
     </table>`,
    cta,
    "Review payments"
  );
  return safeSend({ to: ADMIN_EMAIL, subject: `New payment: $${payload.amount} (${payload.packageName ?? "membership"})`, html });
}
