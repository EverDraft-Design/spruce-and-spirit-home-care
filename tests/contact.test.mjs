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

test("POST /api/contact returns JSON when email configuration is missing", async () => {
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
    ASSETS: { fetch: () => new Response("asset") },
  });

  assert.equal(response.status, 500);
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.deepEqual(await response.json(), { error: "Contact form email is not configured." });
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
