document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('chatbot-toggle');
    const panel = document.getElementById('chatbot-panel');
    const closeBtn = document.getElementById('chatbot-close');
    const form = document.getElementById('chatbot-form');
    const input = document.getElementById('chatbot-input');

    toggle?.addEventListener('click', () => panel?.classList.toggle('hidden'));
    closeBtn?.addEventListener('click', () => panel?.classList.add('hidden'));

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = input.value.trim();
        if (!message) return;
        appendMessage(message, 'user');
        input.value = '';
        await sendChat(message);
    });
});

function appendMessage(text, role) {
    const container = document.getElementById('chatbot-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

async function sendChat(message) {
    const day = window.currentMealDay || 1;
    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, day }),
        });
        const data = await res.json();
        appendMessage(data.reply, 'bot');

        if (data.suggestions?.length) {
            const container = document.getElementById('chatbot-messages');
            const sugDiv = document.createElement('div');
            sugDiv.className = 'chat-suggestions';
            sugDiv.innerHTML = data.suggestions.map(s => `
                <div class="chat-suggestion-card">
                    <div class="chat-suggestion-name">${s.name}</div>
                    <div class="chat-suggestion-meta">${s.calories} ${t('common.cal')} · ${s.protein}${t('common.g')} ${t('meal.protein_g')}</div>
                    <button class="btn btn-sm btn-primary chat-add-btn" data-name="${s.name}" data-type="${s.meal_type}" data-cal="${s.calories}" data-protein="${s.protein}" data-carbs="${s.carbs}" data-fat="${s.fat}">
                        <i class="fas fa-plus"></i> ${t('chat.add_to_plan')}
                    </button>
                </div>
            `).join('');
            container.appendChild(sugDiv);
            container.scrollTop = container.scrollHeight;

            sugDiv.querySelectorAll('.chat-add-btn').forEach(btn => {
                btn.addEventListener('click', () => addSuggestionToPlan(btn, day));
            });
        }
    } catch (e) {
        appendMessage(t('chat.error'), 'bot');
    }
}

async function addSuggestionToPlan(btn, day) {
    try {
        const res = await fetch('/api/meal-plan/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                day,
                meal_type: btn.dataset.type,
                name: btn.dataset.name,
                calories: parseInt(btn.dataset.cal),
                protein: parseInt(btn.dataset.protein),
                carbs: parseInt(btn.dataset.carbs),
                fat: parseInt(btn.dataset.fat),
            }),
        });
        if (!res.ok) throw new Error('Failed');
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-check"></i> ${t('chat.added')}`;
        if (typeof fetchMealPlan === 'function') fetchMealPlan(day);
        appendMessage(`${t('chat.added_msg')} ${btn.dataset.name}`, 'bot');
    } catch (e) {
        appendMessage(t('chat.error'), 'bot');
    }
}

window.sendChat = sendChat;
