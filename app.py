from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import traceback
import logging
from werkzeug.utils import secure_filename
import json
import math
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Configuration
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg'}

# Static data for testing
STATIC_PREDICTION = {
    "predicted_dish": "Isombe",
    "confidence": 0.95,
    "nutritional_info": {
        "Name": "Isombe",
        "Calories": 350,
        "Protein (g)": 15.5,
        "Carbs (g)": 45.2,
        "Total Fat (g)": 12.3,
        "Fiber (g)": 8.7,
        "Ingredients": "Cassava leaves, Eggplant, Palm oil, Onions, Spinach"
    },
    "recommendations": [
        {
            "Name": "Igisafuliya",
            "Calories": 280,
            "Protein (g)": 18.2,
            "Carbs (g)": 35.5,
            "Total Fat (g)": 9.8,
            "Fiber (g)": 6.5
        },
        {
            "Name": "Matoke",
            "Calories": 320,
            "Protein (g)": 12.5,
            "Carbs (g)": 42.3,
            "Total Fat (g)": 11.2,
            "Fiber (g)": 7.8
        }
    ]
}

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Ensure uploads directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/calorie-tracker')
def calorie_tracker():
    return render_template('calorie_tracker.html')

@app.route('/meal-plan')
def meal_plan():
    return render_template('meal_plan.html')

@app.route('/profile')
def profile():
    return render_template('profile.html')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                             'favicon.ico', mimetype='image/vnd.microsoft.icon')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image uploaded'}), 400

        image = request.files['image']
        if image.filename == '':
            return jsonify({'error': 'No image selected'}), 400

        if not allowed_file(image.filename):
            return jsonify({'error': 'Invalid file type'}), 400

        filename = secure_filename(image.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        image.save(filepath)

        # Return static prediction for testing
        return jsonify(STATIC_PREDICTION)

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

    finally:
        if 'filepath' in locals() and os.path.exists(filepath):
            os.remove(filepath)

def get_user_profile():
    return {
        'age': 30,
        'gender': 'Male',
        'height': 170,
        'weight': 70,
        'activity_level': 'Moderately Active',
        'health_goal': 'lose_weight',
        'dietary_restrictions': ['lactose intolerant']
    }

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)