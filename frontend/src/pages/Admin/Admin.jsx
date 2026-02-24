// Admin.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js";
import "chartjs-adapter-date-fns";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, TimeScale);

/**
 * Admin component - Resume Analysis Dashboard
 *
 * Notes:
 * - Expects backend running on https://resume-analyzer-8rhy.onrender.com
 * - POST /upload_resume returns: { data: { ...parsedResume... , ats_score, word_count } }
 * - GET /leetcode/analyze_leetcode/:username returns { profile, analysis, activity_graph }
 * - GET /codechef/analyze_codechef/:username returns { profile }
 * - GET /github/analyze_github/:user_input?token=... returns { username, github_metrics }
 *
 * This is a single-file component intended to replace your previous Admin.jsx.
 * It preserves UI layout, messages, history, and adds charts for activity.
 */

const backend = "https://resume-analyzer-8rhy.onrender.com";

const initialData = {
  name: "",
  email: "",
  phone: "",
  linkedin: "",
  github: "",
  leetcode: "",
  codechef: "",
  hackerrank: "",
  languages: [],
  education: {
    degree: "",
    university: "",
    year: "",
    gpa: "",
    school_name: "",
    sslc_percentage: "",
    hsc_percentage: "",
  },
  internships: [],
  skills: { technical: [], soft: [] },
  certificates: [],
  role_match: "",
  summary: "",
  leetcode_stats: null,
  codechef_stats: null,
  github_stats: null,
  ats_score: null,
  word_count: null,
};

