import { runMigrations } from "./db";
import { fetchRecords } from "./httpClients";

runMigrations();

fetchRecords().then(console.log).catch(console.error);
