from flask import Flask, render_template, request, jsonify, send_from_directory
from food_recognition import predict_dish, get_nutritional_info, get_personalized_recommendations
import os
import traceback
import logging
from werkzeug.utils import secure_filename
import json
import math

from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)

app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max-limit

logging.basicConfig(level=logging.DEBUG)

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
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    image = request.files['image']
    if image.filename == '':
        return jsonify({'error': 'No image selected'}), 400

    if image:
        try:
            filename = secure_filename(image.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            image.save(filepath)

            predicted_dish, confidence = predict_dish(filepath)
            nutritional_info = get_nutritional_info(predicted_dish)

            user_profile = get_user_profile()
            recommendations = get_personalized_recommendations(user_profile, nutritional_info)

            # Convert NaN and infinite values to None for JSON serialization
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
            return jsonify({'error': 'Internal Server Error'}), 500

    return jsonify({'error': 'Invalid request'}), 400

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
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True)