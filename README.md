# Poder Jota ⚡

**Fitness y fútbol particular con principios cristianos en Lima, Perú.**

Sitio web multi-página de **Poder Jota**, un emprendimiento peruano fundado en la fe en Cristo Jesús que ofrece asesoramiento fitness y entrenamiento de fútbol particular para hombres (adolescentes y adultos). Exclusivo para hombres.

## 🌐 Páginas

| Ruta | Descripción |
|------|-------------|
| `/` | **Inicio** — Presentación, pilares de fe, servicios, stats, testimonios |
| `/fitness.html` | **Asesoramiento Fitness** — Metodología, beneficios, evidencia real |
| `/futbol.html` | **Fútbol Particular** — Público objetivo, pilares metodológicos, formato |
| `/campus.html` | **Campus Poder Jota** — Cursos digitales de fitness (próximamente) |
| `/precios.html` | **Planes y precios** — Planes de fitness, fútbol y campus |
| `/contacto.html` | **Contacto** — Formulario + tarjetas de contacto, WhatsApp |

## 🛠️ Tecnologías

| Tecnología | Uso |
|------------|-----|
| **HTML5** | Estructura semántica multi-página |
| **CSS3** | Sistema de diseño con custom properties, grid, flexbox, responsive |
| **JavaScript (Vanilla)** | Animaciones, contadores, slider, formulario, menú mobile |
| **[Vite](https://vitejs.dev)** | Servidor de desarrollo local y build |
| **[GSAP](https://gsap.com) + [ScrollTrigger](https://gsap.com/scrolltrigger)** | Animaciones avanzadas al hacer scroll (parallax, clip-path, reveals) |
| **[Lenis](https://lenis.darkroom.engineering)** | Smooth scrolling |
| **[Anime.js](https://animejs.com)** | Animaciones de entrada (fadeIn, slideUp), contadores, slider de texto |
| **[Phosphor Icons](https://phosphoricons.com)** | Biblioteca de iconos profesional (6 pesos: duotone, fill, bold, regular) |
| **[Google Fonts](https://fonts.google.com)** | Anton (display) + Manrope (body) |

## 🚀 Cómo ejecutar localmente

### Requisitos

- [Node.js](https://nodejs.org) v18 o superior

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/poder-jota.git
cd poder-jota

# 2. Instalar dependencias (solo Vite)
npm install

# 3. Iniciar servidor de desarrollo
npm run dev
```

Esto inicia Vite en `http://localhost:5173`. Abre esa URL en tu navegador.

### Build para producción

```bash
npm run build
```

Los archivos estáticos se generan en la carpeta `dist/`.

## 📁 Estructura del proyecto

```
poder-jota/
├── index.html              # Página de inicio
├── fitness.html            # Asesoramiento Fitness
├── futbol.html             # Fútbol Particular
├── campus.html             # Campus Digital
├── precios.html            # Planes y precios
├── contacto.html           # Contacto
├── css/
│   ├── styles.css          # Sistema de diseño global
│   └── animaciones.css     # Animaciones base
├── js/
│   ├── main.js             # Lógica principal (navbar, scroll, contadores, slider)
│   ├── contacto.js         # Formulario de contacto + validación
│   └── animations-gsap.js  # Animaciones GSAP/ScrollTrigger/Lenis
├── pl/                     # Planes de corrección
├── .gitignore
├── package.json
├── vite.config.ts
└── README.md
```

## 🎨 Identidad visual

- **Paleta:** Rojo bandera (`#C8102E`), amarillo oro (`#FFC72C`), verde cancha (`#1B5E20`), lima voltio (`#C6FF3D`), carbon andino (`#15201E`), crema andina (`#F3EDE1`)
- **Tipografía:** Anton para títulos display, Manrope para cuerpo de texto
- **Iconos:** Phosphor Icons con pesos variables según contexto (duotone en pilares, fill en stats, bold en timeline, regular en features)

## ✨ Características principales

- **Smooth scroll** con Lenis para navegación fluida
- **Animaciones progressivas** al scrollear con GSAP ScrollTrigger
- **Contadores animados** con Anime.js
- **Slider de versículos bíblicos** con transiciones automáticas
- **Formulario de contacto** con validación y envío a WhatsApp
- **Diseño 100% responsive** (mobile, tablet, desktop)
- **Modo oscuro** nativo con paleta de altos contrastes
- **Accesibilidad:** roles ARIA, focus-visible, etiquetas semánticas

## 📄 Licencia

© Poder Jota · Hecho en Perú con disciplina, fe y movimiento.
