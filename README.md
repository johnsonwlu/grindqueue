# grindqueue

A study roadmap tool. Build a plan of what to study, assign time blocks to each resource, and the tool walks you through them one by one.

## idea

You set up an ordered list of links with time allocations. The tool opens each one for its allotted time, then automatically moves to the next. Optional lock mode prevents you from opening other tabs during a session.

## planned features

- define study plans with ordered sessions (url + label + duration)
- auto-advance to next session when time is up
- lock mode: enforce focus, no new tabs
- timeline view: see full day plan and current progress
- chrome extension so it can actually control the browser

## stack (thinking)

- chrome extension for tab management
- fastapi backend to store plans (so it works across devices)
- postgresql

## rough data model

```
Plan
  - name
  - list of sessions

Session
  - url
  - label
  - duration (minutes)
  - order

Run (active execution of a plan)
  - which plan
  - current session index
  - started at
```
