/**
 * GeoShield automatic completion email endpoint for Vercel/Node serverless.
 * Required environment variables:
 *   RESEND_API_KEY=...
 *   MAIL_FROM=GeoShield Mapping Services <verified-sender@yourdomain.com>
 * Optional:
 *   ALLOWED_ORIGIN=https://yourdomain.com
 */
function setCors(res, origin) {
  const allowed = process.env.ALLOWED_ORIGIN || origin || "*";
  res.setHeader("Access-Control-Allow-Origin", allowed);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");
}

function clean(value, max = 5000) {
  return String(value ?? "").trim().slice(0, max);
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value) {
  return clean(value).replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[ch]));
}

module.exports = async function handler(req, res) {
  setCors(res, req.headers.origin);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok:false, error:"Method not allowed" });
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) {
    return res.status(503).json({ ok:false, error:"Email service is not configured on the server." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const to = clean(body.to, 320);
    const subject = clean(body.subject, 180);
    const text = clean(body.text, 12000);
    const html = clean(body.html, 20000);
    const replyTo = clean(body.replyTo, 320);

    if (!validEmail(to)) return res.status(400).json({ ok:false, error:"A valid customer email is required." });
    if (!subject || !text) return res.status(400).json({ ok:false, error:"Email subject and message are required." });
    if (replyTo && !validEmail(replyTo)) return res.status(400).json({ ok:false, error:"The reply-to email is invalid." });

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM,
        to: [to],
        subject,
        ...(replyTo ? { reply_to: replyTo } : {}),
        text,
        html: html || `<p>${escapeHtml(text).replace(/\n/g,"<br>")}</p>`
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Resend error", result);
      return res.status(502).json({ ok:false, error: result?.message || "The email provider rejected the message." });
    }

    return res.status(200).json({ ok:true, id:result.id || null });
  } catch (error) {
    console.error("Completion email error", error);
    return res.status(500).json({ ok:false, error:"The server could not send the completion email." });
  }
};
