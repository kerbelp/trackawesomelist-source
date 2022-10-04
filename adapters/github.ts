import API from "./api.ts";
import { RepoMeta, RepoMetaOverride, Source } from "../interface.ts";
import { base64 } from "../deps.ts";
import { got, gotWithCache, isUseCache } from "../util.ts";
export default class github extends API {
  repo: string;
  headers: Headers;
  apiPrefix = `https://api.github.com`;
  constructor(source: Source) {
    super(source);
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    if (!githubToken) {
      throw new Error("GITHUB_TOKEN is not set");
    }
    const headerAuthorization = `token ${githubToken}`;
    this.headers = new Headers({
      Authorization: headerAuthorization,
    });
    const urlObj = new URL(source.url);
    this.repo = urlObj.pathname.slice(1);
    if (this.repo.endsWith(".git")) {
      this.repo = this.repo.slice(0, -4);
    }
    if (this.repo.endsWith("/")) {
      this.repo = this.repo.slice(0, -1);
    }
  }
  getCloneUrl(): string {
    return `https://github.com/${this.repo}.git`;
  }
  async getConent(filePath: string): Promise<string> {
    const url = `${this.apiPrefix}/repos/${this.repo}/contents/${filePath}`;
    let result;
    if (isUseCache()) {
      result = await gotWithCache(
        url,
        {
          headers: this.headers,
        },
      );
    } else {
      result = await got(
        url,
        {
          headers: this.headers,
        },
      );
    }

    const data = JSON.parse(result);
    const content = base64.decode(data.content);
    const finalContent = new TextDecoder().decode(content);
    return finalContent;
  }
  async getRepoMeta(overrieds?: RepoMetaOverride): Promise<RepoMeta> {
    const url = `${this.apiPrefix}/repos/${this.repo}`;
    const json = await gotWithCache(
      url,
      {
        headers: this.headers,
      },
    );
    const data = JSON.parse(json);

    let repoMeta: RepoMeta = {
      default_branch: data.default_branch,
      name: data.name,
      description: data.description,
      url: data.html_url,
      language: data.language,
      stargazers_count: data.stargazers_count,
      watchers_count: data.watchers_count,
      forks_count: data.forks_count,
      tags: data.topics,
      updated_at: data.pushed_at,
      created_at: data.created_at,
      checked_at: new Date().toISOString(),
    };
    // add overrides
    if (overrieds) {
      repoMeta = Object.assign(repoMeta, overrieds);
    }
    return repoMeta;
  }
}
