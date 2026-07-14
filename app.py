from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from food_recognition import (
    predict_dish, get_nutritional_info, get_personalized_recommendations,
    get_all_recipes, model_available, get_model_status, warm_up_model
)
import database as db
from chatbot import generate_chat_response, nutrition_from_dish
from datetime import datetime, date
from functools import wraps
from werkzeug.security import generate_password_hash
import os
import logging
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.environ.get('SECRET_KEY', 'nutrimart-dev-secret-change-in-production'),
    UPLOAD_FOLDER='static/uploads',
    MAX_CONTENT_LENGTH=5 * 1024 * 1024,
    ALLOWED_EXTENSIONS={'png', 'jpg', 'jpeg'},
)

logging.basicConfig(level=logging.INFO)
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

GROCERY_ITEMS = [
    "Ibishyimbo (Beans)", "Inyama y'inka (Beef)", "Inkoko (Chicken)",
    "Ifi (Fish)", "Ibirayi (Potatoes)", "Ibitoki (Plantain)",
    "Ibishyimbo by'umuceri (Rice)", "Amata (Milk)", "Amagi (Eggs)",
    "Imyumbati (Cassava)", "Udufari (Onions)", "Inyanya (Tomatoes)",
    "Amavuta y'imboga (Vegetable oil)", "Umunyu (Salt)", "Ibinyabiziga (Spices)",
]

DEFAULT_MEAL_PLANS = {
    1: [
        {"type": "breakfast", "name": "Igikoma (Sorghum Porridge)", "calories": 310, "protein": 10, "carbs": 58, "fat": 5},
        {"type": "lunch", "name": "Isombe (Cassava Leaves)", "calories": 280, "protein": 8, "carbs": 14, "fat": 22},
        {"type": "dinner", "name": "Kachumbari (Fresh Veggies)", "calories": 80, "protein": 2, "carbs": 14, "fat": 1},
    ],
    2: [
        {"type": "breakfast", "name": "Umutsima (Corn Flour & Beans)", "calories": 580, "protein": 22, "carbs": 110, "fat": 12},
        {"type": "lunch", "name": "Imvange (Potatoes & Beans)", "calories": 320, "protein": 18, "carbs": 60, "fat": 3},
        {"type": "dinner", "name": "Isosi y'Ibishyimbo (Bean Stew)", "calories": 330, "protein": 22, "carbs": 58, "fat": 4},
    ],
    3: [
        {"type": "breakfast", "name": "Amata n'Imbuto (Milk & Fruits)", "calories": 200, "protein": 8, "carbs": 30, "fat": 5},
        {"type": "lunch", "name": "Ubugari n'Isosi y'Inka (Cassava & Beef)", "calories": 680, "protein": 32, "carbs": 100, "fat": 24},
        {"type": "dinner", "name": "Ifi yokeje (Grilled Tilapia)", "calories": 220, "protein": 42, "carbs": 0, "fat": 5},
    ],
    4: [
        {"type": "breakfast", "name": "Dodo (Amaranth Greens)", "calories": 136, "protein": 8, "carbs": 14, "fat": 8},
        {"type": "lunch", "name": "Isosi y'Inkoko (Chicken Stew)", "calories": 320, "protein": 28, "carbs": 10, "fat": 20},
        {"type": "dinner", "name": "Ibijumba n'Ibishyimbo (Sweet Potatoes & Beans)", "calories": 455, "protein": 27, "carbs": 98, "fat": 1},
    ],
    5: [
        {"type": "breakfast", "name": "Igikoma (Sorghum Porridge)", "calories": 310, "protein": 10, "carbs": 58, "fat": 5},
        {"type": "lunch", "name": "Brochettes (Beef Skewer)", "calories": 320, "protein": 28, "carbs": 2, "fat": 24},
        {"type": "dinner", "name": "Isosi y'Ifi (Fish Stew)", "calories": 280, "protein": 28, "carbs": 12, "fat": 15},
    ],
    6: [
        {"type": "breakfast", "name": "Umunyigi (Mashed Matoke)", "calories": 550, "protein": 5, "carbs": 100, "fat": 15},
        {"type": "lunch", "name": "Agatogo (Green Bananas & Meat)", "calories": 480, "protein": 24, "carbs": 70, "fat": 18},
        {"type": "dinner", "name": "Isambaza (Deep-Fried Fish)", "calories": 380, "protein": 40, "carbs": 1, "fat": 24},
    ],
    7: [
        {"type": "breakfast", "name": "Amata n'Imbuto", "calories": 200, "protein": 8, "carbs": 30, "fat": 5},
        {"type": "lunch", "name": "Umuceri n'Ibishyimbo (Rice & Beans)", "calories": 720, "protein": 28, "carbs": 130, "fat": 12},
        {"type": "dinner", "name": "Isosi y'ihene (Goat Meat Stew)", "calories": 380, "protein": 32, "carbs": 8, "fat": 26},
    ],
}


