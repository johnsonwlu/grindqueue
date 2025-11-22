# plan + session tests
# most still commented out until the models exist

import pytest


# --- plan creation ---

# def test_create_plan():
#     plan = Plan(name="Python study")
#     assert plan.name == "Python study"
#     assert plan.sessions == []

# def test_plan_requires_name():
#     with pytest.raises(ValueError):
#         Plan(name="")

# def test_plan_total_duration():
#     plan = Plan(name="test")
#     plan.sessions = [
#         Session(url="https://a.com", duration_minutes=30),
#         Session(url="https://b.com", duration_minutes=45),
#     ]
#     assert plan.total_duration_minutes == 75


# --- sessions ---

# def test_add_session_to_plan():
#     plan = Plan(name="test")
#     session = Session(
#         url="https://docs.python.org",
#         duration_minutes=30,
#         label="Python docs"
#     )
#     plan.add_session(session)
#     assert len(plan.sessions) == 1

# def test_sessions_returned_in_order():
#     # sessions should come back sorted by order field
#     ...

# def test_session_url_required():
#     with pytest.raises(ValueError):
#         Session(url="", duration_minutes=30)

# def test_session_duration_positive():
#     with pytest.raises(ValueError):
#         Session(url="https://example.com", duration_minutes=0)


# --- api ---

# def test_list_plans_empty(client):
#     res = client.get("/plans/")
#     assert res.status_code == 200
#     assert res.json() == []

# def test_create_plan_api(client, sample_plan):
#     res = client.post("/plans/", json=sample_plan)
#     assert res.status_code == 201
#     data = res.json()
#     assert data["name"] == sample_plan["name"]
#     assert "id" in data
