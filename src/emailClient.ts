import {
  SNSClient,
  ListTopicsCommand,
  ListSubscriptionsByTopicCommand,
  SubscribeCommand,
  CreateTopicCommand,
} from "@aws-sdk/client-sns";
import { getEnv } from "./config";

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
