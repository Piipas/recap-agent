/** Only allow same-origin, path-absolute redirect targets. */
export const safeNextPath = (value: string | null | undefined, fallback = "/recaps") =>
  value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : fallback;
