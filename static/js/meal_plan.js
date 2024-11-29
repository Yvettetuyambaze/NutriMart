document.addEventListener('DOMContentLoaded', () => {
    initDaySelector();
    fetchMealPlan(1);  // Load Day 1 by default
});

function initDaySelector() {
    const daySelector = document.getElementById('day-selector');
    daySelector.addEventListener('click', (event) => {
        if (event.target.classList.contains('day-btn')) {
            const day = event.target.dataset.day;
            document.querySelectorAll('.day-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            fetchMealPlan(day);
        }
    });
}

async function fetchMealPlan(day) {
    try {
        const response = await fetch(`/api/meal-plan?day=${day}`);
        const data = await response.json();
        displayMealPlan(data);
    } catch (error) {
        console.error('Error fetching meal plan:', error);
    }
}

function displayMealPlan(mealPlan) {
    const mealPlanContent = document.getElementById('meal-plan-content');
    mealPlanContent.innerHTML = mealPlan.meals.map(meal => `
        <div class="meal-plan-item">
            <img src="${meal.image}" alt="${meal.name}">
            <div class="meal-info">
                <h3>${meal.name}</h3>
                <p>${meal.time} | ${meal.calories} Cal</p>
            </div>
            <button class="btn" onclick="viewRecipe('${meal.name}')">View Recipe</button>
        </div>
    `).join('');
}

function viewRecipe(recipeName) {
    console.log(`Viewing recipe for: ${recipeName}`);
    // Implement recipe view functionality
}

document.getElementById('grocery-list-btn').addEventListener('click', () => {
    console.log('Generate grocery list');
    // Implement grocery list functionality
});