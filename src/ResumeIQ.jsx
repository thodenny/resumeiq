import { useState, useEffect, useRef, useCallback } from "react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat, BorderStyle, TabStopType } from "docx";

// ─── Storage helpers ───────────────────────────────────────────────────────────
const storage = {
  get: (key) => {
    try { return window.storage?.get(key) ?? localStorage.getItem(key); } catch { return null; }
  },
  set: (key, val) => {
    try { window.storage?.set(key, val); localStorage.setItem(key, val); } catch {}
  },
  del: (key) => {
    try { window.storage?.delete(key); localStorage.removeItem(key); } catch {}
  },
};

// ─── Resume Template ───────────────────────────────────────────────────────────
// Normalise string for fuzzy matching (em-dash → hyphen, collapse whitespace)
const _norm = (s) => (s || "").toLowerCase().replace(/[\u2013\u2014]/g, "-").replace(/\s+/g, " ").trim();

const RESUME_TEMPLATE = {
  name: "Thomas Denny",
  contact: "(813) 759-3713  ·  Austin, TX  ·  93.thomasdenny@gmail.com  ·  linkedin.com/in/thomasdenny1/",
  experience: [
    {
      company: "Meta", location: "Austin, TX",
      title: "Program Manager, Global Operations", dates: "January 2023 – Present",
      bullets: [
        "Reduced average vendor launch cycle time from 36.3 days to 10 days by implementing weekly metric audits, real-time gap communications, and a standardized work checklist, while maintaining 100% compliance across 174 launches.",
        "Drove team-wide AI tool adoption from 17% to 82% in six months by building an AI Adoption Playbook, hosting a team-wide hackathon, and delivering weekly training demos, growing daily active users from 6 to 43.",
        "Mapped 91 change management process steps across a Jobs-to-Be-Done AI exercise, identifying 7 high-impact automation opportunities and projecting 343 hours in annual FTE savings.",
        "Produced 12 AI educational guides, a canonical AI resource guide, and a NotebookLM knowledge base that established a repeatable AI knowledge-sharing cadence across the team.",
        "Managed change management execution for 186 vendor launches across the Family of Apps portfolio, coordinating 958 agents across 10 vendor sites.",
        "Scoped a full managed service provider rollout across the change management team, analyzed business impact and time savings, and recommended against implementation — preserving operational agility and simplicity; recommendation adopted by leadership.",
      ],
    },
    {
      company: "Tesla", location: "Austin, TX",
      title: "Manager, Production Control – M3", dates: "March 2022 – December 2022",
      bullets: [
        "Launched Gigafactory Texas, Tesla's 10M+ sq ft EV manufacturing facility, as Production Control lead overseeing all material receiving, storage, and point-of-use supply in support of lean manufacturing and audit compliance.",
        "Scaled the Production Control organization from 4 managers and 80 associates to 16 managers and 800+ associates in 7 months through structured labor planning and a cross-functional daily communication cadence.",
        "Reduced cumulative material-related production downtime from 3,000+ hours per week to under 1,000 hours in 6 weeks by driving process improvements across Material Planning, Logistics, Operations, Engineering, and IT.",
      ],
    },
    {
      company: "Amazon", location: "Raleigh, NC",
      title: "Senior Operations Manager – L7", dates: "March 2020 – February 2022",
      bullets: [
        "Launched RDU1, a 640k sq ft Amazon Robotics fulfillment center, as Senior Operations Manager overseeing 6 Operations Managers, 16+ Area Managers, and 1,500+ associates across outbound operations.",
        "Ranked 2nd in planning accuracy across 50+ fulfillment centers during Peak 2021 and broke RDU1's single-week volume record at 5,061,759 units processed.",
        "Delivered 105% of outbound operating plan during Peak 2021 against a regional average of 99.1%, ranking 2nd in the region for Pre-Slam BPS at 122 and achieving the 2nd-greatest throughput improvement in the Amazon Robotics network since Prime Week (+6.5%).",
        "Reduced site-wide gross adjustment defect rate from 72,000 DPMO to 44,000 DPMO as Gross Adjustments STL by implementing a daily cross-functional war room with Inbound and Outbound representatives.",
        "Achieved #1 Trans-Out Reactive Cancellation DPMO in the Atlantic Coast region and #4 across the Amazon Robotics network by establishing a daily transship risk review with a no-miss accountability standard.",
        "Developed 2 direct reports to L7 Senior Operations Manager promotions and elevated 1 high-performing L6 to acting CAP Senior Ops Manager — achieving a 30% promotion rate across the department.",
      ],
    },
    {
      company: "Amazon", location: "Miami, FL",
      title: "Process Engineer, Field – L6", dates: "June 2019 – March 2020",
      bullets: [
        "Served as Field Process Engineer for MIA1, providing process standardization and variation-reduction support to 8 Senior Managers, 24+ Operations Managers, and 60+ Area Managers.",
        "Designed and implemented a mechanical giftwrap solution for Peak 2019 that fulfilled 89,900 customer orders with zero safety incidents and a 3.2% YoY throughput improvement — solution adopted by sister sites for their peak implementation.",
        "Drove completion of 8+ site-wide Safety, Quality, and Productivity improvement projects including SmartPac 5.3 deployment, HyperCube Phase 2, and AFE automation initiatives.",
      ],
    },
    {
      company: "Amazon", location: "Miami, FL",
      title: "Operations Manager – L6", dates: "July 2018 – June 2019",
      bullets: [
        "Launched MIA1, an 880k sq ft Amazon Robotics fulfillment center, as the ICQA Operations Manager, directly managing 2 Area Managers, 22 Process Assistants, and 3 Data Analysts.",
        "Achieved an average Inventory Record Defect Rate of 5,468 DPMO across the first 12 weeks of MIA1's launch, well below the 11,000 DPMO goal, including a perfect 0 DPMO in the opening week.",
        "Drove Guided Coaching Compliance from under 60% to 100% in two months by onboarding MIA1 onto an automated notification system, reducing Outbound defect rate by 19% (45,054 DPMO \u2192 36,547 DPMO).",
      ],
    },
    {
      company: "Amazon", location: "Phoenix, AZ & Jacksonville, FL",
      title: "Various Roles – L4 to L5", dates: "February 2016 – July 2018",
      bullets: [
        "Advanced through four roles across Inbound Operations, Inventory Control & Quality Assurance, and Project Management, progressing from L4 to L5 across two fulfillment centers in two years.",
      ],
    },
  ],
  certifications: [
    { institution: "University of Texas at Austin", location: "Austin, TX", program: "Post Graduate Program, Generative AI for Business Applications", date: "Expected May 2026" },
    { institution: "University of South Florida", location: "Tampa, FL", program: "Certified Six Sigma Green Belt", date: "October 2019" },
  ],
  education: [
    { institution: "University of South Florida", location: "Tampa, FL", degree: "Bachelor of Science, Business Management", date: "May 2015" },
  ],
  skillCategories: [
    { label: "AI Tools", value: "Claude, NotebookLM, Wispr Flow, Gemini, MetaAI, Gamma, Manus, Large Language Models" },
    { label: "Operations", value: "Six Sigma Green Belt, S&OP planning, vendor management, workforce planning, data annotation workflows" },
    { label: "Productivity", value: "Advanced Excel, Google Workspace, Obsidian" },
  ],
};

// ─── Toast ─────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return { toasts, add };
}

