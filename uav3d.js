const host = document.getElementById('uav3dCanvas');
const loading = document.getElementById('modelLoading');
if (host) {
  try {
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');
    startTwin(THREE, host);
    loading?.remove();
  } catch (error) {
    console.error('3D twin could not be loaded', error);
    if (loading) loading.textContent = '3D model unavailable. Check the network connection and reload.';
  }
}

function startTwin(T, host) {
  const stage = document.getElementById('modelStage');
  const scene = new T.Scene();
  scene.background = new T.Color('#1b2831');
  const camera = new T.PerspectiveCamera(36, 1, 0.1, 100);
  const baseCamera = new T.Vector3(7.5, 6.2, 11.8);
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  scene.add(new T.HemisphereLight(0xdce9f1, 0x36424a, 2.0));
  const key = new T.DirectionalLight(0xfff4e5, 3.0); key.position.set(5, 9, 7); key.castShadow = true; scene.add(key);
  const rim = new T.DirectionalLight(0x77add1, 1.65); rim.position.set(-7, 4, -6); scene.add(rim);
  const fill = new T.PointLight(0xe5f0f4, 45, 22); fill.position.set(1, -1, 3); scene.add(fill);

  const ground = new T.Mesh(new T.PlaneGeometry(200, 200), new T.ShadowMaterial({ color: 0x000000, opacity: 0.21 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -1.45; ground.receiveShadow = true; scene.add(ground);
  const grid = new T.GridHelper(22, 22, 0x526570, 0x34434c); grid.position.y = -1.44;
  grid.material.transparent = true; grid.material.opacity = 0.34; scene.add(grid);

  const twin = new T.Group(); scene.add(twin);
  const airframe = new T.Group(); twin.add(airframe);
  const sensors = {};
  const labels = [];
  const engineParts = [];
  const normalSensor = new T.Color('#79b5d4');
  const faultSensor = new T.Color('#df574d');

  const mat = (color, roughness = 0.46, metalness = 0.12, extra = {}) => new T.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const shellMat = new T.MeshPhysicalMaterial({ color: 0xa9c8d7, roughness: 0.31, metalness: 0.2, transparent: true, opacity: 0.2, side: T.DoubleSide, depthWrite: false, clearcoat: 0.35, clearcoatRoughness: 0.25 });
  const wingMat = new T.MeshPhysicalMaterial({ color: 0xc2d5dd, roughness: 0.35, metalness: 0.17, transparent: true, opacity: 0.25, side: T.DoubleSide, depthWrite: false, clearcoat: 0.3 });
  const innerMat = mat('#8299a3', 0.48, 0.18);
  const darkMat = mat('#263740', 0.43, 0.42);
  const metalMat = mat('#a2b1b6', 0.26, 0.76);
  const boardMat = mat('#24634e', 0.68, 0.08);
  const chipMat = mat('#202a30', 0.45, 0.3);
  const goldMat = mat('#c5a664', 0.34, 0.7);

  function addMesh(geometry, material, parent = airframe, name = '') {
    const mesh = new T.Mesh(geometry, material); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function addBox(parent, name, size, position, material, rotation = null) {
    const mesh = addMesh(new T.BoxGeometry(...size), material, parent, name); mesh.position.set(...position); if (rotation) mesh.rotation.set(...rotation); return mesh;
  }
  function addCylinder(parent, name, r1, r2, length, position, material, rotation = [Math.PI / 2, 0, 0], segments = 20) {
    const mesh = addMesh(new T.CylinderGeometry(r1, r2, length, segments), material, parent, name); mesh.position.set(...position); mesh.rotation.set(...rotation); return mesh;
  }
  function loftFuselage(rings, material) {
    const radial = 28, vertices = [], indices = [];
    rings.forEach(([z, rx, ry]) => { for (let i = 0; i < radial; i++) { const a = i / radial * Math.PI * 2; vertices.push(Math.cos(a) * rx, Math.sin(a) * ry, z); } });
    for (let r = 0; r < rings.length - 1; r++) for (let i = 0; i < radial; i++) { const a = r * radial + i, b = r * radial + (i + 1) % radial, c = (r + 1) * radial + i, d = (r + 1) * radial + (i + 1) % radial; indices.push(a, b, c, b, d, c); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); g.setIndex(indices); g.computeVertexNormals();
    const body = addMesh(g, material, airframe, 'Translucent fuselage'); body.castShadow = false; return body;
  }
  function planform(points, material, y = 0.05, thickness = 0.085, name = 'Wing') {
    const shape = new T.Shape(); shape.moveTo(points[0][0], points[0][1]); points.slice(1).forEach(p => shape.lineTo(p[0], p[1])); shape.closePath();
    const geometry = new T.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.025, bevelThickness: 0.015, curveSegments: 4 });
    geometry.rotateX(Math.PI / 2);
    const mesh = addMesh(geometry, material, airframe, name); mesh.position.y = y; return mesh;
  }
  function tube(parent, points, radius, material, name = '') {
    const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
    return addMesh(new T.TubeGeometry(curve, 24, radius, 7, false), material, parent, name);
  }
  function makeLabel(text, position, color = '#edf4f6') {
    const canvas = document.createElement('canvas'); canvas.width = 384; canvas.height = 96;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = 'rgba(13,25,32,.88)'; ctx.fillRect(0, 8, 384, 80);
    ctx.strokeStyle = '#708792'; ctx.lineWidth = 2; ctx.strokeRect(1, 9, 382, 78);
    ctx.fillStyle = color; ctx.font = '600 29px Arial'; ctx.textBaseline = 'middle'; ctx.fillText(text.toUpperCase(), 18, 49);
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
    const sprite = new T.Sprite(new T.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
    sprite.scale.set(1.45, 0.36, 1); sprite.position.set(...position); sprite.renderOrder = 6; twin.add(sprite); labels.push(sprite); return sprite;
  }
  function addSensor(id, label, position, size = 0.115) {
    const holder = new T.Group(); holder.name = `${label} sensor`; holder.position.set(...position); airframe.add(holder);
    const base = addMesh(new T.CylinderGeometry(size * 0.56, size * 0.68, size * 0.45, 16), darkMat, holder, `${label} sensor housing`);
    base.rotation.x = Math.PI / 2;
    const ledMat = new T.MeshStandardMaterial({ color: normalSensor, roughness: 0.26, metalness: 0.24, emissive: normalSensor, emissiveIntensity: 0.14 });
    const cap = addMesh(new T.SphereGeometry(size * 0.43, 18, 12), ledMat, holder, `${label} sensor marker`); cap.position.y = size * 0.55;
    const collar = addMesh(new T.TorusGeometry(size * 0.51, size * 0.07, 8, 20), metalMat, holder); collar.position.y = size * 0.52; collar.rotation.x = Math.PI / 2;
    holder.userData = { id, label, material: ledMat, cap, holder };
    sensors[id] = holder;
    return holder;
  }

  // Swept fixed-wing airframe with a transparent inspection skin.
  loftFuselage([[ -2.55,.055,.06],[-2.25,.14,.14],[-1.72,.21,.2],[-.85,.29,.26],[0,.32,.29],[.72,.28,.26],[1.42,.2,.19],[1.9,.12,.12],[2.23,.035,.04]], shellMat);
  planform([[-4.8,-.15],[-.78,.47],[.55,.47],[4.8,-.15],[4.55,-.38],[.63,-.62],[-.68,-.62],[-4.55,-.38]], wingMat, -0.015, .095, 'Main translucent wing');
  planform([[-1.37,-1.95],[-.45,-1.67],[.45,-1.67],[1.37,-1.95],[1.24,-2.17],[-1.24,-2.17]], wingMat, 0.01, .07, 'Tailplane');
  const finShape = new T.Shape(); finShape.moveTo(1.68, .04); finShape.lineTo(2.24, .9); finShape.lineTo(2.14, .06); finShape.lineTo(1.91, -.04); finShape.closePath();
  const finGeo = new T.ExtrudeGeometry(finShape, { depth: .11, bevelEnabled: true, bevelSegments: 2, bevelSize: .025, bevelThickness: .025 }); finGeo.rotateY(Math.PI / 2);
  const fin = addMesh(finGeo, wingMat, airframe, 'Vertical stabilizer'); fin.position.x = -.055;
  // Spars, ribs and control surfaces give the airframe depth and construction detail.
  [-3.65,-2.75,-1.8,-.9,0,.9,1.8,2.75,3.65].forEach(x => tube(airframe, [[x,-.005,-.42],[x*.82,-.005,-.02],[x*.32,-.005,.32]], .012, innerMat, 'Wing rib'));
  tube(airframe, [[-4.4,-.04,-.32],[0,-.04,-.49],[4.4,-.04,-.32]], .026, darkMat, 'Main wing spar');
  tube(airframe, [[-1.1,.02,-2.07],[0,.02,-2.07],[1.1,.02,-2.07]], .025, darkMat, 'Tail spar');
  // Canopy and nose pitot probe.
  const canopy = addMesh(new T.SphereGeometry(1, 24, 16), new T.MeshPhysicalMaterial({ color: 0x7e9cab, roughness: .16, metalness: .26, transparent: true, opacity: .38, clearcoat: .8, side: T.DoubleSide }), airframe, 'Inspection canopy');
  canopy.scale.set(.2,.17,.63); canopy.position.set(0,.21,.72);
  addCylinder(airframe, 'Pitot probe', .025,.018,.62,[0,.02,2.45],metalMat,[Math.PI/2,0,0],12);
  addMesh(new T.SphereGeometry(.045,12,8), mat('#879da6',.2,.75), airframe, 'Pitot tip').position.set(0,.02,2.77);

  // Combustion engine assembly, cooling fins, shaft and rear pusher propeller.
  const engine = new T.Group(); engine.position.set(0,-.14,-1.56); airframe.add(engine);
  const engineBlock = addMesh(new T.CylinderGeometry(.28,.32,.69,24), darkMat.clone(), engine, 'Combustion engine block'); engineBlock.rotation.x = Math.PI/2; engineBlock.position.z = -.12; engineParts.push(engineBlock);
  for (let z=-.35;z<.18;z+=.095) { const finRing=addMesh(new T.TorusGeometry(.29,.025,8,28), metalMat.clone(), engine, 'Cooling fin'); finRing.position.z=z; engineParts.push(finRing); }
  const head = addMesh(new T.BoxGeometry(.41,.37,.34), mat('#667a82',.42,.45), engine, 'Cylinder head'); head.position.set(0,.24,.02); engineParts.push(head);
  addMesh(new T.SphereGeometry(.09,14,10), metalMat, engine, 'Spark plug').position.set(0,.45,.02);
  addCylinder(engine, 'Propeller shaft', .07,.07,.43,[0,0,-.58],metalMat,[Math.PI/2,0,0],16);
  const prop = new T.Group(); prop.position.set(0,0,-.82); engine.add(prop);
  addCylinder(prop,'Propeller hub',.12,.1,.15,[0,0,0],metalMat,[Math.PI/2,0,0],18);
  for (let i=0;i<2;i++) { const blade=addMesh(new T.BoxGeometry(.12,1.3,.055),mat('#283b45',.3,.5),prop,'Pusher propeller blade');blade.position.y=.73;blade.rotation.z=i*Math.PI; }

  // Clear inspection cutaway reveals the controller, power regulation and data wiring.
  const avionics = new T.Group(); avionics.position.set(0,-.08,-.12); airframe.add(avionics);
  addBox(avionics,'Arduino compatible controller PCB',[.73,.075,.88],[0,0,0],boardMat);
  addBox(avionics,'Microcontroller',[.3,.085,.3],[0,.08,-.03],chipMat);
  addBox(avionics,'Sensor interface IC',[.15,.05,.15],[-.23,.065,.22],chipMat);
  addBox(avionics,'Power regulator',[.13,.06,.17],[.23,.065,.25],mat('#343d40',.5,.25));
  addBox(avionics,'USB connector',[.19,.12,.12],[0,.01,.48],metalMat);
  for (let row=0;row<2;row++) for (let i=0;i<8;i++) addBox(avionics,'Gold header pin',[.025,.11,.025],[-.29+i*.083,.065,row===0?-.39:.38],goldMat);
  // Visible sensor boards and wiring, color-coded by component family.
  const moduleMat=mat('#364e56',.43,.25), sensorBoard=mat('#286d66',.55,.12), wireBlue=mat('#5b94ad',.36,.25), wireAmber=mat('#b08d55',.4,.3);
  addBox(airframe,'CHT sensor board',[.24,.07,.25],[.41,.12,-1.36],sensorBoard);
  addBox(airframe,'Vibration sensor board',[.22,.06,.2],[-.42,.1,-.56],sensorBoard);
  addBox(airframe,'Oil pressure transducer',[.2,.12,.23],[.36,-.04,-1.82],moduleMat);
  addBox(airframe,'Fuel flow module',[.24,.11,.28],[-.33,-.06,-1.05],moduleMat);
  addBox(airframe,'Fuel pressure module',[.2,.1,.22],[.36,-.07,-.92],moduleMat);
  addSensor('cht','Cylinder head temp',[.41,.27,-1.36],.14);
  addSensor('vibration','Vibration',[-.42,.23,-.56],.12);
  addSensor('oil','Oil pressure',[.36,.12,-1.82],.12);
  addSensor('fuelFlow','Fuel flow',[-.33,.13,-1.05],.12);
  addSensor('fuelPressure','Fuel pressure',[.36,.12,-.92],.12);
  addSensor('airspeed','Airspeed pitot',[0,.16,2.2],.105);
  addSensor('exhaust','Exhaust temp',[.28,.11,-1.95],.11);
  tube(airframe, [[.41,.11,-1.34],[.25,.23,-.93],[.1,.17,-.4],[0,.1,-.12]], .018, wireBlue, 'CHT data wire');
  tube(airframe, [[-.42,.09,-.55],[-.24,.12,-.31],[-.08,.12,-.14]], .018, wireAmber, 'Vibration data wire');
  tube(airframe, [[.36,-.12,-1.8],[.27,-.16,-1.24],[.1,-.08,-.28]], .016, wireBlue, 'Oil sensor wire');
  tube(airframe, [[-.32,-.14,-1.03],[-.21,-.11,-.65],[-.12,-.04,-.3]], .016, wireAmber, 'Fuel sensor wire');

  makeLabel('Arduino / flight controller',[0,.86,-.1],'#c8e4d2');
  makeLabel('Cylinder head temp',[-1.05,1.0,-1.55]);
  makeLabel('Vibration sensor',[1.22,.77,-.57]);
  makeLabel('Oil & fuel sensors',[-1.22,.55,-1.53]);
  makeLabel('Airspeed / pitot',[.18,.84,2.1]);
  makeLabel('Piston engine',[.95,.62,-2.05],'#e6d1ad');

  const raycaster = new T.Raycaster(); const pointer = new T.Vector2();
  const pickable = Object.values(sensors).flatMap(s => s.children.filter(o => o.isMesh));
  let zoom = 1, dragging = false, lastX = 0, lastY = 0, moved = false, rotateEnabled = true, showLabels = true, activeFault = null;
  function resize() {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    renderer.setSize(w,h,false); camera.aspect = w/h; camera.updateProjectionMatrix();
  }
  function updateCamera() { camera.position.copy(baseCamera).multiplyScalar(1/zoom); camera.lookAt(0,0,0); }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host); resize(); updateCamera();
  renderer.domElement.addEventListener('pointerdown', e => { dragging = true; moved = false; lastX=e.clientX; lastY=e.clientY; renderer.domElement.setPointerCapture(e.pointerId); });
  renderer.domElement.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx=e.clientX-lastX, dy=e.clientY-lastY; lastX=e.clientX; lastY=e.clientY; if(Math.abs(dx)+Math.abs(dy)>2)moved=true;
    if(rotateEnabled){ if(e.shiftKey)twin.rotation.z += dx*.009; else {twin.rotation.y += dx*.009; twin.rotation.x += dy*.009;} }
  });
  const stopDrag = e => { dragging=false; if(!moved){const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(pickable,false)[0];if(hit){const info=hit.object.parent.userData;window.dispatchEvent(new CustomEvent('aerotwin:sensor-selected',{detail:{id:info.id,label:info.label}}));}} };
  renderer.domElement.addEventListener('pointerup',stopDrag); renderer.domElement.addEventListener('pointercancel',()=>dragging=false);
  renderer.domElement.addEventListener('wheel', e => {e.preventDefault();setZoom(zoom+(e.deltaY<0?.07:-.07));},{passive:false});
  function setZoom(value){zoom=Math.min(1.85,Math.max(.55,value));updateCamera();window.dispatchEvent(new CustomEvent('aerotwin:zoom',{detail:{zoom}}));}
  function setFault(detail={}) {
    const severity=Number(detail.severity||0), issue=String(detail.issue||'').toLowerCase(); activeFault=severity>0;
    for(const [id,group] of Object.entries(sensors)){
      const m=group.userData.material; const affected=activeFault && (id==='cht'||id==='exhaust'||id==='oil'&&issue.includes('oil')||id==='vibration'&&issue.includes('vibration')||id==='fuelFlow'&&issue.includes('fuel'));
      m.color.set(affected?faultSensor:normalSensor);m.emissive.set(affected?faultSensor:normalSensor);m.emissiveIntensity=affected ? 0.95 : 0.14;
    }
    engineParts.forEach(part=>{part.material.color.set(activeFault?faultSensor:0x263740);if(part.material.emissive)part.material.emissive.set(activeFault?0x631c19:0x000000);});
  }
  window.aerotwinTwin={
    rotateBy(axis,amount){twin.rotation[axis]+=amount;},
    setRotation(x,y,z){twin.rotation.set(x,y,z);},
    setZoom,
    setFault,
    setLabels(value){showLabels=value;labels.forEach(l=>l.visible=value);},
    setRotateEnabled(value){rotateEnabled=value;},
    reset(){twin.rotation.set(-.1,0,0);setZoom(1);},
    getRotation(){return {x:twin.rotation.x,y:twin.rotation.y,z:twin.rotation.z};}
  };
  window.addEventListener('aerotwin:fault',e=>setFault(e.detail));
  window.addEventListener('aerotwin:zoom',e=>{const label=document.getElementById('zoomVal');if(label)label.textContent=`${Math.round(e.detail.zoom*100)}%`;});
  window.addEventListener('aerotwin:sensor-selected',e=>{const toast=document.getElementById('toast');if(toast){toast.textContent=`Selected sensor · ${e.detail.label}`;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1800);}});
  window.addEventListener('aerotwin:labels',e=>window.aerotwinTwin.setLabels(e.detail.visible));
  window.addEventListener('aerotwin:rotation-enabled',e=>window.aerotwinTwin.setRotateEnabled(e.detail.enabled));
  window.addEventListener('aerotwin:rotate-axis',e=>window.aerotwinTwin.rotateBy(e.detail.axis,e.detail.amount));
  window.addEventListener('aerotwin:reset',()=>window.aerotwinTwin.reset());
  window.addEventListener('resize',resize);
  twin.rotation.set(-.1,0,0);
  const clock = new T.Clock();
  function animate(){requestAnimationFrame(animate);const t=clock.getElapsedTime();if(!activeFault){sensors.cht.userData.cap.scale.setScalar(1+Math.sin(t*2.2)*.055);sensors.cht.userData.cap.material.emissiveIntensity=.1+((Math.sin(t*2.2)+1)*.025);}renderer.render(scene,camera);}
  animate();
  window.dispatchEvent(new CustomEvent('aerotwin:twin-ready'));
}
