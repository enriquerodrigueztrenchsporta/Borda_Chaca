# Vídeo de portada

Montaje de 26 s en bucle con clips de stock profesionales de [Mixkit](https://mixkit.co) (licencia gratuita de Mixkit, uso comercial permitido): la cordillera, una vaca en el prado, las brasas, el chuletón en la parrilla, una llamarada, el vino y el corte de la carne.

```bash
npm install
npm run descargar   # baja los clips (720p)
npm run montar      # genera ../../assets/video/borda-chaca.mp4
npx ffmpeg -i ../../assets/video/borda-chaca.mp4 -c:v libvpx-vp9 -b:v 0 -crf 38 -an ../../assets/video/borda-chaca.webm
```

Para usar vídeo propio del restaurante, sustituye el archivo y los tiempos del plano correspondiente en `clips`, dentro de `montaje.js`.
