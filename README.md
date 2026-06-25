# 🎓 AI Study Assistant

A fully client-side AI-powered study assistant built with **vanilla HTML, CSS, and JavaScript**. No backend, no frameworks — just open `index.html` in a browser.

![AI Study Assistant](https://img.shields.io/badge/Status-Live-brightgreen) ![HTML](https://img.shields.io/badge/Stack-HTML%20%2F%20CSS%20%2F%20JS-blue) ![HuggingFace](https://img.shields.io/badge/AI-HuggingFace-yellow)

---

## 🚀 Features

| Feature | Description |
|---|---|
| 📚 **Explain Topic** | Get simple, analogy-driven explanations for any concept |
| 📝 **Quiz Generator** | Auto-generate 5 MCQ questions on any subject |
| 📋 **Notes Summarizer** | Convert your notes into 5 clean revision bullet points |
| 💬 **AI Chat Tutor** | Full conversation memory — ask follow-up questions |
| 📄 **PDF Summarizer** | Upload a PDF and extract key points automatically |

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **AI Model:** Mistral-7B-Instruct-v0.2 via Hugging Face Inference API
- **PDF Parsing:** PDF.js (loaded from CDN)
- **No backend, no build step required**

---

## ⚙️ Setup

### 1. Clone the repo

```bash
git clone https://github.com/DivyanshSingh9073/Al-Study-Assistant-.git
cd Al-Study-Assistant-
```

### 2. Get a Hugging Face token

1. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Create a new token (free account works)
3. Copy the token

### 3. Run

Just open `index.html` in your browser — no install needed.

Paste your token into the banner at the top of the app. It's stored only in your browser's session memory and **never sent to any server** other than Hugging Face directly.

---

## 📂 Project Structure

```
ai-study-assistant/
├── index.html       # App structure & layout
├── style.css        # All styles
├── app.js           # All logic & API calls
└── README.md
```

---

## 🔒 Security

- Your API token is stored in `sessionStorage` — it's cleared when you close the tab
- No token is ever hardcoded in the source
- No backend server — all AI calls go directly from your browser to Hugging Face

---

## 💡 Future Improvements

- [ ] Dark mode toggle
- [ ] Export quiz as PDF
- [ ] Study progress tracker
- [ ] Voice input support
- [ ] Flashcard generator

---

## 👨‍💻 Author

**Divyansh Singh**
- GitHub: [@DivyanshSingh9073](https://github.com/DivyanshSingh9073)

---

## ⭐ Support

If you found this useful, please give it a star on GitHub!

## 📜 License

MIT License
