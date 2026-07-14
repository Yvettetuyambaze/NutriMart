const MEAL_TYPE_KEYS = {
    breakfast: 'meal.breakfast',
    lunch: 'meal.lunch',
    dinner: 'meal.dinner',
};

let currentDay = 1;
let lastMealPlanData = null;
window.currentMealDay = 1;

document.addEventListener('DOMContentLoaded', () => {
    initDaySelector();
    fetchMealPlan(1);
    bindMealPlanModals();

    document.getElementById('grocery-list-btn')?.addEventListener('click', toggleGrocery);
    document.getElementById('close-grocery')?.addEventListener('click', () => {
        document.getElementById('grocery-panel').style.display = 'none';
    });

    document.addEventListener('languageChanged', () => {
        if (lastMealPlanData) displayMealPlan(lastMealPlanData);
    });
});

function bindMealPlanModals() {
    document.getElementById('add-meal-plan-btn')?.addEventListener('click', () => {
        document.getElementById('add-meal-modal')?.classList.remove('hidden');
    });
    document.getElementById('close-add-meal')?.addEventListener('click', () => {
        document.getElementById('add-meal-modal')?.classList.add('hidden');
    });
    document.getElementById('add-meal-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = Object.fromEntries(new FormData(e.target).entries());
        body.day = currentDay;
        body.calories = parseInt(body.calories);
        body.protein = parseInt(body.protein);
        body.carbs = parseInt(body.carbs || 0);
        body.fat = parseInt(body.fat || 0);
        await fetch('/api/meal-plan/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        document.getElementById('add-meal-modal')?.classList.add('hidden');
        e.target.reset();
        fetchMealPlan(currentDay);
    });
}

function initDaySelector() {
    const selector = document.getElementById('day-selector');
    if (!selector) return;

    selector.addEventListener('click', (e) => {
        const dot = e.target.closest('.day-dot');
        if (!dot) return;
        selector.querySelectorAll('.day-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        currentDay = parseInt(dot.dataset.day);
        window.currentMealDay = currentDay;
        fetchMealPlan(currentDay);
    });
}

async function fetchMealPlan(day) {
    try {
        const response = await fetch(`/api/meal-plan?day=${day}`);
        const data = await response.json();
        lastMealPlanData = data;
        displayMealPlan(data);
    } catch (error) {
        console.error('Error fetching meal plan:', error);
    }
}

function displayMealPlan(data) {
    setText('day-calories', data.totals.calories.toLocaleString());
    setText('day-protein', `${data.totals.protein}${t('common.g')}`);
    setText('day-carbs', `${data.totals.carbs}${t('common.g')}`);
    setText('day-fat', `${data.totals.fat}${t('common.g')}`);

    const container = document.getElementById('meals-container');
    if (!container) return;

    if (!data.meals.length) {
        container.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:2rem;">${t('meal.no_meals')}</p>`;
        return;
    }

    container.innerHTML = data.meals.map(meal => `
        <div class="meal-card" data-id="${meal.id}">
            <div class="meal-card-icon ${meal.type}">
                <i class="fas ${meal.icon}"></i>
            </div>
            <div class="meal-card-content">
                <div class="meal-card-type">${t(MEAL_TYPE_KEYS[meal.type] || 'meal.breakfast')}</div>
                <div class="meal-card-name">${meal.name}</div>
                <div class="meal-card-meta">
                    <span><i class="fas fa-fire"></i> ${meal.calories} ${t('common.cal')}</span>
                    <span><i class="fas fa-drumstick-bite"></i> ${meal.protein}${t('common.g')} ${t('meal.protein_g')}</span>
                    <span><i class="fas fa-bread-slice"></i> ${meal.carbs}${t('common.g')} ${t('meal.carbs_g')}</span>
                </div>
            </div>
            <div class="meal-card-actions">
                <button class="btn btn-sm btn-danger delete-meal-item" data-id="${meal.id}" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.delete-meal-item').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm(t('meal.confirm_delete'))) return;
            await fetch(`/api/meal-plan/items/${btn.dataset.id}`, { method: 'DELETE' });
            fetchMealPlan(currentDay);
        });
    });

    const groceryList = document.getElementById('grocery-list');
    if (groceryList && data.grocery) {
        groceryList.innerHTML = `<ul class="grocery-grid">
            ${data.grocery.map(item => `
                <li class="grocery-item"><i class="fas fa-check-circle"></i> ${item}</li>
            `).join('')}
        </ul>`;
    }
}

function toggleGrocery() {
    const panel = document.getElementById('grocery-panel');
    if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

window.fetchMealPlan = fetchMealPlan;
window.addToMealPlan = async function(item, day) {
    await fetch('/api/meal-plan/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, day: day || currentDay }),
    });
};
