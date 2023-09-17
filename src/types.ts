export type ObjectValues<T extends { [key in string]: unknown }> = T[keyof T];
