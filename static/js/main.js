let nutritionChart = null;
let recommendationCharts = [];

document.addEventListener('DOMContentLoaded', () => {
    // Initialize navigation
    initializeNavigation();
    
    // Initialize form handlers
    const uploadForm = document.getElementById('upload-form');
    const imageInput = document.getElementById('image-input');
    const imagePreview = document.getElementById('image-preview');
    
    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert('File size should not exceed 5MB');
                    imageInput.value = '';
                    return;
                }
                
                // Validate file type
                const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
                if (!validTypes.includes(file.type)) {
                    alert('Please upload a valid image file (JPEG, JPG, or PNG)');
                    imageInput.value = '';
                    return;
                }
                
                // Show preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.innerHTML = `
                        <img src="${e.target.result}" alt="Preview" class="preview-image">
                        <p class="file-name">${file.name}</p>
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
            const analysisSection = document.getElementById('results-section');
            
            // Show loading state
            resultsDiv.innerHTML = `
                <div class="analyzing">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Analyzing your dish... Please wait</span>
                </div>
            `;
            
            // Show analysis section
            analysisSection.style.display = 'block';
            
            // Scroll to results
            resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            const formData = new FormData(uploadForm);
            
            try {
                const response = await fetch('/predict', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }
                
                // Display results
                displayResults(data);
                displayNutritionalInfo(data.nutritional_info);
                displayUserProfile();
                displayRecommendations(data.recommendations);
                
            } catch (error) {
                console.error('Error:', error);
                resultsDiv.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <span>Error: ${error.message}</span>
                    </div>
                `;
            }
        });
    }
});

function displayResults(result) {
    const resultsDiv = document.getElementById('results');
    const confidence = (result.confidence * 100).toFixed(1);
    
    resultsDiv.innerHTML = `
        <div class="results-card">
            <div class="results-header">
                <h3 class="dish-title">
                    <i class="fas fa-utensils"></i>
                    ${result.predicted_dish}
                </h3>
                <div class="confidence-badge">
                    <i class="fas fa-check-circle"></i>
                    ${confidence}% Confidence
                </div>
            </div>
            ${result.nutritional_info.Ingredients ? `
                <div class="ingredients-section">
                    <h4><i class="fas fa-mortar-pestle"></i> Ingredients</h4>
                    <p>${result.nutritional_info.Ingredients}</p>
                </div>
            ` : ''}
        </div>
    `;
}

function displayNutritionalInfo(nutritionalInfo) {
    const resultsDiv = document.getElementById('results');
    
    // Create nutrition circles
    const nutritionCircles = document.createElement('div');
    nutritionCircles.className = 'nutrition-circles';
    
    const mainNutrients = [
        { name: 'Calories', value: nutritionalInfo['Calories'] || 0, unit: 'kcal', icon: 'fa-fire' },
        { name: 'Protein', value: nutritionalInfo['Protein (g)'] || 0, unit: 'g', icon: 'fa-dumbbell' },
        { name: 'Carbs', value: nutritionalInfo['Carbs (g)'] || 0, unit: 'g', icon: 'fa-bread-slice' },
        { name: 'Fat', value: nutritionalInfo['Total Fat (g)'] || 0, unit: 'g', icon: 'fa-cheese' },
        { name: 'Fiber', value: nutritionalInfo['Fiber (g)'] || 0, unit: 'g', icon: 'fa-seedling' }
    ];
    
    const nutritionHTML = mainNutrients.map(nutrient => `
        <div class="nutrition-item">
            <div class="nutrition-icon">
                <i class="fas ${nutrient.icon}"></i>
            </div>
            <div class="nutrition-value">
                ${Math.round(nutrient.value)}${nutrient.unit}
            </div>
            <div class="nutrition-label">${nutrient.name}</div>
        </div>
    `).join('');
    
    const nutritionSection = `
        <div class="nutrition-section">
            <h3><i class="fas fa-chart-pie"></i> Nutritional Information</h3>
            <div class="nutrition-grid">
                ${nutritionHTML}
            </div>
        </div>
    `;
    
    resultsDiv.insertAdjacentHTML('beforeend', nutritionSection);
}

function displayUserProfile() {
    const userProfile = {
        age: 30,
        gender: 'Female',
        height: 165,
        weight: 60,
        activityLevel: 'Moderate',
        goal: 'Maintain weight'
    };
    
    const profileDiv = document.getElementById('user-profile');
    if (profileDiv) {
        profileDiv.innerHTML = `
            <div class="profile-card">
                <h3><i class="fas fa-user"></i> User Profile</h3>
                <div class="profile-grid">
                    <div class="profile-item">
                        <span class="label">Age:</span>
                        <span class="value">${userProfile.age} years</span>
                    </div>
                    <div class="profile-item">
                        <span class="label">Gender:</span>
                        <span class="value">${userProfile.gender}</span>
                    </div>
                    <div class="profile-item">
                        <span class="label">Height:</span>
                        <span class="value">${userProfile.height} cm</span>
                    </div>
                    <div class="profile-item">
                        <span class="label">Weight:</span>
                        <span class="value">${userProfile.weight} kg</span>
                    </div>
                    <div class="profile-item">
                        <span class="label">Activity Level:</span>
                        <span class="value">${userProfile.activityLevel}</span>
                    </div>
                    <div class="profile-item">
                        <span class="label">Goal:</span>
                        <span class="value">${userProfile.goal}</span>
                    </div>
                </div>
            </div>
        `;
    }
}

function displayRecommendations(recommendations) {
    const recommendationsDiv = document.getElementById('recommendations-list');
    if (!recommendationsDiv || !recommendations) return;
    
    recommendationsDiv.innerHTML = recommendations.map(dish => `
        <div class="recommendation-card">
            <div class="recommendation-header">
                <h4><i class="fas fa-utensils"></i> ${dish.Name}</h4>
            </div>
            <div class="nutrition-summary">
                <div class="nutrition-item">
                    <i class="fas fa-fire"></i>
                    <span>${Math.round(dish.Calories)} kcal</span>
                </div>
                <div class="nutrition-item">
                    <i class="fas fa-dumbbell"></i>
                    <span>${dish['Protein (g)']?.toFixed(1)}g protein</span>
                </div>
                <div class="nutrition-item">
                    <i class="fas fa-bread-slice"></i>
                    <span>${dish['Carbs (g)']?.toFixed(1)}g carbs</span>
                </div>
                <div class="nutrition-item">
                    <i class="fas fa-cheese"></i>
                    <span>${dish['Total Fat (g)']?.toFixed(1)}g fat</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Navigation functions
function initializeNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            }
        });
    }
}

// Helper function to format numbers
function formatNumber(number) {
    return number ? number.toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }) : '0';
}