@login_manager.user_loader
def load_user(user_id):
    return db.get_user_by_id(int(user_id))


def profile_required(f):
    @wraps(f)
    @login_required
    def decorated(*args, **kwargs):
        if not current_user.profile_complete:
            return redirect(url_for('onboarding'))
        return f(*args, **kwargs)
    return decorated


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


def parse_date(value, default=None):
    if not value:
        return (default or date.today()).isoformat()
    if isinstance(value, date):
        return value.isoformat()
    try:
        return datetime.strptime(value, '%Y-%m-%d').date().isoformat()
    except ValueError:
        return (default or date.today()).isoformat()


# ---- Auth routes ----

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('home') if current_user.profile_complete else url_for('onboarding'))

    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        identifier = (data.get('identifier') or data.get('email') or '').strip()
        password = data.get('password', '')
        user = db.get_user_by_identifier(identifier)

        if user and user.check_password(password):
            login_user(user)
            db.seed_meal_plan(user.id, DEFAULT_MEAL_PLANS)
            dest = url_for('onboarding' if not user.profile_complete else 'home')
            if request.is_json:
                return jsonify({'success': True, 'redirect': dest})
            return redirect(dest)

        msg = 'Invalid email/phone or password'
        if request.is_json:
            return jsonify({'error': msg}), 401
        flash(msg, 'error')

    return render_template('login.html')


@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if current_user.is_authenticated:
        return redirect(url_for('home') if current_user.profile_complete else url_for('onboarding'))

    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        name = (data.get('name') or '').strip()
        email = (data.get('email') or '').strip() or None
        phone = (data.get('phone') or '').strip() or None
        password = data.get('password', '')
        confirm = data.get('confirm_password', password)

        if not name or len(password) < 6:
            msg = 'Name and password (6+ chars) are required'
            if request.is_json:
                return jsonify({'error': msg}), 400
            flash(msg, 'error')
            return render_template('signup.html')

        if password != confirm:
            msg = 'Passwords do not match'
            if request.is_json:
                return jsonify({'error': msg}), 400
            flash(msg, 'error')
            return render_template('signup.html')

        if not email and not phone:
            msg = 'Email or phone number is required'
            if request.is_json:
                return jsonify({'error': msg}), 400
            flash(msg, 'error')
            return render_template('signup.html')

        try:
            user = db.create_user(name, email, phone, password)
        except Exception:
            msg = 'Email or phone already registered'
            if request.is_json:
                return jsonify({'error': msg}), 400
            flash(msg, 'error')
            return render_template('signup.html')

        login_user(user)
        db.seed_meal_plan(user.id, DEFAULT_MEAL_PLANS)

        if request.is_json:
            return jsonify({'success': True, 'redirect': url_for('onboarding')})
        return redirect(url_for('onboarding'))

    return render_template('signup.html')


@app.route('/onboarding', methods=['GET', 'POST'])
@login_required
def onboarding():
    if current_user.profile_complete:
        return redirect(url_for('home'))

    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        try:
            dob = data.get('date_of_birth', '')
            height = float(data.get('height', 0))
            weight = float(data.get('weight', 0))
        except (ValueError, TypeError):
            msg = 'Please enter valid height, weight, and date of birth'
            if request.is_json:
                return jsonify({'error': msg}), 400
            flash(msg, 'error')
            return render_template('onboarding.html')

        if height < 100 or height > 250 or weight < 30 or weight > 300:
            msg = 'Please enter realistic height (cm) and weight (kg)'
            if request.is_json:
                return jsonify({'error': msg}), 400
            flash(msg, 'error')
            return render_template('onboarding.html')

        db.update_user(current_user.id, {
            'date_of_birth': dob,
            'height': height,
            'weight': weight,
            'gender': data.get('gender', 'female'),
            'target_weight': float(data.get('target_weight') or weight),
            'activity_level': data.get('activity_level', 'moderate'),
            'profile_complete': 1,
        })

        if request.is_json:
            return jsonify({'success': True, 'redirect': url_for('home')})
        return redirect(url_for('home'))

    return render_template('onboarding.html')


