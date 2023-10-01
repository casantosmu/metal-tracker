import { integrations } from "./integrations.js";
import { insertRecord, recordExistsById } from "./db.js";
import { sendRecordEmail } from "./emailClient.js";
import type { TRecord } from "./entities.js";
import { logger } from "./utils.js";

const saveAndSendNewRecord = async (
  record: TRecord,
  topicArn: string,
): Promise<void> => {
  const isRecordAdded = recordExistsById(record.id);

  if (isRecordAdded) {
    return;
  }

  await sendRecordEmail(record, topicArn);

  insertRecord(record);

  logger.info(record, "Successfully sent an email with new record");
};

export const runMetalTracker = async (topicArn: string): Promise<void> => {
  logger.info("Initiating metal tracking process...");

  const promises = Object.values(integrations).map(async (integration) => {
    let lastRecords: TRecord[];
    try {
      lastRecords = await integration.getLastRecords();
    } catch (error) {
      logger.error(error);
      return;
    }

    if (!lastRecords.length) {
      logger.info(
        `No new records were found from '${integration.sourceName}'.`,
      );
      return;
    }

    await Promise.all(
      lastRecords.map(async (record) => {
        try {
          await saveAndSendNewRecord(record, topicArn);
        } catch (error) {
          logger.error(error);
        }
      }),
    );
  });

  await Promise.all(promises);

  logger.info("Metal tracking process completed.");
};
