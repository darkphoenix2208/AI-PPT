from flask import Flask, render_template,request, send_file
from flask_cors import CORS
from modules.ppt_to_markdown import pptx_to_markdown
from io import BytesIO
from modules.ppt import create_ppt
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, template_folder='templates')
CORS(app)


@app.route('/')
def start():
    return render_template('index.html')

@app.route('/api/generate_outline', methods=['POST'])
def generate_outline():
    try:
        import os
        text = request.form.get('text')
        files = request.files.getlist('files[]')
        apikey = request.form.get('api_key')
        
        if not apikey:
             apikey = os.getenv("API_KEY") # Try to get it from environment
             # If API_KEY is set in PEXELS_API_KEY, let's use a generic LLM_API_KEY instead
             if not apikey:
                  apikey = os.getenv("LLM_API_KEY")

        slide_length = request.form.get('slide_length', 'Medium (6-10)')

        if not text:
            text = ''

        if not apikey:
            return {"error": "API Key is required. Please set LLM_API_KEY in .env or provide it."}, 400
            
        # Check for YouTube URL
        if 'youtube.com' in text or 'youtu.be' in text:
            from modules.youtube import get_video_transcript
            try:
                print(f"Detected YouTube URL, fetching transcript...")
                transcript = get_video_transcript(text)
                text = f"Generate a presentation based on this video transcript:\n\n{transcript}"
            except Exception as e:
                return {"error": f"YouTube Error: {str(e)}"}, 400

        md_results = []
        for f in files:
            if f.filename.endswith(".pptx") or f.filename.endswith(".ppt"):
                pptx_bytes = f.read()
                from modules.ppt_to_markdown import pptx_to_markdown
                md = pptx_to_markdown(pptx_bytes)
                md_results.append(md)
        
        fans = 'Prompt:'+text+'\n\nPPT Contents:\n\n'+'\n\n'.join(md_results)
        
        from modules.llm import ask_llm
        llm_response = ask_llm(fans, apikey, slide_length)
        
        if isinstance(llm_response, dict):
            if llm_response.get('type') == 'question':
                return {"type": "question", "questions": llm_response.get('questions', [])}, 200
            elif llm_response.get('type') == 'presentation':
                return {"type": "presentation", "data": llm_response.get('data')}, 200
            else:
                return {"type": "presentation", "data": llm_response}, 200
        else:
             return {"error": "Unexpected response format from LLM"}, 500
             
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500

