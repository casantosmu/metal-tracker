import path from "path";
import BetterSqlite3 from "better-sqlite3";

const filename = path.join(process.cwd(), "sqlite", "data.db");
const db = new BetterSqlite3(filename);
db.pragma("journal_mode = WAL");

interface MigrationActions {
  up: (db: BetterSqlite3.Database) => void;
  down: (db: BetterSqlite3.Database) => void;
}

export const executeMigration = ({ up, down }: MigrationActions): void => {
  try {
    console.log("Starting migration...");
    up(db);
    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Error during migration:", error);
    console.log("Rolling back migration...");
    try {
      down(db);
      console.log("Rollback of migration completed.");
    } catch (rollbackError) {
      console.error("Error while rolling back migration:", rollbackError);
    }
    process.exitCode = 1;
  }
};
