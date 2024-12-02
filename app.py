from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import os
import json
import math
import logging
import traceback
from dotenv import load_dotenv

app = Flask(__name__)

# Configuration
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max-limit
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg'}

# Setup logging
logging.basicConfig(level=logging.DEBUG)
load_dotenv()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# Mock functions for demonstration
def predict_dish(image_path):
    # Implement your actual prediction logic here
    return "Rwandan Dish", 0.95

def get_nutritional_info(dish_name):
    # Mock nutritional information
    return {
        "Calories": 350,
        "Protein (g)": 15,
        "Carbs (g)": 45,
        "Total Fat (g)": 12,
        "Fiber (g)": 8,
        "Ingredients": "Rice, beans, vegetables"
    }

def get_personalized_recommendations(user_profile, nutritional_info):
    # Mock recommendations
    return [
        {
            "Name": "Healthy Option 1",
            "Calories": 300,
            "Protein (g)": 20,
            "Carbs (g)": 40,
            "Total Fat (g)": 10,
            "Fiber (g)": 7,
            "Ingredients": "Ingredient list 1"
        },
        {
            "Name": "Healthy Option 2",
            "Calories": 280,
            "Protein (g)": 18,
            "Carbs (g)": 35,
            "Total Fat (g)": 9,
            "Fiber (g)": 6,
            "Ingredients": "Ingredient list 2"
        }
    ]

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

# Routes
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

        if image:
            # Create upload folder if it doesn't exist
            os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
            
            filename = secure_filename(image.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            image.save(filepath)

            predicted_dish, confidence = predict_dish(filepath)
            nutritional_info = get_nutritional_info(predicted_dish)
            user_profile = get_user_profile()
            recommendations = get_personalized_recommendations(user_profile, nutritional_info)

            # Clean values for JSON serialization
            def clean_value(v):
                if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                    return None
                return v

            nutritional_info = {k: clean_value(v) for k, v in nutritional_info.items()}
            recommendations = [{k: clean_value(v) for k, v in dish.items()} for dish in recommendations]

            response = {
                'predicted_dish': predicted_dish,
                'confidence': float(confidence),
                'nutritional_info': nutritional_info,
                'recommendations': recommendations
            }
            
            app.logger.debug(f"Response: {json.dumps(response, indent=2)}")
            return jsonify(response)

    except Exception as e:
        app.logger.error(f"An error occurred: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)