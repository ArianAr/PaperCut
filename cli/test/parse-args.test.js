"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { parseArgs, DEFAULT_URL } = require("../bin.js");

describe("parseArgs", () => {
  it("applies defaults", () => {
    const opts = parseArgs([]);
    assert.equal(opts.private, false);
    assert.equal(opts.help, false);
    assert.equal(opts.expire, undefined);
    assert.equal(opts.errors.length, 0);
    assert.ok(typeof opts.url === "string");
    assert.ok(opts.url.length > 0);
  });

  it("parses private, expire, and url flags", () => {
    const opts = parseArgs([
      "-p",
      "--expire",
      "1d",
      "--url",
      "https://example.com/",
    ]);
    assert.equal(opts.private, true);
    assert.equal(opts.expire, "1d");
    assert.equal(opts.url, "https://example.com");
  });

  it("parses --expire= and --url= forms", () => {
    const opts = parseArgs(["--expire=30m", "--url=http://localhost:4000"]);
    assert.equal(opts.expire, "30m");
    assert.equal(opts.url, "http://localhost:4000");
  });

  it("sets help", () => {
    assert.equal(parseArgs(["--help"]).help, true);
    assert.equal(parseArgs(["-h"]).help, true);
  });

  it("records unknown args and missing values", () => {
    const unknown = parseArgs(["--nope"]);
    assert.ok(unknown.errors.some((e) => /Unknown/.test(e)));

    const missingExpire = parseArgs(["--expire"]);
    assert.ok(missingExpire.errors.some((e) => /expire requires/.test(e)));

    const missingUrl = parseArgs(["--url"]);
    assert.ok(missingUrl.errors.some((e) => /url requires/.test(e)));
  });

  it("exports a sensible default URL constant", () => {
    assert.equal(DEFAULT_URL, "http://localhost:3000");
  });
});
