# tests for run logic (active execution of a plan)

import pytest


# --- starting a run ---

# def test_start_run(client, sample_plan):
#     plan = client.post("/plans/", json=sample_plan).json()
#     res = client.post("/runs/", json={"plan_id": plan["id"]})
#     assert res.status_code == 201
#     data = res.json()
#     assert data["status"] == "running"
#     assert data["current_session_index"] == 0

# def test_only_one_active_run(client, sample_plan):
#     plan = client.post("/plans/", json=sample_plan).json()
#     client.post("/runs/", json={"plan_id": plan["id"]})
#     res = client.post("/runs/", json={"plan_id": plan["id"]})
#     assert res.status_code == 400


# --- advancing ---

# def test_advance_run(client, sample_plan):
#     plan = client.post("/plans/", json=sample_plan).json()
#     run = client.post("/runs/", json={"plan_id": plan["id"]}).json()
#     res = client.post(f"/runs/{run['id']}/advance")
#     assert res.status_code == 200
#     assert res.json()["current_session_index"] == 1

# def test_advance_last_session_completes_run(client, sample_plan):
#     # advancing past the last session should mark run as completed
#     ...


# --- pause / resume ---

# def test_pause_run(client, sample_plan):
#     plan = client.post("/plans/", json=sample_plan).json()
#     run = client.post("/runs/", json={"plan_id": plan["id"]}).json()
#     res = client.post(f"/runs/{run['id']}/pause")
#     assert res.json()["status"] == "paused"

# def test_resume_run(client, sample_plan):
#     ...
