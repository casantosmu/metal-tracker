import { integrations } from "./integrations.js";
import { insertRecord, recordExistsById } from "./db.js";
import { sendRecordEmail } from "./emailClient.js";
import { logger } from "./utils.js";

export const runMetalTracker = async (topicArn: string): Promise<void> => {
  logger.info("Initiating metal tracking process...");

  const results = await Promise.allSettled(
    Object.values(integrations).map(async (integration) => {
      const lastRecords = await integration.getLastRecords();

      if (!lastRecords.length) {
        logger.info(
          `No new records were found from '${integration.sourceName}'.`,
        );
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
    }),
  );

  results.forEach((result) => {
    if (result.status === "rejected") {
      logger.error(result.reason);
    }
  });

  logger.info("Metal tracking process completed.");
};
