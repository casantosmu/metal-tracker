import { describe, it, expect, vi, beforeEach } from "vitest";
import nock from "nock";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { mockClient } from "aws-sdk-client-mock";
import { getRecordsByKeysDb, insertRecordsDb } from "../src/db.js";
import {
  FakeConcertsMetalList,
  FakeWordPressPostsV2,
  recordsSortedBy,
} from "./utils/helpers.js";

const snsMock = mockClient(SNSClient);

const loadApp = async (): Promise<void> => {
  await (await import("../src/app.js")).loadApp();
};

beforeEach(() => {
  snsMock.reset();
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("loadApp", () => {
  describe("when endpoints return a 200 status code", () => {
    it("should save the records returned by the endpoints and send them to Amazon SNS using the SNS_TOPIC_ARN env variable", async () => {
      const fakeAngryMetalGuy = new FakeWordPressPostsV2({
        sourceName: "Angry Metal Guy",
        type: "review",
      });
      nock("https://angrymetalguy.com")
        .get("/wp-json/wp/v2/posts")
        .query(true)
        .reply(200, fakeAngryMetalGuy.toJson());

      const fakeConcertsMetal = new FakeConcertsMetalList();
      nock("https://es.concerts-metal.com")
        .get("/rss/ES_Barcelona.xml")
        .reply(200, fakeConcertsMetal.toXml());

      const SNS_TOPIC_ARN = "topic-arn";
      vi.stubEnv("SNS_TOPIC_ARN", SNS_TOPIC_ARN);

      await loadApp();

      const expectedSaved = [
        ...fakeAngryMetalGuy.toRecords(),
        ...fakeConcertsMetal.toRecords(),
      ].sort(recordsSortedBy("publicationDate"));

      const savedRecords = getRecordsByKeysDb(
        expectedSaved.map(({ id, sourceName }) => [id, sourceName]),
      ).sort(recordsSortedBy("publicationDate"));

      expect(savedRecords).toStrictEqual(expectedSaved);

      const callsToAwsSns = snsMock.commandCalls(PublishCommand, {
        TopicArn: SNS_TOPIC_ARN,
      });
      expect(callsToAwsSns).toHaveLength(expectedSaved.length);
    });
  });

  describe("when one endpoint fails", () => {
    it("should save the remaining records returned by the endpoints with a 200 status code and send them to Amazon SNS", async () => {
      nock("https://angrymetalguy.com")
        .get("/wp-json/wp/v2/posts")
        .query(true)
        .reply(500, { error: "msg" });

      const fakeOk = new FakeConcertsMetalList();
      nock("https://es.concerts-metal.com")
        .get("/rss/ES_Barcelona.xml")
        .reply(200, fakeOk.toXml());

      await loadApp();

      const savedRecords = getRecordsByKeysDb(
        fakeOk.toRecords().map(({ id, sourceName }) => [id, sourceName]),
      );
      expect(savedRecords).toHaveLength(fakeOk.length);

      const callsToAwsSns = snsMock.commandCalls(PublishCommand);
      expect(callsToAwsSns).toHaveLength(fakeOk.length);
    });
  });

  describe("when one endpoint returns new records and previously added records", () => {
    it("should only send the new records to Amazon SNS", async () => {
      const fakePreviousAngryMetalGuy = new FakeWordPressPostsV2({
        sourceName: "Angry Metal Guy",
        type: "review",
      });
      insertRecordsDb(fakePreviousAngryMetalGuy.toRecords());

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

      nock("https://es.concerts-metal.com")
        .get("/rss/ES_Barcelona.xml")
        .reply(200, new FakeConcertsMetalList(0).toXml());

      await loadApp();

      const callsToAwsSns = snsMock.commandCalls(PublishCommand);
      expect(callsToAwsSns).toHaveLength(fakeNewAngryMetalGuy.length);
    });
  });

  describe("When the endpoint returns records but first record sent to Amazon AWS fails", () => {
    it("should successfully save all records except the failed one", async () => {
      const fakeAngryMetalGuy = new FakeWordPressPostsV2({
        sourceName: "Angry Metal Guy",
        type: "review",
      });
      nock("https://angrymetalguy.com")
        .get("/wp-json/wp/v2/posts")
        .query(true)
        .reply(200, fakeAngryMetalGuy.toJson());

      nock("https://es.concerts-metal.com")
        .get("/rss/ES_Barcelona.xml")
        .reply(200, new FakeConcertsMetalList(0).toXml());

      snsMock.rejectsOnce();

      await loadApp();

      const savedRecords = getRecordsByKeysDb(
        fakeAngryMetalGuy
          .toRecords()
          .map(({ id, sourceName }) => [id, sourceName]),
      );
      expect(savedRecords).toHaveLength(fakeAngryMetalGuy.length - 1);
    });
  });
});
