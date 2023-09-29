import { describe, it, expect, afterEach } from "vitest";
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

afterEach(() => {
  snsMock.reset();
});

describe("runMetalTracker", () => {
  describe("when endpoints return a 200 status code", () => {
    it("should save the records returned by the endpoints and send them to Amazon SNS using the provided topic ARN", async () => {
      // Add previously existing records in the database, which will be returned by the endpoint but should be ignored
      const fakePreviousAngryMetalGuy = new FakeWordPressPostsV2({
        sourceName: "Angry Metal Guy",
        type: "review",
      });
      insertRecords(fakePreviousAngryMetalGuy.toRecords());

      const fakeNewAngryMetalGuy = new FakeWordPressPostsV2({
        sourceName: "Angry Metal Guy",
        type: "review",
      });
      nock("https://angrymetalguy.com")
        .get("/wp-json/wp/v2/posts")
        .query(true)
        .reply(200, [
          ...fakePreviousAngryMetalGuy.toJson(),
          ...fakeNewAngryMetalGuy.toJson(),
        ]);

      const fakeConcertsMetal = new FakeConcertsMetalList();
      nock("https://es.concerts-metal.com")
        .get("/rss/ES_Barcelona.xml")
        .reply(200, fakeConcertsMetal.toXml());

      const expectedSaved = [
        ...fakeNewAngryMetalGuy.toRecords(),
        ...fakeConcertsMetal.toRecords(),
      ];

      const topicArn = "topic-arn";

      await runMetalTracker(topicArn);

      const savedRecords = getRecordsByIds(
        expectedSaved.map((record) => record.id),
      );
      expect(savedRecords).toStrictEqual(expectedSaved);

      const callsToAwsSns = snsMock.commandCalls(PublishCommand, {
        TopicArn: topicArn,
      });
      expect(callsToAwsSns).toHaveLength(expectedSaved.length);
    });
  });

  describe("when one endpoint fails", () => {
    it("should save the remaining records returned by the endpoints with a 200 status code and send them to Amazon SNS", async () => {
      const fakeError = new FakeWordPressPostsV2({
        sourceName: "Angry Metal Guy",
        type: "review",
      });
      nock("https://angrymetalguy.com")
        .get("/wp-json/wp/v2/posts")
        .query(true)
        .reply(500, fakeError.toJson());

      const fakeOk = new FakeConcertsMetalList();
      nock("https://es.concerts-metal.com")
        .get("/rss/ES_Barcelona.xml")
        .reply(200, fakeOk.toXml());

      await runMetalTracker("");

      const okRecords = getRecordsByIds(
        fakeOk.toRecords().map((record) => record.id),
      );
      expect(okRecords).toHaveLength(fakeOk.length);

      const errorRecords = getRecordsByIds(
        fakeError.toRecords().map((record) => record.id),
      );
      expect(errorRecords).toHaveLength(0);

      const callsToAwsSns = snsMock.commandCalls(PublishCommand);
      expect(callsToAwsSns).toHaveLength(fakeOk.length);
    });
  });
});
