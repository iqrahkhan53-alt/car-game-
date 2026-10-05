/**
 * Road.js
 * Comprehensive procedural road network engine.
 * Generates city avenues, multi-lane highways, grand suspension bridges, mountain tunnels,
 * lane markings, curbs, barriers, road signs, and waypoint curves for AI navigation and on-road detection.
 * Upgraded with realistic asphalt grain, crosswalks, suspension bridge stay cables, and apex rumble strips.
 */

// Static reusable 2D vectors for zero-GC on-road testing
const _roadPt = new THREE.Vector2();
const _roadProj = new THREE.Vector2();

class Road {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;

    // Segment definitions for on-road testing and AI paths
    // Each segment: { p1: Vector2, p2: Vector2, width: number }
    this.segments = [];

    // Grand Circuit Waypoints for racing & AI navigation
    this.raceWaypoints = [];

    // Materials
    this.initMaterials();

    // Build the grand road network
    this.buildNetwork();
  }

  createAsphaltCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Base dark asphalt
    ctx.fillStyle = '#1c1e22';
    ctx.fillRect(0, 0, 256, 256);

    // Fine aggregate noise
    for (let i = 0; i < 6000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const gray = Math.floor(25 + Math.random() * 35);
      ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 10);
    return tex;
  }

  initMaterials() {
    this.asphaltTex = this.createAsphaltCanvas();

    // Procedural asphalt material with micro-grain
    this.asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x22252a,
      map: this.asphaltTex,
      roughness: 0.88,
      metalness: 0.12
    });

    this.curbMat = new THREE.MeshStandardMaterial({
      color: 0xd0d2d6,
      roughness: 0.78,
      metalness: 0.1
    });

    this.curbRedMat = new THREE.MeshStandardMaterial({
      color: 0xcc2222,
      roughness: 0.75,
      metalness: 0.1
    });

    this.lineWhiteMat = new THREE.MeshBasicMaterial({
      color: 0xf4f6f8
    });

    this.lineYellowMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00
    });

    this.barrierMat = new THREE.MeshStandardMaterial({
      color: 0xb5bac2,
      metalness: 0.78,
      roughness: 0.32
    });

    this.cableMat = new THREE.MeshStandardMaterial({
      color: 0x485058,
      metalness: 0.9,
      roughness: 0.3
    });

    this.concreteMat = new THREE.MeshStandardMaterial({
      color: 0x545860,
      roughness: 0.9,
      metalness: 0.12
    });

    this.tunnelMat = new THREE.MeshStandardMaterial({
      color: 0x282b30,
      roughness: 0.82,
      metalness: 0.18
    });

    this.tunnelLightMat = new THREE.MeshStandardMaterial({
      color: 0xffaa22,
      emissive: 0xff8811,
      emissiveIntensity: 2.5
    });

    this.warningHazardMat = new THREE.MeshStandardMaterial({
      color: 0xffb300,
      emissive: 0x885500,
      emissiveIntensity: 0.5
    });
  }

  buildNetwork() {
    this.roadGroup = new THREE.Group();
    this.scene.add(this.roadGroup);

    // 1. Downtown City Grid:
    // Main North-South Central Boulevard: X: -30 to 30, Z: -350 to 350
    this.createStraightRoad(0, 0, 0, -350, 0, 350, 24, true);

    // East-West 1st Avenue: Z = -150, X: -250 to 250
    this.createStraightRoad(-250, 0, -150, 250, 0, -150, 20, true);

    // East-West 2nd Avenue: Z = 150, X: -250 to 250
    this.createStraightRoad(-250, 0, 150, 250, 0, 150, 20, true);

    // Outer East Ring Road: X = 250, Z: -250 to 250
    this.createStraightRoad(250, 0, -250, 250, 0, 250, 18, true);

    // Outer West Ring Road: X = -250, Z: -250 to 250
    this.createStraightRoad(-250, 0, -250, -250, 0, 250, 18, true);

    // Crosswalk Zebra Stripes at Major Downtown Junctions
    this.createCrosswalk(0, 150, 24, true);
    this.createCrosswalk(0, -150, 24, true);
    this.createCrosswalk(0, 0, 24, false);

    // 2. Grand Suspension Bridge across northern bay
    this.createSuspensionBridge(0, -350, 0, -750, 22);

    // 3. Mountain Pass & Curved Hairpins with Apex Rumble Strips
    this.createMountainRoad();

    // 4. Mountain Highway Tunnel
    this.createTunnel(400, 8, -850, 400, 0, -450, 20);

    // 5. Coastal Highway
    this.createCoastalHighway();

    // 6. Generate Circuit Race Waypoints
    this.generateCircuitWaypoints();
  }

  createCrosswalk(cx, cz, width, isNorthSouth) {
    const stripesGroup = new THREE.Group();
    const numStripes = 8;
    const stripeW = 0.65;
    const stripeL = 3.6;

    for (let i = 0; i < numStripes; i++) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(isNorthSouth ? stripeW : stripeL, 0.02, isNorthSouth ? stripeL : stripeW),
        this.lineWhiteMat
      );
      const offset = (i - numStripes * 0.5 + 0.5) * (width / numStripes);
      if (isNorthSouth) {
        stripe.position.set(cx + offset, 0.15, cz);
      } else {
        stripe.position.set(cx, 0.15, cz + offset);
      }
      stripesGroup.add(stripe);
    }
    this.roadGroup.add(stripesGroup);
  }

  /**
   * Create a straight road segment with asphalt deck, lane stripes, and side curbs
   */
  createStraightRoad(x1, y1, z1, x2, y2, z2, width = 18, hasCurbs = true) {
    const p1 = new THREE.Vector3(x1, y1, z1);
    const p2 = new THREE.Vector3(x2, y2, z2);
    const len = p1.distanceTo(p2);
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

    const angle = Math.atan2(x2 - x1, z2 - z1);

    // Main Asphalt Deck
    const roadGeo = new THREE.BoxGeometry(width, 0.16, len);
    const roadMesh = new THREE.Mesh(roadGeo, this.asphaltMat);
    roadMesh.position.set(mid.x, mid.y + 0.05, mid.z);
    roadMesh.rotation.y = angle;
    roadMesh.receiveShadow = true;
    this.roadGroup.add(roadMesh);

    // Yellow Double Center Line
    const centerLineGeo = new THREE.BoxGeometry(0.24, 0.02, len);
    const centerLine1 = new THREE.Mesh(centerLineGeo, this.lineYellowMat);
    centerLine1.position.set(mid.x - Math.cos(angle) * 0.22, mid.y + 0.14, mid.z + Math.sin(angle) * 0.22);
    centerLine1.rotation.y = angle;
    this.roadGroup.add(centerLine1);

    const centerLine2 = new THREE.Mesh(centerLineGeo, this.lineYellowMat);
    centerLine2.position.set(mid.x + Math.cos(angle) * 0.22, mid.y + 0.14, mid.z - Math.sin(angle) * 0.22);
    centerLine2.rotation.y = angle;
    this.roadGroup.add(centerLine2);

    // White Dashed Lane Lines
    const dashLength = 4.2;
    const dashGap = 6.2;
    const numDashes = Math.floor(len / (dashLength + dashGap));
    const forwardNorm = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
    const rightNorm = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle));

    const laneOffsets = [-width * 0.25, width * 0.25];
    laneOffsets.forEach(laneOffset => {
      const dashGeo = new THREE.BoxGeometry(0.2, 0.02, dashLength);
      for (let i = 0; i < numDashes; i++) {
        const dOffset = -len * 0.5 + i * (dashLength + dashGap) + dashLength * 0.5;
        const dashMesh = new THREE.Mesh(dashGeo, this.lineWhiteMat);
        const dashPos = mid.clone()
          .add(forwardNorm.clone().multiplyScalar(dOffset))
          .add(rightNorm.clone().multiplyScalar(laneOffset));
        dashMesh.position.set(dashPos.x, mid.y + 0.14, dashPos.z);
        dashMesh.rotation.y = angle;
        this.roadGroup.add(dashMesh);
      }
    });

    // Side Curbs / Sidewalks
    if (hasCurbs) {
      const curbWidth = 1.6;
      const curbHeight = 0.28;
      const curbGeo = new THREE.BoxGeometry(curbWidth, curbHeight, len);

      const curbL = new THREE.Mesh(curbGeo, this.curbMat);
      const posL = mid.clone().add(rightNorm.clone().multiplyScalar(-width * 0.5 - curbWidth * 0.5));
      curbL.position.set(posL.x, mid.y + curbHeight * 0.5, posL.z);
      curbL.rotation.y = angle;
      curbL.receiveShadow = true;
      this.roadGroup.add(curbL);

      const curbR = new THREE.Mesh(curbGeo, this.curbMat);
      const posR = mid.clone().add(rightNorm.clone().multiplyScalar(width * 0.5 + curbWidth * 0.5));
      curbR.position.set(posR.x, mid.y + curbHeight * 0.5, posR.z);
      curbR.rotation.y = angle;
      curbR.receiveShadow = true;
      this.roadGroup.add(curbR);
    }

    // Register segment for on-road check
    this.segments.push({
      p1: new THREE.Vector2(x1, z1),
      p2: new THREE.Vector2(x2, z2),
      width: width + 2.5
    });
  }

  /**
   * Create Grand Suspension Bridge across the northern bay with stay cables
   */
  createSuspensionBridge(x1, z1, x2, z2, width = 22) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const midX = (x1 + x2) * 0.5;
    const midZ = (z1 + z2) * 0.5;
    const bridgeHeight = 8.0;

    // Road Deck
    const deckGeo = new THREE.BoxGeometry(width, 1.4, len);
    const deck = new THREE.Mesh(deckGeo, this.concreteMat);
    deck.position.set(midX, bridgeHeight, midZ);
    deck.castShadow = true;
    deck.receiveShadow = true;
    this.roadGroup.add(deck);

    // Asphalt surface on deck
    const asphaltGeo = new THREE.BoxGeometry(width - 2.0, 0.12, len);
    const asphalt = new THREE.Mesh(asphaltGeo, this.asphaltMat);
    asphalt.position.set(midX, bridgeHeight + 0.72, midZ);
    this.roadGroup.add(asphalt);

    // Yellow double center line
    const clGeo = new THREE.BoxGeometry(0.3, 0.05, len);
    const cl = new THREE.Mesh(clGeo, this.lineYellowMat);
    cl.position.set(midX, bridgeHeight + 0.8, midZ);
    this.roadGroup.add(cl);

    // Guard Rails & Crash Barriers
    const railGeo = new THREE.BoxGeometry(0.65, 1.4, len);
    [-width * 0.5 + 0.32, width * 0.5 - 0.32].forEach(offset => {
      const rail = new THREE.Mesh(railGeo, this.barrierMat);
      rail.position.set(midX + offset, bridgeHeight + 1.25, midZ);
      this.roadGroup.add(rail);

      const box = new THREE.Box3();
      box.setFromObject(rail);
      this.physics.registerCollider(box, 'barrier');
    });

    // Twin Suspension Towers
    const towerOffsets = [-len * 0.25, len * 0.25];
    towerOffsets.forEach(zOffset => {
      const towerGroup = new THREE.Group();
      towerGroup.position.set(midX, 0, midZ + zOffset);

      // Tower legs
      const legGeo = new THREE.BoxGeometry(3.6, 56, 4.8);
      const legL = new THREE.Mesh(legGeo, this.barrierMat);
      legL.position.set(-width * 0.5 - 1.6, 28, 0);
      legL.castShadow = true;

      const legR = new THREE.Mesh(legGeo, this.barrierMat);
      legR.position.set(width * 0.5 + 1.6, 28, 0);
      legR.castShadow = true;

      // Crossbeams
      const cross1 = new THREE.Mesh(new THREE.BoxGeometry(width + 8, 3.6, 4.2), this.barrierMat);
      cross1.position.set(0, 52, 0);
      const cross2 = new THREE.Mesh(new THREE.BoxGeometry(width + 8, 3.6, 4.2), this.barrierMat);
      cross2.position.set(0, 34, 0);

      // Red aircraft warning beacon lights on tower tops
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });
      [-width * 0.5 - 1.6, width * 0.5 + 1.6].forEach(bx => {
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.65, 8, 8), beaconMat);
        beacon.position.set(bx, 56.5, 0);
        towerGroup.add(beacon);
      });

      towerGroup.add(legL, legR, cross1, cross2);
      this.roadGroup.add(towerGroup);

      const b1 = new THREE.Box3(); b1.setFromObject(legL); this.physics.registerCollider(b1, 'building');
      const b2 = new THREE.Box3(); b2.setFromObject(legR); this.physics.registerCollider(b2, 'building');

      // Steel Stay Suspension Cables dropping from tower crossbeam to deck
      for (let c = -6; c <= 6; c++) {
        if (c === 0) continue;
        const deckZ = zOffset + c * 16;
        if (Math.abs(deckZ) < len * 0.48) {
          [-width * 0.5 - 0.8, width * 0.5 + 0.8].forEach(cx => {
            const cableP1 = new THREE.Vector3(midX + cx, 52, midZ + zOffset);
            const cableP2 = new THREE.Vector3(midX + cx, bridgeHeight + 1.2, midZ + deckZ);
            const cableLen = cableP1.distanceTo(cableP2);
            const cableGeo = new THREE.CylinderGeometry(0.06, 0.06, cableLen, 6);
            const cableMesh = new THREE.Mesh(cableGeo, this.cableMat);
            cableMesh.position.copy(cableP1).add(cableP2).multiplyScalar(0.5);
            cableMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), cableP2.clone().sub(cableP1).normalize());
            this.roadGroup.add(cableMesh);
          });
        }
      }
    });

    // Deep Water Surface beneath the bridge
    const waterGeo = new THREE.PlaneGeometry(700, len + 250);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x082b48,
      metalness: 0.94,
      roughness: 0.12,
      transparent: true,
      opacity: 0.92
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(midX, -0.2, midZ);
    this.roadGroup.add(water);

    this.segments.push({
      p1: new THREE.Vector2(x1, z1),
      p2: new THREE.Vector2(x2, z2),
      width: width
    });
  }

  /**
   * Create Winding Mountain Road with hairpins, guardrails, and apex rumble strips
   */
  createMountainRoad() {
    const waypoints = [
      { x: 0, z: -750 },
      { x: 80, z: -830 },
      { x: 190, z: -920 },
      { x: 300, z: -1000 },
      { x: 390, z: -940 },
      { x: 400, z: -850 }
    ];

    for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];
      this.createStraightRoad(p1.x, 0, p1.z, p2.x, 0, p2.z, 18, true);

      // Guardrails on outer mountain cliff edge
      const angle = Math.atan2(p2.x - p1.x, p2.z - p1.z);
      const len = Math.hypot(p2.x - p1.x, p2.z - p1.z);
      const midX = (p1.x + p2.x) * 0.5;
      const midZ = (p1.z + p2.z) * 0.5;

      const railGeo = new THREE.BoxGeometry(0.38, 1.15, len);
      const rail = new THREE.Mesh(railGeo, this.barrierMat);
      rail.position.set(midX + Math.cos(angle) * 9.6, 0.6, midZ - Math.sin(angle) * 9.6);
      rail.rotation.y = angle;
      this.roadGroup.add(rail);

      const box = new THREE.Box3();
      box.setFromObject(rail);
      this.physics.registerCollider(box, 'barrier');

      // Alternating Red & White Apex Rumble Strips on inner corner
      const numBlocks = Math.floor(len / 2.5);
      for (let b = 0; b < numBlocks; b++) {
        const mat = (b % 2 === 0) ? this.curbRedMat : this.curbMat;
        const block = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 2.2), mat);
        const t = (b + 0.5) / numBlocks;
        const bx = p1.x + t * (p2.x - p1.x) - Math.cos(angle) * 9.4;
        const bz = p1.z + t * (p2.z - p1.z) + Math.sin(angle) * 9.4;
        block.position.set(bx, 0.12, bz);
        block.rotation.y = angle;
        this.roadGroup.add(block);
      }
    }
  }

  /**
   * Create Mountain Highway Tunnel with arched tube and warm neon lighting
   */
  createTunnel(x1, y1, z1, x2, y2, z2, width = 20) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const midX = (x1 + x2) * 0.5;
    const midZ = (z1 + z2) * 0.5;

    this.createStraightRoad(x1, 0, z1, x2, 0, z2, width, true);

    const tunnelGroup = new THREE.Group();
    tunnelGroup.position.set(midX, 0, midZ);

    // Arched concrete vault
    const tubeGeo = new THREE.CylinderGeometry(width * 0.68, width * 0.68, len, 24, 1, true, 0, Math.PI);
    tubeGeo.rotateZ(Math.PI / 2);
    tubeGeo.rotateY(Math.PI / 2);
    const tubeMesh = new THREE.Mesh(tubeGeo, this.tunnelMat);
    tubeMesh.position.y = 0.5;
    tubeMesh.castShadow = true;
    tunnelGroup.add(tubeMesh);

    // Overhead yellow sodium tunnel light strips
    const lightStripGeo = new THREE.BoxGeometry(0.4, 0.15, len);
    const lightStripL = new THREE.Mesh(lightStripGeo, this.tunnelLightMat);
    lightStripL.position.set(-width * 0.32, 6.2, 0);

    const lightStripR = new THREE.Mesh(lightStripGeo, this.tunnelLightMat);
    lightStripR.position.set(width * 0.32, 6.2, 0);

    tunnelGroup.add(lightStripL, lightStripR);
    this.roadGroup.add(tunnelGroup);

    // Tunnel wall colliders
    const wallGeo = new THREE.BoxGeometry(1.2, 8.0, len);
    const wallL = new THREE.Mesh(wallGeo, this.concreteMat);
    wallL.position.set(midX - width * 0.55, 4.0, midZ);
    const wallR = new THREE.Mesh(wallGeo, this.concreteMat);
    wallR.position.set(midX + width * 0.55, 4.0, midZ);

    const bL = new THREE.Box3(); bL.setFromObject(wallL); this.physics.registerCollider(bL, 'barrier');
    const bR = new THREE.Box3(); bR.setFromObject(wallR); this.physics.registerCollider(bR, 'barrier');
  }

  /**
   * Create Coastal Highway connecting tunnel to south downtown
   */
  createCoastalHighway() {
    const waypoints = [
      { x: 400, z: -450 },
      { x: 410, z: -150 },
      { x: 390, z: 150 },
      { x: 320, z: 350 },
      { x: 180, z: 420 },
      { x: 0, z: 350 }
    ];

    for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];
      this.createStraightRoad(p1.x, 0, p1.z, p2.x, 0, p2.z, 20, true);
    }
  }

  generateCircuitWaypoints() {
    this.raceWaypoints = [
      new THREE.Vector3(0, 0, 100),
      new THREE.Vector3(0, 0, -50),
      new THREE.Vector3(0, 0, -200),
      new THREE.Vector3(0, 0, -380),
      new THREE.Vector3(0, 0, -550),
      new THREE.Vector3(0, 0, -720),
      new THREE.Vector3(80, 0, -830),
      new THREE.Vector3(190, 0, -920),
      new THREE.Vector3(300, 0, -1000),
      new THREE.Vector3(390, 0, -940),
      new THREE.Vector3(400, 0, -820),
      new THREE.Vector3(400, 0, -650),
      new THREE.Vector3(400, 0, -480),
      new THREE.Vector3(410, 0, -250),
      new THREE.Vector3(405, 0, 0),
      new THREE.Vector3(385, 0, 200),
      new THREE.Vector3(320, 0, 350),
      new THREE.Vector3(180, 0, 420),
      new THREE.Vector3(40, 0, 360),
      new THREE.Vector3(0, 0, 260)
    ];
  }

  /**
   * Zero-GC Check if coordinate (x, z) is on an asphalt road surface
   */
  isPointOnRoad(x, z) {
    _roadPt.set(x, z);
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const dist = this.distToSegment(_roadPt, seg.p1, seg.p2);
      if (dist <= seg.width * 0.5) {
        return true;
      }
    }
    return false;
  }

  distToSegment(p, v, w) {
    const l2 = v.distanceToSquared(w);
    if (l2 === 0) return p.distanceTo(v);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    _roadProj.set(v.x + t * (w.x - v.x), v.y + t * (w.y - v.y));
    return p.distanceTo(_roadProj);
  }
}

window.Road = Road;
