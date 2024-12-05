import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.preprocessing.image import load_img, img_to_array
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FoodRecognition:
    def __init__(self):
        try:
            self.current_dir = os.path.dirname(os.path.abspath(__file__))
            self.model_path = os.path.join(self.current_dir, 'RwandanFoodAI', 'models', 'best_model_MobileNetV2.h5')
            self.data_path = os.path.join(self.current_dir, 'RwandanFoodAI', 'data', 'nutrition', 'rwandan_food_data.csv')
            
            # Load with custom objects
            logger.info(f"Loading model from: {self.model_path}")
            custom_objects = {'tf': tf}
            self.model = tf.keras.models.load_model(
                self.model_path,
                custom_objects=custom_objects,
                compile=False
            )
            
            logger.info(f"Loading data from: {self.data_path}")
            self.df = pd.read_csv(self.data_path)
            
        except Exception as e:
            logger.error(f"Initialization error: {str(e)}")
            raise

    def preprocess_image(self, img_path):
        img = load_img(img_path, target_size=(224, 224))
        img_array = img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        return img_array / 255.0

    def predict_dish(self, image_path):
        try:
            processed_image = self.preprocess_image(image_path)
            predictions = self.model.predict(processed_image)
            predicted_class = np.argmax(predictions[0])
            confidence = float(predictions[0][predicted_class])
            predicted_dish = self.df['Name'].unique()[predicted_class]
            return predicted_dish, confidence
        except Exception as e:
            logger.error(f"Prediction error: {str(e)}")
            raise

    def get_nutritional_info(self, dish_name):
        info = self.df[self.df['Name'] == dish_name].iloc[0].to_dict()
        return {k: float(v) if isinstance(v, np.number) else str(v) for k, v in info.items()}

    def get_personalized_recommendations(self, user_profile, nutritional_info):
        recommendations = self.df.sample(n=min(3, len(self.df)))
        return recommendations[['Name', 'Calories', 'Protein (g)', 'Carbs (g)', 
                             'Total Fat (g)', 'Fiber (g)']].to_dict('records')

food_recognition = FoodRecognition()

def predict_dish(image_path):
    return food_recognition.predict_dish(image_path)

def get_nutritional_info(dish_name):
    return food_recognition.get_nutritional_info(dish_name)

def get_personalized_recommendations(user_profile, nutritional_info):
    return food_recognition.get_personalized_recommendations(user_profile, nutritional_info)