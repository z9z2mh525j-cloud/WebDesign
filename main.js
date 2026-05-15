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
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.camera.position.set(5, 3, 7);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI / 2.05;

    this.scene.background = new THREE.Color(0x111111);
    this.scene.fog = new THREE.Fog(0x111111, 8, 30);

    this.createGarage();
    this.loadCar();
    this.setupLights();
    this.setupEventListeners();
    this.animate();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  createGarage() {
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x222222, 
        roughness: 0.15, 
        metalness: 0.6 
    });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.8 });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Garage wall
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), woodMat);
    wall.position.set(0, 5, -8);
    this.scene.add(wall);
  }

  setupLights() {
    // Soft Ambient Warmth
    const ambientLight = new THREE.AmbientLight(0xffe0b2, 0.8);
    this.scene.add(ambientLight);

    // Key Light (Main source)
    const keyLight = new THREE.DirectionalLight(0xffffff, 3);
    keyLight.position.set(5, 10, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    this.scene.add(keyLight);

    // Fill Light (Soften shadows)
    const fillLight = new THREE.DirectionalLight(0xffffff, 1.5);
    fillLight.position.set(-5, 5, 2);
    this.scene.add(fillLight);

    // Rim Light (Edge definition)
    const rimLight = new THREE.PointLight(0xffffff, 4, 20);
    rimLight.position.set(0, 5, -8);
    this.scene.add(rimLight);

    // Extra light for the car front
    const frontLight = new THREE.SpotLight(0xffffff, 2);
    frontLight.position.set(0, 5, 10);
    frontLight.target.position.set(0, 0, 0);
    this.scene.add(frontLight);
    this.scene.add(frontLight.target);
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
          if (name.includes('body') || name.includes('carrozzeria') || name.includes('shell')) {
            this.bodyParts.push(node);
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

      if (this.bodyParts.length === 0) {
        this.carModel.traverse(node => {
          if (node.isMesh && !node.name.toLowerCase().includes('wheel') && !node.name.toLowerCase().includes('tire')) {
            this.bodyParts.push(node);
            node.material.color.set(0x004225);
          }
        });
      }

      this.scene.add(this.carModel);
      
      // Salva il colore attuale nel localStorage per passarlo alla pista
      this.saveCustomization();
    });
  }

  saveCustomization() {
    const carColor = this.bodyParts.length > 0 ? "#" + this.bodyParts[0].material.color.getHexString() : "#004225";
    const roofColor = this.roof ? "#" + this.roof.material.color.getHexString() : "#ffffff";
    localStorage.setItem('mini_car_color', carColor);
    localStorage.setItem('mini_roof_color', roofColor);
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
            duration: 0.5,
            onComplete: () => this.saveCustomization()
          });
        });
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        e.target.classList.add('active');
      });
    });

    document.querySelectorAll('[data-roof]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.target.dataset.roof;
        if (!this.roof && this.bodyParts.length > 0) this.roof = this.bodyParts[0]; 
        if (this.roof) {
            const targetColor = type === 'white' ? new THREE.Color(0xffffff) : this.bodyParts[0].material.color;
            gsap.to(this.roof.material.color, {
              r: targetColor.r,
              g: targetColor.g,
              b: targetColor.b,
              duration: 0.5,
              onComplete: () => this.saveCustomization()
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
        alert("Nessuna portiera interattiva trovata nel modello.");
        return;
    }
    this.isDoorOpen = !this.isDoorOpen;
    const targetRotation = this.isDoorOpen ? -Math.PI / 3 : 0;
    this.doors.forEach(door => {
        gsap.to(door.rotation, { y: targetRotation, duration: 1, ease: "power2.inOut" });
    });
    document.getElementById('btn-door').textContent = this.isDoorOpen ? 'Chiudi Portiera' : 'Apri Portiera';
  }

  addToCart() {
    const item = {
      name: "Il Tuo Modello Custom",
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
