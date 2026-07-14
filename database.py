import sqlite3
import os
from datetime import datetime, date
from werkzeug.security import generate_password_hash, check_password_hash

DB_PATH = os.environ.get('DATABASE_PATH', 'nutrimart.db')

MEAL_ICONS = {
    'breakfast': 'fa-sun', 'lunch': 'fa-cloud-sun', 'dinner': 'fa-moon', 'snack': 'fa-cookie',
}


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            phone TEXT UNIQUE,
            password_hash TEXT NOT NULL,
            date_of_birth TEXT,
            gender TEXT DEFAULT 'female',
            height REAL,
            weight REAL,
            target_weight REAL,
            activity_level TEXT DEFAULT 'moderate',
            profile_complete INTEGER DEFAULT 0,
            notifications_enabled INTEGER DEFAULT 1,
            vegan_preference INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS meal_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            log_date TEXT NOT NULL,
            meal_type TEXT NOT NULL,
            food_name TEXT NOT NULL,
            detail TEXT DEFAULT '',
            calories INTEGER DEFAULT 0,
            protein REAL DEFAULT 0,
            carbs REAL DEFAULT 0,
            fat REAL DEFAULT 0,
            source TEXT DEFAULT 'manual',
            prediction_id INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS meal_plan_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            day INTEGER NOT NULL,
            meal_type TEXT NOT NULL,
            name TEXT NOT NULL,
            calories INTEGER DEFAULT 0,
            protein INTEGER DEFAULT 0,
            carbs INTEGER DEFAULT 0,
            fat INTEGER DEFAULT 0,
            icon TEXT DEFAULT 'fa-utensils',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS exercise_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            log_date TEXT NOT NULL,
            name TEXT NOT NULL,
            detail TEXT DEFAULT '',
            calories_burned INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS food_predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            predicted_dish TEXT NOT NULL,
            confidence REAL DEFAULT 0,
            calories INTEGER DEFAULT 0,
            protein REAL DEFAULT 0,
            carbs REAL DEFAULT 0,
            fat REAL DEFAULT 0,
            image_path TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    ''')
    conn.commit()
    conn.close()


def _calc_age(dob_str):
    if not dob_str:
        return None
    dob = datetime.strptime(dob_str, '%Y-%m-%d').date()
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def _calc_bmi(weight, height):
    if not weight or not height or height <= 0:
        return None
    return round(weight / ((height / 100) ** 2), 1)


def _bmi_category(bmi):
    if bmi is None:
        return 'unknown'
    if bmi < 18.5:
        return 'under'
    if bmi < 25:
        return 'normal'
    if bmi < 30:
        return 'over'
    return 'obese'


def _calorie_goal(user):
    age = _calc_age(user['date_of_birth'])
    weight, height = user['weight'], user['height']
    if not all([weight, height, age]):
        return 1726
    if user['gender'] == 'male':
        bmr = 66 + (13.7 * weight) + (5 * height) - (6.8 * age)
    else:
        bmr = 655 + (9.6 * weight) + (1.8 * height) - (4.7 * age)
    multipliers = {'sedentary': 1.2, 'light': 1.375, 'moderate': 1.55, 'active': 1.725, 'very_active': 1.9}
    return int(bmr * multipliers.get(user['activity_level'], 1.55))


def user_to_dict(row):
    if not row:
        return None
    u = dict(row)
    bmi = _calc_bmi(u.get('weight'), u.get('height'))
    return {
        'id': u['id'], 'name': u['name'], 'email': u['email'] or '', 'phone': u['phone'] or '',
        'age': _calc_age(u.get('date_of_birth')), 'gender': u['gender'],
        'height': u['height'], 'weight': u['weight'], 'target_weight': u['target_weight'],
        'activity_level': u['activity_level'], 'bmi': bmi, 'bmi_category': _bmi_category(bmi),
        'calorie_goal': _calorie_goal(u), 'profile_complete': bool(u['profile_complete']),
        'notifications_enabled': bool(u['notifications_enabled']),
        'vegan_preference': bool(u['vegan_preference']),
        'date_of_birth': u.get('date_of_birth'),
        'password_hash': u['password_hash'],
    }


class UserWrapper:
    def __init__(self, data):
        self._data = data

    @property
    def id(self):
        return self._data['id']

    @property
    def is_authenticated(self):
        return True

    @property
    def is_active(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def get_id(self):
        return str(self._data['id'])

    @property
    def profile_complete(self):
        return self._data['profile_complete']

    def check_password(self, password):
        return check_password_hash(self._data['password_hash'], password)

    def to_profile_dict(self):
        d = dict(self._data)
        d.pop('password_hash', None)
        return d

    def calorie_goal(self):
        return self._data['calorie_goal']


def create_user(name, email, phone, password):
    conn = get_db()
    pw_hash = generate_password_hash(password)
    cur = conn.execute(
        'INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
        (name, email, phone, pw_hash)
    )
    conn.commit()
    user_id = cur.lastrowid
    conn.close()
    return get_user_by_id(user_id)


def get_user_by_id(user_id):
    conn = get_db()
    row = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()
    data = user_to_dict(row)
    return UserWrapper(data) if data else None


def get_user_by_identifier(identifier):
    conn = get_db()
    row = conn.execute(
        'SELECT * FROM users WHERE email = ? OR phone = ?', (identifier, identifier)
    ).fetchone()
    conn.close()
    data = user_to_dict(row)
    return UserWrapper(data) if data else None


def update_user(user_id, fields):
    allowed = ['name', 'email', 'phone', 'date_of_birth', 'gender', 'height', 'weight',
               'target_weight', 'activity_level', 'profile_complete', 'notifications_enabled',
               'vegan_preference', 'password_hash']
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return get_user_by_id(user_id)
    sets = ', '.join(f'{k} = ?' for k in updates)
    conn = get_db()
    conn.execute(f'UPDATE users SET {sets} WHERE id = ?', list(updates.values()) + [user_id])
    conn.commit()
    conn.close()
    return get_user_by_id(user_id)


def add_meal_log(user_id, log_date, meal_type, food_name, detail='', calories=0,
                 protein=0, carbs=0, fat=0, source='manual', prediction_id=None):
    conn = get_db()
    cur = conn.execute('''
        INSERT INTO meal_logs (user_id, log_date, meal_type, food_name, detail, calories, protein, carbs, fat, source, prediction_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (user_id, log_date, meal_type, food_name, detail, calories, protein, carbs, fat, source, prediction_id))
    conn.commit()
    log_id = cur.lastrowid
    conn.close()
    return log_id


