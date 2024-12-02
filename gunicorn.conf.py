import multiprocessing
import os

# Server socket configuration
bind = f"0.0.0.0:{os.getenv('PORT', '10000')}"
backlog = 2048

# Worker processes
workers = 1  # Single worker for Render's free tier
threads = 4  # Number of threads per worker
worker_class = 'sync'  # Use sync worker class for Flask
worker_connections = 1000
timeout = 120  # Seconds before timing out a worker
keepalive = 2  # Seconds to keep idle connections alive

# Reload configuration
reload = False
reload_engine = 'auto'
reload_extra_files = []

# Process naming
proc_name = 'nutrimart_gunicorn'

# Logging
accesslog = '-'  # Log to stdout
errorlog = '-'   # Log to stderr
loglevel = 'info'
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'
capture_output = True
enable_stdio_inheritance = True

# Server mechanics
daemon = False
raw_env = []
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None
secure_scheme_headers = {
    'X-FORWARDED-PROTOCOL': 'ssl',
    'X-FORWARDED-PROTO': 'https',
    'X-FORWARDED-SSL': 'on'
}

# SSL settings (if needed)
keyfile = None
certfile = None
ssl_version = 'TLS'
cert_reqs = 0  # SSL.CERT_NONE

# Server hooks
def on_starting(server):
    """
    Called just before the master process is initialized.
    """
    server.log.info("Starting Nutrimart server...")

def on_reload(server):
    """
    Called before reloading the workers.
    """
    server.log.info("Reloading Nutrimart server...")

def pre_fork(server, worker):
    """
    Called just before a worker is forked.
    """
    pass

def post_fork(server, worker):
    """
    Called just after a worker has been forked.
    """
    server.log.info(f"Worker spawned (pid: {worker.pid})")

def pre_exec(server):
    """
    Called just before a new master process is forked.
    """
    server.log.info("Forking master process...")

def when_ready(server):
    """
    Called just after the server is started.
    """
    server.log.info("Server is ready. Spawn workers.")

def worker_int(worker):
    """
    Called just after a worker exited on SIGINT or SIGQUIT.
    """
    worker.log.info("worker received INT or QUIT signal")

def worker_abort(worker):
    """
    Called when a worker received the SIGABRT signal.
    """
    worker.log.info("worker received ABORT signal")

# Process naming
def pre_request(worker, req):
    """
    Called just before a worker processes the request.
    """
    worker.log.debug("%s %s" % (req.method, req.path))

def post_request(worker, req, environ, resp):
    """
    Called after a worker processes the request.
    """
    pass

def child_exit(server, worker):
    """
    Called just after a worker has been exited, in the master process.
    """
    server.log.info(f"Worker exited (pid: {worker.pid})")

# Server resource management
max_requests = 1000  # Restart workers after this many requests
max_requests_jitter = 50  # Add randomness to max_requests
graceful_timeout = 30  # Seconds to wait for workers to finish serving requests
timeout = 120  # Workers silent for more than this many seconds are killed and restarted

# Memory management
worker_tmp_dir = '/dev/shm'  # Using shared memory for better performance
forwarded_allow_ips = '*'  # Allow forwarded requests from all IPs

# Logging configurations
logconfig_dict = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'generic': {
            'format': '%(asctime)s [%(process)d] [%(levelname)s] %(message)s',
            'datefmt': '[%Y-%m-%d %H:%M:%S %z]',
            'class': 'logging.Formatter'
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'generic',
            'stream': 'ext://sys.stdout'
        }
    },
    'root': {
        'level': 'INFO',
        'handlers': ['console']
    }
}

# Error handling
errorlog_maxbytes = 1000000  # 1 MB
errorlog_backups = 2  # Number of errorlog backups to keep

# Performance tuning
sendfile = True
reuse_port = True
tcp_nodelay = True
keepalive_timeout = 2  # Seconds to keep idle client connections

# Prevent memory leaks
limit_request_line = 4096
limit_request_fields = 100
limit_request_field_size = 8190