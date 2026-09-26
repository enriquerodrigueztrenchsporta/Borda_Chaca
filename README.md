# Borda Chaca · Restaurante Asador

Web del **Restaurante Asador Borda Chaca**, en Ulle (a 5 minutos de Jaca, Pirineo Aragonés).
Carnes a la brasa, cocina aragonesa y vasca en una borda de piedra a los pies de la Peña Oroel. Solete Guía Repsol.

Sitio estático (HTML + CSS + JS, sin dependencias ni compilación): se puede publicar tal cual en GitHub Pages, Netlify, o cualquier hosting.

## Estructura

```
index.html              Portada: vídeo y accesos a cada sección
la-borda.html           La casa, comedores y galería
menus.html              Menú Aragonés, Oroel, Niños y raciones
celebraciones.html      Grupos y eventos
solete.html             Solete Guía Repsol y prensa
como-llegar.html        Mapa y rutas desde Jaca y Huesca
contacto.html           Teléfono, email y horario
aviso-legal.html        Aviso legal y política de cookies
privacidad.html         Política de privacidad
assets/css/styles.css   Estilos
assets/js/main.js       Vídeo, menú móvil, horario en vivo, galería
assets/img/             Fotografías (WebP), fondo topográfico y favicon
assets/video/           Vídeo ilustrado de portada (WebM + MP4) y póster
tools/hero-video/       Generador del vídeo de portada
```

La cabecera y el pie se repiten en cada página: si se cambia el menú o el teléfono, hay que cambiarlo en todos los .html.

## Vídeo de portada

Montaje de 26 s en bucle con clips de stock profesionales de Mixkit (licencia gratuita, uso comercial permitido): cordillera, prado, brasas, chuletón en la parrilla, llamarada, vino y corte de la carne. Instrucciones en `tools/hero-video/LEEME.md`.

## Probar en local

```bash
npx serve .       # o: python -m http.server
```

## Editar contenido

- Precios y platos: `menus.html`.
- Horario: tabla de `contacto.html` y el objeto `HOURS` en `assets/js/main.js`.
- Teléfono: buscar `664 196 232` / `+34664196232` en todos los .html.

Créditos de las fotografías de terceros (Wikimedia Commons) en el pie de la web.
