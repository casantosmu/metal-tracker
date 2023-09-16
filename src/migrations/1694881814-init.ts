import { executeMigration } from "../db";

executeMigration({
  up(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS record_types (
            type TEXT PRIMARY KEY NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sources (
            source TEXT PRIMARY KEY NOT NULL
        );

        CREATE TABLE IF NOT EXISTS records (
            type TEXT NOT NULL,
            source TEXT NOT NULL,
            record_id TEXT NOT NULL,
            title TEXT NOT NULL,
            link TEXT NOT NULL,
            publication_date TEXT NOT NULL,
            description TEXT NOT NULL,
            PRIMARY KEY(source, record_id),
            FOREIGN KEY (type) REFERENCES record_types (type)
                ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (source) REFERENCES sources (source)
                ON DELETE CASCADE ON UPDATE CASCADE
        );
    `);
  },
  down(db) {
    db.exec(`
        DROP TABLE IF EXISTS record_type;

        DROP TABLE IF EXISTS sites;

        DROP TABLE IF EXISTS records;
    `);
  },
});
