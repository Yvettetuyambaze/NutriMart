import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.layers import Input
from tensorflow.keras.models import Model, load_model
from tensorflow.keras.preprocessing.image import load_img, img_to_array
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FoodRecognition:
    def __init__(self):
        try:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            self.model_path = os.path.join(base_dir, 'RwandanFoodAI', 'models', 'best_model_MobileNetV2.h5')
            self.data_path = os.path.join(base_dir, 'RwandanFoodAI', 'data', 'nutrition', 'rwandan_food_data.csv')
            
            # Load model with custom objects
            custom_objects = {'tf': tf}
            self.model = tf.keras.models.load_model(self.model_path, compile=False, custom_objects=custom_objects)
            self.df = pd.read_csv(self.data_path)
            
        except Exception as e:
            logger.error(f"Initialization error: {e}")
            raise

    def preprocess_image(self, img_path):
        img = load_img(img_path, target_size=(224, 224))
        img_array = img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        return img_array / 255.0

    def predict_dish(self, image_path):
        processed_image = self.preprocess_image(image_path)
        predictions = self.model.predict(processed_image, verbose=0)
        predicted_class = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_class])
        predicted_dish = self.df['Name'].unique()[predicted_class]
        return predicted_dish, confidence

    def get_nutritional_info(self, dish_name):
        info = self.df[self.df['Name'] == dish_name].iloc[0].to_dict()
        return {k: float(v) if isinstance(v, np.number) else str(v) for k, v in info.items()}

    def get_personalized_recommendations(self, user_profile, nutritional_info):
        recommendations = self.df.sample(n=min(3, len(self.df)))
        return recommendations[['Name', 'Calories', 'Protein (g)', 'Carbs (g)', 'Total Fat (g)', 'Fiber (g)']].to_dict('records')

# Initialize
food_recognition = FoodRecognition()

# Interface functions
def predict_dish(image_path):
    return food_recognition.predict_dish(image_path)

def get_nutritional_info(dish_name):
    return food_recognition.get_nutritional_info(dish_name)

def get_personalized_recommendations(user_profile, nutritional_info):
    return food_recognition.get_personalized_recommendations(user_profile, nutritional_info)