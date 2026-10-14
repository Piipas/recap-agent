import { build } from "esbuild";

// Workspace packages (@recap/*) ship TypeScript sources, so they are bundled in.
// npm dependencies stay external and load from node_modules at runtime; the CLI is
// spawned from its own package, never bundled.
await build({
  entryPoints: ["src/main.ts"],
  outfile: "dist/main.js",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  sourcemap: true,
  logLevel: "info",
  plugins: [
    {
      name: "external-npm-dependencies",
      setup(builder) {
        builder.onResolve({ filter: /^[^./]/ }, ({ path, kind }) =>
          kind === "entry-point" || path.startsWith("@recap/") ? undefined : { external: true },
        );
      },
    },
  ],
});
