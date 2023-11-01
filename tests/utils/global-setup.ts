import { loadMigrations } from "../../src/db.js";

export const setup = (): void => {
  loadMigrations();
};
