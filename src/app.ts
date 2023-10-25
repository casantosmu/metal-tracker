import {
  type Integration,
  type TRecord,
  recordTypes,
  sources,
} from "./domain.js";
import { integrations } from "./integrations.js";
import {
  getAllRecordTypesDb,
  getAllSourcesDb,
  insertRecordDb,
  recordExistsByKeyDb,
} from "./db.js";
import { sendEmail, type EmailProps } from "./emailClient.js";
import { logger } from "./utils.js";

const buildAppAndDbInfo = (appValues: string[], dbValues: string[]): string => {
  return `Application values:\n ${appValues.join("\n ")}\nTotal: ${
    appValues.length
  }\n------------\nDatabase values:\n ${dbValues.join("\n ")}\nTotal: ${
    dbValues.length
  }`;
};

/**
 * Ensures values in the application and the database remain synchronized.
 * Any addition, deletion, or update should be mirrored in both places.
 */
const checkAppIntegrity = (): void => {
  const typesInApp = Object.values(recordTypes);
  const typesInDb = getAllRecordTypesDb();

  if (typesInApp.length !== typesInDb.length) {
    throw new Error(
      `Record types count in app and database does not match\n${buildAppAndDbInfo(
        typesInApp,
        typesInDb,
      )}`,
    );
  }

  for (const typeInApp of typesInApp) {
    if (!typesInDb.includes(typeInApp)) {
      throw new Error(
        `Record type ${typeInApp} is missing\n${buildAppAndDbInfo(
          typesInApp,
          typesInDb,
        )}`,
      );
    }
  }

  const sourcesInApp = Object.values(sources);
  const sourcesInDb = getAllSourcesDb();

  if (sourcesInApp.length !== sourcesInDb.length) {
    throw new Error(
      `Sources count in app and database does not match\n${buildAppAndDbInfo(
        sourcesInApp,
        sourcesInDb,
      )}`,
    );
  }

  for (const sourceInApp of sourcesInApp) {
    if (!sourcesInDb.includes(sourceInApp)) {
      throw new Error(
        `Source ${sourceInApp} is missing\n${buildAppAndDbInfo(
          sourcesInApp,
          sourcesInDb,
        )}`,
      );
    }
  }
};

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
  checkAppIntegrity();

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
