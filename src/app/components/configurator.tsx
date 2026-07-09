import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';

// Driver Configs (base stats)
const DRIVERS = {
  mario: {
    name: "MARIO",
    emoji: "🔴",
    color: "#E52521",
    paintHue: 0,
    paintSat: 100,
    stats: { speed: 3, accel: 3, handle: 3, traction: 3 }
  },
  luigi: {
    name: "LUIGI",
    emoji: "🟢",
    color: "#46B31D",
    paintHue: 120,
    paintSat: 100,
    stats: { speed: 3, accel: 3, handle: 4, traction: 4 }
  },
  peach: {
    name: "PEACH",
    emoji: "💖",
    color: "#F9A7B6",
    paintHue: 300,
    paintSat: 140,
    stats: { speed: 2, accel: 4, handle: 4, traction: 3 }
  },
  bowser: {
    name: "BOWSER",
    emoji: "🐢",
    color: "#F39C12",
    paintHue: 25,
    paintSat: 150,
    stats: { speed: 5, accel: 1, handle: 2, traction: 2 }
  },
  yoshi: {
    name: "YOSHI",
    emoji: "🦕",
    color: "#9DE02A",
    paintHue: 75,
    paintSat: 120,
    stats: { speed: 3, accel: 4, handle: 3, traction: 5 }
  },
  toad: {
    name: "TOAD",
    emoji: "🍄",
    color: "#0093E9",
    paintHue: 220,
    paintSat: 150,
    stats: { speed: 2, accel: 5, handle: 5, traction: 3 }
  }
};

interface ConfiguratorProps {
  onBackToMenu?: () => void;
  onTestDrive?: (kartColor: string, kartUrl: string) => void;
  autoAddToCart?: boolean;
  onAutoAddHandled?: () => void;
  discount?: number;
  onPurchaseComplete?: () => void;
}

