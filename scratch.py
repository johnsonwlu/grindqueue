# rough idea - study roadmap tool
# open urls one by one with time limits

import webbrowser
import time

sessions = [
    {"url": "https://docs.python.org", "minutes": 30, "label": "Python docs"},
    {"url": "https://fastapi.tiangolo.com", "minutes": 45, "label": "FastAPI"},
    {"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "minutes": 20, "label": "break"},
]

def run_session(session):
    print(f"\nStarting: {session['label']} ({session['minutes']} min)")
    webbrowser.open(session["url"])
    time.sleep(session["minutes"] * 60)
    print("Time's up!")

if __name__ == "__main__":
    for s in sessions:
        run_session(s)
        input("Press Enter for next session...")
    print("Done!")
