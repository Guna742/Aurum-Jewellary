/**
 * AURUM JEWELLERY — fitting-room-ui.js
 * UI ↔ 3D Sync: item selection, summary panel, tabs,
 * mobile bottom-sheet, and order confirmation modal.
 */

/* ── State ──────────────────────────────────────────────── */
const selection = { dress: null, necklace: null, earrings: null, bangles: null };

/* ── On DOM Ready ───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initItemCards();
    initMobileSheet();
    initModal();
    document.getElementById('btnClearAll')?.addEventListener('click', clearAll);
});

/* ── Tab Switching ──────────────────────────────────────── */
function initTabs() {
    document.querySelectorAll('.fr-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.fr-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
            document.querySelectorAll('.fr-items-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            document.getElementById(`tab-${tab.dataset.tab}`)?.classList.add('active');
        });
    });
}

/* ── Item Card Click ────────────────────────────────────── */
function initItemCards() {
    document.querySelectorAll('.fr-item').forEach(card => {
        card.addEventListener('click', () => selectItem(card));
    });
}

function selectItem(card) {
    const type = card.dataset.type;           // dress | necklace | earrings | bangles
    const id = card.dataset.id;
    const slot = normalizeSlot(type);         // dress | necklace | earrings | bangles

    // Toggle off if same item clicked again
    if (selection[slot]?.id === id) {
        card.classList.remove('selected');
        selection[slot] = null;
        updateSummarySlot(slot, null);
        window.clearOutfitSlot?.(slot);
        updateTotal();
        return;
    }

    // Deselect previous in same slot
    const prev = document.querySelector(`.fr-item[data-id="${selection[slot]?.id}"]`);
    if (prev) prev.classList.remove('selected');

    // Mark new as selected
    card.classList.add('selected');

    // Pulse glow on card
    card.style.boxShadow = `0 0 28px ${card.dataset.color}55, 0 0 8px ${card.dataset.color}33`;
    setTimeout(() => { card.style.boxShadow = ''; }, 800);

    // Save to state
    selection[slot] = { ...card.dataset, id };

    // Update 3D avatar
    window.applyOutfit?.(slot, { ...card.dataset, type: slot });

    // Update summary panel
    updateSummarySlot(slot, card.dataset);
    updateTotal();

    // Mobile vibration feedback
    if (navigator.vibrate) navigator.vibrate(30);
}

function normalizeSlot(type) {
    if (type === 'dress') return 'dress';
    if (type === 'necklace') return 'necklace';
    if (type === 'earrings') return 'earrings';
    if (type === 'bangles') return 'bangles';
    return 'dress'; // fallback
}

/* ── Summary Panel Updates ──────────────────────────────── */
function updateSummarySlot(slot, data) {
    const slotMap = {
        dress: 'summaryDress',
        necklace: 'summaryNecklace',
        earrings: 'summaryEarrings',
        bangles: 'summaryBangles'
    };
    const el = document.getElementById(slotMap[slot]);
    if (!el) return;

    if (!data) {
        el.innerHTML = `<span class="fr-summary-empty">None selected</span>`;
        el.classList.remove('filled');
        return;
    }

    el.classList.add('filled');
    el.innerHTML = `
    <span class="fr-summary-item-name">${data.label}</span>
    <span class="fr-summary-item-brand">${data.brand}</span>
    <span class="fr-summary-item-price">${data.price}</span>
  `;

    // Animate slot entry
    el.style.transform = 'scale(0.96)';
    el.style.opacity = '0.6';
    requestAnimationFrame(() => {
        el.style.transition = 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)';
        el.style.transform = 'scale(1)';
        el.style.opacity = '1';
        setTimeout(() => { el.style.transition = ''; }, 400);
    });
}

function updateTotal() {
    let total = 0;
    let hasAny = false;
    Object.values(selection).forEach(item => {
        if (!item) return;
        hasAny = true;
        const val = parseInt((item.price || '$0').replace(/[^0-9]/g, ''), 10);
        total += val;
    });
    const totalEl = document.getElementById('summaryTotal');
    const amtEl = document.getElementById('summaryTotalAmt');
    if (totalEl && amtEl) {
        totalEl.style.display = hasAny ? 'flex' : 'none';
        amtEl.textContent = `$${total.toLocaleString()}`;
    }
}

function clearAll() {
    Object.keys(selection).forEach(slot => {
        selection[slot] = null;
        window.clearOutfitSlot?.(slot);
        updateSummarySlot(slot, null);
    });
    document.querySelectorAll('.fr-item.selected').forEach(c => c.classList.remove('selected'));
    updateTotal();
}

