import { randomBytes } from "node:crypto";

export type OutgoingEmail = {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
};

const singleLine = (value: string) => value.replace(/[\r\n]+/g, " ").trim();
const encodeWord = (value: string) => `=?UTF-8?B?${Buffer.from(singleLine(value), "utf8").toString("base64")}?=`;
const base64Body = (value: string) =>
  Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/.{1,76}/g, "$&\r\n");

/** RFC 5322 multipart/alternative message, as the Gmail API's `raw` field expects. */
export const buildMimeMessage = ({ from, to, subject, text, html }: OutgoingEmail) => {
  const boundary = `recap_${randomBytes(12).toString("hex")}`;

  return [
    `From: ${singleLine(from)}`,
    `To: ${to.map(singleLine).join(", ")}`,
    `Subject: ${encodeWord(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Body(text),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Body(html),
    `--${boundary}--`,
    "",
  ].join("\r\n");
};
