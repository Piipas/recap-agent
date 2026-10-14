import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import base from "./base.js";

export default [
  { ignores: [".next/**", "next-env.d.ts"] },
  ...base,
  ...nextVitals,
  ...nextTs,
];
