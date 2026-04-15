import { useState, useEffect, useRef } from "react";

const RUNPOD_ENDPOINT = "hfwuj4fc8h3wr9";
// In production, this would be proxied through your Flask backend
// Never expose API keys in frontend code

const VERDICTS = {
  verified: {
    label: "Verified",
    sublabel: "This appears factually grounded",
    color: "#0D9268",
    bg: "#ECFDF5",
    border: "#A7F3D0",
    icon: "✓",
  },
  uncertain: {
    label: "Uncertain",
    sublabel: "Could not confidently verify — check independently",
    color: "#B45309",
    bg: "#FFFBEB",
    border: "#FDE68A",
    icon: "?",
  },
  flagged: {
    label: "Flagged",
    sublabel: "Likely contains inaccurate information",
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
    icon: "✕",
  },
};

function mapToVerdict(apiResult) {
  if (!apiResult) return null;
  const cat = apiResult.category;
  if (cat === "LOW") return "verified";
  if (cat === "HIGH") return "flagged";
  return "uncertain";
}

function ConfidenceMeter({ verdict }) {
  const v = VERDICTS[verdict];
  const position = verdict === "verified" ? 15 : verdict === "uncertain" ? 50 : 85;

  return (
    <div style={{ margin: "24px 0" }}>
      <div
        style={{
          height: 8,
          borderRadius: 4,
          background: "linear-gradient(to right, #0D9268 0%, #0D9268 33%, #B45309 33%, #B45309 66%, #DC2626 66%, #DC2626 100%)",
          position: "relative",
          opacity: 0.25,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -6,
            left: `${position}%`,
            transform: "translateX(-50%)",
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: v.color,
            border: "3px solid white",
            boxShadow: `0 0 0 2px ${v.color}, 0 2px 8px rgba(0,0,0,0.2)`,
            transition: "left 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" }}>
        <span style={{ color: "#0D9268", fontWeight: 600 }}>Verified</span>
        <span style={{ color: "#B45309", fontWeight: 600 }}>Uncertain</span>
        <span style={{ color: "#DC2626", fontWeight: 600 }}>Flagged</span>
      </div>
    </div>
  );
}

