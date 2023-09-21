import { loadEnv } from "../config";
import { runMigrations } from "../db";
import { setupSns } from "../emailClient";

loadEnv();
runMigrations();
void setupSns();
