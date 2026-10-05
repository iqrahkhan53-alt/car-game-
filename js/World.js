/**
 * World.js
 * Rich 3D open-world city and terrain builder.
 * Generates skyscrapers with illuminated windows, neon billboards, gas stations,
 * streetlights, traffic lights, houses, mountain ridges, rocks, trees, and registers colliders.
 * Upgraded with recognized landmarks, hospital, mall, airport, and interactive 3D GPS waypoint beacon.
 */

class World {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;

    this.streetLights = [];
    this.buildingWindows = [];
    this.billboardMeshes = [];

    // Registered Open-World Landmarks for GPS and World Map
    this.landmarks = [
      { id: 'downtown', name: 'Metropolis Financial District', category: 'City', icon: '🏢', x: 0, z: 0, desc: 'Downtown center with towering modern corporate skyscrapers' },
      { id: 'hospital', name: 'St. Jude Medical Hospital', category: 'Emergency', icon: '🏥', x: -140, z: -80, desc: 'Emergency trauma center with ambulance bay and helipad' },
      { id: 'mall', name: 'Cyber City Grand Mall', category: 'Shopping', icon: '🛍️', x: 140, z: -80, desc: 'Multi-level shopping plaza with underground parking' },
      { id: 'academy', name: 'Downtown Tech Academy', category: 'Education', icon: '🎓', x: 140, z: 80, desc: 'University campus with iconic clock tower' },
      { id: 'gas_station', name: 'Neon 24/7 Gas & Service', category: 'Service', icon: '⛽', x: 70, z: 180, desc: 'High-octane fuel pumps, convenience store, and service bay' },
      { id: 'airport', name: 'Apex International Airport', category: 'Transit', icon: '✈️', x: -220, z: 260, desc: 'Airport passenger terminal with runway beacon lights' },
      { id: 'docks', name: 'Harbor Port & Industrial Docks', category: 'Industrial', icon: '⚓', x: -180, z: -220, desc: 'Container cargo depot with industrial stunt ramps' },
      { id: 'bridge', name: 'Grand Bay Suspension Bridge', category: 'Landmark', icon: '🌉', x: 0, z: -550, desc: 'Massive dual-tower suspension bridge across the northern bay' },
      { id: 'mountain', name: 'Mount Vista Ridge & Hairpins', category: 'Nature', icon: '⛰️', x: 200, z: -920, desc: 'Winding mountain hairpins with cliffside guardrails' },
      { id: 'tunnel', name: 'Blackrock Mountain Tunnel', category: 'Highway', icon: '🚇', x: 400, z: -650, desc: 'High-speed illuminated arched highway tunnel through the mountain' },
      { id: 'coast', name: 'Emerald Coastline Boulevard', category: 'Scenic', icon: '🏖️', x: 380, z: 100, desc: 'Oceanfront scenic highway with palm trees and ocean views' }
    ];

    // GPS 3D Beacon State
    this.gpsWaypoint = {
      active: false,
      x: 0,
      z: 0,
      name: ''
    };

