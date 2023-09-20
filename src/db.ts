import path from "path";
import fs from "fs";
import BetterSqlite3 from "better-sqlite3";
import { z } from "zod";
import { Record, RecordType, SourceName } from "./entities";

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
        `Invalid migration filename '${filename}'. It must follow the schema of 'xxx-yyyyy.sql', where 'x' is a positive integer, and 'y' can be anything.`,
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

  console.log(`Checking for new migrations in directory: ${migrationsDir}`);

  db.exec(
    "CREATE TABLE IF NOT EXISTS migrations (id INTEGER NOT NULL PRIMARY KEY, source TEXT NOT NULL);",
  );

  const { count: firstMigrationToRun } = db
    .prepare("SELECT COUNT(*) AS count FROM migrations;")
    .get() as { count: number };

  const migrationsToRun = migrations.slice(firstMigrationToRun);

  if (!migrationsToRun.length) {
    console.log("No new migrations to run.");
    return;
  }

  console.log(`Found ${migrationsToRun.length} new migrations to run.`);

  const run = db.transaction(() => {
    migrationsToRun.forEach((migration) => {
      db.exec(migration.source);
      db.prepare("INSERT INTO migrations (id, source) VALUES (?, ?);").run([
        migration.id,
        migration.source,
      ]);

      console.log(`Executed migration ${migration.id}`);
    });
  });

  run();

  console.log("All new migrations have been successfully executed.");
};

export const dropTables = (): void => {
  db.exec("DROP TABLE IF EXISTS 'migrations';");
  db.exec("DROP TABLE IF EXISTS 'records';");
  db.exec("DROP TABLE IF EXISTS 'record_types';");
  db.exec("DROP TABLE IF EXISTS 'sources';");
};

interface RecordTable {
  type: RecordType;
  source: SourceName;
  record_id: string;
  title: string;
  link: string;
  publication_date: string;
  description: string;
}

export function insertRecords(
  records: Record[],
  options: { returning: true; ignoreOnConflict?: boolean },
): Record[];
export function insertRecords(
  records: Record[],
  options?: { returning?: false; ignoreOnConflict?: boolean },
): undefined;
export function insertRecords(
  records: Record[],
  options?: { returning?: boolean; ignoreOnConflict?: boolean },
): Record[] | undefined {
  const { ignoreOnConflict = false, returning = false } = options ?? {};

  const insertMany = db.transaction(() => {
    const results: Record[] = [];

    const sql = `
      INSERT INTO records (type, source, record_id, title, link, publication_date, description)
      VALUES (@type, @source, @record_id, @title, @link, @publication_date, @description)
      ${ignoreOnConflict ? "ON CONFLICT DO NOTHING" : ""}
      ${returning ? "RETURNING *" : ""};
    `;

    const insert = db.prepare(sql);

    records.forEach((record) => {
      const params = {
        type: record.type,
        source: record.sourceName,
        record_id: record.id,
        title: record.title,
        link: record.link,
        publication_date: record.publicationDate.toISOString(),
        description: record.description,
      };

      if (!returning) {
        insert.run(params);
        return;
      }

      const result = insert.get(params) as RecordTable | undefined;

      if (!result) {
        return;
      }

      results.push({
        type: result.type,
        sourceName: result.source,
        id: result.record_id,
        title: result.title,
        publicationDate: new Date(result.publication_date),
        link: result.link,
        description: result.description,
      });
    });

    return returning ? results : undefined;
  });

  return insertMany();
}

export const getRecordsByIds = (ids: string[]): Record[] => {
  const sql = `
    SELECT
      type,
      source,
      record_id,
      title,
      link,
      publication_date,
      description
    FROM records 
    WHERE record_id IN (${ids.map(() => "?").join(",")});
  `;

  const result = db.prepare(sql).all(ids) as RecordTable[];
  return result.map((result) => ({
    type: result.type,
    sourceName: result.source,
    id: result.record_id,
    title: result.title,
    publicationDate: new Date(result.publication_date),
    link: result.link,
    description: result.description,
  }));
};
