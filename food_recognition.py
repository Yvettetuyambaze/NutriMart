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
        self.model = tf.keras.models.load_model(model_path)
        self.df = pd.read_csv(os.path.join(base_dir, 'RwandanFoodAI', 'data', 'nutrition', 'rwandan_food_data.csv'))

    def preprocess_image(self, img_path):
        img = load_img(img_path, target_size=(224, 224))
        img_array = img_to_array(img)
        return np.expand_dims(img_array, axis=0) / 255.0

model_loader = ModelLoader()

def predict_dish(image_path):
    processed_image = model_loader.preprocess_image(image_path)
    predictions = model_loader.model.predict(processed_image)
    predicted_class = np.argmax(predictions[0])
    confidence = float(predictions[0][predicted_class])
    predicted_dish = model_loader.df['Name'].unique()[predicted_class]
    return predicted_dish, confidence

def get_nutritional_info(dish_name):
    info = model_loader.df[model_loader.df['Name'] == dish_name].iloc[0].to_dict()
    return {k: float(v) if isinstance(v, np.number) else str(v) for k, v in info.items()}

def get_personalized_recommendations(user_profile, nutritional_info):
    recommendations = model_loader.df.sample(n=min(3, len(model_loader.df)))
    return recommendations[['Name', 'Calories', 'Protein (g)', 'Carbs (g)', 'Total Fat (g)', 'Fiber (g)']].to_dict('records')