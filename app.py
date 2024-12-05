from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import traceback
import logging
from werkzeug.utils import secure_filename
from food_recognition import predict_dish, get_nutritional_info, get_personalized_recommendations

app = Flask(__name__)

# Configuration
app.config['UPLOAD_FOLDER'] = os.path.join('static', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB max
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg'}

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Check if image was uploaded
        if 'image' not in request.files:
            return jsonify({'error': 'No image uploaded'}), 400
            
        image = request.files['image']
        if image.filename == '':
            return jsonify({'error': 'No image selected'}), 400
            
        if not allowed_file(image.filename):
            return jsonify({'error': 'Invalid file type'}), 400

        # Save and process the image
        filename = secure_filename(image.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        try:
            image.save(filepath)
            logger.info(f"Image saved to {filepath}")
            
            # Get predictions
            predicted_dish, confidence = predict_dish(filepath)
            nutritional_info = get_nutritional_info(predicted_dish)
            
            # Get recommendations
            user_profile = {
                'age': 30,
                'weight': 70,
                'height': 170,
                'activity_level': 'moderate'
            }
            recommendations = get_personalized_recommendations(user_profile, nutritional_info)
            
            # Prepare response
            response = {
                'predicted_dish': predicted_dish,
                'confidence': round(float(confidence), 4),
                'nutritional_info': nutritional_info,
                'recommendations': recommendations
            }
            
            return jsonify(response)
            
        except Exception as e:
            logger.error(f"Processing error: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({'error': 'Error processing image'}), 500
        finally:
            # Clean up uploaded file
            if os.path.exists(filepath):
                os.remove(filepath)
                
    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Server error'}), 500

# Additional routes
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

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)