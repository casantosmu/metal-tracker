import { generateMock } from "@anatine/zod-mock";
import { z } from "zod";
import { Record } from "../src/entities";
import { dropTables, runMigrations } from "../src/db";

export const setupDb = (): void => {
  runMigrations();
};

export const closeDb = (): void => {
  if (Math.random() < 0.2) {
    dropTables();
  }
};

interface FakeWordPressJsonV2Post {
  link: string;
  id: number;
  date: string;
  title: {
    rendered: string;
  };
  excerpt: {
    rendered: string;
  };
}

export const createFakeWordPressJsonV2Posts = (): FakeWordPressJsonV2Post[] =>
  generateMock(
    z.array(
      z.object({
        id: z.number(),
        date: z.string().datetime(),
        link: z.string(),
        title: z.object({ rendered: z.string() }),
        excerpt: z.object({ rendered: z.string() }),
      }),
    ),
  );

export const fakeWordPressJsonV2PostsToRecords = (
  posts: FakeWordPressJsonV2Post[],
): Record[] =>
  posts.map((post) => ({
    type: "review",
    sourceName: "angryMetalGuy",
    id: post.id.toString(),
    title: post.title.rendered,
    link: post.link,
    publicationDate: new Date(post.date),
    description: post.excerpt.rendered,
  }));

interface FakeConcertsMetalResponse {
  rss: {
    channel: [
      {
        item: {
          link: [string, ...string[]];
          title: [string, ...string[]];
          pubDate: [string, ...string[]];
          guid: [string, ...string[]];
          description: [string, ...string[]];
        }[];
      },
      ...{
        item: {
          link: [string, ...string[]];
          title: [string, ...string[]];
          pubDate: [string, ...string[]];
          guid: [string, ...string[]];
          description: [string, ...string[]];
        }[];
      }[],
    ];
  };
}

export const createFakeConcertsMetalResponse = (): FakeConcertsMetalResponse =>
  generateMock(
    z.object({
      rss: z.object({
        channel: z
          .array(
            z.object({
              item: z.array(
                z.object({
                  title: z.array(z.string()).nonempty(),
                  pubDate: z.array(z.string().datetime()).nonempty(),
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
  );

export const fakeConcertsMetalResponseToRecords = (
  response: FakeConcertsMetalResponse,
): Record[] =>
  response.rss.channel[0].item.map((item) => ({
    type: "concert",
    sourceName: "concertsMetal",
    id: item.guid[0],
    title: item.title[0],
    link: item.link[0],
    publicationDate: new Date(item.pubDate[0]),
    description: item.description[0],
  }));