function ToastContainer({ toasts }) {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
            t.type === "error" ? "bg-red-600" : t.type === "warning" ? "bg-amber-500" : "bg-green-600"
          }`}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── Clipboard ─────────────────────────────────────────────────────────────────
function CopyButton({ text, toast }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      className="text-xs px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

// ─── Score Bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ label, value }) {
  const color = value >= 70 ? "bg-green-500" : value >= 45 ? "bg-amber-400" : "bg-red-500";
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm font-bold text-slate-900">{value}/100</span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ─── Loading Spinner ────────────────────────────────────────────────────────────
function Spinner({ message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      <p className="text-slate-600 text-sm animate-pulse">{message}</p>
    </div>
  );
}

// ─── Tab 1: Setup ──────────────────────────────────────────────────────────────
const AC_COMPANIES = ["Meta", "Tesla", "Amazon", "Other"];

function SetupTab({ resume, setResume, accomplishments, setAccomplishments, toast }) {
  const [resumeDraft, setResumeDraft] = useState(resume);
  const [newAc, setNewAc] = useState({ company: "Meta", text: "" });
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteDraft, setPasteDraft] = useState("");
  const resumeFileRef = useRef();

  const readFile = (file, setter) => {
    const reader = new FileReader();
    reader.onload = (e) => setter(e.target.result);
    reader.readAsText(file);
  };

  const saveResume = () => {
    storage.set("resume_base", resumeDraft);
    setResume(resumeDraft);
    toast("Base resume saved!");
  };

  const saveAc = (updated) => {
    setAccomplishments(updated);
    storage.set("accomplishments", JSON.stringify(updated));
  };

  const addAc = () => {
    if (!newAc.text.trim()) { toast("Accomplishment text is required.", "warning"); return; }
    const item = { id: crypto.randomUUID(), company: newAc.company, text: newAc.text.trim() };
    saveAc([...accomplishments, item]);
    setNewAc((p) => ({ ...p, text: "" }));
    toast("Added!");
  };

  const removeAc = (id) => saveAc(accomplishments.filter((a) => a.id !== id));

  const commitPaste = () => {
    const lines = pasteDraft.split("\n").filter((l) => l.trim());
    if (!lines.length) { toast("Nothing to add.", "warning"); return; }
    const items = lines.map((line) => ({ id: crypto.randomUUID(), company: newAc.company, text: line.trim() }));
    saveAc([...accomplishments, ...items]);
    setPasteDraft("");
    setPasteMode(false);
    toast(`Added ${items.length} accomplishment${items.length !== 1 ? "s" : ""}!`);
  };

  // Group by company for display
  const grouped = AC_COMPANIES.reduce((acc, co) => {
    const items = accomplishments.filter((a) => a.company === co || (co === "Other" && !AC_COMPANIES.slice(0, -1).includes(a.company)));
    if (items.length) acc.push({ company: co, items });
    return acc;
  }, []);

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Base Resume */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-slate-900">Base Resume</h3>
            <p className="text-xs text-slate-500 mt-0.5">Paste your resume or upload a .txt / .md file</p>
          </div>
          <div className="flex items-center gap-2">
            {resume && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                <span>✓</span> Loaded
              </span>
            )}
            <button onClick={() => resumeFileRef.current.click()}
              className="text-xs px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors">
              {resume ? "Replace" : "Upload"}
            </button>
            <input type="file" accept=".txt,.md,.docx" ref={resumeFileRef} className="hidden"
              onChange={(e) => { if (e.target.files[0]) readFile(e.target.files[0], setResumeDraft); }} />
          </div>
        </div>
        <textarea value={resumeDraft} onChange={(e) => setResumeDraft(e.target.value)}
          placeholder="Paste your full resume here..."
          className="w-full h-72 text-sm font-mono text-slate-700 border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-400">{resumeDraft.length.toLocaleString()} characters</span>
          <button onClick={saveResume} disabled={!resumeDraft.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Save Resume
          </button>
        </div>
      </div>

      {/* Accomplishments Bank */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-slate-900">Accomplishments Bank</h3>
            <p className="text-xs text-slate-500 mt-0.5">Tagged by role — Claude references these when tailoring</p>
          </div>
          <div className="flex items-center gap-2">
            {accomplishments.length > 0 && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                {accomplishments.length} items
              </span>
            )}
            <button onClick={() => setPasteMode((p) => !p)}
              className="text-xs px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors">
              {pasteMode ? "Cancel" : "Paste Many"}
            </button>
          </div>
        </div>

        {/* Existing items */}
        <div className="flex-1 overflow-y-auto max-h-52 mb-3 space-y-1 pr-1">
          {accomplishments.length === 0 && (
            <p className="text-xs text-slate-400 italic py-4 text-center">No accomplishments yet — add one below.</p>
          )}
          {grouped.map(({ company, items }) => (
            <div key={company}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-2 mb-1">{company}</p>
              {items.map((ac) => (
                <div key={ac.id} className="flex items-start gap-2 bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-700 group">
                  <span className="flex-1 leading-relaxed">{ac.text}</span>
                  <button onClick={() => removeAc(ac.id)}
                    className="text-slate-300 hover:text-red-400 transition-colors shrink-0 mt-0.5 opacity-0 group-hover:opacity-100">✕</button>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Paste mode */}
        {pasteMode ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <select value={newAc.company} onChange={(e) => setNewAc((p) => ({ ...p, company: e.target.value }))}
                className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {AC_COMPANIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <span className="text-xs text-slate-400">One accomplishment per line</span>
            </div>
            <textarea value={pasteDraft} onChange={(e) => setPasteDraft(e.target.value)}
              placeholder={"Reduced vendor launch cycle from 36 days to 10 days...\nScaled team from 80 to 800+ associates in 7 months..."}
              className="w-full h-28 text-xs text-slate-700 border border-slate-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 mb-2" />
            <button onClick={commitPaste} disabled={!pasteDraft.trim()}
              className="w-full py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">
              Add All Lines
            </button>
          </div>
        ) : (
          /* Single add form */
          <div className="border-t border-slate-100 pt-3">
            <div className="flex gap-2 mb-2">
              <select value={newAc.company} onChange={(e) => setNewAc((p) => ({ ...p, company: e.target.value }))}
                className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0">
                {AC_COMPANIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <input value={newAc.text} onChange={(e) => setNewAc((p) => ({ ...p, text: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addAc(); } }}
                placeholder="Reduced X from Y to Z by doing..."
                className="flex-1 text-xs border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
              <button onClick={addAc} disabled={!newAc.text.trim()}
                className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0">Add</button>
            </div>
            {accomplishments.length > 0 && (
              <button onClick={() => { if (window.confirm("Clear all accomplishments?")) saveAc([]); }}
                className="text-xs text-slate-400 hover:text-red-400 transition-colors">Clear all</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 2: Tailor ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert resume coach and career strategist. You tailor resumes to specific job descriptions with strict honesty constraints.

STRICT RULES — never violate these:
- NEVER change what actually happened. The core facts, actions, and outcomes in every bullet must remain exactly as stated. Do not reframe the nature of the work itself.
- NEVER substitute domain-specific language from the JD when it doesn't accurately describe what the person did. If they managed vendor launches, do not call it "policy enforcement." If they drove AI tool adoption, do not call it "abuse detection implementation."
- NEVER add skills, tools, or experience the person didn't claim. Skills must come from the resume or accomplishment list only — never invented to match the JD.
- NEVER change job titles. Keep every title exactly as written on the resume, verbatim.
- Only allowed changes: word choice and phrasing improvements that don't alter meaning, reordering/emphasizing existing content that's relevant to the JD, strengthening weak verbs, improving clarity and specificity using details already present.

What you SHOULD do:
1. Surface and prioritize existing accomplishments that are most relevant to the JD
2. Strengthen bullet phrasing using stronger action verbs where the meaning stays identical
3. Reorder or emphasize skills the JD cares about most — from the user's existing skill set only
4. Write a tailored summary using only what's true about the person's background
5. Give an honest fit assessment — do not oversell
6. Flag ATS risks and genuinely missing keywords (things the person truly lacks)
7. Write a tailored cover letter and elevator pitch grounded in real experience
8. Map real accomplishments to likely STAR behavioral interview questions

Always return valid JSON only. No preamble, no markdown fences, no commentary outside the JSON object.`;

