import type { Integration, TRecord } from "./domain.js";
import { integrations } from "./integrations.js";
import { insertRecord, recordExistsById } from "./db.js";
import { sendEmail, type EmailProps } from "./emailClient.js";
import { logger } from "./utils.js";

const recordToEmail = (record: TRecord): EmailProps => {
  const subject = `Metal Tracker - New ${record.type}: ${record.title}`;
  const date = record.publicationDate.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const message = `A new ${record.type} has been published on ${record.sourceName}\n\nTitle: ${record.title}\nDate: ${date}\nDescription: ${record.description}\nLink: ${record.link}`;

  return {
    subject,
    message,
  };
};

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

      await sendEmail(recordToEmail(record));
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

export const loadApp = async (): Promise<void> => {
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
