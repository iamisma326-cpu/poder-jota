/* ============================================================
   PODER JOTA — animations-gsap.js
   Animaciones avanzadas con GSAP (ScrollTrigger) + Lenis
   Complementa las animaciones de anime.js en main.js
   ============================================================ */
(function () {
  'use strict';

  const prefersReduced = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  // Si no hay GSAP, ScrollTrigger o el usuario prefiere motion reducido, salir
  if (
    prefersReduced ||
    typeof gsap === 'undefined' ||
    typeof ScrollTrigger === 'undefined'
  )
    return;

  /* ------------------------------------------------------------------ */
  /*  1. INICIALIZAR LENIS + SINCRONIZAR CON GSAP                       */
  /* ------------------------------------------------------------------ */
  function initLenis() {
    let lenis;
    try {
      lenis = new Lenis({
        duration: 1.2,
        easing: function (t) {
          return Math.min(1, 1.001 - Math.pow(2, -10 * t));
        },
        orientation: 'vertical',
        smoothWheel: true,
      });
    } catch (e) {
      // Lenis no disponible, continuar sin smooth scroll
      return null;
    }

    // Sincronizar GSAP + Lenis
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    return lenis;
  }

  /* ------------------------------------------------------------------ */
  /*  2. PARALLAX EN IMÁGENES DE EVIDENCIA (fitness + futbol)           */
  /* ------------------------------------------------------------------ */
  function setupEvidenceParallax() {
    var images = document.querySelectorAll('.evidence__media img');
    if (!images.length) return;

    images.forEach(function (img) {
      var evidence = img.closest('.evidence');
      if (!evidence) return;

      gsap.fromTo(
        img,
        { y: 0, scale: 1.1 },
        {
          y: -80,
          scale: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: evidence,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.5,
          },
        }
      );
    });
  }

  /* ------------------------------------------------------------------ */
  /*  3. SCROLL-TRIGGERED PARALLAX EN PILARES (faith-pillars + futbol)   */
  /*     Anima los íconos (no tocados por anime.js) con scale + rotate  */
  /* ------------------------------------------------------------------ */
  function setupPillarParallax() {
    // Pilares de fe (index.html) — animar íconos
    var faithPillars = document.querySelector('.faith-pillars');
    if (faithPillars) {
      var icons = faithPillars.querySelectorAll('.pillar__icon');
      if (icons.length) {
        gsap.fromTo(
          icons,
          { scale: 0.6, rotate: -8 },
          {
            scale: 1,
            rotate: 0,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: faithPillars.closest('.section'),
              start: 'top 70%',
              toggleActions: 'play none none reset',
            },
          }
        );
      }
    }

    // Pilares de fútbol (futbol.html) — animar íconos
    var futbolPillars = document.querySelector('.futbol-pillars');
    if (futbolPillars) {
      var fIcons = futbolPillars.querySelectorAll('.futbol-pillar__icon');
      if (fIcons.length) {
        gsap.fromTo(
          fIcons,
          { scale: 0.6, rotate: -8 },
          {
            scale: 1,
            rotate: 0,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: futbolPillars.closest('.section'),
              start: 'top 70%',
              toggleActions: 'play none none reset',
            },
          }
        );
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  4. SIGNATURE BAND REVEAL (scaleX en todas las páginas)             */
  /* ------------------------------------------------------------------ */
  function setupSignatureBandReveal() {
    var bands = document.querySelectorAll('.signature-band');
    if (!bands.length) return;

    bands.forEach(function (band) {
      gsap.fromTo(
        band,
        { scaleX: 0, transformOrigin: 'left center' },
        {
          scaleX: 1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: band,
            start: 'top 90%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });
  }

  /* ------------------------------------------------------------------ */
  /*  5. HERO PARALLAX + BLUR REVEAL                                    */
  /* ------------------------------------------------------------------ */
  function setupHeroParallaxBlur() {
    var images = document.querySelectorAll('.hero__bg img');
    if (!images.length) return;

    images.forEach(function (img) {
      var hero = img.closest('.hero');
      if (!hero) return;

      gsap.fromTo(
        img,
        { scale: 1.15, filter: 'blur(8px)' },
        {
          scale: 1,
          filter: 'blur(0px)',
          duration: 2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: 'bottom top',
            scrub: 1,
          },
        }
      );
    });
  }

  /* ------------------------------------------------------------------ */
  /*  6. TRANSICIONES ENTRE SECCIONES (section transition)               */
  /* ------------------------------------------------------------------ */
  function setupSectionTransitions() {
    var sections = document.querySelectorAll('.section');
    if (!sections.length) return;

    sections.forEach(function (section) {
      // Saltar secciones muy pequeñas
      if (section.offsetHeight < 200) return;

      // Saltar hero sections (tienen su propio parallax)
      if (section.classList.contains('hero')) return;

      // Saltar farewell (tiene su propia animación en main.js)
      if (section.classList.contains('farewell')) return;

      // Saltar secciones que ya tienen data-reveal (animadas por anime.js)
      if (section.querySelector('[data-reveal]')) return;

      // Overlay dinámico: color de fondo según la sección
      var isDarker = section.classList.contains('bg-darker');
      var overlayColor = isDarker ? '#0a0a0a' : '#141414';

      // Crear overlay de transición
      var overlay = document.createElement('div');
      overlay.style.cssText =
        'position: absolute; inset: 0; z-index: 1; ' +
        'pointer-events: none; background: ' +
        overlayColor +
        '; transform-origin: right center;';
      section.style.position = 'relative';
      section.prepend(overlay);

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 85%',
          end: 'top 30%',
          toggleActions: 'play none none reverse',
        },
      });

      // Overlay se retira de derecha a izquierda (efecto cortina)
      tl.fromTo(
        overlay,
        { scaleX: 1 },
        { scaleX: 0, duration: 0.8, ease: 'power3.inOut' }
      );

      // Contenido aparece con fade + slideUp
      var content = Array.from(section.children).filter(function (el) {
        return (
          el !== overlay &&
          !el.classList.contains('hero__bg') &&
          !el.classList.contains('farewell__bg')
        );
      });

      if (content.length) {
        tl.fromTo(
          content,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.08 },
          '-=0.4'
        );
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  7. SERVICE CARDS — clip-path reveal en los íconos (index.html)    */
  /*      Anime.js ya anima el wrapper .service-card, GSAP añade       */
  /*      clip-path en el icono para un efecto de profundidad extra     */
  /* ------------------------------------------------------------------ */
  function setupServiceCardIconReveal() {
    var icons = document.querySelectorAll('.service-card__icon');
    if (!icons.length) return;

    icons.forEach(function (icon) {
      gsap.fromTo(
        icon,
        { clipPath: 'inset(0 0 0 100%)' },
        {
          clipPath: 'inset(0 0 0 0%)',
          duration: 1.2,
          delay: 0.3, // espera a que anime.js haga visible el card
          ease: 'power3.out',
          scrollTrigger: {
            trigger: icon,
            start: 'top 80%',
            toggleActions: 'play none none reset',
          },
        }
      );
    });
  }

  /* ------------------------------------------------------------------ */
  /*  8. METHOD STEPS — scale + 3D rotation en íconos (fitness.html)    */
  /*      Anime.js anima el wrapper .method-step, GSAP añade rotación   */
  /* ------------------------------------------------------------------ */
  function setupMethodStepIcons() {
    var icons = document.querySelectorAll('.method-step__icon');
    if (!icons.length) return;

    gsap.fromTo(
      icons,
      { scale: 0.4, rotationY: 90 },
      {
        scale: 1,
        rotationY: 0,
        stagger: 0.25,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: icons[0].closest('.method-steps'),
          start: 'top 75%',
          toggleActions: 'play none none reset',
        },
      }
    );
  }

  /* ------------------------------------------------------------------ */
  /*  9. AUDIENCE FÚTBOL — clip-path reveal en las barras (futbol.html) */
  /* ------------------------------------------------------------------ */
  function setupAudienceBarReveal() {
    var bars = document.querySelectorAll('.audience-futbol__bar');
    if (!bars.length) return;

    gsap.fromTo(
      bars,
      { scaleX: 0, transformOrigin: 'left center' },
      {
        scaleX: 1,
        stagger: 0.3,
        duration: 1.2,
        ease: 'power4.out',
        scrollTrigger: {
          trigger: bars[0].closest('.audience-futbol'),
          start: 'top 75%',
          toggleActions: 'play none none reset',
        },
      }
    );
  }

  /* ------------------------------------------------------------------ */
  /*  10. FORMAT TIMELINE — arrows con pulse sutil (futbol.html)        */
  /*      Un solo timeline con stagger para todas las flechas           */
  /* ------------------------------------------------------------------ */
  function setupTimelineArrows() {
    var arrows = document.querySelectorAll('.format-timeline__arrow');
    var container = document.querySelector('.format-timeline');
    if (!arrows.length || !container) return;

    // Un solo tween con stagger para todas las flechas
    gsap.fromTo(
      arrows,
      { x: -6, opacity: 0.4 },
      {
        x: 6,
        opacity: 1,
        duration: 1.2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        stagger: 0.15,
        scrollTrigger: {
          trigger: container,
          start: 'top 85%',
          toggleActions: 'play none none pause',
        },
      }
    );
  }

  /* ------------------------------------------------------------------ */
  /*  REFRESCAR SCROLLTRIGGER AL CARGAR (por si hay imágenes lazy)      */
  /* ------------------------------------------------------------------ */
  function refreshOnLoad() {
    window.addEventListener('load', function () {
      ScrollTrigger.refresh();
    });
    // Refrescar también tras un breve delay para cubrir lazy loading
    setTimeout(function () {
      ScrollTrigger.refresh();
    }, 1000);
  }

  /* ------------------------------------------------------------------ */
  /*  INICIALIZAR TODO                                                    */
  /* ------------------------------------------------------------------ */
  function init() {
    var lenis = initLenis();

    // Dar tiempo a que el layout se estabilice
    requestAnimationFrame(function () {
      setupEvidenceParallax();
      setupPillarParallax();
      setupSignatureBandReveal();
      setupHeroParallaxBlur();
      setupSectionTransitions();
      setupServiceCardIconReveal();
      setupMethodStepIcons();
      setupAudienceBarReveal();
      setupTimelineArrows();
      refreshOnLoad();

      // Forzar un refresh inicial de ScrollTrigger
      ScrollTrigger.refresh();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
