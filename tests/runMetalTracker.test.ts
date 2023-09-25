import { describe, it, expect } from "vitest";
import nock from "nock";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { mockClient } from "aws-sdk-client-mock";
import { getRecordsByIds, insertRecords } from "../src/db.js";
import { runMetalTracker } from "../src/main.js";
import {
  FakeConcertsMetalList,
  FakeWordPressPostsV2,
} from "./utils/helpers.js";

const snsMock = mockClient(SNSClient);

describe("runMetalTracker", () => {
  it("should save records returned by the endpoints and send them to Amazon SNS with the received topic arn", async () => {
    // Add previously existing records in the database, which will be returned by the endpoint but should be ignored
    const previousAngryMetalGuyRecords = new FakeWordPressPostsV2({
      sourceName: "Angry Metal Guy",
      type: "review",
    });
    insertRecords(previousAngryMetalGuyRecords.toRecords());

    const newAngryMetalGuyRecords = new FakeWordPressPostsV2({
      sourceName: "Angry Metal Guy",
      type: "review",
    });
    nock("https://angrymetalguy.com")
      .get("/wp-json/wp/v2/posts")
      .query(true)
      .reply(200, [
        ...previousAngryMetalGuyRecords.toJson(),
        ...newAngryMetalGuyRecords.toJson(),
      ]);

    const fakeConcertsMetal = new FakeConcertsMetalList();
    nock("https://es.concerts-metal.com")
      .get("/rss/ES_Barcelona.xml")
      .reply(200, fakeConcertsMetal.toXml());

    const expectedSaved = [
      ...newAngryMetalGuyRecords.toRecords(),
      ...fakeConcertsMetal.toRecords(),
    ];

    const topicArn = "topic-arn";

    await runMetalTracker(topicArn);

    const recordsSaved = getRecordsByIds(
      expectedSaved.map((record) => record.id),
    );
    expect(recordsSaved).toStrictEqual(expectedSaved);
    const callsToAwsSns = snsMock.commandCalls(PublishCommand, {
      TopicArn: topicArn,
    });
    expect(callsToAwsSns).toHaveLength(expectedSaved.length);
  });
});
