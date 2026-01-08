# thinking through the data model before writing any real code

# --- core entities ---

# User
# id, email, password_hash

# Plan
# id, user_id, name, description, created_at

# Session (one block within a plan)
# id, plan_id, url, label, duration_minutes, order

# Run (active execution of a plan)
# id, user_id, plan_id, current_session_index, status, lock_mode, started_at

# status options: running | paused | completed

# --- relationships ---
# user has many plans
# plan has many sessions (ordered)
# user has many runs
# run belongs to one plan

# --- api routes rough sketch ---
# POST /plans           create plan
# GET  /plans           list plans
# POST /plans/:id/sessions   add session to plan
# PUT  /plans/:id/sessions/reorder

# POST /runs            start a run (plan_id, lock_mode)
# GET  /runs/active     get current run
# POST /runs/:id/advance   move to next session
# POST /runs/:id/pause
# POST /runs/:id/resume
