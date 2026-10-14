import "server-only";
import { Resend } from "resend";
import { env } from "@/env";

// Resend is only for messages from Recap Agent to its user. Recaps themselves are
// always sent from the user's own connected mailbox.
const resend = new Resend(env.RESEND_API_KEY);

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);

const appUrl = (path: string) => new URL(path, env.BETTER_AUTH_URL).toString();

type Notification = { to: string; subject: string; paragraphs: string[]; action?: { label: string; path: string } };

const notify = async ({ to, subject, paragraphs, action }: Notification) => {
  const button = action
    ? `<p><a href="${escapeHtml(appUrl(action.path))}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;border-radius:6px;text-decoration:none">${escapeHtml(action.label)}</a></p>`
    : "";
  const html = `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">${paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("")}${button}</body></html>`;
  const text = [...paragraphs, ...(action ? [`${action.label}: ${appUrl(action.path)}`] : [])].join("\n\n");

  // A failed notification must not fail the run that triggered it.
  const { error } = await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html, text });
  if (error) console.error("Resend notification failed", error);
};

type Recipient = { email: string };
type RecapRef = { id: string; subject: string };

export const notifyRecapReady = (user: Recipient, recap: RecapRef, scheduleName: string) =>
  notify({
    to: user.email,
    subject: `Ready for review: ${recap.subject}`,
    paragraphs: [
      `Your scheduled recap "${scheduleName}" is ready.`,
      "Nothing has been sent. Open it to review the content and confirm sending.",
    ],
    action: { label: "Review and confirm", path: `/recaps/${recap.id}` },
  });

export const notifyAutoSent = (user: Recipient, recap: RecapRef, recipients: string[]) =>
  notify({
    to: user.email,
    subject: `Sent: ${recap.subject}`,
    paragraphs: [`Your recap was sent automatically to ${recipients.join(", ")}, as configured on its schedule.`],
    action: { label: "View recap", path: `/recaps/${recap.id}` },
  });

export const notifyAutoSendFailed = (user: Recipient, recap: RecapRef, error: string) =>
  notify({
    to: user.email,
    subject: `Not sent: ${recap.subject}`,
    paragraphs: [`Your recap could not be sent automatically: ${error}`, "You can fix the problem and send it from the app."],
    action: { label: "Open recap", path: `/recaps/${recap.id}` },
  });

export const notifyRunFailed = (user: Recipient, scheduleName: string, day: string, error: string) =>
  notify({
    to: user.email,
    subject: `Recap for ${day} could not be generated`,
    paragraphs: [`The scheduled recap "${scheduleName}" for ${day} failed: ${error}`],
    action: { label: "Open Recap Agent", path: "/recaps" },
  });
