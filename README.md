# 🚀 AI PowerPoint Generator

![Python](https://img.shields.io/badge/Python-3.9%2B-blue?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-2.0%2B-black?style=for-the-badge&logo=flask&logoColor=white)
![Groq](https://img.shields.io/badge/AI-Groq%20Llama3-orange?style=for-the-badge)
![Pexels](https://img.shields.io/badge/Images-Pexels%20API-05A081?style=for-the-badge)

**A Next-Generation AI Tool to create stunning, professional PowerPoint presentations from a single text prompt.**

> **Developed by [darkphoenix2208](https://github.com/darkphoenix2208)**

---

## ✨ Features

*   **🧠 Intelligent Narrative Engine**: Powered by **Llama-3 (via Groq)** to generate deep, meaningful content—not just generic bullet points. Uses "McKinsey/Apple" style storytelling.
*   **🎨 Dynamic Canvas Layouts**: Moves beyond standard templates. The system mathematically calculates the perfect layout for your content:
    *   **Image Right**: Balanced text with relevant visuals.
    *   **Big Quote**: Impactful, centered typography for key statements.
    *   **Title Only**: Clean, bold section headers.
    *   **Smart Content**: Full-width text that automatically adjusts line spacing and font size.
*   **📐 Auto-Design System**:
    *   **Prevent Overflow**: The engine runs a physics-like simulation (`fit_text`) to shrink fonts and adjust spacing so text *never* falls off the slide.
    *   **Professional Styling**: Automatic accent lines, footer slide numbers, and date stamping.
    *   **Theme Integration**: Preserves your custom PowerPoint master slides if provided.
*   **🖼️ Smart Visuals**: Automatically fetches high-quality, relevant stock photos from Pexels based on the slide's specific context.

## 🛠️ Tech Stack

*   **Core**: Python 3.9+
*   **Web Framework**: Flask
*   **Presentation Engine**: `python-pptx` (Custom Logic)
*   **LLM API**: Groq (Llama-3-70b)
*   **Image API**: Pexels

## 📦 Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/darkphoenix2208/AI-PPT.git
    cd AI-PPT
    ```

2.  **Install Requirements**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory (do NOT commit this file):
    ```env
    FLASK_SECRET_KEY=super_secret_key
    GROQ_API_KEY=gsk_...
    PEXELS_API_KEY=...
    LLM_PROVIDER=groq
    ```

## 🚀 Usage

1.  Start the application:
    ```bash
    python app.py
    ```
2.  Open your browser to `http://localhost:5000`.
3.  **Enter a Topic**: e.g., *"The Future of Quantum Computing"*.
4.  **Refine**: Answer the AI's clarifying questions to tailor the result.
5.  **Download**: Get your `.pptx` file instantly.

## 🤝 Contributing

Created and maintained by **[darkphoenix2208](https://github.com/darkphoenix2208)**.
Feel free to star the repo and contribute!

---
*© 2024 darkphoenix2208. All Rights Reserved.*