function VerdictCard({ verdict, responseText }) {
  const v = VERDICTS[verdict];

  return (
    <div
      style={{
        background: v.bg,
        border: `2px solid ${v.border}`,
        borderRadius: 16,
        padding: "28px 32px",
        animation: "fadeSlideUp 0.5s ease-out",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: responseText ? 20 : 0 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: v.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 22,
            fontWeight: 700,
            fontFamily: "'DM Mono', monospace",
            flexShrink: 0,
          }}
        >
          {v.icon}
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: v.color, fontFamily: "'Instrument Serif', Georgia, serif" }}>
            {v.label}
          </div>
          <div style={{ fontSize: 14, color: "#6B7280", marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>
            {v.sublabel}
          </div>
        </div>
      </div>

      <ConfidenceMeter verdict={verdict} />

      {responseText && (
        <div
          style={{
            marginTop: 20,
            padding: "16px 20px",
            background: "white",
            borderRadius: 10,
            border: "1px solid #E5E7EB",
            fontSize: 14,
            lineHeight: 1.7,
            color: "#374151",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9CA3AF", marginBottom: 8, fontWeight: 600 }}>
            Model Response
          </div>
          {responseText}
        </div>
      )}
    </div>
  );
}

function ExampleChip({ text, onClick }) {
  return (
    <button
      onClick={() => onClick(text)}
      style={{
        background: "white",
        border: "1px solid #D1D5DB",
        borderRadius: 20,
        padding: "6px 14px",
        fontSize: 12,
        color: "#4B5563",
        cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        e.target.style.background = "#F3F4F6";
        e.target.style.borderColor = "#9CA3AF";
      }}
      onMouseLeave={(e) => {
        e.target.style.background = "white";
        e.target.style.borderColor = "#D1D5DB";
      }}
    >
      {text}
    </button>
  );
}

export default function AgnosLogicLiveTest() {
  const [mode, setMode] = useState("score");
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [responseText, setResponseText] = useState(null);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  const examples = {
    score: [
      "The Great Wall of China is visible from space.",
      "Water freezes at 0°C at standard atmospheric pressure.",
      "Einstein invented the light bulb in 1879.",
      "The human genome contains approximately 20,000 protein-coding genes.",
    ],
    respond: [
      "What is the capital of Australia?",
      "Who invented the telephone?",
      "How many planets are in our solar system?",
      "What causes the Northern Lights?",
    ],
  };

  async function handleSubmit() {
    if (!inputText.trim()) return;
    setLoading(true);
    setResult(null);
    setResponseText(null);
    setError(null);

    try {
      // In production, this calls YOUR Flask backend which proxies to RunPod
      // e.g. POST /api/analyze  { text, mode }
      // For demo, we simulate the API response
      await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));

      // Simulated API response — replace with actual fetch to your backend
      const mockScore = Math.random();
      const mockCategory = mockScore < 0.3 ? "LOW" : mockScore > 0.7 ? "HIGH" : "MED";
      const apiResult = { category: mockCategory, mlp_factual: mockScore };

      if (mode === "respond") {
        setResponseText("This is where the model's generated response would appear. In production, this calls the 'generate_and_score' action on your RunPod endpoint, which generates an answer and scores it simultaneously.");
      }

      setResult(apiResult);
    } catch (e) {
      setError("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleExampleClick(text) {
    setInputText(text);
    setResult(null);
    setResponseText(null);
    if (textareaRef.current) textareaRef.current.focus();
  }

  const verdict = mapToVerdict(result);

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF9", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');
        
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: 200px 0; }
        }
        textarea::placeholder {
          color: #9CA3AF;
        }
        textarea:focus {
          outline: none;
          border-color: #1a1a1a !important;
          box-shadow: 0 0 0 3px rgba(26,26,26,0.06);
        }
      `}</style>

      {/* Header */}
      <div style={{ padding: "32px 0 0", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #1a1a1a 0%, #404040 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: 16, fontWeight: 700, fontFamily: "'DM Mono', monospace",
          }}>
            A
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.02em", fontFamily: "'Instrument Serif', Georgia, serif" }}>
            AgnosLogic
          </span>
        </div>
        <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
          Hallucination detection from inside the model
        </div>
      </div>

      {/* Main Card */}
      <div style={{ maxWidth: 620, margin: "28px auto", padding: "0 20px" }}>
        <div style={{
          background: "white",
          borderRadius: 20,
          border: "1px solid #E5E7EB",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.03)",
          overflow: "hidden",
        }}>
          {/* Mode Tabs */}
          <div style={{
            display: "flex",
            borderBottom: "1px solid #E5E7EB",
            padding: "0 4px",
          }}>
            {[
              { key: "score", label: "Check Text", desc: "Paste text to analyze" },
              { key: "respond", label: "Ask & Verify", desc: "Get an answer with verification" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setMode(tab.key);
                  setResult(null);
                  setResponseText(null);
                  setInputText("");
                }}
                style={{
                  flex: 1,
                  padding: "16px 12px 14px",
                  background: "none",
                  border: "none",
                  borderBottom: mode === tab.key ? "2px solid #1a1a1a" : "2px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <div style={{
                  fontSize: 14,
                  fontWeight: mode === tab.key ? 700 : 500,
                  color: mode === tab.key ? "#1a1a1a" : "#9CA3AF",
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {tab.label}
                </div>
                <div style={{
                  fontSize: 11,
                  color: mode === tab.key ? "#6B7280" : "#D1D5DB",
                  marginTop: 2,
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {tab.desc}
                </div>
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div style={{ padding: "24px 28px 20px" }}>
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                mode === "score"
                  ? "Paste a statement or claim to verify…"
                  : "Ask a question — the model will answer and verify itself…"
              }
              rows={4}
              style={{
                width: "100%",
                border: "1.5px solid #E5E7EB",
                borderRadius: 12,
                padding: "14px 16px",
                fontSize: 15,
                lineHeight: 1.6,
                color: "#1a1a1a",
                fontFamily: "'DM Sans', sans-serif",
                resize: "vertical",
                transition: "border-color 0.2s, box-shadow 0.2s",
                boxSizing: "border-box",
                background: "#FAFAF9",
              }}
            />

            {/* Example chips */}
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#9CA3AF", alignSelf: "center", marginRight: 4, fontWeight: 500 }}>Try:</span>
              {examples[mode].map((ex, i) => (
                <ExampleChip key={i} text={ex} onClick={handleExampleClick} />
              ))}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!inputText.trim() || loading}
              style={{
                marginTop: 20,
                width: "100%",
                padding: "14px",
                borderRadius: 12,
                border: "none",
                background: !inputText.trim() || loading ? "#D1D5DB" : "#1a1a1a",
                color: "white",
                fontSize: 15,
                fontWeight: 600,
                cursor: !inputText.trim() || loading ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loading ? (
                <>
                  <span style={{ animation: "pulse 1.2s ease-in-out infinite" }}>Analyzing</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, opacity: 0.6 }}>…</span>
                </>
              ) : mode === "score" ? (
                "Analyze"
              ) : (
                "Ask & Verify"
              )}
            </button>
          </div>

          {/* Results */}
          {verdict && (
            <div style={{ padding: "0 28px 28px", animation: "fadeSlideUp 0.4s ease-out" }}>
              <VerdictCard verdict={verdict} responseText={responseText} />
            </div>
          )}

          {error && (
            <div style={{
              margin: "0 28px 28px",
              padding: "14px 18px",
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 10,
              color: "#DC2626",
              fontSize: 13,
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div style={{
          textAlign: "center",
          marginTop: 24,
          fontSize: 11,
          color: "#9CA3AF",
          lineHeight: 1.6,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          Powered by CAEF architecture — analyzes the model's internal hidden states in a single forward pass.
          <br />
          No ensemble. No second LLM call. Sub-100ms latency.
        </div>
      </div>
    </div>
  );
}
