import { stripHtml } from "string-strip-html";
import { Parser as XmlParser } from "xml2js";

interface UrlOptions {
  path?: string;
  params?: Record<string, string | number>;
}

export const buildUrl = (url: string, options?: UrlOptions): string => {
  const result = options?.path ? new URL(options.path, url) : new URL(url);

  if (options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      result.searchParams.append(key, value.toString());
    });
  }

  return result.toString();
};

type FetcherOptions = UrlOptions & RequestInit;

async function getFn(
  url: string,
  options: FetcherOptions & {
    responseType: "text";
  },
): Promise<string>;
async function getFn(
  url: string,
  options?: FetcherOptions & {
    responseType?: "json";
  },
): Promise<Record<string, unknown>>;
async function getFn(
  url: string,
  options?: FetcherOptions & { responseType?: "text" | "json" },
): Promise<string | Record<string, unknown>> {
  const endpoint = buildUrl(url, options);

  const response = await fetch(endpoint, options);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`
      Error occurred while making a GET request to '${endpoint}':
      - Response Status: ${response.status} (${response.statusText})
      - Server Error Message: ${text}
    `);
  }

  const result =
    options?.responseType === "text"
      ? text
      : (JSON.parse(text) as Record<string, unknown>);

  return result;
}

export const fetcher = {
  get: getFn,
};

export const removeHtml = (string: string): string => stripHtml(string).result;

export const xmlParser = (string: string): Promise<Record<string, unknown>> =>
  new XmlParser().parseStringPromise(string) as Promise<
    Record<string, unknown>
  >;