@app.route('/api/generate_ppt', methods=['POST'])
def build_ppt():
    try:
        import os
        import json
        
        # Get data payload
        data_str = request.form.get('data')
        if not data_str:
            return {"error": "Missing presentation data"}, 400
            
        ppt_data = json.loads(data_str)
        
        theme_color_hex = request.form.get('theme_color', '2980b9')
        
        # Determine theme rgb and background path
        hex_color = theme_color_hex.lstrip('#')
        if len(hex_color) == 6:
            theme_rgb = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
        else:
            theme_rgb = (41, 128, 185)

        background_image_path = "static/bg.jpg"
        if theme_color_hex == '2980b9':
             background_image_path = "static/bg_blue.jpg"
        elif theme_color_hex == '0f172a':
             background_image_path = "static/bg_dark.jpg"

        # Handle base template (passed manually if needed, or default)
        # We can accept an optional file upload here for base template in future
        base_ppt_path = None
        
        # Generator PPT
        ppt_bytes = BytesIO()
        create_ppt(
            ppt_data, 
            theme_color=theme_rgb, 
            base_ppt=base_ppt_path, 
            background_image=background_image_path
        ).save(ppt_bytes)
        
        ppt_bytes.seek(0)
        return send_file(
            ppt_bytes,
            as_attachment=True,
            download_name="presentation.pptx",
            mimetype="application/vnd.openxmlformats-officedocument.presentationml.presentation"
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500

@app.route('/api/from_extension', methods=['POST'])
def from_extension():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return {"error": "No text provided"}, 400
            
        text = data.get('text')
        
        import os
        import google.generativeai as genai
        
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("LLM_API_KEY")
        if not api_key:
             return {"error": "Gemini API Key missing"}, 500
             
        genai.configure(api_key=api_key)
        
        # Use newer gemini model
        model = genai.GenerativeModel('gemini-2.5-flash', generation_config={"response_mime_type": "application/json"})
        
        prompt = f"""
        Analyze the following web page content/transcript and convert it into a professional presentation.
        Output MUST be Valid JSON matching this format:
        {{
            "title": "Presentation Title",
            "theme_color": "#0f172a",
            "slides": [
                {{
                    "layout": "title",
                    "title": "Main Presentation Title",
                    "content": ["Subtitle or brief description"]
                }},
                {{
                    "layout": "content",
                    "title": "Slide Title",
                    "content": ["Point 1", "Point 2"],
                    "speaker_notes": "What to say"
                }}
            ]
        }}
        
        Ensure you extract the key themes, ignore UI clutter, and structure a logical narrative of 5-10 slides.
        
        Text Content:
        {text[:100000]} # Limit to 100k chars for safety
        """
        
        response = model.generate_content(prompt)
        import json
        ppt_data = json.loads(response.text)
        
        # Build PPT
        theme_rgb = (41, 128, 185) # default
        background_image_path = "static/bg.jpg"
        
        ppt_bytes = BytesIO()
        create_ppt(
            ppt_data, 
            theme_color=theme_rgb, 
            background_image=background_image_path
        ).save(ppt_bytes)
        
        ppt_bytes.seek(0)
        return send_file(
            ppt_bytes,
            as_attachment=True,
            download_name="presentation.pptx",
            mimetype="application/vnd.openxmlformats-officedocument.presentationml.presentation"
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500

@app.route('/process',methods=['POST'])
def process():
    try:
        import os
        text = request.form.get('text')
        files = request.files.getlist('files[]')
        apikey = request.form.get('api_key')
        if not apikey:
             apikey = os.getenv("API_KEY") # Try to get it from environment
             # If API_KEY is set in PEXELS_API_KEY, let's use a generic LLM_API_KEY instead
             if not apikey:
                  apikey = os.getenv("LLM_API_KEY")

        theme_color_hex = request.form.get('theme_color', '2980b9')  # Default blue
        slide_length = request.form.get('slide_length', 'Medium (6-10)')

        if not text:
            text = ''

        if not apikey:
            return {"error": "API Key is required. Please set LLM_API_KEY in .env or provide it."}, 400
            
        # Check for YouTube URL
        if 'youtube.com' in text or 'youtu.be' in text:
            from modules.youtube import get_video_transcript
            try:
                print(f"Detected YouTube URL, fetching transcript...")
                transcript = get_video_transcript(text)
                text = f"Generate a presentation based on this video transcript:\n\n{transcript}"
            except Exception as e:
                return {"error": f"YouTube Error: {str(e)}"}, 400

        # Convert hex color to RGB tuple
        hex_color = theme_color_hex.lstrip('#')
        if len(hex_color) == 6:
            theme_rgb = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
        else:
            theme_rgb = (41, 128, 185)  # Default blue

        # Map themes to background images
        background_image_path = "static/bg.jpg"
        if theme_color_hex == '2980b9': # Professional Blue
             background_image_path = "static/bg_blue.jpg"
        elif theme_color_hex == '0f172a': # Dark Default
             background_image_path = "static/bg_dark.jpg"

        md_results = []
        base_ppt_path = None

        for f in files:
            if f.filename.endswith(".pptx") or f.filename.endswith(".ppt"):
                pptx_bytes = f.read()
                
                # Save the first PPTX to use as a template (preserve theme)
                if not base_ppt_path:
                    base_ppt_path = "temp_template.pptx"
                    with open(base_ppt_path, "wb") as temp_f:
                        temp_f.write(pptx_bytes)
                
                md = pptx_to_markdown(pptx_bytes)
                md_results.append(md)
        
        fans = 'Prompt:'+text+'\n\nPPT Contents:\n\n'+'\n\n'.join(md_results)
        
        # Import here to get LLM response
        from modules.llm import ask_llm
        llm_response = ask_llm(fans, apikey, slide_length)
        
        # Check if LLM is asking a question
        if isinstance(llm_response, dict):
            if llm_response.get('type') == 'question':
                # Return the questions to the frontend
                return {"type": "question", "questions": llm_response.get('questions', [])}, 200
            
            elif llm_response.get('type') == 'presentation':
                # Use the 'data' field for creating PPT
                ppt_data = llm_response.get('data')
            else:
                # Fallback for legacy or raw response if something goes parsed weirdly
                # Assuming it might be the data dict directly
                ppt_data = llm_response
                
        else:
             return {"error": "Unexpected response format from LLM"}, 500
        
        # Generator PPT
        ppt_bytes = BytesIO()
        create_ppt(
            ppt_data, 
            theme_color=theme_rgb, 
            base_ppt=base_ppt_path, 
            background_image=background_image_path
        ).save(ppt_bytes)
        
        # Cleanup temp template
        if base_ppt_path and os.path.exists(base_ppt_path):
            os.remove(base_ppt_path)
            
        ppt_bytes.seek(0)
        return send_file(
            ppt_bytes,
            as_attachment=True,
            download_name="presentation.pptx",
            mimetype="application/vnd.openxmlformats-officedocument.presentationml.presentation"
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error: {str(e)}")
        return {"error": str(e)}, 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5069,debug=True)