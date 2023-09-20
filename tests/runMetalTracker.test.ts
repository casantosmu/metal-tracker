import "aws-sdk-client-mock-jest";
import nock from "nock";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { mockClient } from "aws-sdk-client-mock";
import { jsonToXml } from "../src/utils";
import { getRecordsByIds, insertRecords } from "../src/db";
import { runMetalTracker } from "../src/main";
import {
  closeDb,
  createFakeConcertsMetalResponse,
  createFakeWordPressJsonV2Posts,
  fakeConcertsMetalResponseToRecords,
  fakeWordPressJsonV2PostsToRecords,
  setupDb,
} from "./utils";

beforeAll(() => {
  setupDb();
});

afterAll(() => {
  closeDb();
});

describe("runMetalTracker", () => {
  it("should save the records returned by the endpoints", async () => {
    const snsMock = mockClient(SNSClient).resolves({});

    // Verify for conflicts with records previously added to the database
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
    expect(snsMock).toHaveReceivedCommandTimes(
      PublishCommand,
      expectedSaved.length,
    );
  });
});
