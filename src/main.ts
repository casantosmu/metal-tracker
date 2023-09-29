import { inspect } from "util";
import { integrations } from "./integrations.js";
import { insertRecords } from "./db.js";
import { sendRecordsEmail } from "./emailClient.js";

export const runMetalTracker = async (topicArn: string): Promise<void> => {
  console.log("Initiating metal tracking process...");

  const promises = Object.values(integrations).map(async (integration) => {
    try {
      const lastRecords = await integration.getLastRecords();

      if (!lastRecords.length) {
        console.log(
          `No new records were found from '${integration.sourceName}'.`,
        );
        return;
      }

      const newRecords = insertRecords(lastRecords, {
        ignoreOnConflict: true,
        returning: true,
      });

      if (!newRecords.length) {
        console.log(
          `No new records from '${integration.sourceName}' were added to the database.`,
        );
        return;
      }

      await sendRecordsEmail(newRecords, topicArn);

      console.log(
        `Successfully sent an email with new records from ${
          integration.sourceName
        }:\n${inspect(newRecords, { depth: null })}`,
      );
    } catch (error) {
      console.error(
        `Error from '${integration.sourceName}':\n${inspect(error, {
          depth: null,
        })}`,
      );
    }
  });

  await Promise.all(promises);

  console.log("Metal tracking process completed.");
};
