import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import gsap from 'gsap';

class MiniApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    this.car = new THREE.Group();
    this.bodyParts = [];
    this.door = null;
    this.roof = null;
    this.isDoorOpen = false;
    this.cart = [];

    this.init();
  }

  init() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.camera.position.set(5, 3, 5);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI / 2.1;

    // Garage Environment
    this.scene.background = new THREE.Color(0x111111);
    this.scene.fog = new THREE.Fog(0x111111, 2, 30);

    this.createGarage();
    this.createMini();
    this.setupLights();
    this.setupEventListeners();
    this.animate();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  createGarage() {
    // Floor
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: 0x222222, 
      roughness: 0.2, 
      metalness: 0.1 
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Walls (Dark and simple)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x050505 });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), wallMat);
    wall.position.z = -10;
    wall.position.y = 10;
    this.scene.add(wall);
  }

  setupLights() {
    // General Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // Main Studio Light
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    this.scene.add(mainLight);

    // Rim Light (Back)
    const rimLight = new THREE.PointLight(0x00ff00, 1);
    rimLight.position.set(-5, 5, -5);
    this.scene.add(rimLight);

    // Top Soft Light
    const topLight = new THREE.PointLight(0xffffff, 1);
    topLight.position.set(0, 5, 0);
    this.scene.add(topLight);
  }

  createMini() {
    const brg = 0x004225; // British Racing Green
    const white = 0xffffff;
    
    // Clear previous if any
    this.car.clear();
    this.bodyParts = [];

    // Body Mat
    const bodyMat = new THREE.MeshStandardMaterial({ color: brg, metalness: 0.6, roughness: 0.3 });
    const roofMat = new THREE.MeshStandardMaterial({ color: white, metalness: 0.4, roughness: 0.4 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.1 });

    // Lower Body
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 1.4), bodyMat);
    lowerBody.position.y = 0.5;
    lowerBody.castShadow = true;
    this.car.add(lowerBody);
    this.bodyParts.push(lowerBody);

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 1.2), bodyMat);
    cabin.position.set(-0.2, 1.1, 0);
    this.car.add(cabin);
    this.bodyParts.push(cabin);

    // Roof
    this.roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.3), roofMat);
    this.roof.position.set(-0.2, 1.4, 0);
    this.car.add(this.roof);

    // Headlights
    const eyeGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const leftEye = new THREE.Mesh(eyeGeo, chromeMat);
    leftEye.position.set(1.1, 0.7, 0.45);
    this.car.add(leftEye);

    const rightEye = leftEye.clone();
    rightEye.position.set(1.1, 0.7, -0.45);
    this.car.add(rightEye);

    // Grill
    const grill = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.7), chromeMat);
    grill.position.set(1.2, 0.5, 0);
    this.car.add(grill);

    // Door
    const doorGroup = new THREE.Group();
    doorGroup.position.set(-0.1, 0.5, 0.7); 
    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.05), bodyMat);
    doorMesh.position.set(-0.35, 0, 0);
    doorGroup.add(doorMesh);
    this.door = doorGroup;
    this.car.add(doorGroup);
    this.bodyParts.push(doorMesh);

    // Wheels
    const createWheel = (x, z) => {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.2, 32),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
      );
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.3, z);
      this.car.add(wheel);
    };

    createWheel(0.8, 0.6);
    createWheel(0.8, -0.6);
    createWheel(-0.8, 0.6);
    createWheel(-0.8, -0.6);

    this.scene.add(this.car);
  }

  setupEventListeners() {
    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        const colorHex = e.target.dataset.color;
        const color = new THREE.Color(colorHex);
        this.bodyParts.forEach(p => {
          gsap.to(p.material.color, {
            r: color.r,
            g: color.g,
            b: color.b,
            duration: 0.5
          });
        });
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        e.target.classList.add('active');
      });
    });

    document.querySelectorAll('[data-roof]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.target.dataset.roof;
        const targetColor = type === 'white' ? new THREE.Color(0xffffff) : this.bodyParts[0].material.color;
        gsap.to(this.roof.material.color, {
          r: targetColor.r,
          g: targetColor.g,
          b: targetColor.b,
          duration: 0.5
        });
        document.querySelectorAll('[data-roof]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
      });
    });

    document.getElementById('btn-door').addEventListener('click', () => this.toggleDoor());
    document.getElementById('btn-add-cart').addEventListener('click', () => this.addToCart());
    document.getElementById('cart-trigger').addEventListener('click', () => this.toggleCart(true));
    document.getElementById('cart-close').addEventListener('click', () => this.toggleCart(false));
  }

  toggleDoor() {
    const target = this.isDoorOpen ? 0 : -Math.PI / 2.5;
    gsap.to(this.door.rotation, { y: target, duration: 1, ease: "power2.inOut" });
    this.isDoorOpen = !this.isDoorOpen;
    document.getElementById('btn-door').textContent = this.isDoorOpen ? 'Chiudi Portiera' : 'Apri Portiera';
  }

  addToCart() {
    const item = {
      name: "Vintage Mini Classic",
      color: "#" + this.bodyParts[0].material.color.getHexString(),
      price: 18500
    };
    this.cart.push(item);
    this.updateCartUI();
    this.toggleCart(true);
  }

  updateCartUI() {
    document.getElementById('cart-count').textContent = this.cart.length;
    document.getElementById('cart-content').innerHTML = this.cart.map(item => `
      <div class="cart-item">
        <div>
          <h4>${item.name}</h4>
          <small>Colore: ${item.color}</small>
        </div>
        <strong>€${item.price.toLocaleString()}</strong>
      </div>
    `).join('');
    const sum = this.cart.reduce((s, i) => s + i.price, 0);
    document.getElementById('cart-total').textContent = `€${sum.toLocaleString()}.00`;
  }

  toggleCart(open) {
    document.getElementById('cart-panel').classList.toggle('open', open);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

new MiniApp();
