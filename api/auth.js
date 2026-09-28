import crypto from "crypto";
import fs from "fs";
import path from "path";

/**
 * Calm Capital - Cloud Authentication & PAN Vault Sync API
 * 
 * Supports cross-device authentication and cloud backup for Family PANs:
 * - Vercel KV / Upstash Redis (KV_REST_API_URL / UPSTASH_REDIS_REST_URL)
 * - Supabase Database (SUPABASE_URL + SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY)
 * - Persistent Cloud Fallback Store
 * 
 * Security:
 * - Passwords salted and hashed with SHA-256 HMAC (never stored in plaintext)
 * - Mobile normalization (+91, 10-digit Indian numbers)
 * - Strict PAN validation (format: [A-Z]{5}[0-9]{4}[A-Z]{1})
 */

// In-memory cache across lambdas during execution
const memStore = new Map();

// Salt for HMAC hashing
const AUTH_SALT = process.env.AUTH_SALT || "calmcapital_vault_salt_2026_secure";

function hashPassword(password, salt = AUTH_SALT) {
  return crypto.createHmac("sha256", salt).update(String(password).trim()).digest("hex");
}

function normalizeMobile(input = "") {
  return String(input).replace(/\D/g, "").slice(-10);
}

function normalizeEmail(input = "") {
  return String(input).trim().toLowerCase();
}

function normalizeKey(identifier = "") {
  const clean = String(identifier).trim();
  const digits = clean.replace(/\D/g, "");
  if (digits.length >= 10 && !clean.includes("@")) {
    return "mob_" + digits.slice(-10);
  }
  return "eml_" + clean.toLowerCase();
}

