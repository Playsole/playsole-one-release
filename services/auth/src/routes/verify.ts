import { Router } from 'express';
import { z } from 'zod';
import { randomInt } from 'node:crypto';
import { requireInternalSecret, audit } from '@playsole-one/shared';
import { getUserById, createVerificationToken, consumeVerificationToken, verifyUserEmail, verifyUserPhone } from '../store';
import { sendVerificationEmail } from '../email';
import { sendSms } from '../sms';
import { config } from '../config';

const router = Router();

// Per-route guard (not router-wide) so these identity-header endpoints stay
// protected without blocking the public OAuth endpoints mounted alongside
// this router at the app root.
const VERIFY_TTL_SEC = 600;

const emailSchema = z.object({
  email: z.string().email(),
});

const confirmEmailSchema = z.object({
  token: z.string().min(1),
});

const phoneSchema = z.object({
  phone: z.string().min(5).max(20),
});

const confirmPhoneSchema = z.object({
  token: z.string().min(1),
});

router.post('/api/verify/email', requireInternalSecret, async (req, res) => {
  const userId = req.headers['x-authenticated-user-id'];
  if (!userId || typeof userId !== 'string') {
    res.status(401).json({ error: 'invalid_token', error_description: 'Authentication required.' });
    return;
  }

  const user = await getUserById(userId);
  if (!user) {
    res.status(404).json({ error: 'not_found', error_description: 'User not found.' });
    return;
  }

  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request', error_description: parsed.error.issues[0]?.message });
    return;
  }

  if (parsed.data.email !== user.email) {
    res.status(400).json({ error: 'invalid_request', error_description: 'Email does not match your account.' });
    return;
  }

  if (user.emailVerified) {
    res.status(409).json({ error: 'already_verified', error_description: 'Email is already verified.' });
    return;
  }

  const token = await createVerificationToken(userId, 'email', parsed.data.email, VERIFY_TTL_SEC);

  // Deliver the one-time token out-of-band (email). Inline echo is dev-only.
  void sendVerificationEmail(parsed.data.email, token);

  res.json({ message: 'Verification email sent.', expiresIn: VERIFY_TTL_SEC, ...(config.inlineTokens ? { token } : {}) });
});

router.post('/api/verify/email/confirm', requireInternalSecret, async (req, res) => {
  const userId = req.headers['x-authenticated-user-id'];
  if (!userId || typeof userId !== 'string') {
    res.status(401).json({ error: 'invalid_token', error_description: 'Authentication required.' });
    return;
  }

  const parsed = confirmEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request', error_description: parsed.error.issues[0]?.message });
    return;
  }

  const entry = await consumeVerificationToken(parsed.data.token);
  if (!entry || entry.userId !== userId || entry.type !== 'email') {
    res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid or expired verification token.' });
    return;
  }

  await verifyUserEmail(userId);
  void audit({ eventType: 'user.email_verified', userId });
  res.json({ message: 'Email verified successfully.' });
});

router.post('/api/verify/phone', requireInternalSecret, async (req, res) => {
  const userId = req.headers['x-authenticated-user-id'];
  if (!userId || typeof userId !== 'string') {
    res.status(401).json({ error: 'invalid_token', error_description: 'Authentication required.' });
    return;
  }

  const user = await getUserById(userId);
  if (!user) {
    res.status(404).json({ error: 'not_found', error_description: 'User not found.' });
    return;
  }

  const parsed = phoneSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request', error_description: parsed.error.issues[0]?.message });
    return;
  }

  if (user.phoneVerified) {
    res.status(409).json({ error: 'already_verified', error_description: 'Phone is already verified.' });
    return;
  }

  // A 6-digit numeric code is friendlier to type from an SMS than a UUID.
  const code = randomInt(0, 1000000).toString().padStart(6, '0');
  const token = await createVerificationToken(userId, 'phone', parsed.data.phone, VERIFY_TTL_SEC, code);

  // Deliver the one-time code out-of-band (SMS). Inline echo is dev-only.
  void sendSms(parsed.data.phone, `Your Playsole One verification code is ${code}`);

  res.json({ message: 'Verification code sent.', expiresIn: VERIFY_TTL_SEC, ...(config.inlineTokens ? { token } : {}) });
});

router.post('/api/verify/phone/confirm', requireInternalSecret, async (req, res) => {
  const userId = req.headers['x-authenticated-user-id'];
  if (!userId || typeof userId !== 'string') {
    res.status(401).json({ error: 'invalid_token', error_description: 'Authentication required.' });
    return;
  }

  const parsed = confirmPhoneSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request', error_description: parsed.error.issues[0]?.message });
    return;
  }

  const entry = await consumeVerificationToken(parsed.data.token);
  if (!entry || entry.userId !== userId || entry.type !== 'phone') {
    res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid or expired verification token.' });
    return;
  }

  await verifyUserPhone(userId);
  void audit({ eventType: 'user.phone_verified', userId });
  res.json({ message: 'Phone verified successfully.' });
});

export { router as verifyRouter };
