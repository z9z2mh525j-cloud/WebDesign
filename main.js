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

    this.scene.background = new THREE.Color(0x1a1a1a);
    this.scene.fog = new THREE.Fog(0x1a1a1a, 5, 25);

    this.createGarage();
    this.loadCar();
    this.setupLights();
    this.setupEventListeners();
    this.animate();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  createGarage() {
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.7 });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), woodMat);
    backWall.position.set(0, 3, -5);
    this.scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(15, 6), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-6, 3, 0);
    this.scene.add(leftWall);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(12, 15), wallMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 6, 0);
    this.scene.add(ceiling);
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffe0b2, 0.4);
    this.scene.add(ambientLight);

    const bulb = new THREE.PointLight(0xffcc80, 2, 20);
    bulb.position.set(0, 4, 2);
    bulb.castShadow = true;
    this.scene.add(bulb);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(5, 5, 5);
    keyLight.castShadow = true;
    this.scene.add(keyLight);
  }

  loadCar() {
    const loader = new GLTFLoader();
    loader.load('/car.glb', (gltf) => {
      this.carModel = gltf.scene;
      
      // Auto-scaling and centering
      const box = new THREE.Box3().setFromObject(this.carModel);
      const size = box.getSize(new THREE.Vector3());
      const scale = 3 / size.x; // Target 3 units length
      this.carModel.scale.set(scale, scale, scale);
      
      // Reset position to floor
      this.carModel.position.y = -box.min.y * scale;
      
      this.carModel.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          
          // Identify parts by name (heuristics)
          const name = node.name.toLowerCase();
          if (name.includes('body') || name.includes('carrozzeria') || name.includes('shell')) {
            this.bodyParts.push(node);
            // Set initial British Racing Green if no color is set
            node.material.color.set(0x004225);
          }
          if (name.includes('door') || name.includes('porta')) {
            this.doors.push(node);
          }
          if (name.includes('roof') || name.includes('tetto')) {
            this.roof = node;
            node.material.color.set(0xffffff);
          }
        }
      });

      // If no body parts were found by name, assume all non-wheel meshes are body
      if (this.bodyParts.length === 0) {
        this.carModel.traverse(node => {
          if (node.isMesh && !node.name.toLowerCase().includes('wheel') && !node.name.toLowerCase().includes('tire')) {
            this.bodyParts.push(node);
            node.material.color.set(0x004225);
          }
        });
      }

      this.scene.add(this.carModel);
      console.log("Modello caricato:", this.carModel);
    }, undefined, (error) => {
      console.error("Errore nel caricamento del modello:", error);
    });
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
        if (!this.roof && this.bodyParts.length > 0) {
            // Fallback: use the first body part if roof not found
            this.roof = this.bodyParts[0]; 
        }
        if (this.roof) {
            const targetColor = type === 'white' ? new THREE.Color(0xffffff) : this.bodyParts[0].material.color;
            gsap.to(this.roof.material.color, {
              r: targetColor.r,
              g: targetColor.g,
              b: targetColor.b,
              duration: 0.5
            });
        }
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
    if (this.doors.length === 0) {
        alert("Nessuna portiera interattiva trovata nel modello 3D.");
        return;
    }
    
    this.isDoorOpen = !this.isDoorOpen;
    const targetRotation = this.isDoorOpen ? -Math.PI / 3 : 0;
    
    this.doors.forEach(door => {
        gsap.to(door.rotation, {
            y: targetRotation,
            duration: 1,
            ease: "power2.inOut"
        });
    });
    
    document.getElementById('btn-door').textContent = this.isDoorOpen ? 'Chiudi Portiera' : 'Apri Portiera';
  }

  addToCart() {
    const item = {
      name: "Il Tuo Modello Personalizzato",
      color: this.bodyParts.length > 0 ? "#" + this.bodyParts[0].material.color.getHexString() : "Default",
      price: 24500
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
