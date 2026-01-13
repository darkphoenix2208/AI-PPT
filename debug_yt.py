try:
    from youtube_transcript_api import YouTubeTranscriptApi
    print("Import successful")
    print("Dir:", dir(YouTubeTranscriptApi))
    print("Has get_transcript:", hasattr(YouTubeTranscriptApi, 'get_transcript'))
except Exception as e:
    print(f"Import Error: {e}")
