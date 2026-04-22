import * as THREE from 'three';

// Long axis (Z) stretches away from camera; short axis (X) goes left-right
const TABLE_W = 460; // X — width (narrow side faces camera)
const TABLE_L = 920; // Z — length (long side goes into the scene)
const BALL_RADIUS = 13;
const POCKET_RADIUS = 30;
const FRICTION = 0.982;
const MIN_SPEED = 0.08;
const MAX_POWER = 28;
const MAX_SCREEN_DRAG = 160; // px for 100 % power

const BALL_FACES = [
  { path: '/minijuegos/billar/3.png', name: 'PAU' },
  { path: '/minijuegos/billar/10.png', name: 'LUKA' },
  { path: '/minijuegos/billar/14.png', name: 'MARC' },
  { path: '/minijuegos/billar/17.png', name: 'JABA' },
];

export default class BillarGame {
  constructor({
    container,
    onShotChange,
    onBallPocketed,
    onGameOver,
    onPowerChange,
  }) {
    this.container = container;
    this.onShotChange = onShotChange;
    this.onBallPocketed = onBallPocketed;
    this.onGameOver = onGameOver;
    this.onPowerChange = onPowerChange;

    this.shots = 0;
    this.pocketedCount = 0;
    this.totalBalls = 15;
    this.balls = [];
    this.state = 'aiming'; // aiming | charging | shooting | gameover
    this.running = false;
    this.mousePosWorld = null;

    // Charging state
    this.aimDir = null;
    this.chargeScreenStart = null;
    this.currentPower = 0;

    this._init();
  }

