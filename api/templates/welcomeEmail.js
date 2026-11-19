/**
 * Calm Capital - Premium Institutional Welcome Email Template
 * 
 * Bulletproof email HTML engineered for 100% fidelity across:
 * - Gmail (Web, iOS, Android)
 * - Apple Mail (macOS, iOS)
 * - Outlook (Desktop, Web, Mobile)
 * - Yahoo Mail & Superhuman
 * 
 * Design Theme: Obsidian Executive Luxury (#06101E base, #10B981 emerald, #1C9BDA cyan)
 */

export function generateWelcomeEmail({ name = "Trader", email = "", loginTime = "" }) {
  const formattedTime = loginTime || new Date().toUTCString();
  const displayName = name && name !== "Trader" ? name.trim() : "Valued Member";
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
    body { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #030812; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    a { color: #1c9bda; text-decoration: none; }

    /* Mobile Responsive */
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .mobile-p-4 { padding: 20px 16px !important; }
      .mobile-h1 { font-size: 26px !important; line-height: 32px !important; }
      .mobile-stack { display: block !important; width: 100% !important; margin-bottom: 12px !important; }
      .mobile-btn { width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #030812; color: #CBD5E1;">
  
  <!-- Outer Wrapper Table -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #030812; min-height: 100%;">
    <tr>
      <td align="center" style="padding: 30px 12px 50px 12px;">
        
        <!-- Main Email Container (Max Width 600px) -->
        <table role="presentation" class="email-container" width="600" cellspacing="0" cellpadding="0" border="0" style="width: 600px; max-width: 600px; background-color: #06101E; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; overflow: hidden; box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7);">
          
          <!-- TOP ACCENT BAR (Dual-Market Teal to Cyan Gradient) -->
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #10B981 0%, #14B8A6 35%, #1C9BDA 70%, #0284C7 100%); line-height: 4px; font-size: 4px;">&nbsp;</td>
          </tr>

          <!-- HEADER: Brand Logo & Institutional Verification Badge -->
          <tr>
            <td style="padding: 36px 36px 20px 36px;" class="mobile-p-4">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" valign="middle">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td valign="middle" style="padding-right: 12px;">
                          <img src="https://calmcapital.space/logo.png" alt="Calm Capital" width="38" height="38" style="display: block; border-radius: 10px; width: 38px; height: 38px; background-color: #0E1E36;" />
                        </td>
                        <td valign="middle">
                          <span style="font-size: 19px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px; display: block; line-height: 22px;">Calm Capital</span>
                          <span style="font-size: 10px; font-weight: 700; color: #10B981; text-transform: uppercase; letter-spacing: 1.5px; display: block; line-height: 14px; margin-top: 2px;">Designed by Discipline</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; background-color: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 20px; padding: 4px 12px; font-size: 11px; font-weight: 700; color: #34D399; letter-spacing: 0.5px; text-transform: uppercase;">
                      &#x25CF; Authenticated
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- HERO BANNER -->
          <tr>
            <td style="padding: 10px 36px 28px 36px;" class="mobile-p-4">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(145deg, #0B192C 0%, #0E223D 100%); border: 1px solid rgba(28, 155, 218, 0.2); border-radius: 18px; padding: 28px 24px;">
                <tr>
                  <td>
                    <div style="display: inline-block; background-color: rgba(28, 155, 218, 0.15); border-radius: 6px; padding: 3px 10px; font-size: 11px; font-weight: 700; color: #38BDF8; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px;">
                      Institutional Gateway Access
                    </div>
                    <h1 class="mobile-h1" style="font-size: 28px; line-height: 36px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; margin-bottom: 12px;">
                      Welcome to the Desk,<br />
                      <span style="color: #38BDF8;">${displayName}.</span>
                    </h1>
                    <p style="font-size: 14px; line-height: 22px; color: #94A3B8; margin: 0;">
                      Your Google Single Sign-On was confirmed. Your private trading workspace, cloud-synced Family PAN Vault, and dual-market intelligence desks are now fully unlocked.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- SECTION: What's Active on Your Account -->
          <tr>
            <td style="padding: 0 36px 20px 36px;" class="mobile-p-4">
              <p style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #64748B; margin-bottom: 16px;">
                Active Institutional Modules
              </p>

              <!-- Feature 1: Family PAN Vault -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #081528; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 14px; margin-bottom: 12px;">
                <tr>
                  <td style="padding: 16px 18px;" valign="top">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td width="36" valign="top" style="padding-right: 14px;">
                          <div style="width: 36px; height: 36px; border-radius: 10px; background-color: rgba(16, 185, 129, 0.15); text-align: center; line-height: 36px; font-size: 18px;">
                            &#x1F4BC;
                          </div>
                        </td>
                        <td valign="top">
                          <span style="font-size: 14px; font-weight: 700; color: #F1F5F9; display: block; margin-bottom: 3px;">
                            Cross-Device Family PAN Vault
                          </span>
                          <span style="font-size: 12.5px; line-height: 18px; color: #94A3B8; display: block;">
                            Save family PAN profiles once on your laptop or phone—they automatically synchronize across all your devices in real-time. Execute instant 1-click batch allotment audits across official registrar portals (Link Intime, KFintech, Bigshare).
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Feature 2: Private Discipline Trading Journal -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #081528; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 14px; margin-bottom: 12px;">
                <tr>
                  <td style="padding: 16px 18px;" valign="top">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td width="36" valign="top" style="padding-right: 14px;">
                          <div style="width: 36px; height: 36px; border-radius: 10px; background-color: rgba(28, 155, 218, 0.15); text-align: center; line-height: 36px; font-size: 18px;">
                            &#x1F4D3;
                          </div>
                        </td>
                        <td valign="top">
                          <span style="font-size: 14px; font-weight: 700; color: #F1F5F9; display: block; margin-bottom: 3px;">
                            Private Discipline Trading Journal
                          </span>
                          <span style="font-size: 12.5px; line-height: 18px; color: #94A3B8; display: block;">
                            Audit G10 currency and gold setups with mathematical precision. Track session expectancy, automatic risk-to-reward ratios, and emotional composure across prop firm accounts ($5,000 to $200,000) with zero hindsight bias.
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Feature 3: Primary Markets & Live GMP Trends -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #081528; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 14px; margin-bottom: 12px;">
                <tr>
                  <td style="padding: 16px 18px;" valign="top">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td width="36" valign="top" style="padding-right: 14px;">
                          <div style="width: 36px; height: 36px; border-radius: 10px; background-color: rgba(245, 158, 11, 0.15); text-align: center; line-height: 36px; font-size: 18px;">
                            &#x1F4C8;
                          </div>
                        </td>
                        <td valign="top">
                          <span style="font-size: 14px; font-weight: 700; color: #F1F5F9; display: block; margin-bottom: 3px;">
                            Indian IPO Forensics &amp; Real-Time GMP
                          </span>
                          <span style="font-size: 12.5px; line-height: 18px; color: #94A3B8; display: block;">
                            Track live grey market sentiment, institutional QIB 50X alerts, financial balance sheet scoring (CalmCapital Score™), and peer valuation metrics for Mainboard &amp; SME public offerings.
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Feature 4: Central Bank & Quantitative Macro Desk -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #081528; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 14px;">
                <tr>
                  <td style="padding: 16px 18px;" valign="top">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td width="36" valign="top" style="padding-right: 14px;">
                          <div style="width: 36px; height: 36px; border-radius: 10px; background-color: rgba(168, 85, 247, 0.15); text-align: center; line-height: 36px; font-size: 18px;">
                            &#x1F310;
                          </div>
                        </td>
                        <td valign="top">
                          <span style="font-size: 14px; font-weight: 700; color: #F1F5F9; display: block; margin-bottom: 3px;">
                            Central Bank Benchmarks &amp; Lot Sizing Engine
                          </span>
                          <span style="font-size: 12.5px; line-height: 18px; color: #94A3B8; display: block;">
                            Official monetary policy tracking (RBI Repo Rate, US Fed Funds, ECB, BoE) with zero-latency pip valuation, position sizing calculators, and high-impact economic calendar feeds.
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- PRIMARY CALL TO ACTION BUTTON -->
          <tr>
            <td align="center" style="padding: 16px 36px 36px 36px;" class="mobile-p-4">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="mobile-btn" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 14px; background: linear-gradient(135deg, #10B981 0%, #1C9BDA 100%); box-shadow: 0 10px 25px -5px rgba(28, 155, 218, 0.4);">
                    <a href="https://calmcapital.space" target="_blank" style="display: inline-block; padding: 15px 36px; font-size: 14.5px; font-weight: 800; color: #FFFFFF; text-decoration: none; border-radius: 14px; letter-spacing: 0.3px;">
                      Launch Your Trading Desk &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <span style="display: block; font-size: 11px; color: #64748B; margin-top: 12px; text-align: center;">
                Direct access: <a href="https://calmcapital.space" target="_blank" style="color: #38BDF8; text-decoration: underline;">https://calmcapital.space</a>
              </span>
            </td>
          </tr>

          <!-- SECURITY & ACCOUNT REASSURANCE BOX -->
          <tr>
            <td style="padding: 0 36px 28px 36px;" class="mobile-p-4">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #040A14; border: 1px dashed rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 14px 16px;">
                <tr>
                  <td>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td width="20" valign="top" style="padding-right: 10px;">
                          <span style="font-size: 14px;">&#x1F512;</span>
                        </td>
                        <td valign="middle">
                          <span style="font-size: 11.5px; line-height: 17px; color: #94A3B8; display: block;">
                            <strong style="color: #E2E8F0;">Security Confirmation:</strong> Signed in with <strong>${userEmail || "your Google Account"}</strong> via Google OAuth 2.0 at ${formattedTime}. Calm Capital maintains zero passwords and will never share or sell your private journal or PAN records.
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- REGULATORY DISCLAIMER & COMPLIANCE FOOTER -->
          <tr>
            <td style="padding: 24px 36px 36px 36px; background-color: #040913; border-top: 1px solid rgba(255, 255, 255, 0.05);" class="mobile-p-4">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                
                <!-- Social & Direct Contact Links -->
                <tr>
                  <td align="center" style="padding-bottom: 18px;">
                    <a href="https://calmcapital.space" target="_blank" style="color: #94A3B8; font-size: 12px; font-weight: 600; margin: 0 10px;">Website</a>
                    <span style="color: #475569;">&bull;</span>
                    <a href="mailto:yash@calmcapital.space" style="color: #1C9BDA; font-size: 12px; font-weight: 600; margin: 0 10px;">yash@calmcapital.space</a>
                    <span style="color: #475569;">&bull;</span>
                    <a href="https://www.instagram.com/calmcapital.space?utm_source=qr" target="_blank" style="color: #E1306C; font-size: 12px; font-weight: 600; margin: 0 10px;">Instagram</a>
                  </td>
                </tr>

                <!-- SEBI & RBI FEMA Legal Disclosures -->
                <tr>
                  <td style="font-size: 10.5px; line-height: 16px; color: #475569; text-align: justify; padding-bottom: 14px;">
                    <strong>SEBI &amp; Regulatory Disclosures:</strong> Calm Capital is an independent informational and research software platform. We are not registered with the Securities and Exchange Board of India (SEBI) as investment advisers or research analysts. Information provided on the platform, including Grey Market Premiums (GMP), subscription figures, and financial ratios, is for educational and analytical purposes only and should not be construed as financial advice or an offer to trade securities.
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 10.5px; line-height: 16px; color: #475569; text-align: justify; padding-bottom: 18px;">
                    <strong>Forex &amp; RBI FEMA Notice:</strong> Foreign exchange metrics, economic calendars, and discipline journals are strictly for mathematical modeling and simulation. Under RBI and FEMA regulations, Indian residents are prohibited from trading foreign currencies on unapproved electronic platforms and may only trade permitted currency pairs on recognized Indian exchanges (NSE/BSE).
                  </td>
                </tr>

                <!-- Copyright -->
                <tr>
                  <td align="center" style="font-size: 11px; color: #64748B; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.04);">
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

ACTIVE MODULES ON YOUR ACCOUNT:
- Cross-Device Family PAN Vault: Instant registrar allotment checking with multi-device cloud synchronization.
- Private Discipline Trading Journal: Track G10 setups, automatic R:R ratios, session expectancy, and prop firm accounts ($5,000 to $200,000).
- Indian IPO Forensics & Live GMP: Real-time grey market sentiment, QIB 50X alerts, and CalmCapital Score™ forensics.
- Central Bank Benchmarks & Lot Sizing: Official monetary policy rates (RBI, Fed, ECB, BoE) with zero-latency quantitative calculators.

Launch your trading desk: https://calmcapital.space

Security Confirmation: Signed in via Google OAuth 2.0 at ${formattedTime}.
Contact: yash@calmcapital.space
Instagram: https://instagram.com/calmcapital.space

Disclaimer: Calm Capital is an independent educational platform. Not SEBI registered financial advisory.
© ${new Date().getFullYear()} Calm Capital. Designed by Discipline.`;

  return { subject, html, text };
}
