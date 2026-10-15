import { describe, expect, it } from "vitest";
import { recapSubject, renderRecapHtml } from "./render";

describe("renderRecapHtml", () => {
  it("renders the report's markdown", () => {
    const html = renderRecapHtml("## Daily Report: 2026-10-12\n\n**Summary**\n\n- Added reset flow");
    expect(html).toContain("<h2>Daily Report: 2026-10-12</h2>");
    expect(html).toContain("<strong>Summary</strong>");
    expect(html).toContain("<li>Added reset flow</li>");
  });

  it("drops raw HTML and unsafe links coming from commit messages", () => {
    const html = renderRecapHtml('<img src=x onerror="alert(1)">\n\n[click](javascript:alert(1))');
    expect(html).not.toContain("<img");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("javascript:");
  });
});

describe("recapSubject", () => {
  it("uses the report heading, including translated ones", () => {
    expect(recapSubject("## Rapport quotidien : 2026-10-12\n\n**Résumé**", "2026-10-12")).toBe(
      "Rapport quotidien : 2026-10-12",
    );
  });

  it("falls back to the day", () => {
    expect(recapSubject("No activity today.", "2026-10-12")).toBe("Daily recap: 2026-10-12");
  });
});
