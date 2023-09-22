import { describe, it, expect } from "vitest";
import nock from "nock";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { mockClient } from "aws-sdk-client-mock";
import { jsonToXml } from "../src/utils.js";
import { getRecordsByIds, insertRecords } from "../src/db.js";
import { runMetalTracker } from "../src/main.js";
import {
  createFakeConcertsMetalResponse,
  createFakeWordPressJsonV2Posts,
  fakeConcertsMetalResponseToRecords,
  fakeWordPressJsonV2PostsToRecords,
} from "./utils/helpers.js";

const snsMock = mockClient(SNSClient).resolves({});

describe("runMetalTracker", () => {
  it("should save records returned by the endpoints and send them to Amazon SNS", async () => {
    // Add previously existing records in the database, which will be returned by the endpoint but should be ignored
    const previousAngryMetalGuyRecords = createFakeWordPressJsonV2Posts();
    insertRecords(
      fakeWordPressJsonV2PostsToRecords(previousAngryMetalGuyRecords),
    );

    const newAngryMetalGuyRecords = createFakeWordPressJsonV2Posts();
    nock("https://angrymetalguy.com")
      .get("/wp-json/wp/v2/posts")
      .query(true)
      .reply(200, [
        ...previousAngryMetalGuyRecords,
        ...newAngryMetalGuyRecords,
      ]);

    const fakeConcertsMetal = createFakeConcertsMetalResponse();
    nock("https://concerts-metal.com")
      .get("/rss/ES_Barcelona.xml")
      .reply(200, jsonToXml(fakeConcertsMetal));

    const expectedSaved = [
      ...fakeWordPressJsonV2PostsToRecords(newAngryMetalGuyRecords),
      ...fakeConcertsMetalResponseToRecords(fakeConcertsMetal),
    ];

    await runMetalTracker();

    const recordsSaved = getRecordsByIds(
      expectedSaved.map((record) => record.id),
    );
    expect(recordsSaved).toStrictEqual(expectedSaved);
    expect(snsMock.commandCalls(PublishCommand)).toHaveLength(
      expectedSaved.length,
    );
  });
});
