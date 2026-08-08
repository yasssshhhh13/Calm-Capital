/**
 * Fix IPO Schedule section in App.jsx
 * Replaces the broken schedule body (between the header and the closing </div></div>)
 * with a clean CSS-grid implementation.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "..", "src", "App.jsx");
let code = fs.readFileSync(appPath, "utf-8");

// Find the schedule card start and end markers
const START_MARKER = `        {/* IPO Timeline Events */}`;
const END_MARKER = `      {/* ── 5. Subscription Tracker ── */}`;

const startIdx = code.indexOf(START_MARKER);
const endIdx = code.indexOf(END_MARKER);

if (startIdx === -1 || endIdx === -1) {
  console.error("❌ Could not find IPO Timeline Events markers.");
  console.log("Start found:", startIdx !== -1);
  console.log("End found:", endIdx !== -1);
  process.exit(1);
}

const REPLACEMENT = `        {/* IPO Timeline Events */}
        <div className="bg-white dark:bg-[#121D2D] border border-slate-150 dark:border-white/5 rounded-3xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: dark ? "rgba(45,64,86,0.9)" : "#D9E4EC" }}>
            <h3 className="text-xs font-bold uppercase text-slate-455 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
              <Calendar size={13} className="text-[#1c9bda]" />
              IPO Schedule &amp; Important Dates
            </h3>
            {status && (
              <span className={\`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full \${
                isOpen ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                isUpcoming ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" :
                isClosed ? "bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20" :
                "bg-[#1c9bda]/10 text-[#1c9bda] border border-[#1c9bda]/20"
              }\`}>
                {status}
              </span>
            )}
          </div>

          {/* CSS-grid schedule: [28px dot] [1fr label] [120px date] */}
          <div className="relative">
            {/* Vertical track line inside the 28px icon column */}
            <div
              className="absolute pointer-events-none bg-slate-200 dark:bg-slate-700"
              style={{ left: 13, top: 22, bottom: 22, width: 2 }}
            />
            {(() => {
              const todayYmd = \`\${today.getFullYear()}-\${String(today.getMonth() + 1).padStart(2, "0")}-\${String(today.getDate()).padStart(2, "0")}\`;
              let activeStageIdx = -1;
              milestones.forEach((m, idx) => {
                if (m.date && m.date <= todayYmd) activeStageIdx = idx;
              });
              return milestones.map((m, idx) => {
                const isCompleted = isPast(m.date) && (idx < activeStageIdx || isListed);
                const isActiveStage = idx === activeStageIdx && !isListed;
                return (
                  <div
                    key={m.label}
                    className={\`relative flex items-center gap-2 py-1 \${isActiveStage ? "rounded-xl bg-[#1c9bda]/5 dark:bg-[#1c9bda]/10 border border-[#1c9bda]/20 px-1" : ""}\`}
                    style={{ display: "grid", gridTemplateColumns: "28px minmax(0,1fr) 120px", alignItems: "center", zIndex: 1, minHeight: 46 }}
                  >
                    {/* Col 1: dot (28px) */}
                    <div className="flex items-center justify-center">
                      <span className={\`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 \${
                        isCompleted ? "bg-emerald-500 border-emerald-500" :
                        isActiveStage ? "bg-[#1c9bda] border-[#1c9bda] ring-4 ring-[#1c9bda]/20" :
                        "bg-white dark:bg-[#121D2D] border-slate-300 dark:border-slate-600"
                      }\`}>
                        {isCompleted && <CheckCircle size={9} className="text-white" />}
                        {isActiveStage && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    {/* Col 2: label + badges (flex-1) */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={\`text-[13px] font-semibold truncate \${
                        isCompleted ? "text-slate-800 dark:text-white font-bold" :
                        isActiveStage ? "text-[#1c9bda] font-extrabold" :
                        "text-slate-600 dark:text-slate-400"
                      }\`}>{m.label}</span>
                      {isActiveStage && (
                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#1c9bda] text-white">Active</span>
                      )}
                      {isCompleted && (
                        <span className="shrink-0 text-[9px] font-bold text-emerald-500 dark:text-emerald-400">✓ Done</span>
                      )}
                    </div>
                    {/* Col 3: date (120px, right-aligned, fixed) */}
                    <span className={\`text-right whitespace-nowrap font-mono text-[13px] \${
                      isActiveStage ? "text-[#1c9bda] font-extrabold" :
                      isCompleted ? "text-slate-700 dark:text-slate-300 font-bold" :
                      "text-slate-600 dark:text-slate-400 font-semibold"
                    }\`}>{formatDate(m.date)}</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      `;

const newCode = code.slice(0, startIdx) + REPLACEMENT + END_MARKER + code.slice(endIdx + END_MARKER.length);

fs.writeFileSync(appPath, newCode, "utf-8");
console.log("✅ IPO Schedule section cleanly replaced.");
console.log(`   File: ${appPath}`);
console.log(`   Old length: ${code.length}, New length: ${newCode.length}`);
