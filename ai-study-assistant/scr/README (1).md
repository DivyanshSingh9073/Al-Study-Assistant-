# AI Study Assistant (Production-Ready)

A modern, highly-polished, feature-rich **AI Study Assistant** designed from scratch for high-performance client-side execution. Combining beautiful glassmorphic dark design accents with the power of the Google Gemini API and client-side PDF.js parsing, this suite provides an ultimate study dashboard for students and educators.

This is a **Frontend-Only** application crafted entirely in clean, vanilla, standard-compliant technologies (HTML5, CSS3, ES6+ JavaScript). It contains absolutely no external framework code (no React, Angular, Vue, Tailwind, or jQuery) and runs seamlessly on standard static hosts such as **GitHub Pages**, **Netlify**, **Vercel**, or **Cloudflare Pages**.

---

## 🎨 Design System & UI/UX Experience

The visual architecture is built upon a modern, immersive dark-slate palette styled with high-contrast neon accents, fluid layout rhythms, and organic transitions:
- **Glassmorphism Theme**: Translucent structural cards rendered using advanced CSS `backdrop-filter` rules, subtle border glows, and soft elevation shadows.
- **Dynamic Accent Themes**: Fully supports instant toggle presets including **Aura Dark (Glassmorphic Midnight)**, **Cosmic Blue**, **Cyberpunk Neon (Dracula Contrast)**, and **Sleek Light**.
- **Aesthetic Pairings**: Space Grotesk headings paired with high-contrast Inter typography and JetBrains Mono markers to establish clear visual hierarchy.
- **Fluid Layout**: Sidebar navigation responsive grid structures optimized for mobile, tablet, and widescreen desktop displays.
- **Interactive Transitions**: Animated ambient background blobs, circular progress meters, micro-button hover scaling, and clean loading skeletons.

---

## 🚀 Key Features

### 1. AI Study Buddy (Chat)
- Core conversation window with a highly-intelligent AI tutor.
- Context-aware dialogue capturing past session history.
- Pre-made quickstudy prompts for instant outline generation.
- Full custom Markdown rendering with beautiful styling for lists, strong texts, and code blocks.
- One-click copy buttons for code snippets.

### 2. Explain Topic
- Enter any complex terminology or scientific theory.
- Segmented depth controls: *Explain Like I'm 5 (ELIF)*, *Beginner Friendly*, *Detailed Study Guide*, or *Expert Academic Analysis*.
- Structures explanations with clear sections, visual real-world analogies, and core takeaways.

### 3. AI Quiz Generator
- Construct comprehensive multiple-choice question quizzes for any input text or general subject.
- Adjustable difficulty levels and variable question counts.
- Real-time countdown timer tracking duration.
- Interactive, responsive selection states showing correct/incorrect feedback with full scientific explanations.

### 4. Summarizers (Notes & PDF)
- **Paste Notes**: Generate detailed summaries from textbook passages or lecture notes.
- **PDF Summarizer**: Upload any lecture PDF (up to 10MB). Uses client-side **PDF.js** to extract page text sequentially and sends it to the Gemini API for academic-grade summaries.
- Features formatted glossary definitions and download buttons to export summaries as `.txt` files.

### 5. Study Flashcards
- Flip animations, shuffle functionality, and sequential pagination.
- Create custom flashcards through a manual creator.
- **AI Card Populator**: Generate 5 comprehensive, ready-made flashcards on any subject in seconds using Gemini.

### 6. Study Planner
- Active study checklist categorizing tasks by subject (Science, Math, Humanities, etc.).
- Daily progress meters tracking completion metrics.
- Hard reset and clear completed buttons for active board grooming.

### 7. Pomodoro Focus Timer
- Smooth 25/5/15-minute standard pomodoro cycles, with options to apply custom duration values.
- SVG circular radial progress paths syncing countdown frames.
- Simulated electronic chime alerts upon focus cycle completions.
- Automatically logs focus times to live dashboard charts.

### 8. Analytics Dashboard
- Rolling 7-day study session tracker powered by custom HTML5 Canvas rendering.
- Daily study streak counters that reward consistent daily learning.
- Micro bento cards displaying today's planner metrics and fast study launch hooks.

### 9. System Settings
- **Gemini API Key Manager**: Securely input and save keys in standard password-masked inputs.
- Theme presets and workspace font size scaling.
- **Backup & Portability**: Export your entire study state (checklists, decks, streak sessions) to local `.json` backup files and import them to recover sessions anywhere.

---

## 🛠️ Technology Stack & Dependencies

- **HTML5 & CSS3**: Core responsive structures with customized CSS variables, standard flex/grid modules, and keyframe animations.
- **Vanilla ES6+ JavaScript**: Native state management, clean event delegation, and asynchronous fetch handling. No heavy client-side bundlers.
- **Google Gemini API**: Native client-side fetches utilizing the robust `gemini-2.5-flash` model.
- **PDF.js**: Parsing engine loading local documents directly on the browser thread.
- **Lucide Icons**: Standardized beautiful outline icons.

---

## 📂 Project Architecture

```
├── .env.example        # Configuration example listing Gemini requirements
├── .gitignore          # standard git exclusions
├── LICENSE             # MIT Open Source License
├── README.md           # This project guide file
├── index.html          # Unified workspace layout
├── style.css           # Glassmorphic Dark UI stylesheets
├── api.js              # Gemini endpoint fetcher & key state controls
├── pdf.js              # PDF.js text extraction sequences
├── script.js           # Core state controller & event coordinator
└── package.json        # Node development scripts and lock configurations
```

---

## ⚙️ Setup & Local Development

1. **Clone the repository** to your local machine:
   ```bash
   git clone <your-repository-url>
   ```
2. **Launch with any live server** of your choice.
   - If you have Node.js and npm installed, simply start the development environment:
     ```bash
     npm install
     npm run dev
     ```
   - Open your browser and navigate to `http://localhost:3000`.
3. **Connect the AI Tutor**:
   - Go to **Settings** in the sidebar.
   - Paste your personal Google Gemini API Key (you can generate one for free from [Google AI Studio](https://aistudio.google.com)).
   - Save the key to immediately boot up AI Chat, Quiz generation, Summarizers, and Flashcard populators!

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.
