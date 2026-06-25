/* ============================================================
   PODER JOTA — main.js
   Lógica global: navbar activo/móvil, animaciones Anime.js
   (scroll reveal, hero stagger, slider de texto, micro-hovers)
   Respeta prefers-reduced-motion.
   ============================================================ */
(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -------------------- 1. Año del footer -------------------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* -------------------- 2. Navbar: scroll + móvil -------------------- */
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (navbar) {
    const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      navToggle.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', String(open));
    });
    // Cierra el menú al hacer clic en un link
    navLinks.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      })
    );
  }

  /* -------------------- 3. Hero: entrada escalonada (stagger) -------------------- */
  function animateHero() {
    const heroItems = document.querySelectorAll('[data-hero]');
    if (!heroItems.length) return;

    if (prefersReduced) {
      heroItems.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    if (typeof anime === 'undefined') {
      heroItems.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Reseteamos estado inicial (animations.css deja opacity:0 + translateY)
    heroItems.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
    });

    anime({
      targets: heroItems,
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 900,
      delay: anime.stagger(140, { start: 200 }),
      easing: 'easeOutCubic',
      complete: () => heroItems.forEach((el) => el.classList.add('is-visible')),
    });
  }

  /* -------------------- 4. Scroll reveal con IntersectionObserver + Anime.js -------------------- */
  function setupScrollReveal() {
    const revealEls = document.querySelectorAll('[data-reveal]');
    if (!revealEls.length) return;

    if (prefersReduced || typeof anime === 'undefined') {
      revealEls.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const delay = parseInt(el.getAttribute('data-reveal-delay') || '0', 10);
          const dir = el.getAttribute('data-reveal');

          // La animación parte del mismo offset que define el CSS según la dirección
          const props = { opacity: [0, 1] };
          if (dir === 'left') props.translateX = [-40, 0];
          else if (dir === 'right') props.translateX = [40, 0];
          else if (dir === 'scale') props.scale = [0.92, 1];
          else props.translateY = [40, 0];

          anime({
            targets: el,
            ...props,
            duration: 800,
            delay: delay,
            easing: 'easeOutCubic',
            complete: () => el.classList.add('is-visible'),
          });

          observer.unobserve(el);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );

    // Estado inicial según dirección
    revealEls.forEach((el) => {
      const dir = el.getAttribute('data-reveal');
      if (dir === 'left') el.style.transform = 'translateX(-40px)';
      else if (dir === 'right') el.style.transform = 'translateX(40px)';
      else if (dir === 'scale') el.style.transform = 'scale(0.92)';
      else el.style.transform = 'translateY(40px)';
      observer.observe(el);
    });
  }

  /* -------------------- 5. Slider de texto (Home) con Anime.js -------------------- */
  function setupTextSlider() {
    const slider = document.getElementById('textSlider');
    const viewport = document.getElementById('sliderViewport');
    const dotsContainer = document.getElementById('sliderDots');
    if (!slider || !viewport || !dotsContainer) return;

    const slides = Array.from(viewport.querySelectorAll('.text-slide'));
    if (slides.length <= 1) return;

    let current = 0;
    let timer = null;
    const INTERVAL = 3200;

    // Crear dots
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'text-slider__dot' + (i === 0 ? ' is-active' : '');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Ir a frase ${i + 1}`);
      dot.addEventListener('click', () => {
        goTo(i);
        restart();
      });
      dotsContainer.appendChild(dot);
    });

    const dots = Array.from(dotsContainer.querySelectorAll('.text-slider__dot'));

    function show(index) {
      if (index === current) return;

      // Sincroniza los dots siempre
      dots.forEach((d, i) => d.classList.toggle('is-active', i === index));

      const outgoing = slides[current];
      const incoming = slides[index];

      // Cancela cualquier animación en curso para evitar estados inconsistentes
      if (!prefersReduced && typeof anime !== 'undefined') anime.remove(slides);

      // Normaliza TODAS las slides de forma determinista: la entrante visible,
      // el resto ocultas. No dependemos de callbacks `complete` (que pueden no
      // ejecutarse si la animación se cancela) para dejar un estado limpio.
      slides.forEach((s, i) => {
        if (i === index) return;
        s.classList.remove('is-active');
        s.style.zIndex = '0';
        if (i !== current) s.style.opacity = '0';
      });

      incoming.classList.add('is-active');
      incoming.style.zIndex = '1';

      // current debe actualizarse YA, antes de cualquier animación, para que el
      // siguiente tick siempre parta de un estado coherente.
      current = index;

      if (prefersReduced || typeof anime === 'undefined') {
        incoming.style.opacity = '1';
        outgoing.style.opacity = '0';
        return;
      }

      incoming.style.opacity = '0';

      // Fundido de salida
      anime({
        targets: outgoing,
        opacity: 0,
        duration: 300,
        easing: 'easeInCubic',
      });

      // Fundido de entrada
      anime({
        targets: incoming,
        opacity: [0, 1],
        duration: 400,
        delay: 120,
        easing: 'easeOutCubic',
      });
    }

    function goTo(index) {
      show(index);
    }

    function next() {
      const index = (current + 1) % slides.length;
      show(index);
    }

    function stop() { clearInterval(timer); timer = null; }
    // Idempotente: limpia siempre el timer previo para evitar intervalos
    // duplicados corriendo en paralelo (la causa de que se "congelara").
    function start() { stop(); timer = setInterval(next, INTERVAL); }
    function restart() { start(); }

    // Pausa en hover
    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', start);

    // Pausa cuando la pestaña no está visible y reanuda al volver, así el
    // navegador no desincroniza el intervalo por el throttling de fondo.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
    });

    start();
  }

  /* -------------------- 6. Contador de stats con Anime.js -------------------- */
  function setupStatsCounter() {
    const statsSection = document.getElementById('stats');
    if (!statsSection) return;

    const counters = statsSection.querySelectorAll('.stat-card__num');
    if (!counters.length) return;

    if (prefersReduced || typeof anime === 'undefined') {
      counters.forEach((el) => {
        const target = parseInt(el.getAttribute('data-target'), 10);
        const suffix = el.getAttribute('data-suffix') || '';
        el.textContent = target + suffix;
      });
      return;
    }

    // Mostrar valores iniciales como 0 + suffix
    counters.forEach((el) => {
      const suffix = el.getAttribute('data-suffix') || '';
      el.textContent = '0' + suffix;
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          counters.forEach((el) => {
            const target = parseInt(el.getAttribute('data-target'), 10);
            const suffix = el.getAttribute('data-suffix') || '';
            const obj = { val: 0 };

            anime({
              targets: obj,
              val: target,
              duration: 2000,
              delay: 150,
              easing: 'easeOutQuart',
              update: () => {
                el.textContent = Math.round(obj.val) + suffix;
              },
              complete: () => {
                el.textContent = target + suffix;
              },
            });
          });

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(statsSection);
  }

  /* -------------------- 7. Contador de pasos campus con Anime.js -------------------- */
  function setupCampusCounter() {
    const campusSection = document.getElementById('cursos');
    if (!campusSection) return;

    const counters = campusSection.querySelectorAll('.campus-step__num[data-target]');
    if (!counters.length) return;

    // Función para formatear con cero a la izquierda
    function pad(n) {
      return String(n).padStart(2, '0');
    }

    if (prefersReduced || typeof anime === 'undefined') {
      counters.forEach((el) => {
        const target = parseInt(el.getAttribute('data-target'), 10);
        el.textContent = pad(target);
      });
      return;
    }

    // Mostrar 00 inicial
    counters.forEach((el) => { el.textContent = '00'; });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          counters.forEach((el) => {
            const target = parseInt(el.getAttribute('data-target'), 10);
            const obj = { val: 0 };

            anime({
              targets: obj,
              val: target,
              duration: 1200,
              delay: 200,
              easing: 'easeOutQuart',
              update: () => {
                el.textContent = pad(Math.round(obj.val));
              },
              complete: () => {
                el.textContent = pad(target);
              },
            });
          });

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(campusSection);
  }

  /* -------------------- 8. Contador stats fútbol con Anime.js -------------------- */
  function setupFutbolStatsCounter() {
    const statsGrid = document.getElementById('futbolStats');
    if (!statsGrid) return;

    const counters = statsGrid.querySelectorAll('.stat-card__num[data-target]');
    if (!counters.length) return;

    if (prefersReduced || typeof anime === 'undefined') {
      counters.forEach((el) => {
        const target = parseInt(el.getAttribute('data-target'), 10);
        const suffix = el.getAttribute('data-suffix') || '';
        el.textContent = target + suffix;
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          counters.forEach((el) => {
            const target = parseInt(el.getAttribute('data-target'), 10);
            const suffix = el.getAttribute('data-suffix') || '';
            const obj = { val: 0 };

            anime({
              targets: obj,
              val: target,
              duration: 2000,
              delay: 150,
              easing: 'easeOutQuart',
              update: () => {
                el.textContent = Math.round(obj.val) + suffix;
              },
              complete: () => {
                el.textContent = target + suffix;
              },
            });
          });

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(statsGrid);
  }

  /* -------------------- 9. Timeline fútbol stagger con Anime.js -------------------- */
  function setupFutbolTimeline() {
    const timeline = document.getElementById('formatoTimeline');
    if (!timeline) return;

    const steps = timeline.querySelectorAll('.format-timeline__step');
    const arrows = timeline.querySelectorAll('.format-timeline__arrow');
    if (!steps.length) return;

    if (prefersReduced || typeof anime === 'undefined') {
      steps.forEach((el) => el.classList.add('is-visible'));
      arrows.forEach((el) => { el.style.opacity = '1'; });
      return;
    }

    // Estado inicial: ocultos
    steps.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
    });
    arrows.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-10px)';
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          // Pasos aparecen uno tras otro
          anime({
            targets: steps,
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 700,
            delay: anime.stagger(160, { start: 100 }),
            easing: 'easeOutCubic',
            complete: () => steps.forEach((el) => el.classList.add('is-visible')),
          });

          // Flechas aparecen ligeramente después del paso anterior
          anime({
            targets: arrows,
            opacity: [0, 1],
            translateX: [-10, 0],
            duration: 500,
            delay: anime.stagger(160, { start: 300 }),
            easing: 'easeOutCubic',
          });

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(timeline);
  }

  /* -------------------- 10. Timeline campus stagger con Anime.js -------------------- */
  function setupCampusTimeline() {
    const stepsContainer = document.getElementById('campusSteps');
    if (!stepsContainer) return;

    const steps = stepsContainer.querySelectorAll('.campus-step');
    if (!steps.length) return;

    if (prefersReduced || typeof anime === 'undefined') {
      steps.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Estado inicial: ocultos
    steps.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          anime({
            targets: steps,
            opacity: [0, 1],
            translateY: [24, 0],
            duration: 700,
            delay: anime.stagger(180, { start: 100 }),
            easing: 'easeOutCubic',
            complete: () => steps.forEach((el) => el.classList.add('is-visible')),
          });

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(stepsContainer);
  }

  /* -------------------- 11. Pilares fútbol stagger con Anime.js -------------------- */
  function setupFutbolPillars() {
    const pillarsContainer = document.getElementById('futbolPillars');
    if (!pillarsContainer) return;

    const pillars = pillarsContainer.querySelectorAll('.futbol-pillar');
    if (!pillars.length) return;

    if (prefersReduced || typeof anime === 'undefined') {
      pillars.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Estado inicial: ocultos
    pillars.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(28px)';
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          anime({
            targets: pillars,
            opacity: [0, 1],
            translateY: [28, 0],
            duration: 700,
            delay: anime.stagger(150, { start: 100 }),
            easing: 'easeOutCubic',
            complete: () => pillars.forEach((el) => el.classList.add('is-visible')),
          });

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(pillarsContainer);
  }

  /* -------------------- 12. Planes de precios stagger con Anime.js -------------------- */
  function setupPricingPlans() {
    const grids = document.querySelectorAll('.plan-grid');
    if (!grids.length) return;

    if (prefersReduced || typeof anime === 'undefined') {
      grids.forEach((grid) => {
        grid.querySelectorAll('.plan').forEach((el) => el.classList.add('is-visible'));
      });
      return;
    }

    grids.forEach((grid) => {
      const plans = grid.querySelectorAll('.plan');
      if (!plans.length) return;

      // Estado inicial: ocultos
      plans.forEach((el) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
      });

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            anime({
              targets: plans,
              opacity: [0, 1],
              translateY: [30, 0],
              duration: 700,
              delay: anime.stagger(160, { start: 100 }),
              easing: 'easeOutCubic',
              complete: () => plans.forEach((el) => el.classList.add('is-visible')),
            });

            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.15 }
      );

      observer.observe(grid);
    });
  }

  /* -------------------- 13. FAQ campus stagger con Anime.js -------------------- */
  function setupFaqAnimation() {
    const faqStack = document.getElementById('faqStack');
    if (!faqStack) return;

    const items = faqStack.querySelectorAll('details');
    if (!items.length) return;

    if (prefersReduced || typeof anime === 'undefined') {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Estado inicial: ocultos
    items.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          anime({
            targets: items,
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 600,
            delay: anime.stagger(100, { start: 80 }),
            easing: 'easeOutCubic',
            complete: () => items.forEach((el) => el.classList.add('is-visible')),
          });

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(faqStack);
  }

  /* -------------------- 14. Evidencia fútbol stagger con Anime.js -------------------- */
  function setupEvidenceAnimation() {
    const evidence = document.getElementById('evidenceFutbol');
    if (!evidence) return;

    const media = evidence.querySelector('.evidence__media');
    const caption = evidence.querySelector('.evidence__caption');
    if (!media || !caption) return;

    if (prefersReduced || typeof anime === 'undefined') {
      evidence.classList.add('is-visible');
      return;
    }

    // Estado inicial: ocultos
    media.style.opacity = '0';
    media.style.transform = 'translateY(30px)';
    caption.style.opacity = '0';
    caption.style.transform = 'translateY(30px)';

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const items = [media, caption];

          // Imagen primero, caption después
          anime({
            targets: items,
            opacity: [0, 1],
            translateY: [30, 0],
            duration: 700,
            delay: anime.stagger(200, { start: 100 }),
            easing: 'easeOutCubic',
            complete: () => evidence.classList.add('is-visible'),
          });

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(evidence);
  }

  /* -------------------- 15. Audiencia fútbol stagger con Anime.js -------------------- */
  function setupAudienceAnimation() {
    const container = document.getElementById('audienceFutbol');
    if (!container) return;

    const items = container.querySelectorAll('.audience-futbol__item');
    if (!items.length) return;

    if (prefersReduced || typeof anime === 'undefined') {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Estado inicial: ocultos
    items.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          anime({
            targets: items,
            opacity: [0, 1],
            translateY: [24, 0],
            duration: 700,
            delay: anime.stagger(180, { start: 100 }),
            easing: 'easeOutCubic',
            complete: () => items.forEach((el) => el.classList.add('is-visible')),
          });

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(container);
  }

  /* -------------------- 16. CTA final stagger con Anime.js -------------------- */
  function setupCtaFinalAnimation() {
    const ctas = document.querySelectorAll('.cta-final');
    if (!ctas.length) return;

    if (prefersReduced || typeof anime === 'undefined') {
      ctas.forEach((cta) => cta.classList.add('is-visible'));
      return;
    }

    ctas.forEach((cta) => {
      const children = Array.from(cta.children);
      if (!children.length) return;

      // Estado inicial: ocultos
      children.forEach((el) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
      });

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            anime({
              targets: children,
              opacity: [0, 1],
              translateY: [20, 0],
              duration: 600,
              delay: anime.stagger(120, { start: 80 }),
              easing: 'easeOutCubic',
              complete: () => cta.classList.add('is-visible'),
            });

            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.2 }
      );

      observer.observe(cta);
    });
  }

  /* -------------------- 17. Testimonios stagger con Anime.js -------------------- */
  function setupTestimonialsAnimation() {
    const grid = document.getElementById('testimonialsGrid');
    if (!grid) return;

    const testimonials = grid.querySelectorAll('.testimonial');
    if (!testimonials.length) return;

    if (prefersReduced || typeof anime === 'undefined') {
      testimonials.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Estado inicial: ocultos
    testimonials.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          anime({
            targets: testimonials,
            opacity: [0, 1],
            translateY: [24, 0],
            duration: 700,
            delay: anime.stagger(160, { start: 100 }),
            easing: 'easeOutCubic',
            complete: () => testimonials.forEach((el) => el.classList.add('is-visible')),
          });

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(grid);
  }

  /* -------------------- 18. Service cards stagger con Anime.js -------------------- */
  function setupServiceCardsAnimation() {
    const grid = document.getElementById('serviceCards');
    if (!grid) return;

    const cards = grid.querySelectorAll('.service-card');
    if (!cards.length) return;

    if (prefersReduced || typeof anime === 'undefined') {
      cards.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Estado inicial: ocultos
    cards.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(28px)';
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          anime({
            targets: cards,
            opacity: [0, 1],
            translateY: [28, 0],
            duration: 700,
            delay: anime.stagger(180, { start: 100 }),
            easing: 'easeOutCubic',
            complete: () => cards.forEach((el) => el.classList.add('is-visible')),
          });

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(grid);
  }

  /* -------------------- 19. Pilares de fe stagger con Anime.js -------------------- */
  function setupFaithPillarsAnimation() {
    const container = document.getElementById('faithPillars');
    if (!container) return;

    const pillars = container.querySelectorAll('.pillar');
    if (!pillars.length) return;

    if (prefersReduced || typeof anime === 'undefined') {
      pillars.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Estado inicial: ocultos
    pillars.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          anime({
            targets: pillars,
            opacity: [0, 1],
            translateY: [24, 0],
            duration: 700,
            delay: anime.stagger(150, { start: 100 }),
            easing: 'easeOutCubic',
            complete: () => pillars.forEach((el) => el.classList.add('is-visible')),
          });

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(container);
  }

  /* -------------------- 20. Values grid stagger con Anime.js -------------------- */
  function setupValuesGridAnimation() {
    const grid = document.getElementById('valuesGrid');
    if (!grid) return;

    const items = grid.querySelectorAll('.value-item');
    if (!items.length) return;

    if (prefersReduced || typeof anime === 'undefined') {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Estado inicial: ocultos
    items.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(30px)';
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          anime({
            targets: items,
            opacity: [0, 1],
            translateX: [30, 0],
            duration: 700,
            delay: anime.stagger(150, { start: 100 }),
            easing: 'easeOutCubic',
            complete: () => items.forEach((el) => el.classList.add('is-visible')),
          });

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(grid);
  }

  /* -------------------- 21. Method steps fitness stagger con Anime.js -------------------- */
  function setupMethodStepsAnimation() {
    const container = document.getElementById('methodSteps');
    if (!container) return;

    const steps = container.querySelectorAll('.method-step');
    if (!steps.length) return;

    if (prefersReduced || typeof anime === 'undefined') {
      steps.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Estado inicial: ocultos
    steps.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          anime({
            targets: steps,
            opacity: [0, 1],
            translateY: [24, 0],
            duration: 700,
            delay: anime.stagger(160, { start: 100 }),
            easing: 'easeOutCubic',
            complete: () => steps.forEach((el) => el.classList.add('is-visible')),
          });

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(container);
  }

  /* -------------------- 22. Evidencia fitness stagger con Anime.js -------------------- */
  function setupFitnessEvidenceAnimation() {
    const evidence = document.getElementById('evidenceFitness');
    if (!evidence) return;

    const media = evidence.querySelector('.evidence__media');
    const caption = evidence.querySelector('.evidence__caption');
    if (!media || !caption) return;

    if (prefersReduced || typeof anime === 'undefined') {
      evidence.classList.add('is-visible');
      return;
    }

    // Estado inicial: ocultos
    media.style.opacity = '0';
    media.style.transform = 'translateY(30px)';
    caption.style.opacity = '0';
    caption.style.transform = 'translateY(30px)';

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const items = [media, caption];

          // Imagen primero, caption después
          anime({
            targets: items,
            opacity: [0, 1],
            translateY: [30, 0],
            duration: 700,
            delay: anime.stagger(200, { start: 100 }),
            easing: 'easeOutCubic',
            complete: () => evidence.classList.add('is-visible'),
          });

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(evidence);
  }

  /* -------------------- 23. Benefits + audiencia fitness stagger con Anime.js -------------------- */
  function setupBenefitsAudienceAnimation() {
    const container = document.getElementById('benefitsAudience');
    if (!container) return;

    const colBenefits = container.querySelector('.benefits-col');
    const colAudience = container.querySelector('.audience-col');
    if (!colBenefits || !colAudience) return;

    if (prefersReduced || typeof anime === 'undefined') {
      colBenefits.classList.add('is-visible');
      colAudience.classList.add('is-visible');
      return;
    }

    // Estado inicial: ocultos
    colBenefits.style.opacity = '0';
    colBenefits.style.transform = 'translateX(-20px)';
    colAudience.style.opacity = '0';
    colAudience.style.transform = 'translateX(20px)';

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const items = [colBenefits, colAudience];

          // Beneficios desde la izquierda, audiencia desde la derecha
          anime({
            targets: items,
            opacity: [0, 1],
            translateX: function (el) {
              return el === colBenefits ? [-20, 0] : [20, 0];
            },
            duration: 700,
            delay: anime.stagger(200, { start: 100 }),
            easing: 'easeOutCubic',
            complete: () => items.forEach((el) => el.classList.add('is-visible')),
          });

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(container);
  }

  /* -------------------- 25. Descripción fitness stagger con Anime.js -------------------- */
  function setupFitnessDescriptionAnimation() {
    const container = document.getElementById('fitnessDescription');
    if (!container) return;

    // El primer hijo directo envuelve eyebrow, h2, p, p
    const wrapper = container.firstElementChild;
    if (!wrapper) return;

    const items = Array.from(wrapper.children);
    if (!items.length) return;

    if (prefersReduced || typeof anime === 'undefined') {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Estado inicial: ocultos
    items.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          anime({
            targets: items,
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 600,
            delay: anime.stagger(120, { start: 80 }),
            easing: 'easeOutCubic',
            complete: () => container.classList.add('is-visible'),
          });

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(container);
  }

  /* -------------------- 26. Hero stats grid stagger con Anime.js -------------------- */
  function setupHeroStatsAnimation() {
    const grid = document.getElementById('heroStatsGrid');
    if (!grid) return;

    const cards = grid.querySelectorAll('.stat-card');
    if (!cards.length) return;

    if (prefersReduced || typeof anime === 'undefined') {
      cards.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Estado inicial: ocultos
    cards.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(28px)';
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          anime({
            targets: cards,
            opacity: [0, 1],
            translateY: [28, 0],
            duration: 700,
            delay: anime.stagger(150, { start: 100 }),
            easing: 'easeOutCubic',
            complete: () => cards.forEach((el) => el.classList.add('is-visible')),
          });

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(grid);
  }

  /* -------------------- 27. Pricing banner campus stagger con Anime.js -------------------- */
  function setupPricingBannerCampus() {
    const banner = document.getElementById('pricingBannerCampus');
    if (!banner) return;

    const children = Array.from(banner.children);
    if (!children.length) return;

    if (prefersReduced || typeof anime === 'undefined') {
      children.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Estado inicial: ocultos
    children.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          anime({
            targets: children,
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 600,
            delay: anime.stagger(120, { start: 80 }),
            easing: 'easeOutCubic',
            complete: () => banner.classList.add('is-visible'),
          });

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(banner);
  }

  /* -------------------- 28. Benefits grid (6 items) stagger con Anime.js -------------------- */
  function setupBenefitsGridAnimation() {
    const grid = document.getElementById('benefitsGrid');
    if (!grid) return;

    const items = grid.querySelectorAll('.benefit-item');
    if (!items.length) return;

    if (prefersReduced || typeof anime === 'undefined') {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Estado inicial: ocultos
    items.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(16px)';
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          anime({
            targets: items,
            opacity: [0, 1],
            translateY: [16, 0],
            duration: 500,
            delay: anime.stagger(80, { start: 80 }),
            easing: 'easeOutCubic',
            complete: () => items.forEach((el) => el.classList.add('is-visible')),
          });

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(grid);
  }

  /* -------------------- 29. Farewell section — split layout animation -------------------- */
  function setupFarewellAnimation() {
    const section = document.getElementById('farewell');
    if (!section) return;

    const media = section.querySelector('.farewell__media');
    const inner = section.querySelector('.farewell__inner');
    if (!media || !inner) return;

    if (prefersReduced || typeof anime === 'undefined') {
      section.classList.add('is-visible');
      inner.querySelectorAll('*').forEach((el) => el.style.opacity = '1');
      return;
    }

    // Estado inicial: media oculto (slide desde izquierda), textos ocultos
    media.style.opacity = '0';
    media.style.transform = 'translateX(-40px)';

    const children = Array.from(inner.children);
    children.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          // Imagen entra desde la izquierda
          anime({
            targets: media,
            opacity: [0, 1],
            translateX: [-40, 0],
            duration: 900,
            easing: 'easeOutCubic',
          });

          // Textos aparecen con stagger
          anime({
            targets: children,
            opacity: [0, 1],
            translateY: [30, 0],
            duration: 800,
            delay: anime.stagger(150, { start: 300 }),
            easing: 'easeOutCubic',
            complete: () => {
              children.forEach((el) => (el.style.opacity = '1'));
              section.classList.add('is-visible');
            },
          });

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(section);
  }

  /* -------------------- 30. Inicialización -------------------- */
  function init() {
    animateHero();
    setupScrollReveal();
    setupStatsCounter();
    setupCampusCounter();
    setupFutbolStatsCounter();
    setupFutbolTimeline();
    setupCampusTimeline();
    setupFutbolPillars();
    setupPricingPlans();
    setupFaqAnimation();
    setupEvidenceAnimation();
    setupAudienceAnimation();
    setupCtaFinalAnimation();
    setupTestimonialsAnimation();
    setupServiceCardsAnimation();
    setupFaithPillarsAnimation();
    setupValuesGridAnimation();
    setupMethodStepsAnimation();
    setupFitnessEvidenceAnimation();
    setupBenefitsAudienceAnimation();
    setupFitnessDescriptionAnimation();
    setupHeroStatsAnimation();
    setupPricingBannerCampus();
    setupBenefitsGridAnimation();
    setupFarewellAnimation();
    setupTextSlider();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
