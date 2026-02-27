# grindqueue

A study roadmap tool. Build a plan of what to study, assign time blocks to each resource, and the tool walks you through them one by one.

## what it does

You set up an ordered list of links with time allocations. The tool opens each one for its allotted time, then automatically moves to the next. Optional lock mode prevents you from opening other tabs during a session. A timeline view lets you see your full day plan and where you are in it.

## status

Working on the fastapi backend (plans, sessions, runs). Chrome extension next.

## features

- define study plans with ordered sessions (url + label + duration)
- auto-advance to next session when time is up
- lock mode: enforce focus, no new tabs allowed
- timeline view: see full day plan and track progress
- chrome extension (manifest v3)

## stack

- chrome extension (manifest v3)
- fastapi + sqlalchemy (async)
- postgresql
- python-dotenv for config

## setup

```bash
git clone https://github.com/johnsonwlu/grindqueue
cd grindqueue
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# edit .env — set DATABASE_URL and SECRET_KEY

uvicorn app.main:app --reload
```

## data model

```
Plan        name, description
Session     url, label, duration_minutes, order
Run         plan_id, current_session_index, status, lock_mode
```
