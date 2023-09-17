import { generateMock } from "@anatine/zod-mock";
import { z } from "zod";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createFakeWordPressJsonV2Posts = () =>
  generateMock(
    z.array(
      z.object({
        id: z.number(),
        date: z.coerce.date(),
        link: z.string(),
        title: z.object({ rendered: z.string() }),
        excerpt: z.object({ rendered: z.string() }),
      }),
    ),
  );

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createFakeConcertsMetal = () =>
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
