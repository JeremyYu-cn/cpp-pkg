import type { AxiosRequestConfig } from "axios";
import type { GetPkgOptions } from "../types/global";
import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { resolveCliConfig } from "../public/config";

type RequestOptions = Pick<
  GetPkgOptions,
  "giteeToken" | "githubToken" | "httpProxy" | "httpsProxy"
>;

type Provider = "gitee" | "github";

function getProviderForURL(rawURL: string): Provider | null {
  try {
    const parsed = new URL(rawURL);

    if (["github.com", "www.github.com", "api.github.com"].includes(parsed.hostname)) {
      return "github";
    }

    if (["gitee.com", "www.gitee.com"].includes(parsed.hostname)) {
      return "gitee";
    }
  } catch {
    return null;
  }

  return null;
}

export function getGitHubToken(options: RequestOptions = {}) {
  const config = resolveCliConfig();

  return (
    options.githubToken ||
    config.githubToken ||
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    ""
  );
}

export function getGiteeToken(options: RequestOptions = {}) {
  const config = resolveCliConfig();

  return options.giteeToken || config.giteeToken || process.env.GITEE_TOKEN || "";
}

export function hasProviderToken(provider: Provider, options: RequestOptions = {}) {
  return provider === "github"
    ? Boolean(getGitHubToken(options))
    : Boolean(getGiteeToken(options));
}

export function getRequestHeaders(
  rawURL: string,
  options: RequestOptions = {},
  headers: Record<string, string> = {},
) {
  const provider = getProviderForURL(rawURL);
  const resolvedHeaders = { ...headers };

  if (provider === "github") {
    const token = getGitHubToken(options);

    if (token) {
      resolvedHeaders.authorization = `Bearer ${token}`;
    }
  }

  if (provider === "gitee") {
    const token = getGiteeToken(options);

    if (token) {
      resolvedHeaders.authorization = `Bearer ${token}`;
    }
  }

  return resolvedHeaders;
}

export function getRequestParams(rawURL: string, options: RequestOptions = {}) {
  const provider = getProviderForURL(rawURL);

  if (provider !== "gitee") {
    return undefined;
  }

  const token = getGiteeToken(options);

  return token ? { access_token: token } : undefined;
}

/**
 * Builds axios proxy agents from CLI flags, project config, or environment variables.
 */
export function getRequestProxy(
  httpProxy?: string,
  httpsProxy?: string,
): Pick<AxiosRequestConfig, "httpAgent" | "httpsAgent" | "proxy"> {
  const config = resolveCliConfig();
  const httpProxyURL =
    httpProxy ||
    config.httpProxy ||
    config.proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy;
  const httpsProxyURL =
    httpsProxy ||
    config.httpsProxy ||
    config.proxy ||
    config.httpProxy ||
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    httpProxyURL;

  return {
    httpAgent: httpProxyURL ? new HttpProxyAgent(httpProxyURL) : undefined,
    httpsAgent: httpsProxyURL ? new HttpsProxyAgent(httpsProxyURL) : undefined,
    proxy: false,
  };
}

export function getRequestConfig(
  rawURL: string,
  options: RequestOptions = {},
  headers: Record<string, string> = {},
): Pick<
  AxiosRequestConfig,
  "headers" | "httpAgent" | "httpsAgent" | "params" | "proxy"
> {
  return {
    headers: getRequestHeaders(rawURL, options, headers),
    params: getRequestParams(rawURL, options),
    ...getRequestProxy(options.httpProxy, options.httpsProxy),
  };
}