    this.initTextures();
    this.buildWorld();
    this.initGPSBeacon();
  }

  initTextures() {
    // 1. High-Resolution Procedural Skyscraper Window Texture
    const bCanvas = document.createElement('canvas');
    bCanvas.width = 512;
    bCanvas.height = 512;
    const bCtx = bCanvas.getContext('2d');
    bCtx.fillStyle = '#171920';
    bCtx.fillRect(0, 0, 512, 512);

    for (let y = 14; y < 500; y += 28) {
      for (let x = 14; x < 500; x += 22) {
        const isLit = Math.random() > 0.38;
        if (isLit) {
          const warm = Math.random() > 0.35;
          bCtx.fillStyle = warm ? 'rgba(255, 235, 175, 0.95)' : 'rgba(120, 205, 255, 0.92)';
        } else {
          bCtx.fillStyle = '#0f1116';
        }
        bCtx.fillRect(x, y, 16, 18);
      }
    }
    this.buildingTex = new THREE.CanvasTexture(bCanvas);
    this.buildingTex.wrapS = THREE.RepeatWrapping;
    this.buildingTex.wrapT = THREE.RepeatWrapping;

    // 2. Neon Billboard Textures
    this.billboardTextures = [
      this.createBillboardCanvas('APEX MOTORSPORT', 'FEEL THE HIGH SPEED', '#00f0ff', '#ff0077'),
      this.createBillboardCanvas('TURBO FUEL 98', 'POWER YOUR HORSEPOWER', '#ffb300', '#ff3300'),
      this.createBillboardCanvas('NEO TOKYO DRIFT', 'UNDERGROUND RACING LEAGUE', '#a855f7', '#00e5ff'),
      this.createBillboardCanvas('HYPERION TIRES', 'MAXIMUM GRIP & TRACTION', '#22c55e', '#3b82f6')
    ];

    // Terrain Ground Material
    this.groundMat = new THREE.MeshStandardMaterial({
      color: 0x223c20,
      roughness: 0.95,
      metalness: 0.04
    });

    this.mountainMat = new THREE.MeshStandardMaterial({
      color: 0x46423d,
      roughness: 0.9,
      metalness: 0.1
    });

    this.concreteMat = new THREE.MeshStandardMaterial({
      color: 0x4e5158,
      roughness: 0.85,
      metalness: 0.14
    });

    this.treeWoodMat = new THREE.MeshStandardMaterial({
      color: 0x3d2817,
      roughness: 0.9
    });

    this.treeLeavesMat = new THREE.MeshStandardMaterial({
      color: 0x1d5c2b,
      roughness: 0.85
    });

    this.pineLeavesMat = new THREE.MeshStandardMaterial({
      color: 0x153e20,
      roughness: 0.85
    });

    this.rockMat = new THREE.MeshStandardMaterial({
      color: 0x5e5a55,
      roughness: 0.9,
      metalness: 0.1
    });
  }

  createBillboardCanvas(title, subtitle, color1, color2) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 512, 256);
    grad.addColorStop(0, '#090c16');
    grad.addColorStop(1, '#141826');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = color1;
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 492, 236);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = color1;
    ctx.shadowBlur = 18;
    ctx.fillText(title, 256, 110);

    ctx.fillStyle = color2;
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.shadowColor = color2;
    ctx.shadowBlur = 12;
    ctx.fillText(subtitle, 256, 160);

    return new THREE.CanvasTexture(canvas);
  }

  initGPSBeacon() {
    this.beaconGroup = new THREE.Group();
    this.beaconGroup.visible = false;
    this.scene.add(this.beaconGroup);

    // Vertical Light Beam reaching into the sky (120m tall)
    const beamGeo = new THREE.CylinderGeometry(0.8, 1.6, 140, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.beaconBeam = new THREE.Mesh(beamGeo, beamMat);
    this.beaconBeam.position.y = 70;
    this.beaconGroup.add(this.beaconBeam);

    // Rotating Holographic Rings
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.85
    });
    this.beaconRing1 = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.22, 12, 32), ringMat);
    this.beaconRing1.position.y = 8;
    this.beaconRing1.rotation.x = Math.PI / 2;
    this.beaconGroup.add(this.beaconRing1);

    this.beaconRing2 = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.18, 12, 32), ringMat);
    this.beaconRing2.position.y = 12;
    this.beaconRing2.rotation.x = Math.PI / 2;
    this.beaconGroup.add(this.beaconRing2);

    // Ground Pulsing Ripple Disk
    const groundDiskMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.beaconDisk = new THREE.Mesh(new THREE.RingGeometry(0.5, 4.5, 32), groundDiskMat);
    this.beaconDisk.rotation.x = -Math.PI / 2;
    this.beaconDisk.position.y = 0.15;
    this.beaconGroup.add(this.beaconDisk);
  }

  setGPSWaypoint(x, z, name = 'Target Destination') {
    this.gpsWaypoint.active = true;
    this.gpsWaypoint.x = x;
    this.gpsWaypoint.z = z;
    this.gpsWaypoint.name = name;

    this.beaconGroup.position.set(x, 0, z);
    this.beaconGroup.visible = true;
  }

  clearGPSWaypoint() {
    this.gpsWaypoint.active = false;
    this.beaconGroup.visible = false;
  }

  buildWorld() {
    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);

    // 1. Vast Terrain Ground
    const groundGeo = new THREE.PlaneGeometry(3200, 3200, 40, 40);
    const ground = new THREE.Mesh(groundGeo, this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.worldGroup.add(ground);

    // 2. Downtown City Blocks & Skyscrapers
    this.buildDowntownBlocks();

    // 3. Named Landmarks: Hospital, Mall, Academy, Airport
    this.buildHospital(-140, 0, -80);
    this.buildMall(140, 0, -80);
    this.buildAcademy(140, 0, 80);
    this.buildAirport(-220, 0, 260);

    // 4. Neon Billboards & Roadside Signs
    this.buildBillboards();

    // 5. Modern Gas Station with Canopy & Convenience Store
    this.buildGasStation(70, 0, 180);

    // 6. Mountain Ridges & Hills
    this.buildMountains();

    // 7. Streetlights & Traffic Lights
    this.buildStreetLights();

    // 8. Trees & Rocks
    this.buildVegetationAndRocks();

    // 9. Industrial Warehouses & Stunt Ramps
    this.buildIndustrialPark(-180, 0, -220);
  }

  buildDowntownBlocks() {
    const blockCenters = [
      { x: -140, z: -80, w: 160, d: 90 },
      { x: 140, z: -80, w: 160, d: 90 },
      { x: -140, z: 80, w: 160, d: 90 },
      { x: 140, z: 80, w: 160, d: 90 },
      { x: -140, z: -250, w: 160, d: 120 },
      { x: 140, z: -250, w: 160, d: 120 },
      { x: -140, z: 250, w: 160, d: 120 }
    ];

    blockCenters.forEach(blk => {
      const baseGeo = new THREE.BoxGeometry(blk.w, 0.4, blk.d);
      const base = new THREE.Mesh(baseGeo, this.concreteMat);
      base.position.set(blk.x, 0.2, blk.z);
      base.receiveShadow = true;
      this.worldGroup.add(base);

      const cols = 3;
      const rows = 2;
      const slotW = blk.w / cols;
      const slotD = blk.d / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Leave room for landmarks in blocks
          if (Math.random() > 0.2) {
            const bx = blk.x - blk.w * 0.5 + slotW * (c + 0.5) + (Math.random() - 0.5) * 4;
            const bz = blk.z - blk.d * 0.5 + slotD * (r + 0.5) + (Math.random() - 0.5) * 4;
            const bw = slotW * (0.68 + Math.random() * 0.22);
            const bd = slotD * (0.68 + Math.random() * 0.22);
            const bh = 28 + Math.random() * 88;

            this.createSkyscraper(bx, bz, bw, bd, bh);
          }
        }
      }
    });
  }

  createSkyscraper(x, z, w, d, h) {
    const geo = new THREE.BoxGeometry(w, h, d);

    const mat = new THREE.MeshStandardMaterial({
      color: 0x1d2028,
      map: this.buildingTex,
      metalness: 0.68,
      roughness: 0.32
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h * 0.5, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.worldGroup.add(mesh);
    this.buildingWindows.push(mesh);

    // Rooftop Communications Spire
    if (Math.random() > 0.35) {
      const spireH = 9 + Math.random() * 16;
      const spire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.45, spireH, 8),
        this.concreteMat
      );
      spire.position.set(x, h + spireH * 0.5, z);
      this.worldGroup.add(spire);

      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff1122 });
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), beaconMat);
      beacon.position.set(x, h + spireH, z);
      this.worldGroup.add(beacon);
    }

    const box = new THREE.Box3();
    box.setFromObject(mesh);
    this.physics.registerCollider(box, 'building');
  }

  // 🏥 St. Jude Medical Hospital (Medical cross, emergency bay)
  buildHospital(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const hospMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.2, roughness: 0.4 });
    const mainBuilding = new THREE.Mesh(new THREE.BoxGeometry(38, 22, 28), hospMat);
    mainBuilding.position.y = 11;
    mainBuilding.castShadow = true;
    group.add(mainBuilding);

    // Glowing Red Medical Cross Sign on facade
    const redMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(1.4, 6.2, 0.2), redMat);
    crossV.position.set(0, 18, 14.2);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(6.2, 1.4, 0.2), redMat);
    crossH.position.set(0, 18, 14.2);
    group.add(crossV, crossH);

    // Emergency Bay Canopy
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.5 });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(16, 1.0, 10), canopyMat);
    canopy.position.set(0, 4.5, 18);
    group.add(canopy);

    const b = new THREE.Box3();
    b.setFromCenterAndSize(new THREE.Vector3(x, 11, z), new THREE.Vector3(38, 22, 28));
    this.physics.registerCollider(b, 'building');

    this.worldGroup.add(group);
  }

  // 🛍️ Cyber City Grand Mall
  buildMall(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const mallMat = new THREE.MeshStandardMaterial({ color: 0x242834, metalness: 0.5, roughness: 0.3 });
    const mallMesh = new THREE.Mesh(new THREE.BoxGeometry(42, 16, 32), mallMat);
    mallMesh.position.y = 8;
    mallMesh.castShadow = true;
    group.add(mallMesh);

    // Neon Mall Signboard
    const signMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00d4ff, emissiveIntensity: 2.2 });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(24, 2.5, 0.3), signMat);
    sign.position.set(0, 13, 16.2);
    group.add(sign);

    const b = new THREE.Box3();
    b.setFromCenterAndSize(new THREE.Vector3(x, 8, z), new THREE.Vector3(42, 16, 32));
    this.physics.registerCollider(b, 'building');

    this.worldGroup.add(group);
  }

  // 🎓 Downtown Tech Academy
  buildAcademy(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const acadMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3c, metalness: 0.1, roughness: 0.8 });
    const mainCampus = new THREE.Mesh(new THREE.BoxGeometry(36, 14, 24), acadMat);
    mainCampus.position.y = 7;
    mainCampus.castShadow = true;
    group.add(mainCampus);

    // Clock Tower Spire
    const tower = new THREE.Mesh(new THREE.BoxGeometry(6, 28, 6), acadMat);
    tower.position.set(0, 14, 0);
    tower.castShadow = true;
    group.add(tower);

    // Illuminated Clock Face
    const clockMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const clock = new THREE.Mesh(new THREE.CircleGeometry(1.6, 16), clockMat);
    clock.position.set(0, 24, 3.05);
    group.add(clock);

    const b = new THREE.Box3();
    b.setFromCenterAndSize(new THREE.Vector3(x, 10, z), new THREE.Vector3(36, 20, 24));
    this.physics.registerCollider(b, 'building');

    this.worldGroup.add(group);
  }

  // ✈️ Apex International Airport Terminal & Tower
  buildAirport(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const termMat = new THREE.MeshStandardMaterial({ color: 0x8a929e, metalness: 0.6, roughness: 0.3 });
    const terminal = new THREE.Mesh(new THREE.BoxGeometry(55, 12, 28), termMat);
    terminal.position.y = 6;
    terminal.castShadow = true;
    group.add(terminal);

    // Air Traffic Control Tower
    const towerShaft = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.2, 34, 12), this.concreteMat);
    towerShaft.position.set(22, 17, 0);
    towerShaft.castShadow = true;
    group.add(towerShaft);

    // Glass Control Cabin on Top
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x0088cc, emissiveIntensity: 1.2, transparent: true, opacity: 0.85 });
    const cabin = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 4.2, 4.5, 12), cabinMat);
    cabin.position.set(22, 34, 0);
    group.add(cabin);

    const b = new THREE.Box3();
    b.setFromCenterAndSize(new THREE.Vector3(x, 10, z), new THREE.Vector3(55, 20, 28));
    this.physics.registerCollider(b, 'building');

    this.worldGroup.add(group);
  }

  buildBillboards() {
    const billboardLocations = [
      { x: 18, z: 0, rot: Math.PI / 2 },
      { x: -18, z: -100, rot: -Math.PI / 2 },
      { x: 18, z: 200, rot: Math.PI / 2 },
      { x: 150, z: -165, rot: 0 },
      { x: -150, z: 165, rot: Math.PI },
      { x: 380, z: -200, rot: -Math.PI / 2 }
    ];

    billboardLocations.forEach((loc, idx) => {
      const group = new THREE.Group();
      group.position.set(loc.x, 0, loc.z);
      group.rotation.y = loc.rot;

      const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 12, 12), this.concreteMat);
      pylon.position.y = 6;
      pylon.castShadow = true;
      group.add(pylon);

      const tex = this.billboardTextures[idx % this.billboardTextures.length];
      const boardMat = new THREE.MeshBasicMaterial({ map: tex });
      const board = new THREE.Mesh(new THREE.BoxGeometry(16, 8, 0.6), boardMat);
      board.position.y = 12;
      board.castShadow = true;
      group.add(board);

      this.worldGroup.add(group);
      this.billboardMeshes.push(board);

      const box = new THREE.Box3();
      box.setFromObject(pylon);
      this.physics.registerCollider(box, 'obstacle');
    });
  }

  buildGasStation(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Canopy
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.5, roughness: 0.3 });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(22, 1.2, 14), canopyMat);
    canopy.position.y = 5.6;
    canopy.castShadow = true;
    group.add(canopy);

    // Neon trim
    const neonMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00d4ff,
      emissiveIntensity: 2.2
    });
    const neonTrim = new THREE.Mesh(new THREE.BoxGeometry(22.4, 0.3, 14.4), neonMat);
    neonTrim.position.y = 5.8;
    group.add(neonTrim);

    // Pillars
    [-8, 8].forEach(px => {
      [-4, 4].forEach(pz => {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 5.2, 12), this.concreteMat);
        pillar.position.set(px, 2.6, pz);
        pillar.castShadow = true;
        group.add(pillar);

        const box = new THREE.Box3();
        box.setFromCenterAndSize(new THREE.Vector3(x + px, 2.6, z + pz), new THREE.Vector3(1.2, 5.2, 1.2));
        this.physics.registerCollider(box, 'obstacle');
      });
    });

    // Pumps
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0xff3344, metalness: 0.4, roughness: 0.4 });
    [-5, 5].forEach(px => {
      const pump = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 1.0), pumpMat);
      pump.position.set(px, 1.2, 0);
      group.add(pump);

      const b = new THREE.Box3();
      b.setFromCenterAndSize(new THREE.Vector3(x + px, 1.2, z), new THREE.Vector3(1.6, 2.4, 1.0));
      this.physics.registerCollider(b, 'obstacle');
    });

    // Store
    const storeMat = new THREE.MeshStandardMaterial({ color: 0x2a2e3a, metalness: 0.3, roughness: 0.5 });
    const store = new THREE.Mesh(new THREE.BoxGeometry(18, 5, 10), storeMat);
    store.position.set(0, 2.5, 16);
    store.castShadow = true;
    group.add(store);

    const storeBox = new THREE.Box3();
    storeBox.setFromCenterAndSize(new THREE.Vector3(x, 2.5, z + 16), new THREE.Vector3(18, 5, 10));
    this.physics.registerCollider(storeBox, 'building');

    this.worldGroup.add(group);
  }

  buildMountains() {
    const mountainPositions = [
      { x: -350, z: -850, r: 190, h: 95 },
      { x: -180, z: -950, r: 220, h: 130 },
      { x: 120, z: -1080, r: 250, h: 145 },
      { x: 380, z: -1120, r: 230, h: 135 },
      { x: 550, z: -900, r: 210, h: 115 },
      { x: 520, z: -650, r: 195, h: 100 }
    ];

    mountainPositions.forEach(m => {
      const geo = new THREE.ConeGeometry(m.r, m.h, 12);
      const mesh = new THREE.Mesh(geo, this.mountainMat);
      mesh.position.set(m.x, m.h * 0.45, m.z);
      mesh.rotation.y = Math.random() * Math.PI;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.worldGroup.add(mesh);
    });
  }

  buildStreetLights() {
    const lightPositions = [];

    for (let z = -320; z <= 320; z += 45) {
      lightPositions.push({ x: -14.5, z: z, rot: Math.PI / 2 });
      lightPositions.push({ x: 14.5, z: z, rot: -Math.PI / 2 });
    }

    for (let x = -230; x <= 230; x += 55) {
      if (Math.abs(x) > 25) {
        lightPositions.push({ x: x, z: -162, rot: 0 });
        lightPositions.push({ x: x, z: 162, rot: Math.PI });
      }
    }

    const poleGeo = new THREE.CylinderGeometry(0.18, 0.22, 7.5, 8);
    const armGeo = new THREE.BoxGeometry(2.2, 0.15, 0.2);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffea9f,
      emissiveIntensity: 0.8
    });

    lightPositions.forEach(lp => {
      const group = new THREE.Group();
      group.position.set(lp.x, 0, lp.z);
      group.rotation.y = lp.rot;

      const pole = new THREE.Mesh(poleGeo, this.concreteMat);
      pole.position.y = 3.75;
      group.add(pole);

      const arm = new THREE.Mesh(armGeo, this.concreteMat);
      arm.position.set(0.9, 7.3, 0);
      group.add(arm);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.4), headMat);
      head.position.set(1.8, 7.2, 0);
      group.add(head);

      const pointLight = new THREE.PointLight(0xfff1cf, 0, 24, 1.6);
      pointLight.position.set(1.8, 6.8, 0);
      group.add(pointLight);

      this.worldGroup.add(group);
      this.streetLights.push({
        light: pointLight,
        headMat: headMat
      });
    });
  }

  buildVegetationAndRocks() {
    for (let i = 0; i < 95; i++) {
      const x = (Math.random() - 0.5) * 520;
      const z = (Math.random() - 0.5) * 620;

      if (Math.abs(x) < 22 || (Math.abs(z - 150) < 20) || (Math.abs(z + 150) < 20)) {
        continue;
      }
      this.createTree(x, z, false);
    }

    for (let i = 0; i < 115; i++) {
      const x = 50 + Math.random() * 460;
      const z = -700 - Math.random() * 390;
      this.createTree(x, z, true);
    }

    for (let i = 0; i < 48; i++) {
      const x = 320 + Math.random() * 170;
      const z = -600 + (Math.random() - 0.5) * 820;
      this.createRock(x, z);
    }
  }

  createTree(x, z, isPine = false) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const trunkH = isPine ? 2.6 : 2.1;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.42, trunkH, 8), this.treeWoodMat);
    trunk.position.y = trunkH * 0.5;
    trunk.castShadow = true;
    group.add(trunk);

    if (isPine) {
      for (let t = 0; t < 3; t++) {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(2.5 - t * 0.6, 2.6, 8),
          this.pineLeavesMat
        );
        cone.position.y = trunkH + t * 1.5;
        cone.castShadow = true;
        group.add(cone);
      }
    } else {
      const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(2.3, 1), this.treeLeavesMat);
      foliage.position.y = trunkH + 1.8;
      foliage.castShadow = true;
      group.add(foliage);
    }

    this.worldGroup.add(group);
  }

  createRock(x, z) {
    const s = 1.3 + Math.random() * 2.6;
    const geo = new THREE.DodecahedronGeometry(s, 0);
    const rock = new THREE.Mesh(geo, this.rockMat);
    rock.position.set(x, s * 0.6, z);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    rock.castShadow = true;
    this.worldGroup.add(rock);

    const box = new THREE.Box3();
    box.setFromObject(rock);
    this.physics.registerCollider(box, 'rock');
  }

  buildIndustrialPark(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const rampMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.6, roughness: 0.3 });
    const rampGeo = new THREE.BoxGeometry(10, 0.4, 16);
    const ramp = new THREE.Mesh(rampGeo, rampMat);
    ramp.position.set(0, 2.5, 0);
    ramp.rotation.x = -0.32;
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    group.add(ramp);

    const colors = [0xd63031, 0x0984e3, 0x00b894, 0xfdcb6e];
    for (let i = 0; i < 12; i++) {
      const col = colors[i % colors.length];
      const cMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.6, metalness: 0.4 });
      const cMesh = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 12), cMat);
      const cx = (i % 3) * 7 - 7;
      const cz = Math.floor(i / 3) * 14 - 28;
      cMesh.position.set(cx, 2.5, cz);
      cMesh.castShadow = true;
      group.add(cMesh);

      const box = new THREE.Box3();
      box.setFromCenterAndSize(new THREE.Vector3(x + cx, 2.5, z + cz), new THREE.Vector3(5, 5, 12));
      this.physics.registerCollider(box, 'building');
    }

    this.worldGroup.add(group);
  }

  update(dt) {
    // Animate 3D GPS Waypoint Hologram
    if (this.gpsWaypoint.active && this.beaconGroup.visible) {
      this.beaconRing1.rotation.z += dt * 1.5;
      this.beaconRing2.rotation.z -= dt * 1.8;
      // Gentle pulsing scale
      const s = 1.0 + Math.sin(performance.now() * 0.004) * 0.12;
      this.beaconDisk.scale.set(s, s, s);
    }
  }

  setNightMode(isNight) {
    const lightIntensity = isNight ? 1.8 : 0;
    for (const sl of this.streetLights) {
      sl.light.intensity = lightIntensity;
    }
  }
}

window.World = World;
