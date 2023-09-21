import { dropTables, runMigrations } from "../../src/db";

export const setup = (): void => {
  runMigrations();
};

export const teardown = (): void => {
  dropTables();
};
