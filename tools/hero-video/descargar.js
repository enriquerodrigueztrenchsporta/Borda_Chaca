// Descarga los clips de Mixkit (licencia gratuita de Mixkit) usados en el vídeo de portada.
const https=require('https'),fs=require('fs');
const ids=[4366,10219,6969,45723,46660,22734,45718,25027];
const get=(u,f)=>new Promise((res,rej)=>https.get(u,r=>{const w=fs.createWriteStream(f);r.pipe(w);w.on('finish',res)}).on('error',rej));
(async()=>{for(const id of ids){await get(`https://assets.mixkit.co/videos/${id}/${id}-720.mp4`,`h${id}.mp4`);console.log('✓',id)}})();
