# Recap Agent

A CLI tool that inspects your GitHub activity for the current day and converts it into a concise, leadership-friendly recap.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-43853d)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)](https://www.typescriptlang.org/)

## Overview

Recap Agent is designed for developers who want a quick end-of-day summary without manually reviewing commit history. It authenticates with GitHub, reads the commits created in the current UTC day, and uses an AI model to generate a short, readable status report in markdown format.

The tool is especially useful for:

- preparing daily team or manager updates
- summarizing work across multiple repositories
- generating short status notes in different languages
- tracking activity across personal and organization-owned repos

## Features

- Fetches commits for a selected day from user-owned and organization-owned repositories
- Uses GitHub OAuth device flow for secure first-time authentication
- Supports scoped repo selection with `--repo-type`
- Accepts a custom date with `--day` for historical reports
- Produces a concise markdown recap with sections such as Summary, Done, and Notes
- Supports localized output via the `--language` flag
- Allows removing saved GitHub credentials with the logout command

## Requirements

Before using the project, ensure you have:

- Node.js 20 or newer
- A GitHub OAuth App with Device Flow enabled
- A Groq API key

## Installation

For end users, install and run it directly with `npx`:

```bash
npx recap-agent --help
```

For local development or contributors:

```bash
git clone https://github.com/Piipas/recap-agent.git
cd recap-agent
npm install
npm run build
```

## Quick start

```bash
npx recap-agent --repo-type "user,org" --language en --groq-api-key YOUR_GROQ_API_KEY
```

On the first run, the CLI starts the GitHub device flow and guides you through authentication in the browser. No local configuration file is required.

## GitHub authentication

On first run, Recap Agent uses GitHub's OAuth device flow.

1. Create a GitHub OAuth App.
2. Enable Device Flow in the app configuration.
3. Start the app.
4. Visit the URL shown in the terminal and enter the displayed code.

The app requests repository access for commit and repository metadata, and organization coverage depends on the repositories visible to the authenticated account.

Saved credentials are stored in the user's config directory:

- Windows: `%APPDATA%\recap-agent\credentials.json`
- Linux/macOS: `$XDG_CONFIG_HOME/recap-agent/credentials.json` or `~/.config/recap-agent/credentials.json`

## Usage

Run the package from the command line with `npx`:

```bash
npx recap-agent --repo-type "user,org" --language en --groq-api-key YOUR_GROQ_API_KEY
```

### Required options

| Option | Required | Description |
| --- | --- | --- |
| `--groq-api-key` / `-g` | Yes | Groq API key used to generate the daily summary. |

### Optional options

| Option | Default | Description |
| --- | --- | --- |
| `--repo-type` / `-t` | `user` | Repository scope to inspect. Accepts `user`, `org`, or a comma-separated combination such as `"user,org"`. |
| `--language` / `-l` | `en` | Output language for the generated report. Examples: `en`, `fr`, `es`, `de`, `pt`, `ja`. |
| `--day` / `-d` | today in ISO format | Date to analyze in `YYYY-MM-DD` format. |
| `--logout` / `-o` | `false` | Removes the locally saved GitHub credentials. |
| `--help` / `-h` | — | Displays available command-line options. |

### Examples

```bash
npx recap-agent --repo-type "user,org" --language fr --day 2026-10-13 --groq-api-key YOUR_GROQ_API_KEY
```

```bash
npx recap-agent --logout
```

The first command generates a French-language recap for the selected date. The second command removes the locally saved GitHub credentials.

## Logout

To remove the saved GitHub authentication:

```bash
npx recap-agent --logout
```

This deletes the locally stored credential file without revoking the token on GitHub.

## Example output

```md
## Daily Report: 2026-10-12

**Summary**
Implemented the billing API refresh and improved test coverage for the onboarding flow. Most of the work focused on stabilizing the latest release candidate and removing a few customer-facing issues.

**Done**
- Added a safer invoice status sync and cleaned up error handling in the billing workflow.
- Improved onboarding validation and expanded regression tests for account setup.

**Notes**
- One larger refactor touched the payment integration and should be watched during deployment.
```

## Notes

- Commit collection is based on the current UTC day.
- Merge commits, lockfile churn, and formatting-only updates may be ignored by the summary logic depending on the commit content.
- The generated output is intentionally brief and optimized for fast status communication rather than detailed technical reporting.

## Development

To contribute or modify the project locally:

```bash
npm install
npm run build
```

This compiles the TypeScript source into the `dist` directory for local testing and packaging.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
