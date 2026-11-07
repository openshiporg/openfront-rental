import { createTransport } from "nodemailer";
import { emailButton, emailLayout, emailMuted, emailParagraph, escapeHtml } from "./email-layout"

// Server-only helper (no 'use server' directive), so it is never exposed as a client-callable action.
const transport = createTransport({
  // @ts-ignore
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

/** Sends a guest a private link (trip or conversation). Callers report delivery only when this resolves. */
export async function sendGuestLinkEmail({ to, subject, heading, body, path, cta }: {
  to: string; subject: string; heading: string; body: string; path: string; cta: string;
}): Promise<void> {
  const url = `${process.env.SMTP_STORE_LINK || ''}${path}`;
  const html = emailLayout({
    preheader: body,
    title: heading,
    body: `${emailParagraph(escapeHtml(body))}
${emailButton(cta, url)}
${emailMuted('Keep this link private. Anyone with it can open the page.')}`,
  });
  await transport.sendMail({ to, from: process.env.SMTP_FROM, subject, html });
}
