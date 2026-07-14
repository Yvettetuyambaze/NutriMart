let nutritionChart = null;
let recommendationCharts = [];
let lastPredictionResult = null;

function translate(key) {
    return (typeof window.t === 'function') ? window.t(key) : key;
}

function fmtNum(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(1) : '0.0';
}

document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initUploadForm();
});

function initUploadForm() {
    const uploadForm = document.getElementById('upload-form');
    const imageInput = document.getElementById('image-input');
    const imagePreview = document.getElementById('image-preview');
    const analyzeBtn = document.getElementById('analyze-btn');

    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    imagePreview.innerHTML = `<img src="${ev.target.result}" alt="Uploaded food">`;
                    document.getElementById('upload-area')?.classList.add('has-image');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const handleAnalyze = async (e) => {
        if (e) e.preventDefault();

        if (!imageInput || !imageInput.files || !imageInput.files[0]) {
            alert(translate('home.upload_desc'));
            return;
        }

        const resultsDiv = document.getElementById('results');
        if (!resultsDiv) return;

        resultsDiv.innerHTML = `
            <div class="card-body analyzing">
                <i class="fas fa-spinner fa-spin"></i>
                ${translate('home.analyzing')}
            </div>
        `;
        showLoadingSpinner();

        try {
            const formData = new FormData();
            formData.append('image', imageInput.files[0]);

            const response = await fetch('/predict', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || translate('home.error'));
            }

            displayResults(result);
            lastPredictionResult = result;
            displayNutritionalInfo(result.nutritional_info);
            await displayUserProfile();
            displayRecommendations(result.recommendations || []);
            scrollToResults();
        } catch (error) {
            console.error('Predict error:', error);
            resultsDiv.innerHTML = `
                <div class="card-body error">
                    <i class="fas fa-exclamation-circle"></i>
                    ${translate('home.error')}: ${error.message}
                </div>`;
        } finally {
            hideLoadingSpinner();
        }
    };

    if (uploadForm) {
        uploadForm.addEventListener('submit', handleAnalyze);
    }
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', handleAnalyze);
    }
}

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
                !e.target.closest('.lang-switcher') &&
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
    const isOpen = navLinks.classList.toggle('active');
    hamburger.classList.toggle('active');
    hamburger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
}

function closeMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    hamburger.classList.remove('active');
    navLinks.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
}

// Display Functions
function displayResults(result) {
    const resultsDiv = document.getElementById('results');
    const confidence = (result.confidence * 100).toFixed(1);
    const topList = (result.top_predictions || []).map((item, i) => `
        <div class="meal-item" style="margin-bottom:0.4rem;">
            <div class="meal-item-info">
                <span class="meal-item-name">${i + 1}. ${item.dish}</span>
            </div>
            <span class="meal-item-cal">${(item.confidence * 100).toFixed(1)}%</span>
        </div>
    `).join('');

    resultsDiv.innerHTML = `
        <div class="results-card fade-in">
            <div class="results-header">
                <h3 class="dish-title">
                    <i class="fas fa-utensils"></i>
                    ${result.predicted_dish}
                </h3>
                <div class="confidence-badge">
                    <i class="fas fa-check-circle"></i>
                    ${translate('home.confidence')}: ${confidence}%
                </div>
            </div>
            ${result.model_mode === 'ai' ? `
                <div style="margin-bottom:1rem;">
                    <span style="display:inline-flex;align-items:center;gap:0.4rem;background:var(--accent-light);color:var(--accent-dark);padding:0.4rem 0.9rem;border-radius:999px;font-size:0.85rem;font-weight:600;">
                        <i class="fas fa-robot"></i> ${translate('home.ai_badge')}
                    </span>
                </div>
            ` : ''}
            ${result.nutritional_info.Ingredients ? `
                <div class="ingredients-section">
                    <h4><i class="fas fa-mortar-pestle"></i> ${translate('home.ingredients')}</h4>
                    <p>${result.nutritional_info.Ingredients}</p>
                </div>
            ` : ''}
            ${topList ? `
                <div style="margin-top:1rem;">
                    <h4 style="margin-bottom:0.75rem;font-size:0.95rem;color:var(--text-muted);">
                        <i class="fas fa-list-ol"></i> ${translate('home.top_guesses')}
                    </h4>
                    ${topList}
                </div>
            ` : ''}
            <div class="action-buttons" style="margin-top:1.25rem;display:flex;gap:0.75rem;flex-wrap:wrap;">
                <button class="btn btn-primary btn-sm add-to-log-btn" data-id="${result.prediction_id}">
                    <i class="fas fa-plus"></i> ${translate('action.add_to_tracker')}
                </button>
                <button class="btn btn-outline btn-sm add-to-plan-btn" data-name="${result.predicted_dish}">
                    <i class="fas fa-calendar-plus"></i> ${translate('action.add_to_plan')}
                </button>
            </div>
        </div>
    `;

    resultsDiv.querySelector('.add-to-log-btn')?.addEventListener('click', () => addPredictionToLog(result.prediction_id));
    resultsDiv.querySelector('.add-to-plan-btn')?.addEventListener('click', () => addDishToMealPlan(result.predicted_dish, result.nutritional_info));
}

