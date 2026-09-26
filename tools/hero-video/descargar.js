const https=require('https'),fs=require('fs');
const files={ordesa1:'Valle de Ordesa, Parque Nacional de Ordesa y Monte Perdido.webm',ordesa2:'Valle de Ordesa, Parque Nacional de Ordesa y Monte Perdido 2.webm',ordesa3:'Valle de Ordesa, Parque Nacional de Ordesa y Monte Perdido 3.webm',anisclo:'Cañón de Añisclo, Parque Nacional de Ordesa y Monte Perdido.webm',fire4k:'Fireplace 1 2021-02-14.webm',akita:'Fireplace in Akita City Akarenga-kan Museum 2024 march 28.ogg',campfire:'Campfire at night - Claytor Lake State Park - video.webm',espeto:'Asado al espeto en Argentina.ogg',galeto:'Galeto of Agentina.ogg'};
const UA={'User-Agent':'BordaChacaSite/1.0 (kiketrenchs@gmail.com)'};
const get=(u)=>new Promise((res,rej)=>https.get(u,{headers:UA},r=>{if(r.statusCode>=300&&r.statusCode<400)return get(new URL(r.headers.location,u).href).then(res,rej);let d=[];r.on('data',c=>d.push(c));r.on('end',()=>res({status:r.statusCode,body:Buffer.concat(d)}))}).on('error',rej));
(async()=>{for(const [k,t] of Object.entries(files)){
const api='https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=videoinfo|imageinfo&viprop=derivatives|url&iiprop=url|extmetadata&iiextmetadatafilter=LicenseShortName|Artist&titles='+encodeURIComponent('File:'+t);
const j=JSON.parse((await get(api)).body);const p=Object.values(j.query.pages)[0];const vi=p.videoinfo?.[0];const ii=p.imageinfo?.[0];
let url=vi?.url||ii?.url;const der=(vi?.derivatives||[]);const pick=der.find(d=>/1080p\.vp9\.webm$/.test(d.src))||der.find(d=>/720p\.vp9\.webm$/.test(d.src));
if(pick&&(/4K|2160|Fireplace 1|Akita|\.ogg$/.test(t)))url=pick.src;
const m=ii?.extmetadata||{};const r=await get(url);fs.writeFileSync(k+'.src',r.body);
console.log(k,r.status,(r.body.length/1e6).toFixed(1)+'MB','|',m.LicenseShortName?.value,'|',(m.Artist?.value||'').replace(/<[^>]+>/g,'').trim().slice(0,50),'|',url.split('/').pop().slice(0,60))}})();
