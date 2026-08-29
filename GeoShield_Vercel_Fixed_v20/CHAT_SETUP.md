# Customer Service Chat + Service Requests — Setup

The website includes:
- a public "Request a Service" form,
- a private admin **Service Requests** dashboard, and
- a client/admin chat tied to each service-request reference.

## ⚠️ Required on Vercel: connect a Redis database (one-time, ~2 minutes)

**This step is not optional if you're deployed on Vercel.** Vercel's serverless
functions run on a read-only, ephemeral filesystem — the server **cannot**
reliably save requests or chat messages to a local file, because each
request can be handled by a different, isolated function instance. Without a
real database connected, requests submitted on one device (e.g. a customer's
phone) may not show up in the admin portal on another device, or may
disappear entirely.

**To fix this:**

1. Go to your project in the [Vercel dashboard](https://vercel.com/dashboard).
2. Open the **Storage** tab.
3. Click **Create Database** → choose **Redis** (powered by Upstash).
4. Click **Connect to Project**, and select this project.
5. Vercel will automatically add the required environment variables
   (`KV_REST_API_URL` and `KV_REST_API_TOKEN`, or `UPSTASH_REDIS_REST_URL` /
   `UPSTASH_REDIS_REST_TOKEN`) — the code already looks for either naming, so
   no extra setup is needed on your end.
6. Redeploy the project so the new environment variables take effect.

Once connected, requests and chat messages are stored in Redis and are
visible immediately from any device — phone, tablet, or desktop.

If you're running this on a plain always-on Node server instead of Vercel
(`node server.js`), this step is not required — it automatically falls back
to storing data in local `data/*.json` files, which works fine as long as
the server keeps running on one machine.

## Required server environment variables

```text
CHAT_ADMIN_KEY=use-a-long-random-secret
CHAT_ADMIN_EMAIL=your-business-email@example.com
```

**Important:** `CHAT_ADMIN_KEY` must exactly match `OWNER_PASSWORD` in
`private-admin/admin.js` (near the top of the file). The admin portal
automatically sends your login password as this key on every device, which
is what makes the **Service Requests** list (and chat replies) work
correctly from a phone or tablet, not just the browser that originally
submitted or last viewed them. If you change your owner login password,
update this environment variable to match — and redeploy.

If this variable is missing or doesn't match, the admin **Service Requests**
tab will show a warning banner and fall back to showing only requests cached
on that specific device, and admin chat replies will fail with "Chat access
denied."

If `RESEND_API_KEY` and `MAIL_FROM` are already configured for completion emails, the chat can also send email notifications:

- Client sends a chat message -> notification to `CHAT_ADMIN_EMAIL`.
- Admin sends a reply -> notification to the client's submitted email.

## How the client uses it

1. Submit a service request.
2. The site generates a reference such as `REQ-...`.
3. Open **Customer Service**.
4. Enter the request reference and the same email used in the request.
5. Messages are polled periodically for new replies.

## How the admin uses it

1. Sign into the private admin portal.
2. Requests appear automatically under **Service Requests** — no extra key entry needed.
3. Open **Customer Service** to chat; the same admin key is used automatically.

The admin key is stored only in `sessionStorage` for the current browser session and is not written to website settings.

## How to tell which storage mode is active

Open `/api/requests` directly in a browser while signed in, or check the
`storage` field in the admin network requests — it reports `"kv"` when Redis
is connected and working, or `"local-file"` when falling back to the local
file (fine for plain Node hosting, but will NOT work reliably on Vercel).