def delete_meal_log(user_id, log_id):
    conn = get_db()
    conn.execute('DELETE FROM meal_logs WHERE id = ? AND user_id = ?', (log_id, user_id))
    conn.commit()
    conn.close()


def add_exercise_log(user_id, log_date, name, detail='', calories_burned=0):
    conn = get_db()
    cur = conn.execute('''
        INSERT INTO exercise_logs (user_id, log_date, name, detail, calories_burned) VALUES (?, ?, ?, ?, ?)
    ''', (user_id, log_date, name, detail, calories_burned))
    conn.commit()
    log_id = cur.lastrowid
    conn.close()
    return log_id


def delete_exercise_log(user_id, log_id):
    conn = get_db()
    conn.execute('DELETE FROM exercise_logs WHERE id = ? AND user_id = ?', (log_id, user_id))
    conn.commit()
    conn.close()


def get_calorie_data(user_id, log_date):
    conn = get_db()
    user = get_user_by_id(user_id)
    logs = conn.execute(
        'SELECT * FROM meal_logs WHERE user_id = ? AND log_date = ?', (user_id, log_date)
    ).fetchall()
    exercises = conn.execute(
        'SELECT * FROM exercise_logs WHERE user_id = ? AND log_date = ?', (user_id, log_date)
    ).fetchall()
    conn.close()

    consumed = sum(r['calories'] for r in logs)
    burned = sum(r['calories_burned'] for r in exercises)
    goal = user.calorie_goal()
    protein = sum(r['protein'] for r in logs)
    carbs = sum(r['carbs'] for r in logs)
    fat = sum(r['fat'] for r in logs)

    meals = {t: [] for t in ['breakfast', 'lunch', 'dinner', 'snack']}
    for r in logs:
        meals[r['meal_type']].append({
            'id': r['id'], 'name': r['food_name'], 'detail': r['detail'],
            'calories': r['calories'], 'protein': r['protein'], 'carbs': r['carbs'],
            'fat': r['fat'], 'source': r['source'],
        })

    return {
        'goal': goal, 'consumed': consumed, 'burned': burned,
        'remaining': goal - consumed + burned,
        'percentage': round((consumed / goal) * 100) if goal else 0,
        'macros': {
            'protein': {'current': round(protein), 'goal': max(50, int(goal * 0.25 / 4))},
            'carbs': {'current': round(carbs), 'goal': max(100, int(goal * 0.45 / 4))},
            'fat': {'current': round(fat), 'goal': max(40, int(goal * 0.30 / 9))},
        },
        'meals': meals,
        'exercises': [{'id': e['id'], 'name': e['name'], 'detail': e['detail'], 'calories': -e['calories_burned']} for e in exercises],
        'date': log_date,
    }


