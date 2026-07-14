import re
from food_recognition import get_all_recipes, get_nutritional_info


MEAL_KEYWORDS = {
    'breakfast': ['breakfast', 'morning', 'gitondo', 'petit', 'matin'],
    'lunch': ['lunch', 'midday', 'manywa', 'dejeuner', 'midi'],
    'dinner': ['dinner', 'evening', 'night', 'mugoroba', 'soir', 'diner'],
    'snack': ['snack', 'bite', 'collation'],
}

HELP_PATTERNS = [
    (r'\b(help|how|what can)\b', 'help'),
    (r'\b(suggest|recommend|idea|plan)\b', 'suggest'),
    (r'\b(low cal|light|healthy|diet)\b', 'healthy'),
    (r'\b(high protein|protein)\b', 'protein'),
    (r'\b(vegetarian|vegan|no meat)\b', 'vegan'),
    (r'\b(calories?|kalori)\b', 'calories'),
]


def _parse_meal_type(message):
    lower = message.lower()
    for meal_type, keywords in MEAL_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return meal_type
    return 'lunch'


def _parse_intent(message):
    lower = message.lower()
    for pattern, intent in HELP_PATTERNS:
        if re.search(pattern, lower):
            return intent
    return 'suggest'


def _recipe_to_suggestion(recipe, meal_type='lunch'):
    return {
        'name': recipe.get('Name', 'Unknown'),
        'meal_type': meal_type,
        'calories': int(float(recipe.get('Calories', 0) or 0)),
        'protein': int(float(recipe.get('Protein (g)', 0) or 0)),
        'carbs': int(float(recipe.get('Carbs (g)', 0) or 0)),
        'fat': int(float(recipe.get('Total Fat (g)', 0) or 0)),
        'serving': recipe.get('Serving Size', ''),
        'dietary': recipe.get('Dietary Info', ''),
    }


def _filter_recipes(recipes, intent, max_calories=None, vegan=False):
    filtered = []
    for r in recipes:
        cal = float(r.get('Calories', 0) or 0)
        protein = float(r.get('Protein (g)', 0) or 0)
        dietary = (r.get('Dietary Info') or '').lower()

        if vegan and 'meat' in dietary:
            continue
        if max_calories and cal > max_calories:
            continue
        if intent == 'healthy' and cal > 400:
            continue
        if intent == 'protein' and protein < 15:
            continue
        filtered.append(r)
    return filtered


def _find_by_name(recipes, message):
    lower = message.lower()
    matches = []
    for r in recipes:
        name = (r.get('Name') or '').lower()
        if name and (name in lower or any(word in name for word in lower.split() if len(word) > 3)):
            matches.append(r)
    return matches[:3]


def generate_chat_response(message, user_profile=None, day=1):
    recipes = get_all_recipes()
    intent = _parse_intent(message)
    meal_type = _parse_meal_type(message)
    name_matches = _find_by_name(recipes, message)

    if name_matches:
        suggestions = [_recipe_to_suggestion(r, meal_type) for r in name_matches]
        names = ', '.join(s['name'] for s in suggestions)
        reply = f"I found these dishes matching your request: {names}. Tap 'Add to Plan' to add them to Day {day}."
        return {'reply': reply, 'suggestions': suggestions, 'day': day}

    max_cal = 500 if intent == 'healthy' else None
    vegan = intent == 'vegan' or (user_profile and user_profile.get('vegan_preference'))
    filtered = _filter_recipes(recipes, intent, max_cal, vegan)

    if intent == 'help':
        reply = (
            "I can help you plan Rwandan meals! Try:\n"
            "• \"Suggest a healthy breakfast\"\n"
            "• \"High protein lunch ideas\"\n"
            "• \"Add Isombe to my plan\"\n"
            "• \"Low calorie dinner for day 3\"\n\n"
            "I'll suggest dishes you can add directly to your meal plan."
        )
        return {'reply': reply, 'suggestions': [], 'day': day}

    if not filtered:
        filtered = recipes

    suggestions = [_recipe_to_suggestion(r, meal_type) for r in filtered[:4]]
    goal = user_profile.get('calorie_goal', 1726) if user_profile else 1726

    if intent == 'protein':
        reply = f"Here are high-protein {meal_type} options for Day {day} (your daily goal is ~{goal} cal):"
    elif intent == 'healthy':
        reply = f"Here are lighter {meal_type} options under 400 calories for Day {day}:"
    elif intent == 'vegan':
        reply = f"Here are plant-based {meal_type} suggestions for Day {day}:"
    else:
        reply = f"Here are {meal_type} ideas for Day {day}. Your daily calorie goal is ~{goal} cal:"

    return {'reply': reply, 'suggestions': suggestions, 'day': day}


def nutrition_from_dish(dish_name):
    info = get_nutritional_info(dish_name)
    if not info:
        return None
    return {
        'name': info.get('Name', dish_name),
        'calories': int(float(info.get('Calories', 0) or 0)),
        'protein': int(float(info.get('Protein (g)', 0) or 0)),
        'carbs': int(float(info.get('Carbs (g)', 0) or 0)),
        'fat': int(float(info.get('Total Fat (g)', 0) or 0)),
        'serving': info.get('Serving Size', ''),
    }
