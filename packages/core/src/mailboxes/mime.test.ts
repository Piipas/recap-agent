import { describe, expect, it } from "vitest";
import { buildMimeMessage } from "./mime";

const decodePart = (message: string, contentType: string) => {
  const part = message.split(`Content-Type: ${contentType}; charset=UTF-8\r\n`)[1] ?? "";
  const body = part.split("\r\n\r\n")[1]?.split("\r\n--")[0] ?? "";
  return Buffer.from(body.replace(/\r\n/g, ""), "base64").toString("utf8");
};

describe("buildMimeMessage", () => {
  const message = buildMimeMessage({
    from: "me@example.com",
    to: ["a@example.com", "b@example.com"],
    subject: "Rapport quotidien : 2026-10-12",
    text: "## Rapport\n- Fait",
    html: "<h2>Rapport</h2>",
  });

  it("writes headers with an encoded UTF-8 subject", () => {
    expect(message).toContain("From: me@example.com\r\n");
    expect(message).toContain("To: a@example.com, b@example.com\r\n");
    const subject = /Subject: =\?UTF-8\?B\?(.+)\?=/.exec(message)?.[1] ?? "";
    expect(Buffer.from(subject, "base64").toString("utf8")).toBe("Rapport quotidien : 2026-10-12");
  });

  it("carries both text and HTML alternatives", () => {
    expect(message).toMatch(/Content-Type: multipart\/alternative; boundary="recap_[0-9a-f]+"/);
    expect(decodePart(message, "text/plain")).toBe("## Rapport\n- Fait");
    expect(decodePart(message, "text/html")).toBe("<h2>Rapport</h2>");
  });

  it("cannot be used for header injection", () => {
    const injected = buildMimeMessage({
      from: "me@example.com",
      to: ["a@example.com\r\nBcc: evil@example.com"],
      subject: "Hi\r\nBcc: evil@example.com",
      text: "",
      html: "",
    });
    expect(injected).not.toMatch(/\r\nBcc:/);
  });
});
