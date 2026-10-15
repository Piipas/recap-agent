import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

const processor = unified().use(remarkParse).use(remarkRehype).use(rehypeSanitize).use(rehypeStringify);

/**
 * Markdown → sanitized HTML. The recap is model output built from commit messages
 * other people may have written, so raw HTML is dropped and URLs are sanitized.
 * The same HTML is shown in the preview and sent by email.
 */
export const renderRecapHtml = (markdown: string) => String(processor.processSync(markdown));

/** "## Daily Report: 2026-10-12" (translated with the report) becomes the subject. */
export const recapSubject = (markdown: string, day: string) => {
  const heading = /^#{1,6}\s+(.+)$/m.exec(markdown)?.[1]?.replace(/[*_`]/g, "").trim();
  return heading ? heading.slice(0, 200) : `Daily recap: ${day}`;
};

export const recapEmailHtml = (markdown: string) =>
  `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">${renderRecapHtml(markdown)}</body></html>`;
