import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.models import Model, Sequential
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Input
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.preprocessing.image import load_img, img_to_array
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_model():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(base_dir, 'RwandanFoodAI', 'data', 'nutrition', 'rwandan_food_data.csv')
    num_classes = len(pd.read_csv(data_path)['Name'].unique())

    inputs = Input(shape=(224, 224, 3))
    base = MobileNetV2(include_top=False, weights=None, input_tensor=inputs)
    x = GlobalAveragePooling2D()(base.output)
    outputs = Dense(num_classes, activation='softmax')(x)
    model = Model(inputs, outputs)

    model_path = os.path.join(base_dir, 'RwandanFoodAI', 'models', 'best_model_MobileNetV2.h5')
    model.load_weights(model_path)
    return model

df = pd.read_csv(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'RwandanFoodAI', 'data', 'nutrition', 'rwandan_food_data.csv'))
model = get_model()

def preprocess_image(img_path):
    img = load_img(img_path, target_size=(224, 224))
    img_array = img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    return img_array / 255.0

def predict_dish(image_path):
    processed_image = preprocess_image(image_path)
    predictions = model.predict(processed_image, verbose=0)
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