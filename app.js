// =============================================
// CONFIG
// =============================================
const API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

// =============================================
// TOKEN MANAGEMENT (sessionStorage — never sent to any server)
// =============================================
function saveToken() {
  const val = document.getElementById("tokenInput").value.trim();
  if (!val.startsWith("hf_")) {
    alert("That doesn't look like a valid Hugging Face token (should start with hf_)");
    return;
  }
  sessionStorage.setItem("hf_token", val);
  document.getElementById("apiBanner").classList.add("hidden");
}

function getToken() {
  return sessionStorage.getItem("hf_token") || "";
}

// Check on load — hide banner if token already saved this session
window.addEventListener("load", () => {
  if (getToken()) document.getElementById("apiBanner").classList.add("hidden");
});

// =============================================
// HF API CALL
// =============================================
async function queryHF(prompt) {
  const token = getToken();
  if (!token) {
    document.getElementById("apiBanner").classList.remove("hidden");
    throw new Error("Please enter your Hugging Face API token above first.");
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 600,
        temperature: 0.7,
        return_full_text: false,
      },
    }),
  });

  if (response.status === 503) {
    throw new Error("Model is loading on Hugging Face servers. Please wait 20 seconds and try again.");
  }
  if (response.status === 401) {
    sessionStorage.removeItem("hf_token");
    document.getElementById("apiBanner").classList.remove("hidden");
    throw new Error("Invalid token. Please re-enter your Hugging Face API token.");
  }
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error || `API error ${response.status}`);
  }

  const data = await response.json();
  if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text;
  if (data?.generated_text) return data.generated_text;
  throw new Error("Unexpected response format from Hugging Face.");
}

// =============================================
// UI HELPERS
// =============================================
function showLoading(boxId) {
  document.getElementById(boxId).innerHTML = `
    <div class="result-loading">
      <div class="spinner"></div> Thinking…
    </div>`;
}

function showResult(boxId, text) {
  document.getElementById(boxId).innerHTML = `<div class="result-inner">${escapeHtml(text).trim()}</div>`;
}

function showError(boxId, msg) {
  document.getElementById(boxId).innerHTML = `<div class="result-error">⚠️ ${escapeHtml(msg)}</div>`;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function setBtn(id, loading) {
  const btn = document.querySelector(`#tab-${id} .action-btn`);
  if (btn) btn.disabled = loading;
}

// =============================================
// TAB SWITCHING
// =============================================
function switchTab(tabId, el) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
  el.classList.add("active");
  document.getElementById(`tab-${tabId}`).classList.add("active");
}

// =============================================
// EXPLAIN TOPIC
// =============================================
async function runExplain() {
  const topic = document.getElementById("explainInput").value.trim();
  if (!topic) return;
  setBtn("explain", true);
  showLoading("explainResult");

  const prompt = `[INST] You are a helpful study assistant for students.
Explain the following topic in simple, easy-to-understand language.
Use an analogy if possible. Keep it under 200 words.

Topic: ${topic} [/INST]`;

  try {
    const result = await queryHF(prompt);
    showResult("explainResult", result);
  } catch (e) {
    showError("explainResult", e.message);
  } finally {
    setBtn("explain", false);
  }
}

// =============================================
// QUIZ GENERATOR
// =============================================
async function runQuiz() {
  const topic = document.getElementById("quizInput").value.trim();
  if (!topic) return;
  setBtn("quiz", true);
  showLoading("quizResult");

  const prompt = `[INST] You are a study assistant. Generate exactly 5 multiple choice questions about: ${topic}

Format each question exactly like this:
Q1. [Question]
A) option
B) option
C) option
D) option
Answer: [correct letter]

Keep questions educational and clear. [/INST]`;

  try {
    const result = await queryHF(prompt);
    showResult("quizResult", result);
  } catch (e) {
    showError("quizResult", e.message);
  } finally {
    setBtn("quiz", false);
  }
}

// =============================================
// NOTES SUMMARIZER
// =============================================
async function runSummarize() {
  const notes = document.getElementById("summarizeInput").value.trim();
  if (!notes) return;
  setBtn("summarize", true);
  showLoading("summarizeResult");

  const prompt = `[INST] You are a study assistant. Summarize these notes into 5 clear bullet points for easy revision.
Be concise and highlight the most important ideas.

Notes: ${notes} [/INST]`;

  try {
    const result = await queryHF(prompt);
    showResult("summarizeResult", result);
  } catch (e) {
    showError("summarizeResult", e.message);
  } finally {
    setBtn("summarize", false);
  }
}

