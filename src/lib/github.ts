import { Octokit } from "@octokit/rest";
import { getSession } from "./session";

/**
 * Build an Octokit client from the current session's GitHub token.
 * Returns null when the user is not authenticated.
 */
export async function getOctokit(): Promise<Octokit | null> {
  const session = await getSession();
  if (!session.token) return null;
  return new Octokit({ auth: session.token });
}

export const GITHUB_OAUTH_AUTHORIZE = "https://github.com/login/oauth/authorize";
export const GITHUB_OAUTH_TOKEN = "https://github.com/login/oauth/access_token";

/** Minimal scope: read public profile. Public repos are readable without `repo`. */
export const GITHUB_SCOPE = "read:user";
