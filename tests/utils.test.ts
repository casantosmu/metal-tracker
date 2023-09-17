import { buildUrl } from "../src/utils";

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
