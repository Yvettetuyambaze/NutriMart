# NutriMart

Rwandan nutrition platform with AI-powered food recognition, calorie tracking, and meal planning.

## Features

- **Food Recognition** — Upload a photo of Rwandan food for AI-powered nutrition analysis
- **Calorie Tracker** — Daily calorie and macro tracking dashboard
- **Meal Plans** — Weekly Rwandan cuisine meal plans with grocery lists
- **Recipes** — Browse 24+ traditional Rwandan dishes with nutrition data
- **Profile** — BMI tracking and health profile management

## Quick Start (Local)

```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Run the app
python app.py
```

Open http://localhost:10000

## ML Model Setup

Food recognition requires the TensorFlow model file:

```
RwandanFoodAI/models/best_model_MobileNetV2.h5
```

Without this file, all other features work normally — only `/predict` is disabled.

## Deploy to Render (Free)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) and create a new **Web Service**
3. Connect your GitHub repo
4. Render will auto-detect `render.yaml` — or set manually:
   - **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt && pip install "keras==3.4.1" "namex" "optree" "ml-dtypes" "rich"`
   - **Start Command:** `gunicorn --config gunicorn.conf.py wsgi:app`
   - **Health Check Path:** `/health`
5. Deploy — your app will be live at `https://nutrimart.onrender.com`

## Deploy with Docker

```bash
docker build -t nutrimart .
docker run -p 10000:10000 nutrimart
```

## Deploy to Railway / Heroku

```bash
# Heroku
heroku create nutrimart-app
git push heroku main

# Railway — connect repo via dashboard, uses Procfile automatically
```

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Home — food recognition |
| GET | `/calorie-tracker` | Calorie dashboard |
| GET | `/meal-plan` | Weekly meal plan |
| GET | `/profile` | User profile |
| GET | `/recipes` | Recipe browser |
| GET | `/health` | Health check |
| GET | `/api/calorie-data` | Calorie tracking data |
| GET | `/api/meal-plan?day=1` | Meal plan for day |
| GET | `/api/recipes` | All recipes JSON |
| POST | `/predict` | Food image recognition |

## Tech Stack

- **Backend:** Flask 2.3, Gunicorn
- **ML:** TensorFlow 2.8, MobileNetV2
- **Frontend:** Vanilla JS, Chart.js, Inter font
- **Data:** Rwandan food nutrition CSV (24 dishes)

## Project Structure

```
NutriMart/
├── app.py                  # Flask application
├── food_recognition.py     # ML inference module
├── wsgi.py                 # Production WSGI entry
├── gunicorn.conf.py        # Gunicorn config
├── templates/              # Jinja2 templates
├── static/                 # CSS, JS, images
├── RwandanFoodAI/          # ML model & nutrition data
├── Dockerfile              # Container deployment
├── render.yaml             # Render.com config
└── Procfile                # Heroku/Railway config
```
