import { describe, it, expect } from "vitest";
import { subtractDays } from "../src/utils.js";

describe("subtractDays", () => {
  describe("when subtracting 7 days from 'May 27, 2009'", () => {
    it("should return the date 'May 20, 2009'", () => {
      const expectedResult = new Date("May 20, 2009");

      const result = subtractDays(new Date("May 27, 2009"), 7);

      expect(result).toStrictEqual(expectedResult);
    });
  });
});
