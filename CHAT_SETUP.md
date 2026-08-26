# Customer Service Chat Setup

The website now includes a client/admin chat tied to each service-request reference.

## Required server environment variables

```text
CHAT_ADMIN_KEY=use-a-long-random-secret
CHAT_ADMIN_EMAIL=your-business-email@example.com
```

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
2. Open **Customer Service**.
3. Enter the `CHAT_ADMIN_KEY` configured on the server.
4. Select a conversation and reply.

The admin key is stored only in `sessionStorage` for the current browser session and is not written to website settings.

## Production storage warning

The included Node server stores chat threads in `data/chat-threads.json`. This is suitable for a simple Node deployment, but serverless hosting needs a durable database/Redis adapter before production. Do not rely on an ephemeral serverless filesystem for permanent client communications.
