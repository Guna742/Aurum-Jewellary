/* ============================================
   AURUM JEWELLERY — JavaScript
   Animations, Interactions, Filters, Cart
   Enhanced: Preloader, Particles, Counter,
   Tilt Cards, Text Reveal, Page Transitions
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ===== PRELOADER =====
  const preloader = document.getElementById('preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        preloader.classList.add('hidden');
        document.body.classList.add('loaded');
      }, 2800);
    });
    // Fallback: hide after 4s max
    setTimeout(() => {
      preloader.classList.add('hidden');
      document.body.classList.add('loaded');
    }, 4000);
  }

  // ===== ENHANCED SCROLL REVEAL =====
  const revealSelectors = '.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-rotate, .text-reveal, .mask-reveal, .stagger-text';
  const revealElements = document.querySelectorAll(revealSelectors);
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        if (entry.target.classList.contains('stagger-text')) {
          const spans = entry.target.querySelectorAll('span');
          spans.forEach((span, index) => {
            span.style.transitionDelay = `${index * 0.1}s`;
          });
        }
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.01, rootMargin: '0px 0px -20px 0px' });

  revealElements.forEach(el => revealObserver.observe(el));

  // ===== SCROLL PROGRESS BAR =====
  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  document.body.appendChild(progressBar);

  window.addEventListener('scroll', () => {
    const windowHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (window.scrollY / windowHeight) * 100;
    progressBar.style.width = `${progress}%`;
  });

  // ===== COUNTER ANIMATION =====
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(c => counterObserver.observe(c));
  }

  function animateCounter(el) {
    const target = el.dataset.count;
    const suffix = el.dataset.suffix || '';
    const isFloat = target.includes('.');
    const end = parseFloat(target);
    const duration = 2000;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = isFloat
        ? (end * eased).toFixed(1)
        : Math.floor(end * eased);
      el.textContent = current + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  // ===== PARTICLE BACKGROUND =====
  const particlesBg = document.querySelectorAll('.particles-bg');
  particlesBg.forEach(container => {
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('span');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.top = Math.random() * 100 + '%';
      p.style.setProperty('--drift-x', (Math.random() * 160 - 80) + 'px');
      p.style.setProperty('--drift-y', (Math.random() * -200 - 50) + 'px');
      p.style.animationDuration = (6 + Math.random() * 6) + 's';
      p.style.animationDelay = (Math.random() * 5) + 's';
      container.appendChild(p);
    }
  });

  // ===== CARD TILT EFFECT =====
  const tiltCards = document.querySelectorAll('.tilt-card');
  tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -6;
      const rotateY = ((x - centerX) / centerX) * 6;

      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);

      card.style.setProperty('--tilt-x', rotateX + 'deg');
      card.style.setProperty('--tilt-y', rotateY + 'deg');
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  // ===== MAGNETIC BUTTON EFFECT =====
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      btn.style.setProperty('--mouse-x', x + '%');
      btn.style.setProperty('--mouse-y', y + '%');
    });
  });

  // ===== PAGE TRANSITION LINKS =====
  const transitionOverlay = document.getElementById('pageTransition');
  if (transitionOverlay) {
    document.querySelectorAll('a[href$=".html"]').forEach(link => {
      link.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('#')) {
          e.preventDefault();
          transitionOverlay.classList.add('active');
          setTimeout(() => {
            window.location.href = href;
          }, 300);
        }
      });
    });
  }

  // ===== NAVBAR SCROLL =====
  const navbar = document.getElementById('navbar');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    if (currentScroll > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    lastScroll = currentScroll;
  });

  // ===== MOBILE MENU =====
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      menuToggle.classList.toggle('active');
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        menuToggle.classList.remove('active');
      });
    });
  }

  // ===== BACK TO TOP =====
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 500) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    });

    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ===== PRODUCT FILTERS =====
  const filterBtns = document.querySelectorAll('.filter-btn');
  const productCards = document.querySelectorAll('.product-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      applyProductFilter(filter);
    });
  });

  function applyProductFilter(filter) {
    productCards.forEach(card => {
      if (filter === 'all' || card.dataset.category === filter) {
        card.style.display = '';
        card.style.animation = 'fadeInUp 0.5s var(--ease-premium) forwards';
      } else {
        card.style.display = 'none';
      }
    });

    // Update sidebar checkboxes if they exist
    const checkboxes = document.querySelectorAll('.filter-group input[type="checkbox"]');
    if (checkboxes.length > 0) {
      checkboxes.forEach(cb => {
        const labelText = cb.parentElement.textContent.trim().toLowerCase();
        if (filter === 'all') {
          if (labelText === 'all') cb.checked = true;
          else cb.checked = false;
        } else {
          cb.checked = labelText === filter;
        }
      });
    }
  }

  // Handle URL parameters for category filtering
  const urlParams = new URLSearchParams(window.location.search);
  const categoryParam = urlParams.get('cat');
  if (categoryParam) {
    // Small delay to ensure all animations/initializations are ready
    setTimeout(() => {
      applyProductFilter(categoryParam);
      // Also update any filter buttons that might match
      filterBtns.forEach(btn => {
        if (btn.dataset.filter === categoryParam) {
          filterBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        }
      });
    }, 100);
  }

  // ===== INITIALIZE SIZE & DURATION DEFAULTS =====
  const defaultSize = document.querySelector('.size-option.selected');
  if (defaultSize) window._selectedSize = defaultSize.textContent.trim();

  const defaultDuration = document.querySelector('.duration-option.selected');
  if (defaultDuration) {
    window._selectedDuration = defaultDuration.querySelector('strong').textContent.trim();
    window._selectedPrice = defaultDuration.querySelector('.dur-price').textContent.trim();
  }

  // ===== CALENDAR (Product Detail Page) =====
  const calendarDays = document.getElementById('calendarDays');
  const calendarMonth = document.getElementById('calendarMonth');

  if (calendarDays) {
    let currentDate = new Date(2026, 2, 1);

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const unavailableDates = [3, 4, 5, 12, 13, 19, 20, 26, 27];

    function renderCalendar() {
      if (!calendarDays) return;
      calendarDays.innerHTML = '';

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      calendarMonth.textContent = `${monthNames[month]} ${year}`;

      dayLabels.forEach(day => {
        const label = document.createElement('span');
        label.className = 'day-label';
        label.textContent = day;
        calendarDays.appendChild(label);
      });

      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('span');
        empty.className = 'day empty';
        calendarDays.appendChild(empty);
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const dayEl = document.createElement('span');
        dayEl.className = 'day';
        dayEl.textContent = d;

        if (unavailableDates.includes(d)) {
          dayEl.classList.add('unavailable');
        } else {
          dayEl.addEventListener('click', function () {
            // Deselect all previously selected days
            document.querySelectorAll('.calendar-days .day.selected').forEach(s => {
              s.classList.remove('selected', 'heart-selected');
            });

            // Apply selected heart style
            this.classList.add('selected', 'heart-selected');

            // Store selected date globally
            window._selectedCalendarDate = `${monthNames[month]} ${d}, ${year}`;
          });
        }

        calendarDays.appendChild(dayEl);
      }
    }

    window.changeMonth = function (dir, triggerBtn) {
      currentDate.setMonth(currentDate.getMonth() + dir);
      renderCalendar();

      // Refined plump heart burst animation on the clicked button
      if (triggerBtn) {
        const heart = document.createElement('span');
        heart.className = 'cal-btn-heart';
        // No emoji needed — CSS uses the plump SVG background
        triggerBtn.appendChild(heart);
        heart.addEventListener('animationend', () => heart.remove());
      }
    };


    renderCalendar();
  }

  // ===== SMOOTH SCROLL for anchor links =====
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 80;
        const targetPos = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: targetPos, behavior: 'smooth' });
      }
    });
  });

  // ===== PARALLAX SUBTLE EFFECT on hero =====
  const heroBg = document.querySelector('.hero-bg');
  if (heroBg) {
    window.addEventListener('scroll', () => {
      const scroll = window.scrollY;
      heroBg.style.transform = `translateY(${scroll * 0.3}px)`;
    });
  }

  // ===== CURSOR GLOW (desktop only) =====
  if (window.innerWidth > 768) {
    const cursorGlow = document.createElement('div');
    cursorGlow.style.cssText = `
      position: fixed; width: 300px; height: 300px; border-radius: 50%;
      background: radial-gradient(circle, rgba(204,27,27,0.06), rgba(75,0,130,0.04), transparent 70%);
      pointer-events: none; z-index: 0; transform: translate(-50%, -50%);
      transition: left 0.15s ease, top 0.15s ease;
    `;
    document.body.appendChild(cursorGlow);
    document.addEventListener('mousemove', (e) => {
      cursorGlow.style.left = e.clientX + 'px';
      cursorGlow.style.top = e.clientY + 'px';
    });
  }

});

// ===== E-COMMERCE CART SYSTEM =====
window.cart = [];

function initCart() {
  const cartButtons = document.querySelectorAll('.btn-add-cart');
  cartButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.product-card') || e.target.closest('.membership-card') || e.target.closest('.bridal-card');
      const name = card.querySelector('.product-name, .tier-name, h4').textContent.trim();
      const priceText = card.querySelector('.product-price, .tier-price, .price').textContent.trim();
      const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
      const image = card.querySelector('img').src;

      addToCart({ name, price, image });
      showCartToast(`${name} added to cart!`);
    });
  });

  updateCartCount();
}

function addToCart(item) {
  const existing = window.cart.find(i => i.name === item.name);
  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1;
  } else {
    item.quantity = 1;
    window.cart.push(item);
  }
  localStorage.setItem('aurum_cart', JSON.stringify(window.cart));
  updateCartCount();
}

function updateCartCount() {
  const count = window.cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartCountEl = document.querySelector('.cart-count');
  if (cartCountEl) {
    cartCountEl.textContent = count;
    cartCountEl.style.display = count > 0 ? 'flex' : 'none';
  }
}

function showCartToast(msg) {
  const existing = document.getElementById('cart-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'cart-toast';
  toast.innerHTML = `<span style="margin-right:10px;">✨</span> ${msg}`;
  toast.style.cssText = `
    position: fixed; bottom: 32px; right: 32px;
    background: var(--gradient-gold); color: var(--matte-black);
    padding: 16px 32px; border-radius: 12px;
    font-family: var(--font-body); font-weight: 600;
    box-shadow: var(--shadow-lg); z-index: 9999;
    animation: slideInRight 0.5s var(--ease-premium) forwards;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.5s var(--ease-premium) forwards';
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// Load cart from storage
const savedCart = localStorage.getItem('aurum_cart');
if (savedCart) window.cart = JSON.parse(savedCart);

// Inject animation keyframes for toast
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(120%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(120%); opacity: 0; }
  }
  .cart-count {
    position: absolute; top: -8px; right: -8px;
    background: var(--gold); color: var(--matte-black);
    font-size: 0.7rem; width: 18px; height: 18px;
    border-radius: 50%; display: flex; align-items: center;
    justify-content: center; font-weight: 700;
  }
`;
document.head.appendChild(style);

initCart();

function showReserveError(msg) {
  // Remove any existing toast
  const existing = document.getElementById('reserve-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'reserve-toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: var(--gradient-gold);
    color: var(--matte-black);
    padding: 14px 28px;
    border-radius: 12px;
    font-family: var(--font-body, sans-serif);
    font-size: 0.9rem;
    font-weight: 600;
    box-shadow: 0 8px 32px rgba(212, 175, 55, 0.3);
    z-index: 9999;
    opacity: 0;
    transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1);
    white-space: nowrap;
    border: 1px solid rgba(255,255,255,0.15);
    letter-spacing: 0.3px;
  `;
  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  // Auto-remove after 3.5s
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

function shakeSection(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.style.transition = 'box-shadow 0.3s';
  el.style.boxShadow = '0 0 0 2px rgba(220,50,50,0.7), 0 0 20px rgba(139,0,0,0.3)';
  el.style.borderRadius = '10px';
  el.classList.remove('shake');
  // Force reflow to restart animation
  void el.offsetWidth;
  el.classList.add('shake');
  setTimeout(() => {
    el.style.boxShadow = '';
    el.classList.remove('shake');
  }, 700);
}

function toggleFaq(btn) {
  const item = btn.closest('.faq-item');
  const isOpen = item.classList.contains('open');

  document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));

  if (!isOpen) {
    item.classList.add('open');
  }
}