export default function Admin() {
  // main UI state
  const [history, setHistory] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [data, setData] = useState({ ...initialData });
  const [messages, setMessages] = useState([]);
  const [eduTab, setEduTab] = useState("higher");
  const [selectedFile, setSelectedFile] = useState(null);
const navigate = useNavigate();

  // small helpers
function addMsg(type, text, icon) {
  setMessages((prev) => {
    if (prev.length === 0) {
      // if no message, add new
      return [{ type, text, icon, id: Date.now() }];
    } else {
      // else replace the latest message instead of stacking
      const latest = prev[0];
      return [{ ...latest, type, text, icon }, ...prev.slice(1)];
    }
  });
}

  function clearMsgs() {
    setMessages([]);
  }

  // keep a ref so we can cancel stale fetches if needed
  const activeFetchRef = useRef({});

  // Utility: extract username from possible url or handle
  function extractUsernameFromUrlOrHandle(str) {
    if (!str) return "";
    try {
      // If it looks like a full url, parse
      if (str.includes("leetcode.com") || str.includes("codechef.com") || str.includes("github.com")) {
        // attempt basic extraction: last path token
        const cleaned = str.trim().replace(/\/+$/, "");
        const parts = cleaned.split("/");
        return parts[parts.length - 1] || "";
      }
      // else assume the string itself is the username
      return str.trim();
    } catch {
      return str.trim();
    }
  }

  // ---------- Upload resume ----------
  const handleUpload = async () => {
    if (!selectedFile) {
      addMsg("error", "No file selected", "⚠️");
      return;
    }
    try {
      addMsg("processing", " Uploading resume...", "⏳");
const formData = new FormData();
formData.append("file", selectedFile);

const res = await fetch(`${backend}/resume/upload_resume`, {
  method: "POST",
  body: formData,
});

const json = await res.json();

if (json.error) {
  addMsg("error", `❌ Server error: ${json.error}`, "⚠️");
  alert(`Error: ${json.error}`);
  return;
}
if (!json.data) {
  addMsg("error", "❌ Unexpected server response", "⚠️");
  alert("Unexpected response from server. Please try again.");
  return;
}

// ✅ Update success message dynamically
addMsg("success", "✅ Resume analyzed successfully!", "🎉");
setTimeout(() => clearMsgs(), 2000); // auto-hide after 2 seconds

      if (!json.data) {
        console.log("error", "Unexpected server response", "❌");
        alert("Unexpected response from server. Please try again.");
        return;
      }

      // update main data safely
// ✅ FIX: merge ats_score & word_count from root level too
const incoming = {
  ...initialData,
  ...json.data,
  ats_score: json.ats_score ?? json.data?.ats_score ?? null,
  word_count: json.word_count ?? null,
};

// ensure nested structures are preserved
incoming.education = { ...initialData.education, ...(json.data.education || {}) };
incoming.skills = { ...initialData.skills, ...(json.data.skills || {}) };


      setData(incoming);

      // save to history
      setHistory((prev) => [
        {
          id: Date.now(),
          filename: selectedFile.name,
          data: incoming,
          status: "success",
          ats_score: incoming.ats_score,
          created_at: new Date(),
        },
        ...prev,
      ]);

      addMsg("success", "✅ Resume analyzed successfully!", "🎉");
      setSelectedFile(null);

      // automatically kick off analysis for coding platforms if links present
      if (incoming.leetcode) {
        fetchLeetCodeStats(incoming.leetcode);
      }
      if (incoming.codechef) {
        fetchCodeChefStats(incoming.codechef);
      }
      if (incoming.github) {
        fetchGithubStats(incoming.github);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      addMsg("error", "❌ Upload failed!", "⚠️");
      alert("Something went wrong while uploading the resume.");
    }
  };

  // ---------- Download report ----------
  function downloadReport() {
    if (!data) return;
    const reportContent = `
Resume Analysis Report
===========================
Name: ${data.name || "N/A"}
Email: ${data.email || "N/A"}
Phone: ${data.phone || "N/A"}
LinkedIn: ${data.linkedin || "N/A"}
GitHub: ${data.github || "N/A"}
LeetCode: ${data.leetcode || "N/A"}
CodeChef: ${data.codechef || "N/A"}
HackerRank: ${data.hackerrank || "N/A"}

--- Education ---
Degree: ${data.education?.degree || "N/A"}
University: ${data.education?.university || "N/A"}
Year: ${data.education?.year || "N/A"}
GPA: ${data.education?.gpa || "N/A"}

--- Skills ---
Technical: ${(data.skills?.technical || []).join(", ") || "N/A"}
Soft: ${(data.skills?.soft || []).join(", ") || "N/A"}

--- Summary ---
Word Count: ${data.word_count || "N/A"}
Role Match: ${data.role_match || "N/A"}
ATS Score: ${data.ats_score ? data.ats_score + "%" : "N/A"}
Summary: ${data.summary || "N/A"}
`;
    const blob = new Blob([reportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(data.name || "resume_analysis").replace(/\s+/g, "_")}_report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- Fetching platform stats ----------
  // LeetCode
  async function fetchLeetCodeStats(raw) {
    const username = extractUsernameFromUrlOrHandle(raw);
    if (!username) {
      addMsg("error", "Could not parse LeetCode username", "⚠️");
      return;
    }
    const tag = `leetcode_${username}`;
    activeFetchRef.current[tag] = true;
    addMsg("processing", `Fetching LeetCode stats for ${username}...`, "⏳");
    try {
      const res = await fetch(`${backend}/leetcode/analyze_leetcode/${username}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        addMsg("error", `LeetCode fetch error: ${err.error || res.statusText}`, "❌");
        return;
      }
      const json = await res.json();
      // attach results in data object under leetcode_stats
      setData((prev) => ({ ...prev, leetcode_stats: json }));
      addMsg("success", "Success!", "✅");
setTimeout(() => clearMsgs(), 2000);

    } catch (e) {
      console.error("LeetCode fetch failed", e);
      addMsg("error", `❌ Failed to fetch ${username}`, "❌");

    } finally {
      delete activeFetchRef.current[tag];
    }
  }

  // CodeChef
  async function fetchCodeChefStats(raw) {
    const username = extractUsernameFromUrlOrHandle(raw);
    if (!username) {
      addMsg("error", "Could not parse CodeChef username", "⚠️");
      return;
    }
    const tag = `codechef_${username}`;
    activeFetchRef.current[tag] = true;
    addMsg("processing", `Fetching CodeChef profile for ${username}...`, "⏳");
    try {
      const res = await fetch(`${backend}/codechef/analyze_codechef/${username}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        addMsg("error", `CodeChef fetch error: ${err.error || res.statusText}`, "❌");
        return;
      }
      const json = await res.json();
      setData((prev) => ({ ...prev, codechef_stats: json }));
      addMsg("success", "✅ Success!", "✅");
setTimeout(() => clearMsgs(), 2000);

    } catch (e) {
      console.error("CodeChef fetch failed", e);
      addMsg("error", `❌ Failed to fetch ${username}`, "❌");

    } finally {
      delete activeFetchRef.current[tag];
    }
  }

  // GitHub - token optional; you can pass token param if you store it somewhere
  async function fetchGithubStats(raw, token) {
    // the backend supports either username or full url
    const username = extractUsernameFromUrlOrHandle(raw);
    if (!username) {
      addMsg("error", "Could not parse GitHub username", "⚠️");
      return;
    }
    const tag = `github_${username}`;
    activeFetchRef.current[tag] = true;
    addMsg("processing", `Fetching GitHub metrics for ${username}...`, "⏳");
    try {
      // if token is provided, append as query param
      const url = token ? `${backend}/github/analyze_github/${username}?token=${encodeURIComponent(token)}` : `${backend}/github/analyze_github/${username}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        addMsg("error", `GitHub fetch error: ${err.error_graphql || err.error_pr_api || err.error || res.statusText}`, "❌");
        return;
      }
      const json = await res.json();
      setData((prev) => ({ ...prev, github_stats: json }));
      addMsg("success", "✅ Success!", "✅");
setTimeout(() => clearMsgs(), 2000);

    } catch (e) {
      console.error("GitHub fetch failed", e);
     addMsg("error", `❌ Failed to fetch ${username}`, "❌");

    } finally {
      delete activeFetchRef.current[tag];
    }
  }

  // ---------- Prevent logout from setting data null ----------

const handleLogout = async () => {
  try {
    const res = await fetch("https://resume-analyzer-8rhy.onrender.com/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    // Try to parse JSON safely
    let json = {};
    try {
      json = await res.json();
    } catch {
      json = {};
    }

    if (!res.ok) {
      console.error("Logout failed:", json);
      throw new Error(json?.detail || "Logout failed");
    }

    // ✅ Backend confirmed logout
    localStorage.clear();
    sessionStorage.clear();

    // Optional: soft clear client-side cookies (won’t affect HttpOnly)
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // ✅ Redirect only after backend confirms success
    navigate("/login");
  } catch (err) {
    console.error("Logout error:", err);
    alert("Logout failed — please try again.");
  }
};


  // ---------- UI rendering helpers ----------
  function renderPill(text) {
    return (
      <div
        key={String(text)}
        style={{
          background: "#dbeafe",
          color: "#1e40af",
          padding: "6px 14px",
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        {text}
      </div>
    );
  }

  // small effect to keep data object shaped properly (defensive)
  useEffect(() => {
    if (!data) {
      setData({ ...initialData });
    }
  }, [data]);

  // ---------- Chart helpers ----------
  function buildChartFromActivity(activityArray, label = "Activity") {
    // activityArray: [{ date: 'YYYY-MM-DD', count: N }, ...]
    if (!activityArray || !Array.isArray(activityArray) || activityArray.length === 0) {
      return null;
    }
    // sort by date ascending
    const arr = [...activityArray].sort((a, b) => new Date(a.date) - new Date(b.date));
    const labels = arr.map((d) => d.date);
    const counts = arr.map((d) => d.count);
    const dataset = {
      labels,
      datasets: [
        {
          label: label,
          data: counts,
          fill: true,
          tension: 0.3,
          pointRadius: 2,
        },
      ],
    };
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { mode: "index", intersect: false },
      },
      scales: {
        x: {
          type: "time",
          time: { unit: "month", tooltipFormat: "yyyy-MM-dd" },
          ticks: { maxRotation: 0, autoSkip: true },
        },
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
        },
      },
    };
    return { dataset, options };
  }

  // ---------- Render ----------
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #e3f2fd 0%, #e8f5e9 50%, #fce4ec 100%)",
        color: "#111",
      }}
    >
      {/* Sidebar */}
      <div style={{ width: 280, background: "#fff", boxShadow: "2px 0 12px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 20, background: "linear-gradient(135deg, #1e3a8a, #3b82f6)", color: "#fff" }}>
          <h2 style={{ margin: 0, marginBottom: 8, fontSize: 18, fontWeight: 700 }}>📊 Resume Insight</h2>
          <div style={{ fontSize: 13, opacity: 0.9, display: "flex", alignItems: "center", gap: 8 }}>
            👤 <span>Admin User</span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              marginTop: 12,
              padding: "8px 16px",
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              width: "100%",
            }}
          >
            🚪 Logout
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 14, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
            📊 Analysis History
          </h3>
          <div>
            {history.length === 0 && <div style={{ textAlign: "center", color: "#9ca3af", padding: "40px 20px", fontSize: 13 }}>No analyses yet. Upload a resume to get started!</div>}
            {history.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (item.data && item.status === "success") {
                    setCurrentId(item.id);
                    setData(item.data);
                  }
                }}
                style={{
                  background: item.id === currentId ? "#dbeafe" : "#f9fafb",
                  border: "1px solid " + (item.id === currentId ? "#3b82f6" : "#e5e7eb"),
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#1f2937", flex: 1 }}>{item.filename || item.name || "Resume #" + item.id}</div>
                  <div
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontWeight: 600,
                      background: item.status === "success" ? "#d1fae5" : "#fee2e2",
                      color: item.status === "success" ? "#065f46" : "#991b1b",
                    }}
                  >
                    {item.status === "success" ? "✓ Success" : "✗ Failed"}
                  </div>
                </div>
                {item.role && (
                  <div style={{ fontSize: 11, color: "#6366f1", marginBottom: 6, fontWeight: 500 }}>🎯 {item.role}</div>
                )}
                <div style={{ fontSize: 11, color: "#9ca3af", display: "flex", gap: 8 }}>
                  {item.ats_score && <span>ATS: {item.ats_score}%</span>}
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 1400, margin: "24px auto", padding: 20 }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>Resume Analysis Dashboard</div>
              <div style={{ color: "#4b5563" }}>Upload a candidate resume (PDF) to extract details and compute ATS score</div>
            </div>
            <div>
              <button
                onClick={downloadReport}
                disabled={!data}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "none",
                  cursor: data ? "pointer" : "not-allowed",
                  fontWeight: 700,
                  background: "#00aaff",
                  color: "#fff",
                  opacity: data ? 1 : 0.5,
                }}
              >
                📥 Download Report
              </button>
            </div>
          </header>

          {/* Upload card */}
          <div style={{ marginTop: 18, background: "linear-gradient(90deg,#1e90ff,#3a7bd5)", color: "#fff", padding: 18, borderRadius: 14, boxShadow: "0 6px 18px rgba(0,0,0,0.08)" }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>📤 Upload Your Resume</div>
            <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input type="file" accept="application/pdf" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
              <button
                onClick={handleUpload}
                disabled={!selectedFile}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "none",
                  fontWeight: 700,
                  background: "#00aaff",
                  color: "#fff",
                  opacity: selectedFile ? 1 : 0.5,
                }}
              >
                Analyze Resume
              </button>

              {/* button for go to resume */}
<div className=" text-center">
  <button
    onClick={() => navigate("/admin_resume_filter")}
                    style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "none",
                  fontWeight: 700,
                  background: "#00aaff",
                  color: "#fff",
                }}
  >
    Go to Resume Filter
  </button>
</div>

              {/* helper action buttons */}
             
            </div>

            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    border: "1px solid rgba(255,255,255,0.3)",
                    background:
                      m.type === "processing" ? "rgba(254, 243, 199, 0.3)" : m.type === "success" ? "rgba(209, 250, 229, 0.3)" : m.type === "error" ? "rgba(254, 226, 226, 0.3)" : "rgba(219, 234, 254, 0.3)",
                  }}
                >
                  <span>{m.icon}</span>
                  <span>{m.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Personal Information */}
          <div style={{ fontSize: 24, fontWeight: 700, margin: "30px 0 20px 0", color: "#1a237e", display: "flex", alignItems: "center", gap: 10 }}>
            Personal Information
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
            {[
              ["👤", "Name", "name"],
              ["📧", "Email", "email"],
              ["📱", "Phone", "phone"],
              ["🔗", "LinkedIn", "linkedin"],
              ["🐙", "GitHub", "github"],
              ["💻", "LeetCode", "leetcode"],
              ["🔗", "Codechef", "codechef"],
              ["🔗", "Hacker rank", "hackerrank"],
            ].map(([icon, label, key]) => (
              <div key={label} style={{ background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 600, color: "#1f2937", marginBottom: 12 }}>
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <span>{label}</span>
                </div>
                <div style={{ fontSize: 15, color: "#4b5563", wordBreak: "break-word" }}>{(data && data[key]) || "—"}</div>
              </div>
            ))}

            {/* Languages card */}
            <div style={{ background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 600, color: "#1f2937", marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>🗣</span>
                <span>Languages</span>
              </div>
              <div>
                {(() => {
                  const langs = data?.languages;
                  if (!langs || (Array.isArray(langs) && langs.length === 0)) return <div style={{ color: "#6b7280", fontSize: 14 }}>No languages found</div>;
                  const arr = typeof langs === "string" ? langs.split(/[,;]/).map((s) => s.trim()).filter(Boolean) : langs;
                  if (!Array.isArray(arr) || arr.length === 0) return <div style={{ color: "#6b7280", fontSize: 14 }}>No languages found</div>;
                  return <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{arr.map((l) => renderPill(l))}</div>;
                })()}
              </div>
            </div>
          </div>

          {/* Coding profiles card (single, concise) */}
          <div className="bg-white shadow-lg rounded-2xl p-6 mb-6" style={{ background: "#fff", padding: 20, borderRadius: 12 }}>
            <h2 className="text-xl font-semibold mb-3" style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              Coding Profiles
            </h2>

            <div style={{ marginTop: 12 }}>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, color: "#374151" }}>
                {data.github ? (
                  <li>
                    <strong>GitHub:</strong>{" "}
                    <a href={data.github} target="_blank" rel="noopener noreferrer" style={{ color: "#1d4ed8", textDecoration: "underline" }}>
                      {data.github}
                    </a>{" "}
               
                  </li>
                ) : null}

                {data.leetcode ? (
                  <li>
                    <strong>LeetCode:</strong>{" "}
                    <a href={data.leetcode} target="_blank" rel="noopener noreferrer" style={{ color: "#1d4ed8", textDecoration: "underline" }}>
                      {data.leetcode}
                    </a>{" "}

                  </li>
                ) : null}

                {data.codechef ? (
                  <li>
                    <strong>CodeChef:</strong>{" "}
                    <a href={data.codechef} target="_blank" rel="noopener noreferrer" style={{ color: "#1d4ed8", textDecoration: "underline" }}>
                      {data.codechef}
                    </a>{" "}
                
                  </li>
                ) : null}
              </ul>
            </div>
          </div>

          {/* LeetCode Insights */}
          {data.leetcode_stats && data.leetcode_stats.profile && (
            <div style={{ background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)", marginTop: 20 }}>
              <h3 style={{ margin: "0 0 12px 0", color: "#1f2937" }}>🧠 LeetCode Insights</h3>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16, marginBottom: 16 }}>
                <div style={{ background: "#f0f9ff", padding: 12, borderRadius: 8 }}>
                  <strong>👤 Username:</strong> {data.leetcode_stats.profile.Username || "—"}
                </div>
                <div style={{ background: "#f0f9ff", padding: 12, borderRadius: 8 }}>
                  <strong>✅ Easy:</strong> {data.leetcode_stats.profile.Easy || 0}
                </div>
                <div style={{ background: "#f0f9ff", padding: 12, borderRadius: 8 }}>
                  <strong>⚙️ Medium:</strong> {data.leetcode_stats.profile.Medium || 0}
                </div>
                <div style={{ background: "#f0f9ff", padding: 12, borderRadius: 8 }}>
                  <strong>🔥 Hard:</strong> {data.leetcode_stats.profile.Hard || 0}
                </div>
                <div style={{ background: "#f0f9ff", padding: 12, borderRadius: 8 }}>
                  <strong>🏆 Total Solved:</strong> {data.leetcode_stats.profile.Total_Solved || 0}
                </div>
              </div>

              {/* Languages used */}
              <div style={{ marginBottom: 12 }}>
                <strong>🖥️ Languages Used:</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                  {(data.leetcode_stats.profile.Languages || []).map((lang, i) => (
                    <div
                      key={String(lang || i)}
                      style={{
                        background: "#dbeafe",
                        color: "#1e40af",
                        padding: "6px 14px",
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {lang}
                    </div>
                  ))}
                </div>
              </div>

              {/* Analysis Section */}
              {data.leetcode_stats.analysis && (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ marginBottom: 6, color: "#1f2937" }}>📊 Analysis</h4>
                  <p>
                    <strong>Sentiment:</strong> {data.leetcode_stats.analysis.sentiment}
                  </p>
                  <p>
                    <strong>Reason:</strong> {data.leetcode_stats.analysis.reason}
                  </p>

                  {data.leetcode_stats.analysis.metrics && (
                    <div style={{ marginTop: 10 }}>
                      <p>
                        <strong>Problem Distribution:</strong> {data.leetcode_stats.analysis.metrics.problem_distribution}
                      </p>
                      <p>
                        <strong>Total Problems:</strong> {data.leetcode_stats.analysis.metrics.total_problems}
                      </p>
                      <p>
                        <strong>Languages Used:</strong> {data.leetcode_stats.analysis.metrics.languages_used}
                      </p>
                      <p>
                        <strong>Difficulty Rating:</strong> {data.leetcode_stats.analysis.metrics.difficulty_rating}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Activity graph area */}
              <div style={{ marginTop: 18 }}>
                <h5 style={{ margin: "0 0 8px 0" }}>Activity (per-day)</h5>
                <div style={{ height: 240 }}>
                  {(() => {
                    const activity = data.leetcode_stats.activity_graph || [];
                    const chart = buildChartFromActivity(activity, "LeetCode activity");
                    if (!chart) {
                      return <div style={{ color: "#6b7280", padding: 2 }}>No per-day activity data available for LeetCode.</div>;
                    }
                    return <Line options={chart.options} data={chart.dataset} />;
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* CodeChef Insights */}
          {data.codechef_stats && data.codechef_stats.profile && (
            <div style={{ background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)", marginTop: 20 }}>
              <h3 style={{ margin: "0 0 12px 0", color: "#1f2937" }}>🏁 CodeChef Insights</h3>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
                <div style={{ background: "#f0f9ff", padding: 12, borderRadius: 8 }}>
                  <strong>Profile URL:</strong> {data.codechef_stats.profile.Profile_URL || "—"}
                </div>
                <div style={{ background: "#f0f9ff", padding: 12, borderRadius: 8 }}>
                  <strong>Rating:</strong> {data.codechef_stats.profile.Rating || 0}
                </div>
                <div style={{ background: "#f0f9ff", padding: 12, borderRadius: 8 }}>
                  <strong>Star Rating:</strong> {data.codechef_stats.profile.Star_Rating || "—"}
                </div>
                <div style={{ background: "#f0f9ff", padding: 12, borderRadius: 8 }}>
                  <strong>Global Rank:</strong> {data.codechef_stats.profile.Global_Rank || 0}
                </div>
                <div style={{ background: "#f0f9ff", padding: 12, borderRadius: 8 }}>
                  <strong>Country Rank:</strong> {data.codechef_stats.profile.Country_Rank || 0}
                </div>
              </div>

              {/* Learning / Practice Paths */}
              <div style={{ marginTop: 12 }}>
                <strong>Learning Paths:</strong>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {(data.codechef_stats.profile.Learning_Paths || []).map((p, idx) => (
                    <div key={String(p.name || idx)} style={{ background: "#e0f2fe", padding: 10, borderRadius: 8 }}>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: "#475569" }}>{p.completed_percentage}%</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <strong>Practice Paths:</strong>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {(data.codechef_stats.profile.Practice_Paths || []).map((p, idx) => (
                    <div key={String(p.name || idx)} style={{ background: "#e0f2fe", padding: 10, borderRadius: 8 }}>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: "#475569" }}>{p.completed_percentage}%</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <strong>Badges:</strong>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {(data.codechef_stats.profile.Badges || []).map((b, i) => (
                    <div key={String(b || i)} style={{ background: "#fff7ed", padding: 10, borderRadius: 8 }}>
                      <div style={{ fontSize: 13 }}>{b}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* small summary */}
              <div style={{ marginTop: 12 }}>
                <strong>Total Problems Solved (if available):</strong> {data.codechef_stats.profile.Total_Solved || "N/A"}
              </div>
            </div>
          )}

          {/* GitHub Insights */}
          {data.github_stats && data.github_stats.username && (
            <div style={{ background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)", marginTop: 20 }}>
              <h3 style={{ margin: "0 0 12px 0", color: "#1f2937" }}>🐙 GitHub Insights</h3>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
                <div style={{ background: "#f0f9ff", padding: 12, borderRadius: 8 }}>
                  <strong>Username:</strong> {data.github_stats.username}
                </div>
                <div style={{ background: "#f0f9ff", padding: 12, borderRadius: 8 }}>
                  <strong>Original Repos:</strong> {data.github_stats.github_metrics?.total_original_repos ?? "—"}
                </div>
                <div style={{ background: "#f0f9ff", padding: 12, borderRadius: 8 }}>
                  <strong>Forked Repos:</strong> {data.github_stats.github_metrics?.total_forked_repos ?? "—"}
                </div>
                <div style={{ background: "#f0f9ff", padding: 12, borderRadius: 8 }}>
                  <strong>Total Contributions (1y):</strong> {data.github_stats.github_metrics?.total_contributions_1yr ?? "—"}
                </div>
                <div style={{ background: "#f0f9ff", padding: 12, borderRadius: 8 }}>
                  <strong>Active Days (1y):</strong> {data.github_stats.github_metrics?.active_days_1yr ?? "—"}
                </div>
              </div>

              {/* PR metrics if present */}
              {data.github_stats.github_metrics && (
                <div style={{ marginTop: 12 }}>
                  <strong>PR Metrics:</strong>
                  <div style={{ marginTop: 8 }}>
                    <div>
                      <strong>Total PRs Submitted:</strong> {data.github_stats.github_metrics.total_prs_submitted ?? 0}
                    </div>
                    <div>
                      <strong>PRs Merged:</strong> {data.github_stats.github_metrics.prs_merged ?? 0}
                    </div>
                    <div>
                      <strong>PR Acceptance Rate:</strong>{" "}
                      {Math.round((data.github_stats.github_metrics.pr_acceptance_rate || data.github_stats.github_metrics.pr_acceptance_rate === 0) ? (data.github_stats.github_metrics.pr_acceptance_rate) : 0) ?? 0}%
                    </div>
                    <div>
                      <strong>Avg PR Size (lines):</strong> {data.github_stats.github_metrics.avg_pr_size_lines ?? 0}
                    </div>
                    <div>
                      <strong>Avg Time to Merge (days):</strong> {data.github_stats.github_metrics.avg_time_to_merge_days ?? 0}
                    </div>
                  </div>
                </div>
              )}

              {/* Activity graph - GitHub */}
              <div style={{ marginTop: 16 }}>
                <h5 style={{ margin: "0 0 8px 0" }}>GitHub Activity (past year)</h5>
                <div style={{ height: 300 }}>
                  {(() => {
                    const activity = data.github_stats.github_metrics?.activity_graph || [];
                    const chart = buildChartFromActivity(activity, "Contributions");
                    if (!chart) {
                      return <div style={{ color: "#6b7280", padding: 2 }}>No per-day activity available for GitHub. Provide a GitHub token to enable GraphQL access from backend.</div>;
                    }
                    return <Line options={chart.options} data={chart.dataset} />;
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Education (Tabbed) */}
          <div style={{ fontSize: 24, fontWeight: 700, margin: "30px 0 12px 0", color: "#1a237e", display: "flex", alignItems: "center", gap: 10 }}>
            Education
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {[
              ["higher", "Higher Education"],
              ["school", "School & Percentages"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setEduTab(key)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  cursor: "pointer",
                  fontWeight: 600,
                  background: eduTab === key ? "#1e3a8a" : "#fff",
                  color: eduTab === key ? "#fff" : "#1f2937",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {eduTab === "higher" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
              {[
                ["🎓", "Degree", data?.education?.bachelor?.degree],
                ["🏫", "University", data?.education?.bachelor?.institute],
                ["📅", "Graduation Year", data?.education?.bachelor?.expected_graduation],
                ["📊", "GPA/CGPA", data?.education?.bachelor?.cgpa],
              ].map(([icon, label, value]) => (
                <div key={label} style={{ background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 600, color: "#1f2937", marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>{icon}</span>
                    <span>{label}</span>
                  </div>
                  <div style={{ fontSize: 15, color: "#4b5563" }}>{value || "—"}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
              {[
                ["🏫", "School Name", data?.education?.["12th"]?.school],
                ["📈", "SSLC %", data?.education?.["10th"]?.percentage],
                ["📈", "HSC %", data?.education?.["12th"]?.percentage],
              ].map(([icon, label, value]) => (
                <div key={label} style={{ background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 600, color: "#1f2937", marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>{icon}</span>
                    <span>{label}</span>
                  </div>
                  <div style={{ fontSize: 15, color: "#4b5563" }}>{value || "—"}</div>
                </div>
              ))}
            </div>
          )}

          {/* Certificates */}
          <div style={{ fontSize: 24, fontWeight: 700, margin: "30px 0 20px 0", color: "#1a237e", display: "flex", alignItems: "center", gap: 10 }}>
            Certificates
          </div>
          <div style={{ background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12 }}>
              {(data?.certificates && data.certificates.length > 0) ? data.certificates.map((c, idx) => (
                <div key={idx} style={{ background: "#f0f9ff", padding: 12, borderRadius: 8, borderLeft: "4px solid #3b82f6" }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#1e3a8a" }}>{c.role || c}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{c.issuer || ""}</div>
                </div>
              )) : <div style={{ color: "#6b7280" }}>No certificates found</div>}
            </div>
          </div>

          {/* Skills & ATS */}
          <div style={{ fontSize: 24, fontWeight: 700, margin: "30px 0 20px 0", color: "#1a237e", display: "flex", alignItems: "center", gap: 10 }}>
            Analysis Summary
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
            <div style={{ background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}>
              <h3 style={{ margin: "0 0 16px 0", color: "#1f2937" }}>🛠 Skills Analysis</h3>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 250 }}>
                  <h4 style={{ fontSize: 16, color: "#1f2937", marginBottom: 12 }}>Technical Skills</h4>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {(data?.skills?.technical && data.skills.technical.length > 0) ? data.skills.technical.map((s) => renderPill(s)) : <span style={{ color: "#6b7280" }}>—</span>}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 250 }}>
                  <h4 style={{ fontSize: 16, color: "#1f2937", marginBottom: 12 }}>Soft Skills</h4>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {(data?.skills?.soft && data.skills.soft.length > 0) ? data.skills.soft.map((s) => renderPill(s)) : <span style={{ color: "#6b7280" }}>—</span>}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}>
              <h3 style={{ margin: "0 0 16px 0", color: "#1f2937" }}>🧾 ATS Score</h3>
              <div style={{ textAlign: "center", padding: 20 }}>
                <div style={{ fontSize: 48, fontWeight: 700, color: "#1e3a8a" }}>
                  <span>{data?.ats_score ?? "—"}</span>
                  <span style={{ fontSize: 24 }}>{data?.ats_score ? "%" : ""}</span>
                </div>
                <div style={{ marginTop: 10, color: "#6b7280", fontSize: 14 }}>Format, Keywords & Sections</div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)", marginTop: 16 }}>
            <h3 style={{ margin: "0 0 16px 0", color: "#1f2937" }}>📄 Resume Summary</h3>
            <div style={{ display: "flex", marginBottom: 10 }}>
              <div style={{ fontWeight: 600, color: "#374151", minWidth: 120 }}>Word count:</div>
              <div style={{ color: "#6b7280", flex: 1 }}>{data?.word_count || "—"}</div>
            </div>
            <div style={{ display: "flex", marginBottom: 10 }}>
              <div style={{ fontWeight: 600, color: "#374151", minWidth: 120 }}>Role match:</div>
              <div style={{ color: "#6b7280", flex: 1 }}>{data?.role_match || "—"}</div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 600, color: "#374151" }}>Summary:</div>
              <div style={{ color: "#4b5563", lineHeight: 1.6, fontSize: 14 }}>{data?.summary || "—"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
