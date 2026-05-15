import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

class TrackApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    
    this.carModel = null;
    
    // Physics / Driving variables
    this.keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
    this.speed = 0;
    this.acceleration = 0.008;
    this.friction = 0.98;
    this.maxSpeed = 0.4;
    this.turnSpeed = 0.04;
    
    this.init();
  }

  init() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.container.appendChild(this.renderer.domElement);

    // Track Environment
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    this.scene.fog = new THREE.Fog(0x87ceeb, 20, 200);

    this.createTrack();
    this.setupLights();
    this.loadCar();
    this.setupEventListeners();
    this.animate();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  createTrack() {
    // Grass Ground
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x3b7a3b, roughness: 1.0 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), grassMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Main Asphalt Track (Simple loop for testing)
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
    
    // Straight line
    const straight = new THREE.Mesh(new THREE.PlaneGeometry(20, 200), trackMat);
    straight.rotation.x = -Math.PI / 2;
    straight.position.set(0, 0.01, -50);
    straight.receiveShadow = true;
    this.scene.add(straight);

    // Track Borders
    const borderMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });
    const borderL = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 200), borderMat);
    borderL.position.set(-10.5, 0.25, -50);
    borderL.castShadow = true;
    this.scene.add(borderL);

    const borderR = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 200), borderMat);
    borderR.position.set(10.5, 0.25, -50);
    borderR.castShadow = true;
    this.scene.add(borderR);
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(0xffffee, 3);
    sun.position.set(50, 100, 20);
    sun.castShadow = true;
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    sun.shadow.bias = -0.001;
    this.scene.add(sun);
  }

  loadCar() {
    const loader = new GLTFLoader();
    loader.load('/car.glb', (gltf) => {
      this.carModel = gltf.scene;
      
      const box = new THREE.Box3().setFromObject(this.carModel);
      const size = box.getSize(new THREE.Vector3());
      const scale = 3.5 / size.x; 
      this.carModel.scale.set(scale, scale, scale);
      this.carModel.position.y = -box.min.y * scale;
      
      // Load colors from localStorage
      const savedCarColor = localStorage.getItem('mini_car_color') || '#004225';
      const savedRoofColor = localStorage.getItem('mini_roof_color') || '#ffffff';

      this.carModel.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          
          const name = node.name.toLowerCase();
          if (name.includes('body') || name.includes('carrozzeria') || name.includes('shell')) {
            node.material.color.set(savedCarColor);
          }
          if (name.includes('roof') || name.includes('tetto')) {
            node.material.color.set(savedRoofColor);
          }
          // Fallback if no specific body part is found
          if (!name.includes('door') && !name.includes('roof') && !name.includes('wheel') && !name.includes('tire')) {
              node.material.color.set(savedCarColor);
          }
        }
      });

      this.scene.add(this.carModel);
    });
  }

  setupEventListeners() {
    window.addEventListener('keydown', (e) => { if(this.keys.hasOwnProperty(e.key)) this.keys[e.key] = true; });
    window.addEventListener('keyup', (e) => { if(this.keys.hasOwnProperty(e.key)) this.keys[e.key] = false; });
  }

  updatePhysics() {
    if (!this.carModel) return;

    // Acceleration
    if (this.keys.w || this.keys.ArrowUp) this.speed += this.acceleration;
    if (this.keys.s || this.keys.ArrowDown) this.speed -= this.acceleration;

    // Rotation (sterzo funziona solo se in movimento)
    if (Math.abs(this.speed) > 0.01) {
        // Direzione inversa se in retromarcia
        const dir = this.speed > 0 ? 1 : -1;
        if (this.keys.a || this.keys.ArrowLeft) this.carModel.rotation.y += this.turnSpeed * dir;
        if (this.keys.d || this.keys.ArrowRight) this.carModel.rotation.y -= this.turnSpeed * dir;
    }

    // Attrito e limiti
    this.speed *= this.friction;
    this.speed = Math.max(Math.min(this.speed, this.maxSpeed), -this.maxSpeed / 2);

    // Movimento in base alla rotazione dell'auto
    this.carModel.translateZ(this.speed);

    // --- Camera Chase Logic ---
    // Posizioniamo la camera dietro (e un po' sopra) l'auto
    const relativeCameraOffset = new THREE.Vector3(0, 3, -8);
    const cameraOffset = relativeCameraOffset.applyMatrix4(this.carModel.matrixWorld);
    
    // Lerp per movimento fluido
    this.camera.position.lerp(cameraOffset, 0.1);
    
    // La telecamera guarda sempre la macchina
    const lookAtPos = this.carModel.position.clone().add(new THREE.Vector3(0, 1, 0));
    this.camera.lookAt(lookAtPos);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.updatePhysics();
    this.renderer.render(this.scene, this.camera);
  }
}

new TrackApp();
