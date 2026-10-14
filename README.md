# Recap Agent

Monorepo for Recap Agent: a CLI that turns a day of GitHub commits into a short, manager-ready recap.

| Path | Description |
| --- | --- |
| [`packages/cli`](packages/cli) | The `recap-agent` CLI published to npm. See its [README](packages/cli/README.md). |

## Development

Requires Node.js 20+ and pnpm.

```bash
pnpm install
pnpm build       # turbo run build
pnpm typecheck
pnpm lint
pnpm test        # excludes the CLI, whose test script is intentionally a stub
```

## License

MIT. See [LICENSE](LICENSE).
