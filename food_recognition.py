import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import load_img, img_to_array
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(current_dir, 'RwandanFoodAI', 'models', 'best_model_MobileNetV2.h5')
    data_path = os.path.join(current_dir, 'RwandanFoodAI', 'data', 'nutrition', 'rwandan_food_data.csv')
    
    logger.info(f"Loading model from: {model_path}")
    model = tf.keras.models.load_model(model_path, compile=False)
    
    logger.info(f"Loading data from: {data_path}")
    df = pd.read_csv(data_path)
except Exception as e:
    logger.error(f"Error initializing model and data: {str(e)}")
    raise

def preprocess_image(img_path):
    try:
        img = load_img(img_path, target_size=(224, 224))
        img_array = img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array /= 255.0
        return img_array
    except Exception as e:
        logger.error(f"Error preprocessing image: {str(e)}")
        raise

def predict_dish(image_path):
    try:
        processed_image = preprocess_image(image_path)
        predictions = model.predict(processed_image, verbose=0)
        predicted_class = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_class])
        
        class_names = df['Name'].unique().tolist()
        predicted_dish = class_names[predicted_class]
        
        return predicted_dish, confidence
    except Exception as e:
        logger.error(f"Error in prediction: {str(e)}")
        raise

def get_nutritional_info(dish_name):
    try:
        dish_info = df[df['Name'] == dish_name].iloc[0].to_dict()
        return {k: float(v) if isinstance(v, np.number) else str(v) for k, v in dish_info.items()}
    except Exception as e:
        logger.error(f"Error getting nutritional info: {str(e)}")
        raise

def get_personalized_recommendations(user_profile, nutritional_info, num_recommendations=3):
    try:
        recommendations = df.sample(n=min(num_recommendations, len(df)))
        return recommendations[['Name', 'Calories', 'Protein (g)', 'Carbs (g)', 'Total Fat (g)', 'Fiber (g)']].to_dict('records')
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        raise