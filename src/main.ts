import { inspect } from "util";
import { getLastRecords } from "./integrations";
import { insertRecords } from "./db";
import { sendRecordsEmail } from "./emailClient";
import { getEnv } from "./config";

export const runMetalTracker = async (): Promise<void> => {
  console.log("Initiating metal tracking process...");

  const lastRecords = await getLastRecords();

  if (!lastRecords.length) {
    console.log("No new records were found.");
    return;
  }

  const newRecords = insertRecords(lastRecords, {
    ignoreOnConflict: true,
    returning: true,
  });

  if (!newRecords.length) {
    console.log("No new records were found after insertion.");
    return;
  }

  await sendRecordsEmail(newRecords, getEnv().AWS_SNS_TOPIC_ARN);

  console.log(
    `New records registered successfully:\n${inspect(newRecords, {
      depth: null,
    })}`,
  );

  console.log("Metal tracking process completed.");
};
