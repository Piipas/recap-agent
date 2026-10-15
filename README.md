# Recap Agent

Monorepo for Recap Agent: turn a day of GitHub commits into a short, manager-ready recap.

| Path | Description |
| --- | --- |
| [`packages/cli`](packages/cli) | The `recap-agent` CLI published to npm, for use in a terminal. See its [README](packages/cli/README.md). The apps don't use it. |
| [`apps/web`](apps/web) | Next.js web platform: sign-in, connections, recap review and sending, schedules. |
| [`apps/worker`](apps/worker) | Long-running Node service: runs schedules, generates recaps (GitHub + Groq), auto-sends and notifies. |
| [`packages/core`](packages/core) | Framework-free server logic shared by the apps: token encryption, mailbox tokens and sending, recap rendering and sending, schedule times. |
| [`packages/db`](packages/db) | Prisma schema, migrations and the shared PostgreSQL client. |
| [`packages/config`](packages/config) | Shared TypeScript and ESLint presets. |

## Development

Requires Node.js 20+, pnpm and PostgreSQL.

```bash
pnpm install
cp .env.example .env            # then fill it in (see below)
pnpm db:deploy                  # apply migrations
pnpm dev                        # web app on http://localhost:3000, plus the worker
```

| Command | What it runs |
| --- | --- |
| `pnpm build` | `turbo run build` (CLI `tsc`, Prisma generate, `next build`, worker bundle) |
| `pnpm typecheck` / `pnpm lint` | Typecheck and lint every package that defines the task |
| `pnpm test` | Core and worker tests. The CLI is excluded: its `test` script is an intentional stub that exits 1 |
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

## Worker service

The web app never generates recaps. It only writes to the database: a manual **Generate** inserts a queued `recap_run`, and schedules store their `nextRunAt`. `apps/worker` is a separate, long-running process that does the rest. Every 5 seconds it:

1. Enqueues due schedules in one transaction. `FOR UPDATE SKIP LOCKED`, a unique `(scheduleId, scheduledFor)` key, and advancing `nextRunAt` past "now" make this idempotent and safe with several workers.
2. Claims queued runs up to `WORKER_CONCURRENCY` (`FOR UPDATE SKIP LOCKED` again).
   - It generates each recap, stores it, auto-sends it when the schedule opted in, and emails the user through Resend.
   - A run left `RUNNING` by a crashed worker is retried after 10 minutes, at most 3 attempts in total.

On `SIGTERM` the worker stops claiming and lets in-flight runs finish. You can run several replicas.

### How the worker generates a recap

The worker has its own generation code (`apps/worker/src/generation`); it does not run or import the CLI.

1. **Day window.** A scheduled run covers the calendar day in its schedule's timezone. A manual run covers the UTC day, as the generate form says.
2. **Commits** (`github.ts`), with the user's GitHub connection:
   - **Personal repositories:** those the user owns or collaborates on, newest push first, stopping at the first one last pushed before the day.
   - **Organizations:** only the ones chosen on the run or schedule. For each, either all its repositories pushed since the day started, or exactly the repositories picked.
   - Reads the user's commits on each default branch inside the window, following every page.
3. **Prompt** (`prompt.ts`): each commit becomes one line (repository and subject), plus the start of its body when it fits.
   - The commit list is capped at about 4,000 tokens: bodies are dropped first, then the latest commits are counted instead of listed.
   - A request therefore stays within Groq's free-tier limit of 8,000 tokens per minute on any day.
4. **Report** (`groq.ts`): written by `openai/gpt-oss-120b` with the user's own Groq key, using instructions adapted from the CLI's prompt.
   - Rate limits and server errors are retried up to 3 times. Anything else fails at once with a readable error on the run.
   - Every request has a timeout, so a run never hangs.

## Recap flow

1. The worker generates a recap, either for a manual request from `/recaps` or for a schedule, and stores it. A manual recap starts as a `draft`.
2. The user previews it, picks a connected mailbox and managers, and it becomes `pending_confirmation`. Scheduled recaps arrive in this state when the schedule names a sender and recipients. The worker emails the user (through Resend) a link to review them.
3. The user explicitly confirms, and the recap is sent from their mailbox through the Gmail API or Microsoft Graph. It ends `sent` or `failed`, and every attempt is logged.

A conditional lock makes double confirmations harmless. Nothing is sent without that confirmation, except for schedules where the user explicitly turned on **Send automatically**. That setting is off by default and enabling it requires a confirmation dialog.

## Scheduling

Each schedule stores days, a time and an IANA timezone, plus a precomputed `nextRunAt` that the web app sets on save and the worker advances. Running on time only needs the worker to be up; there is no cron endpoint or external scheduler.

## Deploying

Both apps need the same PostgreSQL database and the same `TOKEN_ENCRYPTION_KEY`.

### Web app on Vercel

- **Root Directory:** `apps/web`. Vercel detects pnpm and Turborepo.
- **Build Command:** `turbo run db:deploy && turbo run build --filter=@recap/web` (applies migrations, then builds).
- **Environment variables:** the *Database*, *Better Auth*, *OAuth apps* and *Token encryption* groups from `.env.example`.

### Worker as a container

Any host that keeps a container running works, for example Railway, Fly.io, Render or ECS. It needs no open port. Build the image from the repository root:

```bash
docker build -f apps/worker/Dockerfile -t recap-worker .
```

- The image is built from a `turbo prune` of the worker. It holds the worker bundle, `@recap/core` and `@recap/db`, and starts with `node apps/worker/dist/main.js`.
- **Environment variables:**
  - `DATABASE_URL`, `TOKEN_ENCRYPTION_KEY`, and the Google and Microsoft client ID and secret (used to refresh mailbox tokens for auto-send);
  - the *Worker* group: `APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM` and optionally `WORKER_CONCURRENCY`.
- Give it a stop grace period of a few minutes so a deploy lets in-flight runs finish. A run that is cut short anyway is retried by a worker after 10 minutes.
- Migrations are applied by the web deploy (`db:deploy`). Deploy the web app first when a release changes the schema.

## OAuth apps

Every redirect URI below uses your `BETTER_AUTH_URL` as its base, e.g. `https://recap.example.com`. Each provider has one app that serves both sign-in and its extra connection flow.

### GitHub (sign-in + commit source)

1. Go to GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. **Homepage URL:** `BETTER_AUTH_URL`.
3. **Authorization callback URL:** `BETTER_AUTH_URL` itself, e.g. `https://recap.example.com`.
   - GitHub OAuth apps allow a single callback URL, and every `redirect_uri` must sit under it.
   - The app uses two: `/api/auth/callback/github` for sign-in and `/api/connections/github/callback` for the commit source.
4. Copy the Client ID and generate a client secret into `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.

Sign-in only requests `read:user user:email`. Connecting GitHub as the commit source separately requests `repo read:user read:org`, the same scopes the CLI asks for: the worker reads commits from private and organization repositories with it. For organization repositories, the org may need to approve the app (**Organization settings → Third-party access**).

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

Verify a sending domain in Resend, then set `RESEND_API_KEY` and `EMAIL_FROM` on the worker. Resend only sends notifications to the user (recap ready to review, auto-send results, failures). Recaps always go out from the user's own mailbox.

## License

MIT. See [LICENSE](LICENSE).
