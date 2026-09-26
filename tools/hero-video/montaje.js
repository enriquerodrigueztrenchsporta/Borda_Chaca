const {spawnSync}=require('child_process');
const FF=require('ffmpeg-static');
const W=1600,H=900,FPS=30,X=1; // crossfade seconds
const cover=`scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H}`;
// [input args, filter for this clip, duration]
const clips=[
  {in:['-i','ordesa2.src'], f:`trim=6:11,setpts=PTS-STARTPTS,fps=${FPS},${cover}`, d:5},
  {in:['-loop','1','-framerate',`${FPS}`,'-t','4.5','-i','terraza-borda.jpg'], f:`crop=iw:iw*9/16:0:ih*0.08,scale=4800:2700,zoompan=z='1.0+0.00075*on':x='iw/2-(iw/zoom/2)':y='ih*0.55-(ih/zoom/2)':d=1:s=${W}x${H}:fps=${FPS},trim=duration=4.5`, d:4.5},
  {in:['-i','campfire.src'], f:`trim=7.5:12.5,setpts=PTS-STARTPTS,fps=${FPS},crop=iw*0.62:ih*0.62:iw*0.19:ih*0.12,${cover}`, d:5},
  {in:['-i','galeto.src'], f:`trim=0.5:5.5,setpts=PTS-STARTPTS,fps=${FPS},crop=iw*0.85:ih*0.85:iw*0.075:ih*0.1,${cover}`, d:5},
  {in:['-loop','1','-framerate',`${FPS}`,'-t','4.5','-i','oroel-hi.jpg'], f:`crop=iw*0.8:iw*0.8*9/16:iw*0.12:ih*0.1,scale=4800:2700,zoompan=z='1.0+0.0006*on':x='iw*0.42-(iw/zoom/2)':y='ih*0.4-(ih/zoom/2)':d=1:s=${W}x${H}:fps=${FPS},trim=duration=4.5`, d:4.5},
  {in:['-i','ordesa3.src'], f:`trim=7:12.5,setpts=PTS-STARTPTS,fps=${FPS},${cover}`, d:5.5},
  {in:['-i','ordesa2.src'], f:`trim=5:6,setpts=PTS-STARTPTS,fps=${FPS},${cover}`, d:1}, // cabeza del plano 1 → bucle perfecto
];
const args=['-y','-loglevel','error'];clips.forEach(c=>args.push(...c.in));
let fc=clips.map((c,i)=>`[${i}:v]${c.f},format=yuv420p,setsar=1,setpts=PTS-STARTPTS[v${i}]`).join(';');
let prev='v0',t=clips[0].d;
for(let i=1;i<clips.length;i++){const off=(t-X).toFixed(3);const out=`x${i}`;fc+=`;[${prev}][v${i}]xfade=transition=fade:duration=${X}:offset=${off}[${out}]`;prev=out;t=t+clips[i].d-X;}
// etalonado común: contraste suave, cálidos en altas, viñeta y grano de película
fc+=`;[${prev}]eq=contrast=1.07:saturation=0.9:gamma=0.97,colorbalance=rs=0.02:bs=-0.03:rm=0.03:bm=-0.02:rh=0.04:bh=-0.05,vignette=PI/7,noise=alls=5:allf=t,format=yuv420p[out]`;
console.log('duración',t.toFixed(2),'s');
const out=process.argv[2]||'../../assets/video/borda-chaca.mp4';
args.push('-filter_complex',fc,'-map','[out]','-t',t.toFixed(3),'-r',`${FPS}`,'-c:v','libx264','-preset','slow','-crf','28','-profile:v','high','-pix_fmt','yuv420p','-movflags','+faststart','-an',out);
const r=spawnSync(FF,args,{stdio:'inherit'});console.log('exit',r.status);