export function Configurator({ onBackToMenu, onTestDrive, autoAddToCart, onAutoAddHandled, discount = 0, onPurchaseComplete }: ConfiguratorProps) {
  const isInitialized = useRef(false);
  const glbSpinnerRef = useRef<any>(null);
  const mascotViewerRef = useRef<any>(null);
  const mascotIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Application State
    const state = {
      currentDriver: "mario",
      currentPaint: { hue: 0, sat: 100 },
      currentTire: "standard",
      currentGlider: "super",
      currentFrame: 0,
      userCoins: 9999,
      cart: [] as any[]
    };

    // Retro audio synthesizer
    class RetroAudio {
      ctx: AudioContext | null = null;
      init() {
        if (!this.ctx) {
          this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
      }
      playBeep() {
        try {
          this.init();
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(450, this.ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.08);
          gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start();
          osc.stop(this.ctx.currentTime + 0.08);
        } catch (e) {}
      }
      playCoin() {
        try {
          this.init();
          if (!this.ctx) return;
          const now = this.ctx.currentTime;
          const osc1 = this.ctx.createOscillator();
          const gain1 = this.ctx.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(987.77, now);
          gain1.gain.setValueAtTime(0.06, now);
          gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
          osc1.connect(gain1);
          gain1.connect(this.ctx.destination);
          osc1.start(now);
          osc1.stop(now + 0.08);

          const osc2 = this.ctx.createOscillator();
          const gain2 = this.ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1318.51, now + 0.07);
          gain2.gain.setValueAtTime(0.06, now + 0.07);
          gain2.gain.exponentialRampToValueAtTime(0.005, now + 0.07 + 0.25);
          osc2.connect(gain2);
          gain2.connect(this.ctx.destination);
          osc2.start(now + 0.07);
          osc2.stop(now + 0.07 + 0.25);
        } catch (e) {}
      }
    }

    const audio = new RetroAudio();

    // Find the kart's body-paint material and the meshes to recolor. The body
    // material is the one named in KNOWN_BODY (or, as a fallback, the one
    // covering the most geometry). Wheels often share the body material, so we
    // exclude wheel meshes - detected as meshes whose vertex count is repeated
    // 4+ times (the four identical wheels) - from recolouring.
    function pickBody(model: any): { bodyMat: any; recolorMeshes: any[] } {
      const KNOWN_BODY = new Set(['material_2.029', 'defaultMaterial', 'metal']);
      const matVerts = new Map<any, number>();
      model.traverse((c: any) => {
        if (!c.isMesh || !c.geometry) return;
        const pos = c.geometry.getAttribute('position');
        const n = pos ? pos.count : 0;
        const mats = Array.isArray(c.material) ? c.material : [c.material];
        mats.forEach((m: any) => { if (m) matVerts.set(m, (matVerts.get(m) || 0) + n); });
      });
      let bodyMat: any = null;
      matVerts.forEach((_n, m) => { if (m.name && KNOWN_BODY.has(m.name)) bodyMat = m; });
      if (!bodyMat) {
        let best = -1;
        matVerts.forEach((n, m) => { if (n > best) { best = n; bodyMat = m; } });
      }
      const bodyMeshes: any[] = [];
      model.traverse((c: any) => {
        if (!c.isMesh) return;
        const mats = Array.isArray(c.material) ? c.material : [c.material];
        if (mats.indexOf(bodyMat) !== -1) bodyMeshes.push(c);
      });
      // Vertex-count frequency to spot the (repeated) wheels.
      const freq = new Map<number, number>();
      bodyMeshes.forEach((m) => {
        const n = m.geometry.getAttribute('position')?.count || 0;
        freq.set(n, (freq.get(n) || 0) + 1);
      });
      const recolorMeshes = bodyMeshes.filter((m) => {
        const n = m.geometry.getAttribute('position')?.count || 0;
        return (freq.get(n) || 0) < 4;
      });
      return { bodyMat, recolorMeshes };
    }

    // 3D GLB Spinner
    class KartSpinner {
      container: HTMLElement;
      scene: THREE.Scene | null = null;
      camera: THREE.PerspectiveCamera | null = null;
      renderer: THREE.WebGLRenderer | null = null;
      modelGroup: THREE.Group | null = null;
      // 'original' = keep the kart's classic color from the .glb file.
      currentColor = 'original';
      kartUrl = '/mariokartcar.glb';
      bodyMat: any = null;          // the kart's body-paint material
      recolorMeshes: any[] = [];    // body meshes to recolor (wheels excluded)
      originalMap: any = null;      // body material's original texture
      isDragging = false;
      startX = 0;
      startRotationY = 0;
      loader = new GLTFLoader();
      destroyed = false;

      pointerDownHandler: any;
      pointerMoveHandler: any;
      pointerUpHandler: any;
      resizeHandler: any;
      spinLeftHandler: any;
      spinRightHandler: any;

      constructor() {
        this.container = document.getElementById('kart-spinner-container')!;
        this.init();
      }

      init() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
        this.camera.position.set(0, 0.5, 6.5);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.25;
        this.container.appendChild(this.renderer.domElement);

        this.modelGroup = new THREE.Group();
        this.scene.add(this.modelGroup);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        this.scene.add(ambientLight);

        const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight1.position.set(5, 12, 8);
        this.scene.add(dirLight1);

        const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight2.position.set(-6, 6, -6);
        this.scene.add(dirLight2);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);

        this.loadModel('/mariokartcar.glb');

        // Handlers references for cleanup
        this.pointerDownHandler = (e: PointerEvent) => this.handleDragStart(e);
        this.pointerMoveHandler = (e: PointerEvent) => this.handleDragMove(e);
        this.pointerUpHandler = () => this.handleDragEnd();
        this.resizeHandler = () => this.handleResize();

        this.container.addEventListener('pointerdown', this.pointerDownHandler);
        window.addEventListener('pointermove', this.pointerMoveHandler);
        window.addEventListener('pointerup', this.pointerUpHandler);
        window.addEventListener('resize', this.resizeHandler);

        this.spinLeftHandler = () => {
          audio.playBeep();
          if (this.modelGroup) {
            gsap.to(this.modelGroup.rotation, {
              y: this.modelGroup.rotation.y + Math.PI / 4,
              duration: 0.4,
              ease: 'power2.out'
            });
          }
        };

        this.spinRightHandler = () => {
          audio.playBeep();
          if (this.modelGroup) {
            gsap.to(this.modelGroup.rotation, {
              y: this.modelGroup.rotation.y - Math.PI / 4,
              duration: 0.4,
              ease: 'power2.out'
            });
          }
        };

        document.getElementById('spin-left')?.addEventListener('click', this.spinLeftHandler);
        document.getElementById('spin-right')?.addEventListener('click', this.spinRightHandler);

        this.animate();
      }

      loadModel(url: string) {
        this.kartUrl = url;
        const existingSpinner = document.getElementById('glb-loader-spinner');
        if (existingSpinner) existingSpinner.style.display = 'flex';

        if (this.modelGroup) {
          while (this.modelGroup.children.length) {
            this.modelGroup.remove(this.modelGroup.children[0]);
          }
        }

        const prevRotY = this.modelGroup ? this.modelGroup.rotation.y : 0;

        this.loader.load(
          url,
          (gltf) => {
            const loaderSpinner = document.getElementById('glb-loader-spinner');
            if (loaderSpinner) loaderSpinner.style.display = 'none';

            const loadedModel = gltf.scene;
            const box = new THREE.Box3().setFromObject(loadedModel);
            const size = box.getSize(new THREE.Vector3());
            // Normalize by the ground footprint (length x width), not the max
            // dimension, so all karts look the same size regardless of tall
            // parts (e.g. exhaust pipes).
            const footprint = Math.hypot(size.x, size.z) || 1;
            const scale = 4.62 / footprint;
            loadedModel.scale.setScalar(scale);

            const box2 = new THREE.Box3().setFromObject(loadedModel);
            const center2 = box2.getCenter(new THREE.Vector3());
            loadedModel.position.sub(center2);

            loadedModel.traverse((child) => {
              if ((child as any).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            this.modelGroup!.add(loadedModel);
            this.modelGroup!.rotation.y = prevRotY;

            const { bodyMat, recolorMeshes } = pickBody(loadedModel);
            this.bodyMat = bodyMat;
            this.recolorMeshes = recolorMeshes;
            this.originalMap = bodyMat ? (bodyMat.map || null) : null;

            this.applyBodyColor(this.currentColor);
          },
          undefined,
          (error) => {
            console.error('Error loading GLB:', error);
          }
        );
      }

      updateColorHex(color: string) {
        if (color === 'original') {
          this.applyBodyColor('original');
          return;
        }
        const hex = '#' + new THREE.Color(color).getHexString().toUpperCase();
        this.applyBodyColor(hex);
      }

      // Build a recolored copy of the body texture: paint the *coloured*
      // pixels (the painted panel) with the chosen colour while keeping the
      // near-white / near-grey pixels (the "M" logo and details) intact.
      recolorTexture(srcTex: any, hex: string) {
        const img = srcTex && srcTex.image;
        if (!img || !img.width) return null;
        const w = img.width, h = img.height;
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        try {
          ctx.drawImage(img, 0, 0, w, h);
          const imgData = ctx.getImageData(0, 0, w, h);
          const d = imgData.data;
          const num = parseInt(hex.replace('#', ''), 16);
          const tr = (num >> 16) & 255, tg = (num >> 8) & 255, tb = num & 255;
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i], g = d[i + 1], b = d[i + 2];
            const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
            const sat = mx > 0 ? (mx - mn) / mx : 0;
            if (sat > 0.22) {
              const br = mx / 255; // keep the pixel's shading
              d[i] = Math.round(tr * br);
              d[i + 1] = Math.round(tg * br);
              d[i + 2] = Math.round(tb * br);
            }
          }
          ctx.putImageData(imgData, 0, 0);
        } catch (e) {
          return null;
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.flipY = srcTex.flipY;
        tex.colorSpace = srcTex.colorSpace;
        tex.wrapS = srcTex.wrapS; tex.wrapT = srcTex.wrapT;
        tex.repeat.copy(srcTex.repeat); tex.offset.copy(srcTex.offset);
        tex.needsUpdate = true;
        return tex;
      }

      applyBodyColor(hex: string) {
        if (!hex) return;
        this.currentColor = hex;
        if (!this.modelGroup || !this.bodyMat || this.recolorMeshes.length === 0) return;

        // 'original' = put the original body material back on the body meshes.
        if (hex === 'original') {
          this.recolorMeshes.forEach((m) => { m.material = this.bodyMat; });
          return;
        }

        // A chosen color: build ONE recolored clone of the body material
        // (texture recolored to keep logos like the "M") and assign it only to
        // the body meshes - the wheels keep the original material untouched.
        const clone = this.bodyMat.clone();
        const recolored = this.originalMap ? this.recolorTexture(this.originalMap, hex) : null;
        if (recolored) {
          clone.map = recolored;
          if (clone.color) clone.color.set(0xffffff);
        } else {
          if (clone.color) clone.color.set(hex);
          clone.map = null;
        }
        clone.needsUpdate = true;
        this.recolorMeshes.forEach((m) => { m.material = clone; });
      }

      handleDragStart(e: PointerEvent) {
        e.preventDefault();
        if (!this.modelGroup) return;
        this.isDragging = true;
        this.startX = e.clientX;
        this.startRotationY = this.modelGroup.rotation.y;
        this.container.setPointerCapture(e.pointerId);
      }

      handleDragMove(e: PointerEvent) {
        if (!this.isDragging || !this.modelGroup) return;
        const deltaX = e.clientX - this.startX;
        this.modelGroup.rotation.y = this.startRotationY + deltaX * 0.007;
      }

      handleDragEnd() {
        this.isDragging = false;
      }

      handleResize() {
        if (!this.container || !this.renderer || !this.camera) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
      }

      animate() {
        if (this.destroyed) return;
        requestAnimationFrame(() => this.animate());

        if (!this.isDragging && this.modelGroup) {
          this.modelGroup.rotation.y -= 0.002;
        }

        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
      }

      destroy() {
        this.destroyed = true;
        this.container.removeEventListener('pointerdown', this.pointerDownHandler);
        window.removeEventListener('pointermove', this.pointerMoveHandler);
        window.removeEventListener('pointerup', this.pointerUpHandler);
        window.removeEventListener('resize', this.resizeHandler);
        document.getElementById('spin-left')?.removeEventListener('click', this.spinLeftHandler);
        document.getElementById('spin-right')?.removeEventListener('click', this.spinRightHandler);

        if (this.renderer) {
          this.renderer.dispose();
          if (this.renderer.domElement && this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
          }
        }
      }
    }

    // Stats and Pricing calculator
    function updateConfigStats() {
      const driver = (DRIVERS as any)[state.currentDriver];
      const tireCard = document.querySelector('[data-part-type="tire"].active') as HTMLElement;
      const gliderCard = document.querySelector('[data-part-type="glider"].active') as HTMLElement;

      let speed = driver.stats.speed;
      let accel = driver.stats.accel;
      let handle = driver.stats.handle;
      let traction = driver.stats.traction;

      if (tireCard) {
        speed += parseInt(tireCard.dataset.modSpeed || '0');
        accel += parseInt(tireCard.dataset.modAccel || '0');
        handle += parseInt(tireCard.dataset.modHandle || '0');
        traction += parseInt(tireCard.dataset.modTraction || '0');
      }
      if (gliderCard) {
        speed += parseInt(gliderCard.dataset.modSpeed || '0');
        accel += parseInt(gliderCard.dataset.modAccel || '0');
        handle += parseInt(gliderCard.dataset.modHandle || '0');
        traction += parseInt(gliderCard.dataset.modTraction || '0');
      }

      const clamp = (v: number) => Math.max(1, Math.min(5, v));
      const finalSpeed = clamp(speed);
      const finalAccel = clamp(accel);
      const finalHandle = clamp(handle);
      const finalTraction = clamp(traction);

      const valSpeed = document.getElementById('val-speed');
      if (valSpeed) valSpeed.textContent = `${finalSpeed}/5`;
      const valAccel = document.getElementById('val-accel');
      if (valAccel) valAccel.textContent = `${finalAccel}/5`;
      const valHandle = document.getElementById('val-handle');
      if (valHandle) valHandle.textContent = `${finalHandle}/5`;
      const valTraction = document.getElementById('val-traction');
      if (valTraction) valTraction.textContent = `${finalTraction}/5`;

      gsap.to('#bar-speed', { width: `${(finalSpeed / 5) * 100}%`, duration: 0.4, ease: 'power2.out' });
      gsap.to('#bar-accel', { width: `${(finalAccel / 5) * 100}%`, duration: 0.4, ease: 'power2.out' });
      gsap.to('#bar-handle', { width: `${(finalHandle / 5) * 100}%`, duration: 0.4, ease: 'power2.out' });
      gsap.to('#bar-traction', { width: `${(finalTraction / 5) * 100}%`, duration: 0.4, ease: 'power2.out' });

      let price = 800;
      if (tireCard && tireCard.dataset.partId !== 'standard') {
        price += tireCard.dataset.partId === 'slick' ? 150 : 200;
      }
      if (gliderCard && gliderCard.dataset.partId !== 'super') {
        price += gliderCard.dataset.partId === 'parasol' ? 120 : 180;
      }

      // Apply the Test Drive crate discount (-10% per crate hit).
      const pct = Math.max(0, Math.min(100, discount));
      const finalPrice = Math.round(price * (1 - pct / 100));

      const configTotalPrice = document.getElementById('config-total-price');
      if (configTotalPrice) configTotalPrice.textContent = finalPrice.toString();

      const discountBadge = document.getElementById('td-discount-badge');
      if (discountBadge) {
        if (pct > 0) {
          discountBadge.style.display = 'block';
          discountBadge.textContent = `🎁 Sconto Test Drive: -${pct}%  (${price} → ${finalPrice} 🪙)`;
        } else {
          discountBadge.style.display = 'none';
        }
      }
    }

    // UI event listeners setup
    function setupUIEventListeners() {
      const drawer = document.getElementById('customizer-drawer')!;
      document.getElementById('btn-close-drawer')?.addEventListener('click', () => {
        audio.playBeep();
        drawer.classList.remove('open');
      });

      document.getElementById('btn-open-customizer')?.addEventListener('click', () => {
        audio.playBeep();
        drawer.classList.add('open');
      });

      document.querySelectorAll('.inline-swatch').forEach(sw => {
        sw.addEventListener('click', () => {
          audio.playBeep();
          document.querySelectorAll('.inline-swatch').forEach(s => s.classList.remove('active'));
          sw.classList.add('active');
          const hex = (sw as HTMLElement).dataset.hex;
          if (glbSpinnerRef.current && hex) glbSpinnerRef.current.updateColorHex(hex);
          state.currentPaint.hue = parseInt((sw as HTMLElement).dataset.colorHue || '0');
        });
      });

      // Kart model selector thumbnails (Standard / Egg Standard).
      document.querySelectorAll('.kart-thumb-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const url = (btn as HTMLElement).dataset.kart;
          if (!url || !glbSpinnerRef.current) return;
          if (glbSpinnerRef.current.kartUrl === url) return;
          audio.playBeep();
          document.querySelectorAll('.kart-thumb-btn').forEach(b => {
            b.classList.remove('active');
            (b as HTMLElement).style.background = '#ffffff';
          });
          btn.classList.add('active');
          (btn as HTMLElement).style.background = '#FFD500';
          glbSpinnerRef.current.loadModel(url);
        });
      });

      document.querySelectorAll('.choice-avatar').forEach(btn => {
        btn.addEventListener('click', () => {
          const driverId = (btn as HTMLElement).dataset.driver;
          if (state.currentDriver === driverId || !driverId) return;

          audio.playBeep();
          document.querySelectorAll('.choice-avatar').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          state.currentDriver = driverId;
          const driverData = (DRIVERS as any)[driverId];

          const label = document.getElementById('selected-driver-label');
          if (label) label.textContent = `Pilota Attivo: ${driverData.name}`;

          updateConfigStats();
        });
      });

      document.querySelectorAll('.chip-btn').forEach(card => {
        card.addEventListener('click', () => {
          audio.playBeep();
          const type = (card as HTMLElement).dataset.partType;
          document.querySelectorAll(`[data-part-type="${type}"]`).forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          updateConfigStats();
        });
      });

      const cartSlide = document.getElementById('cart-panel')!;
      document.getElementById('btn-open-garage')?.addEventListener('click', () => {
        audio.playBeep();
        cartSlide.classList.add('open');
      });

      document.getElementById('cart-close')?.addEventListener('click', () => {
        audio.playBeep();
        cartSlide.classList.remove('open');
      });
    }

    // Cart and checkout manager
    class CartManager {
      addBtn = document.getElementById('btn-add-to-cart')!;
      cartContent = document.getElementById('cart-content')!;
      checkoutBtn = document.getElementById('btn-checkout-trigger')! as HTMLButtonElement;
      paymentForm = document.getElementById('payment-form')! as HTMLFormElement;

      constructor() {
        this.init();
      }

      init() {
        this.addBtn.addEventListener('click', () => this.addItem());
        document.getElementById('btn-inline-add-to-cart')?.addEventListener('click', () => this.addItem());

        this.paymentForm.addEventListener('submit', (e) => {
          e.preventDefault();
          this.completeTransaction('Credit Card');
        });

        document.getElementById('pay-paypal')?.addEventListener('click', () => {
          this.completeTransaction('PayPal');
        });
        document.getElementById('pay-apple')?.addEventListener('click', () => {
          this.completeTransaction('Apple Pay');
        });
        document.getElementById('pay-google')?.addEventListener('click', () => {
          this.completeTransaction('Google Pay');
        });

        document.getElementById('btn-close-victory')?.addEventListener('click', () => {
          audio.playBeep();
          document.getElementById('checkout-modal')?.classList.remove('open');
          document.getElementById('cart-panel')?.classList.remove('open');
          document.getElementById('customizer-drawer')?.classList.remove('open');
          const pp = document.getElementById('purchase-page');
          if (pp) pp.style.display = 'none';
        });

        // Cart "ACQUISTA" -> go to the full-screen purchase page.
        document.getElementById('btn-go-purchase')?.addEventListener('click', () => {
          if (state.cart.length === 0) return;
          audio.playBeep();
          document.getElementById('cart-panel')?.classList.remove('open');
          this.renderPurchaseSummary();
          const pp = document.getElementById('purchase-page');
          if (pp) pp.style.display = 'block';
        });
        // Back from the purchase page to the cart.
        document.getElementById('btn-purchase-back')?.addEventListener('click', () => {
          audio.playBeep();
          const pp = document.getElementById('purchase-page');
          if (pp) pp.style.display = 'none';
          document.getElementById('cart-panel')?.classList.add('open');
        });
      }

      renderPurchaseSummary() {
        const itemsEl = document.getElementById('purchase-items');
        if (itemsEl) {
          itemsEl.innerHTML = state.cart.map(item => `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:2px dashed rgba(26,26,26,0.18);color:#1a1a1a;font-family:'Outfit',sans-serif;">
              <div>
                <div style="font-weight:900;">${item.emoji} Kart Custom ${item.driver}</div>
                <div style="font-size:0.8rem;color:#6b5a34;font-weight:600;">Telaio: ${item.paintName} · ${item.tires} · ${item.glider}</div>
              </div>
              <div style="text-align:right;white-space:nowrap;">
                ${item.discountPct > 0 ? `<div style="font-size:0.72rem;color:#1f9d2f;font-weight:900;">🎁 -${item.discountPct}%</div>` : ''}
                <div style="font-weight:900;color:#d62828;">${item.price} 🪙</div>
              </div>
            </div>
          `).join('') || '<p style="color:#8a774f;font-family:\'Outfit\',sans-serif;font-weight:700;">Nessun articolo.</p>';
        }
        const total = state.cart.reduce((sum, item) => sum + item.price, 0);
        const totalEl = document.getElementById('purchase-total');
        if (totalEl) totalEl.textContent = `${total} 🪙`;
      }

      addItem() {
        audio.playCoin();
        const driver = (DRIVERS as any)[state.currentDriver];
        const tire = document.querySelector('[data-part-type="tire"].active') as HTMLElement;
        const glider = document.querySelector('[data-part-type="glider"].active') as HTMLElement;
        const paint = document.querySelector('.inline-swatch.active') as HTMLElement;

        const paintName = paint ? paint.getAttribute('title') : 'Rosso';
        const tireName = tire ? tire.textContent!.split('+')[0].trim() : 'Standard';
        const gliderName = glider ? glider.textContent!.split('+')[0].trim() : 'Super Glider';
        // #config-total-price already holds the discounted price.
        const price = parseInt(document.getElementById('config-total-price')!.textContent || '800');
        const pct = Math.max(0, Math.min(100, discount));
        const original = pct > 0 ? Math.round(price / (1 - pct / 100)) : price;

        const kartItem = {
          id: Date.now().toString(),
          driver: driver.name,
          emoji: driver.emoji,
          colorHex: driver.color,
          paintName: paintName,
          paintHue: state.currentPaint.hue,
          tires: tireName,
          glider: gliderName,
          price: price,
          discountPct: pct,
          originalPrice: original,
        };

        state.cart.push(kartItem);
        this.updateCartUI();
        document.getElementById('cart-panel')?.classList.add('open');
      }

      removeItem(itemId: string) {
        audio.playBeep();
        state.cart = state.cart.filter(item => item.id !== itemId);
        this.updateCartUI();
      }

      updateCartUI() {
        const cartCount = document.getElementById('cart-count');
        if (cartCount) cartCount.textContent = state.cart.length.toString();

        if (state.cart.length === 0) {
          this.cartContent.innerHTML = `
            <div class="cart-empty-message">
              <span>🦖</span>
              <p>Il tuo garage è vuoto. Carica un kart dal configuratore!</p>
            </div>
          `;
          document.getElementById('cart-subtotal')!.textContent = `0 🪙`;
          document.getElementById('cart-total')!.textContent = `0 🪙`;
          document.getElementById('checkout-total-price-lbl')!.textContent = `0`;
          this.checkoutBtn.disabled = true;
          const goBtn0 = document.getElementById('btn-go-purchase') as HTMLButtonElement | null;
          if (goBtn0) goBtn0.disabled = true;
          this.renderPurchaseSummary();
          return;
        }

        this.checkoutBtn.disabled = false;
        const goBtn = document.getElementById('btn-go-purchase') as HTMLButtonElement | null;
        if (goBtn) goBtn.disabled = false;

        this.cartContent.innerHTML = state.cart.map(item => `
          <div class="cart-item" style="border-left: 3px solid ${item.colorHex};">
            <div class="cart-item-preview" style="--item-hue: ${item.paintHue}deg">
              <img src="/mariokart_images/c666ac5b9f43715acad54cf192980b63f75c0888.png" alt="Kart">
            </div>
            <div class="cart-item-details">
              <h4>Kart Custom ${item.driver}</h4>
              <p>Telaio: ${item.paintName}</p>
              <p>${item.tires} | ${item.glider}</p>
              <button class="btn-remove-item" onclick="window.removeCartItem('${item.id}')">Rimuovi</button>
            </div>
            <div class="cart-item-price-block">
              ${item.discountPct > 0 ? `<span style="display:block;font-size:0.72rem;color:#2ecc40;font-weight:800;">🎁 -${item.discountPct}%</span><span style="display:block;text-decoration:line-through;opacity:0.6;font-size:0.78rem;">${item.originalPrice} 🪙</span>` : ''}
              <span class="cart-item-price">${item.price} 🪙</span>
            </div>
          </div>
        `).join('');

        const total = state.cart.reduce((sum, item) => sum + item.price, 0);
        document.getElementById('cart-subtotal')!.textContent = `${total} 🪙`;
        document.getElementById('cart-total')!.textContent = `${total} 🪙`;
        document.getElementById('checkout-total-price-lbl')!.textContent = total.toString();
        this.renderPurchaseSummary();
      }

      completeTransaction(method: string) {
        const total = state.cart.reduce((sum, item) => sum + item.price, 0);

        if (state.userCoins < total) {
          alert("Monete d'oro insufficienti!");
          return;
        }

        audio.playCoin();
        state.userCoins -= total;
        document.getElementById('user-coins')!.textContent = state.userCoins.toString();

        const receiptList = document.getElementById('ordered-items-receipt')!;
        receiptList.innerHTML = state.cart.map(item => `
          <div class="receipt-item">
            <span>${item.emoji} Kart Custom ${item.driver}</span>
            <strong>${item.price} 🪙</strong>
          </div>
        `).join('') + `
          <div class="receipt-item" style="border-top: 1px dashed rgba(255,255,255,0.15); margin-top: 6px; padding-top: 6px; font-weight: 700; font-size: 0.9rem;">
            <span>Totale Pagato (${method}):</span>
            <strong style="color: #ffaa00;">${total} 🪙</strong>
          </div>
        `;

        const dateEl = document.getElementById('receipt-date');
        if (dateEl) {
          const d = new Date();
          dateEl.textContent = `Data: ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ore ${d.getHours()}:${d.getMinutes()}`;
        }

        const pp = document.getElementById('purchase-page');
        if (pp) pp.style.display = 'none';
        document.getElementById('checkout-modal')?.classList.add('open');
        this.paymentForm.reset();
        state.cart = [];
        this.updateCartUI();
        // End of purchase -> stop the background music.
        onPurchaseComplete?.();
      }
    }

    // 3D Mascot Viewer
    class MascotViewer {
      container: HTMLElement;
      scene: THREE.Scene | null = null;
      camera: THREE.PerspectiveCamera | null = null;
      renderer: THREE.WebGLRenderer | null = null;
      group: THREE.Group | null = null;
      loader = new GLTFLoader();
      destroyed = false;

      constructor() {
        this.container = document.getElementById('mascot-canvas-container')!;
        this.init();
      }

      init() {
        const W = 130, H = 160;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
        this.camera.position.set(0, 0.5, 3.5);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(W, H);

        this.container.appendChild(this.renderer.domElement);

        this.scene.add(new THREE.AmbientLight(0xffffff, 1.4));
        const sun = new THREE.DirectionalLight(0xffffff, 1.8);
        sun.position.set(2, 4, 4);
        this.scene.add(sun);

        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.loader.load(
          '/mascotte.glb',
          (gltf) => {
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const scale = 2.0 / Math.max(size.x, size.y, size.z);
            model.scale.setScalar(scale);
            const box2 = new THREE.Box3().setFromObject(model);
            const center = box2.getCenter(new THREE.Vector3());
            model.position.sub(center);
            this.group!.add(model);

            const bubble = document.getElementById('mascot-bubble');
            if (bubble) bubble.textContent = 'Ciao! Scegli il colore del tuo kart! 🏎️';
          },
          undefined,
          (err) => {
            console.error('Errore mascotte GLB:', err);
            const canvasContainer = document.getElementById('mascot-canvas-container');
            if (canvasContainer) { canvasContainer.style.display = 'none'; }
            const widget = document.getElementById('mascot-widget');
            if (widget) {
              const fallback = document.createElement('div');
              fallback.style.cssText = 'font-size:90px;line-height:1;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.3))';
              fallback.textContent = '🍄';
              widget.appendChild(fallback);
            }
          }
        );

        this.animate();
      }

      animate() {
        if (this.destroyed) return;
        requestAnimationFrame(() => this.animate());
        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
      }

      destroy() {
        this.destroyed = true;
        if (this.renderer) {
          this.renderer.dispose();
          if (this.renderer.domElement && this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
          }
        }
      }
    }

    const MASCOT_MESSAGES = [
      'Ciao! Scegli il colore del tuo kart! 🏎️',
      'Ruota il kart trascinandolo! ↔️',
      'Usa i bottoni per colorare il kart! 🎨',
    ];

    function initMascot() {
      const bubble = document.getElementById('mascot-bubble');
      if (!bubble) return;
      let idx = 0;
      mascotIntervalRef.current = setInterval(() => {
        idx = (idx + 1) % MASCOT_MESSAGES.length;
        bubble.style.opacity = '0';
        setTimeout(() => {
          const span = document.getElementById('mascot-text');
          if (span) span.textContent = MASCOT_MESSAGES[idx];
          bubble.style.opacity = '1';
        }, 300);
      }, 4000);

      document.querySelectorAll('.inline-swatch').forEach(sw => {
        sw.addEventListener('click', () => {
          const span = document.getElementById('mascot-text');
          if (span && bubble) {
            bubble.style.opacity = '0';
            setTimeout(() => {
              span.textContent = 'Ottima scelta! 🔥';
              bubble.style.opacity = '1';
            }, 300);
          }
        });
      });
    }

    // Render a small 3D thumbnail of a kart GLB into an <img> (so the model
    // selector shows real miniatures of each kart).
    function renderKartThumbnail(url: string, imgId: string) {
      const W = 220, H = 165;
      const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      r.setSize(W, H);
      r.setPixelRatio(2);
      r.toneMapping = THREE.ACESFilmicToneMapping;
      r.toneMappingExposure = 1.25;
      const sc = new THREE.Scene();
      const cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 100);
      sc.add(new THREE.AmbientLight(0xffffff, 1.0));
      const d1 = new THREE.DirectionalLight(0xffffff, 1.6); d1.position.set(5, 10, 8); sc.add(d1);
      const d2 = new THREE.DirectionalLight(0xffffff, 0.6); d2.position.set(-6, 5, -6); sc.add(d2);
      new GLTFLoader().load(url, (gltf) => {
        const m = gltf.scene;
        const box = new THREE.Box3().setFromObject(m);
        const size = box.getSize(new THREE.Vector3());
        const footprint = Math.hypot(size.x, size.z) || 1;
        m.scale.setScalar(2.66 / footprint);
        const box2 = new THREE.Box3().setFromObject(m);
        m.position.sub(box2.getCenter(new THREE.Vector3()));
        m.rotation.y = -Math.PI / 5;
        sc.add(m);
        cam.position.set(0, 1.1, 5.2);
        cam.lookAt(0, 0, 0);
        r.render(sc, cam);
        const img = document.getElementById(imgId) as HTMLImageElement | null;
        if (img) img.src = r.domElement.toDataURL('image/png');
        r.dispose();
      }, undefined, () => r.dispose());
    }

    // Instantiation
    const spinnerInstance = new KartSpinner();
    glbSpinnerRef.current = spinnerInstance;

    const cartInstance = new CartManager();
    (window as any).removeCartItem = (id: string) => {
      cartInstance.removeItem(id);
    };

    // Compute the price (incl. the Test Drive discount) and update the UI
    // BEFORE any auto-add, so the discounted price is what gets added.
    updateConfigStats();
    setupUIEventListeners();

    // Coming back from a completed Test Drive lap: automatically add the
    // configured kart to the cart and go STRAIGHT to the purchase page.
    if (autoAddToCart) {
      cartInstance.addItem();
      onAutoAddHandled?.();
      document.getElementById('cart-panel')?.classList.remove('open');
      cartInstance.renderPurchaseSummary();
      const pp = document.getElementById('purchase-page');
      if (pp) pp.style.display = 'block';
    }

    // Build the kart selector thumbnails.
    renderKartThumbnail('/mariokartcar.glb', 'kart-thumb-mario');
    renderKartThumbnail('/eggstandard.glb', 'kart-thumb-egg');
    renderKartThumbnail('/fulmine.glb', 'kart-thumb-fulmine');

    return () => {
      if (glbSpinnerRef.current) glbSpinnerRef.current.destroy();
      if (mascotViewerRef.current) mascotViewerRef.current.destroy();
      if (mascotIntervalRef.current) clearInterval(mascotIntervalRef.current);
      delete (window as any).removeCartItem;
    };
  }, []);

  return (
    <div className="stage-layer">
      {/* HEADER LOGOS */}
      <header className="stage-header">
        <div className="header-nintendo">
          <img src="/Nintendologo.png" alt="Nintendo" className="nintendo-header-logo" />
        </div>
        
        <div className="header-right-group">
          <button 
            onClick={onBackToMenu}
            className="btn-garage-toggle" 
            style={{ marginRight: '1rem', background: '#333', color: 'white' }}
          >
            ← HOME
          </button>

          <div className="coins-display" title="Monete d'oro">
            <span>🪙</span>
            <span id="user-coins">9999</span>
          </div>
          
          <button id="btn-open-garage" className="btn-garage-toggle">
            🛒 GARAGE (<span id="cart-count">0</span>)
          </button>
          
          <div className="header-m-logo">
            <svg viewBox="0 0 100 80" width="45" height="35" fill="white">
              <path d="M12 70V10h16l22 36 22-36h16v60H74V32L54 64H46L26 32v38H12z" />
            </svg>
          </div>
        </div>
      </header>

      {/* CENTER PRODUCT INTERACTIVE ZONE */}
      <div className="center-product-zone">
        <div className="kart-viewer-box" id="kart-spinner-container">
          <div id="glb-loader-spinner" className="glb-loader">
            <span className="spinner-icon">🏎️</span>
            <p>Caricamento modello 3D...</p>
          </div>
        </div>

      </div>

      {/* BELOW PRODUCT CONTROLS */}
      <div className="bottom-controls-zone">
        <div className="arrows-row">
          <button id="spin-left" className="yellow-arrow-btn" title="Ruota a Sinistra">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M15 19l-7-7 7-7" stroke="#E52521" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </button>
          <button id="spin-right" className="yellow-arrow-btn" title="Ruota a Destra">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M9 5l7 7-7 7" stroke="#E52521" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </button>
        </div>

        <button id="btn-open-customizer" className="text-config-trigger">
          configura il tuo kart
        </button>

        {/* KART MODEL THUMBNAILS */}
        <div className="kart-thumbs" style={{ display: 'flex', gap: '12px', justifyContent: 'center', margin: '4px 0 10px' }}>
          <button
            className="kart-thumb-btn active"
            data-kart="/mariokartcar.glb"
            title="Kart Standard"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              padding: '4px 8px', borderRadius: '12px', cursor: 'pointer',
              border: '3px solid #1a1a1a', background: '#FFD500', boxShadow: '0 3px 0 #1a1a1a',
            }}
          >
            <img id="kart-thumb-mario" alt="Kart Standard" style={{ width: '52px', height: '40px', objectFit: 'contain', display: 'block' }} />
            <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.7rem', color: '#1a1a1a' }}>Standard</span>
          </button>
          <button
            className="kart-thumb-btn"
            data-kart="/eggstandard.glb"
            title="Kart Egg Standard"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              padding: '4px 8px', borderRadius: '12px', cursor: 'pointer',
              border: '3px solid #1a1a1a', background: '#ffffff', boxShadow: '0 3px 0 #1a1a1a',
            }}
          >
            <img id="kart-thumb-egg" alt="Kart Egg Standard" style={{ width: '52px', height: '40px', objectFit: 'contain', display: 'block' }} />
            <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.7rem', color: '#1a1a1a' }}>Egg Standard</span>
          </button>
          <button
            className="kart-thumb-btn"
            data-kart="/fulmine.glb"
            title="Kart Fulmine"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              padding: '4px 8px', borderRadius: '12px', cursor: 'pointer',
              border: '3px solid #1a1a1a', background: '#ffffff', boxShadow: '0 3px 0 #1a1a1a',
            }}
          >
            <img id="kart-thumb-fulmine" alt="Kart Fulmine" style={{ width: '52px', height: '40px', objectFit: 'contain', display: 'block' }} />
            <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.7rem', color: '#1a1a1a' }}>Fulmine</span>
          </button>
        </div>

        {/* TEST DRIVE DISCOUNT BADGE */}
        <div
          id="td-discount-badge"
          style={{
            display: 'none', margin: '0 auto 8px', maxWidth: 'fit-content',
            background: '#2ecc40', color: '#06210b', fontFamily: "'Outfit', sans-serif",
            fontWeight: 800, fontSize: '0.8rem', padding: '6px 14px', borderRadius: '999px',
            border: '2px solid #1a1a1a',
          }}
        ></div>

        {/* INLINE CUSTOMIZER PANEL */}
        <div className="inline-customizer">
          <button
            className="inline-swatch active"
            data-hex="original"
            data-color-hue="0"
            title="Colore originale"
            style={{
              background: 'linear-gradient(45deg, transparent calc(50% - 1.5px), #777 calc(50% - 1.5px), #777 calc(50% + 1.5px), transparent calc(50% + 1.5px)), #ffffff',
              border: '2px solid #888',
            }}
          ></button>
          <button className="inline-swatch" data-hex="#3498DB" data-color-hue="220" style={{ background: '#3498DB' }} title="Blu"></button>
          <button className="inline-swatch" data-hex="#9B59B6" data-color-hue="280" style={{ background: '#9B59B6' }} title="Viola"></button>
          
          <button id="btn-inline-add-to-cart" className="inline-add-btn" style={{ marginLeft: '1rem' }}>
            AGGIUNGI AL CARRELLO 🛒
          </button>
        </div>
      </div>

      {/* TEST DRIVE BUTTON */}
      <button
        onClick={() => {
          const color = glbSpinnerRef.current?.currentColor || '#E52521';
          const kartUrl = glbSpinnerRef.current?.kartUrl || '/mariokartcar.glb';
          onTestDrive?.(color, kartUrl);
        }}
        className="test-drive-btn"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 20,
          background: '#FFD500',
          color: '#1a1a1a',
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 800,
          fontSize: '1rem',
          border: '3px solid #1a1a1a',
          borderRadius: '999px',
          padding: '14px 28px',
          boxShadow: '0 4px 0 #1a1a1a',
          cursor: 'pointer',
        }}
      >
        🏁 TEST DRIVE
      </button>

      {/* SLIDING OVERLAY DRAWER */}
      <div id="customizer-drawer" className="customizer-drawer">
        <div className="drawer-header">
          <h2>CONFIGURAZIONE PERSONALIZZATA</h2>
          <button id="btn-close-drawer" className="btn-drawer-close">✕</button>
        </div>

        <div className="drawer-scroll-content">
          {/* STEP 1: CHOOSE DRIVER */}
          <div className="drawer-group">
            <h3 className="drawer-section-title">01 / SCEGLI IL PILOTA</h3>
            <div className="drawer-options-row">
              <button className="choice-avatar active" data-driver="mario" style={{ ['--driver-color' as any]: '#E52521' }} title="Mario">🔴</button>
              <button className="choice-avatar" data-driver="luigi" style={{ ['--driver-color' as any]: '#46B31D' }} title="Luigi">🟢</button>
              <button className="choice-avatar" data-driver="peach" style={{ ['--driver-color' as any]: '#F9A7B6' }} title="Peach">💖</button>
              <button className="choice-avatar" data-driver="bowser" style={{ ['--driver-color' as any]: '#F39C12' }} title="Bowser">🐢</button>
              <button className="choice-avatar" data-driver="yoshi" style={{ ['--driver-color' as any]: '#9DE02A' }} title="Yoshi">🦕</button>
              <button className="choice-avatar" data-driver="toad" style={{ ['--driver-color' as any]: '#0093E9' }} title="Toad">🍄</button>
            </div>
            <p id="selected-driver-label" className="choice-active-label">Pilota Attivo: MARIO</p>
          </div>

          {/* STEP 3: TIRES */}
          <div className="drawer-group">
            <h3 className="drawer-section-title">03 / PNEUMATICI</h3>
            <div className="chips-list">
              <button className="chip-btn active" data-part-type="tire" data-part-id="standard" data-mod-speed="0" data-mod-accel="0" data-mod-weight="0" data-mod-handle="0" data-mod-traction="0">
                <span className="chip-icon">🛞</span> Standard <span className="chip-price">+ 0 🪙</span>
              </button>
              <button className="chip-btn" data-part-type="tire" data-part-id="slick" data-mod-speed="2" data-mod-accel="-1" data-mod-weight="1" data-mod-handle="1" data-mod-traction="-2">
                <span className="chip-icon">🏎️</span> Slick Racing <span className="chip-price">+ 150 🪙</span>
              </button>
              <button className="chip-btn" data-part-type="tire" data-part-id="monster" data-mod-speed="-1" data-mod-accel="1" data-mod-weight="2" data-mod-handle="-2" data-mod-traction="3">
                <span className="chip-icon">🚜</span> Monster Fuoristrada <span className="chip-price">+ 200 🪙</span>
              </button>
            </div>
          </div>

          {/* STEP 4: GLIDER */}
          <div className="drawer-group">
            <h3 className="drawer-section-title">04 / DELTAPLANO</h3>
            <div className="chips-list">
              <button className="chip-btn active" data-part-type="glider" data-part-id="super" data-mod-speed="0" data-mod-accel="0" data-mod-weight="0" data-mod-handle="0" data-mod-traction="0">
                <span className="chip-icon">🪂</span> Super Glider <span className="chip-price">+ 0 🪙</span>
              </button>
              <button className="chip-btn" data-part-type="glider" data-part-id="parasol" data-mod-speed="-1" data-mod-accel="2" data-mod-weight="-1" data-mod-handle="1" data-mod-traction="0">
                <span className="chip-icon">⛱️</span> Ombrello Peach <span className="chip-price">+ 120 🪙</span>
              </button>
              <button className="chip-btn" data-part-type="glider" data-part-id="cloud" data-mod-speed="-1" data-mod-accel="3" data-mod-weight="-2" data-mod-handle="2" data-mod-traction="-1">
                <span className="chip-icon">☁️</span> Nuvola Soft <span className="chip-price">+ 180 🪙</span>
              </button>
            </div>
          </div>

          {/* PERFORMANCE STATS */}
          <div className="drawer-stats-box">
            <div className="drawer-stat-row">
              <span className="d-stat-label">VELOCITÀ</span>
              <div className="d-progress-track">
                <div id="bar-speed" className="d-progress-fill speed-color"></div>
              </div>
              <span id="val-speed" className="d-stat-value">3/5</span>
            </div>
            <div className="drawer-stat-row">
              <span className="d-stat-label">ACCELERAZIONE</span>
              <div className="d-progress-track">
                <div id="bar-accel" className="d-progress-fill accel-color"></div>
              </div>
              <span id="val-accel" className="d-stat-value">3/5</span>
            </div>
            <div className="drawer-stat-row">
              <span className="d-stat-label">MANEGGEVOLEZZA</span>
              <div className="d-progress-track">
                <div id="bar-handle" className="d-progress-fill handle-color"></div>
              </div>
              <span id="val-handle" className="d-stat-value">3/5</span>
            </div>
            <div className="drawer-stat-row">
              <span className="d-stat-label">ADERENZA</span>
              <div className="d-progress-track">
                <div id="bar-traction" className="d-progress-fill traction-color"></div>
              </div>
              <span id="val-traction" className="d-stat-value">3/5</span>
            </div>
          </div>
        </div>

        <div className="drawer-footer">
          <div className="drawer-price-info">
            <span className="d-price-lbl">TOTALE KART</span>
            <span className="d-price-val"><span id="config-total-price">800</span> 🪙</span>
          </div>
          <button id="btn-add-to-cart" className="btn-drawer-add">
            AGGIUNGI AL CARRELLO 🛒
          </button>
        </div>
      </div>

      {/* SLIDING OVERLAY CARRELLO DRAWER */}
      <div id="cart-panel" className="cart-slideout">
        <div className="cart-slideout-header">
          <h2>IL TUO GARAGE</h2>
          <button id="cart-close" className="btn-close-cart">✕</button>
        </div>

        <div id="cart-content" className="cart-items-container">
          <div className="cart-empty-message">
            <span>🦖</span>
            <p>Il tuo garage è vuoto. Carica un kart dal configuratore!</p>
          </div>
        </div>

        <div className="cart-footer">
          <div className="cart-totals">
            <div className="total-row">
              <span>Subtotale:</span>
              <span id="cart-subtotal">0 🪙</span>
            </div>
            <div className="total-row grand-total">
              <span>Totale Ordine:</span>
              <span id="cart-total">0 🪙</span>
            </div>
          </div>

          <button id="btn-go-purchase" className="btn-checkout-complete">
            ACQUISTA 🛒
          </button>
        </div>
      </div>

      {/* PAGINA ACQUISTO (full screen) */}
      <div id="purchase-page" style={{ position: 'fixed', inset: 0, zIndex: 60, background: '#15151a', display: 'none', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1140px', margin: '0 auto', padding: '24px 20px 60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, color: '#fff', margin: 0, fontSize: '1.8rem', textShadow: '0 3px 0 rgba(0,0,0,0.35)' }}>🛒 ACQUISTA</h2>
            <button id="btn-purchase-back" style={{ background: '#FFD500', color: '#1a1a1a', border: '3px solid #1a1a1a', borderRadius: '999px', padding: '8px 16px', fontWeight: 900, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: '0 4px 0 #1a1a1a' }}>← Carrello</button>
          </div>

          <div className="pp-cols">
          <div className="pp-card pp-col-summary">
            <h3 className="payment-title">RIEPILOGO ORDINE</h3>
            <div id="purchase-items" style={{ margin: '10px 0 4px' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1a1a1a', fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.2rem', borderTop: '2px dashed #1a1a1a', paddingTop: '12px', marginTop: '8px' }}>
              <span>Totale</span>
              <span id="purchase-total" style={{ color: '#d62828' }}>0 🪙</span>
            </div>
          </div>

          <div className="payment-options-section pp-card pp-col-pay">
            <h3 className="payment-title">METODO DI PAGAMENTO</h3>
            
            <div className="quick-pay-buttons">
              <button className="btn-quick-pay paypal" id="pay-paypal">
                <span>Pay</span><span>Pal</span>
              </button>
              <button className="btn-quick-pay apple-pay" id="pay-apple">
                 Pay
              </button>
              <button className="btn-quick-pay google-pay" id="pay-google">
                Google Pay
              </button>
            </div>

            <div className="payment-divider">
              <span>oppure paga con Carta di Credito</span>
            </div>

            <form id="payment-form" className="credit-card-form">
              <div className="form-group">
                <label htmlFor="cc-name">Titolare della Carta</label>
                <input type="text" id="cc-name" placeholder="Mario Rossi" required />
              </div>
              <div className="form-group">
                <label htmlFor="cc-num">Numero Carta</label>
                <input type="text" id="cc-num" placeholder="4000 1234 5678 9010" maxLength={19} required />
              </div>
              <div className="form-row">
                <div className="form-group half">
                  <label htmlFor="cc-exp">Scadenza</label>
                  <input type="text" id="cc-exp" placeholder="MM/AA" maxLength={5} required />
                </div>
                <div className="form-group half">
                  <label htmlFor="cc-cvv">CVV</label>
                  <input type="text" id="cc-cvv" placeholder="123" maxLength={3} required />
                </div>
              </div>

              <h3 className="payment-title" style={{ marginTop: '1rem' }}>INDIRIZZO DI FATTURAZIONE</h3>
              <div className="form-group">
                <label htmlFor="bill-address">Indirizzo</label>
                <input type="text" id="bill-address" placeholder="Via dei Funghi, 64" required />
              </div>
              <div className="form-row">
                <div className="form-group half">
                  <label htmlFor="bill-city">Città</label>
                  <input type="text" id="bill-city" placeholder="Castello di Peach" required />
                </div>
                <div className="form-group half">
                  <label htmlFor="bill-zip">CAP</label>
                  <input type="text" id="bill-zip" placeholder="00064" maxLength={5} required />
                </div>
              </div>

              <button type="submit" id="btn-checkout-trigger" className="btn-checkout-complete">
                COMPLETA L'ORDINE (🪙 <span id="checkout-total-price-lbl">0</span>)
              </button>
            </form>
          </div>
          </div>
        </div>
      </div>

      {/* PAYMENT SUCCESS RECEIPT MODAL */}
      <div id="checkout-modal" className="modal-overlay">
        <div className="modal-box">
          <div id="success-screen" className="success-screen">
            <div className="win-confetti" aria-hidden="true">
              <span></span><span></span><span></span><span></span><span></span>
              <span></span><span></span><span></span><span></span><span></span>
              <span></span><span></span><span></span><span></span><span></span><span></span>
            </div>
            <div className="win-badge">
              <span className="win-flag win-flag-l">🏁</span>
              <span className="win-trophy">🏆</span>
              <span className="win-flag win-flag-r">🏁</span>
            </div>
            <h2>1° POSTO!</h2>
            <p className="win-sub">Acquisto completato — i tuoi kart sono pronti a sfrecciare! 🏎️💨</p>

            <div className="receipt-receipt-box">
              <div className="receipt-header">
                <h3>REGNO DEI FUNGHI GP</h3>
                <p>Ricevuta Ufficiale Ordine</p>
                <p id="receipt-date">Data: 29/05/2026</p>
              </div>
              <div id="ordered-items-receipt" className="receipt-items">
                {/* Populated via Javascript */}
              </div>
              <div className="receipt-footer">
                <p>Grazie per aver acquistato su Mario Kart Shop!</p>
                <p className="receipt-id">ID Transazione: MK-99238-GP</p>
              </div>
            </div>

            <button id="btn-close-victory" className="btn-modal-close">
              TORNA AL CONFIGURATORE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
