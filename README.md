# Recap Agent

Recap Agent collects the current day's commits from your GitHub repositories.

## Connect GitHub

On the first run, Recap Agent connects to GitHub using the OAuth device flow. Create a GitHub OAuth App, enable **Device Flow**, and set its client ID in `GITHUB_CLIENT_ID`. No client secret is needed. When Recap Agent runs, it opens GitHub in your browser and asks you to enter the displayed one-time code.

The OAuth app needs the `repo` scope to read commits from private repositories. The access token is saved in your user config directory (`%APPDATA%\recap-agent\credentials.json` on Windows or `$XDG_CONFIG_HOME/recap-agent/credentials.json` / `~/.config/recap-agent/credentials.json` elsewhere). On Unix-like systems the file is restricted to the current user. To use a token managed outside Recap Agent instead, set `GITHUB_TOKEN`; that value takes precedence over the saved token.

Set `GITHUB_USERNAME` to override the authenticated GitHub account used to filter commits. Set `GITHUB_ORGS` to a comma-separated list of organizations to include.

## Disconnect GitHub

Run Recap Agent with `--logout` (or `-l`) to remove the saved GitHub credentials. This does not revoke the token on GitHub. If `GITHUB_TOKEN` is set, it continues to authenticate future runs until you unset it.
