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
                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.innerHTML = `<img src="${e.target.result}" alt="Uploaded Image">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(uploadForm);
            const resultsDiv = document.getElementById('results');
            resultsDiv.innerHTML = `
                <div class="analyzing">
                    <i class="fas fa-spinner fa-spin"></i>
                    Analyzing your dish...
                </div>
            `;
            showLoadingSpinner();
            
            try {
                const response = await fetch('/predict', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const result = await response.json();
                displayResults(result);
                displayNutritionalInfo(result.nutritional_info);
                displayUserProfile();
                displayRecommendations(result.recommendations);
                scrollToResults();
                
            } catch (error) {
                console.error('Error:', error);
                resultsDiv.innerHTML = `
                    <div class="error">
                        <i class="fas fa-exclamation-circle"></i>
                        Error: ${error.message}
                    </div>
                `;
            } finally {
                hideLoadingSpinner();
            }
        });
    }
});

// Navigation Functions
function initializeNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const navLinksItems = document.querySelectorAll('.nav-links li a');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', toggleMenu);
        
        // Close menu when clicking a link
        navLinksItems.forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!hamburger.contains(e.target) && 
                !navLinks.contains(e.target) && 
                navLinks.classList.contains('active')) {
                closeMenu();
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && navLinks.classList.contains('active')) {
                closeMenu();
            }
        });
    }
}

function toggleMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
    document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
}

function closeMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    hamburger.classList.remove('active');
    navLinks.classList.remove('active');
    document.body.style.overflow = '';
}

// Display Functions
function displayResults(result) {
    const resultsDiv = document.getElementById('results');
    const confidence = (result.confidence * 100).toFixed(1);
    
    resultsDiv.innerHTML = `
        <div class="results-card fade-in">
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
    
    // Add title section
    const titleSection = document.createElement('div');
    titleSection.className = 'nutrition-title fade-in';
    titleSection.innerHTML = `
        <h3>
            <i class="fas fa-chart-pie"></i>
            Key Nutritional Information
        </h3>
        <p>Daily values based on a 2000 calorie diet</p>
    `;
    resultsDiv.appendChild(titleSection);
    
    // Create main nutrition circles
    const nutritionCircles = document.createElement('div');
    nutritionCircles.className = 'nutrition-circles fade-in';
    
    const mainNutrients = [
        { name: 'Calories', value: nutritionalInfo['Calories'] || 0, unit: 'kcal', max: 2000, icon: 'fa-fire' },
        { name: 'Protein', value: nutritionalInfo['Protein (g)'] || 0, unit: 'g', max: 50, icon: 'fa-dumbbell' },
        { name: 'Carbs', value: nutritionalInfo['Carbs (g)'] || 0, unit: 'g', max: 300, icon: 'fa-bread-slice' },
        { name: 'Fat', value: nutritionalInfo['Total Fat (g)'] || 0, unit: 'g', max: 65, icon: 'fa-cheese' },
        { name: 'Fiber', value: nutritionalInfo['Fiber (g)'] || 0, unit: 'g', max: 30, icon: 'fa-seedling' }
    ];
    
    mainNutrients.forEach(nutrient => {
        const percentage = Math.min((nutrient.value / nutrient.max) * 100, 100);
        const item = document.createElement('div');
        item.className = 'nutrition-item';
        
        item.innerHTML = `
            <div class="circle-progress ${nutrient.name.toLowerCase()}" style="--progress-rotation: ${(percentage / 100) * 360}deg">
                <div class="nutrition-value">
                    <i class="fas ${nutrient.icon}"></i>
                    <span>${Math.round(nutrient.value)}${nutrient.unit}</span>
                </div>
            </div>
            <div class="nutrition-label">${nutrient.name}</div>
        `;
        
        nutritionCircles.appendChild(item);
    });
    
    resultsDiv.appendChild(nutritionCircles);

    // Create detailed nutrition section
    const detailedNutrition = createDetailedNutritionSection(nutritionalInfo);
    if (detailedNutrition) {
        resultsDiv.appendChild(detailedNutrition);
    }
}

