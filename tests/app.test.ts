import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
} from "vitest";
import nock, {
  disableNetConnect as nockDisableNetConnect,
  cleanAll as nockCleanAll,
} from "nock";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { mockClient } from "aws-sdk-client-mock";
import {
  loadMigrations,
  getRecordsByKeysDb,
  insertRecordsDb,
} from "../src/db.js";
import {
  FakeConcertsMetalList,
  FakeWordPressPostsV2,
  recordsSortedBy,
} from "./utils/helpers.js";

beforeAll(() => {
  loadMigrations();
  nockDisableNetConnect();
});

beforeEach(() => {
  snsMock.reset();
  nockCleanAll();
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const snsMock = mockClient(SNSClient);

const loadApp = async (): Promise<void> => {
  const app = await import("../src/app.js");
  await app.loadApp();
};

const buildAngryMetalGuyInterceptor = (): nock.Interceptor => {
  vi.setSystemTime(new Date("May 27, 2009"));

  return nock("https://angrymetalguy.com")
    .get("/wp-json/wp/v2/posts")
    .query({
      page: 1,
      per_page: 100,
      order: "desc",
      orderby: "date",
      after: new Date("April 26, 2009").toISOString(),
      tags: 8161,
      categories: 13,
    });
};

const buildConcertsMetalInterceptor = (): nock.Interceptor =>
  nock("https://es.concerts-metal.com").get("/rss/ES_Barcelona.xml");

describe("loadApp", () => {
  describe("when endpoints return a 200 status code", () => {
    it("should save the records returned by the endpoints and send them to Amazon SNS using the SNS_TOPIC_ARN env variable", async () => {
      const fakeAngryMetalGuy = new FakeWordPressPostsV2({
        source: "Angry Metal Guy",
        type: "review",
      });
      buildAngryMetalGuyInterceptor().reply(200, fakeAngryMetalGuy.toJson());

      const fakeConcertsMetal = new FakeConcertsMetalList();
      buildConcertsMetalInterceptor().reply(200, fakeConcertsMetal.toXml());

      const SNS_TOPIC_ARN = "topic-arn";
      vi.stubEnv("SNS_TOPIC_ARN", SNS_TOPIC_ARN);

      const allRecords = [
        ...fakeAngryMetalGuy.toRecords(),
        ...fakeConcertsMetal.toRecords(),
      ];

      await loadApp();

      const savedRecords = getRecordsByKeysDb(
        allRecords.map(({ id, source }) => [id, source]),
      );
      expect(
        savedRecords.sort(recordsSortedBy("publicationDate")),
      ).toStrictEqual(allRecords.sort(recordsSortedBy("publicationDate")));

      const callsToAwsSns = snsMock.commandCalls(PublishCommand, {
        TopicArn: SNS_TOPIC_ARN,
      });
      expect(callsToAwsSns).toHaveLength(allRecords.length);
    });
  });

  describe("when one endpoint fails", () => {
    it("should save the remaining records returned by the endpoints with a 200 status code and send them to Amazon SNS", async () => {
      buildAngryMetalGuyInterceptor().reply(500, { error: "msg" });

      const fakeOk = new FakeConcertsMetalList();
      buildConcertsMetalInterceptor().reply(200, fakeOk.toXml());

      await loadApp();

      const savedRecords = getRecordsByKeysDb(
        fakeOk.toRecords().map(({ id, source }) => [id, source]),
      );
      expect(savedRecords).toHaveLength(fakeOk.length);

      const callsToAwsSns = snsMock.commandCalls(PublishCommand);
      expect(callsToAwsSns).toHaveLength(fakeOk.length);
    });
  });

  describe("when one endpoint returns new records and previously added records", () => {
    it("should only send the new records to Amazon SNS", async () => {
      const fakePreviousAngryMetalGuy = new FakeWordPressPostsV2({
        source: "Angry Metal Guy",
        type: "review",
      });
      const fakeNewAngryMetalGuy = new FakeWordPressPostsV2({
        source: "Angry Metal Guy",
        type: "review",
      });
      buildAngryMetalGuyInterceptor().reply(200, [
        ...fakePreviousAngryMetalGuy.toJson(),
        ...fakeNewAngryMetalGuy.toJson(),
      ]);
      insertRecordsDb(fakePreviousAngryMetalGuy.toRecords());

      buildConcertsMetalInterceptor().reply(
        200,
        new FakeConcertsMetalList(0).toXml(),
      );

      await loadApp();

      const callsToAwsSns = snsMock.commandCalls(PublishCommand);
      expect(callsToAwsSns).toHaveLength(fakeNewAngryMetalGuy.length);
    });
  });

  describe("when requests take more than REQUEST_TIMEOUT_MS env variable", () => {
    it("should cancel the request and not save or send the records", async () => {
      const REQUEST_TIMEOUT_MS = 1000;

      const fakeAngryMetalGuy = new FakeWordPressPostsV2({
        source: "Angry Metal Guy",
        type: "review",
      });
      buildAngryMetalGuyInterceptor()
        .delay(REQUEST_TIMEOUT_MS + 1000)
        .reply(200, fakeAngryMetalGuy.toJson());

      const fakeConcertsMetal = new FakeConcertsMetalList();
      buildConcertsMetalInterceptor()
        .delay(REQUEST_TIMEOUT_MS + 1000)
        .reply(200, fakeConcertsMetal.toXml());

      vi.stubEnv("REQUEST_TIMEOUT_MS", `${REQUEST_TIMEOUT_MS}`);

      const allRecords = [
        ...fakeAngryMetalGuy.toRecords(),
        ...fakeConcertsMetal.toRecords(),
      ];

      await loadApp();

      const savedRecords = getRecordsByKeysDb(
        allRecords.map(({ id, source }) => [id, source]),
      );
      expect(savedRecords).toHaveLength(0);

      const callsToAwsSns = snsMock.commandCalls(PublishCommand);
      expect(callsToAwsSns).toHaveLength(0);
    });
  });

  describe("when the endpoint returns records but first record sent to Amazon AWS fails", () => {
    it("should successfully save all records except the failed one", async () => {
      const fakeAngryMetalGuy = new FakeWordPressPostsV2({
        source: "Angry Metal Guy",
        type: "review",
      });
      buildAngryMetalGuyInterceptor().reply(200, fakeAngryMetalGuy.toJson());

      buildConcertsMetalInterceptor().reply(
        200,
        new FakeConcertsMetalList(0).toXml(),
      );

      snsMock.rejectsOnce();

      await loadApp();

      const savedRecords = getRecordsByKeysDb(
        fakeAngryMetalGuy.toRecords().map(({ id, source }) => [id, source]),
      );
      expect(savedRecords).toHaveLength(fakeAngryMetalGuy.length - 1);
    });
  });
});