/* ── Mobile Bottom Sheet ────────────────────────────────── */
function initMobileSheet() {
    const btn = document.getElementById('frBottomSheetBtn');
    const sheet = document.getElementById('frBottomSheet');
    const inner = document.getElementById('frBottomSheetInner');
    if (!btn || !sheet || !inner) return;

    // Clone selector into bottom sheet
    const selectorClone = document.getElementById('frSelector')?.cloneNode(true);
    if (selectorClone) {
        inner.appendChild(selectorClone);
        // Wire clicks on cloned items
        selectorClone.querySelectorAll('.fr-item').forEach(card => {
            card.addEventListener('click', () => {
                // Find matching original card and trigger
                const orig = document.querySelector(`.fr-item[data-id="${card.dataset.id}"]`);
                if (orig && orig !== card) selectItem(orig);
                else selectItem(card);
                // Sync selection state
                card.classList.toggle('selected', !!orig?.classList.contains('selected'));
            });
        });

        // Wire tabs in clone
        selectorClone.querySelectorAll('.fr-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                selectorClone.querySelectorAll('.fr-tab').forEach(t => t.classList.remove('active'));
                selectorClone.querySelectorAll('.fr-items-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                selectorClone.querySelector(`#tab-${tab.dataset.tab}`)?.classList.add('active');
            });
        });
    }

    btn.addEventListener('click', () => sheet.classList.toggle('open'));
    // Close on outside tap
    document.addEventListener('click', e => {
        if (!sheet.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
            sheet.classList.remove('open');
        }
    });
}

/* ── Confirmation Modal ─────────────────────────────────── */
function initModal() {
    document.getElementById('btnCustomize')?.addEventListener('click', openModal);
    document.getElementById('frModalClose')?.addEventListener('click', closeModal);
    document.getElementById('frModalBack')?.addEventListener('click', closeModal);
    document.getElementById('frModalOverlay')?.addEventListener('click', e => {
        if (e.target.id === 'frModalOverlay') closeModal();
    });
    document.getElementById('frModalCTA')?.addEventListener('click', () => {
        closeModal();
        // Redirect to shop or show confirmation
        setTimeout(() => window.location.href = 'shop.html', 300);
    });
}

function openModal() {
    const hasSelection = Object.values(selection).some(s => s !== null);
    if (!hasSelection) {
        // Shake the CTA button
        const btn = document.getElementById('btnCustomize');
        btn.style.transform = 'translateX(-6px)';
        setTimeout(() => btn.style.transform = 'translateX(6px)', 80);
        setTimeout(() => btn.style.transform = '', 160);
        return;
    }

    // Build modal summary
    const summaryEl = document.getElementById('frModalSummary');
    const gender = document.getElementById('summaryAvatar')?.textContent.trim() || 'Female';
    let html = `<p><strong>Avatar:</strong> ${gender}</p>`;
    let total = 0;
    const slotNames = { dress: '👗 Ensemble', necklace: '💫 Necklace', earrings: '💎 Earrings', bangles: '🔆 Bangles' };
    Object.entries(selection).forEach(([slot, item]) => {
        if (!item) return;
        html += `<p><strong>${slotNames[slot]}:</strong> ${item.label} <span style="color:var(--gold-light)">${item.price}</span></p>`;
        total += parseInt((item.price || '$0').replace(/[^0-9]/g, ''), 10);
    });
    html += `<p style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.1);"><strong>Estimated Total:</strong> <span style="color:var(--gold-light);font-size:1.05rem">$${total.toLocaleString()}</span></p>`;
    if (summaryEl) summaryEl.innerHTML = html;

    // Confetti
    spawnConfetti();

    document.getElementById('frModalOverlay')?.classList.add('open');
}

function closeModal() {
    document.getElementById('frModalOverlay')?.classList.remove('open');
}

function spawnConfetti() {
    const container = document.getElementById('frModalConfetti');
    if (!container) return;
    container.innerHTML = '';
    const colors = ['#D4AF37', '#F9E27D', '#996515', '#FFFFFF', '#0B0B0B'];
    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'confetti-piece';
        p.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-delay: ${Math.random() * 0.8}s;
      animation-duration: ${1.2 + Math.random() * 1.2}s;
      transform: rotate(${Math.random() * 360}deg);
    `;
        container.appendChild(p);
    }
    // Clear after animation
    setTimeout(() => { if (container) container.innerHTML = ''; }, 3000);
}
