import { insertRecords } from "./db";
import { fetchLastRecords } from "./httpClients";

export const runMetalTracker = async (): Promise<void> => {
  const lastRecords = await fetchLastRecords();

  const newRecords = insertRecords(lastRecords, {
    ignoreOnConflict: true,
    returning: true,
  });

  console.log(newRecords);
};
