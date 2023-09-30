import { inspect } from "util";
import { integrations } from "./integrations.js";
import { insertRecord, recordExistsById } from "./db.js";
import { sendRecordEmail } from "./emailClient.js";
import type { TRecord } from "./entities.js";

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

  console.log(
    `Successfully sent an email with new record:\n${inspect(record, {
      depth: null,
    })}`,
  );
};

export const runMetalTracker = async (topicArn: string): Promise<void> => {
  console.log("Initiating metal tracking process...");

  const promises = Object.values(integrations).map(async (integration) => {
    let lastRecords: TRecord[];
    try {
      lastRecords = await integration.getLastRecords();
    } catch (error) {
      console.error(error);
      return;
    }

    if (!lastRecords.length) {
      console.log(
        `No new records were found from '${integration.sourceName}'.`,
      );
      return;
    }

    await Promise.all(
      lastRecords.map(async (record) => {
        try {
          await saveAndSendNewRecord(record, topicArn);
        } catch (error) {
          console.error(error);
        }
      }),
    );
  });

  await Promise.all(promises);

  console.log("Metal tracking process completed.");
};
