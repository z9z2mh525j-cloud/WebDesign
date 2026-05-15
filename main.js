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
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.camera.position.set(4, 2, 6);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 10;

    this.scene.background = new THREE.Color(0x1a1a1a);
    this.scene.fog = new THREE.Fog(0x1a1a1a, 5, 25);

    this.createGarage();
    this.createMini();
    this.setupLights();
    this.setupEventListeners();
    this.animate();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  createGarage() {
    // Materials
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.7 });

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Back Wall (Wooden Garage Door)
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), woodMat);
    backWall.position.set(0, 3, -5);
    this.scene.add(backWall);

    // Decorative panels for garage door
    for(let i = 0; i < 3; i++) {
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(11, 0.1), new THREE.MeshStandardMaterial({color: 0x3e2723}));
        panel.position.set(0, 1.5 + (i * 1.5), -4.95);
        this.scene.add(panel);
    }

    // Side Walls
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(15, 6), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-6, 3, 0);
    this.scene.add(leftWall);

    // Ceiling
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(12, 15), wallMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 6, 0);
    this.scene.add(ceiling);

    // Shelves (Geometric)
    for(let i = 0; i < 3; i++) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 0.5), woodMat);
        shelf.position.set(-5.7, 1 + i*1.2, -3);
        this.scene.add(shelf);
    }
  }

  setupLights() {
    // Warm Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffe0b2, 0.3);
    this.scene.add(ambientLight);

    // Main Overhead Bulb (Warm)
    const bulb = new THREE.PointLight(0xffcc80, 2, 15);
    bulb.position.set(0, 4, 0);
    bulb.castShadow = true;
    bulb.shadow.mapSize.width = 1024;
    bulb.shadow.mapSize.height = 1024;
    this.scene.add(bulb);

    // Neon/LED strip effect (Cold contrast)
    const neon = new THREE.RectAreaLight(0x3a86ff, 1, 4, 0.1);
    neon.position.set(-5.9, 4, 0);
    neon.rotation.y = Math.PI / 2;
    this.scene.add(neon);

    // Practical bulb mesh
    const bulbGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffcc80 });
    const bulbMesh = new THREE.Mesh(bulbGeo, bulbMat);
    bulbMesh.position.copy(bulb.position);
    this.scene.add(bulbMesh);
  }

  createMini() {
    const brg = 0x004225; 
    const white = 0xffffff;
    
    this.car.clear();
    this.bodyParts = [];

    const bodyMat = new THREE.MeshStandardMaterial({ color: brg, metalness: 0.7, roughness: 0.2 });
    const roofMat = new THREE.MeshStandardMaterial({ color: white, metalness: 0.5, roughness: 0.3 });
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
    cabin.castShadow = true;
    this.car.add(cabin);
    this.bodyParts.push(cabin);

    // Roof
    this.roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.3), roofMat);
    this.roof.position.set(-0.2, 1.4, 0);
    this.roof.castShadow = true;
    this.car.add(this.roof);

    // Headlights (Now with emmisive glow)
    const eyeGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const eyeMat = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        emissive: 0xffffaa, 
        emissiveIntensity: 0.5,
        metalness: 1 
    });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
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
    doorMesh.castShadow = true;
    doorGroup.add(doorMesh);
    this.door = doorGroup;
    this.car.add(doorGroup);
    this.bodyParts.push(doorMesh);

    // Wheels
    const createWheel = (x, z) => {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.2, 32),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 })
      );
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.28, z);
      wheel.castShadow = true;
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
