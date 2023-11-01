import { z } from "zod";
import { fetcher, removeHtml, subtractDays, xmlParser } from "./utils.js";
import { type Integration, recordSources, recordTypes } from "./domain.js";

const REQUEST_TIMEOUT_MS =
  Number(process.env["REQUEST_TIMEOUT_MS"]) || 60 * 1000;

const wordPressUtils = {
  maxPerPage: 100,
  jsonV2PostsPath: "/wp-json/wp/v2/posts",
  jsonV2PostsResponseSchema: z.array(
    z.object({
      id: z.number(),
      date: z.coerce.date(),
      link: z.string(),
      title: z.object({ rendered: z.string() }),
      excerpt: z.object({ rendered: z.string() }),
    }),
  ),
};

const angryMetalGuy: Integration = {
  source: recordSources.angryMetalGuy,
  async getLastRecords() {
    const progressiveMetalTag = 8161;
    const reviewCategory = 13;
    const fetchPostsAfter = subtractDays(new Date(Date.now()), 31);

    const response = await fetcher.get("https://angrymetalguy.com", {
      path: wordPressUtils.jsonV2PostsPath,
      params: {
        page: 1,
        per_page: wordPressUtils.maxPerPage,
        order: "desc",
        orderby: "date",
        after: fetchPostsAfter.toISOString(),
        tags: progressiveMetalTag,
        categories: reviewCategory,
      },
      timeoutMs: REQUEST_TIMEOUT_MS,
    });

    const validated = wordPressUtils.jsonV2PostsResponseSchema.parse(response);

    return validated.map(
      ({
        id,
        date: publicationDate,
        link,
        title: { rendered: title },
        excerpt: { rendered: summary },
      }) => ({
        type: recordTypes.review,
        source: recordSources.angryMetalGuy,
        id: id.toString(),
        title: removeHtml(title),
        link,
        publicationDate,
        description: removeHtml(summary),
      }),
    );
  },
};

const concertsMetalResponseSchema = z.object({
  rss: z.object({
    channel: z
      .array(
        z.object({
          item: z.array(
            z.object({
              title: z.array(z.string()).nonempty(),
              pubDate: z.array(z.coerce.date()).nonempty(),
              link: z.array(z.string()).nonempty(),
              guid: z.array(z.string()).nonempty(),
              description: z.array(z.string()).nonempty(),
            }),
          ),
        }),
      )
      .nonempty(),
  }),
});

const concertsMetal: Integration = {
  source: recordSources.concertsMetal,
  async getLastRecords() {
    const response = await fetcher.get("https://es.concerts-metal.com", {
      path: "/rss/ES_Barcelona.xml",
      responseType: "text",
      timeoutMs: REQUEST_TIMEOUT_MS,
    });
    const json = await xmlParser(response);

    const validated = concertsMetalResponseSchema.parse(json);

    return validated.rss.channel[0].item.map((item) => ({
      type: recordTypes.concert,
      source: recordSources.concertsMetal,
      id: item.guid[0],
      title: removeHtml(item.title[0]),
      link: item.link[0],
      publicationDate: item.pubDate[0],
      description: removeHtml(item.description[0]),
    }));
  },
};

export const integrations: Record<string, Integration> = {
  angryMetalGuy,
  concertsMetal,
};
