# Recap Agent

Monorepo for Recap Agent: turn a day of GitHub commits into a short, manager-ready recap.

| Path | Description |
| --- | --- |
| [`packages/cli`](packages/cli) | The `recap-agent` CLI published to npm. See its [README](packages/cli/README.md). |
| [`apps/web`](apps/web) | Next.js web platform: sign-in, connections, recap review and sending, schedules. |
| [`packages/core`](packages/core) | Framework-free server logic shared by the apps: token encryption, mailbox tokens and sending, recap rendering and sending, schedule times. |
| [`packages/db`](packages/db) | Prisma schema, migrations and the shared PostgreSQL client. |
| [`packages/config`](packages/config) | Shared TypeScript and ESLint presets. |

## Development

Requires Node.js 20+, pnpm and PostgreSQL.

```bash
pnpm install
cp .env.example .env            # then fill it in (see below)
pnpm db:deploy                  # apply migrations
pnpm dev                        # web app on http://localhost:3000
```

| Command | What it runs |
| --- | --- |
| `pnpm build` | `turbo run build` (CLI `tsc`, Prisma generate, `next build`) |
| `pnpm typecheck` / `pnpm lint` | Typecheck and lint every package that defines the task |
| `pnpm test` | Web tests. The CLI is excluded: its `test` script is an intentional stub that exits 1 |
| `pnpm db:migrate` | `prisma migrate dev`: creates a migration from schema changes and applies it. Runs in Turborepo's terminal UI so Prisma can prompt for the migration name; select the task and press Enter to type it, or pass it directly: `pnpm db:migrate --name add_x` |
| `pnpm db:deploy` | `prisma migrate deploy`: applies pending migrations without prompting (CI and production) |
| `pnpm db:generate` | Regenerates the Prisma client (also runs automatically before `build`, `typecheck`, `lint` and `test`) |

Database tests (`*.db.test.ts`) run only when `TEST_DATABASE_URL` points at a migrated database:

```bash
DATABASE_URL=postgresql://… pnpm db:deploy   # migrate the test database
TEST_DATABASE_URL=postgresql://… pnpm test
```

Notes on the workspace layout:

- pnpm uses `nodeLinker: hoisted` so `node_modules` matches the npm tree the CLI was built with (see the comment in `pnpm-workspace.yaml`).
- The CLI's `tsc` script now resolves the workspace TypeScript (6.0.x) instead of a globally installed one. Its emitted JavaScript is unchanged.

## How the web app runs the CLI

The CLI has no programmatic API: `index.ts` runs `main()` on import, prints progress and the report to stdout, and keeps one module-level Octokit client. So the web app spawns it **unmodified** as a child process (`apps/web/src/server/recaps/cli-runner.ts`):

- For each run, a temporary config directory holds the user's GitHub token in `recap-agent/credentials.json`. `APPDATA` and `XDG_CONFIG_HOME` point at it, so the CLI's device flow never starts.
- The child gets a minimal environment, the user's own Groq key as `--groq-api-key`, and a hard 240 s timeout. The CLI retries Groq errors forever, so the timeout is what stops it.
- The report is parsed from the CLI's exact stdout lines.
- `next.config.ts` traces the CLI's `dist` and its dependency tree into the routes that spawn it.

The CLI collects commits for a **UTC** day. Scheduled runs pass the schedule's local date, so commits close to local midnight can land in the neighbouring day.

## Recap flow

1. A recap is generated, either manually from `/recaps` or by a schedule, and stored. A manual recap starts as a `draft`.
2. The user previews it, picks a connected mailbox and managers, and it becomes `pending_confirmation`. Scheduled recaps arrive in this state when the schedule names a sender and recipients. The user is emailed (through Resend) a link to review them.
3. The user explicitly confirms, and the recap is sent from their mailbox through the Gmail API or Microsoft Graph. It ends `sent` or `failed`, and every attempt is logged.

A conditional lock makes double confirmations harmless. Nothing is sent without that confirmation, except for schedules where the user explicitly turned on **Send automatically**. That setting is off by default and enabling it requires a confirmation dialog.

## Scheduling

