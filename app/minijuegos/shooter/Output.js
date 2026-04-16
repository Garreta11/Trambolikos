import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default class Output {
  constructor(_options = {}) {
    this.options = _options;
    this.container = _options.container;

    // Callbacks
    this.onScoreChange = _options.onScoreChange || (() => {});
    this.onKillsChange = _options.onKillsChange || (() => {});
    this.onAmmoChange = _options.onAmmoChange || (() => {});
    this.onTimerChange = _options.onTimerChange || (() => {});
    this.onReloadChange = _options.onReloadChange || (() => {});
    this.onGameOver = _options.onGameOver || (() => {});
    this.onLock = _options.onLock || (() => {});
    this.onUnlock = _options.onUnlock || (() => {});

    this.models = {};
    this.textures = {};
    this.loaderManager = new THREE.LoadingManager();
    this.loaderGLTF = new GLTFLoader(this.loaderManager);
    this.loadertextures = new THREE.TextureLoader(this.loaderManager);
    this.loaderGLTF.load('/minijuegos/shooter/valentina.glb', (gltf) => {
      this.models.valentina = gltf.scene;
    });
    this.loadertextures.load('/minijuegos/shooter/valentina.png', (texture) => {
      this.textures.valentina = texture;
      this.textures.valentina.colorSpace = THREE.SRGBColorSpace;
    });

    // Game state
    this.ammo = 30;
    this.maxAmmo = 30;
    this.score = 0;
    this.isGameOver = false;
    this.hitOverlay = null;
    this.GAME_DURATION = 30;
    this.timeLeft = this.GAME_DURATION;
    this.BOT_COUNT = 5;
    this.kills = 0;
    this._reloading = false;
    this._reloadProgress = 0;
    this.RELOAD_DURATION = 1.8;

    // Movement
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    // Jump / crouch
    this.isJumping = false;
    this.isCrouching = false;
    this.verticalVelocity = 0;
    this.STAND_HEIGHT = 1.7;
    this.CROUCH_HEIGHT = 0.85;
    this.JUMP_FORCE = 7;
    this.GRAVITY = 20;

    // Collections
    this.bots = [];
    this.bullets = [];
    this.botBullets = [];
    this.obstacles = [];

    this.prevTime = performance.now();
    this.fieldBounds = { minX: -48, maxX: 48, minZ: -28, maxZ: 28 };

    this.loaderManager.onLoad = () => {
      this._init();
    };
  }

  _init() {
    this._setupRenderer();
    this._setupScene();
    this._setupCamera();
    this._setupLights();
    this._setupField();
    this._setupObstacles();
    this._setupBots();
    this._setupControls();
    this._setupGun();
    this._setupEvents();
    this._animate();
  }

  // ─── Renderer ────────────────────────────────────────────────────────────────

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight,
    );
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 40, 120);
  }

  _setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      500,
    );
    this.camera.position.set(-44, 1.7, 0);
    this.camera.rotation.set(0, -Math.PI / 2, 0, 'YXZ'); // face toward center field
  }

  // ─── Lights ──────────────────────────────────────────────────────────────────

  _setupLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const sun = new THREE.DirectionalLight(0xfffbe8, 1.2);
    sun.position.set(60, 100, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -70,
      right: 70,
      top: 70,
      bottom: -70,
      near: 1,
      far: 300,
    });
    this.scene.add(sun);
  }

  // ─── Soccer field ────────────────────────────────────────────────────────────

  _setupField() {
    // Green grass
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 60),
      new THREE.MeshLambertMaterial({ color: 0x2e7d32 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Darker stripes (alternating)
    for (let i = -4; i <= 4; i++) {
      if (i % 2 === 0) continue;
      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 60),
        new THREE.MeshLambertMaterial({ color: 0x388e3c }),
      );
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(i * 10, 0.002, 0);
      this.scene.add(stripe);
    }

    this._addFieldMarkings();
    this._addGoal(-50);
    this._addGoal(50);
    this._addStands();
    this._addFloodlights();
  }

  _addFieldMarkings() {
    const mat = new THREE.LineBasicMaterial({ color: 0xffffff });

    const segs = [
      // Outer boundary
      [
        [-50, 30],
        [-50, -30],
      ],
      [
        [-50, -30],
        [50, -30],
      ],
      [
        [50, -30],
        [50, 30],
      ],
      [
        [50, 30],
        [-50, 30],
      ],
      // Center line
      [
        [0, 30],
        [0, -30],
      ],
      // Penalty area left
      [
        [-50, -20.15],
        [-33.5, -20.15],
      ],
      [
        [-33.5, -20.15],
        [-33.5, 20.15],
      ],
      [
        [-33.5, 20.15],
        [-50, 20.15],
      ],
      // Penalty area right
      [
        [50, -20.15],
        [33.5, -20.15],
      ],
      [
        [33.5, -20.15],
        [33.5, 20.15],
      ],
      [
        [33.5, 20.15],
        [50, 20.15],
      ],
      // Goal area left
      [
        [-50, -9.16],
        [-44.5, -9.16],
      ],
      [
        [-44.5, -9.16],
        [-44.5, 9.16],
      ],
      [
        [-44.5, 9.16],
        [-50, 9.16],
      ],
      // Goal area right
      [
        [50, -9.16],
        [44.5, -9.16],
      ],
      [
        [44.5, -9.16],
        [44.5, 9.16],
      ],
      [
        [44.5, 9.16],
        [50, 9.16],
      ],
    ];

    segs.forEach(([[x1, z1], [x2, z2]]) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x1, 0.02, z1),
        new THREE.Vector3(x2, 0.02, z2),
      ]);
      this.scene.add(new THREE.Line(geo, mat));
    });

    // Center circle
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * 9.15, 0.02, Math.sin(a) * 9.15));
    }
    this.scene.add(
      new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat),
    );

    // Center spot
    const spotGeo = new THREE.CircleGeometry(0.15, 16);
    const spotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const spot = new THREE.Mesh(spotGeo, spotMat);
    spot.rotation.x = -Math.PI / 2;
    spot.position.y = 0.022;
    this.scene.add(spot);
  }

  _addGoal(x) {
    const postMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

    const addCylinder = (px, py, pz, rx = 0, ry = 0, rz = 0, h = 2.44) => {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, h, 8),
        postMat,
      );
      mesh.position.set(px, py, pz);
      mesh.rotation.set(rx, ry, rz);
      mesh.castShadow = true;
      this.scene.add(mesh);
    };

    addCylinder(x, 1.22, -3.66); // left post
    addCylinder(x, 1.22, 3.66); // right post
    addCylinder(x, 2.44, 0, 0, Math.PI / 2, Math.PI / 2, 7.32); // crossbar

    // Net (simple back plane)
    const netGeo = new THREE.PlaneGeometry(7.32, 2.44);
    const netMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      wireframe: true,
    });
    const net = new THREE.Mesh(netGeo, netMat);
    net.position.set(x + (x < 0 ? 1.5 : -1.5), 1.22, 0);
    net.rotation.y = Math.PI / 2;
    this.scene.add(net);
  }

  _addStands() {
    const mat = new THREE.MeshLambertMaterial({ color: 0x8d6e63 });
    const configs = [
      { pos: [0, 4, -40], size: [108, 8, 10] },
      { pos: [0, 4, 40], size: [108, 8, 10] },
      { pos: [-58, 4, 0], size: [10, 8, 82] },
      { pos: [58, 4, 0], size: [10, 8, 82] },
    ];
    configs.forEach(({ pos, size }) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
      mesh.position.set(...pos);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    });
  }

  _addFloodlights() {
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x9e9e9e });
    const corners = [
      [-52, -32],
      [-52, 32],
      [52, -32],
      [52, 32],
    ];
    corners.forEach(([x, z]) => {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.4, 20, 6),
        poleMat,
      );
      pole.position.set(x, 10, z);
      pole.castShadow = true;
      this.scene.add(pole);

      const light = new THREE.PointLight(0xfff5e0, 0.8, 120);
      light.position.set(x, 20, z);
      this.scene.add(light);
    });
  }

  // ─── Obstacles ───────────────────────────────────────────────────────────────

  _setupObstacles() {
    const configs = [
      { pos: [12, 0.75, 6], size: [1.5, 1.5, 5], color: 0xc62828 },
      { pos: [-12, 0.75, -6], size: [1.5, 1.5, 5], color: 0xc62828 },
      { pos: [22, 0.75, -12], size: [5, 1.5, 1.5], color: 0x1565c0 },
      { pos: [-22, 0.75, 12], size: [5, 1.5, 1.5], color: 0x1565c0 },
      { pos: [5, 0.75, -18], size: [2, 1.5, 2], color: 0xf57f17 },
      { pos: [-5, 0.75, 18], size: [2, 1.5, 2], color: 0xf57f17 },
      { pos: [32, 0.75, 4], size: [1.5, 1.5, 7], color: 0x2e7d32 },
      { pos: [-32, 0.75, -4], size: [1.5, 1.5, 7], color: 0x2e7d32 },
      { pos: [18, 0.75, 18], size: [4, 1.5, 1.5], color: 0x4a148c },
      { pos: [-18, 0.75, -18], size: [4, 1.5, 1.5], color: 0x4a148c },
      { pos: [-26, 0.75, 0], size: [1.5, 1.5, 9], color: 0x880e4f },
      { pos: [26, 0.75, 0], size: [1.5, 1.5, 9], color: 0x880e4f },
      { pos: [0, 0.75, -10], size: [3, 1.5, 1.5], color: 0x004d40 },
      { pos: [0, 0.75, 10], size: [3, 1.5, 1.5], color: 0x004d40 },
      { pos: [38, 0.75, -18], size: [2, 1.5, 2], color: 0xe65100 },
      { pos: [-38, 0.75, 18], size: [2, 1.5, 2], color: 0xe65100 },
    ];

    configs.forEach(({ pos, size, color }) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(...size),
        new THREE.MeshLambertMaterial({ color }),
      );
      mesh.position.set(...pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.obstacles.push({ mesh, pos: new THREE.Vector3(...pos), size });
    });
  }

  // ─── Bots ────────────────────────────────────────────────────────────────────

  _setupBots() {
    for (let i = 0; i < this.BOT_COUNT; i++) {
      this._spawnBot(this._randomSpawnPos().toArray(), i);
    }
  }

  _randomSpawnPos() {
    const playerFlat = new THREE.Vector3(
      this.camera.position.x,
      0,
      this.camera.position.z,
    );
    let pos;
    let attempts = 0;
    do {
      pos = new THREE.Vector3(
        (Math.random() - 0.5) * 84,
        0,
        (Math.random() - 0.5) * 50,
      );
      attempts++;
    } while (
      attempts < 40 &&
      (!this._inBounds(pos) ||
        this._hitsObstacle(pos, 1) ||
        pos.distanceTo(playerFlat) < 12)
    );
    return pos;
  }

  _spawnBot(pos, id) {
    const group = new THREE.Group();

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1.0, 0.4),
      new THREE.MeshLambertMaterial({ color: 0xb71c1c }),
    );
    body.position.y = 0.5;
    body.castShadow = true;
    group.add(body);

    // Head
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.45, 0.45),
      new THREE.MeshLambertMaterial({ color: 0xffcc80 }),
    );
    head.position.y = 1.22;
    head.castShadow = true;
    group.add(head);

    // Gun
    const gun = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x212121 }),
    );
    gun.position.set(0.34, 0.9, -0.35);
    group.add(gun);

    // Health bar background
    const hBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.08),
      new THREE.MeshBasicMaterial({
        color: 0x333333,
        side: THREE.DoubleSide,
        depthTest: false,
      }),
    );
    hBarBg.position.y = 1.75;
    hBarBg.renderOrder = 1;
    group.add(hBarBg);

    // Health bar fill
    const hBar = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.08),
      new THREE.MeshBasicMaterial({
        color: 0x00e676,
        side: THREE.DoubleSide,
        depthTest: false,
      }),
    );
    hBar.position.set(-0.0, 1.75, 0.001);
    hBar.renderOrder = 2;
    group.add(hBar);

    group.position.set(...pos);
    this.scene.add(group);

    this.bots.push({
      id,
      group,
      body,
      head,
      hBar,
      hBarBg,
      health: 100,
      maxHealth: 100,
      alive: true,
      state: 'patrol', // patrol | chase | shoot | cover
      speed: 3 + Math.random() * 2,
      detectionRange: 30,
      shootRange: 22,
      shootCooldown: Math.random() * 2,
      shootInterval: 1.5 + Math.random(),
      patrolTarget: new THREE.Vector3(...pos),
      patrolCooldown: 0,
      strafeSide: 1,
      strafeCooldown: 0,
      coverTarget: null,
      coverCooldown: 0,
    });
  }

  // ─── Controls ────────────────────────────────────────────────────────────────

  _setupControls() {
    this.isLocked = false;
    this._euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this._sensitivity = 0.001;

    this.scene.add(this.camera);

    this._onPointerLockChange = () => {
      const locked = document.pointerLockElement != null;
      this.isLocked = locked;
      if (locked) {
        this.onLock();
      } else {
        this.onUnlock();
      }
    };

    this._onPointerLockError = () => {
      console.warn('Pointer lock error');
    };

    this._onMouseMove = (e) => {
      if (!this.isLocked) return;
      this._euler.setFromQuaternion(this.camera.quaternion);
      this._euler.y -= e.movementX * this._sensitivity;
      this._euler.x -= e.movementY * this._sensitivity;
      this._euler.x = Math.max(
        -Math.PI / 2 + 0.01,
        Math.min(Math.PI / 2 - 0.01, this._euler.x),
      );
      this.camera.quaternion.setFromEuler(this._euler);
    };

    document.addEventListener('pointerlockchange', this._onPointerLockChange);
    document.addEventListener('pointerlockerror', this._onPointerLockError);
    document.addEventListener('mousemove', this._onMouseMove);
  }

  // ─── Gun ─────────────────────────────────────────────────────────────────────

  _setupGun() {
    // Placeholder group added immediately so animations work before model loads
    this._gun = new THREE.Group();
    this._gunRest = new THREE.Vector3(0.2, -0.22, -0.38);
    this._gunRecoilT = 0;
    this._gunBobT = 0;
    this._gun.position.copy(this._gunRest);
    this.camera.add(this._gun);

    new GLTFLoader().load('/minijuegos/shooter/valentina.glb', (gltf) => {
      const model = gltf.scene;
      model.rotation.x = -Math.PI / 2;
      model.rotation.y = Math.PI / 2;
      model.rotation.z = 0.2;
      model.scale.setScalar(0.6);
      this._gun.add(model);
    });
  }

  _updateGun(delta) {
    if (!this._gun) return;

    // ── Reload animation ──────────────────────────────────────────────────────
    if (this._reloading) {
      const prev = this._reloadProgress;
      this._reloadProgress = Math.min(
        1,
        this._reloadProgress + delta / this.RELOAD_DURATION,
      );
      const t = this._reloadProgress;

      // Restore ammo at the halfway point (gun is fully down)
      if (prev < 0.5 && t >= 0.5) {
        this.ammo = this.maxAmmo;
        this.onAmmoChange(this.ammo);
      }

      if (t >= 1) {
        this._reloading = false;
        this._reloadProgress = 0;
        this.onReloadChange(false);
      }

      // Animation curve: gun drops away, mag swap, comes back
      // Phase 1 (0→0.5): gun swings down-right and rotates
      // Phase 2 (0.5→1): gun swings back to rest
      const phase1 = Math.min(1, t / 0.5); // 0→1 during first half
      const phase2 = Math.max(0, (t - 0.5) / 0.5); // 0→1 during second half
      const drop = phase1 * (1 - phase2); // peaks at midpoint

      this._gun.position.set(
        this._gunRest.x + drop * 0.12,
        this._gunRest.y - drop * 0.18,
        this._gunRest.z + drop * 0.06,
      );
      this._gun.rotation.x = drop * 0.7;
      this._gun.rotation.z = -drop * 0.5;
      this._gun.rotation.y = drop * 0.3;
      return;
    }

    // ── Normal: bob + recoil ──────────────────────────────────────────────────
    const moving =
      this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
    this._gunBobT += delta * (moving ? 9 : 2);
    const bobX = Math.sin(this._gunBobT * 0.5) * (moving ? 0.009 : 0.002);
    const bobY = Math.abs(Math.sin(this._gunBobT)) * (moving ? 0.006 : 0.002);

    this._gunRecoilT = Math.max(0, this._gunRecoilT - delta * 9);
    const r = this._gunRecoilT;

    this._gun.position.set(
      this._gunRest.x + bobX,
      this._gunRest.y - bobY,
      this._gunRest.z + r * 0.1,
    );
    this._gun.rotation.x = -r * 0.22;
    this._gun.rotation.y = 0;
    this._gun.rotation.z = bobX * 0.4;
  }

  _setupEvents() {
    this._onKeyDown = (e) => {
      if (e.repeat) return;
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.moveForward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.moveBackward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.moveLeft = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.moveRight = true;
          break;
        case 'Space':
          e.preventDefault();
          if (
            this.isLocked &&
            !this.isGameOver &&
            !this.isJumping &&
            !this.isCrouching
          ) {
            this.isJumping = true;
            this.verticalVelocity = this.JUMP_FORCE;
          }
          break;
        case 'AltLeft':
        case 'AltRight':
          e.preventDefault();
          if (this.isLocked && !this.isGameOver && !this.isJumping) {
            this.isCrouching = true;
          }
          break;
        case 'KeyR':
          if (this.isLocked && !this.isGameOver) this._startReload();
          break;
      }
    };
    this._onKeyUp = (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.moveForward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.moveBackward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.moveLeft = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.moveRight = false;
          break;
        case 'AltLeft':
        case 'AltRight':
          this.isCrouching = false;
          break;
      }
    };
    this._onMouseDown = (e) => {
      if (e.button === 0 && this.isLocked && !this.isGameOver) {
        this._playerShoot();
      }
    };
    this._onResize = () => {
      if (!this.container) return;
      this.camera.aspect =
        this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(
        this.container.clientWidth,
        this.container.clientHeight,
      );
    };

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('resize', this._onResize);
  }

  // ─── Shooting ────────────────────────────────────────────────────────────────

  _startReload() {
    if (this._reloading || this.ammo === this.maxAmmo) return;
    this._reloading = true;
    this._reloadProgress = 0;
    this.onReloadChange(true);
  }

  _playerShoot() {
    if (this.ammo <= 0 || this._reloading) return;
    this.ammo--;
    this.onAmmoChange(this.ammo);

    // Gun recoil animation
    this._gunRecoilT = 1;

    // Auto-reload on empty
    if (this.ammo === 0) {
      this._startReload();
      return;
    }

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);

    const botMeshes = this.bots
      .filter((b) => b.alive)
      .flatMap((b) => [b.body, b.head]);
    const hits = raycaster.intersectObjects(botMeshes, false);

    if (hits.length > 0) {
      const hitMesh = hits[0].object;
      const bot = this.bots.find(
        (b) => b.body === hitMesh || b.head === hitMesh,
      );
      if (bot && bot.alive) {
        const headshot = hitMesh === bot.head;
        this._damageBot(bot, headshot ? 100 : 34);
      }
    }

    // Visual tracer
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    this._spawnTracer(
      this.camera.position.clone().addScaledVector(dir, 0.3),
      dir,
      true,
    );
    this._muzzleFlash(this.camera.position.clone().addScaledVector(dir, 0.5));
  }

  _muzzleFlash(pos) {
    const light = new THREE.PointLight(0xffaa00, 8, 6);
    light.position.copy(pos);
    this.scene.add(light);
    setTimeout(() => this.scene.remove(light), 60);
  }

  _spawnTracer(origin, dir, isPlayer) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 1, 4),
      new THREE.MeshBasicMaterial({ color: isPlayer ? 0xff0000 : 0xff6d00 }),
    );
    mesh.position.copy(origin);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize(),
    );
    mesh.setRotationFromQuaternion(q);
    this.scene.add(mesh);

    const bullet = {
      mesh,
      direction: dir.clone().normalize(),
      speed: 60,
      traveled: 0,
      maxDistance: 80,
    };
    (isPlayer ? this.bullets : this.botBullets).push(bullet);
  }

  _botShoot(bot, playerPos) {
    const origin = bot.group.position.clone().add(new THREE.Vector3(0, 1.1, 0));
    const dir = new THREE.Vector3().subVectors(playerPos, origin);
    // Aim inaccuracy (tighter spread)
    dir.x += (Math.random() - 0.5) * 0.12;
    dir.z += (Math.random() - 0.5) * 0.12;
    dir.normalize();

    this._spawnTracer(origin, dir, false);

    // Hit check: higher base chance, falls off with distance
    const dist = origin.distanceTo(playerPos);
    const hitChance = Math.max(0.25, 0.75 - dist * 0.02);
    if (Math.random() < hitChance && !this.isGameOver) {
      this._damagePlayer(8);
    }
  }

  // ─── Damage ──────────────────────────────────────────────────────────────────

  _damageBot(bot, damage) {
    bot.health = Math.max(0, bot.health - damage);
    const ratio = bot.health / bot.maxHealth;
    bot.hBar.scale.x = Math.max(0.001, ratio);
    bot.hBar.position.x = (ratio - 1) * 0.35;
    bot.hBar.material.color.setHex(
      ratio > 0.5 ? 0x00e676 : ratio > 0.25 ? 0xffca28 : 0xff1744,
    );

    if (bot.health <= 0) {
      this._killBot(bot);
    } else {
      bot.state = 'cover';
      bot.coverCooldown = 2 + Math.random();
    }
  }

  _killBot(bot) {
    bot.alive = false;
    bot.group.rotation.z = Math.PI / 2;
    bot.group.position.y = -0.3;
    setTimeout(() => this.scene.remove(bot.group), 800);

    this.kills += 1;
    this.score += 100;
    this.onKillsChange(this.kills);
    console.log('score', this.score);
    this.onScoreChange(this.score);

    // Remove dead bot from list and spawn a replacement
    if (!this.isGameOver) {
      setTimeout(() => {
        this.bots = this.bots.filter((b) => b.alive);
        const id = Date.now();
        this._spawnBot(this._randomSpawnPos().toArray(), id);
      }, 1000);
    }
  }

  _damagePlayer() {
    if (this.isGameOver) return;

    this.score -= 25;
    console.log('score', this.score);
    this.onScoreChange(this.score);

    if (this.hitOverlay) {
      this.hitOverlay.style.opacity = '0.5';
      clearTimeout(this._hitFadeTimer);
      this._hitFadeTimer = setTimeout(() => {
        if (this.hitOverlay) this.hitOverlay.style.opacity = '0';
      }, 180);
    }
  }

  // ─── Bot AI ──────────────────────────────────────────────────────────────────

  _updateBots(delta) {
    const playerPos = this.camera.position.clone();

    this.bots.forEach((bot) => {
      if (!bot.alive) return;

      // Billboard health bars toward camera
      [bot.hBar, bot.hBarBg].forEach((m) => m.lookAt(this.camera.position));

      const botPos = bot.group.position.clone();
      const dist = botPos.distanceTo(playerPos);

      // State transitions
      if (dist < bot.detectionRange) {
        if (bot.state === 'cover' && bot.coverCooldown > 0) {
          bot.coverCooldown -= delta;
        } else if (dist < bot.shootRange) {
          bot.state = 'shoot';
        } else {
          bot.state = 'chase';
        }
      } else if (bot.state !== 'cover') {
        bot.state = 'patrol';
      }

      // Execute state
      switch (bot.state) {
        case 'patrol':
          this._botPatrol(bot, delta);
          break;
        case 'chase':
          this._botChase(bot, playerPos, delta);
          break;
        case 'shoot':
          this._botShootState(bot, playerPos, delta);
          break;
        case 'cover':
          this._botCover(bot, playerPos, delta);
          break;
      }
    });
  }

  _botPatrol(bot, delta) {
    const dist = bot.group.position.distanceTo(bot.patrolTarget);
    bot.patrolCooldown -= delta;
    if (dist < 1 || bot.patrolCooldown < 0) {
      bot.patrolTarget.set(
        (Math.random() - 0.5) * 80,
        0,
        (Math.random() - 0.5) * 46,
      );
      bot.patrolCooldown = 3 + Math.random() * 4;
    }
    this._moveBotTo(bot, bot.patrolTarget, delta, bot.speed * 0.4);
    if (dist > 1)
      bot.group.lookAt(
        new THREE.Vector3(
          bot.patrolTarget.x,
          bot.group.position.y,
          bot.patrolTarget.z,
        ),
      );
  }

  _botChase(bot, playerPos, delta) {
    const target = new THREE.Vector3(playerPos.x, 0, playerPos.z);
    this._moveBotTo(bot, target, delta, bot.speed);
    bot.group.lookAt(
      new THREE.Vector3(playerPos.x, bot.group.position.y, playerPos.z),
    );
  }

  _botShootState(bot, playerPos, delta) {
    bot.group.lookAt(
      new THREE.Vector3(playerPos.x, bot.group.position.y, playerPos.z),
    );

    // Strafe while shooting
    bot.strafeCooldown -= delta;
    if (bot.strafeCooldown <= 0) {
      bot.strafeSide *= -1;
      bot.strafeCooldown = 0.6 + Math.random() * 0.8;
    }
    const right = new THREE.Vector3();
    right
      .crossVectors(
        new THREE.Vector3(0, 1, 0),
        bot.group.getWorldDirection(new THREE.Vector3()),
      )
      .normalize();
    const strafePos = bot.group.position
      .clone()
      .addScaledVector(right, bot.strafeSide * bot.speed * 0.6 * delta);
    if (this._inBounds(strafePos) && !this._hitsObstacle(strafePos, 0.35)) {
      bot.group.position.copy(strafePos);
    }

    // Shoot
    bot.shootCooldown -= delta;
    if (bot.shootCooldown <= 0) {
      this._botShoot(bot, playerPos);
      bot.shootCooldown = bot.shootInterval;
    }
  }

  _botCover(bot, playerPos, delta) {
    if (!bot.coverTarget) {
      // Pick the closest obstacle that is between us and the player
      let best = null;
      let bestScore = Infinity;
      this.obstacles.forEach((obs) => {
        const toCover = obs.pos.clone().sub(bot.group.position).length();
        if (toCover < bestScore) {
          bestScore = toCover;
          best = obs.pos.clone();
        }
      });
      bot.coverTarget = best || bot.group.position.clone();
    }
    this._moveBotTo(bot, bot.coverTarget, delta, bot.speed);

    bot.shootCooldown -= delta;
    if (
      bot.shootCooldown <= 0 &&
      bot.group.position.distanceTo(playerPos) < bot.shootRange
    ) {
      this._botShoot(bot, playerPos);
      bot.shootCooldown = bot.shootInterval * 1.5;
    }

    if (bot.coverCooldown <= 0) {
      bot.state = 'shoot';
      bot.coverTarget = null;
    }
  }

  _moveBotTo(bot, target, delta, speed) {
    const dir = new THREE.Vector3().subVectors(target, bot.group.position);
    dir.y = 0;
    if (dir.length() < 0.5) return;
    dir.normalize();

    const next = bot.group.position.clone().addScaledVector(dir, speed * delta);
    next.y = 0;

    if (this._inBounds(next) && !this._hitsObstacle(next, 0.4)) {
      bot.group.position.copy(next);
    }
  }

  // ─── Player movement ─────────────────────────────────────────────────────────

  _updatePlayer(delta) {
    if (!this.isLocked || this.isGameOver) return;

    // Horizontal movement
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const speed = this.isCrouching ? 4.5 : 8;
    const move = new THREE.Vector3();
    if (this.moveForward) move.addScaledVector(forward, speed);
    if (this.moveBackward) move.addScaledVector(forward, -speed);
    if (this.moveRight) move.addScaledVector(right, speed);
    if (this.moveLeft) move.addScaledVector(right, -speed);

    const oldPos = this.camera.position.clone();
    this.camera.position.addScaledVector(move, delta);

    if (
      !this._inBounds(this.camera.position) ||
      this._hitsObstacle(this.camera.position, 0.5)
    ) {
      this.camera.position.copy(oldPos);
    }

    // Vertical: jump & gravity
    const groundY = this.isCrouching ? this.CROUCH_HEIGHT : this.STAND_HEIGHT;

    if (this.isJumping) {
      this.verticalVelocity -= this.GRAVITY * delta;
      this.camera.position.y += this.verticalVelocity * delta;

      if (this.camera.position.y <= groundY) {
        this.camera.position.y = groundY;
        this.verticalVelocity = 0;
        this.isJumping = false;
      }
    } else {
      // Smooth crouch transition
      this.camera.position.y +=
        (groundY - this.camera.position.y) * Math.min(1, 14 * delta);
    }
  }

  // ─── Bullets ─────────────────────────────────────────────────────────────────

  _updateBullets(delta) {
    const updateList = (list) => {
      return list.filter((b) => {
        b.traveled += b.speed * delta;
        b.mesh.position.addScaledVector(b.direction, b.speed * delta);
        if (
          b.traveled >= b.maxDistance ||
          this._hitsObstacle(b.mesh.position, 0.1)
        ) {
          this.scene.remove(b.mesh);
          return false;
        }
        return true;
      });
    };
    this.bullets = updateList(this.bullets);
    this.botBullets = updateList(this.botBullets);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  _inBounds(pos) {
    return (
      pos.x > this.fieldBounds.minX &&
      pos.x < this.fieldBounds.maxX &&
      pos.z > this.fieldBounds.minZ &&
      pos.z < this.fieldBounds.maxZ
    );
  }

  _hitsObstacle(pos, radius) {
    for (const obs of this.obstacles) {
      const dx = Math.abs(pos.x - obs.pos.x);
      const dz = Math.abs(pos.z - obs.pos.z);
      if (dx < obs.size[0] / 2 + radius && dz < obs.size[2] / 2 + radius)
        return true;
    }
    return false;
  }

  // ─── Timer ───────────────────────────────────────────────────────────────────

  _updateTimer(delta) {
    this.timeLeft = Math.max(0, this.timeLeft - delta);
    this.onTimerChange(Math.ceil(this.timeLeft));
    if (this.timeLeft === 0) {
      this.isGameOver = true;
      this.onGameOver('time', this.score, this.kills);
    }
  }

  // ─── Loop ────────────────────────────────────────────────────────────────────

  _animate() {
    this._animationId = requestAnimationFrame(() => this._animate());

    const now = performance.now();
    const delta = Math.min((now - this.prevTime) / 1000, 0.05);
    this.prevTime = now;

    if (!this.isGameOver) {
      this._updatePlayer(delta);
      this._updateBots(delta);
      this._updateBullets(delta);
      this._updateGun(delta);
      this._updateTimer(delta); // last — score is fully settled before game-over fires
    }

    this.renderer.render(this.scene, this.camera);
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  lock() {
    this.renderer.domElement.requestPointerLock();
  }

  // ── Mobile API (no pointer lock needed) ──────────────────────────────────────

  /** Start the game on mobile without pointer lock */
  startMobile() {
    this.isLocked = true;
    this.onLock();
  }

  /** Apply camera look from touch delta (pixels) */
  applyLook(dx, dy) {
    if (!this.isLocked || this.isGameOver) return;
    this._euler.setFromQuaternion(this.camera.quaternion);
    this._euler.y -= dx * 0.003;
    this._euler.x -= dy * 0.003;
    this._euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this._euler.x));
    this.camera.quaternion.setFromEuler(this._euler);
  }

  /** Set individual movement flags from joystick */
  setMoveForward(v)  { this.moveForward  = v; }
  setMoveBackward(v) { this.moveBackward = v; }
  setMoveLeft(v)     { this.moveLeft     = v; }
  setMoveRight(v)    { this.moveRight    = v; }

  /** Trigger a player shot (called from touch shoot button) */
  playerShoot() {
    if (this.isLocked && !this.isGameOver) this._playerShoot();
  }

  /** Trigger reload (called from touch reload button) */
  reload() {
    if (this.isLocked && !this.isGameOver) this._startReload();
  }

  setHitOverlay(el) {
    this.hitOverlay = el;
  }

  reset() {
    // Remove existing bots
    this.bots.forEach((b) => this.scene.remove(b.group));
    this.bots = [];
    this.bullets.forEach((b) => this.scene.remove(b.mesh));
    this.bullets = [];
    this.botBullets.forEach((b) => this.scene.remove(b.mesh));
    this.botBullets = [];

    // Reset player
    this.camera.position.set(-44, 1.7, 0);
    this.camera.rotation.set(0, -Math.PI / 2, 0, 'YXZ');
    this._euler.set(0, -Math.PI / 2, 0);
    this.isJumping = false;
    this.isCrouching = false;
    this.verticalVelocity = 0;
    this.ammo = this.maxAmmo;
    this.score = 0;
    this.kills = 0;
    this.timeLeft = this.GAME_DURATION;
    this.isGameOver = false;
    this._reloading = false;
    this._reloadProgress = 0;

    this.onAmmoChange(this.ammo);
    this.onScoreChange(this.score);
    this.onKillsChange(this.kills);
    this.onTimerChange(this.GAME_DURATION);

    this._setupBots();
  }

  destroy() {
    cancelAnimationFrame(this._animationId);
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousedown', this._onMouseDown);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener(
      'pointerlockchange',
      this._onPointerLockChange,
    );
    document.removeEventListener('pointerlockerror', this._onPointerLockError);
    window.removeEventListener('resize', this._onResize);
    if (document.pointerLockElement) document.exitPointerLock();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
