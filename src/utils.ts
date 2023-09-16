import { stripHtml } from "string-strip-html";

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

export const fetcher = {
  get: async (
    url: string,
    options?: UrlOptions & RequestInit,
  ): Promise<Record<string, unknown>> => {
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

    return JSON.parse(text) as Record<string, unknown>;
  },
};

export const removeHtml = (string: string): string => stripHtml(string).result;
