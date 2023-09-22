import { runMigrations } from "../../src/db.js";

export const setup = (): void => {
  runMigrations();
};
