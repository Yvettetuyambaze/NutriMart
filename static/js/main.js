document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const imageInput = document.getElementById('image-input');
    const imagePreview = document.getElementById('image-preview');
    const resultsSection = document.getElementById('results-section');

    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    alert('File size should not exceed 5MB');
                    imageInput.value = '';
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.innerHTML = `
                        <img src="${e.target.result}" alt="Preview" style="max-width: 100%; max-height: 300px;">
                    `;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const resultsDiv = document.getElementById('results');
            
            // Show loading state
            resultsDiv.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <i class="fas fa-spinner fa-spin fa-2x"></i>
                    <p>Analyzing your dish...</p>
                </div>
            `;
            
            // Show results section
            resultsSection.style.display = 'block';
            
            try {
                const formData = new FormData(uploadForm);
                const response = await fetch('/predict', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                if (data.error) {
                    throw new Error(data.error);
                }

                // Display results
                displayResults(data);
                
                // Scroll to results
                resultsSection.scrollIntoView({ behavior: 'smooth' });

            } catch (error) {
                console.error('Error:', error);
                resultsDiv.innerHTML = `
                    <div style="color: red; padding: 20px;">
                        <i class="fas fa-exclamation-circle"></i>
                        Error: ${error.message}
                    </div>
                `;
            }
        });
    }
});

function displayResults(data) {
    const resultsDiv = document.getElementById('results');
    const confidence = (data.confidence * 100).toFixed(1);

    resultsDiv.innerHTML = `
        <div class="results-container">
            <div class="prediction-result">
                <h3><i class="fas fa-utensils"></i> Predicted Dish</h3>
                <p class="dish-name">${data.predicted_dish}</p>
                <p class="confidence">Confidence: ${confidence}%</p>
            </div>

            <div class="nutritional-info">
                <h3><i class="fas fa-info-circle"></i> Nutritional Information</h3>
                <div class="nutrition-grid">
                    <div class="nutrition-item">
                        <i class="fas fa-fire"></i>
                        <span>Calories: ${Math.round(data.nutritional_info.Calories)} kcal</span>
                    </div>
                    <div class="nutrition-item">
                        <i class="fas fa-dumbbell"></i>
                        <span>Protein: ${data.nutritional_info['Protein (g)'].toFixed(1)}g</span>
                    </div>
                    <div class="nutrition-item">
                        <i class="fas fa-bread-slice"></i>
                        <span>Carbs: ${data.nutritional_info['Carbs (g)'].toFixed(1)}g</span>
                    </div>
                    <div class="nutrition-item">
                        <i class="fas fa-cheese"></i>
                        <span>Fat: ${data.nutritional_info['Total Fat (g)'].toFixed(1)}g</span>
                    </div>
                    <div class="nutrition-item">
                        <i class="fas fa-seedling"></i>
                        <span>Fiber: ${data.nutritional_info['Fiber (g)'].toFixed(1)}g</span>
                    </div>
                </div>
            </div>

            ${data.recommendations ? `
                <div class="recommendations">
                    <h3><i class="fas fa-lightbulb"></i> Recommendations</h3>
                    <div class="recommendations-grid">
                        ${data.recommendations.map(dish => `
                            <div class="recommendation-item">
                                <h4>${dish.Name}</h4>
                                <div class="nutrition-summary">
                                    <span>${Math.round(dish.Calories)} kcal</span>
                                    <span>${dish['Protein (g)'].toFixed(1)}g protein</span>
                                    <span>${dish['Carbs (g)'].toFixed(1)}g carbs</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}