import { integrations } from "./integrations.js";
import { insertRecord, recordExistsById } from "./db.js";
import { sendRecordEmail } from "./emailClient.js";
import { logger } from "./utils.js";
import type { Integration } from "./domain.js";

const sendAndSaveLastRecordsFromIntegration = async (
  integration: Integration,
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

      await sendRecordEmail(record);
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

export const app = async (): Promise<void> => {
  logger.info("Initiating metal tracking process...");

  const results = await Promise.allSettled(
    Object.values(integrations).map(sendAndSaveLastRecordsFromIntegration),
  );

  results.forEach((result) => {
    if (result.status === "rejected") {
      logger.error(result.reason);
    }
  });

  logger.info("Metal tracking process completed.");
};
