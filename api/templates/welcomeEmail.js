/**
 * Calm Capital - Premium Institutional Welcome Email Template
 * 
 * High-End FinTech Aesthetic (Stripe / Mercury / Linear inspired)
 * Bulletproof HTML engineered for 100% fidelity across:
 * - Gmail (Web, iOS, Android)
 * - Apple Mail (macOS, iOS)
 * - Outlook (Desktop, Web, Mobile)
 * - Yahoo Mail & Superhuman
 * 
 * Palette: Obsidian Executive (#040711 base, #060D1A card, #10B981 emerald, #1C9BDA cyan)
 */

export function generateWelcomeEmail({ name = "Trader", email = "", loginTime = "" }) {
  const formattedTime = loginTime || new Date().toUTCString();
  const displayName = name && name !== "Trader" ? name.trim() : "Trader";
  const userEmail = email ? email.toLowerCase() : "";

  const subject = `Welcome to Calm Capital — Your Institutional Trading Desk is Ready`;

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important; }
  </style>
  <![endif]-->
  <title>Welcome to Calm Capital</title>
  <style type="text/css">
    /* Reset styles */
    body, p, h1, h2, h3, h4, h5, h6 { margin: 0; padding: 0; }
    body { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #03060E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    a { color: #1c9bda; text-decoration: none; }

    /* Mobile Responsive */
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .mobile-p-6 { padding: 24px 18px !important; }
      .mobile-p-4 { padding: 18px 14px !important; }
      .mobile-h1 { font-size: 24px !important; line-height: 32px !important; }
      .metric-col { display: block !important; width: 100% !important; margin-bottom: 8px !important; }
      .mobile-btn { width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #03060E; color: #CBD5E1;">
  
  <!-- Outer Wrapper Table -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #03060E; min-height: 100%;">
    <tr>
      <td align="center" style="padding: 40px 14px 60px 14px;">
        
        <!-- Main Email Container (Max Width 600px) -->
        <table role="presentation" class="email-container" width="600" cellspacing="0" cellpadding="0" border="0" style="width: 600px; max-width: 600px; background-color: #060D1A; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; overflow: hidden; box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.8);">
          
          <!-- TOP ACCENT LINE (Dual-Market Emerald to Cyan Gradient) -->
          <tr>
            <td height="3" style="background: linear-gradient(90deg, #10B981 0%, #14B8A6 35%, #1C9BDA 70%, #0284C7 100%); line-height: 3px; font-size: 3px;">&nbsp;</td>
          </tr>

          <!-- HEADER: Brand Emblem & Live Status Pill -->
          <tr>
            <td style="padding: 36px 40px 24px 40px;" class="mobile-p-6">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" valign="middle">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td valign="middle" style="padding-right: 14px;">
                          <img src="https://calmcapital.space/logo.png" alt="Calm Capital" width="40" height="40" style="display: block; border-radius: 12px; width: 40px; height: 40px; background-color: #0A1628; border: 1px solid rgba(255, 255, 255, 0.1);" />
                        </td>
                        <td valign="middle">
                          <span style="font-size: 19px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.4px; display: block; line-height: 22px;">Calm Capital</span>
                          <span style="font-size: 10px; font-weight: 700; color: #10B981; text-transform: uppercase; letter-spacing: 1.5px; display: block; line-height: 14px; margin-top: 3px;">Designed by Discipline</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.28); border-radius: 20px; padding: 5px 13px; font-size: 10.5px; font-weight: 700; color: #34D399; letter-spacing: 0.8px; text-transform: uppercase;">
                      &#x25CF; DESK ACTIVE
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- HERO BANNER: Clean Typography & Spacious Value Statement -->
          <tr>
            <td style="padding: 4px 40px 28px 40px;" class="mobile-p-6">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(145deg, #091527 0%, #0C1E37 100%); border: 1px solid rgba(28, 155, 218, 0.2); border-radius: 20px; padding: 32px 28px;" class="mobile-p-4">
                <tr>
                  <td>
                    <div style="display: inline-block; background-color: rgba(28, 155, 218, 0.12); border: 1px solid rgba(28, 155, 218, 0.25); border-radius: 6px; padding: 4px 10px; font-size: 10px; font-weight: 800; color: #38BDF8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px;">
                      INSTITUTIONAL GATEWAY ACCESS
                    </div>
                    <h1 class="mobile-h1" style="font-size: 28px; line-height: 36px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.6px; margin-bottom: 12px;">
                      Welcome to the Desk,<br />
                      <span style="color: #38BDF8;">${displayName}.</span>
                    </h1>
                    <p style="font-size: 14px; line-height: 23px; color: #94A3B8; margin: 0; font-weight: 400;">
                      Your Google Single Sign-On was confirmed. Your private trading workspace, encrypted Family PAN Vault, and dual-market intelligence desks are ready.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ACCOUNT SPECIFICATION MATRIX (FinTech Stats Row) -->
          <tr>
            <td style="padding: 0 40px 24px 40px;" class="mobile-p-6">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #07101E; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 14px;">
                <tr>
                  <!-- Metric 1 -->
                  <td width="33.3%" align="center" style="padding: 14px 10px; border-right: 1px solid rgba(255, 255, 255, 0.05);" class="metric-col">
                    <span style="font-size: 9.5px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 3px;">
                      WORKSPACE TIER
                    </span>
                    <span style="font-size: 12.5px; font-weight: 700; color: #F1F5F9; display: block;">
                      Institutional
                    </span>
                  </td>
                  <!-- Metric 2 -->
                  <td width="33.3%" align="center" style="padding: 14px 10px; border-right: 1px solid rgba(255, 255, 255, 0.05);" class="metric-col">
                    <span style="font-size: 9.5px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 3px;">
                      VAULT SECURITY
                    </span>
                    <span style="font-size: 12.5px; font-weight: 700; color: #34D399; display: block;">
                      256-Bit SSL Isolated
                    </span>
                  </td>
                  <!-- Metric 3 -->
                  <td width="33.3%" align="center" style="padding: 14px 10px;" class="metric-col">
                    <span style="font-size: 9.5px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 3px;">
                      CLOUD ENGINE
                    </span>
                    <span style="font-size: 12.5px; font-weight: 700; color: #38BDF8; display: block;">
                      Multi-Device Live
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CORE CAPABILITIES (Spacious, High-Contrast Desk Cards) -->
          <tr>
            <td style="padding: 0 40px 20px 40px;" class="mobile-p-6">
              
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #64748B; margin-bottom: 16px;">
                ACTIVE INTELLIGENCE MODULES
              </div>

              <!-- Module 1: Indian IPO Forensics & GMP -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #071120; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 16px; margin-bottom: 14px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="left" valign="middle">
                          <span style="display: inline-block; background-color: rgba(245, 158, 11, 0.12); border-radius: 6px; padding: 2px 8px; font-size: 9.5px; font-weight: 800; color: #FBBF24; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">
                            PRIMARY MARKETS &bull; REAL-TIME
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td valign="top">
                          <span style="font-size: 15px; font-weight: 700; color: #FFFFFF; display: block; margin-bottom: 5px;">
                            Indian IPO Forensics &amp; Live GMP
                          </span>
                          <span style="font-size: 13px; line-height: 20px; color: #94A3B8; display: block;">
                            Track verified grey market sentiment, institutional QIB 50X alerts, financial health ratios, and registrar allotment timelines for Mainboard &amp; SME public issues.
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Module 2: Cross-Device Family PAN Vault -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #071120; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 16px; margin-bottom: 14px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="left" valign="middle">
                          <span style="display: inline-block; background-color: rgba(16, 185, 129, 0.12); border-radius: 6px; padding: 2px 8px; font-size: 9.5px; font-weight: 800; color: #34D399; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">
                            ACCOUNT VAULT &bull; ENCRYPTED
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td valign="top">
                          <span style="font-size: 15px; font-weight: 700; color: #FFFFFF; display: block; margin-bottom: 5px;">
                            Strictly Private Family PAN Vault
                          </span>
                          <span style="font-size: 13px; line-height: 20px; color: #94A3B8; display: block;">
                            Save family PANs once—they are strictly isolated to your Google account and sync across your phone and desktop for 1-click batch allotment checking.
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Module 3: Quantitative Central Bank & Macro Desk -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #071120; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 16px; margin-bottom: 14px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="left" valign="middle">
                          <span style="display: inline-block; background-color: rgba(168, 85, 247, 0.12); border-radius: 6px; padding: 2px 8px; font-size: 9.5px; font-weight: 800; color: #C084FC; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">
                            CENTRAL BANKS &bull; POSITION SIZING
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td valign="top">
                          <span style="font-size: 15px; font-weight: 700; color: #FFFFFF; display: block; margin-bottom: 5px;">
                            Global Forex &amp; Monetary Benchmarks
                          </span>
                          <span style="font-size: 13px; line-height: 20px; color: #94A3B8; display: block;">
                            Official policy rate tracking (RBI Repo Rate, US Fed Funds, ECB, BoE) paired with mathematical pip valuation, position sizing calculators, and economic calendar feeds.
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Module 4: Discipline Trading Journal -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #071120; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 16px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="left" valign="middle">
                          <span style="display: inline-block; background-color: rgba(28, 155, 218, 0.12); border-radius: 6px; padding: 2px 8px; font-size: 9.5px; font-weight: 800; color: #38BDF8; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">
                            DISCIPLINE JOURNAL &bull; ZERO BIAS
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td valign="top">
                          <span style="font-size: 15px; font-weight: 700; color: #FFFFFF; display: block; margin-bottom: 5px;">
                            Private Discipline Trading Journal
                          </span>
                          <span style="font-size: 13px; line-height: 20px; color: #94A3B8; display: block;">
                            Audit execution setups, session expectancy, and risk-to-reward ratios across prop firm balances ($5,000 to $200,000) with complete strategy confidentiality.
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- PRIMARY ACTION: Luxurious Pill CTA Button -->
          <tr>
            <td align="center" style="padding: 18px 40px 32px 40px;" class="mobile-p-6">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="mobile-btn" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 14px; background: linear-gradient(135deg, #10B981 0%, #1C9BDA 100%); box-shadow: 0 12px 28px -6px rgba(28, 155, 218, 0.35);">
                    <a href="https://calmcapital.space" target="_blank" style="display: inline-block; padding: 16px 40px; font-size: 14.5px; font-weight: 800; color: #FFFFFF; text-decoration: none; border-radius: 14px; letter-spacing: 0.3px;">
                      Open Your Trading Desk &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <span style="display: block; font-size: 11px; color: #64748B; margin-top: 14px; text-align: center;">
                Direct workspace URL: <a href="https://calmcapital.space" target="_blank" style="color: #38BDF8; text-decoration: underline;">https://calmcapital.space</a>
              </span>
            </td>
          </tr>

          <!-- SECURITY REASSURANCE BADGE -->
          <tr>
            <td style="padding: 0 40px 32px 40px;" class="mobile-p-6">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #040914; border: 1px dashed rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 14px 18px;">
                <tr>
                  <td valign="middle">
                    <span style="font-size: 11.5px; line-height: 18px; color: #94A3B8; display: block;">
                      &#x1F512; <strong style="color: #E2E8F0;">Security Confirmation:</strong> Signed in with <strong>${userEmail || "your Google Account"}</strong> via Google OAuth 2.0 at ${formattedTime}. Calm Capital maintains zero passwords and will never share or sell your private journal or PAN records.
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- REGULATORY DISCLAIMERS & MINIMALIST FOOTER -->
          <tr>
            <td style="padding: 28px 40px 36px 40px; background-color: #040812; border-top: 1px solid rgba(255, 255, 255, 0.05);" class="mobile-p-6">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                
                <!-- Quick Navigation Links -->
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <a href="https://calmcapital.space" target="_blank" style="color: #94A3B8; font-size: 12px; font-weight: 600; margin: 0 12px;">calmcapital.space</a>
                    <span style="color: #334155;">&bull;</span>
                    <a href="mailto:yash@calmcapital.space" style="color: #1C9BDA; font-size: 12px; font-weight: 600; margin: 0 12px;">yash@calmcapital.space</a>
                    <span style="color: #334155;">&bull;</span>
                    <a href="https://www.instagram.com/calmcapital.space?utm_source=qr" target="_blank" style="color: #E1306C; font-size: 12px; font-weight: 600; margin: 0 12px;">Instagram</a>
                  </td>
                </tr>

                <!-- SEBI & RBI FEMA Regulatory Disclosures (Clean, legible spacing) -->
                <tr>
                  <td style="font-size: 11px; line-height: 17px; color: #475569; text-align: left; padding-bottom: 12px;">
                    <strong style="color: #64748B;">SEBI Regulatory Status:</strong> Calm Capital is an independent informational and research platform. We are not registered with the Securities and Exchange Board of India (SEBI) as investment advisers or research analysts. Information provided on the platform, including Grey Market Premiums (GMP) and subscription figures, is for educational and analytical purposes only and should not be construed as financial advice.
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 11px; line-height: 17px; color: #475569; text-align: left; padding-bottom: 20px;">
                    <strong style="color: #64748B;">Forex &amp; RBI FEMA Compliance:</strong> Currency metrics, economic calendars, and discipline journals are strictly for simulation and mathematical modeling. Under RBI circulars and FEMA regulations, Indian residents are prohibited from trading foreign currencies on unapproved electronic platforms and may only trade permitted currency pairs on recognized Indian exchanges (NSE/BSE).
                  </td>
                </tr>

                <!-- Copyright -->
                <tr>
                  <td align="center" style="font-size: 11px; color: #64748B; padding-top: 14px; border-top: 1px solid rgba(255, 255, 255, 0.04);">
                    &copy; ${new Date().getFullYear()} Calm Capital. Designed by Discipline. All rights reserved.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- /Main Email Container -->

      </td>
    </tr>
  </table>

</body>
</html>`;

  const text = `Welcome to Calm Capital, ${displayName}!

Your institutional trading workspace and dual-market intelligence desk are ready.

ACCOUNT SNAPSHOT:
- Workspace Tier: Institutional
- Vault Security: 256-Bit SSL Isolated
- Cloud Sync: Multi-Device Real-Time

ACTIVE INTELLIGENCE MODULES:
1. Indian IPO Forensics & Real-Time GMP: Track live grey market sentiment, QIB 50X alerts, and registrar allotment timelines.
2. Strictly Private Family PAN Vault: Save family PANs once with multi-device cloud synchronization and 1-click batch allotment checking.
3. Global Forex & Monetary Benchmarks: Official monetary policy rates (RBI, Fed, ECB, BoE) with zero-latency pip and position sizing calculators.
4. Private Discipline Trading Journal: Audit execution setups, session expectancy, and risk-to-reward ratios across prop firm balances ($5,000 to $200,000).

Launch your trading desk: https://calmcapital.space

Security Confirmation: Signed in via Google OAuth 2.0 at ${formattedTime}.
Support & Inquiries: yash@calmcapital.space
Official Instagram: https://instagram.com/calmcapital.space

Disclaimer: Calm Capital is an independent educational platform. Not SEBI registered financial advisory.
© ${new Date().getFullYear()} Calm Capital. Designed by Discipline.`;

  return { subject, html, text };
}