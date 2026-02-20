import requests
import os
import json
import re

def ask_llm(md_text, api_key, slide_length="Medium (6-10)"):
    
    # Demo mode - for testing without API key
    if api_key == "demo" or api_key == "DEMO":
        print("Using DEMO MODE - returning sample presentation")
        return {
            "title": "Demo Presentation",
            "slides": [
                {
                    "title": "Welcome Slide",
                    "layout": "bullet_points",
                    "content": ["This is a demo presentation", "Created without using an API"],
                    "image_query": "welcome sign"
                },
                {
                    "title": "What is This App?",
                    "layout": "bullet_points",
                    "content": ["An AI PowerPoint Generator", "Generates slides from text", "Can enhance existing presentations"],
                    "image_query": "artificial intelligence"
                }
            ]
        }
    
    # Determine which LLM provider to use (default: Groq)
    provider = os.getenv("LLM_PROVIDER", "groq").lower()

    # Determine slide count based on selection
    if "Short" in slide_length:
        num_slides = "3-5"
    elif "Long" in slide_length:
        num_slides = "11-15"
    else:
        num_slides = "7-10"

    # Build the enhanced prompt
    system_prompt = """
    You are an elite Presentation Designer at a top-tier management consulting firm (e.g., McKinsey, BCG, Bain) or tech giant (e.g., Apple).
    Your goal is to build a narrative-driven, exceptionally high-quality presentation that tells a compelling story, not just a list of facts.

    ### CRITICAL INSTRUCTIONS:
    1. **Analyze the Request Carefully:** 
       - If the user's prompt is completely vague (e.g., "Marketing", "Space", "AI"), you MUST return a JSON object with `type: "question"` and exactly 3 clarifying questions. Do not generate a presentation for a 1-word prompt without context.
    2. **Structure & Quantity:** 
       - If the prompt has enough detail (or is based on a document/transcript), return a JSON object with `type: "presentation"`.
       - **Quantity:** You MUST generate between **{num_slides}** slides. Do not just pick the lowest number. Intelligently choose the exact number of slides based on how much detail the topic requires.
    3. **Design & Content Rules (Strict):**
       - **Adaptive Tone:** Perfect your tone for the specific audience hinted in the prompt. If it is a "case study" or "financial report," use highly professional, strictly factual, and deep analytical language. If it is for "school children" or "beginners," use simple, engaging, and easy-to-understand language.
       - **Theme Color**: Provide a "theme_color" hex code at the root level that matches the emotional tone of the presentation (e.g., "#10b981" for eco, "#3b82f6" for tech, "#8b5cf6" for creativity).
       - **Title Slide:** Slide 1 MUST use `layout: "title"`. Content MUST be a single strong subtitle string. No lists.
       - **Content Density:** Use a "Pyramid Principle" approach. Each bullet point should start with a clear insight, followed by 1-2 sentences of detailed explanation.
       - **Varied Layouts:** Intelligently use different layouts: `title`, `content`, `image_right`, `two_columns`, `big_quote`, and crucially **`chart`**.
       - **Smart Charts (NEW!):** If the slide discusses data, trends, comparisons, or metrics, you MUST use `layout: "chart"`. You must provide a `chart_data` object containing `type` (bar, pie, or line), `chart_title` (a concise insight, e.g., "Revenue Doubled in 2023"), `categories` (array of strings), and `series` (array of objects with `name` and `values` array). The chart values should be realistic for the topic.
       - **Image Queries:** For visual slides, provide a highly specific, high-quality search term for Pexels.
       - **Speaker Notes:** Write a full, dramatic, and persuasive script for the presenter.

    ### JSON OUTPUT FORMAT (Presentation):
    {
      "type": "presentation",
      "data": {
          "title": "A Compelling, Professional Title",
          "theme_color": "#2563eb",
          "slides": [
            {
              "layout": "chart",
              "title": "Unprecedented Growth in Q4",
              "content": ["Revenue skyrocketed due to strategic AI adoption.", "Cost centers were stabilized."],
              "chart_data": {
                  "type": "bar",
                  "chart_title": "Q4 Revenue vs Costs (in Millions)",
                  "categories": ["Q1", "Q2", "Q3", "Q4"],
                  "series": [
                      {"name": "Revenue", "values": [120, 150, 180, 290]},
                      {"name": "Costs", "values": [100, 105, 110, 115]}
                  ]
              },
              "speaker_notes": "As you can see on this chart..."
            },
            {
              "layout": "image_right",
              "title": "Slide Headline",
              "content": ["Core Insight 1: Provide detail..."],
              "image_query": "futuristic data analytics center",
              "speaker_notes": "Welcome everyone..."
            }
          ]
      }
    }
    
    Response MUST be valid JSON only. Do not wrap in markdown unless it's strictly the JSON block.
    Input context:
    """
    
    full_prompt = system_prompt + md_text

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # Configure based on provider
    if provider == "groq":
        api_url = "https://api.groq.com/openai/v1/chat/completions"
        model = "llama-3.3-70b-versatile" 
    elif provider == "openrouter":
        api_url = "https://aipipe.org/openrouter/v1/chat/completions"
        model = "openai/gpt-4.1"
    else:
        raise ValueError(f"Unknown LLM provider: {provider}")
    
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": full_prompt}],
        "max_tokens": 4000,
        "temperature": 0.7,
        "response_format": {"type": "json_object"} 
    }
    
    response = requests.post(api_url, headers=headers, json=payload)
    
    if response.status_code != 200:
        raise Exception(f"API Error ({response.status_code}): {response.text}")
    
    response_json = response.json()
    
    if 'choices' not in response_json:
        raise Exception(f"Invalid API response - missing 'choices'. Response: {response_json}")
    
    content = response_json['choices'][0]['message']['content']
    
    # Clean up
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
        
    try:
        data = json.loads(content)
        
        # Normalize response structure if the LLM messes up the top-level wrapper
        if "slides" in data and "type" not in data:
            # It just returned the presentation data directly
            return {"type": "presentation", "data": data}
            
        return data
    except json.JSONDecodeError as e:
        print(f"Failed to decode JSON: {content}")
        raise e