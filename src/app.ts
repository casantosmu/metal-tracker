import type { Integration, TRecord } from "./domain.js";
import { integrations } from "./integrations.js";
import {
  transaction,
  insertRecord,
  insertRecordSourceIfNotExists,
  insertRecordTypeIfNotExists,
  recordExistsByKey,
} from "./db.js";
import { sendEmail, type EmailProps } from "./emailClient.js";
import { logger } from "./utils.js";

const recordToEmailProps = (record: TRecord): EmailProps => {
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

const sendAndSaveNewRecordsFromIntegration = async (
  integration: Integration,
): Promise<void> => {
  const lastRecords = await integration.getLastRecords();

  if (!lastRecords.length) {
    logger.info(`No records were found from '${integration.sourceName}'.`);
    return;
  }

  const results = await Promise.allSettled(
    lastRecords.map(async (record) => {
      const isRecordSaved = recordExistsByKey(record.id, record.sourceName);
      if (isRecordSaved) {
        return;
      }

      // sendEmail is located outside the transaction block because SQLite3
      // serializes all transactions. It doesn't support async functions.
      await sendEmail(recordToEmailProps(record));

      transaction(() => {
        insertRecordTypeIfNotExists(record.type);
        insertRecordSourceIfNotExists(record.sourceName);
        insertRecord(record);
      });

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
    Object.values(integrations).map(sendAndSaveNewRecordsFromIntegration),
  );

  results.forEach((result) => {
    if (result.status === "rejected") {
      logger.error(result.reason);
    }
  });

  logger.info("Metal tracking process completed.");
};
