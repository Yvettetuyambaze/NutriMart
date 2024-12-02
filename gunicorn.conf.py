import multiprocessing

# Server socket
bind = "0.0.0.0:$PORT"
backlog = 2048

# Worker processes
workers = 1  # Keep this at 1 for memory constraints
worker_class = 'sync'
worker_connections = 1000
timeout = 300
keepalive = 2

# Logging
accesslog = '-'
errorlog = '-'
loglevel = 'info'

# Process naming
proc_name = 'gunicorn_nutrimart'

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL
keyfile = None
certfile = None

# Server hooks
def on_starting(server):
    server.log.info("Starting Nutrimart server...")

def on_reload(server):
    server.log.info("Reloading Nutrimart server...")

def post_fork(server, worker):
    server.log.info(f"Worker spawned (pid: {worker.pid})")

# Reduce memory usage
worker_tmp_dir = '/dev/shm'