@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))


# ---- Page routes ----

@app.route('/')
@profile_required
def home():
    return render_template('home.html')

@app.route('/calorie-tracker')
@profile_required
def calorie_tracker():
    return render_template('calorie_tracker.html')

@app.route('/meal-plan')
@profile_required
def meal_plan():
    return render_template('meal_plan.html')

@app.route('/profile')
@profile_required
def profile():
    return render_template('profile.html')

@app.route('/recipes')
@profile_required
def recipes():
    return render_template('recipes.html')


# ---- API routes ----

@app.route('/health')
def health():
    status = get_model_status()
    return jsonify({
        'status': 'healthy',
        'model_available': model_available(),
        'model_mode': status['mode'],
        'version': '3.0.0',
    })


@app.route('/api/profile', methods=['GET', 'PUT'])
@login_required
def api_profile():
    if request.method == 'GET':
        return jsonify(current_user.to_profile_dict())

    data = request.get_json() or {}
    fields = {}
    for key in ['name', 'email', 'phone', 'height', 'weight', 'target_weight', 'gender', 'activity_level', 'date_of_birth']:
        if key in data:
            fields[key] = data[key]
    if 'notifications_enabled' in data:
        fields['notifications_enabled'] = 1 if data['notifications_enabled'] else 0
    if 'vegan_preference' in data:
        fields['vegan_preference'] = 1 if data['vegan_preference'] else 0
    if data.get('password') and len(data['password']) >= 6:
        fields['password_hash'] = generate_password_hash(data['password'])

    user = db.update_user(current_user.id, fields)
    return jsonify({'success': True, 'profile': user.to_profile_dict()})


@app.route('/api/calorie-data')
@login_required
def api_calorie_data():
    log_date = parse_date(request.args.get('date'))
    return jsonify(db.get_calorie_data(current_user.id, log_date))


@app.route('/api/meal-logs', methods=['GET', 'POST'])
@login_required
def api_meal_logs():
    if request.method == 'GET':
        log_date = parse_date(request.args.get('date'))
        return jsonify(db.get_calorie_data(current_user.id, log_date)['meals'])

    data = request.get_json() or {}
    log_id = db.add_meal_log(
        current_user.id, parse_date(data.get('date')),
        data.get('meal_type', 'lunch'), data.get('food_name', 'Unknown'),
        data.get('detail', ''), int(data.get('calories', 0)),
        float(data.get('protein', 0)), float(data.get('carbs', 0)),
        float(data.get('fat', 0)), data.get('source', 'manual'),
        data.get('prediction_id'),
    )
    return jsonify({'success': True, 'id': log_id})


@app.route('/api/meal-logs/<int:log_id>', methods=['DELETE'])
@login_required
def delete_meal_log(log_id):
    db.delete_meal_log(current_user.id, log_id)
    return jsonify({'success': True})


@app.route('/api/exercise-logs', methods=['POST'])
@login_required
def api_exercise_logs():
    data = request.get_json() or {}
    log_id = db.add_exercise_log(
        current_user.id, parse_date(data.get('date')),
        data.get('name', 'Exercise'), data.get('detail', ''),
        int(data.get('calories_burned', 0)),
    )
    return jsonify({'success': True, 'id': log_id})


@app.route('/api/exercise-logs/<int:log_id>', methods=['DELETE'])
@login_required
def delete_exercise_log(log_id):
    db.delete_exercise_log(current_user.id, log_id)
    return jsonify({'success': True})


@app.route('/api/food-history')
@login_required
def api_food_history():
    limit = request.args.get('limit', 20, type=int)
    return jsonify({'history': db.get_food_history(current_user.id, limit)})


@app.route('/api/meal-plan')
@login_required
def api_meal_plan():
    day = max(1, min(7, request.args.get('day', 1, type=int)))
    meals, totals = db.get_meal_plan(current_user.id, day)
    return jsonify({
        'day': day, 'week': 1, 'meals': meals, 'totals': totals, 'grocery': GROCERY_ITEMS,
    })


