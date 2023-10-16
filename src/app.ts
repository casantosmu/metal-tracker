import { integrations } from "./integrations.js";
import { insertRecord, recordExistsById } from "./db.js";
import { sendRecordEmail } from "./emailClient.js";
import { logger } from "./utils.js";
import type { Integration } from "./domain.js";

const sendAndSaveLastRecordsFromIntegration = async (
  integration: Integration,
  topicArn: string,
): Promise<void> => {
  const lastRecords = await integration.getLastRecords();

  if (!lastRecords.length) {
    logger.info(`No new records were found from '${integration.sourceName}'.`);
    return;
  }

  const results = await Promise.allSettled(
    lastRecords.map(async (record) => {
      const isRecordAdded = recordExistsById(record.id);
      if (isRecordAdded) {
        return;
      }

      await sendRecordEmail(record, topicArn);
      insertRecord(record);

      logger.info(record, "Successfully sent an email with new record");
    }),
  );

  results.forEach((result) => {
    if (result.status === "rejected") {
      logger.error(result.reason);
    }
  });
};

export const app = async (topicArn: string): Promise<void> => {
  logger.info("Initiating metal tracking process...");

  const results = await Promise.allSettled(
    Object.values(integrations).map((integration) =>
      sendAndSaveLastRecordsFromIntegration(integration, topicArn),
    ),
  );

  results.forEach((result) => {
    if (result.status === "rejected") {
      logger.error(result.reason);
    }
  });

  logger.info("Metal tracking process completed.");
};