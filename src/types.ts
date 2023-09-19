export type ObjectValues<T extends Record<string, unknown>> = T[keyof T];
