function initAuthForm(formId, endpoint) {
    const form = document.getElementById(formId);
    const errorEl = document.getElementById('auth-error');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errorEl) errorEl.classList.add('hidden');

        const formData = new FormData(form);
        const body = Object.fromEntries(formData.entries());

        if (formId === 'signup-form') {
            if (!body.email && !body.phone) {
                showAuthError(typeof t === 'function' ? t('auth.email_phone_required') : 'Email or phone required');
                return;
            }
        }

        const btn = form.querySelector('.auth-submit');
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${typeof t === 'function' ? t('auth.loading') : 'Loading...'}`;

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Request failed');
            window.location.href = data.redirect || '/';
        } catch (err) {
            showAuthError(err.message);
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    });
}

function showAuthError(msg) {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
        errorEl.textContent = msg;
        errorEl.classList.remove('hidden');
    }
}
