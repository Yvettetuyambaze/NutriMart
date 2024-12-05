import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.preprocessing.image import load_img, img_to_array
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_model():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, 'RwandanFoodAI', 'models', 'best_model_MobileNetV2.h5')
    model = tf.keras.models.Sequential([
        tf.keras.layers.Input(shape=(224, 224, 3)),
        tf.keras.applications.MobileNetV2(include_top=False, weights=None),
        tf.keras.layers.GlobalAveragePooling2D(),
        tf.keras.layers.Dense(len(pd.read_csv(os.path.join(base_dir, 'RwandanFoodAI', 'data', 'nutrition', 'rwandan_food_data.csv'))['Name'].unique()), activation='softmax')
    ])
    model.load_weights(model_path)
    return model

def load_data():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return pd.read_csv(os.path.join(base_dir, 'RwandanFoodAI', 'data', 'nutrition', 'rwandan_food_data.csv'))

model = get_model()
df = load_data()

def preprocess_image(img_path):
    img = load_img(img_path, target_size=(224, 224))
    img_array = img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    return img_array / 255.0

def predict_dish(image_path):
    processed_image = preprocess_image(image_path)
    predictions = model.predict(processed_image)
    predicted_class = np.argmax(predictions[0])
    confidence = float(predictions[0][predicted_class])
    predicted_dish = df['Name'].unique()[predicted_class]
    return predicted_dish, confidence

def get_nutritional_info(dish_name):
    info = df[df['Name'] == dish_name].iloc[0].to_dict()
    return {k: float(v) if isinstance(v, np.number) else str(v) for k, v in info.items()}

def get_personalized_recommendations(user_profile, nutritional_info):
    recommendations = df.sample(n=min(3, len(df)))
    return recommendations[['Name', 'Calories', 'Protein (g)', 'Carbs (g)', 'Total Fat (g)', 'Fiber (g)']].to_dict('records')