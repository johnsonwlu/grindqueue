# sketching out what i want to test before writing the actual code
# none of this runs yet

import pytest

# --- plan creation ---

# def test_create_plan():
#     plan = Plan(name="Python study")
#     assert plan.name == "Python study"
#     assert plan.sessions == []

# def test_plan_requires_name():
#     with pytest.raises(ValueError):
#         Plan(name="")

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
#     plan = Plan(name="test")
#     # sessions should come back sorted by order field
#     ...

# def test_session_url_required():
#     with pytest.raises(ValueError):
#         Session(url="", duration_minutes=30)

# def test_session_duration_positive():
#     with pytest.raises(ValueError):
#         Session(url="https://example.com", duration_minutes=0)