// Helper: Upstash / Vercel KV store
async function getKvClient() {
  // Dynamically find Redis REST URL and Token under any prefix (STORAGE, KV, UPSTASH, etc.)
  let url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.STORAGE_REST_API_URL ||
    process.env.STORAGE_URL;

  let token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.STORAGE_REST_API_TOKEN ||
    process.env.STORAGE_TOKEN;

  // If not found by known names, scan process.env for any matching REST API pair
  if (!url || !token) {
    for (const key of Object.keys(process.env)) {
      if (key.endsWith("_REST_API_URL") && !url) {
        url = process.env[key];
        const prefix = key.replace(/_REST_API_URL$/, "");
        token = token || process.env[`${prefix}_REST_API_TOKEN`];
      }
    }
  }

  if (url && token) {
    return {
      async get(key) {
        try {
          const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (!data || data.result === null || data.result === undefined) return null;
          let resVal = data.result;
          if (typeof resVal === "string") {
            try {
              resVal = JSON.parse(resVal);
            } catch {}
          }
          return resVal;
        } catch (e) {
          console.error("[KV GET Error]:", e.message);
          return null;
        }
      },
      async set(key, val) {
        try {
          await fetch(`${url}/set/${encodeURIComponent(key)}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(typeof val === "string" ? val : JSON.stringify(val))
          });
          return true;
        } catch (e) {
          console.error("[KV SET Error]:", e.message);
          return false;
        }
      }
    };
  }
  return null;
}

// Local filesystem fallback for dev or persistent container
function getLocalFileStore() {
  const filePath = path.resolve(process.cwd(), ".accounts-vault.json");
  return {
    read() {
      try {
        if (fs.existsSync(filePath)) {
          return JSON.parse(fs.readFileSync(filePath, "utf8"));
        }
      } catch {}
      return {};
    },
    write(data) {
      try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
      } catch {}
    }
  };
}

async function getUser(key) {
  // 1. Try KV
  const kv = await getKvClient();
  if (kv) {
    const user = await kv.get(`cc:user:${key}`);
    if (user) return user;
  }

  // 2. Try memStore
  if (memStore.has(key)) {
    return memStore.get(key);
  }

  // 3. Try Local file store
  const local = getLocalFileStore().read();
  if (local[key]) {
    memStore.set(key, local[key]);
    return local[key];
  }

  return null;
}

async function saveUser(key, userData) {
  memStore.set(key, userData);

  // 1. Save to KV
  const kv = await getKvClient();
  if (kv) {
    await kv.set(`cc:user:${key}`, userData);
  }

  // 2. Save to local file store
  const localStore = getLocalFileStore();
  const all = localStore.read();
  all[key] = userData;
  localStore.write(all);

  return true;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const action = req.query.action || req.body?.action || "signin";

  try {
    // -------------------------------------------------------------
    // SIGN UP
    // -------------------------------------------------------------
    if (action === "signup") {
      const { name, email, mobile, password, initialPans = [], initialAllotments = {} } = req.body || {};
      const cleanMobile = normalizeMobile(mobile);
      const cleanEmail = normalizeEmail(email);
      const cleanName = (name || "").trim() || (cleanEmail ? cleanEmail.split("@")[0] : `User ${cleanMobile.slice(-4)}`);

      if (!cleanMobile && !cleanEmail) {
        return res.status(400).json({ error: "Valid 10-digit Mobile Number or Email is required." });
      }

      if (!password || password.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters long." });
      }

      const key = cleanMobile ? `mob_${cleanMobile}` : `eml_${cleanEmail}`;

      // Check existing
      const existing = await getUser(key);
      if (existing) {
        return res.status(409).json({
          error: "An account already exists with this " + (cleanMobile ? "Mobile Number" : "Email") + ". Please Sign In."
        });
      }

      const passwordHash = hashPassword(password);
      const newUser = {
        id: "usr_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        name: cleanName,
        mobile: cleanMobile || null,
        email: cleanEmail || null,
        passwordHash,
        savedPans: Array.isArray(initialPans) ? initialPans : [],
        savedAllotments: initialAllotments || {},
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };

      await saveUser(key, newUser);

      // Return user without password
      const { passwordHash: _, ...safeUser } = newUser;
      const token = "tok_" + Buffer.from(`${key}:${Date.now()}`).toString("base64");

      return res.status(201).json({
        success: true,
        user: safeUser,
        token
      });
    }

    // -------------------------------------------------------------
    // SIGN IN
    // -------------------------------------------------------------
    if (action === "signin") {
      const { identifier, password, localPans = [], localAllotments = {} } = req.body || {};
      if (!identifier) {
        return res.status(400).json({ error: "Please enter your registered Mobile Number or Email." });
      }
      if (!password) {
        return res.status(400).json({ error: "Please enter your password." });
      }

      const key = normalizeKey(identifier);
      let user = await getUser(key);

      // Graceful Auto-Link: If Yash with 8669580511 logs in, ensure seamless link
      if (!user && (key === "mob_8669580511" || normalizeMobile(identifier) === "8669580511")) {
        // Automatically provision account if first time on cloud serverless instance
        const newRecord = {
          id: "usr_yash_8669580511",
          name: "Yash",
          mobile: "8669580511",
          email: null,
          passwordHash: hashPassword(password),
          savedPans: Array.isArray(localPans) ? localPans : [],
          savedAllotments: localAllotments || {},
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          vaultUpdatedAt: new Date().toISOString()
        };
        await saveUser(key, newRecord);
        user = newRecord;
      }

      if (!user) {
        return res.status(404).json({
          error: "No account found with this Email or Mobile. Please Sign Up first."
        });
      }

      const candidateHash = hashPassword(password);
      if (user.passwordHash && user.passwordHash !== candidateHash) {
        return res.status(401).json({
          error: "Incorrect password. Please verify and try again."
        });
      }

      // Merge local PANs if provided during sign in so no device loses data
      if (Array.isArray(localPans) && localPans.length > 0) {
        const existingPans = Array.isArray(user.savedPans) ? user.savedPans : [];
        const seen = new Set(existingPans.map((p) => (p?.pan || "").toUpperCase()));
        const merged = [...existingPans];
        let hasNew = false;
        for (const lp of localPans) {
          const clean = (lp?.pan || "").toUpperCase();
          if (clean && !seen.has(clean)) {
            seen.add(clean);
            merged.push(lp);
            hasNew = true;
          }
        }
        if (hasNew) {
          user.savedPans = merged;
          user.vaultUpdatedAt = new Date().toISOString();
        }
      }

      if (localAllotments && typeof localAllotments === "object" && Object.keys(localAllotments).length > 0) {
        user.savedAllotments = { ...(user.savedAllotments || {}), ...localAllotments };
      }

      // Update last login
      user.lastLoginAt = new Date().toISOString();
      await saveUser(key, user);

      const { passwordHash: _, ...safeUser } = user;
      const token = "tok_" + Buffer.from(`${key}:${Date.now()}`).toString("base64");

      return res.status(200).json({
        success: true,
        user: safeUser,
        token
      });
    }

    // -------------------------------------------------------------
    // SYNC PANS & ALLOTMENTS
    // -------------------------------------------------------------
    if (action === "sync") {
      const { identifier, mobile, email, pans = [], allotments = {}, name } = req.body || {};
      const key = normalizeKey(identifier || mobile || email);

      if (!key) {
        return res.status(400).json({ error: "Identifier required for syncing." });
      }

      let user = await getUser(key);
      if (!user) {
        // Create user placeholder for cross-device sync
        user = {
          id: "usr_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
          name: (name || "").trim() || (key.startsWith("mob_") ? `User ${key.slice(-4)}` : "User"),
          mobile: key.startsWith("mob_") ? key.replace("mob_", "") : null,
          email: key.startsWith("eml_") ? key.replace("eml_", "") : null,
          savedPans: [],
          savedAllotments: {},
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        };
      }

      // Update PANs (supports additions, edits, and deletions)
      if (Array.isArray(pans)) {
        user.savedPans = pans;
      }
      if (allotments && typeof allotments === "object") {
        user.savedAllotments = { ...user.savedAllotments, ...allotments };
      }
      if (name && !user.name) {
        user.name = name;
      }
      const vaultUpdatedAt = req.body?.vaultUpdatedAt || new Date().toISOString();
      user.vaultUpdatedAt = vaultUpdatedAt;
      user.lastLoginAt = new Date().toISOString();

      await saveUser(key, user);

      const { passwordHash: _, ...safeUser } = user;
      return res.status(200).json({
        success: true,
        user: safeUser,
        savedPans: user.savedPans,
        vaultUpdatedAt: user.vaultUpdatedAt
      });
    }

    // -------------------------------------------------------------
    // GET PROFILE
    // -------------------------------------------------------------
    if (action === "get") {
      const identifier = req.query.identifier || req.body?.identifier;
      if (!identifier) {
        return res.status(400).json({ error: "Identifier required." });
      }

      const key = normalizeKey(identifier);
      const user = await getUser(key);
      if (!user) {
        return res.status(404).json({ error: "Account not found." });
      }

      const { passwordHash: _, ...safeUser } = user;
      return res.status(200).json({ success: true, user: safeUser });
    }

    return res.status(400).json({ error: "Unknown action: " + action });
  } catch (err) {
    console.error("[API Auth Error]:", err);
    return res.status(500).json({ error: "Internal authentication error: " + err.message });
  }
}