const STATUS_STEPS = [
  "Analyzing job description...",
  "Matching your accomplishments...",
  "Tailoring experience bullets...",
  "Rewriting summary and skills...",
  "Scoring fit and flagging keywords...",
  "Writing cover letter and elevator pitch...",
  "Generating STAR interview stories...",
  "Finalizing output...",
];

function TailorTab({ resume, accomplishments, apiKey, setApiKey, rememberKey, setRememberKey, onResult, toast }) {
  const [jobUrl, setJobUrl] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingJob, setFetchingJob] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const [debugRaw, setDebugRaw] = useState("");
  const stepRef = useRef(0);
  const intervalRef = useRef(null);

  const fetchJob = async () => {
    if (!jobUrl.trim()) { toast("Paste a job URL first.", "warning"); return; }
    if (!apiKey.trim()) { toast("Add your API key first.", "warning"); return; }
    setFetchingJob(true);
    toast("Fetching job posting...");
    try {
      // Fetch page via CORS proxy
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(jobUrl)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error("Could not fetch the page. The site may block scrapers.");
      const data = await res.json();
      const html = data.contents ?? "";

      // Strip HTML tags to get plain text
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      // Remove script/style elements
      tmp.querySelectorAll("script, style, nav, header, footer").forEach((el) => el.remove());
      const text = (tmp.innerText || tmp.textContent || "").replace(/\s+/g, " ").trim().slice(0, 12000);

      if (!text || text.length < 100) throw new Error("Page loaded but no readable text found. Try pasting manually.");

      // Ask Claude to extract the fields
      const extractRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [{
            role: "user",
            content: `Extract the following from this job posting text and return ONLY valid JSON with these exact keys: company (string), jobTitle (string), jobDescription (string — the full job description text, requirements, responsibilities, etc.).

Job posting text:
${text}

Return only the JSON object. No preamble, no markdown.`,
          }],
        }),
      });

      if (!extractRes.ok) throw new Error("Claude API error during extraction.");
      const extractData = await extractRes.json();
      const raw = extractData.content?.[0]?.text ?? "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

      setCompany(parsed.company || "");
      setJobTitle(parsed.jobTitle || "");
      setJobDesc(parsed.jobDescription || "");

      const filled = [parsed.company, parsed.jobTitle, parsed.jobDescription].filter(Boolean).length;
      if (filled === 0) {
        toast("Page loaded but no job content found — this site likely renders via JavaScript (Taleo, Workday, Greenhouse). Paste the job description manually.", "warning");
      } else if (filled < 3) {
        toast("Partially extracted — fill in any missing fields manually.");
      } else {
        toast("Job details extracted!");
      }
    } catch (e) {
      toast(`${e.message}`, "error");
    } finally {
      setFetchingJob(false);
    }
  };

  const startStatusCycle = () => {
    stepRef.current = 0;
    setStatusMsg(STATUS_STEPS[0]);
    intervalRef.current = setInterval(() => {
      stepRef.current = Math.min(stepRef.current + 1, STATUS_STEPS.length - 1);
      setStatusMsg(STATUS_STEPS[stepRef.current]);
    }, 2200);
  };

  const stopStatusCycle = () => {
    clearInterval(intervalRef.current);
  };

  const validate = () => {
    if (!resume) return "Base resume not loaded. Go to Setup tab first.";
    if (!accomplishments.length) return "Accomplishment list not loaded. Go to Setup tab first.";
    if (!jobDesc.trim()) return "Job description is required.";
    if (!company.trim()) return "Company name is required.";
    if (!jobTitle.trim()) return "Job title is required.";
    if (!apiKey.trim()) return "Anthropic API key is required.";
    return null;
  };

  const run = async () => {
    const err = validate();
    if (err) { toast(err, "warning"); return; }

    setLoading(true);
    setShowDebug(false);
    setDebugRaw("");
    startStatusCycle();

    const userMsg = `BASE RESUME:
${resume}

MASTER ACCOMPLISHMENT LIST:
${accomplishments.map(a => a.company ? `[${a.company}] ${a.text}` : `• ${a.text}`).join("\n")}

JOB DESCRIPTION (${jobTitle} at ${company}):
${jobDesc}

Return a single JSON object with these exact keys: summary, skills, experience, matchScore, missingKeywords, atsFlags, changelog, coverLetter, elevatorPitch, starStories.

experience is an array of objects: { company, title, bullets: [{ original, revised, rationale }] }
matchScore is: { keywordScore (0-100), fitScore (0-100), verdict (string) }
changelog is: [{ section, change, reason }]
starStories is: [{ question, situation, task, action, result, accomplishmentUsed }]`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMsg }],
        }),
      });

      stopStatusCycle();

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const raw = data.content?.[0]?.text ?? "";

      let parsed;
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      } catch {
        setDebugRaw(raw);
        setShowDebug(true);
        toast("Failed to parse JSON. See debug panel below.", "error");
        setLoading(false);
        return;
      }

      const historyItem = {
        id: crypto.randomUUID(),
        company,
        jobTitle,
        jobUrl,
        jobDescription: jobDesc,
        date: new Date().toISOString(),
        matchScore: parsed.matchScore ?? { keywordScore: 0, fitScore: 0, verdict: "Unknown" },
        tailoredResume: {
          summary: parsed.summary ?? "",
          skills: Array.isArray(parsed.skills) ? parsed.skills : (parsed.skills ? String(parsed.skills).split(/,\s*/) : []),
          experience: parsed.experience ?? [],
        },
        changelog: parsed.changelog ?? [],
        missingKeywords: parsed.missingKeywords ?? [],
        atsFlags: parsed.atsFlags ?? [],
        coverLetter: parsed.coverLetter ?? "",
        elevatorPitch: parsed.elevatorPitch ?? "",
        starStories: parsed.starStories ?? [],
      };

      const existing = storage.get("history");
      const prev = existing ? JSON.parse(existing) : [];
      const updated = [historyItem, ...prev];
      storage.set("history", JSON.stringify(updated));

      onResult(historyItem);
      toast("Tailoring complete! Head to the Results tab.");
    } catch (e) {
      stopStatusCycle();
      toast(`Error: ${e.message}`, "error");
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-4">
        {/* API Key */}
        <div className="mb-5 pb-5 border-b border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Anthropic API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
          />
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-xs text-slate-400">Never sent anywhere except the Claude API.</p>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberKey}
                onChange={(e) => setRememberKey(e.target.checked)}
                className="w-3.5 h-3.5 accent-blue-600"
              />
              <span className="text-xs text-slate-500">Remember key</span>
            </label>
          </div>
        </div>

        {/* Warnings */}
        {(!resume || !accomplishments.length) && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            {!resume && <p>⚠ Base resume not loaded — go to the Setup tab first.</p>}
            {!accomplishments.length && <p>⚠ Accomplishment list not loaded — go to the Setup tab first.</p>}
          </div>
        )}

        {/* Job URL */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Job Posting URL</label>
          <div className="flex gap-2">
            <input
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://example.com/jobs/123"
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
            <button
              onClick={fetchJob}
              disabled={fetchingJob || !jobUrl.trim()}
              className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {fetchingJob ? "Fetching..." : "⟳ Auto-fill"}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">Paste the URL and click Auto-fill — or fill in the fields below manually.</p>
        </div>

        {/* Company + Title */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name *</label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Corp"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Job Title *</label>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Senior Product Manager"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>
        </div>

        {/* Job Description */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Job Description *</label>
          <textarea
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
            placeholder="Paste the full job description here..."
            className="w-full h-52 text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
          />
          <p className="text-xs text-slate-400 mt-1">{jobDesc.length.toLocaleString()} characters</p>
        </div>

        <button
          onClick={run}
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm shadow-sm"
        >
          {loading ? "Tailoring..." : "✦ Tailor My Resume"}
        </button>
      </div>

      {loading && <Spinner message={statusMsg} />}

      {showDebug && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h4 className="font-semibold text-red-800 text-sm mb-2">Debug — Raw API Response</h4>
          <pre className="text-xs text-red-700 overflow-auto max-h-64 whitespace-pre-wrap">{debugRaw}</pre>
        </div>
      )}
    </div>
  );
}

