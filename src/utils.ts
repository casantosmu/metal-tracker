import fetch, { Response } from "node-fetch";
import { stripHtml } from "string-strip-html";
import { Parser as XmlParser, Builder as XmlBuilder } from "xml2js";
import { pino } from "pino";

export const logger = pino({
  level: process.env["LOG_LEVEL"] ?? "info",
});

interface UrlOptions {
  path?: string;
  params?: Record<string, string | number>;
}

const buildUrl = (baseUrl: string, options?: UrlOptions): string => {
  const url = options?.path ? new URL(options.path, baseUrl) : new URL(baseUrl);
  if (options?.params) {
    for (const [key, value] of Object.entries(options.params)) {
      url.searchParams.append(key, value.toString());
    }
  }
  return url.toString();
};

const fetchWithTimeout = async (
  url: string,
  timeoutMs: number,
): Promise<Response> => {
  const abortSignal = AbortSignal.timeout(timeoutMs);
  try {
    return await fetch(url, { signal: abortSignal });
  } catch (error) {
    if (abortSignal.aborted) {
      throw new Error(`Request to GET '${url}' timed out (${timeoutMs} ms)`);
    }
    throw error;
  }
};

type FetcherOptions = UrlOptions & { timeoutMs?: number };

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
): Promise<unknown>;
async function getFn(
  url: string,
  options?: FetcherOptions & { responseType?: "text" | "json" },
): Promise<unknown> {
  const endpoint = buildUrl(url, options);

  const response = options?.timeoutMs
    ? await fetchWithTimeout(endpoint, options.timeoutMs)
    : await fetch(endpoint);

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Error occurred while making a GET request to '${endpoint}':\n- Response Status: ${response.status} (${response.statusText})\n- Server Error Message: ${text}`,
    );
  }

  logger.debug(`GET ${response.status} '${endpoint}'`);

  const result: unknown =
    options?.responseType === "text" ? text : JSON.parse(text);

  return result;
}

export const fetcher = {
  get: getFn,
};

export const removeHtml = (string: string): string => stripHtml(string).result;

export const xmlParser = (string: string): Promise<unknown> =>
  new XmlParser().parseStringPromise(string);

export const toXml = (value: unknown): string =>
  new XmlBuilder().buildObject(value);

export const isControlCharacter = (character: string): boolean =>
  character.charCodeAt(0) <= 31;

export const isAsciiCharacter = (character: string): boolean =>
  character.charCodeAt(0) <= 255;

export const truncateString = (
  string: string,
  maxLong: number,
  end = "...",
): string =>
  string.length <= maxLong
    ? string
    : `${string.slice(0, maxLong - end.length)}${end}`;

export const subtractDays = (from: Date, days: number): Date =>
  new Date(from.getTime() - days * 24 * 60 * 60 * 1000);
