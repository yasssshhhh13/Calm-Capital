import { generateWelcomeEmail } from "./templates/welcomeEmail.js";
import nodemailer from "nodemailer";

/**
 * Calm Capital - Automated Welcome Email Dispatcher API
 * 
 * Supports:
 * 1. Direct Mailbox SMTP (Hostinger, Google Workspace, Zoho, Titan)
 * 2. Resend API (RESEND_API_KEY)
 * 3. Server-Side Persistent Deduplication (Welcome email sent strictly 1 time per user)
 * 4. In-Browser Visual Preview Engine (?preview=true)
 */

const sentMemStore = new Set();

async function getKvClient() {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.STORAGE_REST_API_URL ||
    process.env.STORAGE_URL;

  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.STORAGE_REST_API_TOKEN ||
    process.env.STORAGE_TOKEN;

  if (url && token) {
    return {
      async get(key) {
        try {
          const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          return data?.result !== null && data?.result !== undefined;
        } catch {
          return false;
        }
      },
      async set(key, val) {
        try {
          await fetch(`${url}/set/${encodeURIComponent(key)}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(val)
          });
          return true;
        } catch {
          return false;
        }
      }
    };
  }
  return null;
}

async function isWelcomeAlreadySent(email) {
  const clean = email.toLowerCase().trim();
  if (sentMemStore.has(clean)) return true;
  const kv = await getKvClient();
  if (kv) {
    const has = await kv.get(`cc:welcome:${clean}`);
    if (has) {
      sentMemStore.add(clean);
      return true;
    }
  }
  return false;
}

async function markWelcomeSent(email) {
  const clean = email.toLowerCase().trim();
  sentMemStore.add(clean);
  const kv = await getKvClient();
  if (kv) {
    await kv.set(`cc:welcome:${clean}`, { sentAt: new Date().toISOString() });
  }
}

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
    const cleanTargetEmail = (req.body?.email || req.query?.email || "").toLowerCase().trim();
    if (!cleanTargetEmail || !cleanTargetEmail.includes("@")) {
      return res.status(400).json({ error: "Valid email address is required." });
    }

    // Strict 1-Time Delivery Rule: Check if user already received welcome email
    const force = req.query.force === "true" || req.body?.force === true;
    if (!force) {
      const alreadySent = await isWelcomeAlreadySent(cleanTargetEmail);
      if (alreadySent) {
        return res.status(200).json({
          success: true,
          alreadySent: true,
          message: `Welcome email was already sent to ${cleanTargetEmail}. Delivered strictly 1 time on first sign-in.`,
          to: cleanTargetEmail
        });
      }
    }

    // -------------------------------------------------------------
    // OPTION A: Direct Mailbox Connection via SMTP (Hostinger / Google)
    // -------------------------------------------------------------
    const smtpUser = process.env.SMTP_USER || process.env.MAIL_USER || process.env.EMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.MAIL_PASS || process.env.EMAIL_PASS || process.env.SMTP_PASSWORD;

    if (smtpUser && smtpPass) {
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
          smtpHost = "smtp.hostinger.com";
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
        to: cleanTargetEmail,
        replyTo: smtpUser,
        subject,
        html,
        text
      });

      console.log(`[Welcome Email] Delivered via Hostinger/SMTP (${smtpHost}) to ${cleanTargetEmail}, messageId: ${info.messageId}`);
      await markWelcomeSent(cleanTargetEmail);

      return res.status(200).json({
        success: true,
        provider: "smtp",
        host: smtpHost,
        messageId: info.messageId,
        to: cleanTargetEmail,
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
        to: [cleanTargetEmail],
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
        console.warn("[Welcome Email] Custom domain unverified. Retrying with Resend onboarding sender...");
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
        console.warn("[Welcome Email] Resend delivery response:", resendData);
        return res.status(200).json({
          success: false,
          warning: resendData?.message || "Failed to deliver via Resend",
          sandboxRestriction: resendData?.message?.includes("testing emails to your own email address") || false,
          solution: "Resend free tier only allows sending to yash.22010255@gmail.com until calmcapital.space is added at resend.com/domains, OR you can add your Hostinger SMTP credentials (SMTP_USER & SMTP_PASS) to Vercel.",
          subject
        });
      }

      await markWelcomeSent(cleanTargetEmail);

      return res.status(200).json({
        success: true,
        provider: "resend",
        id: resendData.id,
        from: emailPayload.from,
        to: cleanTargetEmail,
        subject
      });
    }

    // Fallback: Return simulated dispatch if credentials are not yet set
    return res.status(200).json({
      success: true,
      simulated: true,
      message: "Welcome email generated and verified. Set SMTP credentials or RESEND_API_KEY in Vercel to dispatch live.",
      to: cleanTargetEmail,
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