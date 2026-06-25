// =============================================
// CONFIG — uses HF Inference API (CORS-enabled)
// Model: zephyr-7b-beta (reliable, fast, free)
// =============================================
const HF_MODEL = "HuggingFaceH4/zephyr-7b-beta";
const API_URL  = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

// =============================================
// TOKEN MANAGEMENT
// =============================================
function saveToken() {
  const val = document.getElementById("tokenInput").value.trim();
  if (!val.startsWith("hf_")) {
    alert("That doesn't look like a valid HF token (must start with hf_)");
    return;
  }
  sessionStorage.setItem("hf_token", val);
  document.getElementById("apiBanner").classList.add("hidden");
  document.getElementById("tokenStatus").textContent = "✅ Token saved for this session";
}

function getToken() {
  return sessionStorage.getItem("hf_token") || "";
}

window.addEventListener("load", () => {
  if (getToken()) document.getElementById("apiBanner").classList.add("hidden");
});

// =============================================
// CORE API CALL
// =============================================
async function queryHF(userPrompt) {
  const token = getToken();
  if (!token) {
    document.getElementById("apiBanner").classList.remove("hidden");
    throw new Error("Enter your Hugging Face token in the banner above first.");
  }

  // Zephyr uses <|system|> / <|user|> / <|assistant|> chat template
  const formatted =
    `<|system|>\nYou are a helpful AI study assistant for students.\n</s>\n` +
    `<|user|>\n${userPrompt}\n</s>\n` +
    `<|assistant|>\n`;

  let response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: formatted,
        parameters: {
          max_new_tokens: 512,
          temperature: 0.7,
          return_full_text: false,
          stop: ["</s>", "<|user|>"],
        },
      }),
    });
  } catch (networkErr) {
    throw new Error(
      "Network error — check your internet connection. " +
      "If opening index.html directly as a file, use a local server instead:\n" +
      "  npx serve .   or   python -m http.server 8080"
    );
  }

  if (response.status === 401) {
    sessionStorage.removeItem("hf_token");
    document.getElementById("apiBanner").classList.remove("hidden");
    throw new Error("Invalid token — please re-enter your Hugging Face API token.");
  }
  if (response.status === 503) {
    throw new Error("Model is warming up on HF servers. Wait 20 seconds and try again.");
  }
  if (response.status === 429) {
    throw new Error("Rate limit hit. Wait a minute then try again (free tier limit).");
  }
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HF API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();

  // Handle both array and object response shapes
  const raw =
    (Array.isArray(data) ? data[0]?.generated_text : data?.generated_text) || "";

  if (!raw.trim()) throw new Error("Got an empty response — the model may be overloaded. Try again.");
  return raw.trim();
}

// =============================================
// UI HELPERS
// =============================================
function showLoading(boxId) {
  document.getElementById(boxId).innerHTML =
    `<div class="result-loading"><div class="spinner"></div> Thinking…</div>`;
}

function showResult(boxId, text) {
  document.getElementById(boxId).innerHTML =
    `<div class="result-inner">${escapeHtml(text)}</div>`;
}

function showError(boxId, msg) {
  document.getElementById(boxId).innerHTML =
    `<div class="result-error">⚠️ ${escapeHtml(msg)}</div>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function setBtn(tabId, loading) {
  const btn = document.querySelector(`#tab-${tabId} .action-btn`);
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
  try {
    const result = await queryHF(
      `Explain "${topic}" in simple, easy-to-understand language for a student. ` +
      `Use an analogy if helpful. Keep it under 200 words.`
    );
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
  try {
    const result = await queryHF(
      `Generate exactly 5 multiple choice questions about: ${topic}\n\n` +
      `Format each like:\nQ1. [question]\nA) ...\nB) ...\nC) ...\nD) ...\nAnswer: [letter]\n\n` +
      `Keep it educational and clear.`
    );
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
  try {
    const result = await queryHF(
      `Summarize these student notes into 5 clear bullet points for easy revision. ` +
      `Be concise.\n\nNotes:\n${notes}`
    );
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
  div.id = "chatThinking";
  div.className = "chat-msg ai";
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

  // Build context string from last 6 turns
  const recent = chatHistory.slice(-7, -1);
  const ctx = recent.map(m =>
    m.role === "user" ? `Student: ${m.text}` : `Tutor: ${m.text}`
  ).join("\n");

  const fullPrompt =
    (ctx ? `Previous conversation:\n${ctx}\n\n` : "") +
    `Student question: ${input}\n\nAnswer clearly and helpfully as a study tutor.`;

  try {
    const result = await queryHF(fullPrompt);
    removeChatLoading();
    appendChat("ai", result);
    chatHistory.push({ role: "ai", text: result });
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
  document.getElementById("chatWindow").innerHTML =
    `<div class="chat-msg ai"><div class="chat-bubble">Hi! I'm your AI study tutor. Ask me anything 👋</div></div>`;
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
  showLoading("pdfResult");

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      if (!window.pdfjsLib) {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      }
      const typedArray = new Uint8Array(e.target.result);
      const pdf = await pdfjsLib.getDocument(typedArray).promise;
      let fullText = "";
      const maxPages = Math.min(pdf.numPages, 8);
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map(item => item.str).join(" ") + "\n";
      }
      pdfText = fullText.trim();
      if (!pdfText) {
        showError("pdfResult", "No text found — this may be a scanned/image PDF.");
        return;
      }
      document.getElementById("pdfBtn").disabled = false;
      document.getElementById("pdfResult").innerHTML =
        `<div class="result-inner" style="font-size:0.82rem;color:#6b6882">` +
        `✅ Loaded ${pdf.numPages} page(s). Click "Summarize PDF" to continue.</div>`;
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
  const trimmed = pdfText.slice(0, 1800);
  try {
    const result = await queryHF(
      `Summarize this document for a student:\n1. Write a 2-sentence overview.\n` +
      `2. List 5 key bullet points to remember.\n\nDocument:\n${trimmed}`
    );
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
    s.onerror = () => reject(new Error("Failed to load PDF.js"));
    document.head.appendChild(s);
  });
}
