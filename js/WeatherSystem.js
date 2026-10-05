/**
 * WeatherSystem.js
 * Dynamic weather and day/night cycle controller.
 * Controls sky colors, ambient lighting, directional sun angle and color,
 * fog density and color, night illumination, and rain particle integration.
 */

class WeatherSystem {
  constructor(scene, renderer, particleSystem, world, playerCar) {
    this.scene = scene;
    this.renderer = renderer;
    this.particles = particleSystem;
    this.world = world;
    this.playerCar = playerCar;

    this.currentMode = 'day';

    // Sky Dome mesh
    this.createSkyDome();

    // Directional Sun Light
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.sunLight.position.set(120, 220, 150);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 450;
    this.sunLight.shadow.camera.left = -160;
    this.sunLight.shadow.camera.right = 160;
    this.sunLight.shadow.camera.top = 160;
    this.sunLight.shadow.camera.bottom = -160;
    this.sunLight.shadow.bias = -0.0006;
    this.scene.add(this.sunLight);

    // Sun target follows player
    this.sunTarget = new THREE.Object3D();
    this.scene.add(this.sunTarget);
    this.sunLight.target = this.sunTarget;

    // Ambient / Hemisphere Light
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.65);
    this.hemiLight.position.set(0, 200, 0);
    this.scene.add(this.hemiLight);

    // Scene Fog
    this.scene.fog = new THREE.FogExp2(0x9bd0f5, 0.0012);

    // Weather Presets Configuration
    this.presets = {
      day: {
        skyTop: '#1e90ff',
        skyBottom: '#dff9fb',
        sunColor: 0xfffcf0,
        sunIntensity: 1.3,
        hemiSky: 0xffffff,
        hemiGround: 0x555555,
        hemiIntensity: 0.65,
        fogColor: 0x9bd0f5,
        fogDensity: 0.0012,
        sunPos: [150, 220, 120],
        isNight: false,
        isRain: false
      },
      sunset: {
        skyTop: '#4a154b',
        skyBottom: '#ff7675',
        sunColor: 0xffaa55,
        sunIntensity: 1.5,
        hemiSky: 0xff7675,
        hemiGround: 0x2d3436,
        hemiIntensity: 0.5,
        fogColor: 0xdf8370,
        fogDensity: 0.0018,
        sunPos: [250, 45, 180],
        isNight: false,
        isRain: false
      },
      night: {
        skyTop: '#05070f',
        skyBottom: '#0c1222',
        sunColor: 0x486581,
        sunIntensity: 0.25,
        hemiSky: 0x203050,
        hemiGround: 0x050810,
        hemiIntensity: 0.22,
        fogColor: 0x070b14,
        fogDensity: 0.0025,
        sunPos: [80, 160, -100],
        isNight: true,
        isRain: false
      },
      rain: {
        skyTop: '#1e272e',
        skyBottom: '#485460',
        sunColor: 0x808e9b,
        sunIntensity: 0.45,
        hemiSky: 0x4b6584,
        hemiGround: 0x1e272e,
        hemiIntensity: 0.4,
        fogColor: 0x3d4852,
        fogDensity: 0.004,
        sunPos: [60, 120, 60],
        isNight: false,
        isRain: true
      },
      fog: {
        skyTop: '#7f8c8d',
        skyBottom: '#bdc3c7',
        sunColor: 0xdfe6e9,
        sunIntensity: 0.6,
        hemiSky: 0xb2bec3,
        hemiGround: 0x636e72,
        hemiIntensity: 0.5,
        fogColor: 0x95a5a6,
        fogDensity: 0.008,
        sunPos: [50, 100, 50],
        isNight: false,
        isRain: false
      }
    };

    this.applyPreset('day');
  }

  createSkyDome() {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 256;
    this.skyCanvas = canvas;
    this.skyCtx = canvas.getContext('2d');
    this.skyTexture = new THREE.CanvasTexture(canvas);

    const skyGeo = new THREE.SphereGeometry(1400, 24, 16);
    this.skyMat = new THREE.MeshBasicMaterial({
      map: this.skyTexture,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.skyMesh = new THREE.Mesh(skyGeo, this.skyMat);
    this.scene.add(this.skyMesh);
  }

  updateSkyGradient(topColor, bottomColor) {
    const grad = this.skyCtx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, topColor);
    grad.addColorStop(0.7, bottomColor);
    grad.addColorStop(1, '#ffffff');
    this.skyCtx.fillStyle = grad;
    this.skyCtx.fillRect(0, 0, 16, 256);
    this.skyTexture.needsUpdate = true;
  }

  applyPreset(presetName) {
    const p = this.presets[presetName] || this.presets.day;
    this.currentMode = presetName;

    // Update Sky
    this.updateSkyGradient(p.skyTop, p.skyBottom);

    // Update Sun
    this.sunLight.color.setHex(p.sunColor);
    this.sunLight.intensity = p.sunIntensity;
    this.sunLight.position.set(p.sunPos[0], p.sunPos[1], p.sunPos[2]);

    // Update Ambient
    this.hemiLight.color.setHex(p.hemiSky);
    this.hemiLight.groundColor.setHex(p.hemiGround);
    this.hemiLight.intensity = p.hemiIntensity;

    // Update Fog
    this.scene.fog.color.setHex(p.fogColor);
    this.scene.fog.density = p.fogDensity;
    if (this.renderer) {
      this.renderer.setClearColor(p.fogColor);
    }

    // Toggle Rain Particles
    if (this.particles) {
      this.particles.setRainActive(p.isRain);
    }

    // Toggle Night Streetlights & Building Illumination
    if (this.world) {
      this.world.setNightMode(p.isNight);
    }

    // Auto headlights at night or in rain
    if (this.playerCar) {
      this.playerCar.setHeadlights(p.isNight || p.isRain);
    }
  }

  update(playerPosition) {
    // Keep sky dome centered on player
    if (playerPosition) {
      this.skyMesh.position.copy(playerPosition);

      // Follow player with directional sun shadow frustum
      this.sunLight.position.set(
        playerPosition.x + 120,
        playerPosition.y + 220,
        playerPosition.z + 120
      );
      this.sunTarget.position.copy(playerPosition);
    }
  }
}

window.WeatherSystem = WeatherSystem;
