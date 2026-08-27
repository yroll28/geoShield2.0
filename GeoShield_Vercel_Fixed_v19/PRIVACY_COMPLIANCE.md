# GeoShield Privacy & Data Protection Implementation Notes

This project includes a practical privacy-by-design baseline for a Philippine small-business mapping service. It is not a legal opinion or certification of compliance.

## Implemented in the website

- A plain-language Privacy & Data Protection notice.
- A request-form acknowledgment before personal information is submitted.
- Purpose limitation: requests, client communication, quotations, service delivery, records, and requested outputs.
- Data minimization language and a warning not to submit unnecessary sensitive personal information.
- Customer-service chat tied to a request reference and the email used for the request.
- Server-side email/chat credentials are kept in environment variables rather than frontend JavaScript.
- Customer chat access uses a server-issued token stored locally in the customer's browser.
- Admin chat access uses a separate server-side CHAT_ADMIN_KEY held only in the admin session.
- Privacy contact is configurable through the business contact settings.

## Before production launch

1. Replace placeholder business and privacy-contact details with the actual Personal Information Controller (PIC) and Data Protection Officer (DPO), if applicable.
2. Document the lawful basis for every processing activity. RA 10173 allows processing under several lawful bases, including consent, contract-related necessity, legal obligation, vital interests, public authority, and qualifying legitimate interests.
3. Publish a final Privacy Notice describing categories of data, purposes, lawful basis, recipients/processors, retention, security safeguards, and data-subject rights.
4. Establish a retention schedule and secure deletion/anonymization process. Do not retain data indefinitely just because the system can store it.
5. Complete a Privacy Impact Assessment for the request, email, map/location, chat, and hosting/third-party processing activities where required or appropriate.
6. Put appropriate processor/data-sharing agreements in place for hosting, email, database, analytics, mapping, or other vendors that process personal data.
7. Establish a documented security-incident and personal-data-breach response procedure, including NPC notification assessment where required.
8. Use HTTPS in production, strong server-side admin authentication, least-privilege access, backups, logging, rate limiting, and secure secrets management.
9. Do not store sensitive personal information in chat unless it is genuinely necessary and a lawful basis and safeguards exist.
10. Before launch, have the final notice, retention schedule, processor arrangements, and security controls reviewed by the business's privacy/legal adviser or DPO.

## Important architecture note

The included chat API has a JSON-file storage adapter for a normal Node server. Serverless deployments such as Vercel/Netlify should be connected to a durable database/Redis store before production; otherwise chat data can be lost when a serverless instance is replaced.
