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

@app.route('/process',methods=['POST'])
def process():
    try:
        text = request.form.get('text')
        files = request.files.getlist('files[]')
        apikey = request.form.get('api_key')
        theme_color_hex = request.form.get('theme_color', '2980b9')  # Default blue
        slide_length = request.form.get('slide_length', 'Medium (6-10)')

        if not text:
            text = ''

        if not apikey:
            return {"error": "API Key is required"}, 400
            
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
        print(f"Error: {str(e)}")
        return {"error": str(e)}, 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5069,debug=True)