// =============================================
// CHAT TUTOR (with memory)
// =============================================
let chatHistory = [];

function appendChat(role, text) {
  const win = document.getElementById("chatWindow");
  const div = document.createElement("div");
  div.className = `chat-msg ${role}`;
  div.innerHTML = `<div class="chat-bubble">${escapeHtml(text)}</div>`;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
}

function appendChatLoading() {
  const win = document.getElementById("chatWindow");
  const div = document.createElement("div");
  div.className = "chat-msg ai";
  div.id = "chatThinking";
  div.innerHTML = `<div class="chat-bubble"><div class="result-loading" style="padding:0"><div class="spinner"></div> Thinking…</div></div>`;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
}

function removeChatLoading() {
  const el = document.getElementById("chatThinking");
  if (el) el.remove();
}

async function runChat() {
  const input = document.getElementById("chatInput").value.trim();
  if (!input) return;

  document.getElementById("chatInput").value = "";
  appendChat("user", input);
  chatHistory.push({ role: "user", text: input });

  appendChatLoading();
  document.querySelector(".send-btn").disabled = true;

  // Build context from history (last 8 turns to stay within token limits)
  const recentHistory = chatHistory.slice(-8);
  const contextStr = recentHistory.slice(0, -1)
    .map(m => m.role === "user" ? `Student: ${m.text}` : `Tutor: ${m.text}`)
    .join("\n");

  const prompt = `[INST] You are a helpful, encouraging AI study tutor. Answer the student's question clearly and concisely.
${contextStr ? `\nConversation so far:\n${contextStr}\n` : ""}
Student: ${input} [/INST]`;

  try {
    const result = await queryHF(prompt);
    removeChatLoading();
    appendChat("ai", result.trim());
    chatHistory.push({ role: "ai", text: result.trim() });
  } catch (e) {
    removeChatLoading();
    appendChat("ai", `⚠️ ${e.message}`);
  } finally {
    document.querySelector(".send-btn").disabled = false;
  }
}

function chatEnter(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    runChat();
  }
}

function clearChat() {
  chatHistory = [];
  const win = document.getElementById("chatWindow");
  win.innerHTML = `<div class="chat-msg ai"><div class="chat-bubble">Hi! I'm your AI study tutor. Ask me anything — I remember our whole conversation. 👋</div></div>`;
}

// =============================================
// PDF SUMMARIZER
// =============================================
let pdfText = "";

function dragOver(e) {
  e.preventDefault();
  document.getElementById("dropZone").classList.add("drag-over");
}

function dropFile(e) {
  e.preventDefault();
  document.getElementById("dropZone").classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) processPDFFile(file);
}

function handleFile(e) {
  const file = e.target.files[0];
  if (file) processPDFFile(file);
}

function processPDFFile(file) {
  if (file.type !== "application/pdf") {
    alert("Please upload a PDF file.");
    return;
  }
  document.getElementById("fileName").textContent = `📎 ${file.name}`;

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      // Load PDF.js from CDN to extract text
      if (!window.pdfjsLib) {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      }

      const typedArray = new Uint8Array(e.target.result);
      const pdf = await pdfjsLib.getDocument(typedArray).promise;

      let fullText = "";
      const maxPages = Math.min(pdf.numPages, 10); // cap at 10 pages
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map(item => item.str).join(" ") + "\n";
      }

      pdfText = fullText.trim();
      if (!pdfText) {
        showError("pdfResult", "Could not extract text from this PDF. It may be a scanned image-only PDF.");
        return;
      }

      document.getElementById("pdfBtn").disabled = false;
      document.getElementById("pdfResult").innerHTML = `<div class="result-inner" style="font-size:0.82rem;color:#6b6882">✅ PDF loaded (${pdf.numPages} pages). Click "Summarize PDF" to continue.</div>`;
    } catch (err) {
      showError("pdfResult", "Failed to read PDF: " + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

async function runPDF() {
  if (!pdfText) return;
  document.getElementById("pdfBtn").disabled = true;
  showLoading("pdfResult");

  // Trim text to ~2000 chars to stay within token limits
  const trimmed = pdfText.slice(0, 2000);

  const prompt = `[INST] You are a study assistant. Summarize the following document content into:
1. A 2-sentence overview
2. 5 key bullet points students should know

Document:
${trimmed}
[/INST]`;

  try {
    const result = await queryHF(prompt);
    showResult("pdfResult", result);
  } catch (e) {
    showError("pdfResult", e.message);
  } finally {
    document.getElementById("pdfBtn").disabled = false;
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
