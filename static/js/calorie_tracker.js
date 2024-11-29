let nutritionChart = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchCalorieData();
    initMealList();
    initExerciseList();
});

async function fetchCalorieData() {
    try {
        const response = await fetch('/api/calorie-data');
        const data = await response.json();
        updateCalorieSummary(data);
        createNutritionChart(data.macronutrients);
    } catch (error) {
        console.error('Error fetching calorie data:', error);
    }
}

function updateCalorieSummary(data) {
    document.getElementById('calorie-goal').textContent = `${data.goal} cal`;
    document.getElementById('food-intake').textContent = `${data.foodIntake} cal`;
    document.getElementById('exercise-burn').textContent = `${data.exerciseBurn} cal`;
    document.getElementById('remaining-calories').textContent = `${data.remaining} cal`;
}

function createNutritionChart(macronutrients) {
    const ctx = document.getElementById('nutrition-chart').getContext('2d');
    
    if (nutritionChart) {
        nutritionChart.destroy();
    }
    
    nutritionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Protein', 'Carbs', 'Fat'],
            datasets: [{
                data: [macronutrients.protein, macronutrients.carbs, macronutrients.fat],
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Macronutrients Distribution'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += context.parsed.toFixed(1) + 'g';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function initMealList() {
    const mealList = document.getElementById('meal-list');
    const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
    mealList.innerHTML = meals.map(meal => `
        <div class="meal-item">
            <span>${meal}</span>
            <button class="btn" onclick="logMeal('${meal}')">+ Log</button>
        </div>
    `).join('');
}

function initExerciseList() {
    const exerciseList = document.getElementById('exercise-list');
    exerciseList.innerHTML = `
        <div class="exercise-item">
            <span>Exercise</span>
            <button class="btn" onclick="logExercise()">+ Log</button>
        </div>
    `;
}

function logMeal(mealType) {
    console.log(`Logging ${mealType}`);
    // Implement meal logging functionality
}

function logExercise() {
    console.log('Logging exercise');
    // Implement exercise logging functionality
}