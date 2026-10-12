import { createOAuthDeviceAuth } from "@octokit/auth-oauth-device";
import { spawn } from "node:child_process";
import { chmod, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const getCredentialsPath = () => {
  const configDirectory =
    process.platform === "win32"
      ? (process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"))
      : (process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"));

  return join(configDirectory, "recap-agent", "credentials.json");
};

const openBrowser = (url: string) =>
  new Promise<void>((resolve, reject) => {
    const [command, args] =
      process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : process.platform === "darwin"
          ? ["open", [url]]
          : ["xdg-open", [url]];
    const browser = spawn(command, args, { detached: true, stdio: "ignore" });

    browser.once("error", reject);
    browser.once("spawn", () => {
      browser.unref();
      resolve();
    });
  });

const readSavedToken = async (path: string) => {
  try {
    const contents = await readFile(path, "utf8");
    const credentials: unknown = JSON.parse(contents);

    if (
      typeof credentials !== "object" ||
      credentials === null ||
      !("token" in credentials) ||
      typeof credentials.token !== "string" ||
      credentials.token.length === 0
    ) {
      throw new Error(`GitHub credentials file is invalid: ${path}`);
    }

    return credentials.token;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
    throw error;
  }
};

const saveToken = async (path: string, token: string) => {
  const directory = dirname(path);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(path, JSON.stringify({ token }, null, 2), { encoding: "utf8", mode: 0o600 });

  if (process.platform !== "win32") {
    await chmod(directory, 0o700);
    await chmod(path, 0o600);
  }
};

export const logoutGitHub = async () => {
  try {
    await unlink(getCredentialsPath());
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
};

export const getGitHubToken = async () => {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;

  const credentialsPath = getCredentialsPath();
  const savedToken = await readSavedToken(credentialsPath);
  if (savedToken) return savedToken;

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "GitHub is not connected. Set GITHUB_CLIENT_ID to an OAuth App client ID with device flow enabled, then run Recap Agent again.",
    );
  }

  const auth = createOAuthDeviceAuth({
    clientId,
    scopes: ["repo", "read:user"],
    onVerification: async ({ verification_uri, user_code }) => {
      console.log("Authorize Recap Agent in your browser:");
      console.log(`  ${verification_uri}`);
      console.log(`Enter this code: ${user_code}`);

      try {
        await openBrowser(verification_uri);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(`Could not open the browser automatically: ${reason}`);
      }
    },
  });

  const authentication = await auth({ type: "oauth" });
  await saveToken(credentialsPath, authentication.token);
  console.log("GitHub account connected.");

  return authentication.token;
};
