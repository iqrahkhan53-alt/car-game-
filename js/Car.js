/**
 * Car.js
 * AAA Commercial-Quality 3D Sports Car with Realistic Arcade Physics,
 * Speed-Sensitive Progressive Steering, Suspension Dynamics,
 * High-Fidelity Sculpted Supercars, and Zero-GC Optimized Update Loop.
 */

// Static reusable scratch vectors to eliminate per-frame Garbage Collection stutter
const _vForward = new THREE.Vector3();
const _vRight = new THREE.Vector3();
const _vTemp = new THREE.Vector3();
const _vTemp2 = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

class Car {
  constructor(scene, physics, particleSystem, audioManager, config = {}) {
    this.scene = scene;
    this.physics = physics;
    this.particles = particleSystem;
    this.audio = audioManager;

    // Car identity & presets
    this.carType = config.type || 'apex';
    this.paintColor = config.color || 0x00e5ff;
    this.isAI = config.isAI || false;

    // Kinematics & Transform State
    this.position = new THREE.Vector3(config.x || 0, 0, config.z || 0);
    this.heading = config.heading || 0; // Yaw in radians
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.speedKmh = 0;
    this.radius = 1.45; // Collision boundary radius

    // Vehicle Configuration & Mechanical Specs
    this.specs = this.getCarSpecs(this.carType);

    // Advanced Steering & Stability Controls
    this.steeringAngle = 0; // Radians
    this.slipAngle = 0;
    this.driftFactor = 0;
    this.isDrifting = false;
    this.isOnGrass = false;

    // Transmission & Engine Physics
    this.gear = 1;
    this.maxGears = 6;
    this.rpm = 0.15; // 0.0 to 1.0 (idle ~0.15)
    this.gearRatios = [3.8, 2.7, 1.9, 1.4, 1.05, 0.8];
    this.gearTopSpeeds = [52, 98, 148, 205, 265, 325];

    // Nitro System
    this.nitroCapacity = 100;
    this.nitro = 100;
    this.isNitroActive = false;
    this.nitroRechargeRate = 12; // points per sec
    this.nitroDrainRate = 35;

    // Visual Sub-components
    this.group = new THREE.Group();
    this.bodyGroup = new THREE.Group(); // Handles suspension roll and pitch
    this.wheels = [];
    this.steerWheels = [];
    this.headlights = [];
    this.headlightSpotlights = [];
    this.brakeLights = [];
    this.reverseLights = [];
    this.exhaustPipes = [];
    this.headlightsOn = false;

    // Build 3D mesh hierarchy
    this.buildCarModel();
    this.scene.add(this.group);
  }

  getCarSpecs(type) {
    const database = {
      apex: {
        name: 'Apex GT',
        topSpeed: 290,
        accelForce: 25.5,
        brakeForce: 36.0,
        handling: 1.02,
        mass: 1420,
        downforce: 1.25
      },
      phantom: {
        name: 'Phantom Hypercar',
        topSpeed: 345,
        accelForce: 30.0,
        brakeForce: 39.0,
        handling: 0.96,
        mass: 1350,
        downforce: 1.55
      },
      monza: {
        name: 'Monza V12',
        topSpeed: 310,
        accelForce: 28.5,
        brakeForce: 35.0,
        handling: 1.06,
        mass: 1460,
        downforce: 1.15
      },
      cyber: {
        name: 'Cyber Roadster',
        topSpeed: 320,
        accelForce: 34.0,
        brakeForce: 42.0,
        handling: 1.18,
        mass: 1580,
        downforce: 1.35
      }
    };
    return database[type] || database.apex;
  }

