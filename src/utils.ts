import fetch, { type RequestInit } from "node-fetch";
import { stripHtml } from "string-strip-html";
import { Parser as XmlParser, Builder as XmlBuilder } from "xml2js";

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
