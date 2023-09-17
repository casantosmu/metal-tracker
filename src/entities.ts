import { ObjectValues } from "./types";

const recordTypes = {
  review: "review",
} as const;
type RecordType = ObjectValues<typeof recordTypes>;

const sources = {
  angryMetalGuy: "angryMetalGuy",
} as const;
export type SourceName = ObjectValues<typeof sources>;

export interface Record {
  type: RecordType;
  sourceName: SourceName;
  id: string;
  title: string;
  link: string;
  publicationDate: Date;
  description: string;
}
