import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import worker from "../src/index.js";

const htmlPath = new URL("../spruce-and-spirit-home-care/index.html", import.meta.url);
const scriptPath = new URL("../spruce-and-spirit-home-care/script.js", import.meta.url);

test("contact form submits to the Worker endpoint without hash navigation", async () => {
  const html = await readFile(htmlPath, "utf8");
  const script = await readFile(scriptPath, "utf8");

  assert.match(html, /<form class="contact-form" action="\/api\/contact" method="post" novalidate>/);
  assert.doesNotMatch(html, /<form[^>]+action="#"/);
  assert.match(html, /<p class="form-note" role="status" aria-live="polite"><\/p>/);
  assert.match(script, /document\.addEventListener\("DOMContentLoaded"/);
  assert.match(script, /event\.preventDefault\(\)/);
  assert.match(script, /fetch\("\/api\/contact"/);
});

test("POST /api/contact logs binding presence and returns MISSING_ENV when email configuration is missing", async () => {
  const originalLog = console.log;
  const loggedMessages = [];

  console.log = (...args) => loggedMessages.push(args);

  const request = new Request("https://example.com/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test Person",
      email: "test@example.com",
      phone: "0400 000 000",
      suburb: "Yarrabilba",
      supportType: "General cleaning",
      preferredContact: "Email",
      message: "Hello",
    }),
  });

  try {
    const response = await worker.fetch(request, {
      CONTACT_TO_EMAIL: "to@example.com",
      ASSETS: { fetch: () => new Response("asset") },
    });

    assert.equal(response.status, 500);
    assert.equal(response.headers.get("content-type"), "application/json");
    assert.deepEqual(await response.json(), {
      error: "Contact form email is not configured.",
      code: "MISSING_ENV",
    });
    assert.deepEqual(loggedMessages, [
      [
        "Contact form environment status",
        {
          RESEND_API_KEY: false,
          CONTACT_TO_EMAIL: true,
          CONTACT_FROM_EMAIL: false,
        },
      ],
    ]);
  } finally {
    console.log = originalLog;
  }
});

test("GET requests still fall through to the static asset binding", async () => {
  const request = new Request("https://example.com/");
  const response = await worker.fetch(request, {
    ASSETS: {
      fetch: () => new Response("<html>home</html>", {
        headers: { "Content-Type": "text/html" },
      }),
    },
  });

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "<html>home</html>");
});

test("POST /api/contact sends through Resend when configured", async () => {
  const originalFetch = globalThis.fetch;
  let resendRequest;

  globalThis.fetch = async (url, options) => {
    resendRequest = { url, options };
    return new Response(null, { status: 200 });
  };

  try {
    const request = new Request("https://example.com/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Person",
        email: "test@example.com",
        phone: "0400 000 000",
        suburb: "Yarrabilba",
        supportType: "General cleaning",
        preferredContact: "Email",
        message: "Hello",
      }),
    });

    const response = await worker.fetch(request, {
      RESEND_API_KEY: "secret",
      CONTACT_TO_EMAIL: "to@example.com",
      CONTACT_FROM_EMAIL: "from@example.com",
      ASSETS: { fetch: () => new Response("asset") },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(resendRequest.url, "https://api.resend.com/emails");
    assert.equal(resendRequest.options.method, "POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("POST /api/contact logs Resend failures without exposing secrets to the client", async () => {
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const loggedMessages = [];

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: "The from address is not verified." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  console.error = (...args) => loggedMessages.push(args);

  try {
    const request = new Request("https://example.com/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Person",
        email: "test@example.com",
        phone: "0400 000 000",
        suburb: "Yarrabilba",
        supportType: "General cleaning",
        preferredContact: "Email",
        message: "Hello",
      }),
    });

    const response = await worker.fetch(request, {
      RESEND_API_KEY: "secret-value",
      CONTACT_TO_EMAIL: "to@example.com",
      CONTACT_FROM_EMAIL: "from@example.com",
      ASSETS: { fetch: () => new Response("asset") },
    });

    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: "Unable to send enquiry.", code: "RESEND_ERROR" });
    assert.deepEqual(loggedMessages, [
      [
        "Resend email send failed",
        {
          status: 403,
          body: '{"message":"The from address is not verified."}',
        },
      ],
    ]);
    assert.equal(JSON.stringify(loggedMessages).includes("secret-value"), false);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
  }
});

test("POST /api/contact returns INVALID_REQUEST for malformed JSON", async () => {
  const request = new Request("https://example.com/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not-json",
  });

  const response = await worker.fetch(request, {
    ASSETS: { fetch: () => new Response("asset") },
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Invalid request body.",
    code: "INVALID_REQUEST",
  });
});
