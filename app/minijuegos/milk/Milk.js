import * as THREE from 'three';
import { gsap } from 'gsap';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'; // Add this

export default class Milk {
  constructor(_options = {}) {
    this.options = _options;
    this._destroyed = false;

    // Estado del juego
    this.playerMilk = 0;
    this.eduMilk = 0;
    this.isGameRunning = false;
    this.timeLeft = 30.0;

    // Constantes de balance
    this.PLAYER_SIP_VALUE = 1;
    this.EDU_BASE_SPEED = 0.1;

    // Referencias Three.js
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // Objetos 3D
    this.milkGlass = null;
    this.milkLiquid = null;
    this.milkSurface = null;
    this.edu = null;
    this.eduHead = null;
    this.eduRightArm = null;

    this.textures = {};
    this.loaderManager = new THREE.LoadingManager();
    this.loadertextures = new THREE.TextureLoader(this.loaderManager);
    this.loadertextures.load('/minijuegos/milk/edu.png', (texture) => {
      this.textures.edu = texture;
      this.textures.edu.colorSpace = THREE.SRGBColorSpace;
    });
    this.loadertextures.load('/minijuegos/milk/stadium.jpg', (texture) => {
      this.textures.stadium = texture;
      this.textures.stadium.colorSpace = THREE.SRGBColorSpace;
    });

    // Inicialización
    this.loaderManager.onLoad = () => {
      this.initThree();
      this.createEnvironment();
      this.createEdu();
      this.createPlayerGear();
      this.setupEvents();
      this.startAmbientAnimations();
      this.startEduDrinkAnimation();

      // Iniciar loop
      this.animate();
    };
  }

