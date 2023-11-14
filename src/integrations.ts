import { z } from "zod";
import { fetcher, removeHtml, subtractDays, xmlParser } from "./utils.js";
import { type Integration, recordSources, recordTypes } from "./domain.js";

const requestTimeoutMsEnvValidation = z.coerce
  .number()
  .default(60 * 1000)
  .safeParse(process.env["REQUEST_TIMEOUT_MS"]);

if (!requestTimeoutMsEnvValidation.success) {
  throw new Error(
    "REQUEST_TIMEOUT_MS env variable must be number or not defined",
  );
}

const REQUEST_TIMEOUT_MS = requestTimeoutMsEnvValidation.data;

const angryMetalGuyResponseSchema = z.array(
  z.object({
    id: z.number(),
    date: z.coerce.date(),
    link: z.string(),
    title: z.object({ rendered: z.string() }),
    excerpt: z.object({ rendered: z.string() }),
  }),
);

const angryMetalGuy: Integration = {
  async getLastRecords() {
    const progressiveMetalTag = 8161;
    const reviewCategory = 13;
    const fetchPostsAfter = subtractDays(new Date(Date.now()), 31);

    const response = await fetcher.get("https://angrymetalguy.com", {
      path: "/wp-json/wp/v2/posts",
      params: {
        page: 1,
        per_page: 100,
        order: "desc",
        orderby: "date",
        after: fetchPostsAfter.toISOString(),
        tags: progressiveMetalTag,
        categories: reviewCategory,
      },
      timeoutMs: REQUEST_TIMEOUT_MS,
    });

    const validated = angryMetalGuyResponseSchema.parse(response);

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
