/* ================================================
   PDF99 — Rating Widget & Popup Modal
   ================================================ */
'use strict';
(function () {

  const API_BASE = 'https://pdf99-ratings.officialakshay71.workers.dev/api/ratings';

  // Tool slug from body data attribute or dropzone element
  const dropzoneEl = document.getElementById('dropzone');
  if (!dropzoneEl) return;
  // Get tool from page URL slug
  const pathParts = window.location.pathname.replace(/\/+$/,'').split('/');
  const tool = pathParts[pathParts.length - 1] || '';
  if (!tool) return;

  /* ── State ───────────────────────────────────── */
  let currentRating = 0;
  let totalVotes    = 0;
  let userVote      = parseInt(localStorage.getItem(`pdf99-vote-${tool}`) || '0', 10);

  /* ── Emoji faces by star (1-5) ───────────────── */
  const FACES = [
    { emoji: '😞', label: 'Poor',      color: '#e74c3c' },
    { emoji: '😕', label: 'Fair',      color: '#e67e22' },
    { emoji: '😐', label: 'Okay',      color: '#f1c40f' },
    { emoji: '😊', label: 'Good',      color: '#27ae60' },
    { emoji: '😍', label: 'Excellent', color: '#1abc9c' },
  ];

  /* ── Build the inline widget (shows current rating + "Rate our tool" link) ── */
  function buildWidget() {
    // Target the dropzone rating element instead of a separate widget
    const dropzoneRatingEl = document.getElementById('dropzoneRating');
    if (dropzoneRatingEl) {
      dropzoneRatingEl.innerHTML =
        `<img src="/src/icon/star.svg" class="icon icon-star" alt="" aria-hidden="true">` +
        `<span id="rwValue"></span><span id="rwSep" style="display:none"> / 5 &nbsp;</span>` +
        `<span id="rwCount">Loading…</span>` +
        `<button class="rw-rate-link" id="rwRateBtn" type="button">Rate this tool</button>`;
      document.getElementById('rwRateBtn').addEventListener('click', openModal);
    }
    loadRating();
  }

  /* ── Render mini stars (display only) ─────────── */
  function renderMiniStars(val) {
    // No separate stars element in dropzone layout; rating shown as text
  }

  function updateWidget() {
    renderMiniStars(currentRating);
    const valEl = document.getElementById('rwValue');
    const sepEl = document.getElementById('rwSep');
    const cntEl = document.getElementById('rwCount');
    if (totalVotes > 0) {
      if (valEl) { valEl.textContent = currentRating.toFixed(1); }
      if (sepEl) { sepEl.style.display = 'inline'; }
      if (cntEl) { cntEl.textContent = `(${totalVotes.toLocaleString()} vote${totalVotes !== 1 ? 's' : ''})`; }
    } else {
      if (valEl) { valEl.textContent = ''; }
      if (sepEl) { sepEl.style.display = 'none'; }
      if (cntEl) { cntEl.textContent = 'No votes yet'; }
    }
  }

  /* ── Load from API ───────────────────────────── */
  async function loadRating() {
    try {
      const res = await fetch(`${API_BASE}/${tool}`);
      if (!res.ok) return;
      const data = await res.json();
      currentRating = data.rating_value || 0;
      totalVotes    = data.rating_count || 0;
      updateWidget();
      if (totalVotes > 0) updateSchema(currentRating, totalVotes);
    } catch (e) { /* API not configured yet */ }
    // Also show user's saved vote if they've voted
    if (userVote) updateWidget();
  }

  /* ── Modal ───────────────────────────────────── */
  let modal = null;
  let hoveredStar = 0;
  let selectedStar = userVote || 0;

  function openModal() {
    if (modal) { modal.removeAttribute('hidden'); document.body.style.overflow='hidden'; return; }

    modal = document.createElement('div');
    modal.className = 'rating-modal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby','rm-title');
    modal.innerHTML = `
      <div class="rm-backdrop" id="rmBackdrop"></div>
      <div class="rm-box">
        <button class="rm-close" id="rmClose" aria-label="Close rating dialog">✕</button>
        <h2 class="rm-title" id="rm-title">How would you rate this tool?</h2>
        <p class="rm-subtitle">Your feedback helps us improve</p>
        <div class="rm-face" id="rmFace" aria-live="polite">
          <span class="rm-emoji" id="rmEmoji"></span>
          <span class="rm-face-label" id="rmFaceLabel">Click a star to rate</span>
        </div>
        <div class="rm-stars" id="rmStars" role="radiogroup" aria-label="Star rating"></div>
        <textarea class="rm-textarea" id="rmTextarea" placeholder="Leave a comment (optional)…" rows="3" aria-label="Optional comment"></textarea>
        <button class="rm-submit" id="rmSubmit" type="button" disabled>Submit rating</button>
        <p class="rm-already" id="rmAlready" style="display:none">You rated this ${userVote} star${userVote !== 1 ? 's' : ''}. You can update your vote.</p>
        <p class="rm-success" id="rmSuccess" style="display:none"></p>
      </div>`;

    document.body.appendChild(modal);

    // If user already voted, show it
    if (userVote) {
      selectedStar = userVote;
      document.getElementById('rmAlready').style.display = 'block';
    }

    renderModalStars(selectedStar);
    updateFace(selectedStar || hoveredStar);

    document.getElementById('rmBackdrop').addEventListener('click', closeModal);
    document.getElementById('rmClose').addEventListener('click', closeModal);
    document.addEventListener('keydown', handleModalKey);

    const submitBtn = document.getElementById('rmSubmit');
    if (selectedStar) submitBtn.removeAttribute('disabled');
    submitBtn.addEventListener('click', submitVote);

    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal?.setAttribute('hidden','');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleModalKey);
  }

  function handleModalKey(e) {
    if (e.key === 'Escape') closeModal();
  }

  function renderModalStars(highlight) {
    const el = document.getElementById('rmStars'); if (!el) return;
    el.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rm-star-btn' + (i <= (hoveredStar || highlight) ? ' rm-star-filled' : '');
      btn.setAttribute('aria-label', `${i} star${i>1?'s':''}`);
      btn.dataset.stars = i;
      btn.innerHTML = '★';
      btn.addEventListener('mouseenter', () => { hoveredStar=i; renderModalStars(selectedStar); updateFace(i); });
      btn.addEventListener('mouseleave', () => { hoveredStar=0; renderModalStars(selectedStar); updateFace(selectedStar); });
      btn.addEventListener('focus',      () => { hoveredStar=i; renderModalStars(selectedStar); updateFace(i); });
      btn.addEventListener('blur',       () => { hoveredStar=0; renderModalStars(selectedStar); updateFace(selectedStar); });
      btn.addEventListener('click',      () => {
        selectedStar = i; hoveredStar = 0;
        renderModalStars(i); updateFace(i);
        document.getElementById('rmSubmit').removeAttribute('disabled');
      });
      el.appendChild(btn);
    }
  }

  function updateFace(stars) {
    const emojiEl = document.getElementById('rmEmoji');
    const labelEl = document.getElementById('rmFaceLabel');
    if (!emojiEl || !labelEl) return;
    if (!stars) {
      emojiEl.textContent = '';
      labelEl.textContent = 'Click a star to rate';
      labelEl.style.color = '';
      return;
    }
    const face = FACES[stars - 1];
    emojiEl.textContent = face.emoji;
    labelEl.textContent = face.label;
    labelEl.style.color = face.color;
  }

  async function submitVote() {
    if (!selectedStar) return;
    const submitBtn = document.getElementById('rmSubmit');
    const successEl = document.getElementById('rmSuccess');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    userVote = selectedStar;
    localStorage.setItem(`pdf99-vote-${tool}`, String(selectedStar));

    try {
      const body = { stars: selectedStar };
      const comment = document.getElementById('rmTextarea')?.value.trim();
      if (comment) body.comment = comment;

      const res = await fetch(`${API_BASE}/${tool}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const data = await res.json();
        currentRating = data.rating_value || 0;
        totalVotes    = data.rating_count || 0;
        updateWidget();
        updateSchema(currentRating, totalVotes);
      }
    } catch (e) { /* keep optimistic state */ }

    updateWidget();
    if (successEl) {
      successEl.textContent = `✓ Thanks for rating ${selectedStar} star${selectedStar>1?'s':''}!`;
      successEl.style.display = 'block';
    }
    submitBtn.textContent = 'Submitted ✓';
    setTimeout(closeModal, 1400);
  }

  /* ── Update JSON-LD dynamically ──────────────── */
  function updateSchema(ratingValue, ratingCount) {
    if (ratingCount < 1) return;
    const ldEl = document.querySelector('script[type="application/ld+json"]');
    if (!ldEl) return;
    try {
      const ld = JSON.parse(ldEl.textContent);
      const graph = ld['@graph'] || [];
      const webapp = graph.find(n => n['@type'] === 'WebApplication');
      if (!webapp) return;
      webapp.aggregateRating = {
        '@type': 'AggregateRating',
        'ratingValue': ratingValue.toFixed(1),
        'reviewCount': ratingCount,
        'bestRating':  '5',
        'worstRating': '1'
      };
      ldEl.textContent = JSON.stringify(ld);
    } catch (e) {}
  }

  /* ── Init ────────────────────────────────────── */
  buildWidget();

})();
