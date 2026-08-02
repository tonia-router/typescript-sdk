import assert from "node:assert/strict";
import { test } from "node:test";
import { Tonia } from "./client.js";
import {
  AuthenticationError,
  ManagedCredentialUnavailableError,
  PathNotAllowedError,
  PolicyBlockError,
} from "./errors.js";

test("default base URL is tonia Pass only", () => {
  assert.equal(new Tonia().baseURL, "https://pass.tonia.ca");
});

test("public models sends no auth and joins base URL", async () => {
  const client = new Tonia({
    baseURL: "https://pass.example/",
    fetch: async (input, init) => {
      assert.equal(String(input), "https://pass.example/v1/public/models");
      const headers = new Headers(init?.headers);
      assert.equal(headers.has("authorization"), false);
      assert.equal(headers.has("x-api-key"), false);
      return Response.json({ data: [{ id: "gpt-test" }] });
    },
  });
  const body = (await client.publicModels.list()) as { data: unknown[] };
  assert.equal(body.data.length, 1);
});

test("runtime routes preserve bearer, attribution, and limit headers", async () => {
  const client = new Tonia({
    apiKey: "tonia_test",
    baseURL: "https://pass.example",
    defaultHeaders: { "X-Tonia-Title": "SDK E2E" },
    fetch: async (_input, init) => {
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("authorization"), "Bearer tonia_test");
      assert.equal(headers.get("x-tonia-title"), "SDK E2E");
      return Response.json(
        { data: [{ id: "gpt-test" }] },
        {
          headers: {
            "x-tonia-limit-warning": "usage_limit_80_percent",
            "x-tonia-limit-remaining": "17",
          },
        },
      );
    },
  });
  await client.models.list();
  assert.equal(client.lastLimits?.warning, "usage_limit_80_percent");
  assert.equal(client.lastLimits?.remaining, "17");
});

test("messages sends x-api-key and no bearer", async () => {
  const client = new Tonia({
    apiKey: "tonia_test",
    fetch: async (_input, init) => {
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("x-api-key"), "tonia_test");
      assert.equal(headers.has("authorization"), false);
      return Response.json({ content: [] });
    },
  });
  await client.messages.create({ model: "claude-test", messages: [] });
});

test("missing key and unsupported path reject before fetch", async () => {
  let calls = 0;
  const client = new Tonia({
    fetch: async () => {
      calls += 1;
      return Response.json({});
    },
  });
  await assert.rejects(() => client.models.list(), AuthenticationError);
  await assert.rejects(() => client.request("GET", "/healthz"), PathNotAllowedError);
  assert.equal(calls, 0);
});

test("HTTP 200 policy carrier raises typed error", async () => {
  const client = new Tonia({
    apiKey: "tonia_test",
    fetch: async () =>
      Response.json({
        _tonia_policy_block: {
          code: "regulated_content_detected",
          message: "Blocked",
        },
      }),
  });
  await assert.rejects(
    () => client.chat.completions.create({ model: "gpt-test", messages: [] }),
    PolicyBlockError,
  );
});

test("stream yields incremental events and terminal marker", async () => {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        encoder.encode('data: {"choices":[{"delta":{"content":"o"}}]}\n\n'),
      );
      controller.enqueue(
        encoder.encode('data: {"choices":[{"finish_reason":"stop"}]}\n\n'),
      );
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  const client = new Tonia({
    apiKey: "tonia_test",
    fetch: async (_input, init) => {
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("accept"), "text/event-stream");
      assert.match(String(init?.body), /"stream":true/);
      return new Response(body, {
        headers: { "content-type": "text/event-stream" },
      });
    },
  });
  const events = [];
  for await (const event of client.chat.completions.stream({
    model: "gpt-test",
    messages: [],
  })) {
    events.push(event);
  }
  assert.equal(events.length, 3);
  assert.equal(events.at(-1)?.data, "[DONE]");
});

test("model and conversation identifiers are URL encoded", async () => {
  const urls: string[] = [];
  const client = new Tonia({
    apiKey: "tonia_test",
    fetch: async (input) => {
      urls.push(String(input));
      return Response.json({});
    },
  });
  await client.models.get("vendor/model id");
  await client.conversations.get("conversation/id");
  assert.match(urls[0] ?? "", /vendor%2Fmodel%20id$/);
  assert.match(urls[1] ?? "", /conversation%2Fid$/);
});

test("all named nonstream helpers stay on the locked public surface", async () => {
  const calls: string[] = [];
  const client = new Tonia({
    apiKey: "tonia_test",
    fetch: async (input) => {
      calls.push(String(input).replace("https://pass.tonia.ca", ""));
      return Response.json({ data: [{ id: "ok" }] });
    },
  });
  await client.publicModels.get("vendor/model");
  await client.publicModelCategories.list();
  await client.status.get();
  await client.embeddings.create({ model: "embed", input: "hello" });
  await client.images.generate({ model: "image", prompt: "hello" });
  await client.images.edit({ model: "image", prompt: "hello" });
  await client.responses.create({ model: "gpt", input: "hello" });
  await client.rerank.create({ model: "rerank", query: "a", documents: ["b"] });
  await client.interactions.create({ model: "gpt", input: "hello" });
  await client.conversations.list({ archived: 1 });
  await client.conversations.create({ title: "test" });
  await client.conversations.update("conversation/id", { archived: true });
  await client.conversations.delete("conversation/id");
  await client.conversations.export();
  await client.conversations.append("conversation/id", {
    role: "user",
    content: "hello",
  });
  await client.conversations.deleteHistory();

  assert.deepEqual(new Set(calls), new Set([
    "/v1/public/models/vendor%2Fmodel",
    "/v1/public/model-categories",
    "/v1/status",
    "/v1/embeddings",
    "/v1/images/generations",
    "/v1/images/edits",
    "/v1/responses",
    "/v1/rerank",
    "/v1/interactions",
    "/v1/conversations?archived=1",
    "/v1/conversations",
    "/v1/conversations/conversation%2Fid",
    "/v1/conversations/export",
    "/v1/conversations/conversation%2Fid/messages",
  ]));
});

test("nested tool image and web-search body passes through unchanged", async () => {
  const body = {
    model: "gpt-test",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_image",
            image_url: "data:image/png;base64,AA==",
          },
        ],
      },
    ],
    tools: [{ type: "web_search_preview" }],
    tool_choice: "auto",
    web_search_options: { search_context_size: "low" },
  };
  const client = new Tonia({
    apiKey: "tonia_test",
    fetch: async (_input, init) => {
      assert.deepEqual(JSON.parse(String(init?.body)), body);
      return Response.json({ output: [] });
    },
  });
  await client.responses.create(body);
});

test("retryable errors surface without an automatic retry", async () => {
  let calls = 0;
  const client = new Tonia({
    apiKey: "tonia_test",
    fetch: async () => {
      calls += 1;
      return Response.json(
        {
          error: {
            type: "managed_credential_unavailable",
            code: "managed_credential_unavailable",
            message: "Unavailable",
            retryable: true,
          },
        },
        { status: 503 },
      );
    },
  });
  await assert.rejects(
    () => client.responses.create({ model: "gpt-test", input: "hello" }),
    (error) =>
      error instanceof ManagedCredentialUnavailableError &&
      error.retryable === true,
  );
  assert.equal(calls, 1);
});
