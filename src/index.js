const RESEND_API_URL = "https://api.resend.com/emails";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildEmailHtml(fields) {
  return `
    <h1>New Spruce &amp; Spirit enquiry</h1>
    <p><strong>Name:</strong> ${escapeHtml(fields.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(fields.email)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(fields.phone)}</p>
    <p><strong>Suburb:</strong> ${escapeHtml(fields.suburb)}</p>
    <p><strong>Type of support needed:</strong> ${escapeHtml(fields.supportType)}</p>
    <p><strong>Preferred contact method:</strong> ${escapeHtml(fields.preferredContact)}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(fields.message).replaceAll("\n", "<br />")}</p>
    <hr />
    <p>Submitted from spruceandspirit.com.au</p>
  `;
}

async function handleContactRequest(request, env) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body.", code: "INVALID_REQUEST" }, 400);
  }

  const fields = {
    name: String(payload.name || "").trim(),
    email: String(payload.email || "").trim(),
    phone: String(payload.phone || "").trim(),
    suburb: String(payload.suburb || "").trim(),
    supportType: String(payload.supportType || "").trim(),
    preferredContact: String(payload.preferredContact || "").trim(),
    message: String(payload.message || "").trim(),
    company: String(payload.company || "").trim(),
  };

  if (fields.company) {
    return jsonResponse({ ok: true });
  }

  if (!fields.name || !fields.email || !fields.message) {
    return jsonResponse({ error: "Name, email, and message are required.", code: "INVALID_REQUEST" }, 400);
  }

  if (!EMAIL_PATTERN.test(fields.email)) {
    return jsonResponse({ error: "Please provide a valid email address.", code: "INVALID_REQUEST" }, 400);
  }

  const environmentStatus = {
    RESEND_API_KEY: Boolean(env.RESEND_API_KEY),
    CONTACT_TO_EMAIL: Boolean(env.CONTACT_TO_EMAIL),
    CONTACT_FROM_EMAIL: Boolean(env.CONTACT_FROM_EMAIL),
  };

  console.log("Contact form environment status", environmentStatus);

  if (!environmentStatus.RESEND_API_KEY || !environmentStatus.CONTACT_TO_EMAIL || !environmentStatus.CONTACT_FROM_EMAIL) {
    return jsonResponse({ error: "Contact form email is not configured.", code: "MISSING_ENV" }, 500);
  }

  const resendResponse = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "User-Agent": "spruce-and-spirit-home-care-worker",
    },
    body: JSON.stringify({
      from: `Spruce & Spirit Home Care <${env.CONTACT_FROM_EMAIL}>`,
      to: [env.CONTACT_TO_EMAIL],
      reply_to: fields.email,
      subject: `New Spruce & Spirit enquiry from ${fields.name}`,
      html: buildEmailHtml(fields),
    }),
  });

  if (!resendResponse.ok) {
    const resendErrorBody = await resendResponse.text();

    console.error("Resend email send failed", {
      status: resendResponse.status,
      body: resendErrorBody,
    });

    return jsonResponse({ error: "Unable to send enquiry.", code: "RESEND_ERROR" }, 502);
  }

  return jsonResponse({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact") {
      if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed." }, 405);
      }

      return handleContactRequest(request, env);
    }

    // Cloudflare environment setup:
    // - `wrangler secret put RESEND_API_KEY`
    // - `CONTACT_TO_EMAIL` variable for the business inbox
    // - `CONTACT_FROM_EMAIL` variable for a verified Resend sender address
    return env.ASSETS.fetch(request);
  },
};