def add_food_prediction(user_id, predicted_dish, confidence, calories, protein, carbs, fat, image_path=None):
    conn = get_db()
    cur = conn.execute('''
        INSERT INTO food_predictions (user_id, predicted_dish, confidence, calories, protein, carbs, fat, image_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (user_id, predicted_dish, confidence, calories, protein, carbs, fat, image_path))
    conn.commit()
    pred_id = cur.lastrowid
    conn.close()
    return pred_id


def get_food_history(user_id, limit=20):
    conn = get_db()
    rows = conn.execute(
        'SELECT * FROM food_predictions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
        (user_id, limit)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_prediction(user_id, pred_id):
    conn = get_db()
    row = conn.execute(
        'SELECT * FROM food_predictions WHERE id = ? AND user_id = ?', (pred_id, user_id)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def seed_meal_plan(user_id, default_plans):
    conn = get_db()
    existing = conn.execute(
        'SELECT COUNT(*) as c FROM meal_plan_items WHERE user_id = ?', (user_id,)
    ).fetchone()['c']
    if existing > 0:
        conn.close()
        return
    for day, meals in default_plans.items():
        for meal in meals:
            conn.execute('''
                INSERT INTO meal_plan_items (user_id, day, meal_type, name, calories, protein, carbs, fat, icon)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (user_id, day, meal['type'], meal['name'], meal['calories'], meal['protein'],
                  meal['carbs'], meal['fat'], MEAL_ICONS.get(meal['type'], 'fa-utensils')))
    conn.commit()
    conn.close()


def get_meal_plan(user_id, day):
    conn = get_db()
    rows = conn.execute(
        'SELECT * FROM meal_plan_items WHERE user_id = ? AND day = ? ORDER BY id', (user_id, day)
    ).fetchall()
    conn.close()
    meals = []
    for r in rows:
        meals.append({
            'id': r['id'], 'type': r['meal_type'], 'name': r['name'],
            'calories': r['calories'], 'protein': r['protein'], 'carbs': r['carbs'],
            'fat': r['fat'], 'icon': r['icon'] or MEAL_ICONS.get(r['meal_type'], 'fa-utensils'),
            'day': r['day'],
        })
    total_cal = sum(m['calories'] for m in meals)
    return meals, {
        'calories': total_cal, 'protein': sum(m['protein'] for m in meals),
        'carbs': sum(m['carbs'] for m in meals), 'fat': sum(m['fat'] for m in meals),
    }


def add_meal_plan_item(user_id, day, meal_type, name, calories=0, protein=0, carbs=0, fat=0):
    conn = get_db()
    cur = conn.execute('''
        INSERT INTO meal_plan_items (user_id, day, meal_type, name, calories, protein, carbs, fat, icon)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (user_id, day, meal_type, name, calories, protein, carbs, fat, MEAL_ICONS.get(meal_type, 'fa-utensils')))
    conn.commit()
    item_id = cur.lastrowid
    conn.close()
    return item_id


def delete_meal_plan_item(user_id, item_id):
    conn = get_db()
    conn.execute('DELETE FROM meal_plan_items WHERE id = ? AND user_id = ?', (item_id, user_id))
    conn.commit()
    conn.close()


def update_meal_plan_item(user_id, item_id, fields):
    allowed = ['name', 'meal_type', 'calories', 'protein', 'carbs', 'fat', 'day', 'icon']
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return
    sets = ', '.join(f'{k} = ?' for k in updates)
    conn = get_db()
    conn.execute(f'UPDATE meal_plan_items SET {sets} WHERE id = ? AND user_id = ?',
                 list(updates.values()) + [item_id, user_id])
    conn.commit()
    conn.close()
