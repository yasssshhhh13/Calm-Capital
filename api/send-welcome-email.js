import { generateWelcomeEmail } from "./templates/welcomeEmail.js";
import nodemailer from "nodemailer";

/**
 * Calm Capital - Automated Welcome Email Dispatcher API
 * 
 * Supports:
 * 1. Direct Mailbox SMTP (Google Workspace, Zoho, Hostinger, Titan, Private cPanel)
 * 2. Resend API (RESEND_API_KEY)
 * 3. In-Browser Visual Preview Engine (?preview=true)
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
    // -------------------------------------------------------------
    // OPTION A: Direct Mailbox Connection via SMTP (Nodemailer)
    // -------------------------------------------------------------
    const smtpUser = process.env.SMTP_USER || process.env.MAIL_USER || process.env.EMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.MAIL_PASS || process.env.EMAIL_PASS || process.env.SMTP_PASSWORD;

    if (smtpUser && smtpPass) {
      // Auto-detect host if not explicitly specified
      let smtpHost = process.env.SMTP_HOST || process.env.MAIL_HOST;
      let smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);
      let isSecure = smtpPort === 465;

      if (!smtpHost) {
        const domain = (smtpUser.split("@")[1] || "").toLowerCase();
        if (domain.includes("gmail") || domain.includes("google")) {
          smtpHost = "smtp.gmail.com";
          smtpPort = 465;
          isSecure = true;
        } else if (domain.includes("zoho")) {
          smtpHost = domain.endsWith(".in") ? "smtppro.zoho.in" : "smtp.zoho.com";
          smtpPort = 465;
          isSecure = true;
        } else if (domain.includes("hostinger")) {
          smtpHost = "smtp.hostinger.com";
          smtpPort = 465;
          isSecure = true;
        } else if (domain.includes("titan")) {
          smtpHost = "smtp.titan.email";
          smtpPort = 465;
          isSecure = true;
        } else {
          // Default Google Workspace / standard TLS
          smtpHost = "smtp.gmail.com";
          smtpPort = 465;
          isSecure = true;
        }
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: isSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      const senderName = process.env.SENDER_NAME || "Calm Capital";
      const fromFormatted = `"${senderName}" <${smtpUser}>`;

      const info = await transporter.sendMail({
        from: fromFormatted,
        to: targetEmail,
        replyTo: smtpUser,
        subject,
        html,
        text
      });

      console.log(`[Welcome Email] Delivered via SMTP (${smtpHost}) to ${targetEmail}, messageId: ${info.messageId}`);

      return res.status(200).json({
        success: true,
        provider: "smtp",
        host: smtpHost,
        messageId: info.messageId,
        to: targetEmail,
        subject
      });
    }

    // -------------------------------------------------------------
    // OPTION B: Resend HTTP API (if RESEND_API_KEY is configured)
    // -------------------------------------------------------------
    const resendKey = process.env.RESEND_API_KEY;
    const preferredFrom = process.env.EMAIL_FROM || "Calm Capital <yash@calmcapital.space>";

    if (resendKey) {
      let emailPayload = {
        from: preferredFrom,
        to: [targetEmail],
        reply_to: "yash@calmcapital.space",
        subject,
        html,
        text
      };

      let resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(emailPayload)
      });

      let resendData = await resendRes.json();

      // Graceful Auto-Fallback: If calmcapital.space domain is not yet verified in Resend, send via onboarding@resend.dev
      if (!resendRes.ok && (resendData?.message?.includes("domain") || resendData?.name === "validation_error")) {
        console.warn("[Welcome Email] Retrying with Resend verified sandbox sender...");
        emailPayload.from = "Calm Capital <onboarding@resend.dev>";
        resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(emailPayload)
        });
        resendData = await resendRes.json();
      }

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
        from: emailPayload.from,
        to: targetEmail,
        subject
      });
    }

    // Fallback: Return simulated dispatch if credentials are not yet set
    return res.status(200).json({
      success: true,
      simulated: true,
      message: "Welcome email generated and verified. Set SMTP credentials or RESEND_API_KEY in Vercel to dispatch live.",
      to: targetEmail,
      subject
    });

  } catch (error) {
    console.error("[Welcome Email Error]:", error);
    return res.status(500).json({
      error: "Internal error delivering welcome email",
      message: error?.message
    });
  }
}
