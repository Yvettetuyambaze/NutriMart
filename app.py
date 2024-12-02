from flask import Flask, render_template, request, jsonify, send_from_directory
from food_recognition import predict_dish, get_nutritional_info, get_personalized_recommendations
import os
import traceback
import logging
from werkzeug.utils import secure_filename
import json
import math
from functools import lru_cache
import tensorflow as tf

app = Flask(__name__)

# Configuration
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 8 * 1024 * 1024  # Reduced to 8MB
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg'}

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Configure TensorFlow for memory efficiency
gpus = tf.config.experimental.list_physical_devices('GPU')
if gpus:
    try:
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
    except RuntimeError as e:
        logger.error(f"GPU configuration error: {e}")

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@lru_cache(maxsize=128)
def get_cached_nutritional_info(dish_name):
    return get_nutritional_info(dish_name)

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
            return jsonify({'error': 'Invalid file type. Only PNG, JPG, and JPEG are allowed'}), 400

        if image:
            try:
                filename = secure_filename(image.filename)
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                image.save(filepath)

                # Prediction with error handling
                predicted_dish, confidence = predict_dish(filepath)
                
                # Get cached nutritional info
                nutritional_info = get_cached_nutritional_info(predicted_dish)
                
                # Get user profile
                user_profile = get_user_profile()
                
                # Get recommendations
                recommendations = get_personalized_recommendations(user_profile, nutritional_info)

                # Clean data for JSON serialization
                def clean_value(v):
                    if isinstance(v, float):
                        if math.isnan(v) or math.isinf(v):
                            return None
                        return float(f"{v:.2f}")  # Round to 2 decimal places
                    return v

                nutritional_info = {k: clean_value(v) for k, v in nutritional_info.items()}
                recommendations = [{k: clean_value(v) for k, v in dish.items()} 
                                 for dish in recommendations]

                response = {
                    'predicted_dish': predicted_dish,
                    'confidence': float(f"{confidence:.2f}"),
                    'nutritional_info': nutritional_info,
                    'recommendations': recommendations
                }

                # Clean up uploaded file
                try:
                    os.remove(filepath)
                except Exception as e:
                    logger.warning(f"Failed to remove uploaded file: {e}")

                return jsonify(response)

            except Exception as e:
                logger.error(f"Prediction error: {str(e)}")
                logger.error(traceback.format_exc())
                return jsonify({'error': 'Error processing image'}), 500

    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500

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