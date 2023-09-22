import { z } from "zod";
import dayjs from "dayjs";
import { fetcher, removeHtml, xmlParser } from "./utils.js";
import { type TRecord, sources } from "./entities.js";

const wordPressUtils = {
  maxPerPage: 100,
  jsonV2PostsPath: "/wp-json/wp/v2/posts",
  jsonV2PostSchema: z.array(
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
  async getLastRecords(): Promise<TRecord[]> {
    const progressiveMetalTag = 8161;
    const reviewCategory = 13;
    const fetchPostInTheLastDays = 31;

    const response = await fetcher.get("https://angrymetalguy.com", {
      path: wordPressUtils.jsonV2PostsPath,
      params: {
        page: 1,
        per_page: wordPressUtils.maxPerPage,
        order: "desc",
        orderby: "date",
        after: dayjs().subtract(fetchPostInTheLastDays, "days").toISOString(),
        tags: progressiveMetalTag,
        categories: reviewCategory,
      },
    });

    return wordPressUtils.jsonV2PostSchema
      .parse(response)
      .map(
        ({
          id,
          date: publicationDate,
          link,
          title: { rendered: title },
          excerpt: { rendered: summary },
        }) => ({
          type: "review",
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

const concertsMetal = {
  async getLastRecords(): Promise<TRecord[]> {
    const response = await fetcher.get("https://es.concerts-metal.com", {
      path: "/rss/ES_Barcelona.xml",
      responseType: "text",
    });
    const json = await xmlParser(response);

    return this.jsonResponseSchema
      .parse(json)
      .rss.channel[0].item.map((item) => ({
        type: "concert",
        sourceName: sources.concertsMetal,
        id: item.guid[0],
        title: removeHtml(item.title[0]),
        link: item.link[0],
        publicationDate: item.pubDate[0],
        description: removeHtml(item.description[0]),
      }));
  },
  jsonResponseSchema: z.object({
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
  }),
};

interface Integration {
  getLastRecords: () => Promise<TRecord[]>;
}

const integrations: Record<string, Integration> = {
  angryMetalGuy,
  concertsMetal,
};

export const getLastRecords = async (): Promise<TRecord[]> => {
  const promises = Object.values(integrations).map((integration) =>
    integration.getLastRecords(),
  );

  const results = await Promise.all(promises);

  return results.flat();
};
