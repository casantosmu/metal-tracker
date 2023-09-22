import type { ObjectValues } from "./types.js";

export const recordTypes = {
  review: "review",
  concert: "concert",
} as const;

export type RecordType = ObjectValues<typeof recordTypes>;

export const sources = {
  angryMetalGuy: "angryMetalGuy",
  concertsMetal: "concertsMetal",
} as const;

export type SourceName = ObjectValues<typeof sources>;

export interface TRecord {
  type: RecordType;
  sourceName: SourceName;
  id: string;
  title: string;
  link: string;
  publicationDate: Date;
  description: string;
}
