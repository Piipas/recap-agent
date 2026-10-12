# Recap Agent

A lightweight CLI that gathers your GitHub activity for the current day and turns it into a concise, manager-friendly work recap.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-43853d)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)](https://www.typescriptlang.org/)

## Overview

Recap Agent helps you quickly summarize your daily development work without manually reviewing every commit. It authenticates with GitHub, reads commits created during the current UTC day, and sends them to an AI model that produces a short daily report in markdown.

This is useful for:

- end-of-day summaries for managers or leads
- quick team updates without writing a full status report
- translating work summaries into different languages
- tracking activity across personal and organization repositories

## Features

- Collects commits for the current day from user and organization repositories
- Supports GitHub OAuth device flow for secure first-time authentication
- Enables custom filtering via `GITHUB_USERNAME` and `GITHUB_ORGS`
- Generates a short markdown recap with sections such as Summary, Done, and Notes
- Supports output in multiple languages using the `--language` flag
- Can remove saved GitHub credentials with a logout command

## How it works

1. The app authenticates with GitHub using a device flow.
2. It loads repositories owned by the selected user and any configured organizations.
3. It fetches commits authored by the current GitHub account for the current UTC day.
4. It sends the commit payload to Groq-powered AI summarization.
5. It prints a markdown report directly to the terminal.

## Requirements

Before using Recap Agent, make sure you have:

- Node.js 20 or newer
- A GitHub OAuth App with Device Flow enabled
- A Groq API key

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Piipas/recap-agent.git
cd recap-agent
npm install
```

## Configuration

Create a `.env` file in the project root:

```env
GITHUB_CLIENT_ID=your_github_oauth_app_client_id
GROQ_API_KEY=your_groq_api_key

# Optional overrides
GITHUB_USERNAME=your_github_username
GITHUB_ORGS=org-one,org-two
GITHUB_TOKEN=your_github_token
```

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth app client ID used for device flow authentication. |
| `GROQ_API_KEY` | Yes | API key used by the AI summarization layer. |
| `GITHUB_USERNAME` | No | Overrides the GitHub account used to filter commits. |
| `GITHUB_ORGS` | No | Comma-separated list of organizations to include in the scan. |
| `GITHUB_TOKEN` | No | Direct token override. If present, it takes precedence over the saved credentials file. |

## GitHub authentication

On the first run, the app performs a GitHub OAuth device flow.

1. Create a GitHub OAuth App.
2. Enable Device Flow in the app settings.
3. Set the app's client ID in `GITHUB_CLIENT_ID`.
4. Run the project.
5. Open the URL shown in the terminal and enter the displayed one-time code.

The OAuth app should include the `repo` scope when access to private repositories is needed.

The token is saved in the user configuration directory:

- Windows: `%APPDATA%\recap-agent\credentials.json`
- Linux/macOS: `$XDG_CONFIG_HOME/recap-agent/credentials.json` or `~/.config/recap-agent/credentials.json`

## Usage

Run the application from the repository root:

```bash
node --experimental-strip-types index.ts
```

### Command-line options

```bash
node --experimental-strip-types index.ts --repo-type "user org" --language en
```

| Option | Description |
| --- | --- |
| `--repo-type` / `-t` | Repository scope to inspect. Can be `user`, `org`, or a combination like `"user org"`. |
| `--language` / `-l` | Output language for the generated report. Example values: `en`, `fr`, `es`, `de`, `pt`, `ja`. |
| `--logout` / `-o` | Remove the locally saved GitHub credentials. |

### Example

```bash
node --experimental-strip-types index.ts --repo-type "user org" --language fr
```

This checks personal repositories and the configured org repositories for commits from today and prints a French-language recap.

## Logout

To remove saved GitHub credentials:

```bash
node --experimental-strip-types index.ts --logout
```

This deletes the local token file without revoking the token on GitHub itself. If `GITHUB_TOKEN` is set in the environment, it remains active until you remove it.

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

- The tool evaluates commits created during the current UTC day.
- Merge commits, lockfile churn, and formatting-only changes may be filtered by the summary logic depending on the commit content.
- The output is intentionally brief and written for quick team or manager updates rather than raw technical reporting.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
