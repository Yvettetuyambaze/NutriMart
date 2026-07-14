let calorieData = null;
let selectedDate = new Date().toISOString().split('T')[0];

const MEAL_SECTIONS = [
    { type: 'breakfast', key: 'cal.breakfast', icon: 'fa-sun' },
    { type: 'lunch', key: 'cal.lunch', icon: 'fa-cloud-sun' },
    { type: 'dinner', key: 'cal.dinner', icon: 'fa-moon' },
    { type: 'snack', key: 'cal.snack', icon: 'fa-cookie' },
];

document.addEventListener('DOMContentLoaded', () => {
    initWeekCalendar();
    fetchCalorieData();
    fetchFoodHistory();
    bindModals();
    document.addEventListener('languageChanged', () => {
        initWeekCalendar();
        if (calorieData) { renderMealLog(calorieData.meals); renderExercises(calorieData.exercises); }
        fetchFoodHistory();
    });
});

function bindModals() {
    document.getElementById('add-meal-btn')?.addEventListener('click', () => openModal('add-food-modal'));
    document.getElementById('close-add-food')?.addEventListener('click', () => closeModal('add-food-modal'));
    document.getElementById('add-exercise-btn')?.addEventListener('click', () => openModal('add-exercise-modal'));
    document.getElementById('close-add-exercise')?.addEventListener('click', () => closeModal('add-exercise-modal'));

    document.getElementById('add-food-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = Object.fromEntries(new FormData(e.target).entries());
        body.date = selectedDate;
        body.calories = parseInt(body.calories);
        body.protein = parseFloat(body.protein);
        await postJson('/api/meal-logs', body);
        closeModal('add-food-modal');
        e.target.reset();
        fetchCalorieData();
    });

    document.getElementById('add-exercise-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = Object.fromEntries(new FormData(e.target).entries());
        body.date = selectedDate;
        body.calories_burned = parseInt(body.calories_burned);
        await postJson('/api/exercise-logs', body);
        closeModal('add-exercise-modal');
        e.target.reset();
        fetchCalorieData();
    });
}

function openModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

async function postJson(url, body) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Request failed');
    return res.json();
}

function initWeekCalendar() {
    const calendar = document.getElementById('week-calendar');
    if (!calendar) return;

    const dayKeys = ['cal.day_mon','cal.day_tue','cal.day_wed','cal.day_thu','cal.day_fri','cal.day_sat','cal.day_sun'];
    const today = new Date().getDay();
    const adjusted = today === 0 ? 6 : today - 1;

    calendar.innerHTML = dayKeys.map((key, i) => {
        const date = new Date();
        date.setDate(date.getDate() - adjusted + i);
        const iso = date.toISOString().split('T')[0];
        const isActive = iso === selectedDate;
        return `<div class="day-pill ${isActive ? 'active' : ''}" data-date="${iso}">
            <div class="day-name">${t(key)}</div>
            <div class="day-num">${date.getDate()}</div>
        </div>`;
    }).join('');

    calendar.querySelectorAll('.day-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            calendar.querySelectorAll('.day-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            selectedDate = pill.dataset.date;
            fetchCalorieData();
        });
    });
}

