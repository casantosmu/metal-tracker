import { loadMigrations } from "./db.js";
import { loadApp } from "./app.js";

loadMigrations();
await loadApp();
