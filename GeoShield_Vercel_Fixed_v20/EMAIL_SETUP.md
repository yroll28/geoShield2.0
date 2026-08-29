# GeoShield automatic completion email setup

The admin portal now attempts to **send the completion email automatically** to the exact email address the customer entered in the request form. It does not put a mail-provider password or API key in the browser.

## Included delivery options

### Vercel / compatible serverless hosting
The ZIP contains:

- `api/send-completion-email.js`
- `vercel.json`

Set these environment variables in the hosting provider:

- `RESEND_API_KEY` — your Resend API key
- `MAIL_FROM` — a sender address/domain verified with Resend, for example `GeoShield Mapping Services <notifications@yourdomain.com>`
- `ALLOWED_ORIGIN` — optional, your exact website origin such as `https://example.com`

Leave **Automatic Email Endpoint** in Admin → Website Settings as:

`/api/send-completion-email`

### Netlify
The ZIP also contains:

`netlify/functions/send-completion-email.js`

Set the same `RESEND_API_KEY`, `MAIL_FROM`, and optional `ALLOWED_ORIGIN` environment variables in Netlify. Then set **Automatic Email Endpoint** to:

`/.netlify/functions/send-completion-email`

### Node hosting
The ZIP contains `server.js`. Run the site with Node 18+ and set the same environment variables. The server exposes `/api/send-completion-email` while serving the static website.

## What happens after setup

1. A customer submits the request form with their email address.
2. The request is saved with that exact email.
3. You open Admin → Service Requests.
4. You mark the request **Completed** and add remarks.
5. The browser calls the server-side email endpoint.
6. The server sends the universal completion email to the customer's email address.
7. The request is marked **Automatic email sent** with a timestamp and provider message ID.
8. If the server cannot send it, the admin sees the error and can use **Send / Retry Email**, which attempts the server again and then offers a Gmail fallback.

## Important

A verified sender is required by the email provider. Do not place `RESEND_API_KEY` in `assets/app.js`, `private-admin/admin.js`, HTML, or any other frontend file.

The current frontend/localStorage request store is still a prototype. For a production system, move customer requests and admin authentication to a server/database as well. That prevents browser storage from being the only source of truth and gives the email endpoint a proper authenticated admin session.
