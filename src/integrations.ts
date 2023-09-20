import { z } from "zod";
import dayjs from "dayjs";
import { fetcher, removeHtml, xmlParser } from "./utils";
import { Record, SourceName, sources } from "./entities";

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
  sourceName: sources.angryMetalGuy,
  async getLastRecords(): Promise<Record[]> {
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
          sourceName: this.sourceName,
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
  sourceName: sources.concertsMetal,
  async getLastRecords(): Promise<Record[]> {
    const response = await fetcher.get("https://concerts-metal.com", {
      path: "/rss/ES_Barcelona.xml",
      responseType: "text",
    });
    const json = await xmlParser(response);

    return this.jsonResponseSchema
      .parse(json)
      .rss.channel[0].item.map((item) => ({
        type: "concert",
        sourceName: this.sourceName,
        id: item.guid[0],
        title: item.title[0],
        link: item.link[0],
        publicationDate: item.pubDate[0],
        description: item.description[0],
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

type Integrations = {
  [K in SourceName]: {
    sourceName: K;
    getLastRecords: () => Promise<Record[]>;
  };
};

const integrations: Integrations = {
  angryMetalGuy,
  concertsMetal,
};

export const getLastRecords = async (): Promise<Record[]> => {
  const promises = Object.values(integrations).map((integration) =>
    integration.getLastRecords(),
  );

  const results = await Promise.all(promises);

  return results.flat();
};
