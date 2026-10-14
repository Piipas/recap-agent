import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./crypto";

describe("secret encryption", () => {
  it("round-trips and uses a fresh IV per call", () => {
    const first = encryptSecret("gho_secret-token");
    const second = encryptSecret("gho_secret-token");

    expect(first).not.toBe(second);
    expect(first).not.toContain("gho_secret-token");
    expect(decryptSecret(first)).toBe("gho_secret-token");
  });

  it("rejects tampered ciphertext", () => {
    const [version, iv, tag, ciphertext] = encryptSecret("value").split(".");
    const flipped = Buffer.from(ciphertext ?? "", "base64url");
    flipped[0] = (flipped[0] ?? 0) ^ 1;

    expect(() => decryptSecret([version, iv, tag, flipped.toString("base64url")].join("."))).toThrow();
  });

  it("rejects unknown formats", () => {
    expect(() => decryptSecret("v0.a.b.c")).toThrow("Unsupported secret format");
  });
});
