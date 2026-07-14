let profileData = null;

const BMI_KEYS = { under: 'profile.under', normal: 'profile.normal', over: 'profile.over', obese: 'profile.obese' };

document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    document.getElementById('edit-profile-btn')?.addEventListener('click', openEditModal);
    document.getElementById('close-edit-modal')?.addEventListener('click', closeEditModal);
    document.getElementById('edit-profile-form')?.addEventListener('submit', saveProfile);
    document.getElementById('notif-toggle')?.addEventListener('change', saveToggles);
    document.getElementById('vegan-toggle')?.addEventListener('change', saveToggles);
    document.addEventListener('languageChanged', () => { if (profileData) renderProfile(profileData); });
});

async function loadProfile() {
    try {
        const res = await fetch('/api/profile');
        profileData = await res.json();
        renderProfile(profileData);
        fillEditForm(profileData);
    } catch (e) {
        console.error('Profile load error:', e);
    }
}

function renderProfile(p) {
    setText('profile-name', p.name);
    setText('profile-contact', p.email || p.phone || '—');
    setText('bmi-value', p.bmi ?? '—');
    setText('calorie-goal-val', p.calorie_goal ? `${p.calorie_goal} ${t('common.cal')}` : '—');
    setText('weight-val', p.weight ? `${p.weight} kg` : '—');

    const catEl = document.getElementById('bmi-category');
    if (catEl && p.bmi_category) {
        const key = BMI_KEYS[p.bmi_category] || 'profile.normal';
        catEl.className = `bmi-category-badge ${p.bmi_category === 'over' || p.bmi_category === 'obese' ? 'overweight' : ''}`;
        catEl.innerHTML = `<i class="fas fa-heart"></i> <span>${t(key)}</span>`;
    }

    const marker = document.getElementById('bmi-marker');
    if (marker && p.bmi) {
        const pos = Math.min(95, Math.max(5, ((p.bmi - 15) / 25) * 100));
        marker.style.left = `${pos}%`;
    }

    const grid = document.getElementById('profile-info-grid');
    if (grid) {
        const items = [
            { icon: 'fa-weight', color: 'accent', label: 'profile.target_weight', value: p.target_weight ? `${p.target_weight} kg` : '—' },
            { icon: 'fa-ruler-vertical', color: 'blue', label: 'profile.height', value: p.height ? `${p.height} cm` : '—' },
            { icon: 'fa-weight-hanging', color: 'orange', label: 'profile.current_weight', value: p.weight ? `${p.weight} kg` : '—' },
            { icon: 'fa-running', color: 'purple', label: 'profile.activity', value: t(`auth.${p.activity_level}`) || p.activity_level },
            { icon: 'fa-birthday-cake', color: 'red', label: 'profile.age', value: p.age ?? '—' },
            { icon: 'fa-heartbeat', color: 'accent', label: 'profile.health', value: t('profile.good') },
        ];
        grid.innerHTML = items.map(item => `
            <div class="info-card">
                <div class="info-card-icon" style="background: var(--${item.color}-light); color: var(--${item.color === 'accent' ? 'accent-dark' : item.color});">
                    <i class="fas ${item.icon}"></i>
                </div>
                <div>
                    <div class="info-card-label">${t(item.label)}</div>
                    <div class="info-card-value">${item.value}</div>
                </div>
            </div>
        `).join('');
    }

    const notif = document.getElementById('notif-toggle');
    const vegan = document.getElementById('vegan-toggle');
    if (notif) notif.checked = p.notifications_enabled;
    if (vegan) vegan.checked = p.vegan_preference;
}

function fillEditForm(p) {
    const form = document.getElementById('edit-profile-form');
    if (!form) return;
    form.name.value = p.name || '';
    form.email.value = p.email || '';
    form.phone.value = p.phone || '';
    form.date_of_birth.value = p.date_of_birth || '';
    form.height.value = p.height || '';
    form.weight.value = p.weight || '';
    form.target_weight.value = p.target_weight || '';
    form.activity_level.value = p.activity_level || 'moderate';
}

function openEditModal() {
    document.getElementById('edit-profile-modal')?.classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('edit-profile-modal')?.classList.add('hidden');
}

async function saveProfile(e) {
    e.preventDefault();
    const form = e.target;
    const body = Object.fromEntries(new FormData(form).entries());
    if (!body.password) delete body.password;
    try {
        const res = await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        profileData = data.profile;
        renderProfile(profileData);
        closeEditModal();
        showToast(t('profile.saved'));
    } catch (err) {
        alert(err.message);
    }
}

async function saveToggles() {
    if (!profileData) return;
    await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            notifications_enabled: document.getElementById('notif-toggle')?.checked,
            vegan_preference: document.getElementById('vegan-toggle')?.checked,
        }),
    });
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
