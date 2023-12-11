import type { Integration, TRecord } from "./domain.js";
import { integrations } from "./integrations.js";
import { insertRecordDb, recordExistsByKeyDb } from "./db.js";
import { sendEmail, type EmailProps } from "./email-client.js";
import { logger } from "./utils.js";

const handleError = (error: unknown): void => {
  logger.error(error);
  process.exitCode = 1;
};

const recordToEmailProps = (record: TRecord): EmailProps => {
  const subject = `Metal Tracker - New ${record.type}: ${record.title}`;
  const date = record.publicationDate.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const message = `A new ${record.type} has been published on ${record.source}\n\nTitle: ${record.title}\nPublish date: ${date}\nDescription: ${record.description}\nLink: ${record.link}`;
  return { subject, message };
};

const sendAndSaveNewRecordsFromIntegration = async (
  integration: Integration,
): Promise<void> => {
  const lastRecords = await integration.getLastRecords();

  const results = await Promise.allSettled(
    lastRecords.map(async (record) => {
      // Check for the existence of the record in the database
      // since lastRecords contains pre-fetched data.
      const isRecordSaved = recordExistsByKeyDb(record.id, record.source);
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

  for (const result of results) {
    if (result.status === "rejected") {
      handleError(result.reason);
    }
  }
};

export const loadApp = async (): Promise<void> => {
  logger.info("Initiating metal tracking process...");

  const results = await Promise.allSettled(
    Object.values(integrations).map((integration) =>
      sendAndSaveNewRecordsFromIntegration(integration),
    ),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      handleError(result.reason);
    }
  }

  logger.info("Metal tracking process completed.");
};
