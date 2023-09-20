import {
  SNSClient,
  ListTopicsCommand,
  ListSubscriptionsByTopicCommand,
  SubscribeCommand,
  CreateTopicCommand,
  PublishCommand,
} from "@aws-sdk/client-sns";
import { getEnv } from "./config";
import { Record } from "./entities";
import {
  getAsciiCharacters,
  removeControlCharacters,
  truncateString,
} from "./utils";

const snsSubjectMaxLong = 100;

const snsClient = new SNSClient({});

export const setupSns = async (): Promise<void> => {
  const topicName = getEnv().SNS_TOPIC_NAME;
  const emailAddress = getEnv().EMAIL_ADDRESS;

  const topicsList = await snsClient.send(new ListTopicsCommand({}));

  const foundTopic = topicsList.Topics?.find(
    (topic) => topic.TopicArn?.endsWith(topicName),
  );

  if (!foundTopic) {
    const createTopic = await snsClient.send(
      new CreateTopicCommand({ Name: topicName }),
    );

    const topicArn = createTopic.TopicArn;

    console.log(`SNS topic '${topicName}' created with ARN: ${topicArn}`);

    await snsClient.send(
      new SubscribeCommand({
        Protocol: "email",
        TopicArn: topicArn,
        Endpoint: emailAddress,
      }),
    );

    console.log(`Sent topic confirmation to '${emailAddress}' email`);
    return;
  }

  const topicArn = foundTopic.TopicArn;

  const subscriptionsList = await snsClient.send(
    new ListSubscriptionsByTopicCommand({ TopicArn: topicArn }),
  );

  const subscription = subscriptionsList.Subscriptions?.find(
    (subscription) => subscription.Endpoint === emailAddress,
  );

  if (subscription && subscription.SubscriptionArn !== "PendingConfirmation") {
    console.log("SNS is already set up correctly");
    return;
  }

  if (subscription) {
    console.log(
      "SNS subscription is awaiting confirmation. Resending confirmation email...",
    );
  }

  await snsClient.send(
    new SubscribeCommand({
      Protocol: "email",
      TopicArn: topicArn,
      Endpoint: emailAddress,
    }),
  );

  console.log(`Sent topic confirmation to '${emailAddress}' email`);
};

export const sendRecordsEmail = async (
  records: Record[],
  topicArn: string,
): Promise<void> => {
  const promises = records.map(async (record) => {
    let emailSubject = `Metal Tracker - New ${record.type}: ${record.title}`;
    emailSubject = removeControlCharacters(emailSubject);
    emailSubject = getAsciiCharacters(emailSubject);
    emailSubject = truncateString(emailSubject, snsSubjectMaxLong);

    const date = record.publicationDate.toString();
    const emailMessage = `A new ${record.type} has been published on ${record.sourceName}\n\nTitle: ${record.title}\nDate: ${date}\nDescription: ${record.description}\nLink: ${record.link}`;

    return snsClient.send(
      new PublishCommand({
        Subject: emailSubject,
        Message: emailMessage,
        TopicArn: topicArn,
      }),
    );
  });

  await Promise.allSettled(promises);
};
