/**
 * ParticleSystem.js
 * High-performance object-pooled particle engine.
 * Handles exhaust smoke, twin nitro flames, tire skid smoke, skid marks,
 * collision spark showers, grass/dirt kickup, and dynamic rain streaks.
 */

class ParticleSystem {
  constructor(scene) {
    this.scene = scene;

    // Sparks system (instanced / pooled points)
    this.maxSparks = 200;
    this.sparkPool = [];
    this.activeSparks = [];
    this.initSparks();

    // Smoke / Dust system (pooled sprites/planes)
    this.maxSmoke = 300;
    this.smokePool = [];
    this.activeSmoke = [];
    this.initSmoke();

    // Nitro flames
    this.maxNitro = 150;
    this.nitroPool = [];
    this.activeNitro = [];
    this.initNitro();

    // Skid marks mesh buffer
    this.maxSkidSegments = 600;
    this.skidSegments = [];
    this.initSkidMarks();

    // Rain particles
    this.rainCount = 1800;
    this.rainActive = false;
    this.rainPoints = null;
    this.initRain();
  }

  // Create circular gradient canvas for soft puff textures
  createPuffCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.3, 'rgba(230, 230, 230, 0.6)');
    grad.addColorStop(0.7, 'rgba(180, 180, 180, 0.2)');
    grad.addColorStop(1, 'rgba(150, 150, 150, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return canvas;
  }

  createGlowCanvas(innerColor, outerColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.4, outerColor);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return canvas;
  }

  initSmoke() {
    const puffTex = new THREE.CanvasTexture(this.createPuffCanvas());
    const smokeGeo = new THREE.PlaneGeometry(0.8, 0.8);
    const smokeMat = new THREE.MeshBasicMaterial({
      map: puffTex,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    for (let i = 0; i < this.maxSmoke; i++) {
      const mesh = new THREE.Mesh(smokeGeo, smokeMat.clone());
      mesh.visible = false;
      this.scene.add(mesh);
      this.smokePool.push({
        mesh: mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1.0,
        scaleSpeed: 1.5,
        startScale: 0.5,
        targetColor: new THREE.Color(0xdddddd)
      });
    }
  }

  initNitro() {
    const nitroTex = new THREE.CanvasTexture(this.createGlowCanvas('#ffffff', '#00e5ff'));
    const nitroGeo = new THREE.PlaneGeometry(0.5, 0.5);
    const nitroMat = new THREE.MeshBasicMaterial({
      map: nitroTex,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    for (let i = 0; i < this.maxNitro; i++) {
      const mesh = new THREE.Mesh(nitroGeo, nitroMat.clone());
      mesh.visible = false;
      this.scene.add(mesh);
      this.nitroPool.push({
        mesh: mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 0.35,
        startScale: 0.6
      });
    }
  }

  initSparks() {
    const sparkTex = new THREE.CanvasTexture(this.createGlowCanvas('#fff7c2', '#ff6600'));
    const sparkGeo = new THREE.PlaneGeometry(0.18, 0.18);
    const sparkMat = new THREE.MeshBasicMaterial({
      map: sparkTex,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    for (let i = 0; i < this.maxSparks; i++) {
      const mesh = new THREE.Mesh(sparkGeo, sparkMat.clone());
      mesh.visible = false;
      this.scene.add(mesh);
      this.sparkPool.push({
        mesh: mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 0.5
      });
    }
  }

  initSkidMarks() {
    // Dynamic ribbon mesh for rubber tire tracks
    const maxVertices = this.maxSkidSegments * 6;
    const positions = new Float32Array(maxVertices * 3);
    const uvs = new Float32Array(maxVertices * 2);

    this.skidGeo = new THREE.BufferGeometry();
    this.skidGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.skidGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    this.skidMat = new THREE.MeshBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0
    });

    this.skidMesh = new THREE.Mesh(this.skidGeo, this.skidMat);
    this.scene.add(this.skidMesh);
    this.skidIndex = 0;
  }

  initRain() {
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(this.rainCount * 3);
    const rainVelocities = new Float32Array(this.rainCount);

    for (let i = 0; i < this.rainCount; i++) {
      rainPositions[i * 3 + 0] = (Math.random() - 0.5) * 120;
      rainPositions[i * 3 + 1] = Math.random() * 40;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 120;
      rainVelocities[i] = 30 + Math.random() * 15;
    }

    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    this.rainVelocities = rainVelocities;

    const rainMat = new THREE.PointsMaterial({
      color: 0x90caff,
      size: 0.28,
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    });

    this.rainPoints = new THREE.Points(rainGeo, rainMat);
    this.rainPoints.visible = false;
    this.scene.add(this.rainPoints);
  }

  setRainActive(active) {
    this.rainActive = active;
    if (this.rainPoints) {
      this.rainPoints.visible = active;
    }
  }

  // Emit tire smoke on drift or hard brake
  emitTireSmoke(position, velocity, isGrass = false) {
    if (this.smokePool.length === 0) return;
    const p = this.smokePool.pop();

    p.mesh.position.copy(position);
    p.mesh.position.y = Math.max(0.1, p.mesh.position.y);
    p.mesh.visible = true;
    p.life = 0;
    p.maxLife = 0.6 + Math.random() * 0.4;
    p.startScale = 0.35;
    p.scaleSpeed = 2.2;

    const color = isGrass ? new THREE.Color(0x6e5b41) : new THREE.Color(0xefefef);
    p.mesh.material.color.copy(color);
    p.mesh.material.opacity = isGrass ? 0.6 : 0.45;

    p.velocity.set(
      velocity.x * 0.2 + (Math.random() - 0.5) * 1.5,
      0.4 + Math.random() * 0.8,
      velocity.z * 0.2 + (Math.random() - 0.5) * 1.5
    );

    this.activeSmoke.push(p);
  }

  // Emit fiery nitro flame jets
  emitNitroFlame(position, forwardVec) {
    if (this.nitroPool.length === 0) return;
    const p = this.nitroPool.pop();

    p.mesh.position.copy(position);
    p.mesh.visible = true;
    p.life = 0;
    p.maxLife = 0.25 + Math.random() * 0.1;
    p.startScale = 0.4 + Math.random() * 0.25;

    // Shoots backwards relative to car forward
    p.velocity.set(
      -forwardVec.x * 12 + (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 1.2,
      -forwardVec.z * 12 + (Math.random() - 0.5) * 2
    );

    this.activeNitro.push(p);
  }

  // Collision sparks shower
  emitSparks(position, normal, count = 25) {
    for (let i = 0; i < count; i++) {
      if (this.sparkPool.length === 0) break;
      const s = this.sparkPool.pop();

      s.mesh.position.copy(position);
      s.mesh.visible = true;
      s.life = 0;
      s.maxLife = 0.35 + Math.random() * 0.25;

      // Cone around normal with high velocity
      const spread = 8.0;
      s.velocity.set(
        normal.x * 6 + (Math.random() - 0.5) * spread,
        Math.random() * 7 + 2,
        normal.z * 6 + (Math.random() - 0.5) * spread
      );

      this.activeSparks.push(s);
    }
  }

  // Record a pair of skid marks for left/right tires
  addSkidSegment(posLeftA, posLeftB, posRightA, posRightB) {
    if (!this.skidGeo) return;
    const pos = this.skidGeo.attributes.position.array;
    const idx = (this.skidIndex % this.maxSkidSegments) * 18;

    // Left quad (2 triangles)
    // T1: posLeftA, posLeftB, posLeftA offset
    const yOff = 0.04;
    pos[idx + 0] = posLeftA.x; pos[idx + 1] = posLeftA.y + yOff; pos[idx + 2] = posLeftA.z;
    pos[idx + 3] = posLeftB.x; pos[idx + 4] = posLeftB.y + yOff; pos[idx + 5] = posLeftB.z;
    pos[idx + 6] = posRightA.x; pos[idx + 7] = posRightA.y + yOff; pos[idx + 8] = posRightA.z;

    pos[idx + 9] = posLeftB.x; pos[idx + 10] = posLeftB.y + yOff; pos[idx + 11] = posLeftB.z;
    pos[idx + 12] = posRightB.x; pos[idx + 13] = posRightB.y + yOff; pos[idx + 14] = posRightB.z;
    pos[idx + 15] = posRightA.x; pos[idx + 16] = posRightA.y + yOff; pos[idx + 17] = posRightA.z;

    this.skidIndex++;
    this.skidGeo.attributes.position.needsUpdate = true;
  }

  update(dt, camera, playerPos) {
    // 1. Update Smoke
    for (let i = this.activeSmoke.length - 1; i >= 0; i--) {
      const p = this.activeSmoke[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.mesh.visible = false;
        this.smokePool.push(p);
        this.activeSmoke.splice(i, 1);
        continue;
      }

      p.mesh.position.x += p.velocity.x * dt;
      p.mesh.position.y += p.velocity.y * dt;
      p.mesh.position.z += p.velocity.z * dt;

      // Face camera billboard
      p.mesh.quaternion.copy(camera.quaternion);

      // Expand and fade
      const progress = p.life / p.maxLife;
      const s = p.startScale + progress * p.scaleSpeed;
      p.mesh.scale.set(s, s, s);
      p.mesh.material.opacity = (1 - progress) * 0.45;
    }

    // 2. Update Nitro
    for (let i = this.activeNitro.length - 1; i >= 0; i--) {
      const p = this.activeNitro[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.mesh.visible = false;
        this.nitroPool.push(p);
        this.activeNitro.splice(i, 1);
        continue;
      }

      p.mesh.position.x += p.velocity.x * dt;
      p.mesh.position.y += p.velocity.y * dt;
      p.mesh.position.z += p.velocity.z * dt;

      p.mesh.quaternion.copy(camera.quaternion);

      const progress = p.life / p.maxLife;
      const s = p.startScale * (1 + progress * 0.8);
      p.mesh.scale.set(s, s, s);
      p.mesh.material.opacity = (1 - progress) * 0.9;
    }

    // 3. Update Sparks
    for (let i = this.activeSparks.length - 1; i >= 0; i--) {
      const s = this.activeSparks[i];
      s.life += dt;
      if (s.life >= s.maxLife) {
        s.mesh.visible = false;
        this.sparkPool.push(s);
        this.activeSparks.splice(i, 1);
        continue;
      }

      s.velocity.y -= 18.0 * dt; // gravity
      s.mesh.position.x += s.velocity.x * dt;
      s.mesh.position.y += s.velocity.y * dt;
      s.mesh.position.z += s.velocity.z * dt;

      // Bounce off ground
      if (s.mesh.position.y < 0.05) {
        s.mesh.position.y = 0.05;
        s.velocity.y = -s.velocity.y * 0.4;
      }

      s.mesh.quaternion.copy(camera.quaternion);
      const progress = s.life / s.maxLife;
      s.mesh.material.opacity = 1 - progress;
    }

    // 4. Update Rain
    if (this.rainActive && this.rainPoints && playerPos) {
      const pos = this.rainPoints.geometry.attributes.position.array;
      for (let i = 0; i < this.rainCount; i++) {
        pos[i * 3 + 1] -= this.rainVelocities[i] * dt;
        if (pos[i * 3 + 1] < 0) {
          pos[i * 3 + 0] = playerPos.x + (Math.random() - 0.5) * 100;
          pos[i * 3 + 1] = 35 + Math.random() * 15;
          pos[i * 3 + 2] = playerPos.z + (Math.random() - 0.5) * 100;
        }
      }
      this.rainPoints.geometry.attributes.position.needsUpdate = true;
    }
  }
}

window.ParticleSystem = ParticleSystem;