// ─── Export helpers ────────────────────────────────────────────────────────────
async function exportToDocx(result) {
  const { tailoredResume, jobTitle, company: jobCompany } = result;

  // Build revision lookup: { "company|title" → { "originalBulletNorm" → revisedText } }
  const revMap = {};
  for (const exp of (tailoredResume.experience || [])) {
    const key = _norm(`${exp.company}|${exp.title}`);
    revMap[key] = {};
    for (const b of (exp.bullets || [])) {
      if (b.original) revMap[key][_norm(b.original)] = b.revised || b.original;
    }
  }
  const getFinalBullet = (entry, originalBullet) => {
    const expKey = _norm(`${entry.company}|${entry.title}`);
    return revMap[expKey]?.[_norm(originalBullet)] || originalBullet;
  };

  const FONT = "Calibri";
  const RT = 9360; // right-edge tab stop (twips) for letter page with 0.75" margins
  const S = 22;    // body font size (half-points = 11pt)
  const SH = 24;   // section heading size (12pt)
  const SN = 36;   // name (18pt)
  const BULLET_REF = "resumeBullets";

  const numbering = {
    config: [{
      reference: BULLET_REF,
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "\u2022",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 360, hanging: 360 } } },
      }],
    }],
  };

  const hr = () => new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 1 } },
    spacing: { before: 40, after: 80 },
    children: [],
  });

  const children = [];

  // ── Name ──────────────────────────────────────────────────────────────────
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [new TextRun({ text: RESUME_TEMPLATE.name, bold: true, size: SN, font: FONT })],
  }));

  // ── Contact ───────────────────────────────────────────────────────────────
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new TextRun({ text: RESUME_TEMPLATE.contact, size: 18, font: FONT })],
  }));
  children.push(hr());

  // ── Summary ───────────────────────────────────────────────────────────────
  children.push(new Paragraph({
    spacing: { before: 120, after: 80 },
    children: [new TextRun({ text: "Summary:", bold: true, size: SH, font: FONT })],
  }));
  const summaryText = tailoredResume.summary || "";
  if (summaryText) {
    children.push(new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: summaryText, size: S, font: FONT })],
    }));
  }
  children.push(hr());

  // ── Employment Experience ─────────────────────────────────────────────────
  children.push(new Paragraph({
    spacing: { before: 120, after: 60 },
    children: [new TextRun({ text: "Employment Experience:", bold: true, size: SH, font: FONT })],
  }));

  let prevCompany = null;
  for (const entry of RESUME_TEMPLATE.experience) {
    const isNewCompany = entry.company !== prevCompany;
    prevCompany = entry.company;

    if (isNewCompany) {
      children.push(new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: RT }],
        spacing: { before: 120, after: 20 },
        children: [
          new TextRun({ text: entry.company, bold: true, size: S, font: FONT }),
          new TextRun({ text: "\t" }),
          new TextRun({ text: entry.location, bold: true, size: S, font: FONT }),
        ],
      }));
    }

    children.push(new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: RT }],
      spacing: { after: 60 },
      children: [
        new TextRun({ text: entry.title, italics: true, size: S, font: FONT }),
        new TextRun({ text: "\t" }),
        new TextRun({ text: entry.dates, italics: true, size: S, font: FONT }),
      ],
    }));

    for (const bullet of entry.bullets) {
      const finalBullet = getFinalBullet(entry, bullet);
      children.push(new Paragraph({
        numbering: { reference: BULLET_REF, level: 0 },
        spacing: { after: 50 },
        children: [new TextRun({ text: finalBullet, size: 20, font: FONT })],
      }));
    }
  }

  children.push(hr());

  // ── Certifications ────────────────────────────────────────────────────────
  children.push(new Paragraph({
    spacing: { before: 120, after: 0 },
    children: [new TextRun({ text: "Certifications:", bold: true, size: SH, font: FONT })],
  }));
  children.push(hr());

  for (const cert of RESUME_TEMPLATE.certifications) {
    children.push(new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: RT }],
      spacing: { before: 80, after: 20 },
      children: [
        new TextRun({ text: cert.institution, bold: true, size: S, font: FONT }),
        new TextRun({ text: "\t" }),
        new TextRun({ text: cert.location, bold: true, size: S, font: FONT }),
      ],
    }));
    children.push(new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: RT }],
      spacing: { after: 60 },
      children: [
        new TextRun({ text: cert.program, size: S, font: FONT }),
        new TextRun({ text: "\t" }),
        new TextRun({ text: cert.date, italics: true, size: S, font: FONT }),
      ],
    }));
  }

  children.push(hr());

  // ── Education ─────────────────────────────────────────────────────────────
  children.push(new Paragraph({
    spacing: { before: 120, after: 0 },
    children: [new TextRun({ text: "Education:", bold: true, size: SH, font: FONT })],
  }));
  children.push(hr());

  for (const edu of RESUME_TEMPLATE.education) {
    children.push(new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: RT }],
      spacing: { before: 80, after: 20 },
      children: [
        new TextRun({ text: edu.institution, bold: true, size: S, font: FONT }),
        new TextRun({ text: "\t" }),
        new TextRun({ text: edu.location, bold: true, size: S, font: FONT }),
      ],
    }));
    children.push(new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: RT }],
      spacing: { after: 60 },
      children: [
        new TextRun({ text: edu.degree, italics: true, size: S, font: FONT }),
        new TextRun({ text: "\t" }),
        new TextRun({ text: edu.date, italics: true, size: S, font: FONT }),
      ],
    }));
  }

  children.push(hr());

  // ── Skills & Tools ────────────────────────────────────────────────────────
  children.push(new Paragraph({
    spacing: { before: 120, after: 0 },
    children: [new TextRun({ text: "Skills & Tools:", bold: true, size: SH, font: FONT })],
  }));
  children.push(hr());

  for (const { label, value } of RESUME_TEMPLATE.skillCategories) {
    children.push(new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: `${label}:  `, bold: true, size: S, font: FONT }),
        new TextRun({ text: value, size: S, font: FONT }),
      ],
    }));
  }

  // ── Build & Download ──────────────────────────────────────────────────────
  const doc = new Document({
    numbering,
    styles: { default: { document: { run: { font: FONT, size: S } } } },
    sections: [{
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 720, right: 1080, bottom: 720, left: 1080 } },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${jobCompany}-${jobTitle}-Resume.docx`.replace(/[^a-zA-Z0-9-_.]/g, "_");
  a.click();
  URL.revokeObjectURL(url);
}

function exportToPDF(result) {
  const { tailoredResume, jobTitle, company } = result;
  const skills = Array.isArray(tailoredResume.skills)
    ? tailoredResume.skills
    : (tailoredResume.skills || "").split(/,\s*/);

  const expHTML = (tailoredResume.experience || []).map(exp => `
    <div class="exp-block">
      <div class="exp-header"><strong>${exp.title}</strong> &nbsp;·&nbsp; <span class="co">${exp.company}</span></div>
      <ul>${(exp.bullets || []).map(b => `<li>${b.revised || b.original}</li>`).join("")}</ul>
    </div>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>${jobTitle} — ${company}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11pt; max-width: 750px; margin: 40px auto; color: #111; }
    h1 { font-size: 18pt; margin-bottom: 2px; }
    .subtitle { color: #555; font-size: 10pt; margin-bottom: 20px; }
    h2 { font-size: 12pt; color: #1D4ED8; border-bottom: 1px solid #ddd; padding-bottom: 3px; margin-top: 20px; }
    .skills { font-size: 10pt; color: #333; }
    .exp-block { margin-bottom: 14px; }
    .exp-header { font-size: 11pt; margin-bottom: 4px; }
    .co { color: #555; }
    ul { margin: 4px 0 0 0; padding-left: 18px; }
    li { margin-bottom: 3px; line-height: 1.4; }
    @media print { body { margin: 20px; } }
  </style></head><body>
  <h1>Tailored Resume</h1>
  <div class="subtitle">${jobTitle} at ${company}</div>
  ${tailoredResume.summary ? `<h2>Summary</h2><p>${tailoredResume.summary}</p>` : ""}
  ${skills.length ? `<h2>Skills</h2><p class="skills">${skills.join(" · ")}</p>` : ""}
  ${expHTML ? `<h2>Experience</h2>${expHTML}` : ""}
  <script>window.onload=()=>{window.print()}<\/script>
  </body></html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
}

// ─── Results: Side-by-Side ─────────────────────────────────────────────────────
function SideBySidePane({ result }) {
  const { tailoredResume } = result;
  return (
    <div>
      {/* Summary */}
      <div className="mb-6">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Summary</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Original</p>
            <p className="text-sm text-slate-500 line-through leading-relaxed">
              {result.originalResumeSummary || "(Original summary — paste in Setup to compare)"}
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <p className="text-xs font-medium text-blue-500 mb-2 uppercase tracking-wide">Tailored</p>
            <p className="text-sm text-slate-800 leading-relaxed">{tailoredResume.summary}</p>
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="mb-6">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Skills</h4>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <div className="flex flex-wrap gap-2">
            {(Array.isArray(tailoredResume.skills) ? tailoredResume.skills : (tailoredResume.skills || "").split(/,\s*/)).map((s, i) => (
              <span key={i} className="text-xs bg-white border border-blue-200 text-blue-800 px-2.5 py-1 rounded-full">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Experience */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Experience</h4>
        {(tailoredResume.experience || []).map((exp, ei) => (
          <div key={ei} className="mb-6 bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <p className="font-semibold text-slate-900 text-sm">{exp.title}</p>
              <p className="text-xs text-slate-500">{exp.company}</p>
            </div>
            <div className="divide-y divide-slate-100">
              {(exp.bullets || []).map((b, bi) => (
                <div key={bi} className="px-4 py-3">
                  <p className="text-xs text-slate-400 line-through mb-1.5 leading-relaxed">{b.original}</p>
                  <p className="text-sm text-slate-800 leading-relaxed mb-1.5">{b.revised}</p>
                  <span className="inline-block text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {b.rationale}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Results: Match Score ──────────────────────────────────────────────────────
function MatchScorePane({ result }) {
  const { matchScore, missingKeywords, atsFlags } = result;
  const verdictColor =
    matchScore.verdict?.toLowerCase().includes("strong")
      ? "bg-green-50 border-green-200 text-green-800"
      : matchScore.verdict?.toLowerCase().includes("missing") || matchScore.verdict?.toLowerCase().includes("gap")
      ? "bg-red-50 border-red-200 text-red-800"
      : "bg-amber-50 border-amber-200 text-amber-800";

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-4">
        <ScoreBar label="Keyword Score" value={matchScore.keywordScore} />
        <ScoreBar label="Fit Score" value={matchScore.fitScore} />
        <div className={`mt-4 p-4 rounded-lg border ${verdictColor}`}>
          <p className="text-sm font-semibold mb-1">Verdict</p>
          <p className="text-sm leading-relaxed">{matchScore.verdict}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-4">
        <h4 className="font-semibold text-slate-900 text-sm mb-3">Missing Keywords</h4>
        {missingKeywords?.length ? (
          <div className="flex flex-wrap gap-2">
            {missingKeywords.map((k, i) => (
              <span key={i} className="text-xs bg-red-50 border border-red-200 text-red-700 px-2.5 py-1 rounded-full">
                {k}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No major missing keywords detected.</p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h4 className="font-semibold text-slate-900 text-sm mb-3">ATS Flags</h4>
        {atsFlags?.length ? (
          <ul className="space-y-2">
            {atsFlags.map((f, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>
                <span className="text-slate-700">{f}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No ATS issues flagged.</p>
        )}
      </div>
    </div>
  );
}

// ─── Results: Changelog ────────────────────────────────────────────────────────
function ChangelogPane({ result }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h4 className="font-semibold text-slate-900 text-sm">All Changes Made</h4>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">Section</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">What Changed</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Why</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {(result.changelog || []).map((c, i) => (
            <tr key={i} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-3 text-slate-500 font-medium text-xs">{c.section}</td>
              <td className="px-6 py-3 text-slate-800">{c.change}</td>
              <td className="px-6 py-3 text-slate-500">{c.reason}</td>
            </tr>
          ))}
          {!result.changelog?.length && (
            <tr>
              <td colSpan={3} className="px-6 py-8 text-center text-slate-400 text-sm">No changelog available.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Results: Cover Letter ─────────────────────────────────────────────────────
function CoverLetterPane({ result, toast }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-slate-900">Cover Letter Draft</h4>
        <CopyButton text={result.coverLetter} toast={toast} />
      </div>
      <div className="prose max-w-none text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-lg p-4 border border-slate-200">
        {result.coverLetter || "No cover letter generated."}
      </div>
    </div>
  );
}

// ─── Results: Elevator Pitch ───────────────────────────────────────────────────
function ElevatorPitchPane({ result, toast }) {
  return (
    <div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-semibold text-slate-900">Your Elevator Pitch</h4>
            <p className="text-xs text-slate-500 mt-0.5">Use this for phone screens and "tell me about yourself" moments</p>
          </div>
          <CopyButton text={result.elevatorPitch} toast={toast} />
        </div>
        <p className="text-slate-800 leading-relaxed text-sm">{result.elevatorPitch || "No elevator pitch generated."}</p>
      </div>
    </div>
  );
}

// ─── Results: STAR Stories ─────────────────────────────────────────────────────
function StarStoriesPane({ result }) {
  return (
    <div className="space-y-4">
      {(result.starStories || []).map((s, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <p className="font-semibold text-slate-900 text-sm mb-4">{s.question}</p>
          <div className="space-y-3">
            {[["S — Situation", s.situation], ["T — Task", s.task], ["A — Action", s.action], ["R — Result", s.result]].map(
              ([label, val]) => (
                <div key={label} className="flex gap-3">
                  <span className="text-xs font-bold text-blue-600 w-24 shrink-0 pt-0.5">{label}</span>
                  <p className="text-sm text-slate-700 leading-relaxed">{val}</p>
                </div>
              )
            )}
          </div>
          {s.accomplishmentUsed && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                <span className="font-medium">From your accomplishments: </span>
                {s.accomplishmentUsed}
              </p>
            </div>
          )}
        </div>
      ))}
      {!result.starStories?.length && (
        <p className="text-center text-slate-400 text-sm py-8">No STAR stories generated.</p>
      )}
    </div>
  );
}

// ─── Results: Interview Prep ───────────────────────────────────────────────────
function InterviewPrepPane({ result, apiKey, toast }) {
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!apiKey) { toast("Add your API key in the Tailor tab first.", "warning"); return; }
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey, "anthropic-version": "2023-06-01",
          "content-type": "application/json", "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 3000,
          messages: [{ role: "user", content: `Generate 18 interview questions for this role and candidate. Return ONLY valid JSON — no preamble, no markdown fences.

Role: ${result.jobTitle} at ${result.company}
Job Description: ${(result.jobDescription || "").slice(0, 3000)}
Candidate Summary: ${result.tailoredResume?.summary || ""}
Candidate Roles: ${(result.tailoredResume?.experience || []).map(e => `${e.title} at ${e.company}`).join(", ")}

Return JSON: { "questions": [{ "type": "Behavioral"|"Situational"|"Technical"|"Culture Fit", "question": string, "talkingPoints": [string, string, string] }] }

Generate ~6 Behavioral, ~4 Situational, ~4 Technical, ~4 Culture Fit. Ground every talking point in the candidate's actual experience above. Be specific — reference their real projects and metrics.` }],
        }),
      });
      const data = await res.json();
      const raw = data.content?.[0]?.text ?? "";
      const match = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : raw);
      setQuestions(parsed.questions || []);
      toast("Interview questions ready!");
    } catch (e) { toast(`Failed: ${e.message}`, "error"); }
    finally { setLoading(false); }
  };

  const TYPE_COLORS = {
    "Behavioral": "bg-blue-100 text-blue-700 border-blue-200",
    "Situational": "bg-purple-100 text-purple-700 border-purple-200",
    "Technical": "bg-green-100 text-green-700 border-green-200",
    "Culture Fit": "bg-amber-100 text-amber-700 border-amber-200",
  };

  if (!questions) return (
    <div className="text-center py-16">
      <p className="text-3xl mb-4">🎯</p>
      <p className="font-medium text-slate-700 mb-2">Interview Question Bank</p>
      <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
        18 likely questions — behavioral, situational, technical, culture fit — with talking points mapped to your actual experience.
      </p>
      <button onClick={generate} disabled={loading}
        className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm">
        {loading ? "Generating..." : "✦ Generate Questions"}
      </button>
      {loading && <Spinner message="Mapping your experience to likely questions..." />}
    </div>
  );

  const types = ["Behavioral", "Situational", "Technical", "Culture Fit"];
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-500">{questions.length} questions for <strong>{result.jobTitle}</strong> at <strong>{result.company}</strong></p>
        <button onClick={() => setQuestions(null)} className="text-xs text-slate-400 hover:text-slate-600 underline">Regenerate</button>
      </div>
      {types.map(type => {
        const qs = questions.filter(q => q.type === type);
        if (!qs.length) return null;
        return (
          <div key={type} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${TYPE_COLORS[type] || "bg-slate-100 text-slate-600 border-slate-200"}`}>{type}</span>
              <span className="text-xs text-slate-400">{qs.length} questions</span>
            </div>
            <div className="space-y-3">
              {qs.map((q, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <p className="font-medium text-slate-900 text-sm mb-3">{q.question}</p>
                  <ul className="space-y-2">
                    {(q.talkingPoints || []).map((tp, j) => (
                      <li key={j} className="flex gap-2 text-sm text-slate-600">
                        <span className="text-blue-400 shrink-0 mt-0.5">→</span>
                        <span className="leading-relaxed">{tp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Results: Follow-Up Email ──────────────────────────────────────────────────
function FollowUpEmailPane({ result, apiKey, toast }) {
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState("");

  const generate = async () => {
    if (!apiKey) { toast("Add your API key in the Tailor tab first.", "warning"); return; }
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey, "anthropic-version": "2023-06-01",
          "content-type": "application/json", "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 600,
          messages: [{ role: "user", content: `Write a brief, genuine post-interview thank-you email. Conversational and warm — not formal, not sycophantic. First person. No hollow phrases like "I was thrilled" or "incredible opportunity."

Role: ${result.jobTitle} at ${result.company}
My background: ${result.tailoredResume?.summary || "Operations and program management professional"}
Interview context: ${context || "First-round interview"}

Write subject line first, then a blank line, then the body. Keep it under 150 words. Sound like a real person, not a template. No preamble — just the email.` }],
        }),
      });
      const data = await res.json();
      setEmail(data.content?.[0]?.text ?? "");
    } catch (e) { toast(`Failed: ${e.message}`, "error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-4">
        <h4 className="font-semibold text-slate-900 mb-1">Post-Interview Thank-You Email</h4>
        <p className="text-xs text-slate-500 mb-4">Add context to make it more specific — who you talked to, what stood out, any key topic that came up.</p>
        <textarea value={context} onChange={e => setContext(e.target.value)}
          placeholder="e.g. Spoke with Sarah (hiring manager) and James (senior PM). Discussed the vendor launch work and AI adoption. They flagged scaling ops internationally as the big priority for 2025..."
          className="w-full h-24 text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 mb-3" />
        <button onClick={generate} disabled={loading}
          className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm">
          {loading ? "Writing..." : "✦ Generate Thank-You Email"}
        </button>
      </div>
      {loading && <Spinner message="Writing your follow-up..." />}
      {email && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-900 text-sm">Draft</h4>
            <div className="flex items-center gap-2">
              <CopyButton text={email} toast={toast} />
              <button onClick={() => setEmail(null)} className="text-xs text-slate-400 hover:text-slate-600 underline">Regenerate</button>
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{email}</div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Results ────────────────────────────────────────────────────────────
const RESULT_SECTIONS = [
  { id: "side-by-side", label: "Side-by-Side" },
  { id: "match-score", label: "Match Score" },
  { id: "changelog", label: "Changelog" },
  { id: "cover-letter", label: "Cover Letter" },
  { id: "elevator-pitch", label: "Elevator Pitch" },
  { id: "star-stories", label: "STAR Stories" },
  { id: "interview-prep", label: "Interview Prep" },
  { id: "followup-email", label: "Follow-up Email" },
];

function ResultsTab({ result, toast, apiKey }) {
  const [active, setActive] = useState("side-by-side");
  const [exporting, setExporting] = useState(false);

  const handleDocxExport = async () => {
    setExporting(true);
    try { await exportToDocx(result); toast("Resume downloaded as .docx!"); }
    catch (e) { toast(`Export failed: ${e.message}`, "error"); }
    finally { setExporting(false); }
  };

  if (!result) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="text-4xl mb-4">✦</p>
        <p className="text-lg font-medium text-slate-600 mb-2">No results yet</p>
        <p className="text-sm">Head to the Tailor tab to run your first tailoring session.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">{result.jobTitle}</h3>
          <p className="text-sm text-slate-500">
            {result.company} · {new Date(result.date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700">
            KW: <strong className="text-blue-600">{result.matchScore?.keywordScore}</strong>
          </span>
          <span className="text-sm font-medium text-slate-700">
            Fit: <strong className="text-blue-600">{result.matchScore?.fitScore}</strong>
          </span>
          <button
            onClick={handleDocxExport}
            disabled={exporting}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {exporting ? "Exporting..." : "↓ Word (.docx)"}
          </button>
          <button
            onClick={() => { exportToPDF(result); toast("Print dialog opened — save as PDF."); }}
            className="px-3 py-1.5 border border-slate-300 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            ↓ PDF
          </button>
        </div>
      </div>

      {/* Pill Nav */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {RESULT_SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
              active === s.id
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {active === "side-by-side" && <SideBySidePane result={result} />}
      {active === "match-score" && <MatchScorePane result={result} />}
      {active === "changelog" && <ChangelogPane result={result} />}
      {active === "cover-letter" && <CoverLetterPane result={result} toast={toast} />}
      {active === "elevator-pitch" && <ElevatorPitchPane result={result} toast={toast} />}
      {active === "star-stories" && <StarStoriesPane result={result} />}
      {active === "interview-prep" && <InterviewPrepPane result={result} apiKey={apiKey} toast={toast} />}
      {active === "followup-email" && <FollowUpEmailPane result={result} apiKey={apiKey} toast={toast} />}
    </div>
  );
}

// ─── Tab 4: History ────────────────────────────────────────────────────────────
const APP_STATUSES = [
  { value: "none", label: "No Status", color: "bg-slate-100 text-slate-500" },
  { value: "applied", label: "Applied", color: "bg-blue-100 text-blue-700" },
  { value: "phone_screen", label: "Phone Screen", color: "bg-purple-100 text-purple-700" },
  { value: "interview", label: "Interview", color: "bg-amber-100 text-amber-700" },
  { value: "final_round", label: "Final Round", color: "bg-orange-100 text-orange-700" },
  { value: "offer", label: "Offer", color: "bg-green-100 text-green-700" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-700" },
];

function StatusBadge({ status }) {
  const s = APP_STATUSES.find((x) => x.value === status) ?? APP_STATUSES[0];
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span>;
}

function VerdictBadge({ verdict }) {
  const v = verdict?.toLowerCase() ?? "";
  const cls = v.includes("strong")
    ? "bg-green-100 text-green-700"
    : v.includes("gap") || v.includes("missing")
    ? "bg-red-100 text-red-700"
    : "bg-amber-100 text-amber-700";
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cls}`}>{verdict || "—"}</span>;
}

function HistoryTab({ history, setHistory, onLoad, toast, apiKey }) {
  const [confirmId, setConfirmId] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState({});
  const [expandedContacts, setExpandedContacts] = useState({});
  const [expandedDebrief, setExpandedDebrief] = useState({});
  const [debriefLoading, setDebriefLoading] = useState({});
  const [newContact, setNewContact] = useState({});

  const deleteItem = (id) => {
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    storage.set("history", JSON.stringify(updated));
    setConfirmId(null);
    toast("Entry deleted.");
  };

  const updateStatus = (id, status) => {
    const updated = history.map((h) => h.id === id ? { ...h, appStatus: status } : h);
    setHistory(updated);
    storage.set("history", JSON.stringify(updated));
  };

  const updateNote = (id, note) => {
    const updated = history.map((h) => h.id === id ? { ...h, note } : h);
    setHistory(updated);
    storage.set("history", JSON.stringify(updated));
  };

  const addContact = (id) => {
    const nc = newContact[id] || {};
    if (!nc.name?.trim()) { toast("Name is required.", "warning"); return; }
    const contact = { id: crypto.randomUUID(), name: nc.name.trim(), role: nc.role?.trim() || "", linkedin: nc.linkedin?.trim() || "" };
    const updated = history.map((h) => h.id === id ? { ...h, contacts: [...(h.contacts || []), contact] } : h);
    setHistory(updated);
    storage.set("history", JSON.stringify(updated));
    setNewContact((prev) => ({ ...prev, [id]: { name: "", role: "", linkedin: "" } }));
  };

  const removeContact = (historyId, contactId) => {
    const updated = history.map((h) => h.id === historyId ? { ...h, contacts: (h.contacts || []).filter(c => c.id !== contactId) } : h);
    setHistory(updated);
    storage.set("history", JSON.stringify(updated));
  };

  const updateDeadline = (id, deadline) => {
    const updated = history.map((h) => h.id === id ? { ...h, deadline } : h);
    setHistory(updated);
    storage.set("history", JSON.stringify(updated));
  };

  const generateDebrief = async (h) => {
    if (!apiKey) { toast("Add your API key in the Tailor tab first.", "warning"); return; }
    setDebriefLoading((prev) => ({ ...prev, [h.id]: true }));
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey, "anthropic-version": "2023-06-01",
          "content-type": "application/json", "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 400,
          messages: [{ role: "user", content: `Analyze why this application likely didn't advance. Be direct and specific — no filler.

Role: ${h.jobTitle} at ${h.company}
KW Score: ${h.matchScore?.keywordScore ?? "N/A"}/100
Fit Score: ${h.matchScore?.fitScore ?? "N/A"}/100
Missing Keywords: ${(h.missingKeywords || []).join(", ") || "none recorded"}
Verdict: ${h.matchScore?.verdict ?? "N/A"}

Provide:
1. Most likely gaps (2-3 bullets, specific)
2. What to address on the resume for similar roles next time
3. One concrete skill or experience to develop

Under 200 words. No preamble.` }],
        }),
      });
      const data = await res.json();
      const debrief = data.content?.[0]?.text ?? "";
      const updated = history.map((item) => item.id === h.id ? { ...item, debrief } : item);
      setHistory(updated);
      storage.set("history", JSON.stringify(updated));
      setExpandedDebrief((prev) => ({ ...prev, [h.id]: true }));
      toast("Debrief ready.");
    } catch (e) { toast(`Failed: ${e.message}`, "error"); }
    finally { setDebriefLoading((prev) => ({ ...prev, [h.id]: false })); }
  };

  const toggleNotes = (id) => setExpandedNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleContacts = (id) => setExpandedContacts((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleDebrief = (id) => setExpandedDebrief((prev) => ({ ...prev, [id]: !prev[id] }));

  // Urgency badge for deadline
  const getUrgency = (deadline) => {
    if (!deadline) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Math.ceil((new Date(deadline) - today) / 86400000);
    if (days < 0) return { label: "Overdue", cls: "bg-red-100 text-red-700" };
    if (days === 0) return { label: "Today", cls: "bg-red-100 text-red-700" };
    if (days <= 3) return { label: `${days}d`, cls: "bg-orange-100 text-orange-700" };
    if (days <= 7) return { label: `${days}d`, cls: "bg-yellow-100 text-yellow-600" };
    return { label: `${days}d`, cls: "bg-slate-100 text-slate-500" };
  };

  const exportCSV = () => {
    const headers = ["Date", "Company", "Job Title", "Status", "KW Score", "Fit Score", "Verdict", "URL"];
    const rows = history.map(h => [
      new Date(h.date).toLocaleDateString(),
      h.company, h.jobTitle,
      APP_STATUSES.find(s => s.value === (h.appStatus ?? "none"))?.label ?? "",
      h.matchScore?.keywordScore ?? "",
      h.matchScore?.fitScore ?? "",
      h.matchScore?.verdict ?? "",
      h.jobUrl ?? "",
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "ResumeIQ-Applications.csv"; a.click();
    URL.revokeObjectURL(url);
    toast("CSV downloaded!");
  };

  // Pipeline summary counts
  const counts = APP_STATUSES.slice(1).map((s) => ({
    ...s,
    count: history.filter((h) => (h.appStatus ?? "none") === s.value).length,
  })).filter((s) => s.count > 0);

  // Sort by deadline urgency (entries with deadlines first, soonest first; then by run date)
  const sortedHistory = [...history].sort((a, b) => {
    if (!a.deadline && !b.deadline) return new Date(b.date) - new Date(a.date);
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  });

  // Skills gap: aggregate missing keywords across all history entries
  const kwFreq = {};
  for (const h of history) {
    for (const kw of (h.missingKeywords || [])) {
      const k = kw.toLowerCase().trim();
      if (k) kwFreq[k] = (kwFreq[k] || 0) + 1;
    }
  }
  const topGaps = Object.entries(kwFreq).sort((a, b) => b[1] - a[1]).slice(0, 15);

  if (!history.length) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="text-4xl mb-4">📋</p>
        <p className="text-lg font-medium text-slate-600 mb-2">No tailoring runs yet</p>
        <p className="text-sm">Head to the Tailor tab to get started.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Pipeline Summary */}
      {counts.length > 0 && (
        <div className="mb-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Pipeline</p>
          <div className="flex flex-wrap gap-2">
            {counts.map((s) => (
              <span key={s.value} className={`text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 ${s.color}`}>
                <span>{s.label}</span><span className="font-bold">{s.count}</span>
              </span>
            ))}
            <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-slate-100 text-slate-500 flex items-center gap-1.5">
              <span>Total</span><span className="font-bold">{history.length}</span>
            </span>
          </div>
        </div>
      )}

      {/* Skills Gap Dashboard */}
      {topGaps.length > 0 && (
        <div className="mb-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Skills Gap Tracker</p>
          <p className="text-xs text-slate-400 mb-3">Keywords missing across your applications — higher count means it keeps coming up.</p>
          <div className="flex flex-wrap gap-2">
            {topGaps.map(([kw, count]) => (
              <span key={kw} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border bg-red-50 border-red-200 text-red-700 font-medium">
                <span>{kw}</span>
                <span className="bg-red-200 text-red-800 rounded-full px-1.5 font-bold leading-tight">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h4 className="font-semibold text-slate-900 text-sm">{history.length} Tailoring Run{history.length !== 1 ? "s" : ""}</h4>
          <button onClick={exportCSV} className="text-xs px-3 py-1.5 border border-slate-200 text-slate-500 rounded-md hover:bg-slate-50 transition-colors">
            ↓ Export CSV
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {sortedHistory.map((h) => {
            const urgency = getUrgency(h.deadline);
            return (
            <div key={h.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between gap-4">
                <button onClick={() => onLoad(h)} className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 text-sm">{h.jobTitle}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-500">{h.company} · {new Date(h.date).toLocaleDateString()}</span>
                        {h.jobUrl && (
                          <a href={h.jobUrl} target="_blank" rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-blue-500 hover:underline">Job Posting ↗</a>
                        )}
                        {urgency && (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${urgency.cls}`}>{urgency.label}</span>
                        )}
                      </div>
                    </div>
                    <VerdictBadge verdict={h.matchScore?.verdict} />
                    <span className="text-xs text-slate-400">
                      KW <strong>{h.matchScore?.keywordScore ?? "—"}</strong> · Fit <strong>{h.matchScore?.fitScore ?? "—"}</strong>
                    </span>
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <input type="date" value={h.deadline ?? ""}
                    onChange={(e) => updateDeadline(h.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    title="Application deadline"
                    className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer" />
                  <select
                    value={h.appStatus ?? "none"}
                    onChange={(e) => updateStatus(h.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {APP_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  {confirmId === h.id ? (
                    <>
                      <span className="text-xs text-red-600">Delete?</span>
                      <button onClick={() => deleteItem(h.id)} className="text-xs px-2.5 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">Yes</button>
                      <button onClick={() => setConfirmId(null)} className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-md text-slate-600 hover:bg-slate-50 transition-colors">No</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => onLoad(h)} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">View</button>
                      {(h.appStatus === "rejected") && (
                        <button onClick={() => h.debrief ? toggleDebrief(h.id) : generateDebrief(h)}
                          disabled={debriefLoading[h.id]}
                          className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50">
                          {debriefLoading[h.id] ? "Analyzing..." : h.debrief ? (expandedDebrief[h.id] ? "Hide Debrief" : "Debrief") : "Debrief"}
                        </button>
                      )}
                      <button onClick={() => toggleContacts(h.id)} className="text-xs px-3 py-1.5 border border-slate-200 text-slate-500 rounded-md hover:bg-slate-50 transition-colors">
                        {expandedContacts[h.id] ? "Hide Contacts" : `Contacts${h.contacts?.length ? ` (${h.contacts.length})` : ""}`}
                      </button>
                      <button onClick={() => toggleNotes(h.id)} className="text-xs px-3 py-1.5 border border-slate-200 text-slate-500 rounded-md hover:bg-slate-50 transition-colors">
                        {expandedNotes[h.id] ? "Hide Notes" : "Notes"}
                      </button>
                      <button onClick={() => setConfirmId(h.id)} className="text-xs px-3 py-1.5 border border-slate-200 text-slate-500 rounded-md hover:bg-slate-50 transition-colors">Delete</button>
                    </>
                  )}
                </div>
              </div>

              {/* Contacts */}
              {expandedContacts[h.id] && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Contacts at {h.company}</p>
                  {(h.contacts || []).length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      {(h.contacts || []).map(c => (
                        <div key={c.id} className="flex items-center gap-3 text-xs text-slate-700 bg-slate-50 rounded-lg px-3 py-2">
                          <span className="font-medium">{c.name}</span>
                          {c.role && <span className="text-slate-400">· {c.role}</span>}
                          {c.linkedin && <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline ml-1">LinkedIn ↗</a>}
                          <button onClick={() => removeContact(h.id, c.id)} className="ml-auto text-slate-300 hover:text-red-400 transition-colors text-sm">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <input value={newContact[h.id]?.name || ""}
                      onChange={e => setNewContact(prev => ({ ...prev, [h.id]: { ...(prev[h.id] || {}), name: e.target.value } }))}
                      placeholder="Name *"
                      className="text-xs border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                    <input value={newContact[h.id]?.role || ""}
                      onChange={e => setNewContact(prev => ({ ...prev, [h.id]: { ...(prev[h.id] || {}), role: e.target.value } }))}
                      placeholder="Role / Title"
                      className="text-xs border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                    <div className="flex gap-1">
                      <input value={newContact[h.id]?.linkedin || ""}
                        onChange={e => setNewContact(prev => ({ ...prev, [h.id]: { ...(prev[h.id] || {}), linkedin: e.target.value } }))}
                        placeholder="LinkedIn URL"
                        className="flex-1 text-xs border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                      <button onClick={() => addContact(h.id)}
                        className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap">Add</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Rejection Debrief */}
              {expandedDebrief[h.id] && h.debrief && (
                <div className="mt-3 pt-3 border-t border-red-100">
                  <p className="text-xs font-semibold text-red-500 mb-2">Rejection Debrief</p>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-100 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{h.debrief}</div>
                </div>
              )}

              {/* Notes */}
              {expandedNotes[h.id] && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <textarea
                    value={h.note ?? ""}
                    onChange={(e) => updateNote(h.id, e.target.value)}
                    placeholder="Add notes — recruiter name, next steps, outcome, anything relevant..."
                    className="w-full text-xs text-slate-700 border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 h-20"
                  />
                </div>
              )}
            </div>
          );})}
        </div>
      </div>
    </div>
  );
}

// ─── Root App ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: "setup", label: "Setup" },
  { id: "tailor", label: "Tailor Resume" },
  { id: "results", label: "Results" },
  { id: "history", label: "History" },
];

export default function App() {
  const { toasts, add: toast } = useToast();
  const [activeTab, setActiveTab] = useState("setup");

  const [resume, setResume] = useState(() => storage.get("resume_base") ?? "");
  const [accomplishments, setAccomplishments] = useState(() => {
    const raw = storage.get("accomplishments");
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    // Legacy plain-text: migrate to array
    return raw.split("\n").filter(l => l.trim()).map(text => ({ id: crypto.randomUUID(), company: "", text: text.trim() }));
  });
  const [apiKey, setApiKey] = useState(() => storage.get("api_key") ?? "");
  const [rememberKey, setRememberKey] = useState(() => !!storage.get("api_key"));
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(() => {
    const raw = storage.get("history");
    return raw ? JSON.parse(raw) : [];
  });

  const handleResult = (item) => {
    setResult(item);
    setHistory((prev) => [item, ...prev.filter((h) => h.id !== item.id)]);
    setActiveTab("results");
  };

  const handleLoadFromHistory = (item) => {
    setResult(item);
    setActiveTab("results");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-none">ResumeIQ</h1>
              <p className="text-xs text-slate-400 mt-0.5">AI-powered resume tailoring</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {result && (
              <span className="text-xs text-slate-400">
                Last: <strong className="text-slate-600">{result.jobTitle} @ {result.company}</strong>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex gap-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-5 py-4 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
                {tab.id === "results" && result && (
                  <span className="ml-2 w-1.5 h-1.5 bg-blue-500 rounded-full inline-block" />
                )}
                {tab.id === "history" && history.length > 0 && (
                  <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                    {history.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {activeTab === "setup" && (
          <SetupTab
            resume={resume}
            setResume={setResume}
            accomplishments={accomplishments}
            setAccomplishments={setAccomplishments}
            toast={toast}
          />
        )}
        {activeTab === "tailor" && (
          <TailorTab
            resume={resume}
            accomplishments={accomplishments}
            apiKey={apiKey}
            setApiKey={(key) => {
              setApiKey(key);
              if (rememberKey) storage.set("api_key", key);
            }}
            rememberKey={rememberKey}
            setRememberKey={(val) => {
              setRememberKey(val);
              if (val) storage.set("api_key", apiKey);
              else storage.del("api_key");
            }}
            onResult={handleResult}
            toast={toast}
          />
        )}
        {activeTab === "results" && (
          <ResultsTab result={result} toast={toast} apiKey={apiKey} />
        )}
        {activeTab === "history" && (
          <HistoryTab
            history={history}
            setHistory={setHistory}
            onLoad={handleLoadFromHistory}
            toast={toast}
            apiKey={apiKey}
          />
        )}
      </main>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
