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
    You are a top-tier Presentation Designer (McKinsey/Apple style).
    Your goal is to tell a compelling story, not just list facts.

    ### INSTRUCTIONS:
    1. **Analyze the Request:** 
       - If the topic is vague (e.g., just "Marketing" or "Space"), return a JSON object with `type: "question"` and 3 clarifying questions.
    2. **Structure:** 
       - If detailed, return a JSON object with `type: "presentation"`.
       - **Quantity:** You MUST generate between **{num_slides}** slides. THIS IS CRITICAL.
    3. **Design Rules:**
       - **Title Slide:** The FIRST slide MUST use `layout: "title"`. **CONTENT MUST BE A SINGLE SUBTITLE STRING** (e.g., "Presented by X"). NO lists/bullets.
       - **Content Density:** (For non-title slides) Provide **DETAILED, SUBSTANTIAL** information. Avoid short phrases. Each bullet point must be 1-2 full sentences explaining the concept.
       - **Varied Layouts:** Use different layouts (`title`, `content`, `image_right`, `big_quote`).
       - **Speaker Notes:** Write a detailed script for the presenter.
       - **Review Questions:** The LAST slide MUST be titled "Review Questions" with 3-5 questions.

    ### JSON OUTPUT FORMAT (Presentation):
    {
      "type": "presentation",
      "data": {
          "title": "Presentation Title",
          "slides": [
            {
              "layout": "image_right",
              "title": "Slide Title",
              "content": ["Detailed Point 1: Explain the concept fully here.", "Detailed Point 2: Provide context and examples."],
              "image_query": "specific search term",
              "speaker_notes": "Script for the speaker..."
            }
          ]
      }
    }

    ### FEW-SHOT EXAMPLES (LEARN FROM THESE):

    **Example 1: Vague Request (User says "Space") -> Output:**
    {
      "type": "question",
      "questions": [
          "Are you interested in the history of space exploration or future missions?",
          "Who is the target audience: students, investors, or general public?",
          "Should we focus on technical engineering or scientific discoveries?"
      ]
    }

    **Example 2: Bad Presentation Output (Too Short):**
    {
      "layout": "content",
      "title": "AI Benefits",
      "content": ["Efficiency", "Speed"],
      "speaker_notes": "AI is fast."
    }

    **Example 3: GOOD Presentation Output (Detailed & Rich):**
    {
      "layout": "content",
      "title": "The Impact of AI",
      "content": [
          "AI significantly improves operational efficiency by automating repetitive tasks, allowing humans to focus on creative strategy.",
          "Machine learning algorithms process data at speeds impossible for humans, leading to faster decision-making cycles in business.",
          "By reducing human error in data entry and analysis, AI ensures higher accuracy and reliability in critical reports."
      ],
      "image_query": "data processing visualization",
      "speaker_notes": "Start by discussing efficiency. Explain how automation frees up time. Then move to speed..."
    }
    
    Response must be valid JSON only.
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