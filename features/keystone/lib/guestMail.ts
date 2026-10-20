import { createTransport } from "nodemailer";

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

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character));
}

/** Sends a guest a private link (trip or conversation). Callers report delivery only when this resolves. */
export async function sendGuestLinkEmail({ to, subject, heading, body, path, cta }: {
  to: string; subject: string; heading: string; body: string; path: string; cta: string;
}): Promise<void> {
  const url = `${process.env.SMTP_STORE_LINK || ''}${path}`;
  const html = `
    <body style="background:#f9f9f9;">
      <table width="100%" border="0" cellspacing="20" cellpadding="0" style="background:#ffffff;max-width:600px;margin:auto;border-radius:10px;font-family:Helvetica,Arial,sans-serif;color:#444444;">
        <tr><td style="font-size:20px;font-weight:bold;">${escapeHtml(heading)}</td></tr>
        <tr><td style="font-size:16px;line-height:24px;">${escapeHtml(body)}</td></tr>
        <tr><td><a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 20px;border-radius:5px;background:#2f6b4f;color:#ffffff;text-decoration:none;font-weight:bold;">${escapeHtml(cta)}</a></td></tr>
        <tr><td style="font-size:14px;line-height:20px;">Keep this link private. Anyone with it can open the page.</td></tr>
      </table>
    </body>`;
  await transport.sendMail({ to, from: process.env.SMTP_FROM, subject, html });
}
