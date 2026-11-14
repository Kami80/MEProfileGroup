/* MEProfileGroup advanced premium 3D viewer — improved metallic rendering, richer scene staging, product-specific accents and fullscreen support. */
(() => {
  'use strict';
  const assetDir = new URL('.', document.currentScript.src);
  const models = {
    french: { file: 'french-frame.glb', fa: 'چهارچوب فرانسوی', en: 'French frame profile', accentA:'#d6a96a', accentB:'#4f87ab' },
    square: { file: 'square-profile.glb', fa: 'پروفیل مربع', en: 'Square hollow section', accentA:'#7db0d2', accentB:'#b4d0de' },
    rectangle: { file: 'rectangular-profile.glb', fa: 'پروفیل مستطیلی', en: 'Rectangular hollow section', accentA:'#79a8c7', accentB:'#e5c185' },
    pipes: { file: 'circular-profile.glb', fa: 'پروفیل دایره‌ای', en: 'Circular hollow section', accentA:'#95bbd4', accentB:'#c9d7e2' }
  };
  const fa = document.documentElement.lang.toLowerCase().startsWith('fa');
  const strings = fa ? {
    loading:'در حال بارگذاری نمای سه‌بعدی…', error:'نمای سه‌بعدی در دسترس نیست؛ تصویر محصول نمایش داده می‌شود.',
    label:'مدل سه‌بعدی تعاملی', hint:'برای چرخش بکشید · برای زوم اسکرول یا پینچ کنید',
    reset:'بازنشانی نما', zoomIn:'بزرگ‌نمایی', zoomOut:'کوچک‌نمایی', auto:'چرخش خودکار', studio:'نمای سه‌بعدی محصول', full:'تمام‌صفحه'
  } : {
    loading:'Loading 3D view…', error:'3D preview unavailable; showing the product photo.',
    label:'Interactive 3D model', hint:'Drag to orbit · scroll or pinch to zoom',
    reset:'Reset view', zoomIn:'Zoom in', zoomOut:'Zoom out', auto:'Auto rotate', studio:'Product 3D view', full:'Fullscreen'
  };
  const modelURL = key => new URL(`models/${models[key].file}`, assetDir).href;
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const normalize = v => { const n = Math.hypot(...v)||1; return v.map(x=>x/n); };
  const cross = (a,b)=>[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const dot = (a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  function multiply(a,b){ const out = new Float32Array(16); for(let c=0;c<4;c++) for(let r=0;r<4;r++) for(let k=0;k<4;k++) out[c*4+r]+=a[k*4+r]*b[c*4+k]; return out; }
  function perspective(fov,aspect,near,far){ const f=1/Math.tan(fov/2), d=1/(near-far); return new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*d,-1, 0,0,2*far*near*d,0]); }
  function lookAt(eye){ const z=normalize(eye), x=normalize(cross([0,1,0],z)), y=cross(z,x); return new Float32Array([x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0, -dot(x,eye),-dot(y,eye),-dot(z,eye),1]); }
  function parseGLB(buffer){
    const d = new DataView(buffer);
    if(d.getUint32(0,true)!==0x46546c67 || d.getUint32(4,true)!==2) throw Error('Invalid GLB');
    let offset=12, json=null, bin=null;
    while(offset<buffer.byteLength){
      const len=d.getUint32(offset,true), type=d.getUint32(offset+4,true); offset+=8;
      if(type===0x4E4F534A) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,offset,len)).trim());
      if(type===0x004E4942) bin = new DataView(buffer,offset,len);
      offset += len;
    }
    if(!json || !bin || !json.meshes?.[0]?.primitives?.[0]) throw Error('Missing GLB mesh');
    const p = json.meshes[0].primitives[0];
    function values(index){
      const a=json.accessors[index], v=json.bufferViews[a.bufferView], size=a.type==='VEC3'?3:1,
        bytes=(a.componentType===5126||a.componentType===5125)?4:2, step=v.byteStride||size*bytes,
        start=(v.byteOffset||0)+(a.byteOffset||0), arr=[];
      for(let i=0;i<a.count;i++) for(let j=0;j<size;j++){
        const o=start+i*step+j*bytes;
        arr.push(a.componentType===5126?bin.getFloat32(o,true):a.componentType===5125?bin.getUint32(o,true):bin.getUint16(o,true));
      }
      return arr;
    }
    const positions = new Float32Array(values(p.attributes.POSITION));
    const normals = new Float32Array(values(p.attributes.NORMAL));
    const idxVals = values(p.indices);
    const indices = (Math.max(...idxVals) > 65535) ? new Uint32Array(idxVals) : new Uint16Array(idxVals);
    const min=[Infinity,Infinity,Infinity], max=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<positions.length;i+=3){ for(let a=0;a<3;a++){ const v=positions[i+a]; if(v<min[a]) min[a]=v; if(v>max[a]) max[a]=v; } }
    const center=[(min[0]+max[0])/2,(min[1]+max[1])/2,(min[2]+max[2])/2];
    const size=[max[0]-min[0],max[1]-min[1],max[2]-min[2]];
    const longest=Math.max(size[0],size[1],size[2])||1;
    const scale=3.0/longest;
    let minY=Infinity;
    for(let i=0;i<positions.length;i+=3){
      positions[i]=(positions[i]-center[0])*scale; positions[i+1]=(positions[i+1]-center[1])*scale; positions[i+2]=(positions[i+2]-center[2])*scale;
      if(positions[i+1] < minY) minY = positions[i+1];
    }
    const floorLift=-0.72-minY;
    for(let i=1;i<positions.length;i+=3) positions[i]+=floorLift;
    return { positions, normals, indices };
  }
  function compile(gl,type,source){ const shader=gl.createShader(type); gl.shaderSource(shader,source); gl.compileShader(shader); if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader)); return shader; }
  function setupGL(gl,mesh){
    const vert = `attribute vec3 aPosition; attribute vec3 aNormal; uniform mat4 uMVP; varying vec3 vPos; varying vec3 vNormal; void main(){ vPos=aPosition; vNormal=normalize(aNormal); gl_Position=uMVP*vec4(aPosition,1.0); }`;
    const frag = `precision highp float; varying vec3 vPos; varying vec3 vNormal; uniform vec3 uEye; uniform float uTime;
      vec3 ACESFilm(vec3 x){ float a=2.51; float b=0.03; float c=2.43; float d=0.59; float e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0); }
      void main(){
        vec3 n=normalize(vNormal); vec3 v=normalize(uEye-vPos);
        vec3 keyDir=normalize(vec3(-0.52,0.98,0.72)); vec3 fillDir=normalize(vec3(0.96,0.25,-0.42)); vec3 rimDir=normalize(vec3(0.25,0.92,-1.15)); vec3 topDir=normalize(vec3(0.0,1.0,0.08));
        float key=max(dot(n,keyDir),0.0); float fill=max(dot(n,fillDir),0.0); float top=pow(max(dot(n,topDir),0.0),1.35); float fresnel=pow(1.0-max(dot(n,v),0.0),4.0); float rim=pow(1.0-max(dot(n,v),0.0),2.3)*(0.28+0.72*max(dot(n,rimDir),0.0));
        float grainA=0.5+0.5*sin(vPos.x*26.0+vPos.z*7.0+0.25); float grainB=0.5+0.5*sin(vPos.x*49.0-vPos.y*5.0+1.1); float grainC=0.5+0.5*sin(vPos.z*31.0+vPos.x*19.0); float grain=mix(grainA,grainB,0.44); grain=mix(grain,grainC,0.18); grain=0.84+grain*0.16;
        vec3 h1=normalize(keyDir+v); vec3 h2=normalize(fillDir+v); vec3 h3=normalize(topDir+v); float spec1=pow(max(dot(n,h1),0.0),64.0)*1.12; float spec2=pow(max(dot(n,h2),0.0),24.0)*0.22; float spec3=pow(max(dot(n,h3),0.0),118.0)*0.70;
        float sweep=smoothstep(0.08,0.48,0.5+0.5*sin(vPos.x*2.2-uTime*0.55)); sweep*=smoothstep(0.95,0.20,abs(vPos.z)*0.55); sweep*=0.16;
        float ao=clamp(0.88+(vPos.y+0.7)*0.075,0.77,1.0); float floorOcc=smoothstep(-0.90,-0.38,vPos.y);
        vec3 baseDark=vec3(0.31,0.35,0.40); vec3 baseMid=vec3(0.53,0.58,0.64); vec3 baseLight=vec3(0.76,0.82,0.88);
        vec3 steelBase=mix(baseDark,baseMid,0.56+0.34*grain); steelBase=mix(steelBase,baseLight,0.16*key+0.12*top);
        vec3 coolReflect=vec3(0.80,0.91,1.00); vec3 warmReflect=vec3(0.92,0.80,0.63); vec3 skyTint=vec3(0.18,0.28,0.38);
        float diffuse=0.16+key*0.88+fill*0.24+top*0.26;
        vec3 color=steelBase*diffuse; color += coolReflect*spec1; color += warmReflect*spec2; color += vec3(1.0)*spec3; color += mix(coolReflect,warmReflect,0.25+0.18*key)*fresnel*0.52; color += vec3(0.13,0.18,0.24)*rim; color += vec3(0.24,0.28,0.33)*sweep; color += skyTint*0.08; color *= ao*mix(0.93,1.0,floorOcc); color=ACESFilm(max(color,vec3(0.0))); color=pow(color,vec3(0.94)); gl_FragColor=vec4(color,1.0);
      }`;
    const program = gl.createProgram(); gl.attachShader(program,compile(gl,gl.VERTEX_SHADER,vert)); gl.attachShader(program,compile(gl,gl.FRAGMENT_SHADER,frag)); gl.linkProgram(program); if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program)); gl.useProgram(program);
    function buf(target,data){ const b=gl.createBuffer(); gl.bindBuffer(target,b); gl.bufferData(target,data,gl.STATIC_DRAW); return b; }
    const pos=buf(gl.ARRAY_BUFFER,mesh.positions), nor=buf(gl.ARRAY_BUFFER,mesh.normals); buf(gl.ELEMENT_ARRAY_BUFFER,mesh.indices);
    function attr(name,b){ const loc=gl.getAttribLocation(program,name); gl.bindBuffer(gl.ARRAY_BUFFER,b); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,3,gl.FLOAT,false,0,0); }
    attr('aPosition',pos); attr('aNormal',nor); gl.disable(gl.CULL_FACE); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.clearColor(0,0,0,0);
    return { program, count:mesh.indices.length, type:mesh.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, mvp:gl.getUniformLocation(program,'uMVP'), eye:gl.getUniformLocation(program,'uEye'), time:gl.getUniformLocation(program,'uTime') };
  }
  function mount(host){
    if(host.dataset.mepMounted==='yes') return;
    const key = host.getAttribute('data-profile-3d'); if(!models[key]) return;
    host.dataset.mepMounted='yes'; host.classList.add('mep-model-host'); host.dataset.sceneKey = key;
    host.style.setProperty('--mep-scene-accent-a', models[key].accentA); host.style.setProperty('--mep-scene-accent-b', models[key].accentB);
    const status=document.createElement('div'); status.className='mep-model-status'; status.textContent=strings.loading; status.setAttribute('role','status');
    const aura=document.createElement('div'); aura.className='mep-model-aura'; aura.setAttribute('aria-hidden','true');
    const reflection=document.createElement('div'); reflection.className='mep-model-reflection'; reflection.setAttribute('aria-hidden','true');
    const studioLabel=document.createElement('div'); studioLabel.className='mep-model-studio-label'; studioLabel.textContent=`${fa ? models[key].fa : models[key].en} • 3D`;
    host.append(aura, reflection, studioLabel, status);
    const canvas=document.createElement('canvas'); canvas.className='mep-model-canvas'; canvas.setAttribute('aria-label', `${strings.label}: ${fa ? models[key].fa : models[key].en}`); canvas.tabIndex=0; host.append(canvas);
    const bar=document.createElement('div'); bar.className='mep-model-tools'; bar.innerHTML=`<span class="mep-model-marker" aria-hidden="true">3D</span><button class="mep-model-tool" type="button" data-action="zoomIn" title="${strings.zoomIn}" aria-label="${strings.zoomIn}">+</button><button class="mep-model-tool" type="button" data-action="zoomOut" title="${strings.zoomOut}" aria-label="${strings.zoomOut}">−</button><button class="mep-model-tool" type="button" data-action="reset" title="${strings.reset}" aria-label="${strings.reset}">↺</button><button class="mep-model-tool" type="button" data-action="auto" title="${strings.auto}" aria-label="${strings.auto}" aria-pressed="false">⟳</button><button class="mep-model-tool" type="button" data-action="full" title="${strings.full}" aria-label="${strings.full}">⤢</button>`; host.append(bar);
    const footer=document.createElement('div'); footer.className='mep-model-footer'; footer.textContent=strings.hint; host.append(footer);
    let theta=.64, phi=.22, distance=4.85, auto=false, visible=true, active=true, disposed=false, raf=0, ready=false; let gl, program, observer, resizeObserver, last=0; const pointers=new Map(); let oldPinch=0; const defaultView=()=>{ theta=.64; phi=.22; distance=4.85; };
    function render(now){ if(disposed || !ready || !visible || !active || document.hidden){ raf=0; return; } const dt=Math.min((now-last)||16,50); last=now; if(auto) theta += dt*0.00017; const w=Math.max(1,canvas.clientWidth), h=Math.max(1,canvas.clientHeight), dpr=Math.min(window.devicePixelRatio||1,2); const sw=Math.round(w*dpr), sh=Math.round(h*dpr); if(canvas.width!==sw || canvas.height!==sh){ canvas.width=sw; canvas.height=sh; gl.viewport(0,0,sw,sh); } const cp=Math.cos(phi), eye=[distance*cp*Math.sin(theta), distance*Math.sin(phi), distance*cp*Math.cos(theta)]; const matrix=multiply(perspective(38*Math.PI/180, w/h, .1, 60), lookAt(eye)); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT); gl.useProgram(program.program); gl.uniformMatrix4fv(program.mvp,false,matrix); gl.uniform3fv(program.eye,eye); gl.uniform1f(program.time,now*0.001); gl.drawElements(gl.TRIANGLES, program.count, program.type, 0); raf=requestAnimationFrame(render); }
    const start=()=>{ if(!raf && ready && visible && active && !disposed){ last=0; raf=requestAnimationFrame(render); } }; const stop=()=>{ if(raf) cancelAnimationFrame(raf); raf=0; }; const userInteracted=()=>{ auto=false; const b=bar.querySelector('[data-action=auto]'); if(b) b.setAttribute('aria-pressed','false'); };
    canvas.addEventListener('pointerdown',e=>{ userInteracted(); canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId,[e.clientX,e.clientY]); if(pointers.size===2){ const pts=[...pointers.values()]; oldPinch=Math.hypot(pts[0][0]-pts[1][0], pts[0][1]-pts[1][1]); } });
    canvas.addEventListener('pointermove',e=>{ if(!pointers.has(e.pointerId)) return; const old=pointers.get(e.pointerId); pointers.set(e.pointerId,[e.clientX,e.clientY]); if(pointers.size===1){ theta += (e.clientX-old[0])*0.009; phi = clamp(phi + (e.clientY-old[1])*0.0082, -1.0, 1.0); } if(pointers.size===2){ const pts=[...pointers.values()], len=Math.hypot(pts[0][0]-pts[1][0], pts[0][1]-pts[1][1]); if(oldPinch) distance = clamp(distance*oldPinch/Math.max(1,len), 3.2, 8.0); oldPinch=len; } });
    const endPointer=e=>{ pointers.delete(e.pointerId); oldPinch=0; }; canvas.addEventListener('pointerup',endPointer); canvas.addEventListener('pointercancel',endPointer);
    canvas.addEventListener('wheel',e=>{ e.preventDefault(); userInteracted(); distance = clamp(distance + Math.sign(e.deltaY)*0.32, 3.2, 8.0); }, {passive:false});
    canvas.addEventListener('dblclick',()=>{ userInteracted(); defaultView(); });
    canvas.addEventListener('keydown',e=>{ const k=e.key; if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(k)){ e.preventDefault(); userInteracted(); if(k==='ArrowLeft') theta -= 0.13; if(k==='ArrowRight') theta += 0.13; if(k==='ArrowUp') phi = clamp(phi + 0.10,-1.0,1.0); if(k==='ArrowDown') phi = clamp(phi - 0.10,-1.0,1.0); if(k==='+') distance = clamp(distance-0.34, 3.2, 8.0); if(k==='-') distance = clamp(distance+0.34, 3.2, 8.0); }});
    bar.addEventListener('click',e=>{ const b=e.target.closest('button[data-action]'); if(!b) return; switch(b.dataset.action){ case 'zoomIn': userInteracted(); distance = clamp(distance-0.52,3.2,8.0); break; case 'zoomOut': userInteracted(); distance = clamp(distance+0.52,3.2,8.0); break; case 'reset': userInteracted(); defaultView(); break; case 'auto': auto=!auto; b.setAttribute('aria-pressed', String(auto)); break; case 'full': if(document.fullscreenElement===host){ document.exitFullscreen?.(); } else { host.requestFullscreen?.(); } break; } });
    document.addEventListener('fullscreenchange', ()=> host.classList.toggle('mep-model-fullscreen', document.fullscreenElement===host));
    host._mepSetActive = flag => { active=!!flag; active ? start() : stop(); }; host._mepDispose = ()=>{ disposed=true; stop(); observer?.disconnect(); resizeObserver?.disconnect(); };
    fetch(modelURL(key)).then(res=>{ if(!res.ok) throw Error(`HTTP ${res.status}`); return res.arrayBuffer(); }).then(parseGLB).then(mesh=>{ if(disposed) return; gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false}); if(!gl) throw Error('WebGL unavailable'); const ext=gl.getExtension('OES_element_index_uint'); if(mesh.indices instanceof Uint32Array && !ext) throw Error('Large model not supported'); program=setupGL(gl,mesh); ready=true; host.classList.add('is-3d-ready'); status.remove(); resizeObserver=typeof ResizeObserver!=='undefined' ? new ResizeObserver(()=>{ if(ready && !raf) start(); }) : null; resizeObserver?.observe(host); observer=typeof IntersectionObserver!=='undefined' ? new IntersectionObserver(entries=>{ visible=entries[0].isIntersecting; visible ? start() : stop(); }, {threshold:.03}) : null; observer?.observe(host); start(); }).catch(err=>{ console.warn('MEProfileGroup 3D fallback:', err); host.classList.add('mep-3d-unavailable'); status.textContent=strings.error; bar.remove(); footer.remove(); canvas.remove(); aura.remove(); reflection.remove(); studioLabel.remove(); });
  }
  document.querySelectorAll('.detail-visual[data-profile-3d]').forEach(host=>{ const options=[...host.querySelectorAll('[data-product-view]')]; if(options.length!==2) return; host.querySelector('.mep-product-view-switch').addEventListener('click', event=>{ const clicked=event.target.closest('button[data-product-view]'); if(!clicked) return; const show3d=clicked.dataset.productView==='3d'; host.classList.toggle('mep-product-3d-mode', show3d); host.classList.toggle('mep-product-photo-mode', !show3d); options.forEach(button=>button.setAttribute('aria-pressed', String(button===clicked))); if(show3d){ mount(host); host._mepSetActive?.(true); } else { host._mepSetActive?.(false); } }); });
})();