@app.route('/api/meal-plan/items', methods=['POST'])
@login_required
def add_meal_plan_item():
    data = request.get_json() or {}
    nutrition = nutrition_from_dish(data.get('name', ''))
    item_id = db.add_meal_plan_item(
        current_user.id,
        max(1, min(7, int(data.get('day', 1)))),
        data.get('meal_type', 'lunch'),
        data.get('name') or (nutrition['name'] if nutrition else 'Meal'),
        int(data.get('calories') or (nutrition['calories'] if nutrition else 0)),
        int(data.get('protein') or (nutrition['protein'] if nutrition else 0)),
        int(data.get('carbs') or (nutrition['carbs'] if nutrition else 0)),
        int(data.get('fat') or (nutrition['fat'] if nutrition else 0)),
    )
    return jsonify({'success': True, 'id': item_id})


@app.route('/api/meal-plan/items/<int:item_id>', methods=['PUT', 'DELETE'])
@login_required
def manage_meal_plan_item(item_id):
    if request.method == 'DELETE':
        db.delete_meal_plan_item(current_user.id, item_id)
        return jsonify({'success': True})

    data = request.get_json() or {}
    db.update_meal_plan_item(current_user.id, item_id, data)
    return jsonify({'success': True})


@app.route('/api/chat', methods=['POST'])
@login_required
def api_chat():
    data = request.get_json() or {}
    message = (data.get('message') or '').strip()
    day = max(1, min(7, int(data.get('day', 1))))
    if not message:
        return jsonify({'error': 'Message required'}), 400
    response = generate_chat_response(message, current_user.to_profile_dict(), day)
    return jsonify(response)


@app.route('/api/recipes')
@login_required
def api_recipes():
    try:
        recipes = get_all_recipes()
        return jsonify({'recipes': recipes, 'count': len(recipes)})
    except Exception as e:
        app.logger.error(f"Error loading recipes: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/predict', methods=['POST'])
@login_required
def predict():
    status = get_model_status()
    if status['mode'] != 'ai':
        return jsonify({'error': f"AI model unavailable: {status.get('error', 'unknown error')}"}), 503

    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image uploaded'}), 400
        
        image = request.files['image']
        if image.filename == '' or not allowed_file(image.filename):
            return jsonify({'error': 'Invalid file type. Please upload a PNG or JPG image.'}), 400

        filename = secure_filename(image.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        image.save(filepath)

        try:
            predicted_dish, confidence, top_predictions = predict_dish(filepath)
            nutritional_info = get_nutritional_info(predicted_dish)
            recommendations = get_personalized_recommendations(
                current_user.to_profile_dict(), nutritional_info
            )

            prediction_id = db.add_food_prediction(
                current_user.id, predicted_dish, float(f"{confidence:.4f}"),
                int(float(nutritional_info.get('Calories', 0) or 0)),
                float(nutritional_info.get('Protein (g)', 0) or 0),
                float(nutritional_info.get('Carbs (g)', 0) or 0),
                float(nutritional_info.get('Total Fat (g)', 0) or 0),
                f'/static/uploads/{filename}',
            )

            return jsonify({
                'status': 'success',
                'predicted_dish': predicted_dish,
                'confidence': float(f"{confidence:.4f}"),
                'top_predictions': top_predictions,
                'nutritional_info': nutritional_info,
                'recommendations': recommendations,
                'model_mode': 'ai',
                'model_message': 'Predicted by trained MobileNetV2 model (Keras 3)',
                'prediction_id': prediction_id,
            })
        except Exception:
            if os.path.exists(filepath):
                os.remove(filepath)
            raise

    except Exception as e:
        app.logger.error(f"Error during prediction: {str(e)}")
        return jsonify({
            'error': 'An error occurred during prediction.',
            'details': str(e)
        }), 500


@app.route('/api/add-prediction-to-log', methods=['POST'])
@login_required
def add_prediction_to_log():
    data = request.get_json() or {}
    prediction = db.get_prediction(current_user.id, data.get('prediction_id'))
    if not prediction:
        return jsonify({'error': 'Prediction not found'}), 404

    log_id = db.add_meal_log(
        current_user.id, parse_date(data.get('date')),
        data.get('meal_type', 'lunch'), prediction['predicted_dish'],
        data.get('detail', 'AI prediction'), prediction['calories'],
        prediction['protein'], prediction['carbs'], prediction['fat'],
        'predict', prediction['id'],
    )
    return jsonify({'success': True, 'id': log_id})


db.init_db()

if __name__ == '__main__':
    warm_up_model()
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)
