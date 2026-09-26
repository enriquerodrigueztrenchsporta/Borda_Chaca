# Borda Chaca · Restaurante Asador

Web del **Restaurante Asador Borda Chaca**, en Ulle (a 5 minutos de Jaca, Pirineo Aragonés).
Carnes a la brasa, cocina aragonesa y vasca en una borda de piedra a los pies de la Peña Oroel. Solete Guía Repsol.

Sitio estático (HTML + CSS + JS, sin dependencias ni compilación): se puede publicar tal cual en GitHub Pages, Netlify, o cualquier hosting.

## Estructura

```
index.html              Página principal (todas las secciones)
aviso-legal.html        Aviso legal y política de cookies
privacidad.html         Política de privacidad
assets/css/styles.css   Sistema de diseño y estilos
assets/js/main.js       Vídeo, menú, pestañas de menús, horario en vivo, galería, mapa
assets/img/             Fotografías optimizadas en WebP + favicon
assets/video/           Vídeo ilustrado de portada (WebM + MP4) y póster
tools/hero-video/       Generador del vídeo de portada
```

## Secciones

Portada con vídeo · La Borda · Valores · Cocina · Menús (Aragonés 25 €, Oroel 40 €, Niños 12 €) y raciones ·
Galería · Comedores y celebraciones · Solete Repsol y prensa · Cómo llegar (mapa bajo demanda) · Horario y reservas.

El horario marca el día actual y si el restaurante está abierto, según la hora de Madrid.

## Vídeo de portada

Es una ilustración animada generada por código (la borda de piedra al anochecer bajo la Peña Oroel, con humo en la
chimenea, la brasa encendida, guirnaldas de luces y luciérnagas). Es un bucle perfecto de 16 s.

```bash
cd tools/hero-video
npm install
npm run preview   # un fotograma de prueba
npm run render    # regenera assets/video/*
```

## Probar en local

```bash
npx serve .       # o: python -m http.server
```

## Editar contenido

- Precios y platos: `index.html`, sección `#menus`.
- Horario: tabla en `#contacto` y el objeto `HOURS` en `assets/js/main.js`.
- Teléfono: buscar `664 196 232` / `+34664196232`.

Créditos de las fotografías de terceros (Wikimedia Commons) en el pie de la web.
