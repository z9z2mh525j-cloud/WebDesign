import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import gsap from 'gsap';

class MiniApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    this.carModel = null;
    this.bodyParts = [];
    this.doors = [];
    this.roof = null;
    this.isDoorOpen = false;
    this.cart = [];

    // Drive Mode Variables
    this.isDriveMode = false;
    this.speed = 0;
    this.rotation = 0;
    this.keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
    this.velocity = new THREE.Vector3();
    this.acceleration = 0.005;
    this.friction = 0.98;
    this.maxSpeed = 0.15;
    this.turnSpeed = 0.03;

    this.init();
  }

  init() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.camera.position.set(5, 3, 7);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI / 2.05;

    this.scene.background = new THREE.Color(0x111111);
    this.scene.fog = new THREE.Fog(0x111111, 10, 50);

    this.createGarage();
    this.loadCar();
    this.setupLights();
    this.setupEventListeners();
    this.animate();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  createGarage() {
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.15, metalness: 0.6 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.8 });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const wall = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), woodMat);
    wall.position.set(0, 5, -15);
    this.scene.add(wall);
  }

  setupLights() {
    this.scene.add(new THREE.AmbientLight(0xffe0b2, 0.8));
    
    const keyLight = new THREE.DirectionalLight(0xffffff, 3);
    keyLight.position.set(5, 10, 5);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xffffff, 4, 30);
    rimLight.position.set(0, 5, -10);
    this.scene.add(rimLight);
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
      
      this.carModel.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          const name = node.name.toLowerCase();
          if (name.includes('body') || name.includes('carrozzeria')) this.bodyParts.push(node);
          if (name.includes('door') || name.includes('porta')) this.doors.push(node);
          if (name.includes('roof') || name.includes('tetto')) this.roof = node;
        }
      });

      if (this.bodyParts.length === 0) {
        this.carModel.traverse(node => {
          if (node.isMesh && !node.name.toLowerCase().includes('wheel')) this.bodyParts.push(node);
        });
      }
      this.bodyParts.forEach(p => p.material.color.set(0x004225));
      this.scene.add(this.carModel);
    });
  }

  setupEventListeners() {
    // Keyboard inputs
    window.addEventListener('keydown', (e) => { if(this.keys.hasOwnProperty(e.key)) this.keys[e.key] = true; });
    window.addEventListener('keyup', (e) => { if(this.keys.hasOwnProperty(e.key)) this.keys[e.key] = false; });

    // UI Buttons
    document.getElementById('btn-drive').addEventListener('click', () => this.toggleDriveMode(true));
    document.getElementById('btn-exit-drive').addEventListener('click', () => this.toggleDriveMode(false));
    
    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        const color = new THREE.Color(e.target.dataset.color);
        this.bodyParts.forEach(p => gsap.to(p.material.color, { r: color.r, g: color.g, b: color.b, duration: 0.5 }));
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        e.target.classList.add('active');
      });
    });

    document.getElementById('btn-door').addEventListener('click', () => this.toggleDoor());
    document.getElementById('btn-add-cart').addEventListener('click', () => this.addToCart());
    document.getElementById('cart-trigger').addEventListener('click', () => this.toggleCart(true));
    document.getElementById('cart-close').addEventListener('click', () => this.toggleCart(false));
  }

  toggleDriveMode(active) {
    this.isDriveMode = active;
    this.controls.enabled = !active;
    document.getElementById('ui-controls').style.display = active ? 'none' : 'flex';
    document.getElementById('drive-ui').style.display = active ? 'block' : 'none';
    
    if(!active && this.carModel) {
        // Reset car position
        gsap.to(this.carModel.position, { x: 0, z: 0, duration: 1 });
        gsap.to(this.carModel.rotation, { y: 0, duration: 1 });
        gsap.to(this.camera.position, { x: 5, y: 3, z: 7, duration: 1 });
    }
  }

  toggleDoor() {
    if (this.doors.length === 0) return;
    this.isDoorOpen = !this.isDoorOpen;
    const target = this.isDoorOpen ? -Math.PI / 3 : 0;
    this.doors.forEach(door => gsap.to(door.rotation, { y: target, duration: 1 }));
    document.getElementById('btn-door').textContent = this.isDoorOpen ? 'Chiudi Portiera' : 'Apri Portiera';
  }

  updatePhysics() {
    if (!this.carModel || !this.isDriveMode) return;

    // Acceleration
    if (this.keys.w || this.keys.ArrowUp) this.speed += this.acceleration;
    if (this.keys.s || this.keys.ArrowDown) this.speed -= this.acceleration;

    // Rotation (only when moving)
    if (Math.abs(this.speed) > 0.01) {
        const dir = this.speed > 0 ? 1 : -1;
        if (this.keys.a || this.keys.ArrowLeft) this.carModel.rotation.y += this.turnSpeed * dir;
        if (this.keys.d || this.keys.ArrowRight) this.carModel.rotation.y -= this.turnSpeed * dir;
    }

    // Apply friction and limits
    this.speed *= this.friction;
    this.speed = Math.max(Math.min(this.speed, this.maxSpeed), -this.maxSpeed / 2);

    // Update Position
    this.carModel.translateZ(this.speed);

    // Camera Follow
    const relativeCameraOffset = new THREE.Vector3(0, 2, -6);
    const cameraOffset = relativeCameraOffset.applyMatrix4(this.carModel.matrixWorld);
    
    this.camera.position.lerp(cameraOffset, 0.1);
    this.camera.lookAt(this.carModel.position);
  }

  addToCart() {
    const item = { name: "Mini Custom", color: this.bodyParts[0]?.material.color.getHexString() || "Default", price: 24500 };
    this.cart.push(item);
    this.updateCartUI();
    this.toggleCart(true);
  }

  updateCartUI() {
    document.getElementById('cart-count').textContent = this.cart.length;
    document.getElementById('cart-content').innerHTML = this.cart.map(item => `<div class="cart-item"><div><h4>${item.name}</h4><small>#${item.color}</small></div><strong>€${item.price.toLocaleString()}</strong></div>`).join('');
    document.getElementById('cart-total').textContent = `€${this.cart.reduce((s, i) => s + i.price, 0).toLocaleString()}.00`;
  }

  toggleCart(open) { document.getElementById('cart-panel').classList.toggle('open', open); }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.isDriveMode) {
        this.updatePhysics();
    } else {
        this.controls.update();
    }
    this.renderer.render(this.scene, this.camera);
  }
}

new MiniApp();
