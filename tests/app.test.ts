import { describe, it, expect, vi, beforeEach } from "vitest";
import nock from "nock";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { mockClient } from "aws-sdk-client-mock";
import { getRecordsByIds, insertRecords } from "../src/db.js";
import {
  FakeConcertsMetalList,
  FakeWordPressPostsV2,
} from "./utils/helpers.js";

const snsMock = mockClient(SNSClient);

const loadApp = async (): Promise<void> => {
  await (await import("../src/app.js")).app();
};

beforeEach(() => {
  snsMock.reset();
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("app", () => {
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

      const expectedSaved = [
        ...fakeAngryMetalGuy.toRecords(),
        ...fakeConcertsMetal.toRecords(),
      ];

      const SNS_TOPIC_ARN = "topic-arn";
      vi.stubEnv("SNS_TOPIC_ARN", SNS_TOPIC_ARN);

      await loadApp();

      const savedRecords = getRecordsByIds(
        expectedSaved.map((record) => record.id),
      );
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

      const okRecords = getRecordsByIds(
        fakeOk.toRecords().map((record) => record.id),
      );
      expect(okRecords).toHaveLength(fakeOk.length);

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
      snsMock.rejectsOnce();

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
        .reply(200, new FakeConcertsMetalList().toXml());

      await loadApp();

      const savedRecords = getRecordsByIds(
        fakeAngryMetalGuy.toRecords().map((record) => record.id),
      );
      expect(savedRecords).toHaveLength(fakeAngryMetalGuy.length - 1);
    });
  });
});