  _init() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x08050a);
    this.scene.fog = new THREE.FogExp2(0x08050a, 0.0006);

    // Camera animation state
    this._camIntroPos  = new THREE.Vector3(0, 100, -100);
    this._camIntroLook = new THREE.Vector3(0, 0, -250);

    this._camPlayPos  = new THREE.Vector3(0, 400, TABLE_L / 2 + 400);
    this._camPlayLook = new THREE.Vector3(0, 0, -TABLE_L * 0.08);
    this._camZoomPos  = new THREE.Vector3(0, 320, TABLE_L - 60);
    this._camZoomLook = new THREE.Vector3(0, 0, -30);

    this.camera = new THREE.PerspectiveCamera(52, w / h, 1, 4000);
    this.camera.position.copy(this._camIntroPos);
    this.camera.lookAt(this._camIntroLook);

    this._camLook       = this._camIntroLook.clone();
    this._camTargetPos  = this._camIntroPos.clone();
    this._camTargetLook = this._camIntroLook.clone();
    this._camSpeed      = 0.04;

    this.raycaster = new THREE.Raycaster();

    // Preload face textures
    const loader = new THREE.TextureLoader();
    this._faceTextures = BALL_FACES.map((f) => ({
      name: f.name,
      texture: loader.load(f.path),
    }));

    this._createLights();
    this._createTable();
    this._createPockets();
    this._createBalls();
    this._createCue();
    this._createAimLines();

    // Invisible horizontal plane at ball height for mouse → world raycasting
    const planeMat = new THREE.MeshBasicMaterial({
      visible: false,
      side: THREE.DoubleSide,
    });
    this.rayPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(TABLE_W * 4, TABLE_L * 4),
      planeMat,
    );
    this.rayPlane.rotation.x = -Math.PI / 2;
    this.rayPlane.position.y = BALL_RADIUS;
    this.scene.add(this.rayPlane);

    this._setupEvents();
    this.running = true;
    this._animate();
  }

  startGame() {
    this._camTargetPos = this._camPlayPos;
    this._camTargetLook = this._camPlayLook;
    this._camSpeed = 0.025; // un poco más lento para que la transición inicial se note
  }

  // ─── Lights ──────────────────────────────────────────────────────────────────

  _createLights() {
    const ambient = new THREE.AmbientLight(0xfff8e0, 3.6);
    this.scene.add(ambient);

    // Fill from camera side so near balls aren't shadowed
    const rimLight = new THREE.DirectionalLight(0xffffff, 2);
    rimLight.position.set(0, 400, TABLE_L + 500);
    this.scene.add(rimLight);
  }

  // ─── Table geometry ───────────────────────────────────────────────────────────

  _createTable() {
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x3a1800,
      roughness: 0.75,
      metalness: 0.05,
    });
    const cushionMat = new THREE.MeshStandardMaterial({
      color: 0x145228,
      roughness: 0.7,
    });
    const feltMat = new THREE.MeshStandardMaterial({
      color: 0x1a6b3a,
      roughness: 0.95,
    });

    // Felt
    const felt = new THREE.Mesh(
      new THREE.PlaneGeometry(TABLE_W, TABLE_L),
      feltMat,
    );
    felt.rotation.x = -Math.PI / 2;
    felt.position.y = 0.5;
    felt.receiveShadow = true;
    this.scene.add(felt);

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(TABLE_W + 80, 28, TABLE_L + 80),
      woodMat,
    );
    body.position.set(0, -14, 0);
    body.receiveShadow = true;
    body.castShadow = true;
    this.scene.add(body);

    // Long cushions (X sides, running along Z) — inner face at ±TABLE_W/2
    const longGeo = new THREE.BoxGeometry(24, 8, TABLE_L);
    [-1, 1].forEach((side) => {
      const c = new THREE.Mesh(longGeo, cushionMat);
      c.position.set(side * (TABLE_W / 2 + 12), 4, 0);
      c.castShadow = true;
      this.scene.add(c);
    });

    // Short cushions (Z ends, split around corner pockets) — inner face at ±TABLE_L/2
    const shortHalf = TABLE_W + 24 * 2;
    [-1, 1].forEach((side) => {
      const sh = new THREE.Mesh(
        new THREE.BoxGeometry(shortHalf, 8, 24),
        cushionMat,
      );
      sh.position.set(0, 4, side * (TABLE_L / 2 + 12));
      sh.castShadow = true;
      this.scene.add(sh);
    });

    // Legs
    const legGeo = new THREE.BoxGeometry(24, 130, 24);
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x260e00,
      roughness: 0.9,
    });
    [
      [-TABLE_W / 2 - 18, -79, -TABLE_L / 2 - 18],
      [TABLE_W / 2 + 18, -79, -TABLE_L / 2 - 18],
      [-TABLE_W / 2 - 18, -79, TABLE_L / 2 + 18],
      [TABLE_W / 2 + 18, -79, TABLE_L / 2 + 18],
    ].forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      this.scene.add(leg);
    });

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(5000, 5000),
      new THREE.MeshStandardMaterial({ color: 0x060405, roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -160;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  // ─── Pockets ──────────────────────────────────────────────────────────────────

  _createPockets() {
    const hw = TABLE_W / 2;
    const hl = TABLE_L / 2;
    this.pocketPositions = [
      new THREE.Vector2(-hw, -hl),
      new THREE.Vector2(-hw, 0),
      new THREE.Vector2(hw, -hl),
      new THREE.Vector2(-hw, hl),
      new THREE.Vector2(hw, 0),
      new THREE.Vector2(hw, hl),
    ];
    this.pocketPositions.forEach((p) => {
      const mesh = new THREE.Mesh(
        new THREE.CircleGeometry(POCKET_RADIUS, 24),
        new THREE.MeshBasicMaterial({ color: 0x030202 }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(p.x, 0.6, p.y);
      this.scene.add(mesh);
    });
  }

  // ─── Balls ────────────────────────────────────────────────────────────────────

  _createBalls() {
    // Cue ball near camera end (positive Z)
    this.cueBall = this._makeBall(0xf0f0e8, 0, TABLE_L / 3.2, true);
    this.balls.push(this.cueBall);

    // Rack: tip toward camera, rows going deeper (-Z)
    const tipZ = -TABLE_L / 5.5;
    const rowSpacing = BALL_RADIUS * 2 * Math.cos(Math.PI / 6);
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= row; col++) {
        const bx = (col - row / 2) * (BALL_RADIUS * 2 + 0.4);
        const bz = tipZ - row * rowSpacing;
        console.log(bz);
        this.balls.push(this._makeBall(0xffffff, bx, bz, false));
      }
    }
  }

  _makeBall(color, x, z, isCue) {
    let ballName = null;
    let ballImagePath = null;
    let mat;
    if (isCue) {
      mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.25,
        metalness: 0.06,
      });
    } else {
      const faceIdx = Math.floor(Math.random() * this._faceTextures.length);
      const pick = this._faceTextures[faceIdx];
      ballName = pick.name;
      ballImagePath = BALL_FACES[faceIdx].path;
      mat = new THREE.MeshStandardMaterial({
        map: pick.texture,
        color: 0xffffff,
        roughness: 0.22,
        metalness: 0.06,
      });
    }
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS, 28, 20),
      mat,
    );
    mesh.rotation.y = -Math.PI / 2;
    mesh.position.set(x, BALL_RADIUS, z);
    mesh.castShadow = true;
    this.scene.add(mesh);
    return {
      mesh,
      velocity: new THREE.Vector2(0, 0),
      position: new THREE.Vector2(x, z),
      radius: BALL_RADIUS,
      isCue,
      name: ballName,
      imagePath: ballImagePath,
      pocketed: false,
      respawning: false,
    };
  }

  // ─── Cue stick ────────────────────────────────────────────────────────────────

  _createCue() {
    this.CUE_LENGTH = 400;
    // Tapered cylinder: tip (small radius) at +Y, butt (large) at -Y before rotation
    const cueGeo = new THREE.CylinderGeometry(3.5, 11, this.CUE_LENGTH, 10);
    // Rotate so tip (+Y) becomes +Z (points toward ball)
    cueGeo.rotateX(Math.PI / 2);

    const cueMat = new THREE.MeshStandardMaterial({
      color: 0x7a3b10,
      roughness: 0.78,
      metalness: 0.0,
    });
    this.cueStick = new THREE.Mesh(cueGeo, cueMat);
    this.cueStick.castShadow = true;
    this.cueStick.visible = false;
    this.scene.add(this.cueStick);

    // Blue leather tip
    const tipGeo = new THREE.CylinderGeometry(3.6, 3.6, 5, 10);
    tipGeo.rotateX(Math.PI / 2);
    const tipMat = new THREE.MeshStandardMaterial({
      color: 0x2255aa,
      roughness: 0.6,
    });
    this.cueTip = new THREE.Mesh(tipGeo, tipMat);
    this.cueTip.visible = false;
    this.scene.add(this.cueTip);
  }

  _updateCue(dir, ballPos2D, power) {
    if (!dir || !ballPos2D) {
      this.cueStick.visible = false;
      this.cueTip.visible = false;
      return;
    }
    const pullBack = power * 50;
    const dist = BALL_RADIUS + 4 + pullBack + this.CUE_LENGTH / 2;
    const cx = ballPos2D.x - dir.x * dist;
    const cz = ballPos2D.y - dir.y * dist;
    const angle = Math.atan2(dir.x, dir.y);

    this.cueStick.position.set(cx, BALL_RADIUS, cz);
    this.cueStick.rotation.y = angle;
    this.cueStick.visible = true;

    // Tip is at center + dir * (CUE_LENGTH/2), which is near the ball
    const tipDist = BALL_RADIUS + 4 + pullBack + 2.5;
    this.cueTip.position.set(
      ballPos2D.x - dir.x * tipDist,
      BALL_RADIUS,
      ballPos2D.y - dir.y * tipDist,
    );
    this.cueTip.rotation.y = angle;
    this.cueTip.visible = true;
  }

  // ─── Aim visuals ──────────────────────────────────────────────────────────────

  _createAimLines() {
    // Dashed white aim line
    const aimMat = new THREE.LineDashedMaterial({
      color: 0xffffff,
      opacity: 0.65,
      transparent: true,
      dashSize: 18,
      gapSize: 10,
    });
    this.aimLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(0, 0, 1),
      ]),
      aimMat,
    );
    this.aimLine.visible = false;
    this.scene.add(this.aimLine);

    // Pull / power indicator (solid, color-coded green→red)
    this.pullMat = new THREE.LineBasicMaterial({
      color: 0x00ff44,
      opacity: 0.85,
      transparent: true,
    });
    this.pullLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(0, 0, 1),
      ]),
      this.pullMat,
    );
    this.pullLine.visible = false;
    this.scene.add(this.pullLine);

    // Ghost ball — faint sphere at aim target
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      opacity: 0.15,
      transparent: true,
    });
    this.ghostBall = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS, 16, 12),
      ghostMat,
    );
    this.ghostBall.visible = false;
    this.scene.add(this.ghostBall);
  }

  // ─── Input helpers ────────────────────────────────────────────────────────────

  _getMouseWorld(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObject(this.rayPlane);
    if (!hits.length) return null;
    const pt = hits[0].point;
    return new THREE.Vector2(pt.x, pt.z);
  }

  _isMoving() {
    return this.balls.some(
      (b) =>
        !b.pocketed &&
        !b.respawning &&
        b.velocity.lengthSq() > MIN_SPEED * MIN_SPEED,
    );
  }

  // ─── Events ───────────────────────────────────────────────────────────────────

  _setupEvents() {
    const canvas = this.renderer.domElement;
    this._onMouseMove = (e) => this._handleMove(e.clientX, e.clientY);
    this._onMouseDown = (e) => this._handleDown(e.clientX, e.clientY);
    this._onMouseUp = (e) => this._handleUp(e.clientX, e.clientY);
    this._onTouchStart = (e) => {
      e.preventDefault();
      this._handleDown(e.touches[0].clientX, e.touches[0].clientY);
    };
    this._onTouchMove = (e) => {
      e.preventDefault();
      this._handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    this._onTouchEnd = (e) => {
      e.preventDefault();
      this._handleUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    };
    this._onResize = () => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    };
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
    canvas.addEventListener('mouseup', this._onMouseUp);
    canvas.addEventListener('touchstart', this._onTouchStart, {
      passive: false,
    });
    canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this._onTouchEnd, { passive: false });
    window.addEventListener('resize', this._onResize);
  }

  // ─── Input handlers ───────────────────────────────────────────────────────────

  _handleMove(cx, cy) {
    if (this.state === 'gameover') return;
    if (this._isMoving()) {
      this.aimLine.visible = false;
      this.pullLine.visible = false;
      this.ghostBall.visible = false;
      if (this.cueStick) this.cueStick.visible = false;
      if (this.cueTip) this.cueTip.visible = false;
      return;
    }

    const wp = this._getMouseWorld(cx, cy);
    if (!wp) return;
    this.mousePosWorld = wp;

    if (this.state === 'aiming') {
      this._drawAimFromMouse(wp);
    } else if (this.state === 'charging') {
      this._updateCharge(cx, cy);
    }
  }

  _handleDown(cx, cy) {
    if (this._isMoving() || this.state === 'gameover') return;
    const wp = this._getMouseWorld(cx, cy);
    if (!wp) return;

    const cue = this.cueBall.position;
    const dx = wp.x - cue.x;
    const dz = wp.y - cue.y;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 5) return; // clicked too close to cue ball

    // Lock aim direction toward mouse and switch to charging
    this.aimDir = new THREE.Vector2(dx / len, dz / len);
    this.chargeScreenStart = { x: cx, y: cy };
    this.currentPower = 0;
    this.state = 'charging';
    this._updateCharge(cx, cy);
  }

  _handleUp(cx, cy) {
    if (this.state !== 'charging') return;

    if (this.currentPower > 0.02) {
      const power = this.currentPower * MAX_POWER;
      this.cueBall.velocity.set(this.aimDir.x * power, this.aimDir.y * power);
      this.shots++;
      if (this.onShotChange) this.onShotChange(this.shots);
      this.state = 'shooting';
      this._camTargetPos = this._camZoomPos;
      this._camTargetLook = this._camZoomLook;
      this._camSpeed = 0.07;
    } else {
      this.state = 'aiming';
    }

    this._clearAimVisuals();
  }

  // ─── Aim visuals ──────────────────────────────────────────────────────────────

  // Called while aiming (no mousedown): shows dashed line toward mouse
  _drawAimFromMouse(mouseWorld) {
    const cue = this.cueBall.position;
    const dx = mouseWorld.x - cue.x;
    const dz = mouseWorld.y - cue.y;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 1) return;
    const nx = dx / len;
    const nz = dz / len;
    const y = BALL_RADIUS;

    this.aimLine.geometry.setFromPoints([
      new THREE.Vector3(cue.x, y, cue.y),
      new THREE.Vector3(cue.x + nx * 800, y, cue.y + nz * 800),
    ]);
    this.aimLine.geometry.computeBoundingSphere();
    this.aimLine.computeLineDistances();
    this.aimLine.visible = true;
    this.pullLine.visible = false;

    // Ghost ball at moderate distance along aim
    this.ghostBall.position.set(
      cue.x + nx * 120,
      BALL_RADIUS,
      cue.y + nz * 120,
    );
    this.ghostBall.visible = true;

    this._updateCue(new THREE.Vector2(nx, nz), cue, 0);
  }

  // Called while charging (mousedown held): direction follows mouse, power from drag distance
  _updateCharge(cx, cy) {
    const dx = cx - this.chargeScreenStart.x;
    const dy = cy - this.chargeScreenStart.y;
    const screenDist = Math.sqrt(dx * dx + dy * dy);
    const t = Math.min(screenDist / MAX_SCREEN_DRAG, 1);
    this.currentPower = t;
    if (this.onPowerChange) this.onPowerChange(t);

    // Update aim direction from current mouse world position so cue rotates freely
    const wp = this._getMouseWorld(cx, cy);
    const cue = this.cueBall.position;
    if (wp) {
      const wdx = wp.x - cue.x;
      const wdz = wp.y - cue.y;
      const len = Math.sqrt(wdx * wdx + wdz * wdz);
      if (len > 5) this.aimDir = new THREE.Vector2(wdx / len, wdz / len);
    }

    // Color: green (0 %) → yellow (50 %) → red (100 %)
    const color = new THREE.Color();
    color.setHSL(0.33 * (1 - t), 1.0, 0.45);
    this.pullMat.color = color;

    const dir = this.aimDir;
    const y = BALL_RADIUS;

    // Dashed aim line in locked direction
    this.aimLine.geometry.setFromPoints([
      new THREE.Vector3(cue.x, y, cue.y),
      new THREE.Vector3(cue.x + dir.x * 800, y, cue.y + dir.y * 800),
    ]);
    this.aimLine.geometry.computeBoundingSphere();
    this.aimLine.computeLineDistances();
    this.aimLine.visible = true;

    // Pull indicator: short tail behind cue proportional to power
    const pullLen = t * 130;
    this.pullLine.geometry.setFromPoints([
      new THREE.Vector3(cue.x, y, cue.y),
      new THREE.Vector3(cue.x - dir.x * pullLen, y, cue.y - dir.y * pullLen),
    ]);
    this.pullLine.visible = true;

    // Ghost ball slides further along aim as power increases
    const ghostDist = 100 + t * 700;
    this.ghostBall.position.set(
      cue.x + dir.x * ghostDist,
      BALL_RADIUS,
      cue.y + dir.y * ghostDist,
    );
    this.ghostBall.visible = true;

    this._updateCue(dir, cue, t);
  }

  _clearAimVisuals() {
    this.aimLine.visible = false;
    this.pullLine.visible = false;
    this.ghostBall.visible = false;
    if (this.cueStick) this.cueStick.visible = false;
    if (this.cueTip) this.cueTip.visible = false;
    if (this.onPowerChange) this.onPowerChange(0);
    this.currentPower = 0;
    this.aimDir = null;
    this.chargeScreenStart = null;
  }

  // ─── Physics ──────────────────────────────────────────────────────────────────

  _physicsStep() {
    const hw = TABLE_W / 2 - BALL_RADIUS;
    const hl = TABLE_L / 2 - BALL_RADIUS;

    for (const ball of this.balls) {
      if (ball.pocketed || ball.respawning) continue;
      ball.position.x += ball.velocity.x;
      ball.position.y += ball.velocity.y;
      ball.velocity.multiplyScalar(FRICTION);
      if (ball.velocity.lengthSq() < MIN_SPEED * MIN_SPEED)
        ball.velocity.set(0, 0);

      if (ball.position.x > hw) {
        ball.position.x = hw;
        ball.velocity.x *= -0.75;
      }
      if (ball.position.x < -hw) {
        ball.position.x = -hw;
        ball.velocity.x *= -0.75;
      }
      if (ball.position.y > hl) {
        ball.position.y = hl;
        ball.velocity.y *= -0.75;
      }
      if (ball.position.y < -hl) {
        ball.position.y = -hl;
        ball.velocity.y *= -0.75;
      }

      ball.mesh.position.set(ball.position.x, BALL_RADIUS, ball.position.y);
    }

    // Ball–ball elastic collisions
    for (let i = 0; i < this.balls.length; i++) {
      for (let j = i + 1; j < this.balls.length; j++) {
        const a = this.balls[i];
        const b = this.balls[j];
        if (a.pocketed || b.pocketed || a.respawning || b.respawning) continue;

        const dx = b.position.x - a.position.x;
        const dz = b.position.y - a.position.y;
        const distSq = dx * dx + dz * dz;
        const minDist = a.radius + b.radius;

        if (distSq < minDist * minDist && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const nz = dz / dist;
          const overlap = (minDist - dist) / 2;
          a.position.x -= nx * overlap;
          a.position.y -= nz * overlap;
          b.position.x += nx * overlap;
          b.position.y += nz * overlap;

          const dot =
            (a.velocity.x - b.velocity.x) * nx +
            (a.velocity.y - b.velocity.y) * nz;
          if (dot > 0) {
            a.velocity.x -= dot * nx;
            a.velocity.y -= dot * nz;
            b.velocity.x += dot * nx;
            b.velocity.y += dot * nz;
          }
        }
      }
    }

    // Pocket detection
    for (const ball of this.balls) {
      if (ball.pocketed || ball.respawning) continue;
      for (const pocket of this.pocketPositions) {
        const dx = ball.position.x - pocket.x;
        const dz = ball.position.y - pocket.y;
        if (dx * dx + dz * dz < POCKET_RADIUS * POCKET_RADIUS) {
          ball.pocketed = true;
          ball.velocity.set(0, 0);
          ball.mesh.visible = false;

          if (ball.isCue) {
            ball.respawning = true;
            setTimeout(() => {
              ball.pocketed = false;
              ball.respawning = false;
              ball.mesh.visible = true;
              ball.position.set(0, TABLE_L / 3.2);
              ball.mesh.position.set(0, BALL_RADIUS, TABLE_L / 3.2);
              ball.velocity.set(0, 0);
              if (this.state === 'shooting') this.state = 'aiming';
            }, 900);
          } else {
            this.pocketedCount++;
            if (this.onBallPocketed)
              this.onBallPocketed(
                this.pocketedCount,
                ball.name,
                ball.imagePath,
              );
            if (this.pocketedCount >= this.totalBalls) {
              this.state = 'gameover';
              if (this.onGameOver) this.onGameOver(this.shots);
            }
          }
          break;
        }
      }
    }
  }

  // ─── Loop ─────────────────────────────────────────────────────────────────────

  _animate() {
    if (!this.running) return;
    this.animId = requestAnimationFrame(() => this._animate());

    if (this.state !== 'gameover') {
      this._physicsStep();
      if (this.state === 'shooting' && !this._isMoving()) {
        this.state = 'aiming';
        this._camTargetPos = this._camPlayPos;
        this._camTargetLook = this._camPlayLook;
        this._camSpeed = 0.04;
        if (this.mousePosWorld) this._drawAimFromMouse(this.mousePosWorld);
      }
    }

    // Camera lerp
    this.camera.position.lerp(this._camTargetPos, this._camSpeed);
    this._camLook.lerp(this._camTargetLook, this._camSpeed);
    this.camera.lookAt(this._camLook);

    this.renderer.render(this.scene, this.camera);
  }

  reset() {
    for (const ball of this.balls) this.scene.remove(ball.mesh);
    this.balls = [];
    this.shots = 0;
    this.pocketedCount = 0;
    this.state = 'aiming';
    this._clearAimVisuals();
    this._createBalls();
    if (this.onShotChange) this.onShotChange(0);
    if (this.onBallPocketed) this.onBallPocketed(0);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.animId);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousemove', this._onMouseMove);
    canvas.removeEventListener('mousedown', this._onMouseDown);
    canvas.removeEventListener('mouseup', this._onMouseUp);
    canvas.removeEventListener('touchstart', this._onTouchStart);
    canvas.removeEventListener('touchmove', this._onTouchMove);
    canvas.removeEventListener('touchend', this._onTouchEnd);
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