- Each schedule stores days, a time and an IANA timezone, plus a precomputed `nextRunAt`.
- `GET /api/cron/tick` (authenticated with `Authorization: Bearer $CRON_SECRET`) does two things:
  - Enqueues due schedules in one transaction. `FOR UPDATE SKIP LOCKED`, a unique `(scheduleId, scheduledFor)` key and advancing `nextRunAt` past "now" make it idempotent and safe under concurrent ticks.
  - Generates a few queued runs.
- `apps/web/vercel.json` calls the tick every minute with Vercel Cron. A per-minute schedule needs a Vercel **Pro** plan; Hobby only allows daily crons. Any other scheduler can call the endpoint with the same header.

## Deploying on Vercel

- **Root Directory:** `apps/web`. Vercel detects pnpm and Turborepo.
- **Build Command:** `turbo run db:deploy && turbo run build --filter=@recap/web` (applies migrations, then builds).
- **Environment variables:** set every variable from `.env.example`.
- **Function duration:** the generating routes declare `maxDuration = 300`. Fluid compute must allow that duration.

## OAuth apps

Every redirect URI below uses your `BETTER_AUTH_URL` as its base, e.g. `https://recap.example.com`. Each provider has one app that serves both sign-in and its extra connection flow.

### GitHub (sign-in + commit source)

1. Go to GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. **Homepage URL:** `BETTER_AUTH_URL`.
3. **Authorization callback URL:** `BETTER_AUTH_URL` itself, e.g. `https://recap.example.com`.
   - GitHub OAuth apps allow a single callback URL, and every `redirect_uri` must sit under it.
   - The app uses two: `/api/auth/callback/github` for sign-in and `/api/connections/github/callback` for the commit source.
4. Copy the Client ID and generate a client secret into `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.

Sign-in only requests `read:user user:email`. Connecting GitHub as the commit source separately requests `repo read:user read:org`, the same scopes the CLI asks for. For organization repositories, the org may need to approve the app (**Organization settings → Third-party access**).

### Google (sign-in + Gmail sending)

1. In Google Cloud Console, create a project, then enable the **Gmail API** under **APIs & Services → Library**.
2. Under **OAuth consent screen**:
   - Choose the user type.
   - Add the scopes `openid`, `email`, `profile` and `https://www.googleapis.com/auth/gmail.send`.
   - Add test users while the app is in testing.
3. Under **Credentials → Create credentials → OAuth client ID → Web application**, add these **authorized redirect URIs**:
   - `BETTER_AUTH_URL/api/auth/callback/google`
   - `BETTER_AUTH_URL/api/mailboxes/google/callback`
4. Copy the client ID and secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

`gmail.send` is a *sensitive* scope:
- Before launching to the public, the app must pass Google's verification.
- While the consent screen is in **Testing**, refresh tokens expire after 7 days, and mailboxes then show "Reconnect".

### Microsoft (sign-in + Outlook sending)

1. In the Microsoft Entra admin center, go to **App registrations → New registration**.
2. **Supported account types:** accounts in any organizational directory *and* personal Microsoft accounts. The app uses the `common` tenant.
3. **Redirect URIs** (platform **Web**):
   - `BETTER_AUTH_URL/api/auth/callback/microsoft`
   - `BETTER_AUTH_URL/api/mailboxes/microsoft/callback`
4. Under **Certificates & secrets**, create a client secret. Copy the **Application (client) ID** and the secret *value* into `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET`.
5. Under **API permissions**, add the Microsoft Graph delegated permissions `openid`, `email`, `profile`, `offline_access`, `User.Read` and `Mail.Send`. Some organizations require admin consent for `Mail.Send`.

Microsoft has no per-token revocation. Disconnecting a mailbox deletes its tokens, and users can remove the app at <https://myapps.microsoft.com>.

### Resend

Verify a sending domain in Resend, then set `RESEND_API_KEY` and `EMAIL_FROM`. Resend only sends notifications to the signed-in user (recap ready to review, auto-send results, failures). Recaps always go out from the user's own mailbox.

## License

MIT. See [LICENSE](LICENSE).