  // ─── Three.js setup ────────────────────────────────────────────────────────

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020202);
    this.scene.fog = new THREE.Fog(0x020202, 2, 30);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.set(0, 1.7, 0);
    this.camera.rotation.x = -0.1;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const container = this.options.container;
    const w = container ? container.clientWidth : window.innerWidth;
    const h = container ? container.clientHeight : window.innerHeight;

    this.renderer.setSize(w || window.innerWidth, h || window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.camera.aspect = (w || window.innerWidth) / (h || window.innerHeight);
    this.camera.updateProjectionMatrix();

    if (container) {
      container.appendChild(this.renderer.domElement);
    } else {
      document.body.appendChild(this.renderer.domElement);
    }

    // ─── INITIALIZE ORBIT CONTROLS ───
    /* this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; // Smooth movement
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 1.2, -2); // Look towards Edu */
  }

  createEnvironment() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    const keyLight = new THREE.DirectionalLight(0xfff5e0, 2.5);
    keyLight.position.set(-3, 6, 3);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x4488ff, 1.2, 25);
    fillLight.position.set(4, 3, -2);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x6633ff, 1.0, 20);
    rimLight.position.set(0, 4, -8);
    this.scene.add(rimLight);

    // Light that travels with the camera — illuminates the player's glass
    const glassLight = new THREE.PointLight(0xffffff, 3, 2);
    glassLight.position.set(0.6, 0.2, -0.5);
    this.camera.add(glassLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ color: 0x2d5a2d, roughness: 0.9 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(25, 17),
      new THREE.MeshStandardMaterial({ map: this.textures.stadium }),
    );
    wall.position.set(0, 8, -15);
    this.scene.add(wall);
    this.scene.add(new THREE.GridHelper(40, 40, 0x1a1a1a, 0x111111));
  }

  // ─── EDU character ─────────────────────────────────────────────────────────

  createEdu() {
    const eduGroup = new THREE.Group();

    // Shared materials
    const skinMat = new THREE.MeshPhongMaterial({ color: 0xf5c5a0 });
    const shirtMat = new THREE.MeshPhongMaterial({ color: 0xcb598c });
    const pantsMat = new THREE.MeshPhongMaterial({ color: 0x1e293b });
    const shoeMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
    const headMat = new THREE.MeshPhongMaterial({
      map: this.textures.edu,
      transparent: true,
    });

    // ── HEAD GROUP (pivot at center, y=1.95) ──────────────────────────────
    this.eduHead = new THREE.Group();
    this.eduHead.position.set(-0.05, 2.1, 0);

    const head = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.75, 1, 1),
      headMat,
    );
    this.eduHead.add(head);
    eduGroup.add(this.eduHead);

    // ── TORSO ────────────────────────────────────────────────────────────
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.64, 0.28),
      shirtMat,
    );
    torso.position.set(0, 1.48, 0);
    torso.castShadow = true;
    eduGroup.add(torso);

    // ── HIPS ─────────────────────────────────────────────────────────────
    const hips = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.2, 0.26),
      pantsMat,
    );
    hips.position.set(0, 1.14, 0);
    eduGroup.add(hips);

    // ── LEGS ─────────────────────────────────────────────────────────────
    [
      [-0.15, 'left'],
      [0.15, 'right'],
    ].forEach(([x]) => {
      const thigh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.09, 0.48, 12),
        pantsMat,
      );
      thigh.position.set(x, 0.88, 0);
      thigh.castShadow = true;
      eduGroup.add(thigh);

      const shin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.08, 0.44, 12),
        pantsMat,
      );
      shin.position.set(x, 0.43, 0);
      eduGroup.add(shin);

      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 0.08, 0.26),
        shoeMat,
      );
      foot.position.set(x, 0.19, 0.04);
      eduGroup.add(foot);
    });

    // ── LEFT ARM (relaxed at side) ────────────────────────────────────────
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.35, 1.76, 0);
    leftArm.rotation.z = 0.12;

    const lUpperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.074, 0.37, 12),
      shirtMat,
    );
    lUpperArm.position.y = -0.185;
    leftArm.add(lUpperArm);

    const lForearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.064, 0.33, 12),
      skinMat,
    );
    lForearm.position.y = -0.52;
    leftArm.add(lForearm);

    const lHand = new THREE.Mesh(
      new THREE.SphereGeometry(0.072, 10, 8),
      skinMat,
    );
    lHand.position.y = -0.7;
    leftArm.add(lHand);

    eduGroup.add(leftArm);

    // ── RIGHT ARM (drinking arm — pivot at shoulder) ───────────────────────
    this.eduRightArm = new THREE.Group();
    this.eduRightArm.position.set(0.35, 1.76, 0);
    this.eduRightArm.rotation.z = -0.12;

    const rUpperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.074, 0.37, 12),
      shirtMat,
    );
    rUpperArm.position.y = -0.185;
    this.eduRightArm.add(rUpperArm);

    const rForearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.064, 0.33, 12),
      skinMat,
    );
    rForearm.position.y = -0.52;
    this.eduRightArm.add(rForearm);

    const rHand = new THREE.Mesh(
      new THREE.SphereGeometry(0.072, 10, 8),
      skinMat,
    );
    rHand.position.y = -0.7;
    this.eduRightArm.add(rHand);

    // EDU's mini glass — held in right hand
    const eduGlass = this._buildEduGlass();
    eduGlass.position.set(0, -0.76, 0.04);
    this.eduRightArm.add(eduGlass);

    eduGroup.add(this.eduRightArm);

    this.edu = eduGroup;
    this.edu.position.set(0, 0, -5);
    this.scene.add(this.edu);
  }

  _buildEduGlass() {
    const group = new THREE.Group();
    const H = 0.12,
      R_TOP = 0.034,
      R_BOT = 0.025,
      SEGS = 16;

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xd8eeff,
      transmission: 0.9,
      roughness: 0.05,
      ior: 1.5,
      thickness: 0.1,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    group.add(
      new THREE.Mesh(
        new THREE.CylinderGeometry(R_TOP, R_BOT, H, SEGS, 1, true),
        glassMat,
      ),
    );

    const bottom = new THREE.Mesh(
      new THREE.CircleGeometry(R_BOT, SEGS),
      glassMat,
    );
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = -H / 2;
    group.add(bottom);

    const milk = new THREE.Mesh(
      new THREE.CylinderGeometry(R_TOP * 0.86, R_BOT * 0.86, H * 0.84, SEGS),
      new THREE.MeshPhongMaterial({ color: 0xfdf6e4 }),
    );
    milk.position.y = -H * 0.08;
    group.add(milk);

    return group;
  }

  // ─── Player glass ──────────────────────────────────────────────────────────

  createPlayerGear() {
    const glassGroup = new THREE.Group();
    this.milkLevel = 1.0;
    this.targetMilkLevel = 1.0;

    const GLASS_H = 0.46;
    const GLASS_R_TOP = 0.13;
    const GLASS_R_BOT = 0.095;
    const GLASS_BOT_Y = -GLASS_H / 2;
    const GLASS_TOP_Y = GLASS_H / 2;
    const WALL_T = 0.008;
    const SEGS = 64;

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xd8eeff,
      metalness: 0.0,
      roughness: 0.04,
      transmission: 0.94,
      thickness: 0.55,
      ior: 1.5,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      depthWrite: false,
      envMapIntensity: 1.0,
    });

    glassGroup.add(
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          GLASS_R_TOP,
          GLASS_R_BOT,
          GLASS_H,
          SEGS,
          1,
          true,
        ),
        glassMat,
      ),
    );

    const glassBottom = new THREE.Mesh(
      new THREE.CircleGeometry(GLASS_R_BOT, SEGS),
      glassMat,
    );
    glassBottom.rotation.x = -Math.PI / 2;
    glassBottom.position.y = GLASS_BOT_Y;
    glassGroup.add(glassBottom);

    const rimMat = new THREE.MeshPhysicalMaterial({
      color: 0xe8f4ff,
      metalness: 0.05,
      roughness: 0.02,
      transmission: 0.88,
      thickness: 0.3,
      ior: 1.5,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(GLASS_R_TOP - WALL_T, WALL_T * 1.4, 12, SEGS),
      rimMat,
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = GLASS_TOP_Y;
    glassGroup.add(rim);

    const baseRing = new THREE.Mesh(
      new THREE.TorusGeometry(GLASS_R_BOT + 0.005, WALL_T * 1.5, 8, SEGS),
      rimMat,
    );
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = GLASS_BOT_Y;
    glassGroup.add(baseRing);

    glassGroup.add(
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          GLASS_R_TOP - WALL_T * 2,
          GLASS_R_BOT - WALL_T * 2,
          GLASS_H - WALL_T,
          SEGS,
          1,
          true,
        ),
        new THREE.MeshPhysicalMaterial({
          color: 0xd0eaff,
          roughness: 0.02,
          transmission: 0.96,
          thickness: 0.1,
          ior: 1.5,
          transparent: true,
          opacity: 0.5,
          side: THREE.BackSide,
          depthWrite: false,
        }),
      ),
    );

    const MILK_FULL_H = GLASS_H * 0.87;
    const MILK_R_TOP = GLASS_R_TOP - WALL_T * 2.5;
    const MILK_R_BOT = GLASS_R_BOT - WALL_T * 2.5;

    this.milkLiquid = new THREE.Mesh(
      new THREE.CylinderGeometry(MILK_R_TOP, MILK_R_BOT, MILK_FULL_H, SEGS),
      new THREE.MeshPhysicalMaterial({
        color: 0xfdf6e4,
        roughness: 0.1,
        transmission: 0.04,
        thickness: 0.3,
        ior: 1.34,
      }),
    );
    this.milkLiquid.position.y = GLASS_BOT_Y + MILK_FULL_H / 2;
    glassGroup.add(this.milkLiquid);

    this.milkSurface = new THREE.Mesh(
      new THREE.CircleGeometry(MILK_R_TOP * 0.97, SEGS),
      new THREE.MeshPhysicalMaterial({
        color: 0xfefefe,
        roughness: 0.8,
        metalness: 0.0,
        thickness: 0.05,
      }),
    );
    this.milkSurface.rotation.x = -Math.PI / 2;
    this.milkSurface.position.y = GLASS_BOT_Y + MILK_FULL_H + 0.001;
    glassGroup.add(this.milkSurface);

    this._gc = { GLASS_BOT_Y, MILK_FULL_H };

    this.milkGlass = glassGroup;
    this.camera.add(this.milkGlass);
    this.milkGlass.position.set(0.35, -0.4, -0.6);
    this.milkGlass.rotation.set(-0.2, -0.1, 0);
    this.scene.add(this.camera);
  }

  _updateMilkLevel() {
    const { GLASS_BOT_Y, MILK_FULL_H } = this._gc;
    const h = MILK_FULL_H * this.milkLevel;
    this.milkLiquid.scale.y = this.milkLevel;
    this.milkLiquid.position.y = GLASS_BOT_Y + h / 2;
    this.milkSurface.position.y = GLASS_BOT_Y + h + 0.001;
  }

  // ─── Animations ────────────────────────────────────────────────────────────

  startAmbientAnimations() {
    // EDU body sway
    gsap.to(this.edu.position, {
      x: 0.5,
      duration: 1.8,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
    gsap.to(this.edu.rotation, {
      z: 0.04,
      duration: 1.3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    // Camera breathing
    gsap.to(this.camera.position, {
      y: 1.712,
      duration: 1.1,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    // Player glass idle sway
    gsap.to(this.milkGlass.rotation, {
      y: 0.035,
      duration: 2.2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    // Milk surface ripple
    gsap.to(this.milkSurface.rotation, {
      z: 0.013,
      duration: 0.28,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }

  startEduDrinkAnimation() {
    const drinkCycle = () => {
      if (this._destroyed) return;

      gsap
        .timeline({ onComplete: drinkCycle })
        // Raise right arm — glass swings up toward face
        .to(this.eduRightArm.rotation, {
          x: -1.75,
          duration: 0.45,
          ease: 'power2.inOut',
        })
        // Head tilts back to drink
        .to(
          this.eduHead.rotation,
          { x: 0.3, duration: 0.35, ease: 'power2.inOut' },
          '-=0.25',
        )
        // Hold & gulp
        .to({}, { duration: 0.8 })
        // Head returns
        .to(this.eduHead.rotation, {
          x: 0,
          duration: 0.3,
          ease: 'power2.inOut',
        })
        // Lower arm
        .to(
          this.eduRightArm.rotation,
          { x: 0, duration: 0.5, ease: 'power2.inOut' },
          '-=0.18',
        )
        // Rest before next sip
        .to({}, { duration: 0.45 });
    };

    gsap.delayedCall(1.0, drinkCycle);
  }

  // ─── Events & input ────────────────────────────────────────────────────────

  setupEvents() {
    this._onResize = () => this.onResize();
    this._onKeydown = (e) => {
      if (e.code === 'Space') e.preventDefault();
    };
    this._onKeyup = (e) => {
      if (e.code === 'Space' && this.isGameRunning) this.drink();
    };

    window.addEventListener('resize', this._onResize);
    window.addEventListener('keydown', this._onKeydown);
    window.addEventListener('keyup', this._onKeyup);

    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      this._onStart = () => this.startMatch();
      startBtn.addEventListener('click', this._onStart);
    }
  }

  // ─── Game logic ────────────────────────────────────────────────────────────

  drink() {
    this.playerMilk += this.PLAYER_SIP_VALUE;

    const newLevel = Math.max(0.05, this.milkLevel - 0.004);
    gsap.to(this, {
      milkLevel: newLevel,
      duration: 1.8,
      ease: 'power2.out',
      overwrite: 'auto',
      onUpdate: () => this._updateMilkLevel(),
    });

    // Glass tilt
    gsap.killTweensOf(this.milkGlass.rotation, 'x');
    gsap
      .timeline()
      .to(this.milkGlass.rotation, {
        x: 1.0,
        duration: 0.06,
        ease: 'power3.out',
      })
      .to(this.milkGlass.rotation, {
        x: -0.2,
        duration: 0.22,
        ease: 'elastic.out(1, 0.5)',
      });

    // Camera jolt
    gsap.killTweensOf(this.camera.position, 'z');
    gsap
      .timeline()
      .to(this.camera.position, {
        z: 0.015,
        duration: 0.04,
        ease: 'power4.out',
      })
      .to(this.camera.position, { z: 0, duration: 0.18, ease: 'power2.in' });

    this.updateUI();
  }

  startMatch() {
    document.getElementById('overlay').classList.add('hidden');
    this.playerMilk = 0;
    this.eduMilk = 0;
    this.timeLeft = 30.0;
    this.isGameRunning = true;
    this.targetMilkLevel = 1.0;

    gsap.to(this, {
      milkLevel: 1.0,
      duration: 0.6,
      ease: 'power2.out',
      onUpdate: () => this._updateMilkLevel(),
    });

    this.clock.getDelta();
  }

  onResize() {
    const container = this.options.container;
    const w = container ? container.clientWidth : window.innerWidth;
    const h = container ? container.clientHeight : window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  updateUI() {
    document.getElementById('player-score').innerText = Math.floor(
      this.playerMilk,
    );
    document.getElementById('edu-score').innerText = Math.floor(this.eduMilk);

    const total = this.playerMilk + this.eduMilk;
    const ratio = total > 0 ? (this.playerMilk / total) * 100 : 50;
    document.getElementById('player-power-bar').style.width = ratio + '%';

    const timerEl = document.getElementById('timer-display');
    timerEl.innerText = this.timeLeft.toFixed(1);
    timerEl.classList.toggle('timer-low', this.timeLeft < 7);
  }

  endMatch() {
    this.isGameRunning = false;
    const playerWon = this.playerMilk > this.eduMilk;

    const overlay = document.getElementById('overlay');
    overlay.classList.remove('hidden');

    document.getElementById('main-title').innerText = playerWon
      ? '¡GANASTE!'
      : 'PERDISTE';
    document.getElementById('sub-title').innerText = playerWon
      ? `${Math.floor(this.playerMilk)}L vs ${Math.floor(this.eduMilk)}L`
      : `${Math.floor(this.eduMilk)}L vs ${Math.floor(this.playerMilk)}L`;

    overlay.querySelector('p').innerText = playerWon
      ? 'Eres una leyenda de los lácteos.'
      : 'EDU fue demasiado rápido esta vez. Se ha bebido hasta sus propias lágrimas recordando los abrazos de Punch.';

    document.getElementById('start-btn').innerText = 'OTRA VEZ (30s)';

    if (typeof this.options.onMatchEnd === 'function') {
      this.options.onMatchEnd(this.playerMilk);
    }
  }

  animate() {
    this._animId = requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();

    if (this.controls) this.controls.update();

    if (this.isGameRunning) {
      this.timeLeft -= delta;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.updateUI();
        this.endMatch();
        return;
      }

      const difficultyScale = 1 + ((30 - this.timeLeft) / 30) * 0.5;
      this.eduMilk +=
        (this.EDU_BASE_SPEED / 60) * difficultyScale + Math.random() * 0.08;

      this.updateUI();
    }

    this.renderer.render(this.scene, this.camera);
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────────

  destroy() {
    this._destroyed = true;
    cancelAnimationFrame(this._animId);

    gsap.killTweensOf([
      this.edu?.position,
      this.edu?.rotation,
      this.eduHead?.rotation,
      this.eduRightArm?.rotation,
      this.camera.position,
      this.milkGlass.rotation,
      this.milkSurface.rotation,
      this,
    ]);

    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('keydown', this._onKeydown);
    window.removeEventListener('keyup', this._onKeyup);

    const startBtn = document.getElementById('start-btn');
    if (startBtn && this._onStart)
      startBtn.removeEventListener('click', this._onStart);

    if (this.renderer) {
      this.renderer.domElement.parentNode?.removeChild(
        this.renderer.domElement,
      );
      this.renderer.dispose();
    }

    if (this.controls) this.controls.dispose();
  }
}
