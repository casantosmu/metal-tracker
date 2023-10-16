import { runMigrations } from "./db.js";
import { app } from "./app.js";

runMigrations();
await app();
