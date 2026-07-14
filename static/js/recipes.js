let recipesData = null;

const RECIPE_ICONS = ['🍲', '🥘', '🍛', '🥗', '🍖', '🐟', '🌽', '🥔', '🍌', '🫘'];
const RECIPE_COLORS = ['var(--accent-light)', 'var(--orange-light)', 'var(--blue-light)', 'var(--purple-light)', 'var(--red-light)'];

document.addEventListener('DOMContentLoaded', () => {
    fetchRecipes();
    document.addEventListener('languageChanged', renderRecipes);
});

async function fetchRecipes() {
    const grid = document.getElementById('recipes-grid');
    try {
        const res = await fetch('/api/recipes');
        const data = await res.json();
        recipesData = data.recipes;
        renderRecipes();
    } catch (e) {
        if (grid) {
            grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--red);"><i class="fas fa-exclamation-circle"></i> ${t('recipes.error')}</div>`;
        }
    }
}

function renderRecipes() {
    const grid = document.getElementById('recipes-grid');
    if (!grid || !recipesData) return;

    grid.innerHTML = recipesData.map((r, i) => `
        <div class="recipe-card">
            <div class="recipe-card-image" style="background: ${RECIPE_COLORS[i % RECIPE_COLORS.length]};">
                ${RECIPE_ICONS[i % RECIPE_ICONS.length]}
                <span class="recipe-card-badge">${r.Calories} ${t('common.cal')}</span>
            </div>
            <div class="recipe-card-body">
                <div class="recipe-card-name">${r.Name}</div>
                <div class="recipe-card-meta">
                    <span><i class="fas fa-drumstick-bite"></i> ${r['Protein (g)']}${t('common.g')} ${t('recipes.protein')}</span>
                    <span><i class="fas fa-bread-slice"></i> ${r['Carbs (g)']}${t('common.g')} ${t('recipes.carbs')}</span>
                </div>
                <div class="recipe-card-tags">
                    <span class="recipe-tag">${r['Dietary Info'] || t('recipes.traditional')}</span>
                    <span class="recipe-tag">${r['Serving Size'] || ''}</span>
                </div>
            </div>
        </div>
    `).join('');
}
