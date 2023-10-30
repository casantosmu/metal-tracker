import { z } from "zod";
import { fetcher, removeHtml, subtractDays, xmlParser } from "./utils.js";
import {
  type TRecord,
  type Integration,
  sources,
  recordTypes,
} from "./domain.js";

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

const angryMetalGuy = {
  sourceName: sources.angryMetalGuy,
  async getLastRecords(): Promise<TRecord[]> {
    const progressiveMetalTag = 8161;
    const reviewCategory = 13;
    const fetchPostsAfter = subtractDays(new Date(Date.now()), 31);

    const response = await fetcher.get("https://angrymetalguy.com", {
      timeoutMs: REQUEST_TIMEOUT_MS,
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
        sourceName: sources.angryMetalGuy,
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

const concertsMetal = {
  sourceName: sources.concertsMetal,
  async getLastRecords(): Promise<TRecord[]> {
    const response = await fetcher.get("https://es.concerts-metal.com", {
      timeoutMs: REQUEST_TIMEOUT_MS,
      path: "/rss/ES_Barcelona.xml",
      responseType: "text",
    });
    const json = await xmlParser(response);

    const validated = concertsMetalResponseSchema.parse(json);

    return validated.rss.channel[0].item.map((item) => ({
      type: recordTypes.concert,
      sourceName: sources.concertsMetal,
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
