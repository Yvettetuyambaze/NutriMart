import numpy as np
import pandas as pd
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import load_img, img_to_array
from sklearn.metrics.pairwise import cosine_similarity
import os

# Adjust these paths according to your project structure
model_path = os.path.join('RwandanFoodAI', 'models', 'best_model_MobileNetV2.h5')
data_path = os.path.join('RwandanFoodAI', 'data', 'nutrition', 'rwandan_food_data.csv')

model = load_model(model_path)
df = pd.read_csv(data_path)

def preprocess_image(img_path, target_size=(224, 224)):
    img = load_img(img_path, target_size=target_size)
    img_array = img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array /= 255.0
    return img_array

def predict_dish(image_path):
    preprocessed_image = preprocess_image(image_path)
    prediction = model.predict(preprocessed_image)
    predicted_class = np.argmax(prediction[0])
    confidence = float(np.max(prediction[0]))  # Ensure this is a Python float
    
    class_names = list(df['Name'].unique())
    predicted_dish = class_names[predicted_class]
    
    return predicted_dish, confidence

def get_nutritional_info(dish_name):
    info = df[df['Name'] == dish_name].iloc[0].to_dict()
    # Convert numpy types to Python types for JSON serialization
    return {k: v.item() if isinstance(v, np.generic) else v for k, v in info.items()}

def get_personalized_recommendations(user_profile, nutritional_info, num_recommendations=3):
    recommended_dishes = df.sample(n=num_recommendations)
    return recommended_dishes[['Name', 'Calories', 'Protein (g)', 'Carbs (g)', 'Total Fat (g)', 'Fiber (g)']].to_dict('records')