import { useState, useEffect, useRef, useCallback } from "react";

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
function SetupTab({ resume, setResume, accomplishments, setAccomplishments, toast }) {
  const [resumeDraft, setResumeDraft] = useState(resume);
  const [acDraft, setAcDraft] = useState(accomplishments);
  const resumeFileRef = useRef();
  const acFileRef = useRef();

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

  const saveAc = () => {
    storage.set("accomplishments", acDraft);
    setAccomplishments(acDraft);
    toast("Accomplishment list saved!");
  };

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
            <button
              onClick={() => resumeFileRef.current.click()}
              className="text-xs px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {resume ? "Replace" : "Upload"}
            </button>
            <input
              type="file"
              accept=".txt,.md,.docx"
              ref={resumeFileRef}
              className="hidden"
              onChange={(e) => { if (e.target.files[0]) readFile(e.target.files[0], setResumeDraft); }}
            />
          </div>
        </div>
        <textarea
          value={resumeDraft}
          onChange={(e) => setResumeDraft(e.target.value)}
          placeholder="Paste your full resume here..."
          className="w-full h-72 text-sm font-mono text-slate-700 border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-400">{resumeDraft.length.toLocaleString()} characters</span>
          <button
            onClick={saveResume}
            disabled={!resumeDraft.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Save Resume
          </button>
        </div>
      </div>

      {/* Accomplishments */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-slate-900">Master Accomplishment List</h3>
            <p className="text-xs text-slate-500 mt-0.5">Your bank of achievements, results, and metrics</p>
          </div>
          <div className="flex items-center gap-2">
            {accomplishments && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                <span>✓</span> Loaded
              </span>
            )}
            <button
              onClick={() => acFileRef.current.click()}
              className="text-xs px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {accomplishments ? "Replace" : "Upload"}
            </button>
            <input
              type="file"
              accept=".txt,.md,.docx"
              ref={acFileRef}
              className="hidden"
              onChange={(e) => { if (e.target.files[0]) readFile(e.target.files[0], setAcDraft); }}
            />
          </div>
        </div>
        <textarea
          value={acDraft}
          onChange={(e) => setAcDraft(e.target.value)}
          placeholder="List your accomplishments, key metrics, and notable results here. The more detail, the better Claude can map them to job requirements..."
          className="w-full h-72 text-sm font-mono text-slate-700 border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-400">{acDraft.length.toLocaleString()} characters</span>
          <button
            onClick={saveAc}
            disabled={!acDraft.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Save Accomplishments
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 2: Tailor ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert resume coach and career strategist. You tailor resumes to specific job descriptions by:
1. Matching accomplishments from the user's master list to the language and priorities in the JD
2. Rewriting experience bullets to reflect JD terminology while staying 100% truthful — never fabricate
3. Updating the summary and skills to prioritize what the role values most
4. Reframing job titles subtly (language alignment only — e.g. "Senior Ops Manager" to "Senior Operations Manager")
5. Giving an honest fit assessment, not just cheerleading
6. Flagging ATS risks and missing keywords
7. Writing a tailored cover letter and elevator pitch
8. Mapping accomplishments to likely STAR behavioral interview questions

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

function TailorTab({ resume, accomplishments, apiKey, setApiKey, onResult, toast }) {
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
    if (!accomplishments) return "Accomplishment list not loaded. Go to Setup tab first.";
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
${accomplishments}

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
          <p className="text-xs text-slate-400 mt-1">Stored only in this session. Never sent anywhere except the Claude API.</p>
        </div>

        {/* Warnings */}
        {(!resume || !accomplishments) && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            {!resume && <p>⚠ Base resume not loaded — go to the Setup tab first.</p>}
            {!accomplishments && <p>⚠ Accomplishment list not loaded — go to the Setup tab first.</p>}
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

// ─── Tab 3: Results ────────────────────────────────────────────────────────────
const RESULT_SECTIONS = [
  { id: "side-by-side", label: "Side-by-Side" },
  { id: "match-score", label: "Match Score" },
  { id: "changelog", label: "Changelog" },
  { id: "cover-letter", label: "Cover Letter" },
  { id: "elevator-pitch", label: "Elevator Pitch" },
  { id: "star-stories", label: "STAR Stories" },
];

function ResultsTab({ result, toast }) {
  const [active, setActive] = useState("side-by-side");

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
        <div className="flex gap-3">
          <span className="text-sm font-medium text-slate-700">
            KW: <strong className="text-blue-600">{result.matchScore?.keywordScore}</strong>
          </span>
          <span className="text-sm font-medium text-slate-700">
            Fit: <strong className="text-blue-600">{result.matchScore?.fitScore}</strong>
          </span>
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
    </div>
  );
}

// ─── Tab 4: History ────────────────────────────────────────────────────────────
function VerdictBadge({ verdict }) {
  const v = verdict?.toLowerCase() ?? "";
  const cls = v.includes("strong")
    ? "bg-green-100 text-green-700"
    : v.includes("gap") || v.includes("missing")
    ? "bg-red-100 text-red-700"
    : "bg-amber-100 text-amber-700";
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cls}`}>{verdict || "—"}</span>;
}

function HistoryTab({ history, setHistory, onLoad, toast }) {
  const [confirmId, setConfirmId] = useState(null);

  const deleteItem = (id) => {
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    storage.set("history", JSON.stringify(updated));
    setConfirmId(null);
    toast("Entry deleted.");
  };

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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h4 className="font-semibold text-slate-900 text-sm">{history.length} Tailoring Run{history.length !== 1 ? "s" : ""}</h4>
      </div>
      <div className="divide-y divide-slate-100">
        {history.map((h) => (
          <div key={h.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between">
              <button
                onClick={() => onLoad(h)}
                className="flex-1 text-left"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{h.jobTitle}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{h.company} · {new Date(h.date).toLocaleDateString()}</p>
                  </div>
                  <VerdictBadge verdict={h.matchScore?.verdict} />
                  <span className="text-xs text-slate-400">
                    KW <strong>{h.matchScore?.keywordScore ?? "—"}</strong> · Fit <strong>{h.matchScore?.fitScore ?? "—"}</strong>
                  </span>
                </div>
              </button>
              <div className="flex items-center gap-2 ml-4">
                {confirmId === h.id ? (
                  <>
                    <span className="text-xs text-red-600 mr-1">Delete?</span>
                    <button onClick={() => deleteItem(h.id)} className="text-xs px-2.5 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">Yes</button>
                    <button onClick={() => setConfirmId(null)} className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-md text-slate-600 hover:bg-slate-50 transition-colors">No</button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => onLoad(h)}
                      className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => setConfirmId(h.id)}
                      className="text-xs px-3 py-1.5 border border-slate-200 text-slate-500 rounded-md hover:bg-slate-50 transition-colors"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
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
  const [accomplishments, setAccomplishments] = useState(() => storage.get("accomplishments") ?? "");
  const [apiKey, setApiKey] = useState("");
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
            setApiKey={setApiKey}
            onResult={handleResult}
            toast={toast}
          />
        )}
        {activeTab === "results" && (
          <ResultsTab result={result} toast={toast} />
        )}
        {activeTab === "history" && (
          <HistoryTab
            history={history}
            setHistory={setHistory}
            onLoad={handleLoadFromHistory}
            toast={toast}
          />
        )}
      </main>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
