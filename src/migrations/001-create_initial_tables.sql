CREATE TABLE record_types (type TEXT NOT NULL PRIMARY KEY);

CREATE TABLE sources (source TEXT NOT NULL PRIMARY KEY);

CREATE TABLE records (
    record_id TEXT NOT NULL,
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    title TEXT NOT NULL,
    link TEXT NOT NULL,
    publication_date TEXT NOT NULL,
    description TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(record_id, source),
    FOREIGN KEY (type) REFERENCES record_types (type)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (source) REFERENCES sources (source)
        ON DELETE CASCADE ON UPDATE CASCADE
);
