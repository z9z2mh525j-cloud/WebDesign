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
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.container.appendChild(this.renderer.domElement);

    this.camera.position.set(3, 2, 5);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI / 2.1;

    // Garage Environment
    this.scene.background = new THREE.Color(0x0a0a0a);
    this.scene.fog = new THREE.Fog(0x0a0a0a, 5, 15);

    this.createGarage();
    this.createMini();
    this.setupLights();
    this.setupEventListeners();
    this.animate();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  createGarage() {
    // Floor - Concrete
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: 0x222222, 
      roughness: 0.1, 
      metalness: 0.5 
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), wallMat);
    backWall.position.set(0, 5, -10);
    this.scene.add(backWall);

    // Beams (Stylized)
    for(let i = -5; i <= 5; i += 2.5) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 10, 0.2), wallMat);
      beam.position.set(i, 5, -9.9);
      this.scene.add(beam);
    }
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambientLight);

    // Overhead Studio Lights
    const createAreaLight = (x, z) => {
      const light = new THREE.RectAreaLight(0xffffff, 5, 2, 2);
      light.position.set(x, 4, z);
      light.lookAt(0, 0, 0);
      this.scene.add(light);
    };
    
    // Spotlight for dramatic effect
    const spot = new THREE.SpotLight(0x00ff00, 1, 20, Math.PI/4, 0.5);
    spot.position.set(5, 8, 5);
    spot.castShadow = true;
    this.scene.add(spot);
  }

  createMini() {
    const brg = 0x004225; // British Racing Green
    const white = 0xffffff;
    const bodyMat = new THREE.MeshStandardMaterial({ color: brg, metalness: 0.7, roughness: 0.2 });
    const roofMat = new THREE.MeshStandardMaterial({ color: white, metalness: 0.5, roughness: 0.3 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 1, roughness: 0 });

    // Lower Body
    const lowerBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.6, 1.4),
      bodyMat
    );
    lowerBody.position.y = 0.45;
    lowerBody.castShadow = true;
    this.car.add(lowerBody);
    this.bodyParts.push(lowerBody);

    // Cabin (Mini shape is upright)
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.6, 1.2),
      bodyMat
    );
    cabin.position.set(-0.2, 1.0, 0);
    this.car.add(cabin);
    this.bodyParts.push(cabin);

    // Roof
    this.roof = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.1, 1.3),
      roofMat
    );
    this.roof.position.set(-0.2, 1.35, 0);
    this.car.add(this.roof);

    // Front Grill (Chrome)
    const grill = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.8), chromeMat);
    grill.position.set(1.25, 0.45, 0);
    this.car.add(grill);

    // Headlights
    const eyeGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 32);
    const eye = new THREE.Mesh(eyeGeo, chromeMat);
    eye.rotation.z = Math.PI / 2;
    
    const leftEye = eye.clone();
    leftEye.position.set(1.2, 0.6, 0.4);
    this.car.add(leftEye);

    const rightEye = eye.clone();
    rightEye.position.set(1.2, 0.6, -0.4);
    this.car.add(rightEye);

    // Door
    const doorGroup = new THREE.Group();
    doorGroup.position.set(-0.1, 0.45, 0.7); // Hinge
    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.05), bodyMat);
    doorMesh.position.set(-0.35, 0, 0);
    doorGroup.add(doorMesh);
    this.door = doorGroup;
    this.car.add(doorGroup);
    this.bodyParts.push(doorMesh);

    // Wheels (Tiny classic wheels)
    const createWheel = (x, z) => {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 0.2, 32),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
      );
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.25, z);
      this.car.add(wheel);
    };

    createWheel(0.8, 0.6);
    createWheel(0.8, -0.6);
    createWheel(-0.8, 0.6);
    createWheel(-0.8, -0.6);

    this.scene.add(this.car);
  }

  setupEventListeners() {
    // Colors
    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        const color = e.target.dataset.color;
        this.bodyParts.forEach(p => {
          gsap.to(p.material.color, {
            r: new THREE.Color(color).r,
            g: new THREE.Color(color).g,
            b: new THREE.Color(color).b,
            duration: 0.5
          });
        });
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        e.target.classList.add('active');
      });
    });

    // Roof
    document.querySelectorAll('[data-roof]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.target.dataset.roof;
        const color = type === 'white' ? 0xffffff : this.bodyParts[0].material.color;
        gsap.to(this.roof.material.color, {
          r: new THREE.Color(color).r,
          g: new THREE.Color(color).g,
          b: new THREE.Color(color).b,
          duration: 0.5
        });
        document.querySelectorAll('[data-roof]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
      });
    });

    // Interactions
    document.getElementById('btn-door').addEventListener('click', () => this.toggleDoor());
    
    // Cart
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
    const count = document.getElementById('cart-count');
    const content = document.getElementById('cart-content');
    const total = document.getElementById('cart-total');
    
    count.textContent = this.cart.length;
    content.innerHTML = this.cart.map((item, index) => `
      <div class="cart-item">
        <div>
          <h4>${item.name}</h4>
          <small>Colore: ${item.color}</small>
        </div>
        <strong>€${item.price.toLocaleString()}</strong>
      </div>
    `).join('');
    
    const sum = this.cart.reduce((s, i) => s + i.price, 0);
    total.textContent = `€${sum.toLocaleString()}.00`;
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
