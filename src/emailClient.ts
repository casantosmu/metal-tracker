import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import type { TRecord } from "./domain.js";
import {
  isAsciiCharacter,
  isControlCharacter,
  truncateString,
} from "./utils.js";

const SNS_SUBJECT_MAX_LENGTH = 100;
const SNS_TOPIC_ARN = process.env["SNS_TOPIC_ARN"];

if (!SNS_TOPIC_ARN) {
  throw new Error("You must specify SNS_TOPIC_ARN environment variable");
}

const snsClient = new SNSClient();

const createSubjectFromRecord = (record: TRecord): string => {
  const initialSubject = `Metal Tracker - New ${record.type}: ${record.title}`;
  const cleanSubject = initialSubject.split("").reduce((result, character) => {
    if (isAsciiCharacter(character) && !isControlCharacter(character)) {
      return result + character;
    }
    return result;
  });
  return truncateString(cleanSubject, SNS_SUBJECT_MAX_LENGTH);
};

export const sendRecordEmail = async (record: TRecord): Promise<void> => {
  const subject = createSubjectFromRecord(record);
  const date = record.publicationDate.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const message = `A new ${record.type} has been published on ${record.sourceName}\n\nTitle: ${record.title}\nDate: ${date}\nDescription: ${record.description}\nLink: ${record.link}`;

  await snsClient.send(
    new PublishCommand({
      Subject: subject,
      Message: message,
      TopicArn: SNS_TOPIC_ARN,
    }),
  );
};
