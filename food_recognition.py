import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import load_img, img_to_array
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Input
from tensorflow.keras.models import Model
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

            # Create the model architecture instead of loading
            num_classes = len(self.df['Name'].unique())
            self.model = self.create_model(num_classes)
            
            # Load weights if available
            model_path = os.path.join(base_dir, 'RwandanFoodAI', 'models', 'best_model_MobileNetV2.h5')
            if os.path.exists(model_path):
                try:
                    self.model.load_weights(model_path)
                    logger.info("Successfully loaded model weights")
                except:
                    logger.warning("Could not load weights, using base model")
            else:
                logger.warning("Model weights file not found, using base model")

        except Exception as e:
            logger.error(f"Error in ModelLoader initialization: {e}")
            raise

    def create_model(self, num_classes):
        # Create base model
        input_tensor = Input(shape=(224, 224, 3))
        base_model = MobileNetV2(
            input_tensor=input_tensor,
            weights='imagenet',
            include_top=False
        )
        
        # Freeze the base model layers
        base_model.trainable = False
        
        # Add custom layers
        x = base_model.output
        x = GlobalAveragePooling2D()(x)
        x = Dense(1024, activation='relu')(x)
        predictions = Dense(num_classes, activation='softmax')(x)
        
        # Create the model
        model = Model(inputs=input_tensor, outputs=predictions)
        
        # Compile the model
        model.compile(
            optimizer='adam',
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        return model

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
        
        # Get all unique dish names in alphabetical order
        class_names = sorted(model_loader.df['Name'].unique())
        predicted_dish = class_names[predicted_class]
        
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
        recommendations = model_loader.df.sample(n=min(3, len(model_loader.df)))
        return recommendations[['Name', 'Calories', 'Protein (g)', 'Carbs (g)', 'Total Fat (g)', 'Fiber (g)']].to_dict('records')
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        raise
