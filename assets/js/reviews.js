const S369Reviews = (() => {
  let currentProductId = null;

  const getApiUrl = (productId) => {
    const rawBase = (window.S369_CONFIG && window.S369_CONFIG.apiBase) 
      ? window.S369_CONFIG.apiBase 
      : (window.API_BASE || 'http://localhost:5000');
    const base = rawBase.replace(/\/api\/?$/, '').replace(/\/$/, '');
    let url = `${base}/api/reviews`;
    const targetProduct = productId || currentProductId;
    if (targetProduct && targetProduct !== 'all') {
      url += `?productId=${encodeURIComponent(targetProduct)}`;
    }
    return url;
  };

  const esc = (s) =>
    String(s || '').replace(
      /[&<>'"]/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        })[c]
    );

  function render(items) {
    const list = document.getElementById('reviewList');
    const avgEl = document.getElementById('averageRating');
    const countEl = document.getElementById('reviewCount');

    if (!list) return;

    if (!items || !items.length) {
      list.innerHTML = '<p style="color: #666; font-style: italic; padding: 12px 0;">Be the first to share your luxury S369 fragrance experience.</p>';
      if (avgEl) avgEl.textContent = '5.0';
      if (countEl) countEl.textContent = 'Be the first to leave a review';
      return;
    }

    list.innerHTML = items
      .map(
        (r) => `
        <article class="review-card" style="background:#fff; border:1px solid #ebdccb; border-radius:8px; padding:20px; margin-bottom:16px; box-shadow:0 2px 8px rgba(0,0,0,0.03);">
          <div class="review-card-top" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span class="review-stars" style="color:#d9b874; font-size:16px; letter-spacing:2px;">
              ${'★'.repeat(r.rating || 5)}${'☆'.repeat(Math.max(0, 5 - (r.rating || 5)))}
            </span>
            <time style="font-size:12px; color:#888;">${esc(r.date || '')}</time>
          </div>
          <h3 style="font-size:16px; font-weight:700; margin:0 0 8px; color:#5d1f2d;">${esc(r.title)}</h3>
          <p style="font-size:14px; line-height:1.6; color:#444; margin:0 0 12px;">${esc(r.message)}</p>
          <strong style="font-size:13px; color:#222;">— ${esc(r.name)}</strong>
        </article>
      `
      )
      .join('');

    const sum = items.reduce((s, r) => s + (Number(r.rating) || 5), 0);
    const avg = sum / items.length;

    if (avgEl) avgEl.textContent = avg.toFixed(1);
    if (countEl) {
      countEl.textContent = `Based on ${items.length} verified customer review${items.length === 1 ? '' : 's'}`;
    }
  }

  async function load(productId) {
    const list = document.getElementById('reviewList');
    const pId = productId || currentProductId;
    try {
      const res = await fetch(getApiUrl(pId), { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Failed to fetch reviews');
      render(data.reviews || []);
    } catch (e) {
      console.warn('Reviews fetch fallback:', e);
      if (list && !list.hasChildNodes()) {
        list.innerHTML = '<p>Reviews are currently loading…</p>';
      }
    }
  }

  function init(productId) {
    if (productId) currentProductId = productId;
    load(currentProductId);

    const form = document.getElementById('reviewForm');
    const status = document.getElementById('reviewStatus');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const button = form.querySelector('button[type="submit"]');
        if (button) button.disabled = true;
        if (status) {
          status.style.color = '#555';
          status.textContent = 'Submitting your review…';
        }

        const data = Object.fromEntries(new FormData(form));
        data.rating = Number(data.rating) || 5;
        if (!data.productId && currentProductId) {
          data.productId = currentProductId;
        }

        try {
          const rawBase = (window.S369_CONFIG && window.S369_CONFIG.apiBase) 
            ? window.S369_CONFIG.apiBase 
            : (window.API_BASE || 'http://localhost:5000');
          const postUrl = `${rawBase.replace(/\/api\/?$/, '').replace(/\/$/, '')}/api/reviews`;

          const res = await fetch(postUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
          });
          const resData = await res.json().catch(() => ({}));
          if (!res.ok || !resData.ok) {
            throw new Error(resData.message || 'Could not submit your review.');
          }

          form.reset();
          if (status) {
            status.style.color = '#2e7d32';
            status.textContent = resData.message || 'Thank you — your review is now live!';
          }
          await load(currentProductId);
        } catch (err) {
          if (status) {
            status.style.color = '#c62828';
            status.textContent = err.message || 'Error saving review.';
          }
        } finally {
          if (button) button.disabled = false;
        }
      });
    }
  }

  return { init, load };
})();
