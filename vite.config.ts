import { defineConfig } from 'vite';
import { resolve } from 'path';

// Configuración multi-página: sitio estático HTML/CSS/JS vanilla.
// Cada HTML se sirve como página independiente desde la raíz del proyecto.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        fitness: resolve(__dirname, 'fitness.html'),
        futbol: resolve(__dirname, 'futbol.html'),
        campus: resolve(__dirname, 'campus.html'),
        precios: resolve(__dirname, 'precios.html'),
        contacto: resolve(__dirname, 'contacto.html'),
        login: resolve(__dirname, 'login.html'),
        registro: resolve(__dirname, 'registro.html'),
        perfil: resolve(__dirname, 'perfil.html'),
      },
    },
  },
});
