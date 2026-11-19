import { generateWelcomeEmail } from "./templates/welcomeEmail.js";

/**
 * Calm Capital - Automated Welcome Email Dispatcher API
 * 
 * Triggers an institutional welcome email when a user signs in.
 * 
 * Supported Providers:
 * - Resend (RESEND_API_KEY)
 * - Custom SMTP / Webhook
 * - Built-in Visual Preview Engine (?preview=true)
 */
export default async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 1. Preview Mode: Direct browser viewing
  const isPreview = req.query.preview === "true" || req.body?.preview === true;
  const targetEmail = req.query.email || req.body?.email || "trader@gmail.com";
  const targetName = req.query.name || req.body?.name || "Trader";
  const loginTime = req.body?.loginTime || new Date().toUTCString();

  const { subject, html, text } = generateWelcomeEmail({
    name: targetName,
    email: targetEmail,
    loginTime
  });

  if (req.method === "GET" && isPreview) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  }

  if (req.method === "GET") {
    return res.status(200).json({
      status: "active",
      template: "Calm Capital Institutional Welcome Email",
      previewUrl: "/api/send-welcome-email?preview=true"
    });
  }

  // 2. Dispatch Mode: POST request
  try {
    const resendKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.EMAIL_FROM || "Calm Capital <yash@calmcapital.space>";

    if (resendKey) {
      const emailPayload = {
        from: fromAddress,
        to: [targetEmail],
        reply_to: "yash@calmcapital.space",
        subject,
        html,
        text
      };

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(emailPayload)
      });

      const resendData = await resendRes.json();

      if (!resendRes.ok) {
        console.warn("[Welcome Email] Resend delivery warning:", resendData);
        return res.status(200).json({
          success: false,
          warning: resendData?.message || "Failed to deliver via Resend",
          subject
        });
      }

      return res.status(200).json({
        success: true,
        provider: "resend",
        id: resendData.id,
        to: targetEmail,
        subject
      });
    }

    // Fallback: Return simulated dispatch if RESEND_API_KEY is not yet added in Vercel settings
    return res.status(200).json({
      success: true,
      simulated: true,
      message: "Welcome email generated and verified. Set RESEND_API_KEY in Vercel environment to enable live email delivery.",
      to: targetEmail,
      subject
    });

  } catch (error) {
    console.error("[Welcome Email Error]:", error);
    return res.status(500).json({
      error: "Internal error generating welcome email",
      message: error?.message
    });
  }
}
