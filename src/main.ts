import { inspect } from "util";
import { getLastRecords } from "./integrations.js";
import { insertRecords } from "./db.js";
import { sendRecordsEmail } from "./emailClient.js";
import { logger } from "./utils.js";

export const runMetalTracker = async (topicArn: string): Promise<void> => {
  logger.info("Initiating metal tracking process...");

  const lastRecords = await getLastRecords();

  if (!lastRecords.length) {
    logger.info("No new records were found.");
    return;
  }

  const newRecords = insertRecords(lastRecords, {
    ignoreOnConflict: true,
    returning: true,
  });

  if (!newRecords.length) {
    logger.info("No new records were added to the database.");
    return;
  }

  await sendRecordsEmail(newRecords, topicArn);

  logger.info(
    `Successfully sent an email with new records:\n${inspect(newRecords, {
      depth: null,
    })}`,
  );

  logger.info("Metal tracking process completed.");
};
