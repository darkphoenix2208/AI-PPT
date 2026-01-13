from youtube_transcript_api import YouTubeTranscriptApi
import re

def get_video_transcript(url):
    """
    Extracts transcript from a YouTube URL.
    Returns a single string of the transcript text.
    """
    try:
        # Extract Video ID
        video_id = None
        patterns = [
            r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
            r'(?:youtu\.be\/)([0-9A-Za-z_-]{11})',
            r'(?:embed\/)([0-9A-Za-z_-]{11})'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                video_id = match.group(1)
                break
        
        if not video_id:
            raise ValueError("Invalid YouTube URL")

        # Fetch Transcript
        try:
            # New API usage for v1.2.3+
            api = YouTubeTranscriptApi()
            transcript = api.fetch(video_id)
            # transcript is a FetchedTranscript object which is iterable or has snippets
            # Try to iterate directly first (assuming it yields snippets with 'text')
            # Check if it has to_raw_data
            if hasattr(transcript, 'to_raw_data'):
                 data = transcript.to_raw_data() # Returns list of dicts [{'text':...}]
                 full_text = " ".join([entry['text'] for entry in data])
            else:
                 # Fallback: assume it is iterable like list of dicts or objects
                 # If objects, they might be Snippet objects
                 full_text = ""
                 for entry in transcript:
                     if isinstance(entry, dict) and 'text' in entry:
                         full_text += entry['text'] + " "
                     elif hasattr(entry, 'text'):
                         full_text += entry.text + " "
                     else:
                         full_text += str(entry) + " "
        except Exception:
             # Fallback to static method if for some reason we are on old version
             transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
             full_text = " ".join([entry['text'] for entry in transcript_list])
        
        # Limit token count (approx 3000 words to be safe)
        words = full_text.split()
        if len(words) > 3000:
            full_text = " ".join(words[:3000])
            
        return full_text

    except Exception as e:
        raise Exception(f"Failed to get transcript: {str(e)}")