function createDetailedNutritionSection(nutritionalInfo) {
    const detailedNutrients = Object.entries(nutritionalInfo).filter(([key, value]) => {
        const mainNutrientKeys = ['Calories', 'Protein (g)', 'Carbs (g)', 'Total Fat (g)', 'Fiber (g)'];
        return !mainNutrientKeys.includes(key) && 
               key !== 'Ingredients' && 
               key !== 'calorieDeficit' &&
               value !== null;
    });

    if (detailedNutrients.length === 0) return null;

    const categories = {
        vitamins: {
            title: 'Vitamins',
            icon: 'fa-tablets',
            items: []
        },
        minerals: {
            title: 'Minerals',
            icon: 'fa-flask',
            items: []
        },
        fats: {
            title: 'Fats & Cholesterol',
            icon: 'fa-oil-can',
            items: []
        },
        others: {
            title: 'Other Nutrients',
            icon: 'fa-puzzle-piece',
            items: []
        }
    };

    // Categorize nutrients
    detailedNutrients.forEach(([key, value]) => {
        const nutrientItem = {
            name: key.replace(/\([^)]*\)/g, '').trim(),
            value: typeof value === 'number' ? value.toFixed(1) : value
        };

        if (key.toLowerCase().includes('vitamin')) {
            categories.vitamins.items.push(nutrientItem);
        } else if (
            key.toLowerCase().includes('calcium') || 
            key.toLowerCase().includes('iron') || 
            key.toLowerCase().includes('zinc') || 
            key.toLowerCase().includes('sodium') || 
            key.toLowerCase().includes('potassium')
        ) {
            categories.minerals.items.push(nutrientItem);
        } else if (
            key.toLowerCase().includes('fat') || 
            key.toLowerCase().includes('cholesterol')
        ) {
            categories.fats.items.push(nutrientItem);
        } else {
            categories.others.items.push(nutrientItem);
        }
    });

    const detailedNutrition = document.createElement('div');
    detailedNutrition.className = 'detailed-nutrition-card fade-in';
    
    detailedNutrition.innerHTML = `
        <h4>
            <i class="fas fa-list-ul"></i>
            Additional Nutritional Information
        </h4>
        <div class="nutrition-categories">
            ${Object.values(categories).map(category => {
                if (category.items.length === 0) return '';
                return `
                    <div class="nutrition-category">
                        <div class="category-header">
                            <i class="fas ${category.icon}"></i>
                            ${category.title}
                        </div>
                        <div class="nutrition-items">
                            ${category.items.map(item => `
                                <div class="nutrition-item-detailed">
                                    <span class="nutrition-key">${item.name}</span>
                                    <span class="nutrition-value-detailed">${item.value}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    return detailedNutrition;
}

function calculateBMI(weight, height) {
    return weight / ((height / 100) ** 2);
}

function getBMICategory(bmi) {
    if (bmi < 18.5) return "Underweight";
    if (bmi < 25) return "Normal weight";
    if (bmi < 30) return "Overweight";
    return "Obese";
}

function displayUserProfile() {
    const userProfileDiv = document.getElementById('user-profile');
    const userProfile = {
        age: 30,
        gender: 'Female',
        height: 160,
        weight: 70,
        activityLevel: 'Moderately Active',
        healthGoal: 'Lose Weight',
        dietaryRestrictions: ['Lactose Intolerant']
    };

    const bmi = calculateBMI(userProfile.weight, userProfile.height);
    const bmiCategory = getBMICategory(bmi);

    userProfileDiv.innerHTML = `
        <div class="profile-card fade-in">
            <div class="profile-header">
                <div class="profile-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <h3 class="profile-name">Your Profile</h3>
                <p>Health & Fitness Journey</p>
            </div>
            
            <div class="profile-grid">
                <div class="profile-item">
                    <i class="fas fa-birthday-cake"></i>
                    <span>Age: ${userProfile.age} years</span>
                </div>
                <div class="profile-item">
                    <i class="fas fa-venus-mars"></i>
                    <span>Gender: ${userProfile.gender}</span>
                </div>
                <div class="profile-item">
                    <i class="fas fa-ruler-vertical"></i>
                    <span>Height: ${userProfile.height} cm</span>
                </div>
                <div class="profile-item">
                    <i class="fas fa-weight"></i>
                    <span>Weight: ${userProfile.weight} kg</span>
                </div>
                <div class="profile-item">
                    <i class="fas fa-running"></i>
                    <span>Activity: ${userProfile.activityLevel}</span>
                </div>
                <div class="profile-item">
                    <i class="fas fa-bullseye"></i>
                    <span>Goal: ${userProfile.healthGoal}</span>
                </div>
            </div>

            <div class="bmi-section">
                <h4>BMI Calculator</h4>
                <div class="bmi-value">${bmi.toFixed(1)}</div>
                <div class="bmi-category ${bmiCategory.toLowerCase().replace(' ', '-')}">
                    ${bmiCategory}
                </div>
            </div>

            <div class="dietary-restrictions">
                <h4>Dietary Restrictions</h4>
                ${userProfile.dietaryRestrictions.map(restriction => `
                    <div class="restriction-badge">
                        <i class="fas fa-exclamation-circle"></i>
                        ${restriction}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function displayRecommendations(recommendations) {
    const recommendationsDiv = document.getElementById('recommendations-list');
    
    // Clear existing charts
    recommendationCharts.forEach(chart => chart.destroy());
    recommendationCharts = [];

    recommendationsDiv.innerHTML = recommendations.map((dish, index) => `
        <div class="recommendation-card fade-in">
            <h3>${dish.Name}</h3>
            <div class="recommendation-content">
                <canvas id="recommendation-chart-${index}"></canvas>
                <div class="recommendation-details">
                    <div class="nutrient-info">
                        <div class="nutrient-item">
                            <i class="fas fa-fire"></i>
                            <span>${dish.Calories} kcal</span>
                        </div>
                        <div class="nutrient-item">
                            <i class="fas fa-dumbbell"></i>
                            <span>${dish['Protein (g)']}g protein</span>
                        </div>
                        <div class="nutrient-item">
                            <i class="fas fa-bread-slice"></i>
                            <span>${dish['Carbs (g)']}g carbs</span>
                        </div>
                        <div class="nutrient-item">
                            <i class="fas fa-cheese"></i>
                            <span>${dish['Total Fat (g)']}g fat</span>
                        </div>
                    </div>
                    <div class="ingredients">
                        <h4><i class="fas fa-mortar-pestle"></i> Ingredients</h4>
                        <p>${dish.Ingredients || 'Ingredients information not available'}</p>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Create charts for each recommendation
    recommendations.forEach((dish, index) => {
        const ctx = document.getElementById(`recommendation-chart-${index}`).getContext('2d');
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Protein', 'Carbs', 'Fat', 'Fiber'],
                datasets: [{
                    data: [
                        dish['Protein (g)'],
                        dish['Carbs (g)'],
                        dish['Total Fat (g)'],
                        dish['Fiber (g)']
                    ],
                    backgroundColor: [
                        '#F56565', // Red for protein
                        '#48BB78', // Green for carbs
                        '#ECC94B', // Yellow for fat
                        '#4299E1'  // Blue for fiber
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                family: "'Poppins', sans-serif"
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.raw}g`;
                            }
                        }
                    }
                }
            }
        });
        recommendationCharts.push(chart);
    });
}

// Utility Functions
function showLoadingSpinner() {
    document.getElementById('loading-spinner').classList.remove('hidden');
}

function hideLoadingSpinner() {
    document.getElementById('loading-spinner').classList.add('hidden');
}

function scrollToResults() {
    const resultsSection = document.getElementById('results-section');
    resultsSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

// Chart Resize Handler
window.addEventListener('resize', () => {
    if (recommendationCharts.length > 0) {
        recommendationCharts.forEach(chart => {
            if (chart) {
                chart.resize();
            }
        });
    }
});

// Error Handler
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) {
        resultsDiv.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-circle"></i>
                An unexpected error occurred. Please try again.
            </div>
        `;
    }
    hideLoadingSpinner();
});

// Initialize tooltips if needed
function initTooltips() {
    const tooltips = document.querySelectorAll('[data-tooltip]');
    tooltips.forEach(tooltip => {
        // Add tooltip initialization code here if needed
    });
}

// Export functions for testing if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateBMI,
        getBMICategory,
        displayResults,
        displayNutritionalInfo,
        displayUserProfile,
        displayRecommendations
    };
}