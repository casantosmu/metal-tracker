import nock from "nock";
import { fetchRecords } from "../src/httpClients";
import { Record } from "../src/entities";
import { jsonToXml } from "../src/utils";
import {
  createFakeConcertsMetal,
  createFakeWordPressJsonV2Posts,
} from "./mocks";

describe("fetchRecords", () => {
  it("should call expected endpoints and return a list of Records", async () => {
    const fakeAngryMetalGuy = createFakeWordPressJsonV2Posts();
    nock("https://angrymetalguy.com")
      .get("/wp-json/wp/v2/posts")
      .query(true)
      .reply(200, fakeAngryMetalGuy);

    const fakeConcertsMetal = createFakeConcertsMetal();
    const fakeConcertsMetalXml = jsonToXml(fakeConcertsMetal);
    nock("https://concerts-metal.com")
      .get("/rss/ES_Barcelona.xml")
      .reply(200, fakeConcertsMetalXml);

    const result = await fetchRecords();

    expect(result).toStrictEqual([
      ...fakeAngryMetalGuy.map(
        (item): Record => ({
          type: "review",
          sourceName: "angryMetalGuy",
          id: item.id.toString(),
          title: item.title.rendered,
          link: item.link,
          publicationDate: item.date,
          description: item.excerpt.rendered,
        }),
      ),
      ...fakeConcertsMetal.rss.channel[0].item.map(
        (item): Record => ({
          type: "concert",
          sourceName: "concertsMetal",
          id: item.guid[0],
          title: item.title[0],
          link: item.link[0],
          publicationDate: new Date(item.pubDate[0]),
          description: item.description[0],
        }),
      ),
    ]);
  });
});
