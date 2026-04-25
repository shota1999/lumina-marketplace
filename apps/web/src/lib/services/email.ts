import nodemailer from 'nodemailer';

import type { Booking } from '@lumina/shared';
import { withSpan, SpanAttr } from '@lumina/telemetry';

let transporter: nodemailer.Transporter | undefined;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const host = process.env['SMTP_HOST'];
    const port = Number(process.env['SMTP_PORT'] ?? '587');
    const user = process.env['SMTP_USER'];
    const pass = process.env['SMTP_PASS'];

    if (!host || !user || !pass) {
      throw new Error('SMTP_HOST, SMTP_USER, and SMTP_PASS are required');
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return transporter;
}

const EMAIL_FROM = process.env['EMAIL_FROM'] ?? 'noreply@luminarentals.com';

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const recipientDomain = to.split('@')[1] ?? 'unknown';

  return withSpan('email.send', {
    [SpanAttr.EMAIL_TEMPLATE]: subject,
    [SpanAttr.EMAIL_RECIPIENT_DOMAIN]: recipientDomain,
  }, async () => {
    const transport = getTransporter();

    await transport.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });
  });
}

export async function sendBookingConfirmation(
  booking: Booking,
  listing: { title: string },
  userEmail: string,
): Promise<void> {
  const subject = `Booking Confirmed - ${listing.title}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1a1a1a;">Booking Confirmed!</h1>
      <p>Your booking for <strong>${listing.title}</strong> has been confirmed.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Check-in</td>
          <td style="padding: 8px 0; font-weight: bold;">${booking.startDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Check-out</td>
          <td style="padding: 8px 0; font-weight: bold;">${booking.endDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Guests</td>
          <td style="padding: 8px 0; font-weight: bold;">${booking.guests ?? 1}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Total</td>
          <td style="padding: 8px 0; font-weight: bold;">$${booking.totalPrice.toFixed(2)}</td>
        </tr>
      </table>
      <p style="color: #666; font-size: 14px;">Thank you for choosing Lumina Premium Rentals.</p>
    </div>
  `;

  await sendEmail(userEmail, subject, html);
}

export async function sendNewMessageNotification(
  recipientEmail: string,
  senderName: string,
  listingTitle: string,
  conversationId: string,
): Promise<void> {
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';
  const subject = `New message from ${senderName}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1a1a1a;">New Message</h1>
      <p><strong>${senderName}</strong> sent you a message about <strong>${listingTitle}</strong>.</p>
      <a href="${appUrl}/messages/${conversationId}"
         style="display: inline-block; background: #0066ff; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
        View Message
      </a>
      <p style="color: #666; font-size: 14px; margin-top: 24px;">Lumina Premium Rentals</p>
    </div>
  `;

  await sendEmail(recipientEmail, subject, html);
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
): Promise<void> {
  const subject = 'Reset your Lumina password';
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1a1a1a;">Password Reset</h1>
      <p>We received a request to reset your password. Click the link below to choose a new password.</p>
      <a href="${resetUrl}"
         style="display: inline-block; background: #0f172a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 20px 0; font-weight: 600;">
        Reset Password
      </a>
      <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you didn&rsquo;t request this, you can safely ignore this email.</p>
      <p style="color: #666; font-size: 14px; margin-top: 24px;">Lumina Premium Rentals</p>
    </div>
  `;

  await sendEmail(email, subject, html);
}

export async function sendNewReviewNotification(
  hostEmail: string,
  listingTitle: string,
  rating: number,
): Promise<void> {
  const stars = '\u2605'.repeat(rating) + '\u2606'.repeat(5 - rating);
  const subject = `New ${rating}-star review for ${listingTitle}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1a1a1a;">New Review</h1>
      <p>Your listing <strong>${listingTitle}</strong> received a new review.</p>
      <p style="font-size: 24px; color: #f5a623;">${stars}</p>
      <p style="color: #666; font-size: 14px; margin-top: 24px;">Lumina Premium Rentals</p>
    </div>
  `;

  await sendEmail(hostEmail, subject, html);
}
