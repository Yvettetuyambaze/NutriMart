# Remove the entire content of gunicorn.conf.py if it exists
# This file should not contain any model loading code
bind = "0.0.0.0:$PORT"
workers = 1
timeout = 120
