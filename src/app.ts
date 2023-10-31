import type { Integration, TRecord } from "./domain.js";
import { integrations } from "./integrations.js";
import { insertRecordDb, recordExistsByKeyDb } from "./db.js";
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
  const message = `A new ${record.type} has been published on ${record.sourceName}\n\nTitle: ${record.title}\nPublish date: ${date}\nDescription: ${record.description}\nLink: ${record.link}`;

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
      // Check for the existence of the record in the database
      // since lastRecords contains pre-fetched data.
      const isRecordSaved = recordExistsByKeyDb(record.id, record.sourceName);
      if (isRecordSaved) {
        return;
      }

      // sendEmail function is placed outside a transaction block because SQLite3
      // serializes all transactions and does not support asynchronous functions.
      await sendEmail(recordToEmailProps(record));
      insertRecordDb(record);

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
