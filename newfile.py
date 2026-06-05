‎import gradio as gr
‎import requests
‎
‎# ==============================
‎# CONFIG — paste your HF token here
‎# Get it from: https://huggingface.co/settings/tokens
‎# ==============================
‎HF_TOKEN = "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"
‎API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2"
‎
‎HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"}
‎
‎
‎def query_hf(prompt):
‎    """Send a prompt to Hugging Face API and return the response."""
‎    payload = {
‎        "inputs": prompt,
‎        "parameters": {
‎            "max_new_tokens": 500,
‎            "temperature": 0.7,
‎            "return_full_text": False
‎        }
‎    }
‎    response = requests.post(API_URL, headers=HEADERS, json=payload)
‎    
‎    if response.status_code == 200:
‎        return response.json()[0]["generated_text"]
‎    else:
‎        return f"Error: {response.status_code} - {response.text}"
‎
‎
‎def explain_topic(topic):
‎    """Explain a topic in simple terms."""
‎    if not topic.strip():
‎        return "Please enter a topic first!"
‎    
‎    prompt = f"""[INST] You are a helpful study assistant for students. 
‎Explain the following topic in very simple, easy-to-understand language.
‎Use an analogy if possible. Keep it under 150 words.
‎
‎Topic: {topic} [/INST]"""
‎    
‎    return query_hf(prompt)
‎
‎
‎def generate_quiz(topic):
‎    """Generate 5 quiz questions for a topic."""
‎    if not topic.strip():
‎        return "Please enter a topic first!"
‎    
‎    prompt = f"""[INST] You are a study assistant. Generate exactly 5 multiple choice questions about: {topic}
‎
‎Format each question like this:
‎Q1. [Question]
‎A) option
‎B) option  
‎C) option
‎D) option
‎Answer: [correct letter]
‎
‎Keep questions simple and educational. [/INST]"""
‎    
‎    return query_hf(prompt)
‎
‎
‎def summarize_notes(notes):
‎    """Summarize student notes into key points."""
‎    if not notes.strip():
‎        return "Please paste your notes first!"
‎    
‎    prompt = f"""[INST] You are a study assistant. Summarize these notes into 5 clear bullet points.
‎Make it easy to revise from. Be concise.
‎
‎Notes: {notes} [/INST]"""
‎    
‎    return query_hf(prompt)
‎
‎
‎# ==============================
‎# GRADIO UI
‎# ==============================
‎with gr.Blocks(
‎    title="AI Study Assistant",
‎    theme=gr.themes.Soft(primary_hue="blue"),
‎    css="""
‎    .header { text-align: center; padding: 20px; }
‎    .header h1 { color: #2563eb; font-size: 2em; }
‎    .header p { color: #6b7280; }
‎    """
‎) as app:
‎
‎    gr.HTML("""
‎    <div class="header">
‎        <h1>🎓 AI Study Assistant</h1>
‎        <p>Your personal AI tutor — explain topics, generate quizzes, and summarize notes</p>
‎        <p><small>Built by Divyansh Singh | Powered by Hugging Face</small></p>
‎    </div>
‎    """)
‎
‎    with gr.Tabs():
‎
‎        # TAB 1 — Explain Topic
‎        with gr.Tab("📚 Explain Topic"):
‎            gr.Markdown("### Enter any topic and get a simple explanation")
‎            topic_input = gr.Textbox(
‎                placeholder="e.g. What is machine learning? / Explain recursion / What is photosynthesis?",
‎                label="Topic or Question",
‎                lines=2
‎            )
‎            explain_btn = gr.Button("Explain it to me! 🚀", variant="primary")
‎            explain_output = gr.Textbox(label="Explanation", lines=8)
‎            explain_btn.click(fn=explain_topic, inputs=topic_input, outputs=explain_output)
‎
‎        # TAB 2 — Quiz Generator
‎        with gr.Tab("📝 Quiz Generator"):
‎            gr.Markdown("### Generate 5 MCQ questions on any topic")
‎            quiz_input = gr.Textbox(
‎                placeholder="e.g. Python programming / World War 2 / Data Structures",
‎                label="Topic for Quiz",
‎                lines=2
‎            )
‎            quiz_btn = gr.Button("Generate Quiz! 🎯", variant="primary")
‎            quiz_output = gr.Textbox(label="Quiz Questions", lines=15)
‎            quiz_btn.click(fn=generate_quiz, inputs=quiz_input, outputs=quiz_output)
‎
‎        # TAB 3 — Notes Summarizer
‎        with gr.Tab("📋 Notes Summarizer"):
‎            gr.Markdown("### Paste your notes and get a clean summary")
‎            notes_input = gr.Textbox(
‎                placeholder="Paste your notes here...",
‎                label="Your Notes",
‎                lines=8
‎            )
‎            summarize_btn = gr.Button("Summarize! ✨", variant="primary")
‎            summary_output = gr.Textbox(label="Key Points Summary", lines=8)
‎            summarize_btn.click(fn=summarize_notes, inputs=notes_input, outputs=summary_output)
‎
‎    gr.HTML("""
‎    <div style="text-align:center; margin-top:20px; color:#9ca3af; font-size:0.85em;">
‎        ⭐ Star this project on GitHub | Connect on LinkedIn
‎    </div>
‎    """)
‎
‎# ==============================
‎# RUN THE APP
‎# ==============================
‎if __name__ == "__main__":
‎    app.launch(share=True)  # share=True gives a public link!