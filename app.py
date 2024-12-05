from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import logging
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Configuration
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB limit
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg'}

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Static test data
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
        "Ingredients": "Cassava leaves, Eggplant, Palm oil, Onions, Spinach, Traditional spices",
        "Description": "A traditional Rwandan dish made with cassava leaves",
        "Category": "Main Course",
        "Region": "Rwanda",
        "Preparation Time": "45 minutes",
        "Serving Size": "1 bowl (250g)"
    },
    "recommendations": [
        {
            "Name": "Igisafuliya",
            "Calories": 280,
            "Protein (g)": 18.2,
            "Carbs (g)": 35.5,
            "Total Fat (g)": 9.8,
            "Fiber (g)": 6.5,
            "Ingredients": "Mixed vegetables, Beans, Potatoes, Traditional spices"
        },
        {
            "Name": "Matoke",
            "Calories": 320,
            "Protein (g)": 12.5,
            "Carbs (g)": 42.3,
            "Total Fat (g)": 11.2,
            "Fiber (g)": 7.8,
            "Ingredients": "Green bananas, Onions, Tomatoes, Spices"
        },
        {
            "Name": "Ubugali",
            "Calories": 290,
            "Protein (g)": 14.3,
            "Carbs (g)": 38.7,
            "Total Fat (g)": 10.5,
            "Fiber (g)": 5.9,
            "Ingredients": "Cassava flour, Water, Traditional accompaniments"
        }
    ]
}

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

        if image:
            # Save the image temporarily
            filename = secure_filename(image.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            image.save(filepath)

            # Return static prediction data
            return jsonify(STATIC_PREDICTION)

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return jsonify({'error': 'Error processing image'}), 500

    finally:
        # Clean up uploaded file if it exists
        if 'filepath' in locals() and os.path.exists(filepath):
            os.remove(filepath)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)