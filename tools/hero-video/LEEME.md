# Vídeo de portada

Montaje de metraje real con licencia libre (Wikimedia Commons) y fotos del restaurante.

1. `npm install`
2. Copia aquí `terraza-borda.jpg` (foto de la terraza) y `oroel-hi.jpg` (Monte Oroel, Wikimedia Commons).
3. `npm run descargar`: baja los vídeos de Commons.
4. `npm run montar`: genera `assets/video/borda-chaca.mp4`.

Para la versión WebM y el póster:

```bash
npx ffmpeg -i ../../assets/video/borda-chaca.mp4 -c:v libvpx-vp9 -b:v 0 -crf 40 -an ../../assets/video/borda-chaca.webm
```

Para sustituir un plano por vídeo propio del restaurante, cambia la entrada correspondiente en `clips` de `montaje.js`.
