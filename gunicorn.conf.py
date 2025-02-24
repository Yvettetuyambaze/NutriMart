import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.preprocessing.image import load_img, img_to_array
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelLoader:
    def __init__(self):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(base_dir, 'RwandanFoodAI', 'models', 'best_model_MobileNetV2.h5')
        try:
            # Try loading with compile=False first
            self.model = tf.keras.models.load_model(model_path, compile=False)
            logger.info("Model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise

        csv_path = os.path.join(base_dir, 'RwandanFoodAI', 'data', 'nutrition', 'rwandan_food_data.csv')
        self.df = pd.read_csv(csv_path)

    def preprocess_image(self, img_path):
        img = load_img(img_path, target_size=(224, 224))
        img_array = img_to_array(img)
        return np.expand_dims(img_array, axis=0) / 255.0

_model_loader = None

def get_model_loader():
    global _model_loader
    if _model_loader is None:
        _model_loader = ModelLoader()
    return _model_loader

def predict_dish(image_path):
    model_loader = get_model_loader()
    processed_image = model_loader.preprocess_image(image_path)
    predictions = model_loader.model.predict(processed_image)
    predicted_class = np.argmax(predictions[0])
    confidence = float(predictions[0][predicted_class])
    predicted_dish = model_loader.df['Name'].unique()[predicted_class]
    return predicted_dish, confidence

def get_nutritional_info(dish_name):
    model_loader = get_model_loader()
    info = model_loader.df[model_loader.df['Name'] == dish_name].iloc[0].to_dict()
    return {k: float(v) if isinstance(v, np.number) else str(v) for k, v in info.items()}

def get_personalized_recommendations(user_profile, nutritional_info):
    model_loader = get_model_loader()
    recommendations = model_loader.df.sample(n=min(3, len(model_loader.df)))
    return recommendations[['Name', 'Calories', 'Protein (g)', 'Carbs (g)', 'Total Fat (g)', 'Fiber (g)']].to_dict('records')
