/* MEP — progressive interactive catalogue, refined navigation and lightweight offline 3D globe. */
(() => {
  'use strict';
  const fa = document.documentElement.lang.toLowerCase().startsWith('fa');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const form = document.getElementById('inquiry-form');
  const product = document.getElementById('i-product');
  const sizeInput = document.getElementById('i-size');
  const pickedText = document.getElementById('spec-selection');
  let highlightTimeout = null;
  const canFocus = (elem) => elem && typeof elem.focus === 'function';
  function chooseSize(productName, dimensions, navigate) {
    if (!form || !product || !sizeInput) return;
    const match = [...product.options].find(o => o.value === productName);
    if (match) product.value = match.value;
    sizeInput.value = dimensions;
    product.dispatchEvent(new Event('change',{bubbles:true}));
    sizeInput.dispatchEvent(new Event('input',{bubbles:true}));
    if (pickedText) {
      pickedText.classList.add('has-selection');
      pickedText.textContent = (fa ? '✓ آماده استعلام: ' : '✓ Quote selection: ') + productName + ' — ' + dimensions;
    }
    document.querySelectorAll('button.spec-action').forEach(b => {
      const selected = b.dataset.product === productName && b.dataset.size === dimensions;
      b.classList.toggle('is-chosen', selected);
      b.setAttribute('aria-pressed', String(selected));
    });
    form.classList.remove('spec-received');
    void form.offsetWidth;
    form.classList.add('spec-received');
    if (highlightTimeout) clearTimeout(highlightTimeout);
    highlightTimeout = setTimeout(() => form.classList.remove('spec-received'), 1150);
    const section=document.getElementById('inquiry');
    if (navigate && section) {
      const distance = Math.abs(section.getBoundingClientRect().top);
      // Long scroll flights are disorienting: jump directly to the prefilled form.
      // Nearby selections still get the normal smooth, interruptible native scroll.
      section.scrollIntoView({behavior:(reduce.matches || distance > 1000)?'instant':'smooth',block:'start'});
      // Move keyboard focus to the next step without causing a second unexpected scroll.
      const quantity = document.getElementById('i-quantity');
      if (canFocus(quantity)) quantity.focus({preventScroll:true});
    }
  }
  document.addEventListener('click',e => {
    const chip=e.target.closest('button.spec-action');
    if(!chip) return;
    e.preventDefault();
    chooseSize(chip.dataset.product,chip.dataset.size,true);
  });
  if (form) {
    const params = new URLSearchParams(window.location.search);
    if (params.has('product') && params.has('size')) {
      chooseSize(params.get('product'),params.get('size'),false);
      // Direct links carry data across files, scroll to the prefilled form on arrival.
      if (window.location.hash !== '#inquiry') history.replaceState(null,'','#inquiry');
      requestAnimationFrame(() => document.getElementById('inquiry')?.scrollIntoView({behavior:'instant'}));
    }
  }

  const globe = document.querySelector('.global-art-interactive');
  if (!globe) return;
  const canvas = globe.querySelector('.world-canvas');
  const frame = globe.querySelector('.globe-interactive-frame');
  const pauseBtn = globe.querySelector('#globe-motion-toggle');
  const readout = globe.querySelector('.globe-degree');
  if (!canvas || !frame || !pauseBtn) return;
  const ctx=canvas.getContext('2d',{alpha:true});
  if (!ctx) return;

  // Coarse original continent outlines, packaged in the site itself. No network or map API.
  // Coordinates represent land for a stylized globe, not trade-route destinations.
  const LAND = [
    // North America
    [[-167,66],[-157,71],[-150,70],[-145,65],[-138,60],[-130,56],[-125,49],[-123,42],[-118,33],[-112,31],[-109,26],[-105,22],[-98,16],[-92,15],[-88,18],[-86,21],[-83,25],[-82,29],[-80,33],[-76,36],[-72,43],[-66,46],[-60,52],[-55,53],[-55,59],[-62,62],[-66,59],[-73,59],[-79,62],[-84,63],[-88,69],[-96,72],[-109,72],[-123,72],[-136,70],[-148,73],[-161,70]],
    [[-94,21],[-91,19],[-88,16],[-84,11],[-82,8],[-79,9],[-78,11],[-83,16],[-87,19]],
    [[-81,9],[-78,9],[-77,7],[-75,8],[-73,11],[-79,12]],
    // Greenland
    [[-53,60],[-44,60],[-40,65],[-39,72],[-42,80],[-47,84],[-54,82],[-59,77],[-60,70]],
    // South America
    [[-80,11],[-75,11],[-71,12],[-67,11],[-63,10],[-60,8],[-53,4],[-50,1],[-48,-1],[-44,-2],[-38,-7],[-35,-11],[-38,-17],[-39,-23],[-44,-24],[-48,-29],[-50,-34],[-54,-39],[-59,-43],[-62,-48],[-67,-55],[-71,-52],[-73,-45],[-74,-37],[-71,-30],[-70,-22],[-72,-17],[-75,-13],[-77,-6],[-80,2]],
    // Europe + Asia mainland
    [[-11,35],[-9,42],[-7,44],[-10,48],[-6,53],[1,51],[6,54],[10,57],[16,58],[20,61],[24,66],[29,69],[30,71],[38,69],[46,69],[55,72],[64,73],[70,74],[78,73],[87,75],[98,76],[108,73],[118,72],[132,72],[142,65],[153,61],[163,60],[174,63],[178,55],[167,52],[155,51],[144,48],[138,43],[132,42],[127,37],[124,35],[121,30],[120,23],[117,21],[112,19],[109,16],[108,12],[105,11],[104,17],[99,22],[96,19],[91,22],[88,22],[82,17],[78,8],[75,8],[72,17],[69,23],[65,26],[62,25],[58,24],[57,20],[52,17],[49,12],[45,13],[44,19],[46,25],[50,30],[49,37],[43,42],[37,41],[33,37],[29,36],[25,40],[20,40],[17,38],[13,42],[11,45],[7,44],[1,43],[-3,37]],
    // Arabian Peninsula
    [[35,30],[41,30],[48,29],[54,25],[56,21],[52,17],[49,13],[44,12],[42,17],[39,19],[37,24]],
    // Africa
    [[-17,35],[-9,36],[-5,36],[2,37],[11,37],[12,33],[19,31],[26,32],[32,31],[34,28],[35,22],[43,13],[51,12],[49,2],[44,-2],[40,-11],[36,-17],[34,-23],[32,-26],[29,-30],[25,-34],[19,-35],[16,-30],[13,-26],[11,-17],[8,-9],[6,-1],[2,5],[-5,5],[-10,11],[-16,17],[-17,24]],
    // Madagascar, Arabian sea islands
    [[48,-13],[50,-15],[50,-23],[47,-26],[44,-24],[45,-18]],
    // India and southeast Asian peninsulas
    [[69,23],[72,22],[74,18],[77,12],[79,8],[80,12],[85,20],[89,22],[92,23],[94,18],[97,17],[99,12],[100,7],[103,3],[104,-1],[101,0],[99,5],[96,10],[95,16],[90,21],[85,26],[80,26],[75,27]],
    // Japan / Philippines / Borneo
    [[130,31],[134,35],[138,38],[141,43],[145,44],[144,40],[141,36],[138,33],[134,31]],
    [[120,18],[123,14],[124,9],[122,6],[120,10]],
    [[109,7],[116,7],[118,3],[115,-3],[110,-1]],
    // Australia
    [[113,-12],[120,-13],[126,-11],[132,-12],[137,-15],[141,-17],[145,-16],[152,-24],[152,-29],[147,-36],[138,-39],[131,-36],[124,-34],[117,-34],[113,-28],[112,-20]],
    [[147,-41],[149,-42],[147,-44],[145,-43]],
    // New Zealand
    [[172,-35],[175,-40],[174,-42],[171,-42]],[[169,-44],[171,-46],[169,-47],[167,-46]],
    // Indonesia islands
    [[95,5],[100,3],[105,-4],[107,-6],[103,-6],[98,-2]],[[108,-7],[115,-8],[119,-9],[116,-10],[110,-9]],[[119,-2],[124,-2],[126,-6],[123,-8]],
    // British Isles
    [[-10,51],[-6,54],[-7,58],[-3,59],[-2,55],[-5,51]],
    // Sri Lanka
    [[81,9],[81,7],[79,6],[80,8]]
  ];
  const ROUTES=[
    [41.0,28.9],[55.2,25.2],[77.2,28.6],[103.8,1.3],[116.4,39.9],
    [31.2,30.0],[37.6,55.7],[13.4,52.5],[36.8,-1.3],[28.1,-26.2]
  ]; // Illustrative points only; do not infer operational export routes.
  const iran=[51.42,35.68];
  const rad=Math.PI/180;
  let lon=27,lat=20,paused=reduce.matches,visible=false,dragging=false,oldX=0,oldY=0,lastFrame=0,raf=0,rectSize=0,dpr=1;
  let clock=0;
  const geo=(longitude,latitude,radius,heading,pitch)=>{
    const delta=(longitude-heading)*rad,lt=latitude*rad,tilt=pitch*rad;
    const cos=Math.cos(lt),sin=Math.sin(lt);
    return {x:radius*cos*Math.sin(delta),y:-radius*(sin*Math.cos(tilt)-cos*Math.cos(delta)*Math.sin(tilt)),z:sin*Math.sin(tilt)+cos*Math.cos(tilt)*Math.cos(delta)};
  };
  function sphereProject(lon2,lat2,R){return geo(lon2,lat2,R,lon,lat);}
  function drawProjectedLines(coords,R,step,col,width){
    ctx.strokeStyle=col;ctx.lineWidth=width;ctx.beginPath();let drawing=false;
    for(let i=0;i<coords.length;i+=step){
      const p=sphereProject(coords[i][0],coords[i][1],R);
      if(p.z<=.008){drawing=false;continue;}
      if(!drawing){ctx.moveTo(p.x,p.y);drawing=true;}else ctx.lineTo(p.x,p.y);
    }ctx.stroke();
  }
  function landPoly(poly,R){
    // Orthographic horizon clipping approximated by linear crossing interpolation.
    const pts=poly.map(c=>sphereProject(c[0],c[1],R)),parts=[];
    for(let i=0;i<pts.length;i++){
      const a=pts[i],b=pts[(i+1)%pts.length];
      if(a.z>=0)parts.push(a);
      if((a.z>=0)!=(b.z>=0)){
        let lo=0,hi=1,now;
        for(let iter=0;iter<13;iter++){
          const t=(lo+hi)/2;
          const aa=poly[i],bb=poly[(i+1)%poly.length];
          let diff=bb[0]-aa[0];if(diff>180)diff-=360;if(diff< -180)diff+=360;
          now=sphereProject(aa[0]+diff*t,aa[1]+(bb[1]-aa[1])*t,R);
          if((now.z>=0)===(a.z>=0))lo=t;else hi=t;
        }if(now)parts.push(now);
      }
    }
    if(parts.length<3)return;
    ctx.beginPath();parts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
    ctx.fillStyle='rgba(75,151,176,.48)';ctx.fill();
    ctx.strokeStyle='rgba(145,218,221,.34)';ctx.lineWidth=.9;ctx.stroke();
  }
  function interpolate(a,b,t){
    const vec=(p)=>{const l=p[0]*rad,tt=p[1]*rad;return [Math.cos(tt)*Math.cos(l),Math.cos(tt)*Math.sin(l),Math.sin(tt)]};
    const u=vec(a),v=vec(b),dot=Math.max(-1,Math.min(1,u[0]*v[0]+u[1]*v[1]+u[2]*v[2]));
    const theta=Math.acos(dot),sinTheta=Math.sin(theta)||1;
    const k1=theta<.0001?1-t:Math.sin((1-t)*theta)/sinTheta;
    const k2=theta<.0001?t:Math.sin(t*theta)/sinTheta;
    const p=u.map((x,i)=>x*k1+v[i]*k2);
    return [Math.atan2(p[1],p[0])/rad,Math.atan2(p[2],Math.hypot(p[0],p[1]))/rad];
  }
  function routePath(destination,R,idx){
    const steps=55,points=[];
    for(let i=0;i<=steps;i++){
      const t=i/steps,pos=interpolate(iran,destination,t),pr=sphereProject(pos[0],pos[1],R*(1+.13*Math.sin(Math.PI*t)));
      points.push({...pr,t});
    }
    ctx.beginPath();let started=false;
    for(const point of points){if(point.z<0){started=false;continue;}
      if(!started){ctx.moveTo(point.x,point.y);started=true;}else ctx.lineTo(point.x,point.y);
    }
    ctx.strokeStyle=idx%2===0?'rgba(250,205,130,.56)':'rgba(136,220,238,.56)';ctx.lineWidth=1.2;ctx.stroke();
    // Light traveling on the visible half of each connection.
    const t=(clock*.00011+idx*.13)%1;
    const p=points[Math.round(t*steps)];
    if(p?.z>0 && !reduce.matches){
      ctx.fillStyle='#f8d89d';ctx.shadowColor='#ffd68b';ctx.shadowBlur=12;
      ctx.beginPath();ctx.arc(p.x,p.y,2.8,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    }
    const target=sphereProject(destination[0],destination[1],R);
    if(target.z>.03){
      ctx.beginPath();ctx.arc(target.x,target.y,2.4,0,Math.PI*2);ctx.fillStyle='#a7e6f5';ctx.fill();
    }
  }
  function render(time=0){
    const W=rectSize;if(!W)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,W);ctx.save();ctx.translate(W/2,W/2);
    const R=W*.384;
    // Outer atmospheric halo.
    const halo=ctx.createRadialGradient(0,0,R*.64,0,0,R*1.21);
    halo.addColorStop(0,'rgba(45,157,211,.02)');halo.addColorStop(.72,'rgba(66,163,211,.035)');halo.addColorStop(.95,'rgba(77,169,223,.11)');halo.addColorStop(1,'rgba(55,130,193,0)');
    ctx.beginPath();ctx.arc(0,0,R*1.22,0,Math.PI*2);ctx.fillStyle=halo;ctx.fill();
    // Planet surface.
    const sphere=ctx.createRadialGradient(-R*.4,-R*.43,R*.06,0,0,R*1.15);
    sphere.addColorStop(0,'#285773');sphere.addColorStop(.48,'#0a3550');sphere.addColorStop(.83,'#09283f');sphere.addColorStop(1,'#041422');
    ctx.beginPath();ctx.arc(0,0,R,0,Math.PI*2);ctx.fillStyle=sphere;ctx.fill();
    ctx.save();ctx.beginPath();ctx.arc(0,0,R,0,Math.PI*2);ctx.clip();
    // Longitude and latitude grid follows spin.
    for(let la=-75;la<=75;la+=15){const pts=[];for(let longitude=-180;longitude<=180;longitude+=2.5)pts.push([longitude,la]);drawProjectedLines(pts,R,1,'rgba(154,212,234,.11)',.7);}
    for(let longitude=-180;longitude<180;longitude+=15){const pts=[];for(let la=-89;la<=89;la+=2)pts.push([longitude,la]);drawProjectedLines(pts,R,1,'rgba(154,212,234,.11)',.7);}
    for(const land of LAND)landPoly(land,R);
    ROUTES.forEach((dest,i)=>routePath(dest,R,i));
    const hub=sphereProject(iran[0],iran[1],R);
    if(hub.z>.02){
      const pulse=reduce.matches?8:8+3*Math.sin(time*.003);
      ctx.beginPath();ctx.arc(hub.x,hub.y,pulse,0,Math.PI*2);ctx.fillStyle='rgba(243,197,118,.15)';ctx.fill();
      ctx.beginPath();ctx.arc(hub.x,hub.y,4.2,0,Math.PI*2);ctx.shadowColor='#ffd49a';ctx.shadowBlur=13;ctx.fillStyle='#ffdda6';ctx.fill();ctx.shadowBlur=0;
    }
    const shade=ctx.createLinearGradient(-R,-R*.25,R,R*.15);
    shade.addColorStop(0,'rgba(122,208,238,.1)');shade.addColorStop(.6,'rgba(1,13,31,0)');shade.addColorStop(1,'rgba(0,8,20,.44)');
    ctx.beginPath();ctx.arc(0,0,R,0,Math.PI*2);ctx.fillStyle=shade;ctx.fill();ctx.restore();
    ctx.beginPath();ctx.arc(0,0,R,0,Math.PI*2);ctx.strokeStyle='rgba(173,227,242,.44)';ctx.lineWidth=1.2;ctx.shadowColor='rgba(89,205,245,.65)';ctx.shadowBlur=15;ctx.stroke();ctx.shadowBlur=0;
    ctx.restore();
    if(readout)readout.textContent=`${Math.round(lat)}° N · ${Math.round((lon+360)%360)}° E`;
  }
  function resize(){
    rectSize=Math.max(240,Math.floor(frame.getBoundingClientRect().width));
    dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.floor(rectSize*dpr);canvas.height=Math.floor(rectSize*dpr);
    render(performance.now());
  }
  function tick(time){
    raf=0;
    if(!visible || document.hidden) return;
    if(time-lastFrame>=32){
      if(!paused && !dragging){lon=(lon+.22)%360;clock=time;}
      render(time);lastFrame=time;
    }
    raf=requestAnimationFrame(tick);
  }
  function start(){if(!raf && visible && !document.hidden)raf=requestAnimationFrame(tick);}
  function stop(){if(raf){cancelAnimationFrame(raf);raf=0;}}
  function updateButton(){
    globe.classList.toggle('is-paused',paused);
    pauseBtn.setAttribute('aria-pressed',String(paused));
    pauseBtn.textContent=paused?(fa?'شروع چرخش':'Resume rotation'):(fa?'توقف چرخش':'Pause rotation');
  }
  pauseBtn.addEventListener('click',()=>{paused=!paused;updateButton();render(performance.now());start();});
  let moved=0;
  frame.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    frame.setPointerCapture(e.pointerId);dragging=true;oldX=e.clientX;oldY=e.clientY;moved=0;
  });
  frame.addEventListener('pointermove',e=>{
    if(!dragging)return;
    const dx=e.clientX-oldX,dy=e.clientY-oldY;oldX=e.clientX;oldY=e.clientY;moved+=Math.abs(dx)+Math.abs(dy);
    lon=(lon-dx*.46+360)%360;lat=Math.max(-63,Math.min(63,lat+dy*.28));
    render(performance.now());
  });
  function release(){dragging=false;start();}
  frame.addEventListener('pointerup',release);frame.addEventListener('pointercancel',release);frame.addEventListener('lostpointercapture',release);
  frame.addEventListener('keydown',e=>{
    const step = e.shiftKey ? 15 : 6;
    if(e.key==='ArrowLeft'){lon=(lon+step)%360;}
    else if(e.key==='ArrowRight'){lon=(lon-step+360)%360;}
    else if(e.key==='ArrowUp'){lat=Math.min(63,lat+step);}
    else if(e.key==='ArrowDown'){lat=Math.max(-63,lat-step);}
    else if(e.key==='Home'){lon=27;lat=20;}
    else{return;}
    e.preventDefault();paused=true;updateButton();render(performance.now());
  });
  if('ResizeObserver' in window)new ResizeObserver(resize).observe(frame);
  else window.addEventListener('resize',resize,{passive:true});
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;visible?start():stop();},{threshold:.03});observer.observe(globe);
  }else{visible=true;start();}
  document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
  reduce.addEventListener?.('change',ev=>{paused=ev.matches;updateButton();render(performance.now());});
  updateButton();resize();
})();
