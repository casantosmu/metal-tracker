import { z } from "zod";
import dayjs from "dayjs";
import { fetcher, removeHtml } from "./utils";
import { Record, SourceName } from "./entities";

const fetchPostInTheLastDays = 7;

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

type Integrations = {
  [K in SourceName]: {
    sourceName: K;
    fetchRecords: () => Promise<Record[]>;
  };
};

const integrations: Integrations = {
  angryMetalGuy: {
    sourceName: "angryMetalGuy",
    async fetchRecords() {
      const progressiveMetalTag = 8161;
      const reviewCategory = 13;

      const reviews = await fetcher.get("https://angrymetalguy.com", {
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
        .parse(reviews)
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
  },
};

export const fetchRecords = async (): Promise<Record[]> => {
  return integrations.angryMetalGuy.fetchRecords();
};
