// Vídeo de portada de Borda Chaca: montaje con clips de stock profesionales (Mixkit, licencia gratuita).
const {spawnSync}=require('child_process');
const FF=process.env.FFMPEG||require('ffmpeg-static');
const W=1600,H=900,FPS=25,X=0.6; // fundido corto entre planos
const up=`scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H},unsharp=5:5:0.45:5:5:0`;
const shot=(file,a,b,extra='')=>({file,a,b,d:b-a,extra});
const clips=[
  shot('h4366.mp4', 1, 5.5),                 // cordillera con nubes
  shot('h10219.mp4', 3, 6.5),                // vaca pastando en la niebla
  shot('h6969.mp4', 2, 5.5),                 // brasas y llamas
  shot('h45723.mp4', 10.5, 14.5),            // chuletón sellado en la parrilla
  shot('h46660.mp4', 2.5, 6.5),              // llamarada sobre la carne
  shot('h22734.mp4', 4, 7.5),                // vino tinto
  shot('h45718.mp4', 0.5, 4),                // corte del chuletón
  shot('h25027.mp4', 2, 5.5),                // brasas de chimenea
  shot('h4366.mp4', 1-X, 1),                 // cabeza del primer plano → bucle perfecto
];
const args=['-y','-loglevel','error'];clips.forEach(c=>args.push('-i',c.file));
let fc=clips.map((c,i)=>`[${i}:v]trim=${Math.max(0,c.a)}:${c.b},setpts=PTS-STARTPTS,fps=${FPS},${up}${c.extra},format=yuv420p,setsar=1[v${i}]`).join(';');
let prev='v0',t=clips[0].d;
for(let i=1;i<clips.length;i++){fc+=`;[${prev}][v${i}]xfade=transition=fade:duration=${X}:offset=${(t-X).toFixed(3)}[x${i}]`;prev=`x${i}`;t+=clips[i].d-X;}
// etalonado común: negros profundos, cálidos en medios y altas, grano fino
fc+=`;[${prev}]eq=contrast=1.06:saturation=0.95:gamma=0.98,colorbalance=rm=0.03:bm=-0.02:rh=0.03:bh=-0.03,noise=alls=3:allf=t,format=yuv420p[out]`;
const out=process.argv[2]||'../../assets/video/borda-chaca.mp4';
args.push('-filter_complex',fc,'-map','[out]','-t',t.toFixed(3),'-r',`${FPS}`,'-c:v','libx264','-preset','slow','-crf','27','-pix_fmt','yuv420p','-movflags','+faststart','-an',out);
console.log('duración',t.toFixed(2),'s');
const r=spawnSync(FF,args,{stdio:'inherit'});process.exit(r.status);
