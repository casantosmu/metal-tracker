import type { ObjectValues } from "./types.js";

export const recordTypes = {
  review: "review",
  concert: "concert",
} as const;

export type RecordType = ObjectValues<typeof recordTypes>;

export const sources = {
  angryMetalGuy: "Angry Metal Guy",
  concertsMetal: "Concerts-Metal.com",
} as const;

export type SourceName = ObjectValues<typeof sources>;

export interface TRecord {
  id: string;
  type: RecordType;
  sourceName: SourceName;
  title: string;
  link: string;
  publicationDate: Date;
  description: string;
}

export interface Integration {
  sourceName: SourceName;
  getLastRecords: () => Promise<TRecord[]>;
}
