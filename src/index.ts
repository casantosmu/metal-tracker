import { runMigrations } from "./db";
import { runMetalTracker } from "./main";

runMigrations();
void runMetalTracker();
