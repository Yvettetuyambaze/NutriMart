import json
import numpy as np
import pandas as pd
import os
import logging

logger = logging.getLogger(__name__)

_model = None
_df = None
_class_names = None
_model_mode = None
_model_error = None

def _get_paths():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return {
        'model': os.path.join(base_dir, 'RwandanFoodAI', 'models', 'best_model_MobileNetV2.h5'),
        'labels': os.path.join(base_dir, 'RwandanFoodAI', 'models', 'class_labels.json'),
        'csv': os.path.join(base_dir, 'RwandanFoodAI', 'data', 'nutrition', 'rwandan_food_data.csv'),
    }

def _load_data():
    global _df
    if _df is None:
        paths = _get_paths()
        _df = pd.read_csv(paths['csv'])
    return _df

def _load_class_names():
    global _class_names
    if _class_names is not None:
        return _class_names

    paths = _get_paths()
    if os.path.exists(paths['labels']):
        with open(paths['labels'], 'r', encoding='utf-8') as f:
            _class_names = json.load(f)
        logger.info('Loaded %d class labels from class_labels.json', len(_class_names))
        return _class_names

    df = _load_data()
    _class_names = sorted(df['Name'].unique().tolist())
    return _class_names

def get_class_names():
    return _load_class_names()

def _try_load_model():
    global _model, _model_mode, _model_error
    paths = _get_paths()
    if not os.path.exists(paths['model']):
        _model_error = 'Model file not found'
        return False

    os.environ.setdefault('TF_CPP_MIN_LOG_LEVEL', '3')
    os.environ.setdefault('TF_ENABLE_ONEDNN_OPTS', '0')

    try:
        import keras
        _model = keras.models.load_model(paths['model'], compile=False)
        _load_class_names()
        if _model.output_shape[-1] != len(_class_names):
            raise ValueError(
                f'Model outputs { _model.output_shape[-1]} classes but {len(_class_names)} labels are defined'
            )
        _model_mode = 'ai'
        logger.info('Loaded MobileNetV2 model with Keras %s', keras.__version__)
        return True
    except Exception as e:
        _model_error = str(e)
        logger.error('Failed to load AI model: %s', e)
        return False

def _ensure_model():
    global _model_mode
    if _model_mode is not None:
        return _model_mode
    if _try_load_model():
        return _model_mode
    _model_mode = 'unavailable'
    return _model_mode

def model_available():
    return _ensure_model() == 'ai'

def get_model_status():
    mode = _ensure_model()
    return {
        'mode': mode,
        'error': _model_error,
        'message': 'Using trained MobileNetV2 AI model' if mode == 'ai' else 'AI model could not be loaded',
        'num_classes': len(_class_names) if _class_names else 0,
    }

def preprocess_image(img_path):
    """Same preprocessing as the training notebook: load_img + rescale 1/255."""
    import keras
    img = keras.utils.load_img(img_path, target_size=(224, 224))
    img_array = keras.utils.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    return img_array / 255.0

def _decode_predictions(predictions):
    class_names = get_class_names()
    probs = predictions[0]
    top_indices = np.argsort(probs)[::-1]

    top_predictions = []
    for idx in top_indices[:3]:
        top_predictions.append({
            'dish': class_names[int(idx)],
            'confidence': float(probs[idx]),
        })

    best = top_predictions[0]
    return best['dish'], best['confidence'], top_predictions

def predict_dish(image_path):
    mode = _ensure_model()
    if mode != 'ai':
        raise RuntimeError(
            _model_error or 'AI model is not available. Install keras>=3.4 and restart the server.'
        )

    processed = preprocess_image(image_path)
    predictions = _model.predict(processed, verbose=0)
    dish, confidence, top_predictions = _decode_predictions(predictions)
    return dish, confidence, top_predictions

def get_nutritional_info(dish_name):
    df = _load_data()
    info = df[df['Name'] == dish_name].iloc[0].to_dict()
    return {k: float(v) if isinstance(v, np.number) else str(v) for k, v in info.items()}

def get_all_recipes():
    df = _load_data()
    return df.to_dict('records')

def get_personalized_recommendations(user_profile, nutritional_info):
    df = _load_data()
    recommendations = df.sample(n=min(3, len(df)))
    return recommendations[['Name', 'Calories', 'Protein (g)', 'Carbs (g)', 'Total Fat (g)', 'Fiber (g)']].to_dict('records')

def warm_up_model():
    """Load model at startup so first user upload is fast."""
    return get_model_status()
