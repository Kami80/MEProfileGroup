/* MEProfileGroup's dependency-free, local GLB viewer. No CDN, build step or cookies. */
(() => {
  'use strict';
  const assetDir = new URL('.', document.currentScript.src);
  const models = {
    french: { file: 'french-frame.glb', fa: 'چهارچوب فرانسوی', en: 'French frame profile' },
    square: { file: 'square-profile.glb', fa: 'پروفیل مربع', en: 'Square hollow section' },
    rectangle: { file: 'rectangular-profile.glb', fa: 'پروفیل مستطیلی', en: 'Rectangular hollow section' },
    pipes: { file: 'circular-profile.glb', fa: 'پروفیل دایره‌ای', en: 'Circular hollow section' }
  };
  const fa = document.documentElement.lang.toLowerCase().startsWith('fa');
  const strings = fa ? {
    loading:'در حال بارگذاری مدل سه‌بعدی…', error:'پیش‌نمایش سه‌بعدی در دسترس نیست؛ تصویر محصول نمایش داده می‌شود.',
    label:'مدل سه‌بعدی قابل چرخش', hint:'برای چرخش بکشید · برای زوم اسکرول کنید',
    reset:'بازنشانی زاویه', zoomIn:'بزرگ‌نمایی', zoomOut:'کوچک‌نمایی', auto:'چرخش خودکار',
    close:'بستن', view:'نمایش سه‌بعدی', download:'دریافت مدل GLB'
  } : {
    loading:'Loading 3D model…', error:'3D preview unavailable; showing the product photo.',
    label:'Interactive 3D model', hint:'Drag to rotate · scroll to zoom',
    reset:'Reset view', zoomIn:'Zoom in', zoomOut:'Zoom out', auto:'Auto rotate',
    close:'Close', view:'Explore in 3D', download:'Download GLB model'
  };
  const modelURL = key => new URL(`models/${models[key].file}`, assetDir).href;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const normalize=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n)};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  function multiply(a,b){let out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
  function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),d=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*d,-1,0,0,2*far*near*d,0]);}
  function lookAt(eye){const z=normalize(eye),x=normalize(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
  function parseGLB(buffer){
    const d=new DataView(buffer);
    if(d.getUint32(0,true)!==0x46546c67 || d.getUint32(4,true)!==2)throw Error('Invalid GLB');
    let offset=12, json=null, bin=null;
    while(offset<buffer.byteLength){const len=d.getUint32(offset,true),type=d.getUint32(offset+4,true);offset+=8;
      if(type===0x4E4F534A)json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,offset,len)).trim());
      if(type===0x004E4942)bin=new DataView(buffer,offset,len);
      offset+=len;
    }
    if(!json || !bin || !json.meshes?.[0]?.primitives?.[0])throw Error('Missing GLB mesh');
    const p=json.meshes[0].primitives[0];
    function values(index){const a=json.accessors[index],v=json.bufferViews[a.bufferView],size=a.type==='VEC3'?3:1,
      bytes=a.componentType===5126||a.componentType===5125?4:2,step=v.byteStride||size*bytes,start=(v.byteOffset||0)+(a.byteOffset||0),arr=[];
      for(let i=0;i<a.count;i++)for(let j=0;j<size;j++){
        const o=start+i*step+j*bytes;
        arr.push(a.componentType===5126?bin.getFloat32(o,true):a.componentType===5125?bin.getUint32(o,true):bin.getUint16(o,true));
      }
      return arr;
    }
    const positions=new Float32Array(values(p.attributes.POSITION));
    const normals=new Float32Array(values(p.attributes.NORMAL));
    const indices=new Uint16Array(values(p.indices));
    if(!positions.length || normals.length!==positions.length || !indices.length)throw Error('Invalid mesh data');
    return {positions,normals,indices};
  }
  function compile(gl,type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;}
  function setupGL(gl,mesh){
    const vert=`attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uMVP;varying vec3 vPos;varying vec3 vNormal;void main(){vPos=aPosition;vNormal=aNormal;gl_Position=uMVP*vec4(aPosition,1.0);}`;
    const frag=`precision highp float;varying vec3 vPos;varying vec3 vNormal;uniform vec3 uEye;void main(){
      vec3 n=normalize(vNormal);vec3 eye=normalize(uEye-vPos);vec3 key=normalize(vec3(-0.4,0.85,1.0));vec3 fill=normalize(vec3(0.9,0.1,-0.6));
      float diffuse=max(dot(n,key),0.0)*0.54+max(dot(n,fill),0.0)*0.18+0.28;
      vec3 halfV=normalize(key+eye);float spec=pow(max(dot(n,halfV),0.0),38.0)*0.68;
      float edge=pow(1.0-max(dot(n,eye),0.0),3.0)*0.25;
      vec3 steel=vec3(0.54,0.62,0.70)*diffuse+vec3(0.80,0.91,0.99)*(spec+edge);
      gl_FragColor=vec4(pow(steel,vec3(0.90)),1.0);
    }`;
    const program=gl.createProgram();gl.attachShader(program,compile(gl,gl.VERTEX_SHADER,vert));gl.attachShader(program,compile(gl,gl.FRAGMENT_SHADER,frag));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
    function buf(target,data){const b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,data,gl.STATIC_DRAW);return b;}
    const pos=buf(gl.ARRAY_BUFFER,mesh.positions),nor=buf(gl.ARRAY_BUFFER,mesh.normals),idx=buf(gl.ELEMENT_ARRAY_BUFFER,mesh.indices);
    function attr(name,b){const loc=gl.getAttribLocation(program,name);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,0,0);}
    attr('aPosition',pos);attr('aNormal',nor);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,idx);
    gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0,0,0,0);
    return {program,pos,nor,idx,count:mesh.indices.length,mvp:gl.getUniformLocation(program,'uMVP'),eye:gl.getUniformLocation(program,'uEye')};
  }
  function mount(host){
    if(host.dataset.mepMounted==='yes')return;
    const key=host.getAttribute('data-profile-3d');
    if(!models[key])return;
    host.dataset.mepMounted='yes';host.classList.add('mep-model-host');
    const status=document.createElement('div');status.className='mep-model-status';status.textContent=strings.loading;status.setAttribute('role','status');
    host.append(status);
    const canvas=document.createElement('canvas');canvas.className='mep-model-canvas';canvas.setAttribute('aria-label',`${strings.label}: ${fa?models[key].fa:models[key].en}`);canvas.tabIndex=0;
    host.append(canvas);
    const bar=document.createElement('div');bar.className='mep-model-tools';bar.innerHTML=`<span class="mep-model-marker" aria-hidden="true">3D</span><button class="mep-model-tool" type="button" data-action="zoomIn" title="${strings.zoomIn}" aria-label="${strings.zoomIn}">+</button><button class="mep-model-tool" type="button" data-action="zoomOut" title="${strings.zoomOut}" aria-label="${strings.zoomOut}">−</button><button class="mep-model-tool" type="button" data-action="reset" title="${strings.reset}" aria-label="${strings.reset}">↺</button><button class="mep-model-tool" type="button" data-action="auto" title="${strings.auto}" aria-label="${strings.auto}" aria-pressed="false">⟳</button>`;
    host.append(bar);
    const footer=document.createElement('div');footer.className='mep-model-footer';footer.textContent=strings.hint;host.append(footer);
    let theta=.68,phi=.34,distance=6.6,auto=false,visible=true,active=true,disposed=false,raf=0,ready=false;
    let gl,program,observer,resizeObserver,last=0;
    const defaultView=()=>{theta=.68;phi=.34;distance=6.6;};
    const pointers=new Map();let oldPinch=0;
    function render(now){if(disposed||!ready||!visible||!active||document.hidden){raf=0;return;}
      const dt=Math.min((now-last)||16,50);last=now;if(auto)theta+=dt*.00025;
      let w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight),dpr=Math.min(window.devicePixelRatio||1,1.75);
      const sw=Math.round(w*dpr),sh=Math.round(h*dpr);
      if(canvas.width!==sw||canvas.height!==sh){canvas.width=sw;canvas.height=sh;gl.viewport(0,0,sw,sh);}
      const cp=Math.cos(phi),eye=[distance*cp*Math.sin(theta),distance*Math.sin(phi),distance*cp*Math.cos(theta)];
      const matrix=multiply(perspective(42*Math.PI/180,w/h,.1,60),lookAt(eye));
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program.program);
      gl.uniformMatrix4fv(program.mvp,false,matrix);gl.uniform3fv(program.eye,eye);
      gl.drawElements(gl.TRIANGLES,program.count,gl.UNSIGNED_SHORT,0);
      raf=requestAnimationFrame(render);
    }
    function start(){if(!raf&&ready&&visible&&active&&!disposed){last=0;raf=requestAnimationFrame(render);}}
    function stop(){if(raf)cancelAnimationFrame(raf);raf=0;}
    function userInteracted(){auto=false;const b=bar.querySelector('[data-action=auto]');if(b)b.setAttribute('aria-pressed','false');}
    canvas.addEventListener('pointerdown',e=>{userInteracted();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){const pts=[...pointers.values()];oldPinch=Math.hypot(pts[0][0]-pts[1][0],pts[0][1]-pts[1][1]);}});
    canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);
      if(pointers.size===1){theta+=(e.clientX-old[0])*.009;phi=clamp(phi+(e.clientY-old[1])*.009,-1.2,1.2);}
      if(pointers.size===2){const pts=[...pointers.values()],len=Math.hypot(pts[0][0]-pts[1][0],pts[0][1]-pts[1][1]);if(oldPinch)distance=clamp(distance*oldPinch/Math.max(1,len),3.9,11);oldPinch=len;}
    });
    const endPointer=e=>{pointers.delete(e.pointerId);oldPinch=0;};canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);
    canvas.addEventListener('wheel',e=>{e.preventDefault();userInteracted();distance=clamp(distance+Math.sign(e.deltaY)*.38,3.9,11);},{passive:false});
    canvas.addEventListener('dblclick',()=>{userInteracted();defaultView();});
    canvas.addEventListener('keydown',e=>{const k=e.key;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(k)){e.preventDefault();userInteracted();if(k==='ArrowLeft')theta-=.13;if(k==='ArrowRight')theta+=.13;if(k==='ArrowUp')phi=clamp(phi+.13,-1.2,1.2);if(k==='ArrowDown')phi=clamp(phi-.13,-1.2,1.2);if(k==='+')distance=clamp(distance-.4,3.9,11);if(k==='-')distance=clamp(distance+.4,3.9,11);}});
    bar.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b)return;switch(b.dataset.action){case'zoomIn':userInteracted();distance=clamp(distance-.65,3.9,11);break;case'zoomOut':userInteracted();distance=clamp(distance+.65,3.9,11);break;case'reset':userInteracted();defaultView();break;case'auto':auto=!auto;b.setAttribute('aria-pressed',String(auto));break;}});
    host._mepSetActive=flag=>{active=!!flag;if(active)start();else stop();};
    host._mepDispose=()=>{disposed=true;stop();observer?.disconnect();resizeObserver?.disconnect();};
    fetch(modelURL(key)).then(res=>{if(!res.ok)throw Error(`HTTP ${res.status}`);return res.arrayBuffer()}).then(parseGLB).then(mesh=>{
      if(disposed)return;gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});if(!gl)throw Error('WebGL unavailable');
      program=setupGL(gl,mesh);ready=true;host.classList.add('is-3d-ready');status.remove();
      resizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>{if(ready&&!raf)start()}):null;resizeObserver?.observe(host);
      observer=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)start();else stop();},{threshold:.03}):null;observer?.observe(host);start();
    }).catch(err=>{console.warn('MEProfileGroup 3D fallback:',err);host.classList.add('mep-3d-unavailable');status.textContent=strings.error;bar.remove();footer.remove();canvas.remove();});
  }
  // Only product detail pages carry these controls. Their 3D asset loads on demand.
  document.querySelectorAll('.detail-visual[data-profile-3d]').forEach(host=>{
    const options=[...host.querySelectorAll('[data-product-view]')];
    if(options.length!==2)return;
    host.querySelector('.mep-product-view-switch').addEventListener('click',event=>{
      const clicked=event.target.closest('button[data-product-view]');
      if(!clicked)return;
      const show3d=clicked.dataset.productView==='3d';
      host.classList.toggle('mep-product-3d-mode',show3d);
      host.classList.toggle('mep-product-photo-mode',!show3d);
      options.forEach(button=>button.setAttribute('aria-pressed',String(button===clicked)));
      if(show3d){
        mount(host);
        host._mepSetActive?.(true);
      }else{
        host._mepSetActive?.(false);
      }
    });
  });
})();
