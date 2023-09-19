import path from "path";
import fs from "fs";
import BetterSqlite3 from "better-sqlite3";
import { z } from "zod";

const filename = path.join(process.cwd(), "sqlite", "data.db");
const db = new BetterSqlite3(filename);

// It's recommended to turn on WAL mode to greatly increase overall performance.
// https://github.com/WiseLibs/better-sqlite3/blob/master/docs/performance.md
db.pragma("journal_mode = WAL");

interface Migration {
  id: number;
  source: string;
}

const parseMigrations = (migrationsDir: string): Migration[] => {
  const filenames = fs.readdirSync(migrationsDir);

  return filenames.map((filename) => {
    const [id] = filename.split("-");
    const idToNumber = z.coerce.number().int().positive().safeParse(id);
    const isValidFormat = filename.endsWith(".sql");

    if (!idToNumber.success || !isValidFormat) {
      throw new Error(
        `Migration filename '${filename}' must follow schema of xxx-yyyyy.sql, where 'x' is a positive integer, and 'y' anything`,
      );
    }

    const filePath = path.join(migrationsDir, filename);
    const source = fs.readFileSync(filePath, "utf8");

    return { id: idToNumber.data, source };
  });
};

export const runMigrations = (): void => {
  const migrationsDir = path.join(__dirname, "migrations");
  const migrations = parseMigrations(migrationsDir);

  db.exec(
    "CREATE TABLE IF NOT EXISTS migrations (id INTEGER NOT NULL PRIMARY KEY, source TEXT NOT NULL)",
  );

  const { count: firstMigrationToRun } = db
    .prepare("SELECT COUNT(*) AS count FROM migrations")
    .get() as { count: number };

  const migrationsToRun = migrations.slice(firstMigrationToRun);

  if (!migrationsToRun.length) {
    return;
  }

  db.transaction(() => {
    migrationsToRun.forEach((migration) => {
      db.exec(migration.source);
      db.prepare(`INSERT INTO migrations (id, source) VALUES (?, ?)`).run([
        migration.id,
        migration.source,
      ]);
    });
  })();
};
