import { Resend } from 'resend';
import { createLogger } from '@playsole-one/shared';

const logger = createLogger('auth');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@playsole.xyz';
const BASE_URL = process.env.PUBLIC_BASE_URL ?? 'http://localhost:8080';

export function publicBaseUrl(): string {
  return BASE_URL;
}

export async function sendVerificationEmail(to: string, token: string): Promise<boolean> {
  const link = `${BASE_URL}/verify-email/confirm?token=${encodeURIComponent(token)}`;
  return sendEmail(
    to,
    'Verify your email — Playsole One',
    `<div style="font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px">
<h1 style="font-size:20px;margin-bottom:16px">Verify your email</h1>
<p style="color:#555;margin-bottom:24px">Click the button below to verify your email address for Playsole One.</p>
<a href="${link}" style="display:inline-block;padding:12px 24px;background:#0076FE;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Verify email</a>
<p style="color:#999;font-size:13px;margin-top:24px">If you didn't create this account, you can ignore this email.</p>
</div>`,
  );
}

export async function sendMagicLinkEmail(to: string, token: string): Promise<boolean> {
  const link = `${BASE_URL}/magic-link/verify?token=${encodeURIComponent(token)}`;
  return sendEmail(
    to,
    'Sign in to Playsole One',
    `<div style="font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px">
<h1 style="font-size:20px;margin-bottom:16px">Sign in to Playsole One</h1>
<p style="color:#555;margin-bottom:24px">Use the button below to sign in. This link expires in 10 minutes and can only be used once.</p>
<a href="${link}" style="display:inline-block;padding:12px 24px;background:#0076FE;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Sign in</a>
<p style="color:#999;font-size:13px;margin-top:24px">If you didn't request this link, you can ignore this email.</p>
</div>`,
  );
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!resend) return false;
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
    return true;
  } catch (err: any) {
    logger.error({ err }, 'email send failed');
    return false;
  }
}