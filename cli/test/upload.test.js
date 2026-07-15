"use strict";

const { describe, it, mock } = require("node:test");
const assert = require("node:assert/strict");
const { uploadPaste } = require("../bin.js");

describe("uploadPaste", () => {
  it("posts JSON and returns parsed body", async () => {
    /** @type {any} */
    let captured;
    const fetchImpl = mock.fn(async (url, init) => {
      captured = { url, init };
      return {
        ok: true,
        status: 201,
        text: async () =>
          JSON.stringify({
            id: "abc123xyz789",
            url: "http://localhost:3000/paste/abc123xyz789",
            expiresAt: null,
          }),
      };
    });

    const result = await uploadPaste({
      baseUrl: "http://localhost:3000",
      content: "hello\nworld",
      expire: "1h",
      password: "secret",
      fetchImpl,
    });

    assert.equal(result.id, "abc123xyz789");
    assert.equal(captured.url, "http://localhost:3000/api/pastes");
    assert.equal(captured.init.method, "POST");
    const body = JSON.parse(captured.init.body);
    assert.equal(body.content, "hello\nworld");
    assert.equal(body.expire, "1h");
    assert.equal(body.password, "secret");
  });

  it("throws with server error message", async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 413,
      statusText: "Payload Too Large",
      text: async () => JSON.stringify({ error: "too big" }),
    });

    await assert.rejects(
      () =>
        uploadPaste({
          baseUrl: "http://localhost:3000",
          content: "x",
          fetchImpl,
        }),
      /413.*too big/,
    );
  });

  it("throws when response is missing url/id", async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({}),
    });

    await assert.rejects(
      () =>
        uploadPaste({
          baseUrl: "http://localhost:3000",
          content: "x",
          fetchImpl,
        }),
      /missing url\/id/,
    );
  });
});
