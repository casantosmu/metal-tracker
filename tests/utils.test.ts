import { describe, it, expect } from "vitest";
import { buildUrl, parseArguments, subtractDays } from "../src/utils.js";

describe("buildUrl", () => {
  describe("when receives url: 'http://url.com/', path: '/some/path/' and params: '{ foo: 'bar', num: 2 }'", () => {
    it("should return 'http://url.com/some/path?foo=bar&num=2'", () => {
      const url = "http://url.com/";
      const options = {
        path: "/some/path",
        params: {
          foo: "bar",
          num: 2,
        },
      };
      const expected = "http://url.com/some/path?foo=bar&num=2";

      const result = buildUrl(url, options);

      expect(result).toBe(expected);
    });
  });
});

describe("subtractDays", () => {
  describe("when receives 'May 27, 2009' date and 7 days", () => {
    it("should return a date 'May 20, 2009'", () => {
      const expectedResult = new Date("May 20, 2009");

      const result = subtractDays(new Date("May 27, 2009"), 7);

      expect(result.toISOString()).toStrictEqual(expectedResult.toISOString());
    });
  });
});

describe("parseArguments", () => {
  describe("when receives a list with --name=carlos and --email=example@domain.com", () => {
    it("should return an object with name: carlos and email: example@domain.com", () => {
      const expectedResult = {
        name: "carlos",
        email: "example@domain.com",
      };

      const result = parseArguments([
        "--name=carlos",
        "--email=example@domain.com",
      ]);

      expect(result).toStrictEqual(expectedResult);
    });
  });
});
