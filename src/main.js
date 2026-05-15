import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import gsap from 'gsap';

class CarApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    this.car = new THREE.Group();
    this.body = null;
    this.door = null;
    this.wheels = [];
    this.isDoorOpen = false;

    this.init();
  }

  init() {
    // Renderer setup
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // Camera & Controls
    this.camera.position.set(4, 2, 4);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI / 2;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(5, 5, 5);
    mainLight.castShadow = true;
    this.scene.add(mainLight);

    const rimLight = new THREE.PointLight(0x3a86ff, 1);
    rimLight.position.set(-5, 2, -5);
    this.scene.add(rimLight);

    // Grid / Floor
    const grid = new THREE.GridHelper(20, 20, 0x333333, 0x111111);
    grid.position.y = -0.5;
    this.scene.add(grid);

    this.createCar();
    this.setupEventListeners();
    this.animate();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  createCar() {
    // Materials
    const bodyMat = new THREE.MeshStandardMaterial({ 
      color: 0xff0000, 
      metalness: 0.8, 
      roughness: 0.2 
    });
    const glassMat = new THREE.MeshStandardMaterial({ 
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.3,
      metalness: 1,
      roughness: 0
    });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });

    // Body (Main block)
    const bodyGeo = new THREE.BoxGeometry(3, 0.6, 1.5);
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = 0.3;
    this.body.castShadow = true;
    this.car.add(this.body);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(1.5, 0.5, 1.2);
    const cabin = new THREE.Mesh(cabinGeo, bodyMat);
    cabin.position.set(-0.2, 0.8, 0);
    this.car.add(cabin);

    // Windows
    const windowGeo = new THREE.BoxGeometry(1.4, 0.4, 1.3);
    const windows = new THREE.Mesh(windowGeo, glassMat);
    windows.position.set(-0.2, 0.8, 0);
    this.car.add(windows);

    // Door (Interactive part)
    const doorGeo = new THREE.BoxGeometry(0.8, 0.5, 0.1);
    this.door = new THREE.Mesh(doorGeo, bodyMat);
    this.door.position.set(-0.2, 0.3, 0.75);
    // Pivot for door
    this.doorPivot = new THREE.Group();
    this.doorPivot.position.set(0.2, 0, 0.75); // Hinges at the front
    this.door.position.set(-0.4, 0.3, 0); // Offset from pivot
    this.doorPivot.add(this.door);
    this.car.add(this.doorPivot);

    // Wheels
    const createWheel = (x, z) => {
      const wheelGroup = new THREE.Group();
      const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 32);
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.x = Math.PI / 2;
      
      // Rim detail
      const rimGeo = new THREE.TorusGeometry(0.2, 0.05, 16, 32);
      const rim = new THREE.Mesh(rimGeo, new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 1 }));
      rim.position.z = 0.1;
      
      wheelGroup.add(wheel, rim);
      wheelGroup.position.set(x, 0, z);
      this.wheels.push(wheelGroup);
      this.car.add(wheelGroup);
    };

    createWheel(1, 0.8);
    createWheel(1, -0.8);
    createWheel(-1, 0.8);
    createWheel(-1, -0.8);

    this.scene.add(this.car);
  }

  setupEventListeners() {
    // Color change
    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        const color = e.target.dataset.color;
        this.updateColor(color);
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        e.target.classList.add('active');
      });
    });

    // Wheels change
    document.querySelectorAll('.wheel-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.target.dataset.wheel;
        this.updateWheels(type);
        document.querySelectorAll('.wheel-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
      });
    });

    // Door toggle
    document.getElementById('btn-door').addEventListener('click', () => this.toggleDoor());

    // Order button
    document.getElementById('btn-order').addEventListener('click', () => {
      alert('Modellino aggiunto al carrello! Preparati per il viaggio.');
    });
  }

  updateColor(hex) {
    gsap.to(this.body.material.color, {
      r: new THREE.Color(hex).r,
      g: new THREE.Color(hex).g,
      b: new THREE.Color(hex).b,
      duration: 0.5
    });
    // Update door color too
    gsap.to(this.door.material.color, {
      r: new THREE.Color(hex).r,
      g: new THREE.Color(hex).g,
      b: new THREE.Color(hex).b,
      duration: 0.5
    });
  }

  updateWheels(type) {
    const rimColor = type === 'sport' ? 0x888888 : 0xffd700;
    this.wheels.forEach(w => {
      const rim = w.children[1];
      gsap.to(rim.material.color, {
        r: new THREE.Color(rimColor).r,
        g: new THREE.Color(rimColor).g,
        b: new THREE.Color(rimColor).b,
        duration: 0.5
      });
    });
  }

  toggleDoor() {
    const targetRotation = this.isDoorOpen ? 0 : -Math.PI / 2.5;
    gsap.to(this.doorPivot.rotation, {
      y: targetRotation,
      duration: 1,
      ease: "power2.inOut"
    });
    this.isDoorOpen = !this.isDoorOpen;
    document.getElementById('btn-door').textContent = this.isDoorOpen ? 'Chiudi Portiera' : 'Apri Portiera';
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    
    // Subtle float
    this.car.position.y = Math.sin(Date.now() * 0.002) * 0.05;
    
    this.renderer.render(this.scene, this.camera);
  }
}

new CarApp();
