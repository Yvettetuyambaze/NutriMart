import numpy as np
import pandas as pd
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import load_img, img_to_array
from sklearn.metrics.pairwise import cosine_similarity
import os
import gc
import tensorflow as tf

class ModelManager:
    _instance = None
    _model = None
    
    @classmethod
    def get_model(cls):
        if cls._model is None:
            model_path = os.path.join('RwandanFoodAI', 'models', 'best_model_MobileNetV2.h5')
            cls._model = load_model(model_path, compile=False)
        return cls._model

    @classmethod
    def clear_model(cls):
        cls._model = None
        gc.collect()

# Load data once at startup
data_path = os.path.join('RwandanFoodAI', 'data', 'nutrition', 'rwandan_food_data.csv')
df = pd.read_csv(data_path)

def preprocess_image(img_path, target_size=(160, 160)):  # Reduced from 224x224
    img = load_img(img_path, target_size=target_size)
    img_array = img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array /= 255.0
    return img_array

def predict_dish(image_path):
    try:
        # Get model instance
        model = ModelManager.get_model()
        
        # Preprocess image
        preprocessed_image = preprocess_image(image_path)
        
        # Make prediction with smaller batch size
        with tf.device('/cpu:0'):  # Force CPU usage
            prediction = model.predict(preprocessed_image, batch_size=1)
        
        predicted_class = np.argmax(prediction[0])
        confidence = float(np.max(prediction[0]))
        
        class_names = list(df['Name'].unique())
        predicted_dish = class_names[predicted_class]
        
        # Clear memory
        ModelManager.clear_model()
        gc.collect()
        
        return predicted_dish, confidence
    except Exception as e:
        ModelManager.clear_model()
        gc.collect()
        raise e

def get_nutritional_info(dish_name):
    info = df[df['Name'] == dish_name].iloc[0].to_dict()
    return {k: v.item() if isinstance(v, np.generic) else v for k, v in info.items()}

def get_personalized_recommendations(user_profile, nutritional_info, num_recommendations=2):  # Reduced from 3
    recommended_dishes = df.sample(n=num_recommendations)
    return recommended_dishes[['Name', 'Calories', 'Protein (g)', 'Carbs (g)', 'Total Fat (g)', 'Fiber (g)']].to_dict('records')