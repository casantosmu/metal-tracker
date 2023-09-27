import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import type { TRecord } from "./entities.js";
import {
  isAsciiCharacter,
  isControlCharacter,
  truncateString,
} from "./utils.js";

const snsSubjectMaxLong = 100;

const snsClient = new SNSClient({});

const createSubjectFromRecord = (record: TRecord): string => {
  const initialSubject = `Metal Tracker - New ${record.type}: ${record.title}`;
  const cleanSubject = initialSubject.split("").reduce((result, character) => {
    if (isAsciiCharacter(character) && !isControlCharacter(character)) {
      return result + character;
    }
    return result;
  });
  return truncateString(cleanSubject, snsSubjectMaxLong);
};

export const sendRecordsEmail = async (
  records: TRecord[],
  topicArn: string,
): Promise<void> => {
  const promises = records.map(async (record) => {
    const subject = createSubjectFromRecord(record);
    const date = record.publicationDate.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const message = `A new ${record.type} has been published on ${record.sourceName}\n\nTitle: ${record.title}\nDate: ${date}\nDescription: ${record.description}\nLink: ${record.link}`;

    return snsClient.send(
      new PublishCommand({
        Subject: subject,
        Message: message,
        TopicArn: topicArn,
      }),
    );
  });

  await Promise.all(promises);
};
