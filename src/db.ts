import path from "path";
import fs from "fs";
import BetterSqlite3 from "better-sqlite3";
import { z } from "zod";
import type { TRecord, RecordType, SourceName } from "./entities.js";
import { logger } from "./utils.js";

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
    const [id] = filename.split("-", 1);
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
  const migrationsDir = new URL("migrations", import.meta.url).pathname;
  logger.info(`Checking for new migrations in directory: ${migrationsDir}`);
  const migrations = parseMigrations(migrationsDir);

  db.exec(
    "CREATE TABLE IF NOT EXISTS migrations (id INTEGER NOT NULL PRIMARY KEY, source TEXT NOT NULL);",
  );

  const { count: firstMigrationToRun } = db
    .prepare("SELECT COUNT(*) AS count FROM migrations;")
    .get() as { count: number };

  const migrationsToRun = migrations.slice(firstMigrationToRun);

  if (!migrationsToRun.length) {
    logger.info("No new migrations to run.");
    return;
  }

  logger.info(`Found ${migrationsToRun.length} new migrations to run.`);

  const run = db.transaction(() => {
    const insert = db.prepare(
      "INSERT INTO migrations (id, source) VALUES (?, ?);",
    );

    migrationsToRun.forEach((migration) => {
      db.exec(migration.source);
      insert.run([migration.id, migration.source]);
      logger.info(`Executed migration ${migration.id}`);
    });
  });

  run();

  logger.info("All new migrations have been successfully executed.");
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

export const insertRecord = (record: TRecord): void => {
  const sql = `
    INSERT INTO records (type, source, record_id, title, link, publication_date, description)
    VALUES (@type, @source, @record_id, @title, @link, @publication_date, @description);
  `;

  db.prepare(sql).run({
    type: record.type,
    source: record.sourceName,
    record_id: record.id,
    title: record.title,
    link: record.link,
    publication_date: record.publicationDate.toISOString(),
    description: record.description,
  });
};

export const insertRecords = (records: TRecord[]): void => {
  const sql = `
    INSERT INTO records (type, source, record_id, title, link, publication_date, description)
    VALUES (@type, @source, @record_id, @title, @link, @publication_date, @description);
  `;

  const insert = db.prepare(sql);

  const insertMany = db.transaction(() => {
    records.forEach((record) => {
      insert.run({
        type: record.type,
        source: record.sourceName,
        record_id: record.id,
        title: record.title,
        link: record.link,
        publication_date: record.publicationDate.toISOString(),
        description: record.description,
      });
    });
  });

  insertMany();
};

export const recordExistsById = (id: string): boolean => {
  const sql = "SELECT EXISTS(SELECT 1 FROM records WHERE record_id = ?);";
  return !!db.prepare(sql).pluck().get(id);
};

export const getRecordsByIds = (ids: string[]): TRecord[] => {
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
