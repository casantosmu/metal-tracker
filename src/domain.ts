export const recordTypes = {
  review: "review",
  concert: "concert",
} as const;

export const recordSources = {
  angryMetalGuy: "Angry Metal Guy",
  concertsMetal: "Concerts-Metal.com",
} as const;

export interface TRecord {
  id: string;
  type: string;
  source: string;
  title: string;
  link: string;
  publicationDate: Date;
  description: string;
}

export interface Integration {
  getLastRecords: () => Promise<TRecord[]>;
}
