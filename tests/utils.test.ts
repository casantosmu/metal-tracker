import { describe, it, expect } from "vitest";
import { buildUrl, argvParser, subtractDays } from "../src/utils.js";

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
      const expectedResult = "http://url.com/some/path?foo=bar&num=2";

      const result = buildUrl(url, options);

      expect(result).toBe(expectedResult);
    });
  });
});

describe("subtractDays", () => {
  describe("when subtracting 7 days from 'May 27, 2009'", () => {
    it("should return the date 'May 20, 2009'", () => {
      const expectedResult = new Date("May 20, 2009");

      const result = subtractDays(new Date("May 27, 2009"), 7);

      expect(result).toStrictEqual(expectedResult);
    });
  });
});
describe("argvParser", () => {
  describe("when receives a list with --name=carlos and --secret=WfUYD$i9(=", () => {
    it("should return an object with name: carlos and secret: WfUYD$i9(=", () => {
      const expectedResult = {
        name: "carlos",
        secret: "WfUYD$i9(=",
      };

      const result = argvParser(["--name=carlos", "--secret=WfUYD$i9(="]);

      expect(result).toStrictEqual(expectedResult);
    });
  });
});