function renderExercises(exercises) {
    const list = document.getElementById('exercise-list');
    if (!list) return;
    if (!exercises?.length) {
        list.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:1rem;">${t('cal.no_exercise')}</p>`;
        return;
    }
    list.innerHTML = exercises.map(ex => `
        <div class="meal-item">
            <div class="meal-item-info">
                <span class="meal-item-name">${ex.name}</span>
                <span class="meal-item-detail">${ex.detail}</span>
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;">
                <span class="meal-item-cal">${ex.calories} ${t('common.cal')}</span>
                <button class="btn btn-sm btn-danger btn-icon delete-exercise" data-id="${ex.id}"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');

    list.querySelectorAll('.delete-exercise').forEach(btn => {
        btn.addEventListener('click', async () => {
            await fetch(`/api/exercise-logs/${btn.dataset.id}`, { method: 'DELETE' });
            fetchCalorieData();
        });
    });
}

function renderMealLog(meals) {
    const log = document.getElementById('meal-log');
    if (!log) return;

    log.innerHTML = MEAL_SECTIONS.map(section => {
        const items = (meals[section.type] || []);
        const itemsHtml = items.length ? items.map(meal => `
            <div class="meal-item">
                <div class="meal-item-info">
                    <span class="meal-item-name">${meal.name} ${meal.source === 'predict' ? '<span class="badge-ai">AI</span>' : ''}</span>
                    <span class="meal-item-detail">${meal.detail || ''}</span>
                </div>
                <div style="display:flex;align-items:center;gap:0.5rem;">
                    <span class="meal-item-cal">${meal.calories} ${t('common.cal')}</span>
                    <button class="btn btn-sm btn-danger btn-icon delete-meal" data-id="${meal.id}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('') : (section.type === 'snack' ? `
            <div class="meal-item empty-meal">${t('cal.no_snacks')}</div>
        ` : `<div class="meal-item empty-meal">${t('cal.no_meals')}</div>`);

        return `
            <div class="meal-section">
                <div class="meal-header">
                    <div class="meal-type ${section.type}"><i class="fas ${section.icon}"></i> ${t(section.key)}</div>
                    <button class="btn btn-sm btn-secondary add-meal-section" data-type="${section.type}"><i class="fas fa-plus"></i> ${t('cal.add')}</button>
                </div>
                <div class="meal-items">${itemsHtml}</div>
            </div>
        `;
    }).join('');

    log.querySelectorAll('.delete-meal').forEach(btn => {
        btn.addEventListener('click', async () => {
            await fetch(`/api/meal-logs/${btn.dataset.id}`, { method: 'DELETE' });
            fetchCalorieData();
        });
    });

    log.querySelectorAll('.add-meal-section').forEach(btn => {
        btn.addEventListener('click', () => {
            const form = document.getElementById('add-food-form');
            if (form) form.meal_type.value = btn.dataset.type;
            openModal('add-food-modal');
        });
    });
}

async function fetchCalorieData() {
    try {
        const response = await fetch(`/api/calorie-data?date=${selectedDate}`);
        calorieData = await response.json();
        updateDashboard(calorieData);
        renderMealLog(calorieData.meals);
        renderExercises(calorieData.exercises);
    } catch (error) {
        console.error('Error fetching calorie data:', error);
    }
}

async function fetchFoodHistory() {
    const container = document.getElementById('food-history');
    if (!container) return;
    try {
        const res = await fetch('/api/food-history?limit=15');
        const data = await res.json();
        if (!data.history?.length) {
            container.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:2rem;">${t('cal.no_history')}</p>`;
            return;
        }
        container.innerHTML = data.history.map(h => `
            <div class="history-item">
                <div class="history-info">
                    <span class="history-name"><i class="fas fa-robot" style="color:var(--accent);"></i> ${h.predicted_dish}</span>
                    <span class="history-meta">${new Date(h.created_at).toLocaleDateString()} · ${(h.confidence * 100).toFixed(0)}% ${t('home.confidence')}</span>
                </div>
                <div class="history-actions">
                    <span class="meal-item-cal">${h.calories} ${t('common.cal')}</span>
                    <button class="btn btn-sm btn-primary add-history-to-log" data-id="${h.id}" data-name="${h.predicted_dish}" data-cal="${h.calories}" data-protein="${h.protein}" data-carbs="${h.carbs}" data-fat="${h.fat}">
                        <i class="fas fa-plus"></i> ${t('cal.add_to_today')}
                    </button>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.add-history-to-log').forEach(btn => {
            btn.addEventListener('click', async () => {
                await postJson('/api/add-prediction-to-log', {
                    prediction_id: parseInt(btn.dataset.id),
                    meal_type: 'lunch',
                    date: selectedDate,
                });
                fetchCalorieData();
                btn.disabled = true;
                btn.innerHTML = `<i class="fas fa-check"></i>`;
            });
        });
    } catch (e) {
        container.innerHTML = `<p style="color:var(--red);">${t('cal.history_error')}</p>`;
    }
}

function updateDashboard(data) {
    const fmt = n => Number(n).toLocaleString();
    setText('cal-consumed', fmt(data.consumed));
    setText('cal-goal', fmt(data.goal));
    setText('cal-burned', fmt(data.burned));
    setText('cal-remaining', fmt(data.remaining));
    setText('ring-value', `${data.percentage}%`);

    const ring = document.getElementById('ring-fill');
    if (ring) {
        const circumference = 490;
        ring.style.strokeDashoffset = circumference - (data.percentage / 100) * circumference;
    }

    if (data.macros) {
        const { protein, carbs, fat } = data.macros;
        setText('protein-val', `${protein.current}${t('common.g')} / ${protein.goal}${t('common.g')}`);
        setText('carbs-val', `${carbs.current}${t('common.g')} / ${carbs.goal}${t('common.g')}`);
        setText('fat-val', `${fat.current}${t('common.g')} / ${fat.goal}${t('common.g')}`);
        setBar('protein-bar', protein.current, protein.goal);
        setBar('carbs-bar', carbs.current, carbs.goal);
        setBar('fat-bar', fat.current, fat.goal);
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setBar(id, current, goal) {
    const el = document.getElementById(id);
    if (el) el.style.width = `${Math.min(100, Math.round((current / goal) * 100))}%`;
}
