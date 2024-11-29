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
                
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    const result = await response.json();
                    if (response.ok) {
                        displayResults(result);
                        displayNutritionalInfo(result.nutritional_info);
                        displayUserProfile();
                        displayRecommendations(result.recommendations);
                        scrollToResults();
                    } else {
                        throw new Error(result.error || 'Unknown error occurred');
                    }
                } else {
                    const text = await response.text();
                    throw new Error(`Invalid response format. Status: ${response.status}, Body: ${text}`);
                }
            } catch (error) {
                console.error('Error:', error);
                resultsDiv.innerHTML = `
                    <div class="error">
                        <i class="fas fa-exclamation-circle"></i>
                        Error: ${error.message}
                    </div>`;
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
        { name: 'Fat', value: nutritionalInfo['Total Fat (g)'] || 0, unit: 'g', max: 65, icon: 'fa-cheese', className: 'fats' }, // Changed this line
        { name: 'Fiber', value: nutritionalInfo['Fiber (g)'] || 0, unit: 'g', max: 30, icon: 'fa-seedling' }
    ];
    
    mainNutrients.forEach(nutrient => {
        const percentage = Math.min((nutrient.value / nutrient.max) * 100, 100);
        const item = document.createElement('div');
        item.className = 'nutrition-item';
        
        item.innerHTML = `
            <div class="circle-progress ${nutrient.className || nutrient.name.toLowerCase()}" style="--progress-rotation: ${(percentage / 100) * 360}deg">
                <div class="nutrition-value">
                    <i class="fas ${nutrient.icon}"></i>
                    <span>${Math.round(nutrient.value)}${nutrient.unit}</span>
                </div>
            </div>
            <div class="nutrition-label">${nutrient.name}</div>
        `;
        
        if (percentage >= 50) {
            item.querySelector('.circle-progress').classList.add('full');
        }
        
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
    // Filter out main nutrients and non-nutritional info
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
        let displayValue = value;
        let unit = '';
        
        if (typeof value === 'number') {
            if (key.includes('(g)')) {
                displayValue = value.toFixed(1);
                unit = 'g';
            } else if (key.includes('(mg)')) {
                displayValue = value.toFixed(1);
                unit = 'mg';
            } else if (key.includes('(%DV)')) {
                displayValue = value.toFixed(1);
                unit = '%';
            }
        }

        const nutrientItem = {
            name: key.replace(/\([^)]*\)/g, '').trim(),
            value: `${displayValue}${unit}`
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
                            <div class="category-icon">
                                <i class="fas ${category.icon}"></i>
                            </div>
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
                    <div class="profile-icon">
                        <i class="fas fa-birthday-cake"></i>
                    </div>
                    <div class="profile-item-content">
                        <div class="profile-item-label">Age</div>
                        <div class="profile-item-value">${userProfile.age} years</div>
                    </div>
                </div>
                
                <div class="profile-item">
                    <div class="profile-icon">
                        <i class="fas fa-venus-mars"></i>
                    </div>
                    <div class="profile-item-content">
                        <div class="profile-item-label">Gender</div>
                        <div class="profile-item-value">${userProfile.gender}</div>
                    </div>
                </div>
                
                <div class="profile-item">
                    <div class="profile-icon">
                        <i class="fas fa-ruler-vertical"></i>
                    </div>
                    <div class="profile-item-content">
                        <div class="profile-item-label">Height</div>
                        <div class="profile-item-value">${userProfile.height} cm</div>
                    </div>
                </div>
                
                <div class="profile-item">
                    <div class="profile-icon">
                        <i class="fas fa-weight"></i>
                    </div>
                    <div class="profile-item-content">
                        <div class="profile-item-label">Weight</div>
                        <div class="profile-item-value">${userProfile.weight} kg</div>
                    </div>
                </div>
                
                <div class="profile-item">
                    <div class="profile-icon">
                        <i class="fas fa-running"></i>
                    </div>
                    <div class="profile-item-content">
                        <div class="profile-item-label">Activity Level</div>
                        <div class="profile-item-value">${userProfile.activityLevel}</div>
                    </div>
                </div>
                
                <div class="profile-item">
                    <div class="profile-icon">
                        <i class="fas fa-bullseye"></i>
                    </div>
                    <div class="profile-item-content">
                        <div class="profile-item-label">Health Goal</div>
                        <div class="profile-item-value">${userProfile.healthGoal}</div>
                    </div>
                </div>
            </div>

            <div class="bmi-card">
                <div class="bmi-header">
                    <i class="fas fa-calculator"></i>
                    <h3>BMI Calculator</h3>
                    </div>
                <div class="bmi-value">${bmi.toFixed(1)}</div>
                <div class="bmi-category ${bmiCategory.toLowerCase().replace(' ', '-')}">
                    ${bmiCategory}
                </div>
                <p class="bmi-description">
                    Your Body Mass Index (BMI) indicates your weight category for your height.
                </p>
            </div>

            <div class="dietary-restrictions">
                <h4><i class="fas fa-exclamation-triangle"></i> Dietary Restrictions</h4>
                <div class="restrictions-list">
                    ${userProfile.dietaryRestrictions.map(restriction => `
                        <div class="restriction-item">
                            <i class="fas fa-ban"></i>
                            <span>${restriction}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function displayRecommendations(recommendations) {
    const recommendationsListDiv = document.getElementById('recommendations-list');
    const recommendationReasonsDiv = document.getElementById('recommendation-reasons');

    recommendationReasonsDiv.innerHTML = `
        <div class="recommendation-criteria-card fade-in">
            <h3><i class="fas fa-lightbulb"></i> Recommendation Criteria</h3>
            <ul class="criteria-list">
                <li class="criteria-item">
                    <div class="criteria-icon">
                        <i class="fas fa-dumbbell"></i>
                    </div>
                    <span>Rich in protein for muscle maintenance</span>
                </li>
                <li class="criteria-item">
                    <div class="criteria-icon">
                        <i class="fas fa-bread-slice"></i>
                    </div>
                    <span>Balanced complex carbohydrates</span>
                </li>
                <li class="criteria-item">
                    <div class="criteria-icon">
                        <i class="fas fa-cheese"></i>
                    </div>
                    <span>Healthy fats for hormone balance</span>
                </li>
                <li class="criteria-item">
                    <div class="criteria-icon">
                        <i class="fas fa-seedling"></i>
                    </div>
                    <span>High fiber for digestive health</span>
                </li>
            </ul>
        </div>
    `;

    // Clear existing charts
    recommendationCharts.forEach(chart => chart.destroy());
    recommendationCharts = [];

    recommendationsListDiv.innerHTML = recommendations.map((dish, index) => `
        <div class="recommendation-card fade-in">
            <div class="recommendation-header">
                <h3><i class="fas fa-utensils"></i> ${dish.Name}</h3>
            </div>
            <div class="recommendation-chart">
                <div class="pie-chart">
                    <canvas id="recommendation-chart-${index}" height="200"></canvas>
                </div>
                <div class="ingredients-section">
                    <h4><i class="fas fa-mortar-pestle"></i> Ingredients</h4>
                    <p>${dish.Ingredients || 'Ingredients information not available'}</p>
                </div>
                <div class="nutrient-list">
                    <div class="nutrient-item">
                        <div class="nutrient-icon">
                            <i class="fas fa-dumbbell"></i>
                        </div>
                        <span>${dish['Protein (g)'].toFixed(1)}g protein</span>
                    </div>
                    <div class="nutrient-item">
                        <div class="nutrient-icon">
                            <i class="fas fa-bread-slice"></i>
                        </div>
                        <span>${dish['Carbs (g)'].toFixed(1)}g carbs</span>
                    </div>
                    <div class="nutrient-item">
                        <div class="nutrient-icon">
                            <i class="fas fa-cheese"></i>
                        </div>
                        <span>${dish['Total Fat (g)'].toFixed(1)}g fat</span>
                    </div>
                    <div class="nutrient-item">
                        <div class="nutrient-icon">
                            <i class="fas fa-seedling"></i>
                        </div>
                        <span>${dish['Fiber (g)'].toFixed(1)}g fiber</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Create pie charts for each recommendation
    recommendations.forEach((dish, index) => {
        createPieChart(`recommendation-chart-${index}`, {
            labels: ['Calories', 'Protein', 'Carbs', 'Fat', 'Fiber'],
            data: [
                dish['Calories'],
                dish['Protein (g)'],
                dish['Carbs (g)'],
                dish['Total Fat (g)'],
                dish['Fiber (g)']
            ],
            colors: ['#ED64A6', '#F56565', '#48BB78', '#ECC94B', '#4299E1']
        });
    });
}

function createPieChart(canvasId, chartData) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: chartData.labels,
            datasets: [{
                data: chartData.data,
                backgroundColor: chartData.colors,
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
                            size: 12,
                            family: "'Poppins', sans-serif"
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw.toFixed(1);
                            return `${label}: ${value}${label === 'Calories' ? ' kcal' : 'g'}`;
                        }
                    }
                }
            }
        }
    });
    recommendationCharts.push(chart);
    return chart;
}

function scrollToResults() {
    const resultsSection = document.getElementById('results-section');
    resultsSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

function showLoadingSpinner() {
    document.getElementById('loading-spinner').classList.remove('hidden');
}

function hideLoadingSpinner() {
    document.getElementById('loading-spinner').classList.add('hidden');
}

// Handle window resize for charts
window.addEventListener('resize', () => {
    if (recommendationCharts.length > 0) {
        recommendationCharts.forEach(chart => {
            if (chart) {
                chart.resize();
            }
        });
    }
});

// Initialize tooltips if needed
function initTooltips() {
    const tooltips = document.querySelectorAll('[data-tooltip]');
    tooltips.forEach(tooltip => {
        // Initialize tooltips if you decide to add them
    });
}

// Export for testing if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateBMI,
        getBMICategory,
        createPieChart
    };
}