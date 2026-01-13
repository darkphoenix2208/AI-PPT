from modules.youtube import get_video_transcript
from youtube_transcript_api import YouTubeTranscriptApi
import sys

url = "https://www.youtube.com/watch?v=bSiSrZO8nV0"
try:
    print(f"Testing URL: {url}")
    # Inspect what methods are available
    print("Available methods:", dir(YouTubeTranscriptApi))
    
    # Try fetch if it exists
    if hasattr(YouTubeTranscriptApi, 'fetch'):
        print("Trying fetch...")
        # assuming fetch takes video_id?
        # Extract ID
        import re
        match = re.search(r'v=([0-9A-Za-z_-]{11})', url)
        if match:
           vid = match.group(1)
           print(f"Video ID: {vid}")
           # try different signatures?
           try:
               api = YouTubeTranscriptApi()
               print("Instantiated API. Trying api.fetch(vid)...")
               try:
                   t = api.fetch(vid)
                   print(f"api.fetch success. Type: {type(t)}")
                   print(f"Attributes: {dir(t)}")
               except Exception as e:
                   print(f"api.fetch failed: {e}")
               
               print("Trying api.list(vid)...")
               try:
                   t = api.list(vid)
                   print(f"api.list success. Type: {type(t)}")
               except Exception as e:
                   print(f"api.list failed: {e}")

           except Exception as e:
                print(f"Instance fetch failed: {e}")
                try:
                    t = YouTubeTranscriptApi.get_transcript(vid)
                    print("Static get_transcript result:", t)
                except Exception as ex:
                    print(f"Static get_transcript failed: {ex}") 


    # Back to original attempt helper
    # transcript = get_video_transcript(url)
except Exception as e:
    print(f"Error: {e}")
