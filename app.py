from flask import Flask, render_template, request, jsonify, send_from_directory
from food_recognition import predict_dish, get_nutritional_info, get_personalized_recommendations
import os
import logging
from werkzeug.utils import secure_filename

app = Flask(__name__)
# Configuration
app.config.update(
    UPLOAD_FOLDER='static/uploads',
    MAX_CONTENT_LENGTH=5 * 1024 * 1024,
    ALLOWED_EXTENSIONS={'png', 'jpg', 'jpeg'}
)

logging.basicConfig(level=logging.INFO)
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image uploaded'}), 400
        
        image = request.files['image']
        if image.filename == '' or not allowed_file(image.filename):
            return jsonify({'error': 'Invalid file type. Please upload a PNG or JPG image.'}), 400

        filepath = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(image.filename))
        image.save(filepath)

        try:
            predicted_dish, confidence = predict_dish(filepath)
            nutritional_info = get_nutritional_info(predicted_dish)
            recommendations = get_personalized_recommendations(get_user_profile(), nutritional_info)

            response = {
                'status': 'success',
                'predicted_dish': predicted_dish,
                'confidence': float(f"{confidence:.2f}"),
                'nutritional_info': nutritional_info,
                'recommendations': recommendations
            }
            return jsonify(response)

        finally:
            if os.path.exists(filepath):
                os.remove(filepath)

    except Exception as e:
        app.logger.error(f"Error during prediction: {str(e)}")
        return jsonify({'error': 'An error occurred during prediction. Please try again.'}), 500

def get_user_profile():
    # You can later expand this to get real user data
    return {
        'age': 30,
        'weight': 70,
        'height': 170,
        'activity_level': 'moderate',
        'health_goal': 'maintain'
    }

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)
