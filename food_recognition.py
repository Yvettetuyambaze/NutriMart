import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.preprocessing.image import load_img, img_to_array
from tensorflow.keras.models import load_model
import os
import logging
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class FoodRecognition:
    def __init__(self):
        try:
            self.current_dir = os.path.dirname(os.path.abspath(__file__))
            self.model_path = os.path.join(self.current_dir, 'RwandanFoodAI', 'models', 'best_model_MobileNetV2.h5')
            self.data_path = os.path.join(self.current_dir, 'RwandanFoodAI', 'data', 'nutrition', 'rwandan_food_data.csv')
            
            logger.info(f"Loading model from: {self.model_path}")
            self.model = load_model(self.model_path, compile=False)
            
            logger.info(f"Loading data from: {self.data_path}")
            self.df = pd.read_csv(self.data_path)
            
            logger.info("Initialization complete")
        except Exception as e:
            logger.error(f"Initialization error: {str(e)}")
            logger.error(traceback.format_exc())
            raise

    def preprocess_image(self, img_path):
        try:
            if not os.path.exists(img_path):
                raise FileNotFoundError(f"Image not found at {img_path}")
            
            # Load and preprocess image
            img = load_img(img_path, target_size=(224, 224))
            img_array = img_to_array(img)
            img_array = np.expand_dims(img_array, axis=0)
            img_array = img_array / 255.0
            
            return img_array
        except Exception as e:
            logger.error(f"Image preprocessing error: {str(e)}")
            logger.error(traceback.format_exc())
            raise

    def predict_dish(self, image_path):
        try:
            logger.info(f"Processing image: {image_path}")
            processed_image = self.preprocess_image(image_path)
            
            logger.info("Running prediction")
            predictions = self.model.predict(processed_image, verbose=0)
            predicted_class = np.argmax(predictions[0])
            confidence = float(predictions[0][predicted_class])
            
            class_names = self.df['Name'].unique().tolist()
            predicted_dish = class_names[predicted_class]
            
            logger.info(f"Predicted dish: {predicted_dish} with confidence: {confidence:.2f}")
            return predicted_dish, confidence
        except Exception as e:
            logger.error(f"Prediction error: {str(e)}")
            logger.error(traceback.format_exc())
            raise

    def get_nutritional_info(self, dish_name):
        try:
            dish_info = self.df[self.df['Name'] == dish_name].iloc[0].to_dict()
            return {k: float(v) if isinstance(v, np.number) else str(v) 
                   for k, v in dish_info.items()}
        except Exception as e:
            logger.error(f"Error getting nutritional info: {str(e)}")
            logger.error(traceback.format_exc())
            raise

    def get_personalized_recommendations(self, user_profile, nutritional_info, num_recommendations=3):
        try:
            # Simple recommendation based on random selection for now
            recommendations = self.df.sample(n=min(num_recommendations, len(self.df)))
            return recommendations[['Name', 'Calories', 'Protein (g)', 'Carbs (g)', 
                                 'Total Fat (g)', 'Fiber (g)']].to_dict('records')
        except Exception as e:
            logger.error(f"Error getting recommendations: {str(e)}")
            logger.error(traceback.format_exc())
            raise

# Initialize global instance
try:
    food_recognition = FoodRecognition()
except Exception as e:
    logger.error(f"Failed to initialize FoodRecognition: {str(e)}")
    logger.error(traceback.format_exc())
    raise

# Interface functions
def predict_dish(image_path):
    return food_recognition.predict_dish(image_path)

def get_nutritional_info(dish_name):
    return food_recognition.get_nutritional_info(dish_name)

def get_personalized_recommendations(user_profile, nutritional_info, num_recommendations=3):
    return food_recognition.get_personalized_recommendations(
        user_profile, 
        nutritional_info, 
        num_recommendations
    )