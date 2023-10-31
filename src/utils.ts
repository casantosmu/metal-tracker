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

const buildUrl = (url: string, options?: UrlOptions): string => {
  const result = options?.path ? new URL(options.path, url) : new URL(url);

  if (options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      result.searchParams.append(key, value.toString());
    });
  }

  return result.toString();
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
): Promise<Record<string, unknown>>;
async function getFn(
  url: string,
  options?: FetcherOptions & { responseType?: "text" | "json" },
): Promise<string | Record<string, unknown>> {
  const endpoint = buildUrl(url, options);

  const abortSignal = options?.timeoutMs
    ? AbortSignal.timeout(options.timeoutMs)
    : null;

  let response: Response;
  try {
    response = await fetch(endpoint, { signal: abortSignal });
  } catch (error) {
    const customError = new Error(`Request to GET '${endpoint}' failed`);

    if (options?.timeoutMs && abortSignal?.aborted) {
      customError.cause = `Timed out (${options.timeoutMs} ms)`;
    } else {
      customError.cause = error;
    }

    throw customError;
  }

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Error occurred while making a GET request to '${endpoint}':\n- Response Status: ${response.status} (${response.statusText})\n- Server Error Message: ${text}`,
    );
  }

  logger.debug(`GET ${response.status} '${endpoint}'`);

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
