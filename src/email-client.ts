import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
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

export interface EmailProps {
  subject: string;
  message: string;
}

export const sendEmail = async ({
  subject,
  message,
}: EmailProps): Promise<void> => {
  let cleanSubject = "";
  for (const character of subject) {
    if (isAsciiCharacter(character) && !isControlCharacter(character)) {
      cleanSubject += character;
    }
  }
  const finalSubject = truncateString(cleanSubject, SNS_SUBJECT_MAX_LENGTH);

  await snsClient.send(
    new PublishCommand({
      Subject: finalSubject,
      Message: message,
      TopicArn: SNS_TOPIC_ARN,
    }),
  );
};
