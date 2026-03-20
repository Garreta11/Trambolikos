import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default class Race {
  constructor(_options = {}) {
    console.log('Race');
    if (!_options.container) {
      throw new Error('Container is required');
    }

    this.models = {};
    this.textures = {};

    this.loaderManager = new THREE.LoadingManager();
    this.loader = new GLTFLoader(this.loaderManager);
    this.loadertextures = new THREE.TextureLoader(this.loaderManager);
    this.loader.load('/minijuegos/bike-race/demi.glb', (gltf) => {
      this.models.demi = gltf.scene;
    });
    this.loader.load('/minijuegos/bike-race/player.glb', (gltf) => {
      this.models.player = gltf.scene;
    });
    this.loadertextures.load('/minijuegos/bike-race/latarr.jpg', (texture) => {
      this.textures.tarr = texture;
      this.textures.tarr.colorSpace = THREE.SRGBColorSpace;
    });
    this.loadertextures.load('/minijuegos/bike-race/graderia.jpg', (texture) => {
      this.textures.graderia = texture;
      this.textures.graderia.colorSpace = THREE.SRGBColorSpace;
    });
    this.loadertextures.load('/minijuegos/bike-race/demi.jpg', (texture) => {
      this.textures.demi = texture;
      this.textures.demi.colorSpace = THREE.SRGBColorSpace;
    });
    this.loadertextures.load('/minijuegos/bike-race/wildpork1.png', (texture) => {
      this.textures.wildpork = texture;
      this.textures.wildpork.colorSpace = THREE.SRGBColorSpace;
    });
    this.loadertextures.load('/minijuegos/bike-race/girls.png', (texture) => {
      this.textures.girls = texture;
      this.textures.girls.colorSpace = THREE.SRGBColorSpace;
    });
    this.loadertextures.load('/minijuegos/bike-race/beachball.png', (texture) => {
      this.textures.beachball = texture;
      this.textures.beachball.colorSpace = THREE.SRGBColorSpace;
    });


    // Options
    this.container = _options.container;
    this.startScreen = _options.startScreen;
    this.timerDisplay = _options.timerDisplay;
    this.progressDisplay = _options.progressDisplay;
    this.speedDisplay = _options.speedDisplay;
    this.posDisplay = _options.posDisplay;
    this.finalMessage = _options.finalMessage;
    this.scoreboardRefs = _options.scoreboardRefs;
    this.uiRace = _options.uiRace;

    this.onFinish = _options.onFinish;

    this.hasSavedScore = false;

    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    // Puntos de la ruta (Path) para definir el circuito
    this.pathPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 100),
      new THREE.Vector3(40, 0, 150),
      new THREE.Vector3(80, 0, 200),
      new THREE.Vector3(80, 0, 300),
      new THREE.Vector3(120, 0, 350),
      new THREE.Vector3(80, 0, 400),
      new THREE.Vector3(20, 0, 450),
      new THREE.Vector3(-40, 0, 550),
      new THREE.Vector3(-40, 0, 650),
      new THREE.Vector3(-80, 0, 700),
      new THREE.Vector3(-40, 0, 750),
      new THREE.Vector3(0, 0, 850),
      new THREE.Vector3(0, 0, 1000) // Entrada al Estadio
    ];
    this.curve = new THREE.CatmullRomCurve3(this.pathPoints);

    this.roadWidth = 12;
    this.keys = {};
    this.obstacles = [];

    this.player = {
      velocity: 0,
      rotation: 0,
      acceleration: 0.005,
      deceleration: 0.985,
      maxSpeed: 0.55,
      turnSpeed: 0.04
    }

    this.ai = {
      velocity: 0.0003,
      progress: 0
    }

    
    this.loaderManager.onLoad = () => {
      this.init();
      this.animate();
    };


    // Event Listeners
    window.addEventListener('keydown', e => this.keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', e => this.keys[e.key.toLowerCase()] = false);
    // window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0E1A45);
    this.scene.fog = new THREE.Fog(0x0E1A45, 60, 250);

    this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1500);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0x4455ff, 1.2);
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    this.scene.add(sunLight);

    this.createCityWorld();
    this.createFootballStadium();
    this.createBikes();
    this.createObstacles();
  }

  createCityWorld() {
    const groundGeo = new THREE.PlaneGeometry(3000, 3000);
    const groundMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    this.scene.add(ground);

    const roadPoints = this.curve.getPoints(300);
    for(let i = 0; i < roadPoints.length - 1; i++) {
        const p1 = roadPoints[i];
        const p2 = roadPoints[i+1];
        
        const segmentDir = new THREE.Vector3().subVectors(p2, p1);
        const len = segmentDir.length();
        const segmentGeo = new THREE.PlaneGeometry(this.roadWidth * 2, len + 0.5);
        const segmentMat = new THREE.MeshPhongMaterial({ color: 0x656565 });
        const segment = new THREE.Mesh(segmentGeo, segmentMat);
        
        segment.position.copy(p1).add(segmentDir.multiplyScalar(0.5));
        segment.position.y = 0.05;
        segment.lookAt(p2.x, 0.05, p2.z);
        segment.rotateX(-Math.PI/2);
        this.scene.add(segment);

        const angle = Math.atan2(p2.x - p1.x, p2.z - p1.z);
        const perpX = Math.cos(angle) * this.roadWidth;
        const perpZ = -Math.sin(angle) * this.roadWidth;

        // Muros
        const wallMat = new THREE.MeshPhongMaterial({ color: 0x777777 });
        const wallGeo = new THREE.BoxGeometry(0.5, 1.2, len + 0.1);
        
        const leftWall = new THREE.Mesh(wallGeo, wallMat);
        leftWall.position.set(segment.position.x - perpX, 0.6, segment.position.z - perpZ);
        leftWall.rotation.y = angle;
        this.scene.add(leftWall);

        const rightWall = new THREE.Mesh(wallGeo, wallMat);
        rightWall.position.set(segment.position.x + perpX, 0.6, segment.position.z + perpZ);
        rightWall.rotation.y = angle;
        this.scene.add(rightWall);

        if(i % 10 === 0 && i < roadPoints.length - 20) {
            this.createBuilding(segment.position.x - perpX * 3, segment.position.z - perpZ * 3);
            this.createBuilding(segment.position.x + perpX * 3, segment.position.z + perpZ * 3);
            this.createPalmTree(segment.position.x - perpX * 1.5, segment.position.z - perpZ * 1.5);
        }
    }
  }

  createBuilding(x, z) {
    const h = 15 + Math.random() * 40;
    const w = 15;
    const colors = [0xe2bc9b, 0xd4a373, 0xccd5ae, 0xf5ebe0];
    const mat = new THREE.MeshPhongMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat);
    b.position.set(x, h/2, z);
    this.scene.add(b);
  }

  createPalmTree(x, z) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 6), new THREE.MeshPhongMaterial({ color: 0x6e4a2e }));
    trunk.position.y = 3; group.add(trunk);
    group.position.set(x, 0, z);
    this.scene.add(group);
  }

  createFootballStadium() {
    const stadiumPos = this.pathPoints[this.pathPoints.length - 1].clone();
    stadiumPos.z += 50; // Posicionar el centro del campo después de la meta

    const stadiumGroup = new THREE.Group();

    // Césped
    const fieldGeo = new THREE.PlaneGeometry(100, 150);
    const fieldMat = new THREE.MeshPhongMaterial({ color: 0x2e7d32 });
    const field = new THREE.Mesh(fieldGeo, fieldMat);
    field.rotation.x = -Math.PI / 2;
    field.position.y = 0.1;
    stadiumGroup.add(field);

    // Líneas blancas del campo
    const linesGeo = new THREE.PlaneGeometry(98, 1);
    const linesMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const midLine = new THREE.Mesh(linesGeo, linesMat);
    midLine.rotation.x = -Math.PI / 2;
    midLine.position.y = 0.12;
    stadiumGroup.add(midLine);

    // Portería (Final)
    const goalGroup = new THREE.Group();
    const postGeo = new THREE.CylinderGeometry(0.2, 0.2, 8);
    const postMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const postL = new THREE.Mesh(postGeo, postMat); postL.position.set(-10, 4, 70); goalGroup.add(postL);
    const postR = new THREE.Mesh(postGeo, postMat); postR.position.set(10, 4, 70); goalGroup.add(postR);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(20, 0.4, 0.4), postMat); bar.position.set(0, 8, 70); goalGroup.add(bar);
    stadiumGroup.add(goalGroup);

    // Gradas (Bloques laterales)
    const standGeo = new THREE.BoxGeometry(30, 20, 150);
    const standMat = new THREE.MeshPhongMaterial({ map: this.textures.graderia }); // Azul Barcelona
    const standL = new THREE.Mesh(standGeo, standMat); standL.position.set(-65, 10, 0); stadiumGroup.add(standL);
    const standR = new THREE.Mesh(standGeo, standMat); standR.position.set(65, 10, 0); stadiumGroup.add(standR);

    stadiumGroup.position.copy(stadiumPos);
    this.scene.add(stadiumGroup);

    // Cartel de Meta
    const lastPoint = this.pathPoints[this.pathPoints.length - 1];
    const metaBanner = new THREE.Mesh(new THREE.BoxGeometry(this.roadWidth*2, 5, 0.5), new THREE.MeshPhongMaterial({map: this.textures.tarr}));
    metaBanner.position.set(lastPoint.x, 15, lastPoint.z);
    this.scene.add(metaBanner);
  }

  createBikes() {
    this.playerBike = this.models.player;
    this.playerBike.position.set(2, 0, 0);
    this.scene.add(this.playerBike);

    this.aiBike = this.models.demi;
    this.aiBike.position.set(-2, 0, 0);
    this.scene.add(this.aiBike);

    // --- AÑADIR ESCUDO SOBRE LA IA ---
    const shieldGeo = new THREE.PlaneGeometry(2, 2); // Ajusta el tamaño
    const shieldMat = new THREE.MeshStandardMaterial({
      map: this.textures.demi,
      side: THREE.DoubleSide ,
      transparent: true,
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);

    // Posicionarlo arriba de la bici (eje Y)
    shieldMesh.position.set(0, 5, 0); 
    
    // Añadirlo como hijo de la aiBike
    this.aiBike.add(shieldMesh);
  }

  createObstacles() {
    const obstacleGeo = new THREE.PlaneGeometry(4, 4);
    const obstacleMat1 = new THREE.MeshPhongMaterial({ 
        map: this.textures.wildpork, 
        side: THREE.DoubleSide,
        transparent: true,
    });
    const obstacleMat2 = new THREE.MeshPhongMaterial({ 
        map: this.textures.girls, 
        side: THREE.DoubleSide,
        transparent: true,
    });
    const obstacleMat3 = new THREE.MeshPhongMaterial({ 
        map: this.textures.beachball, 
        side: THREE.DoubleSide,
        transparent: true,
    });

    // Creamos 15 obstáculos a lo largo del recorrido
    for (let i = 0; i < 15; i++) {
        // Obtenemos un punto aleatorio de la curva (entre el 10% y el 90% del trayecto)
        const t = 0.1 + Math.random() * 0.8;
        const pos = this.curve.getPoint(t);
        const lookAt = this.curve.getPoint(t + 0.01);
        const randomMat = Math.random() < 0.33 ? obstacleMat1 : Math.random() < 0.66 ? obstacleMat2 : obstacleMat3;

        const obstacle = new THREE.Mesh(obstacleGeo, randomMat);
        
        // Posición base en la curva
        obstacle.position.copy(pos);
        obstacle.position.y = 2; // Elevado para que se vea como una valla

        // Orientación: que mire hacia la carretera
        obstacle.lookAt(lookAt);

        // Desplazamiento lateral aleatorio para que no estén todos en el centro
        const sideOffset = (Math.random() - 0.5) * (this.roadWidth * 1.5);
        
        // Calcular vector perpendicular para el desplazamiento lateral
        const angle = Math.atan2(lookAt.x - pos.x, lookAt.z - pos.z);
        obstacle.position.x += Math.cos(angle) * sideOffset;
        obstacle.position.z -= Math.sin(angle) * sideOffset;

        this.scene.add(obstacle);
        this.obstacles.push(obstacle);
    }
  }

  startRace() {
    this.startScreen.style.display = 'none';
    this.uiRace.style.display = 'flex';
    this.startTime = Date.now();
    this.gameState = 'racing';

  }

  getClosestPathPoint(pos) {
    let minDist = Infinity;
    let closest = null;
    for(let t = 0; t <= 1; t += 0.001) {
        const p = this.curve.getPoint(t);
        const d = p.distanceTo(pos);
        if(d < minDist) { minDist = d; closest = p; }
    }
    return { point: closest, distance: minDist };
  }

  updatePhysics() {
    if (this.gameState !== 'racing' && this.gameState !== 'finished') return;

    if (this.gameState === 'racing') {
      if (this.keys['arrowup'] || this.keys['w']) this.player.velocity += this.player.acceleration;
      if (this.keys['arrowdown'] || this.keys['s']) this.player.velocity -= this.player.acceleration;
      this.player.velocity *= this.player.deceleration;
      if (this.player.velocity > this.player.maxSpeed) this.player.velocity = this.player.maxSpeed;

      if (this.keys['arrowleft'] || this.keys['a']) this.player.rotation += this.player.turnSpeed;
      if (this.keys['arrowright'] || this.keys['d']) this.player.rotation -= this.player.turnSpeed;

      const oldPos = this.playerBike.position.clone();
      this.playerBike.rotation.y = this.player.rotation;
      this.playerBike.translateZ(this.player.velocity);

      // Colisiones con obstáculos
      for (const obstacle of this.obstacles) {
        const dist = this.playerBike.position.distanceTo(obstacle.position);
        if (dist < 3) { // Radio de colisión
            this.playerBike.position.copy(oldPos); // Volver atrás
            this.player.velocity = -0.1; // Rebote suave o frenazo
            // Opcional: podrías añadir un efecto visual aquí
        }
    }

      const collision = this.getClosestPathPoint(this.playerBike.position);
      if(collision.distance > this.roadWidth - 1 && this.playerBike.position.z < 1000) {
          this.playerBike.position.copy(oldPos);
          this.player.velocity *= 0.7;
      }

      // IA
      this.ai.progress += this.ai.velocity; 
      if (this.ai.progress > 1) this.ai.progress = 1;
      const aiPos = this.curve.getPoint(this.ai.progress);
      const aiLookAt = this.curve.getPoint(Math.min(1, this.ai.progress + 0.01));
      this.aiBike.position.copy(aiPos);
      this.aiBike.lookAt(aiLookAt);
      this.aiBike.position.x -= 2;

      // Cámara dinámica
      const camOffset = new THREE.Vector3(0, 5, -12);
      camOffset.applyQuaternion(this.playerBike.quaternion);
      this.camera.position.lerp(this.playerBike.position.clone().add(camOffset), 0.1);
      this.camera.lookAt(this.playerBike.position.x, 1, this.playerBike.position.z + 2);

      this.checkStatus();
    } else if (this.gameState === 'finished') {
      // Sigue moviéndose un poco por inercia dentro del campo
      this.player.velocity *= 0.98;
      this.playerBike.translateZ(this.player.velocity);
      this.camera.lookAt(this.playerBike.position);
    }

    this.updateUI();
  }

  checkStatus() {
    const lastPoint = this.pathPoints[this.pathPoints.length-1];
    if (this.playerBike.position.z > lastPoint.z) {
        this.gameState = 'finished';
        const total = Date.now() - this.startTime;

        // UI
        this.scoreboardRefs.forEach(ref => {
          ref.style.display = 'none';
        });
        this.finalMessage.style.display = 'flex';
        this.uiRace.style.pointerEvents = 'auto';
        this.finalMessage.innerHTML = `
        ¡LLEGASTE TARDE!
        <br>
        <span class='text-2xl font-normal'>Entraste al estadio en: ${this.formatTime(total)}</span>
        <br>
        <button onclick="window.location.reload()">Volver a intentarlo</button>
        `;

        // GUARDAR EN SUPABASE
        if (this.onFinish) {
          this.onFinish(total);
        }
    }
  }

  formatTime(ms) {
    return new Date(ms).toISOString().substr(14, 8);
  }

  updateUI() {
    if (this.gameState === 'racing' && this.playerBike) {
      this.timerDisplay.innerText = this.formatTime(Date.now() - this.startTime);
      const prog = Math.min(100, Math.floor((this.playerBike.position.z / 1000) * 100));
      this.progressDisplay.innerText = `${prog}%`;
    }
    this.speedDisplay.innerText = Math.floor(this.player.velocity * 200);
    let pos = this.playerBike.position.z >= this.aiBike.position.z ? "1º" : "2º";
    this.posDisplay.innerText = pos;
  }

  handleJoystick(degree, force, isEnd = false) {
    if (isEnd) {
        this.keys['w'] = false;
        this.keys['s'] = false;
        this.keys['a'] = false;
        this.keys['d'] = false;
        return;
    }

    // Normalized force (nipplejs force can go above 1)
    const normalizedForce = Math.min(force, 0.5);

    // 1. Acceleration / Reversing
    // Forward is roughly between 20 and 160 degrees
    this.keys['w'] = (degree > 20 && degree < 160);
    // Backward is roughly between 200 and 340 degrees
    this.keys['s'] = (degree > 200 && degree < 340);

    // 2. Turning (Smooth Steering)
    // If the joystick is pushed left (90-270) or right
    if (degree > 110 && degree < 250) {
        // Left
        this.player.rotation += this.player.turnSpeed * (normalizedForce * 0.8);
    } else if (degree < 70 || degree > 290) {
        // Right
        this.player.rotation -= this.player.turnSpeed * (normalizedForce * 0.8);
    }

    // 3. Optional: Speed boost based on how far the stick is pushed
    if (this.keys['w']) {
        this.player.velocity += this.player.acceleration * normalizedForce;
    }
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.updatePhysics();
    this.renderer.render(this.scene, this.camera);
  }
}