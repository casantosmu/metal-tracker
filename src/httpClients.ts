import { z } from "zod";
import dayjs from "dayjs";
import { fetcher, removeHtml } from "./utils";
import { Record } from "./entities";

const fetchPostInTheLastDays = 7;

const wordPressConstants = {
  maxPerPage: 100,
  jsonV2PostsPath: "/wp-json/wp/v2/posts",
};

const fetchPostsWordPressV2ResponseSchema = z.array(
  z.object({
    id: z.number(),
    date: z.coerce.date(),
    link: z.string(),
    title: z.object({ rendered: z.string() }),
    excerpt: z.object({ rendered: z.string() }),
  }),
);

const angryMetalGuyConstants = {
  siteName: "AngryMetalGuy",
  baseUrl: "https://angrymetalguy.com",
  tags: {
    progressiveMetal: 8161,
  },
  categories: {
    review: 13,
  },
};

const fetchAngryMetalGuyReviews = async (): Promise<Record[]> => {
  const { maxPerPage, jsonV2PostsPath } = wordPressConstants;
  const { siteName, baseUrl, tags, categories } = angryMetalGuyConstants;

  const posts = await fetcher.get(baseUrl, {
    path: jsonV2PostsPath,
    params: {
      page: 1,
      per_page: maxPerPage,
      order: "desc",
      orderby: "date",
      after: dayjs().subtract(fetchPostInTheLastDays, "days").toISOString(),
      tags: tags.progressiveMetal,
      categories: categories.review,
    },
  });

  return fetchPostsWordPressV2ResponseSchema
    .parse(posts)
    .map(
      ({
        id,
        date: publicationDate,
        link,
        title: { rendered: title },
        excerpt: { rendered: summary },
      }) => ({
        type: "review",
        siteName,
        id,
        title: removeHtml(title),
        link,
        publicationDate,
        description: removeHtml(summary),
      }),
    );
};

export const fetchReviews = async (): Promise<Record[]> =>
  fetchAngryMetalGuyReviews();