  buildCarModel() {
    // Clear any previous meshes if rebuilding
    while (this.bodyGroup.children.length > 0) {
      this.bodyGroup.remove(this.bodyGroup.children[0]);
    }
    this.wheels = [];
    this.steerWheels = [];
    this.headlights = [];
    this.headlightSpotlights = [];
    this.brakeLights = [];
    this.reverseLights = [];
    this.exhaustPipes = [];

    this.group.add(this.bodyGroup);

    // 1. High-End PBR Automotive Materials
    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.paintColor,
      metalness: 0.9,
      roughness: 0.16,
      envMapIntensity: 1.5
    });

    const carbonMaterial = new THREE.MeshStandardMaterial({
      color: 0x141416,
      roughness: 0.38,
      metalness: 0.7
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0c1220,
      metalness: 0.15,
      roughness: 0.04,
      transmission: 0.82,
      transparent: true,
      opacity: 0.88,
      reflectivity: 0.9
    });

    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      metalness: 0.98,
      roughness: 0.08
    });

    const interiorMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181a,
      roughness: 0.85
    });

    // 2. Sculpted Aerodynamic Supercar Chassis
    // Lower Underbody Tray
    const underbodyGeo = new THREE.BoxGeometry(1.94, 0.22, 4.45);
    const underbody = new THREE.Mesh(underbodyGeo, carbonMaterial);
    underbody.position.set(0, 0.22, 0);
    underbody.castShadow = true;
    underbody.receiveShadow = true;
    this.bodyGroup.add(underbody);

    // Main Mid-Section Cockpit Sill & Doors
    const mainBodyGeo = new THREE.BoxGeometry(1.92, 0.44, 4.3);
    const mainBody = new THREE.Mesh(mainBodyGeo, this.bodyMaterial);
    mainBody.position.set(0, 0.46, 0);
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    this.bodyGroup.add(mainBody);

    // Sculpted Front Hood with Aerodynamic Slant
    const hoodGeo = new THREE.BoxGeometry(1.82, 0.22, 1.7);
    const hood = new THREE.Mesh(hoodGeo, this.bodyMaterial);
    hood.position.set(0, 0.48, -1.35);
    hood.rotation.x = 0.09;
    hood.castShadow = true;
    this.bodyGroup.add(hood);

    // Front Hood Aero Ducts (Dual Extractors)
    [-0.38, 0.38].forEach(hx => {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.65), carbonMaterial);
      vent.position.set(hx, 0.58, -1.25);
      vent.rotation.x = 0.09;
      this.bodyGroup.add(vent);
    });

    // Front Bumper Splitter with Aerodynamic Endplates
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.07, 0.58), carbonMaterial);
    splitter.position.set(0, 0.16, -2.22);
    splitter.castShadow = true;
    this.bodyGroup.add(splitter);

    // Side Endplates on Splitter
    [-0.99, 0.99].forEach(ex => {
      const endplate = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.45), carbonMaterial);
      endplate.position.set(ex, 0.24, -2.22);
      this.bodyGroup.add(endplate);
    });

    // Front Honeycomb Intake Grilles
    const grilleMesh = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.22, 0.12), carbonMaterial);
    grilleMesh.position.set(0, 0.32, -2.2);
    this.bodyGroup.add(grilleMesh);

    // Muscular Flared Front & Rear Wheel Fenders
    const fenderGeoF = new THREE.BoxGeometry(0.18, 0.38, 0.95);
    [-0.96, 0.96].forEach(fx => {
      const fFender = new THREE.Mesh(fenderGeoF, this.bodyMaterial);
      fFender.position.set(fx, 0.52, -1.3);
      fFender.castShadow = true;
      this.bodyGroup.add(fFender);

      const rFender = new THREE.Mesh(fenderGeoF, this.bodyMaterial);
      rFender.position.set(fx, 0.54, 1.35);
      rFender.castShadow = true;
      this.bodyGroup.add(rFender);
    });

    // Sculpted Side Radiator Intake Scoops (Coke-Bottle Waistline)
    [-0.94, 0.94].forEach(sx => {
      const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.8), carbonMaterial);
      scoop.position.set(sx, 0.44, 0.2);
      scoop.rotation.y = sx > 0 ? -0.1 : 0.1;
      this.bodyGroup.add(scoop);
    });

    // Aerodynamic Greenhouse (Cockpit Glass Canopy)
    const canopyGeo = new THREE.BoxGeometry(1.48, 0.56, 2.15);
    const canopy = new THREE.Mesh(canopyGeo, glassMaterial);
    canopy.position.set(0, 0.86, 0.05);
    canopy.castShadow = true;
    this.bodyGroup.add(canopy);

    // Roof Panel with Aerodynamic Double-Bubble Contour
    const roofGeo = new THREE.BoxGeometry(1.38, 0.05, 1.48);
    const roof = new THREE.Mesh(roofGeo, this.bodyMaterial);
    roof.position.set(0, 1.15, 0.08);
    roof.castShadow = true;
    this.bodyGroup.add(roof);

    // Cockpit Interior Dashboard & Steering Wheel silhouette
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.25, 0.6), interiorMaterial);
    dash.position.set(0, 0.72, -0.55);
    this.bodyGroup.add(dash);

    // Side Mirrors with Aerodynamic Stems
    const mirrorStemGeo = new THREE.BoxGeometry(0.16, 0.04, 0.05);
    const mirrorHeadGeo = new THREE.BoxGeometry(0.24, 0.12, 0.16);
    [-0.98, 0.98].forEach(mx => {
      const stem = new THREE.Mesh(mirrorStemGeo, carbonMaterial);
      stem.position.set(mx > 0 ? mx - 0.06 : mx + 0.06, 0.74, -0.58);
      const head = new THREE.Mesh(mirrorHeadGeo, this.bodyMaterial);
      head.position.set(mx, 0.75, -0.58);
      head.castShadow = true;
      this.bodyGroup.add(stem, head);
    });

    // Rear Carbon Fiber Diffuser with Vertical Aero Vanes
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.26, 0.65), carbonMaterial);
    diffuser.position.set(0, 0.24, 2.12);
    diffuser.rotation.x = -0.16;
    diffuser.castShadow = true;
    this.bodyGroup.add(diffuser);

    // 4 Diffuser Aero Vanes
    [-0.6, -0.2, 0.2, 0.6].forEach(vx => {
      const vane = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.65), carbonMaterial);
      vane.position.set(vx, 0.24, 2.12);
      vane.rotation.x = -0.16;
      this.bodyGroup.add(vane);
    });

    // GT Wing Spoiler Specific to Car Type
    if (this.carType === 'apex' || this.carType === 'phantom') {
      // Swan-neck GT Wing Stanchions
      [-0.65, 0.65].forEach(wx => {
        const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.44, 0.18), carbonMaterial);
        pylon.position.set(wx, 0.9, 2.0);
        pylon.castShadow = true;
        this.bodyGroup.add(pylon);
      });
      const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.05, 0.42), carbonMaterial);
      wingBlade.position.set(0, 1.14, 2.02);
      wingBlade.rotation.x = -0.06;
      wingBlade.castShadow = true;
      this.bodyGroup.add(wingBlade);

      // Wing Endplates
      [-0.94, 0.94].forEach(ex => {
        const ep = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.44), carbonMaterial);
        ep.position.set(ex, 1.14, 2.02);
        this.bodyGroup.add(ep);
      });
    } else {
      // Integrated Aerodynamic Ducktail Lip Spoiler
      const ducktail = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.12, 0.32), carbonMaterial);
      ducktail.position.set(0, 0.78, 2.14);
      ducktail.rotation.x = 0.25;
      ducktail.castShadow = true;
      this.bodyGroup.add(ducktail);
    }

    // 3. Modern Multi-LED Projector Headlights
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x99ddff,
      emissiveIntensity: 0.9,
      roughness: 0.1
    });

    [-0.68, 0.68].forEach(x => {
      // Dark Headlight Housing
      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.18), carbonMaterial);
      housing.position.set(x, 0.52, -2.12);
      this.bodyGroup.add(housing);

      // Dual Projector LED Lenses
      [-0.08, 0.08].forEach(lx => {
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 12), headlightMat);
        lens.rotateX(Math.PI / 2);
        lens.position.set(x + lx, 0.52, -2.18);
        this.bodyGroup.add(lens);
        this.headlights.push(lens);
      });

      // Realistic Forward Spotlight
      const spot = new THREE.SpotLight(0xf2f8ff, 0, 95, Math.PI / 4.8, 0.42, 1.8);
      spot.position.set(x, 0.55, -2.15);
      const target = new THREE.Object3D();
      target.position.set(x, 0, -30);
      this.bodyGroup.add(spot);
      this.bodyGroup.add(target);
      spot.target = target;
      this.headlightSpotlights.push(spot);
    });

    // 4. Full-Width OLED Taillight Lightbar
    this.brakeLightMat = new THREE.MeshStandardMaterial({
      color: 0x330000,
      emissive: 0xff0028,
      emissiveIntensity: 0.9,
      roughness: 0.2
    });

    const taillightBar = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.09, 0.08), this.brakeLightMat);
    taillightBar.position.set(0, 0.68, 2.18);
    this.bodyGroup.add(taillightBar);
    this.brakeLights.push(taillightBar);

    // Reverse light (central crisp white LED)
    this.reverseLightMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      emissive: 0x000000,
      emissiveIntensity: 0.0
    });
    const revMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.08), this.reverseLightMat);
    revMesh.position.set(0, 0.48, 2.18);
    this.bodyGroup.add(revMesh);
    this.reverseLights.push(revMesh);

    // 5. Quad Titanium/Chrome Exhaust Outlets
    const exhaustGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.22, 16);
    exhaustGeo.rotateX(Math.PI / 2);
    [-0.52, -0.34, 0.34, 0.52].forEach(x => {
      const pipe = new THREE.Mesh(exhaustGeo, chromeMaterial);
      pipe.position.set(x, 0.32, 2.2);
      this.bodyGroup.add(pipe);
      this.exhaustPipes.push(pipe);
    });

    // 6. High-Fidelity Wheels with Multi-Spoke Rims & Painted Calipers
    const wheelConfigs = [
      { x: -0.96, y: 0.35, z: -1.35, isFront: true, isLeft: true },
      { x: 0.96, y: 0.35, z: -1.35, isFront: true, isLeft: false },
      { x: -0.96, y: 0.37, z: 1.35, isFront: false, isLeft: true },
      { x: 0.96, y: 0.37, z: 1.35, isFront: false, isLeft: false }
    ];

    wheelConfigs.forEach(cfg => {
      const wheelAssembly = this.createWheelAssembly(cfg.isLeft);
      wheelAssembly.position.set(cfg.x, cfg.y, cfg.z);

      if (cfg.isFront) {
        // Front steering pivot knuckle
        const steerPivot = new THREE.Group();
        steerPivot.position.set(cfg.x, cfg.y, cfg.z);
        wheelAssembly.position.set(0, 0, 0);
        steerPivot.add(wheelAssembly);
        this.group.add(steerPivot);
        this.steerWheels.push(steerPivot);
      } else {
        this.group.add(wheelAssembly);
      }

      this.wheels.push(wheelAssembly);
    });
  }

  createWheelAssembly(isLeft) {
    const group = new THREE.Group();

    // 1. Low-Profile High-Performance Rubber Tire
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x121315,
      roughness: 0.9,
      metalness: 0.1
    });
    const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.34, 28);
    tireGeo.rotateZ(Math.PI / 2);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = true;
    group.add(tire);

    // 2. Forged Alloy Wheel Rim Outer Barrel
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xd8d8d8,
      metalness: 0.94,
      roughness: 0.18
    });
    const rimGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.35, 20);
    rimGeo.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    group.add(rim);

    // 3. 5-Double-Spoke Wheel Face
    const spokeMat = new THREE.MeshStandardMaterial({
      color: 0x2b2d32,
      metalness: 0.9,
      roughness: 0.22
    });
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.42, 0.05), spokeMat);
      spoke.position.x = isLeft ? -0.15 : 0.15;
      spoke.rotation.x = angle;
      group.add(spoke);

      // Secondary twin spoke
      const spoke2 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.42, 0.04), spokeMat);
      spoke2.position.x = isLeft ? -0.15 : 0.15;
      spoke2.rotation.x = angle + 0.18;
      group.add(spoke2);
    }

    // 4. Center Lug Cap
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12), spokeMat);
    cap.rotateZ(Math.PI / 2);
    cap.position.x = isLeft ? -0.17 : 0.17;
    group.add(cap);

    // 5. Perforated Carbon-Ceramic Brake Rotor
    const rotorMat = new THREE.MeshStandardMaterial({
      color: 0x8e9297,
      metalness: 0.92,
      roughness: 0.28
    });
    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.05, 20), rotorMat);
    rotor.rotateZ(Math.PI / 2);
    rotor.position.x = isLeft ? 0.08 : -0.08;
    group.add(rotor);

    // 6. Brembo-Style Painted Caliper (Crimson Red / Acid Gold)
    const caliperMat = new THREE.MeshStandardMaterial({
      color: 0xdd1122,
      metalness: 0.6,
      roughness: 0.25
    });
    const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.15, 0.12), caliperMat);
    caliper.position.set(isLeft ? 0.08 : -0.08, 0.16, 0);
    group.add(caliper);

    return group;
  }

  setColor(hexColor) {
    this.paintColor = hexColor;
    if (this.bodyMaterial) {
      this.bodyMaterial.color.setHex(hexColor);
    }
  }

  setCarType(type) {
    this.carType = type;
    this.specs = this.getCarSpecs(type);
    this.buildCarModel();
  }

  setHeadlights(on) {
    this.headlightsOn = on;
    const intensity = on ? 2.8 : 0;
    const emissive = on ? 3.2 : 0.8;
    for (const spot of this.headlightSpotlights) {
      spot.intensity = intensity;
    }
    for (const hl of this.headlights) {
      hl.material.emissiveIntensity = emissive;
    }
  }

  toggleHeadlights() {
    this.setHeadlights(!this.headlightsOn);
  }

  /**
   * Main Physics & Driving Simulation Update (Optimized Zero-GC Loop)
   * @param {number} dt - delta time in seconds
   * @param {object} input - { throttle, brake, steering, handbrake, nitro }
   * @param {Road} roadSystem - for on-road vs off-road terrain testing
   */
  update(dt, input, roadSystem) {
    // 1. Terrain Check (Road vs Grass)
    if (roadSystem) {
      this.isOnGrass = !roadSystem.isPointOnRoad(this.position.x, this.position.z);
    } else {
      this.isOnGrass = false;
    }

    // 2. Nitro Boost Handling
    if (input.nitro && this.nitro > 0 && input.throttle > 0) {
      this.isNitroActive = true;
      this.nitro = Math.max(0, this.nitro - this.nitroDrainRate * dt);
    } else {
      this.isNitroActive = false;
      this.nitro = Math.min(this.nitroCapacity, this.nitro + this.nitroRechargeRate * dt);
    }

    // 3. Compute Orientation Vectors (Reusing static vectors)
    _vForward.set(
      -Math.sin(this.heading),
      0,
      -Math.cos(this.heading)
    );
    _vRight.set(
      Math.cos(this.heading),
      0,
      -Math.sin(this.heading)
    );

    // Compute forward & lateral velocity components
    const forwardVel = this.velocity.dot(_vForward);
    const lateralVel = this.velocity.dot(_vRight);
    const absSpeed = Math.abs(forwardVel);
    const absSpeedKmh = absSpeed * 3.6;
    this.speedKmh = forwardVel * 3.6;

    // 4. FIX 1 & 2: Speed-Sensitive Steering with Smooth Interpolation and Return-to-Center
    // Low speed (0-30 km/h): up to 0.32 rad (~18 deg) for responsive city driving
    // High speed (250+ km/h): tapers to 0.045 rad (~2.6 deg) for stable highway control
    // FIX 1: Steering direction corrected — positive steeringAngle now correctly turns car RIGHT
    const speedDamping = 1.0 + (absSpeedKmh / 45.0) * 2.2;
    const dynamicMaxSteer = 0.32 / speedDamping;

    // FIX 2: Reduced steer response speed for smoother, less twitchy feel
    const targetSteerAngle = input.steering * dynamicMaxSteer;
    const isReturning = Math.abs(input.steering) < 0.02;
    // Gentler attack (3.2/s) for smooth progressive input, snappy return-to-center (11.0/s)
    const steerResponseSpeed = isReturning ? 11.0 : (3.2 * this.specs.handling);
    this.steeringAngle += (targetSteerAngle - this.steeringAngle) * Math.min(1.0, steerResponseSpeed * dt);
    // Hard snap to zero when near center
    if (isReturning && Math.abs(this.steeringAngle) < 0.001) this.steeringAngle = 0;

    // Apply visual front wheel steer angle (positive steeringAngle = wheels point right)
    for (const steerGroup of this.steerWheels) {
      steerGroup.rotation.y = this.steeringAngle;
    }

    // 5. Gear Selection & Transmission
    let targetGear = 1;
    for (let g = 0; g < this.gearTopSpeeds.length; g++) {
      if (absSpeedKmh > this.gearTopSpeeds[g] * 0.74) {
        targetGear = Math.min(this.maxGears, g + 2);
      }
    }
    if (forwardVel < -1.0) {
      this.gear = -1; // Reverse
    } else {
      if (targetGear !== this.gear && this.gear > 0) {
        this.gear = targetGear;
        if (!this.isAI && this.audio) {
          this.audio.playGearShift();
        }
      }
    }

    // Engine RPM calculation
    const gearMax = this.gear > 0 ? this.gearTopSpeeds[this.gear - 1] : 45;
    const gearMin = this.gear > 1 ? this.gearTopSpeeds[this.gear - 2] * 0.72 : 0;
    const currentRpmTarget = Math.max(0.15, Math.min(0.98, (absSpeedKmh - gearMin) / (gearMax - gearMin + 14)));
    this.rpm += (currentRpmTarget - this.rpm) * Math.min(1.0, 6.0 * dt);

    // 6. Longitudinal Forces (Throttle, Braking, Drag, Rolling Friction)
    let engineAccel = 0;
    const nitroMultiplier = this.isNitroActive ? 1.65 : 1.0;
    const topSpeedCap = (this.isOnGrass ? 68 : this.specs.topSpeed) * (this.isNitroActive ? 1.2 : 1.0);

    if (input.throttle > 0) {
      if (this.speedKmh < topSpeedCap) {
        const powerCurve = Math.max(0.22, 1.0 - (absSpeedKmh / (topSpeedCap + 12)));
        engineAccel = this.specs.accelForce * input.throttle * powerCurve * nitroMultiplier;
      }
    }

    // Progressive Braking & Reverse
    let brakeDecel = 0;
    if (input.brake > 0) {
      if (forwardVel > 0.8) {
        brakeDecel = this.specs.brakeForce * input.brake;
      } else {
        // Reverse
        if (forwardVel > -18.0) {
          engineAccel = -this.specs.accelForce * 0.52 * input.brake;
        }
      }
    }

    // Handbrake Drifting
    this.isDrifting = input.handbrake && absSpeedKmh > 22;
    if (this.isDrifting) {
      this.driftFactor = Math.min(1.0, this.driftFactor + 3.2 * dt);
    } else {
      this.driftFactor = Math.max(0, this.driftFactor - 2.8 * dt);
    }

    // Aerodynamic Drag ($F = 0.5 * Cd * v^2$)
    const dragCoeff = 0.0016;
    const dragForce = dragCoeff * forwardVel * Math.abs(forwardVel);

    // Rolling Friction (higher on grass)
    const rollingFriction = this.isOnGrass ? 3.4 : 0.42;

    // Net Forward Acceleration
    const netForwardAccel = engineAccel - (brakeDecel * Math.sign(forwardVel)) - dragForce - (rollingFriction * Math.sign(forwardVel));
    let newForwardVel = forwardVel + netForwardAccel * dt;

    if (Math.abs(forwardVel) < 0.15 && input.throttle === 0 && input.brake === 0) {
      newForwardVel = 0;
    }

    // 7. Lateral Grip & Drifting Dynamics (Pacejka Curve)
    const baseGrip = this.isOnGrass ? 2.6 : (9.2 * this.specs.handling);
    const driftGrip = this.isOnGrass ? 1.2 : 3.4;
    const effectiveGrip = THREE.MathUtils.lerp(baseGrip, driftGrip, this.driftFactor);

    // Lateral velocity dampened by tire grip
    const newLateralVel = lateralVel * Math.max(0, 1.0 - effectiveGrip * dt);

    // Reconstruct velocity in world coords
    this.velocity.copy(_vForward).multiplyScalar(newForwardVel)
      .add(_vTemp.copy(_vRight).multiplyScalar(newLateralVel));

    // 8. FIX 1 (CORRECTED): Heading Yaw Rate — positive steeringAngle correctly turns car RIGHT
    // Formula: heading += turnRate means car turns RIGHT when going forward with positive steeringAngle
    if (Math.abs(newForwardVel) > 0.25) {
      // Physical lateral acceleration ceiling (a_lat <= mu * g): eliminates instant spin-outs
      let maxTurnRate = (this.specs.handling * 9.81 * 1.2) / Math.max(8.0, absSpeed);
      if (this.isDrifting) maxTurnRate *= 1.3;

      const turnMultiplier = this.isDrifting ? 1.3 : 1.0;
      // Divide by slightly larger wheelbase (3.0) for more realistic turn radius
      const rawTurnRate = (newForwardVel / 3.0) * Math.tan(this.steeringAngle) * turnMultiplier;
      const clampedTurnRate = THREE.MathUtils.clamp(rawTurnRate, -maxTurnRate, maxTurnRate);

      // FIX 1: + sign = D (right) correctly turns car right, A (left) turns left
      this.heading += clampedTurnRate * dt;
    }

    // 9. Update Position & Collisions
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    if (this.physics) {
      this.physics.checkObstacleCollisions(this.position, this.radius, this.velocity);
    }

    // 10. Smooth Visual Suspension Dynamics (Roll & Pitch) — FIX 9: Better weight transfer feel
    // Pitch: nose dives on braking, squats on acceleration
    const pitchTarget = THREE.MathUtils.clamp(-netForwardAccel * 0.0055, -0.07, 0.07);
    this.bodyGroup.rotation.x += (pitchTarget - this.bodyGroup.rotation.x) * Math.min(1.0, 7.5 * dt);

    // Roll: body rolls into corners based on lateral velocity (corrected sign for FIX 1)
    // With heading += clampedTurnRate, lateral velocity sign is now consistent
    const rollTarget = THREE.MathUtils.clamp(-lateralVel * 0.014, -0.08, 0.08);
    this.bodyGroup.rotation.z += (rollTarget - this.bodyGroup.rotation.z) * Math.min(1.0, 7.5 * dt);

    // 11. Wheel Spin Rotation
    const wheelRollAngle = (newForwardVel * dt) / 0.36;
    for (const w of this.wheels) {
      w.rotation.x += wheelRollAngle;
    }

    // 12. Update 3D Transform
    this.group.position.copy(this.position);
    this.group.rotation.y = this.heading;

    // 13. Taillights & Reverse Lights Emissive Feedback
    const isBraking = input.brake > 0 && forwardVel > 0.8;
    this.brakeLightMat.emissiveIntensity = isBraking ? 3.0 : 0.8;

    const isReversing = input.brake > 0 && forwardVel <= 0;
    this.reverseLightMat.emissiveIntensity = isReversing ? 2.6 : 0.0;

    // 14. Particle FX (Tire Smoke, Nitro Flames, Dirt)
    const slipMagnitude = Math.abs(lateralVel) + (this.isDrifting ? 4.5 : 0);
    this.slipAngle = slipMagnitude;

    if (slipMagnitude > 2.0 || this.isDrifting) {
      _vTemp.set(-0.88, 0.05, 1.35).applyAxisAngle(_upAxis, this.heading).add(this.position);
      _vTemp2.set(0.88, 0.05, 1.35).applyAxisAngle(_upAxis, this.heading).add(this.position);

      if (this.particles) {
        this.particles.emitTireSmoke(_vTemp, this.velocity, this.isOnGrass);
        this.particles.emitTireSmoke(_vTemp2, this.velocity, this.isOnGrass);
      }
    }

    if (this.isNitroActive && this.particles) {
      for (const pipe of this.exhaustPipes) {
        pipe.getWorldPosition(_vTemp);
        this.particles.emitNitroFlame(_vTemp, _vForward);
      }
    }

    if (this.isOnGrass && absSpeed > 10 && this.particles) {
      this.particles.emitTireSmoke(this.position, this.velocity, true);
    }

    // 15. Dynamic Engine Audio (Player car only)
    if (!this.isAI && this.audio) {
      const normalizedSlip = Math.min(1.0, slipMagnitude / 7.5);
      this.audio.updateEngine(this.rpm, input.throttle, absSpeedKmh, normalizedSlip, this.isNitroActive);
    }
  }

  reset(x = 0, z = 0, heading = 0) {
    this.position.set(x, 0, z);
    this.heading = heading;
    this.velocity.set(0, 0, 0);
    this.speedKmh = 0;
    this.steeringAngle = 0;
    this.driftFactor = 0;
    this.gear = 1;
    this.rpm = 0.15;
    this.nitro = this.nitroCapacity;
    this.group.position.copy(this.position);
    this.group.rotation.y = this.heading;
  }
}

window.Car = Car;
