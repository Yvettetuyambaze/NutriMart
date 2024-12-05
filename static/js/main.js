document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const imageInput = document.getElementById('image-input');
    const imagePreview = document.getElementById('image-preview');
    const resultsSection = document.getElementById('results-section');

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        }
    });

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const resultsDiv = document.getElementById('results');
        
        // Show loading
        resultsDiv.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Analyzing dish...</p>
            </div>
        `;
        resultsSection.style.display = 'block';

        try {
            const formData = new FormData(uploadForm);
            const response = await fetch('/predict', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            // Display results
            resultsDiv.innerHTML = `
                <div class="result-card">
                    <div class="dish-prediction">
                        <div class="dish-name">
                            <i class="fas fa-utensils"></i>
                            ${data.predicted_dish}
                        </div>
                        <div class="confidence">
                            <i class="fas fa-check-circle"></i>
                            ${(data.confidence * 100).toFixed(1)}% Confidence
                        </div>
                    </div>

                    <div class="nutritional-info">
                        <h3>Nutritional Information</h3>
                        <div class="nutritional-grid">
                            <div class="nutrient-item">
                                <i class="fas fa-fire"></i>
                                <div class="nutrient-value">${Math.round(data.nutritional_info.Calories)}</div>
                                <div class="nutrient-label">Calories</div>
                            </div>
                            <div class="nutrient-item">
                                <i class="fas fa-dumbbell"></i>
                                <div class="nutrient-value">${data.nutritional_info['Protein (g)']}</div>
                                <div class="nutrient-label">Protein (g)</div>
                            </div>
                            <div class="nutrient-item">
                                <i class="fas fa-bread-slice"></i>
                                <div class="nutrient-value">${data.nutritional_info['Carbs (g)']}</div>
                                <div class="nutrient-label">Carbs (g)</div>
                            </div>
                            <div class="nutrient-item">
                                <i class="fas fa-cheese"></i>
                                <div class="nutrient-value">${data.nutritional_info['Total Fat (g)']}</div>
                                <div class="nutrient-label">Fat (g)</div>
                            </div>
                            <div class="nutrient-item">
                                <i class="fas fa-seedling"></i>
                                <div class="nutrient-value">${data.nutritional_info['Fiber (g)']}</div>
                                <div class="nutrient-label">Fiber (g)</div>
                            </div>
                        </div>

                        <div class="ingredients">
                            <h3>Ingredients</h3>
                            <p>${data.nutritional_info.Ingredients}</p>
                        </div>
                    </div>
                </div>

                <div class="result-card">
                    <h3>Recommended Dishes</h3>
                    <div class="recommendations">
                        ${data.recommendations.map(dish => `
                            <div class="recommendation-card">
                                <h4>${dish.Name}</h4>
                                <div class="nutrient-item">
                                    <i class="fas fa-fire"></i>
                                    <div class="nutrient-value">${Math.round(dish.Calories)}</div>
                                    <div class="nutrient-label">Calories</div>
                                </div>
                                <div class="nutrient-details">
                                    <span>Protein: ${dish['Protein (g)']}g</span>
                                    <span>Carbs: ${dish['Carbs (g)']}g</span>
                                    <span>Fat: ${dish['Total Fat (g)']}g</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            // Scroll to results
            resultsSection.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            resultsDiv.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-circle"></i>
                    Error: ${error.message}
                </div>
            `;
        }
    });
});