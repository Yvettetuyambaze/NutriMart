FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir "keras==3.4.1" "namex" "optree" "ml-dtypes" "rich"

COPY . .

RUN mkdir -p static/uploads RwandanFoodAI/models

ENV PORT=10000
EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:10000/health')" || exit 1

CMD ["gunicorn", "--config", "gunicorn.conf.py", "wsgi:app"]
