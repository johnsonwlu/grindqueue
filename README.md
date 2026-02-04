# grindqueue

A study roadmap tool. Build a plan of what to study, assign time blocks to each resource, and the tool walks you through them one by one.

## idea

You set up an ordered list of links with time allocations. The tool opens each one for its allotted time, then automatically moves to the next. Optional lock mode prevents you from opening other tabs during a session.

## approach

Going with a **chrome extension + fastapi backend**. The extension handles all the tab management (opening URLs, enforcing lock mode, countdown timer). The backend stores plans so they sync across devices and can be shared later.

Decided against a pure local extension because having a backend makes it easier to add multi-device sync and eventually share plans with others.

## planned features

- define study plans with ordered sessions (url + label + duration)
- auto-advance to next session when time is up
- lock mode: enforce focus, no new tabs
- timeline view: see full day plan and current progress
- chrome extension so it can actually control the browser

## stack

- chrome extension (manifest v3) for tab management
- fastapi backend to store plans
- postgresql
- sqlalchemy async

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
