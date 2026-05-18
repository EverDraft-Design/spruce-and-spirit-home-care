# spruce-and-spirit-home-care
Static website for Spruce &amp; Spirit Home Care — thoughtful cleaning, organising, and practical home support

## Contact form configuration

The Cloudflare Worker sends contact-form emails through Resend.

Set these values in Cloudflare before deploying:

- Secret: `RESEND_API_KEY`
- Variable: `CONTACT_TO_EMAIL`
- Variable: `CONTACT_FROM_EMAIL`

Example secret command:

```bash
npx wrangler secret put RESEND_API_KEY
```

Add `CONTACT_TO_EMAIL` and `CONTACT_FROM_EMAIL` as Worker variables in the Cloudflare dashboard or in your deployment environment. `CONTACT_FROM_EMAIL` must be a sender address verified in Resend.