function displayNutritionalInfo(nutritionalInfo) {
    const resultsDiv = document.getElementById('results');
    
    // Add title section
    const titleSection = document.createElement('div');
    titleSection.className = 'nutrition-title fade-in';
    titleSection.innerHTML = `
        <h3>
            <i class="fas fa-chart-pie"></i>
            ${translate('home.nutrition_title')}
        </h3>
        <p>${translate('home.nutrition_subtitle')}</p>
    `;
    resultsDiv.appendChild(titleSection);
    
    // Create main nutrition circles
    const nutritionCircles = document.createElement('div');
    nutritionCircles.className = 'nutrition-circles fade-in';
    
    const mainNutrients = [
        { name: translate('home.calories'), value: nutritionalInfo['Calories'] || 0, unit: 'kcal', max: 2000, icon: 'fa-fire' },
        { name: translate('home.protein'), value: nutritionalInfo['Protein (g)'] || 0, unit: 'g', max: 50, icon: 'fa-dumbbell' },
        { name: translate('home.carbs'), value: nutritionalInfo['Carbs (g)'] || 0, unit: 'g', max: 300, icon: 'fa-bread-slice' },
        { name: translate('home.fats'), value: nutritionalInfo['Total Fat (g)'] || 0, unit: 'g', max: 65, icon: 'fa-cheese', className: 'fats' },
        { name: translate('home.fiber'), value: nutritionalInfo['Fiber (g)'] || 0, unit: 'g', max: 30, icon: 'fa-seedling' }
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
        vitamins: { title: translate('home.vitamins'), icon: 'fa-tablets', items: [] },
        minerals: { title: translate('home.minerals'), icon: 'fa-flask', items: [] },
        fats: { title: translate('home.fats_cholesterol'), icon: 'fa-oil-can', items: [] },
        others: { title: translate('home.other_nutrients'), icon: 'fa-puzzle-piece', items: [] }
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
            ${translate('home.detailed_nutrition')}
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
    if (bmi < 18.5) return translate('home.bmi_under');
    if (bmi < 25) return translate('home.bmi_normal');
    if (bmi < 30) return translate('home.bmi_over');
    return translate('home.bmi_obese');
}

function displayUserProfile() {
    const userProfileDiv = document.getElementById('user-profile');
    if (!userProfileDiv) return Promise.resolve();

    return fetch('/api/profile')
        .then(res => res.json())
        .then(userProfile => {
            const bmi = userProfile.bmi || calculateBMI(userProfile.weight, userProfile.height);
            const bmiCategory = getBMICategory(bmi);
            const genderLabel = userProfile.gender === 'male' ? translate('auth.male') : translate('home.female');

            userProfileDiv.innerHTML = `
        <div class="profile-card fade-in">
            <div class="profile-header">
                <div class="profile-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <h3 class="profile-name">${userProfile.name || translate('home.profile_title')}</h3>
                <p>${translate('home.profile_subtitle')}</p>
            </div>
            
            <div class="profile-grid">
                <div class="profile-item">
                    <div class="profile-icon">
                        <i class="fas fa-birthday-cake"></i>
                    </div>
                    <div class="profile-item-content">
                        <div class="profile-item-label">${translate('home.age')}</div>
                        <div class="profile-item-value">${userProfile.age || '—'} ${translate('home.years')}</div>
                    </div>
                </div>
                
                <div class="profile-item">
                    <div class="profile-icon">
                        <i class="fas fa-venus-mars"></i>
                    </div>
                    <div class="profile-item-content">
                        <div class="profile-item-label">${translate('home.gender')}</div>
                        <div class="profile-item-value">${genderLabel}</div>
                    </div>
                </div>
                
                <div class="profile-item">
                    <div class="profile-icon">
                        <i class="fas fa-ruler-vertical"></i>
                    </div>
                    <div class="profile-item-content">
                        <div class="profile-item-label">${translate('home.height')}</div>
                        <div class="profile-item-value">${userProfile.height} cm</div>
                    </div>
                </div>
                
                <div class="profile-item">
                    <div class="profile-icon">
                        <i class="fas fa-weight"></i>
                    </div>
                    <div class="profile-item-content">
                        <div class="profile-item-label">${translate('home.weight')}</div>
                        <div class="profile-item-value">${userProfile.weight} kg</div>
                    </div>
                </div>
                
                <div class="profile-item">
                    <div class="profile-icon">
                        <i class="fas fa-running"></i>
                    </div>
                    <div class="profile-item-content">
                        <div class="profile-item-label">${translate('home.activity')}</div>
                        <div class="profile-item-value">${translate('auth.' + (userProfile.activity_level || 'moderate'))}</div>
                    </div>
                </div>
                
                <div class="profile-item">
                    <div class="profile-icon">
                        <i class="fas fa-bullseye"></i>
                    </div>
                    <div class="profile-item-content">
                        <div class="profile-item-label">${translate('profile.calorie_goal')}</div>
                        <div class="profile-item-value">${userProfile.calorie_goal || '—'} ${translate('common.cal')}</div>
                    </div>
                </div>
            </div>

            <div class="bmi-card">
                <div class="bmi-header">
                    <i class="fas fa-calculator"></i>
                    <h3>${translate('home.bmi_title')}</h3>
                    </div>
                <div class="bmi-value">${bmi ? bmi.toFixed(1) : '—'}</div>
                <div class="bmi-category">
                    ${bmiCategory}
                </div>
                <p class="bmi-description">
                    ${translate('home.bmi_desc')}
                </p>
            </div>
        </div>
    `;
        })
        .catch(err => console.error('Profile fetch error:', err));
}

function displayRecommendations(recommendations) {
    const recommendationsListDiv = document.getElementById('recommendations-list');
    const recommendationReasonsDiv = document.getElementById('recommendation-reasons');

    recommendationReasonsDiv.innerHTML = `
        <div class="recommendation-criteria-card fade-in">
            <h3><i class="fas fa-lightbulb"></i> ${translate('home.rec_criteria')}</h3>
            <ul class="criteria-list">
                <li class="criteria-item">
                    <div class="criteria-icon"><i class="fas fa-dumbbell"></i></div>
                    <span>${translate('home.rec_protein')}</span>
                </li>
                <li class="criteria-item">
                    <div class="criteria-icon"><i class="fas fa-bread-slice"></i></div>
                    <span>${translate('home.rec_carbs')}</span>
                </li>
                <li class="criteria-item">
                    <div class="criteria-icon"><i class="fas fa-cheese"></i></div>
                    <span>${translate('home.rec_fats')}</span>
                </li>
                <li class="criteria-item">
                    <div class="criteria-icon"><i class="fas fa-seedling"></i></div>
                    <span>${translate('home.rec_fiber')}</span>
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
                    <h4><i class="fas fa-mortar-pestle"></i> ${translate('home.ingredients')}</h4>
                    <p>${dish.Ingredients || translate('home.no_ingredients')}</p>
                </div>
                <div class="nutrient-list">
                    <div class="nutrient-item">
                        <div class="nutrient-icon">
                            <i class="fas fa-dumbbell"></i>
                        </div>
                        <span>${fmtNum(dish['Protein (g)'])}g ${translate('home.protein').toLowerCase()}</span>
                    </div>
                    <div class="nutrient-item">
                        <div class="nutrient-icon">
                            <i class="fas fa-bread-slice"></i>
                        </div>
                        <span>${fmtNum(dish['Carbs (g)'])}g ${translate('home.carbs').toLowerCase()}</span>
                    </div>
                    <div class="nutrient-item">
                        <div class="nutrient-icon">
                            <i class="fas fa-cheese"></i>
                        </div>
                        <span>${fmtNum(dish['Total Fat (g)'])}g ${translate('home.fats').toLowerCase()}</span>
                    </div>
                    <div class="nutrient-item">
                        <div class="nutrient-icon">
                            <i class="fas fa-seedling"></i>
                        </div>
                        <span>${fmtNum(dish['Fiber (g)'])}g ${translate('home.fiber').toLowerCase()}</span>
                    </div>
                </div>
            </div>
            <div class="action-buttons" style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
                <button class="btn btn-outline btn-sm rec-add-plan" data-name="${dish.Name}" data-cal="${dish.Calories}" data-protein="${dish['Protein (g)']}" data-carbs="${dish['Carbs (g)']}" data-fat="${dish['Total Fat (g)']}">
                    <i class="fas fa-calendar-plus"></i> ${translate('action.add_to_plan')}
                </button>
            </div>
        </div>
    `).join('');

    recommendationsListDiv.querySelectorAll('.rec-add-plan').forEach(btn => {
        btn.addEventListener('click', () => addDishToMealPlan(btn.dataset.name, {
            Calories: btn.dataset.cal,
            'Protein (g)': btn.dataset.protein,
            'Carbs (g)': btn.dataset.carbs,
            'Total Fat (g)': btn.dataset.fat,
        }));
    });

    // Create pie charts for each recommendation
    recommendations.forEach((dish, index) => {
        try {
            createPieChart(`recommendation-chart-${index}`, {
            labels: [translate('home.calories'), translate('home.protein'), translate('home.carbs'), translate('home.fats'), translate('home.fiber')],
            data: [
                dish['Calories'],
                dish['Protein (g)'],
                dish['Carbs (g)'],
                dish['Total Fat (g)'],
                dish['Fiber (g)']
            ],
            colors: ['#ED64A6', '#F56565', '#48BB78', '#ECC94B', '#4299E1']
            });
        } catch (err) {
            console.warn('Chart render skipped:', err);
        }
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
                            return `${label}: ${value}${label === translate('home.calories') ? ' kcal' : 'g'}`;
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

async function addPredictionToLog(predictionId) {
    try {
        const res = await fetch('/api/add-prediction-to-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prediction_id: predictionId, meal_type: 'lunch' }),
        });
        if (!res.ok) throw new Error('Failed');
        alert(translate('action.added_tracker'));
    } catch (e) {
        alert(translate('action.error'));
    }
}

async function addDishToMealPlan(name, nutrition) {
    try {
        const res = await fetch('/api/meal-plan/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                day: 1,
                meal_type: 'lunch',
                name: name,
                calories: parseInt(nutrition.Calories || nutrition.calories || 0),
                protein: parseInt(nutrition['Protein (g)'] || nutrition.protein || 0),
                carbs: parseInt(nutrition['Carbs (g)'] || nutrition.carbs || 0),
                fat: parseInt(nutrition['Total Fat (g)'] || nutrition.fat || 0),
            }),
        });
        if (!res.ok) throw new Error('Failed');
        alert(translate('action.added_plan'));
    } catch (e) {
        alert(translate('action.error'));
    }
}

// Export for testing if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateBMI,
        getBMICategory,
        createPieChart
    };
}