import os

# Server socket configuration
bind = f"0.0.0.0:{os.getenv('PORT', '10000')}"
backlog = 2048

# Worker processes
workers = 1
threads = 4
worker_class = 'sync'
worker_connections = 1000
timeout = 120
keepalive = 2

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# Logging - Simplified
accesslog = '-'
errorlog = '-'
loglevel = 'info'
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'
capture_output = True

# Server hooks
def on_starting(server):
    server.log.info("Starting Nutrimart server...")

def post_fork(server, worker):
    server.log.info(f"Worker spawned (pid: {worker.pid})")

# Performance tuning
max_requests = 1000
max_requests_jitter = 50
graceful_timeout = 30
worker_tmp_dir = '/dev/shm'

# Request limits
limit_request_line = 4096
limit_request_fields = 100
limit_request_field_size = 8190