import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import load_img, img_to_array
import pandas as pd
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelLoader:
    def __init__(self):
        try:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            csv_path = os.path.join(base_dir, 'RwandanFoodAI', 'data', 'nutrition', 'rwandan_food_data.csv')
            self.df = pd.read_csv(csv_path)
            logger.info("Successfully loaded nutrition data")

            model_path = os.path.join(base_dir, 'RwandanFoodAI', 'models', 'best_model_MobileNetV2.h5')
            
            # Load model with custom options to handle compatibility issues
            self.model = tf.keras.models.load_model(model_path, compile=False)
            self.model.compile(
                optimizer='adam',
                loss='categorical_crossentropy',
                metrics=['accuracy']
            )
            logger.info("Successfully loaded model")

        except Exception as e:
            logger.error(f"Error in ModelLoader initialization: {e}")
            raise

    def preprocess_image(self, img_path):
        try:
            img = load_img(img_path, target_size=(224, 224))
            img_array = img_to_array(img)
            img_array = img_array / 255.0  # Normalize
            return np.expand_dims(img_array, axis=0)
        except Exception as e:
            logger.error(f"Error in image preprocessing: {e}")
            raise

# Global model loader instance
_model_loader = None

def get_model_loader():
    global _model_loader
    if _model_loader is None:
        _model_loader = ModelLoader()
    return _model_loader

def predict_dish(image_path):
    try:
        model_loader = get_model_loader()
        processed_image = model_loader.preprocess_image(image_path)
        predictions = model_loader.model.predict(processed_image, verbose=0)
        predicted_class = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_class])
        predicted_dish = model_loader.df['Name'].unique()[predicted_class]
        
        logger.info(f"Successfully predicted dish: {predicted_dish} with confidence: {confidence}")
        return predicted_dish, confidence
    except Exception as e:
        logger.error(f"Error in dish prediction: {e}")
        raise

def get_nutritional_info(dish_name):
    try:
        model_loader = get_model_loader()
        info = model_loader.df[model_loader.df['Name'] == dish_name].iloc[0].to_dict()
        return {k: float(v) if isinstance(v, (int, float)) else str(v) for k, v in info.items()}
    except Exception as e:
        logger.error(f"Error getting nutritional info: {e}")
        raise

def get_personalized_recommendations(user_profile, nutritional_info):
    try:
        model_loader = get_model_loader()
        
        # Filter based on health goals
        if user_profile.get('health_goal') == 'lose_weight':
            df_filtered = model_loader.df[model_loader.df['Calories'] < model_loader.df['Calories'].median()]
        else:
            df_filtered = model_loader.df

        # Calculate recommendation scores
        df_filtered['score'] = (
            df_filtered['Protein (g)'] * 4 +  # Prioritize protein
            df_filtered['Fiber (g)'] * 2 -    # Prioritize fiber
            abs(df_filtered['Calories'] - nutritional_info.get('Calories', 0)) / 100  # Penalize large calorie differences
        )

        recommendations = df_filtered.nlargest(3, 'score')
        return recommendations[['Name', 'Calories', 'Protein (g)', 'Carbs (g)', 'Total Fat (g)', 'Fiber (g)']].to_dict('records')
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        raise
