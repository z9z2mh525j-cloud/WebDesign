import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface TestDriveProps {
  kartColor: string;
  kartUrl?: string;
  onExit: () => void;
  onLapComplete?: () => void;
  onDiscountChange?: (discountPct: number) => void;
}

export function TestDrive({ kartColor, kartUrl = '/mariokartcar.glb', onExit, onLapComplete, onDiscountChange }: TestDriveProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showTutorial, setShowTutorial] = useState(true);
  const tutBadge = {
    flex: '0 0 auto', minWidth: 64, textAlign: 'center' as const, fontWeight: 900,
    fontSize: '0.98rem', padding: '8px 10px', background: '#FFD500',
    border: '2px solid #1a1a1a', borderRadius: 10, boxShadow: '0 3px 0 #1a1a1a',
  };

  useEffect(() => {
    const container = containerRef.current!;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 120, 900);

    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 12000);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(0xffffee, 2.2);
    sun.position.set(50, 100, 20);
    sun.castShadow = true;
    scene.add(sun);

    const loader = new GLTFLoader();
    let carModel: THREE.Object3D | null = null;
    let trackModel: THREE.Object3D | null = null;
    const spawnPoint = new THREE.Vector3(0, 0.2, 0);
    // Initial facing of the kart at the start/finish line (radians about Y).
    let spawnYaw = 0;
    let spawnYawApplied = false;
    // The finish line where a lap is completed. Defaults to the start point,
    // but the player can set a custom one by pressing "T".
    const finishPoint = new THREE.Vector3(0, 0.2, 0);
    let finishPointSet = false;
    try {
      const rawF = localStorage.getItem('td_finish_v1');
      if (rawF) {
        const f = JSON.parse(rawF);
        if (typeof f.x === 'number' && typeof f.z === 'number') {
          finishPoint.set(f.x, f.y ?? 0.2, f.z);
          finishPointSet = true;
        }
      }
    } catch { /* ignore */ }

    // Discount crates ("cubo"): hitting one with the kart gives -10% (two
    // crates on the track => up to -20% accumulated).
    const cubes: { obj: THREE.Object3D; collected: boolean }[] = [];
    let cubesCollected = 0;
    const CUBE_HIT_RADIUS = 3.5;

    // Lap progress is measured by the angle the kart sweeps around the circuit
    // centre (0 at the start, a full 2*PI when it has gone all the way round).
    const loopCenter = new THREE.Vector3();
    let lapAnglePrev = 0;
    let lapAngleAccum = 0;
    let lapAngleInit = false;
    let maxDistFromStart = 0;
    // The kart's scaled max dimension (set when the kart loads); crates are
    // made 10% smaller than this.
    let kartRefMaxDim = 4.2;

    // Only meshes whose material is the gray asphalt road surface count as
    // "driveable", so the kart can only drive on the gray road (not the sand,
    // grass, curbs or scenery). In pistanuova.glb the gray asphalt is
    // `material_18` (a gray ~#5a5755 road-strip texture).
    const driveableSurfaces: THREE.Object3D[] = [];
    const DRIVEABLE_MATERIALS = new Set([
      'material_18',
    ]);
    function isDriveableMaterial(matName: string | undefined) {
      if (!matName) return false;
      return DRIVEABLE_MATERIALS.has(matName);
    }

    // The start/finish gantry (the "MARIO KART" banner arch). The kart spawns
    // on the road directly under it. `material_11` is the high banner sign.
    const gantryMeshes: THREE.Object3D[] = [];
    const GANTRY_MATERIALS = new Set(['material_11']);

    // Cast a ray straight down from high above (x, z) to find the height
    // of the track surface there, so the car spawns sitting on the road
    // instead of floating or being buried inside the geometry.
    function findGroundY(model: THREE.Object3D | THREE.Object3D[], x: number, z: number, fromY: number) {
      const raycaster = new THREE.Raycaster();
      raycaster.set(new THREE.Vector3(x, fromY, z), new THREE.Vector3(0, -1, 0));
      raycaster.far = fromY + 1000;
      const hits = Array.isArray(model)
        ? raycaster.intersectObjects(model, true)
        : raycaster.intersectObject(model, true);
      // Skip hits on the underside of the (double-sided) road mesh - only
      // an upward-facing surface is a valid place to spawn the car.
      for (const hit of hits) {
        if (!hit.face) return hit.point.y;
        const n = hit.face.normal.clone()
          .transformDirection(hit.object.matrixWorld)
          .normalize();
        if (n.y > 0.3) return hit.point.y;
      }
      return null;
    }

    // Find the heading (yaw about Y) that points *down the road* from a given
    // point: sample the road in a ring of directions and pick the one where
    // the road continues farthest (the track tangent), so the kart faces along
    // the road, not across it.
    function findRoadHeading(
      surfaces: THREE.Object3D | THREE.Object3D[],
      from: THREE.Vector3,
      fromY: number,
    ) {
      let bestAngle = 0;
      let bestRun = -1;
      for (let deg = 0; deg < 360; deg += 10) {
        const a = (deg * Math.PI) / 180;
        const dx = Math.sin(a);
        const dz = Math.cos(a);
        let run = 0;
        for (let d = 1; d <= 40; d += 1) {
          const y = findGroundY(surfaces, from.x + dx * d, from.z + dz * d, fromY + 40);
          if (y === null) break;
          run = d;
        }
        if (run > bestRun) {
          bestRun = run;
          bestAngle = a;
        }
      }
      // forward = (sin(yaw), 0, cos(yaw)); the kart's local +Z faces this way.
      return bestAngle;
    }

    // Recolor a body texture: paint the coloured pixels (the panel) with the
    // chosen colour while keeping near-white/grey pixels (logos like the "M",
    // details) intact.
    function recolorTexture(srcTex: any, hex: string) {
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
            const br = mx / 255;
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

    // Load track
    loader.load(
      '/pistanuova.glb',
      (gltf) => {
        trackModel = gltf.scene;

        // Collect the road (driveable) and gantry meshes and set up materials,
        // before scaling, so we can scale by the road size.
        trackModel.traverse((child) => {
          const mesh = child as any;
          if (mesh.isMesh) {
            mesh.receiveShadow = true;
            mesh.castShadow = false;
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach((mat: any) => {
              if (mat) mat.side = THREE.DoubleSide;
            });
            if (materials.some((mat: any) => isDriveableMaterial(mat && mat.name))) {
              driveableSurfaces.push(mesh);
            }
            if (materials.some((mat: any) => mat && GANTRY_MATERIALS.has(mat.name))) {
              gantryMeshes.push(mesh);
            }
          }
        });

        scene.add(trackModel);
        trackModel.updateMatrixWorld(true);

        // Scale by the *road* size, not the whole model: this model contains a
        // giant skybox/backdrop that would otherwise shrink the drivable road
        // to almost nothing. Target a road ~200 units across so the circuit is
        // big enough to drive and complete a lap.
        const roadBoxRaw = new THREE.Box3();
        driveableSurfaces.forEach((m) => roadBoxRaw.expandByObject(m));
        if (driveableSurfaces.length === 0) roadBoxRaw.setFromObject(trackModel);
        const roadSizeRaw = roadBoxRaw.getSize(new THREE.Vector3());
        const roadMaxRaw = Math.max(roadSizeRaw.x, roadSizeRaw.z) || 1;
        const scale = 200 / roadMaxRaw;
        trackModel.scale.setScalar(scale);
        trackModel.updateMatrixWorld(true);

        // Center the scaled road on x=0/z=0 and rest it near y=0.
        const roadBox = new THREE.Box3();
        driveableSurfaces.forEach((m) => roadBox.expandByObject(m));
        if (driveableSurfaces.length === 0) roadBox.setFromObject(trackModel);
        const roadCenter = roadBox.getCenter(new THREE.Vector3());
        trackModel.position.x -= roadCenter.x;
        trackModel.position.z -= roadCenter.z;
        trackModel.position.y -= roadBox.min.y;
        trackModel.updateMatrixWorld(true);

        // Road bounding box in final (scaled, centered) coordinates.
        const roadBox2 = new THREE.Box3();
        driveableSurfaces.forEach((m) => roadBox2.expandByObject(m));
        if (driveableSurfaces.length === 0) roadBox2.setFromObject(trackModel);
        const roadSize2 = roadBox2.getSize(new THREE.Vector3());
        // Center of the circuit loop - used to measure lap progress by the
        // angle the kart sweeps around it.
        loopCenter.copy(roadBox2.getCenter(new THREE.Vector3()));

        const surfacesForSpawn = driveableSurfaces.length > 0 ? driveableSurfaces : trackModel;
        // Cast spawn rays from well above the whole (scaled) model.
        const fromY = new THREE.Box3().setFromObject(trackModel).max.y + 50;

        let groundY: number | null = null;
        let spawnX = 0;
        let spawnZ = 0;
        // The nearest solid-asphalt point (used to read the road height and to
        // compute the heading); the kart itself is placed on the start line.
        let asphaltX = 0;
        let asphaltZ = 0;
        let spawnReady = false;
        let spawnFromSaved = false;

        // FIXED START: always spawn on the start/finish line, on the straight
        // under the "MARIO KART" banner, facing the banner. This takes priority
        // over everything (including any old "P" point saved in the browser), so
        // the kart is guaranteed to start here. These are final (post-grounding)
        // kart coordinates, used directly without the grounding offset.
        spawnPoint.set(-92.4, 0.3, -8.7);
        spawnYaw = -3.13; // muso rivolto verso il traguardo/striscione
        spawnReady = true;
        spawnFromSaved = true;

        // 1) Preferred: spawn ON the start/finish line, under the gantry. The
        // painted line is a hole in the road mesh, so we read the road height
        // from the nearest solid asphalt but place the kart at the gantry's
        // center (i.e. exactly on the line).
        if (!spawnReady && gantryMeshes.length > 0) {
          const gBox = new THREE.Box3();
          gantryMeshes.forEach((m) => gBox.expandByObject(m));
          const gCenter = gBox.getCenter(new THREE.Vector3());
          const r = Math.max(roadSize2.x, roadSize2.z) * 0.12;
          outer:
          for (let ring = 0; ring <= 4; ring++) {
            const rad = (ring / 4) * r;
            const steps = ring === 0 ? 1 : 8;
            for (let s = 0; s < steps; s++) {
              const a = (s / steps) * Math.PI * 2;
              const cx = gCenter.x + Math.cos(a) * rad;
              const cz = gCenter.z + Math.sin(a) * rad;
              const hitY = findGroundY(surfacesForSpawn, cx, cz, fromY);
              if (hitY !== null) {
                groundY = hitY;
                asphaltX = cx; asphaltZ = cz;
                // Place the kart on the actual asphalt hit nearest the gantry
                // (the gantry centre can fall on the dirt/hole, which would put
                // the car off-road), so it always starts sitting on the road.
                spawnX = cx; spawnZ = cz;
                break outer;
              }
            }
          }
        }

        // 2) Fallback: probe a grid across the road for any road point.
        if (!spawnReady && groundY === null) {
          const candidates: [number, number][] = [[0, 0]];
          for (let fx = 0.1; fx <= 0.9; fx += 0.1) {
            for (let fz = 0.1; fz <= 0.9; fz += 0.1) {
              candidates.push([roadBox2.min.x + fx * roadSize2.x, roadBox2.min.z + fz * roadSize2.z]);
            }
          }
          for (const [cx, cz] of candidates) {
            const hitY = findGroundY(surfacesForSpawn, cx, cz, fromY);
            if (hitY !== null) {
              groundY = hitY; spawnX = cx; spawnZ = cz; asphaltX = cx; asphaltZ = cz; break;
            }
          }
        }

        if (!spawnReady && groundY !== null) {
          spawnPoint.set(spawnX, groundY + 0.2, spawnZ);

          // Face the kart along the road. Sample the road from the nearest
          // solid asphalt (the line itself is a hole) and find the tangent (the
          // direction the road continues farthest), so the kart faces down the
          // straight, not across it.
          spawnYaw = findRoadHeading(
            surfacesForSpawn,
            new THREE.Vector3(asphaltX, groundY, asphaltZ),
            fromY,
          );
          spawnReady = true;
        }

        if (spawnReady) {
          if (carModel) {
            if (spawnFromSaved) {
              // Saved position is already a final kart position - use directly.
              carModel.position.copy(spawnPoint);
            } else {
              const groundOffset = (carModel as any).userData.groundOffset || new THREE.Vector3();
              carModel.position.copy(groundOffset).add(spawnPoint);
            }
            carModel.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), spawnYaw);
          }

          const back = new THREE.Vector3(Math.sin(spawnYaw), 0, Math.cos(spawnYaw)).multiplyScalar(-15);
          camera.position.set(spawnPoint.x + back.x, spawnPoint.y + 7, spawnPoint.z + back.z);
          camera.lookAt(spawnPoint.x, spawnPoint.y + 2, spawnPoint.z);
        }

        // By default the lap finishes where it started. (A custom finish line
        // set with "T" - loaded from storage - takes priority.)
        if (!finishPointSet) finishPoint.copy(spawnPoint);

        // Pick two well-separated road spots and put a discount crate on each.
        const roadPts: THREE.Vector3[] = [];
        const N = 16;
        for (let i = 0; i < N; i++) {
          for (let j = 0; j < N; j++) {
            const x = roadBox2.min.x + (i + 0.5) / N * roadSize2.x;
            const z = roadBox2.min.z + (j + 0.5) / N * roadSize2.z;
            const y = findGroundY(surfacesForSpawn, x, z, fromY);
            if (y !== null) roadPts.push(new THREE.Vector3(x, y, z));
          }
        }
        if (roadPts.length > 0) {
          // Spot A: farthest road point from the start.
          let a = roadPts[0], aD = -1;
          for (const p of roadPts) {
            const d = Math.hypot(p.x - spawnPoint.x, p.z - spawnPoint.z);
            if (d > aD) { aD = d; a = p; }
          }
          // Spot B: farthest from A, still away from the start.
          let b = roadPts[0], bD = -1;
          for (const p of roadPts) {
            const dA = Math.hypot(p.x - a.x, p.z - a.z);
            const dS = Math.hypot(p.x - spawnPoint.x, p.z - spawnPoint.z);
            if (dA > bD && dS > 25) { bD = dA; b = p; }
          }
          const cubeSpots = [a, b];

          loader.load('/cubo.glb', (cgltf) => {
            const proto = cgltf.scene;
            const cbox = new THREE.Box3().setFromObject(proto);
            const csize = cbox.getSize(new THREE.Vector3());
            // Clearly smaller than the kart (~0.63x of its size).
            const cScale = (0.63 * kartRefMaxDim) / (Math.max(csize.x, csize.y, csize.z) || 1);
            const halfH = (csize.y * cScale) / 2;
            cubeSpots.forEach((spot) => {
              const c = proto.clone(true);
              c.scale.setScalar(cScale);
              c.position.set(spot.x, spot.y + halfH + 0.5, spot.z);
              c.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; } });
              scene.add(c);
              cubes.push({ obj: c, collected: false });
            });
          }, undefined, (e) => console.error('Errore caricamento cubo:', e));
        }

        const loaderEl = document.getElementById('testdrive-loader');
        if (loaderEl) loaderEl.style.display = 'none';
      },
      undefined,
      (err) => console.error('Errore caricamento pista:', err)
    );

    // Load car
    loader.load(
      kartUrl,
      (gltf) => {
        carModel = gltf.scene;
        const box = new THREE.Box3().setFromObject(carModel);
        const size = box.getSize(new THREE.Vector3());
        // Normalize by the ground footprint (length x width), not the max
        // dimension, so all karts are the same size on track regardless of
        // tall parts (e.g. exhaust pipes).
        const footprint = Math.hypot(size.x, size.z) || 1;
        const scale = 3.71 / footprint;
        carModel.scale.setScalar(scale);
        kartRefMaxDim = Math.max(size.x, size.y, size.z) * scale;

        const box2 = new THREE.Box3().setFromObject(carModel);
        const center = box2.getCenter(new THREE.Vector3());
        carModel.position.x -= center.x;
        carModel.position.z -= center.z;
        carModel.position.y -= box2.min.y;

        carModel.traverse((child) => {
          if ((child as any).isMesh) {
            (child as any).castShadow = true;
            (child as any).receiveShadow = true;
          }
        });

        // 'original' = keep the kart's classic color from the .glb (no tint).
        // Otherwise recolor only the body meshes (wheels excluded), keeping
        // logos like the "M".
        if (kartColor !== 'original') {
          const KNOWN_BODY = new Set(['material_2.029', 'defaultMaterial', 'metal']);
          const matVerts = new Map<any, number>();
          carModel.traverse((child: any) => {
            if (!child.isMesh || !child.geometry) return;
            const pos = child.geometry.getAttribute('position');
            const n = pos ? pos.count : 0;
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m: any) => { if (m) matVerts.set(m, (matVerts.get(m) || 0) + n); });
          });
          let bodyMat: any = null;
          matVerts.forEach((_n, m) => { if (m.name && KNOWN_BODY.has(m.name)) bodyMat = m; });
          if (!bodyMat) {
            let bodyN = -1;
            matVerts.forEach((n, m) => { if (n > bodyN) { bodyN = n; bodyMat = m; } });
          }
          if (bodyMat) {
            const bodyMeshes: any[] = [];
            carModel.traverse((c: any) => {
              if (!c.isMesh) return;
              const mats = Array.isArray(c.material) ? c.material : [c.material];
              if (mats.indexOf(bodyMat) !== -1) bodyMeshes.push(c);
            });
            const freq = new Map<number, number>();
            bodyMeshes.forEach((m) => {
              const n = m.geometry.getAttribute('position')?.count || 0;
              freq.set(n, (freq.get(n) || 0) + 1);
            });
            const recolorMeshes = bodyMeshes.filter((m) => {
              const n = m.geometry.getAttribute('position')?.count || 0;
              return (freq.get(n) || 0) < 4;
            });
            const clone = bodyMat.clone();
            const recolored = bodyMat.map ? recolorTexture(bodyMat.map, kartColor) : null;
            if (recolored) {
              clone.map = recolored;
              clone.color = new THREE.Color(0xffffff);
            } else {
              clone.color = new THREE.Color(kartColor);
              clone.map = null;
            }
            clone.needsUpdate = true;
            recolorMeshes.forEach((m) => { m.material = clone; });
          }
        }

        // carModel.position currently holds the offset needed to center the
        // model on x/z and rest its lowest point on y=0. Preserve that offset
        // and additionally shift the car to the spawn point, instead of
        // overwriting it (which would discard the centering/grounding).
        (carModel as any).userData.groundOffset = carModel.position.clone();
        carModel.position.add(spawnPoint);
        scene.add(carModel);
      },
      undefined,
      (err) => console.error('Errore caricamento kart:', err)
    );

    // Driving state
    const keys: Record<string, boolean> = {
      w: false, a: false, s: false, d: false,
      ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    };
    let speed = 0;
    const acceleration = 0.03;
    const friction = 0.97;
    const maxSpeed = 2.6;
    const turnSpeed = 0.035;

    const keydown = (e: KeyboardEvent) => { if (e.key in keys) keys[e.key] = true; };
    const keyup = (e: KeyboardEvent) => { if (e.key in keys) keys[e.key] = false; };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);

    camera.position.set(0, 6, 12);

    // Yaw (steering) is tracked separately from the car's full orientation,
    // because the full orientation also includes a "tilt" component that
    // aligns the car with the track surface (so it follows ramps/curves of
    // the road instead of floating above it or poking through it).
    let carYaw = 0;
    // The current "up" of the car = the normal of the road surface it is
    // resting on. It is updated every frame as the car drives, so the car
    // follows ramps, banked curves and even steep climbs of the road.
    const carUp = new THREE.Vector3(0, 1, 0);
    const groundClearance = 0.2;
    const groundRay = new THREE.Raycaster();
    const upVector = new THREE.Vector3(0, 1, 0);

    // Press "P" to set the kart's CURRENT spot (and facing) as the start point.
    // It is saved and reused on every future test drive, so the kart always
    // starts from where the player placed it.
    function flashBanner(id: string) {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = 'block';
        window.setTimeout(() => { el.style.display = 'none'; }, 1500);
      }
    }

    const savePoint = (e: KeyboardEvent) => {
      if (!carModel) return;
      // P = set the START point (position + facing). Save the kart's actual
      // world heading (not the raw yaw, which can differ on banked road).
      if (e.key === 'p' || e.key === 'P') {
        const p = carModel.position;
        const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(carModel.quaternion);
        const yaw = Math.atan2(fwd.x, fwd.z);
        try {
          localStorage.setItem('td_spawn_v1', JSON.stringify({ x: p.x, y: p.y, z: p.z, yaw }));
        } catch { /* ignore */ }
        const savedEl = document.getElementById('testdrive-saved');
        if (savedEl) {
          savedEl.innerHTML = '📍 Partenza salvata!<br/>' +
            `x ${p.x.toFixed(1)}  y ${p.y.toFixed(1)}  z ${p.z.toFixed(1)}  yaw ${yaw.toFixed(2)}`;
        }
        flashBanner('testdrive-saved');
      }
      // T = set the FINISH line (where the lap is completed).
      if (e.key === 't' || e.key === 'T') {
        const p = carModel.position;
        try {
          localStorage.setItem('td_finish_v1', JSON.stringify({ x: p.x, y: p.y, z: p.z }));
        } catch { /* ignore */ }
        finishPoint.set(p.x, p.y, p.z);
        finishPointSet = true;
        flashBanner('testdrive-finishset');
      }
    };
    window.addEventListener('keydown', savePoint);

    // Build the car's full orientation from its yaw (steering) and the
    // surface normal it is aligned to (up).
    function orientationFor(up: THREE.Vector3) {
      const tilt = new THREE.Quaternion().setFromUnitVectors(upVector, up);
      const yaw = new THREE.Quaternion().setFromAxisAngle(upVector, carYaw);
      return tilt.multiply(yaw);
    }

    // Lap detection. A full lap = sweeping (nearly) all the way around the
    // circuit and then arriving back within RETURN_RADIUS of the finish line.
    // Only a complete lap adds the kart to the cart.
    const RETURN_RADIUS = 26;
    let lapCompleted = false;

    function triggerFinish() {
      if (lapCompleted) return;
      lapCompleted = true;
      const finishEl = document.getElementById('testdrive-finish');
      if (finishEl) finishEl.style.display = 'flex';
      // Give the player a moment to see the finish banner, then hand off to
      // the configurator which auto-adds the kart to the cart.
      window.setTimeout(() => onLapComplete?.(), 1600);
    }

    function updatePhysics() {
      if (!carModel) return;

      // Apply the start/finish-line facing once, the first frame after the
      // kart has been placed at the spawn.
      if (!spawnYawApplied) {
        carYaw = spawnYaw;
        spawnYawApplied = true;
      }

      if (keys.w || keys.ArrowUp) speed += acceleration;
      if (keys.s || keys.ArrowDown) speed -= acceleration;

      // Steering. When moving forward/stationary, A/D turn normally; when
      // reversing, steering is inverted (like a real vehicle). Turning is
      // allowed even at a standstill so the player can rotate the kart in
      // place to turn around (e.g. at the end of the track) and drive back to
      // the start to complete the lap. In-place turns are a bit slower.
      const steerDir = speed < -0.01 ? -1 : 1;
      const steerScale = Math.abs(speed) > 0.01 ? 1 : 0.6;
      if (keys.a || keys.ArrowLeft) carYaw += turnSpeed * steerDir * steerScale;
      if (keys.d || keys.ArrowRight) carYaw -= turnSpeed * steerDir * steerScale;

      speed *= friction;
      speed = Math.max(Math.min(speed, maxSpeed), -maxSpeed / 2);

      const surfaces = driveableSurfaces.length > 0 ? driveableSurfaces : (trackModel ? [trackModel] : []);
      const prevPosition = carModel.position.clone();

      // The car's forward direction lies in the plane of the road surface it
      // is currently on (because the car is tilted to match the surface).
      // Moving along this tangent keeps the car hugging the road even on
      // ramps, banked curves and loops, instead of flying off horizontally.
      const orientation = orientationFor(carUp);
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(orientation).normalize();
      const tentative = prevPosition.clone().addScaledVector(forward, speed);

      // Probe 1 - "snap to surface": shoot a short ray from just above the
      // tentative position, straight down along the *current* up direction.
      // Because we moved along the surface tangent, the road is always very
      // close, so this reliably re-attaches the car to flat ground, gentle
      // slopes, banked curves and the continuation of a ramp/loop.
      function probeSurface(origin: THREE.Vector3, dir: THREE.Vector3, far: number, requireUpish: boolean) {
        groundRay.set(origin, dir);
        groundRay.near = 0;
        groundRay.far = far;
        const hits = surfaces.length > 0 ? groundRay.intersectObjects(surfaces, true) : [];
        for (const h of hits) {
          if (!h.face) continue;
          const n = h.face.normal.clone().transformDirection(h.object.matrixWorld).normalize();
          // Only the side of the road we are driving on (its normal points
          // the same way as our current up). This rejects the double-sided
          // underside of the track, so the car never sticks to the bottom.
          if (requireUpish && n.dot(carUp) < 0.2) continue;
          if (!requireUpish && n.dot(dir) > 0.3) continue; // skip back-faces when climbing
          return { point: h.point.clone(), normal: n };
        }
        return null;
      }

      let res = probeSurface(
        tentative.clone().addScaledVector(carUp, 5),
        carUp.clone().negate(),
        12,
        true
      );

      // Probe 2 - "climb / follow the road ahead": if the snap probe found
      // nothing, the road probably rears up steeply or curves away in front of
      // us (a ramp, banked turn, or start of a loop) that a straight downward
      // ray slides right past. Sweep a cone of rays in front of the car -
      // fanned sideways (to follow curves) and pitched upward (to climb) - and
      // mount onto the nearest road face we find, tilting the car to match it.
      if (!res && Math.abs(speed) > 0.0015) {
        const sign = speed > 0 ? 1 : -1;
        const travelDir = forward.clone().multiplyScalar(sign);
        const right = new THREE.Vector3().crossVectors(travelDir, carUp).normalize();
        const climbOrigin = prevPosition.clone().addScaledVector(carUp, 1.0);
        const reach = Math.max(Math.abs(speed) * 2.5, 3);
        let best: { point: THREE.Vector3; normal: THREE.Vector3 } | null = null;
        let bestDist = Infinity;
        // Pitch the ray upward (0..70deg) to catch climbs, with only a narrow
        // sideways fan (so the kart climbs ramps straight ahead but cannot
        // "grab" the road sideways across off-track ground = invisible guides).
        for (let pitch = 0; pitch <= 70; pitch += 14) {
          for (let yaw = -12; yaw <= 12; yaw += 12) {
            const qYaw = new THREE.Quaternion().setFromAxisAngle(carUp, yaw * Math.PI / 180);
            const qPitch = new THREE.Quaternion().setFromAxisAngle(right, -pitch * Math.PI / 180);
            const dir = travelDir.clone().applyQuaternion(qYaw).applyQuaternion(qPitch).normalize();
            groundRay.set(climbOrigin, dir);
            groundRay.near = 0;
            groundRay.far = reach;
            const hits = surfaces.length > 0 ? groundRay.intersectObjects(surfaces, true) : [];
            for (const h of hits) {
              if (!h.face) continue;
              const n = h.face.normal.clone().transformDirection(h.object.matrixWorld).normalize();
              // The road face must point back toward us (we are driving into
              // it), not be a back-face we'd pass through.
              if (n.dot(dir) > -0.1) continue;
              if (h.distance < bestDist) {
                bestDist = h.distance;
                best = { point: h.point.clone(), normal: n };
              }
              break;
            }
          }
        }
        if (best) res = best;
      }

      // Probe 3 - "bridge a small gap": the flat road can be interrupted by
      // painted markings that are actually a hole in the road mesh - most
      // importantly the start/finish line. Step forward along travel and look
      // straight down for the road resuming within a short distance, so the
      // kart can drive across the finish line (and any small gap) instead of
      // hitting an invisible wall. Real off-track edges have no road for a long
      // way, so the kart still stops there.
      if (!res && Math.abs(speed) > 0.0015) {
        const sign = speed > 0 ? 1 : -1;
        const travelDir = forward.clone().multiplyScalar(sign);
        // Only bridge a short straight gap (the finish line). Anything wider is
        // off-track and the kart is stopped there (invisible guides).
        for (let d = 1; d <= 9; d += 1) {
          const probePoint = prevPosition.clone().addScaledVector(travelDir, d);
          const r = probeSurface(
            probePoint.clone().addScaledVector(carUp, 5),
            carUp.clone().negate(),
            12,
            true,
          );
          if (r) { res = r; break; }
        }
      }

      if (res) {
        carUp.copy(res.normal);
        carModel.position.copy(res.point).addScaledVector(carUp, groundClearance);
        carModel.quaternion.copy(orientationFor(carUp));
      } else {
        // Off the gray road: the track edge acts as a solid invisible wall.
        // Undo the move and stop, so the kart cannot leave the track. The
        // player can still steer (even at a standstill) to point back onto the
        // road and drive on.
        carModel.position.copy(prevPosition);
        speed = 0;
        carModel.quaternion.copy(orientationFor(carUp));
      }

      // Lap progress / completion (measured by the angle swept around the
      // circuit centre, see below).
      const distFromFinish = Math.hypot(
        carModel.position.x - finishPoint.x,
        carModel.position.z - finishPoint.z
      );

      // Lap progress measured by how much of the loop's angle the kart has
      // swept around the circuit centre. Counts from 0 at the start (before the
      // first lap) up to a full loop at the finish.
      const ang = Math.atan2(
        carModel.position.z - loopCenter.z,
        carModel.position.x - loopCenter.x,
      );
      if (!lapAngleInit) {
        lapAnglePrev = ang;
        lapAngleAccum = 0;
        lapAngleInit = true;
      }
      let dA = ang - lapAnglePrev;
      if (dA > Math.PI) dA -= 2 * Math.PI;
      if (dA < -Math.PI) dA += 2 * Math.PI;
      lapAngleAccum += dA;
      lapAnglePrev = ang;
      const sweptFraction = Math.abs(lapAngleAccum) / (2 * Math.PI);

      // Track how far the kart has driven from the start (used as a simple,
      // direction-agnostic "has gone around" check).
      const distFromStart = Math.hypot(
        carModel.position.x - spawnPoint.x,
        carModel.position.z - spawnPoint.z,
      );
      if (distFromStart > maxDistFromStart) maxDistFromStart = distFromStart;

      // Completed a lap if ANY of these hold (kept lenient so passing over the
      // finish reliably registers):
      //  - swept most of the loop AND reached/passed the finish line;
      //  - swept a full loop;
      //  - drove well away from the start and then came back to the finish.
      if (!lapCompleted && (
        (sweptFraction > 0.8 && distFromFinish < RETURN_RADIUS) ||
        sweptFraction >= 0.98 ||
        (maxDistFromStart > 50 && distFromFinish < RETURN_RADIUS)
      )) {
        triggerFinish();
      }

      const lapProgress = lapCompleted
        ? 1
        : Math.max(0, Math.min(1, sweptFraction));
      const fillEl = document.getElementById('td-progress-fill');
      if (fillEl) fillEl.style.height = `${(lapProgress * 100).toFixed(1)}%`;
      const pctEl = document.getElementById('td-progress-pct');
      if (pctEl) pctEl.textContent = `${Math.round((1 - lapProgress) * 100)}%`;

      // Discount crates: collect on contact (-10% each, stacking).
      for (const cube of cubes) {
        if (cube.collected) continue;
        const d = Math.hypot(
          carModel.position.x - cube.obj.position.x,
          carModel.position.z - cube.obj.position.z,
        );
        if (d < CUBE_HIT_RADIUS) {
          cube.collected = true;
          cube.obj.visible = false;
          cubesCollected += 1;
          const pct = cubesCollected * 10;
          onDiscountChange?.(pct);
          const el = document.getElementById('testdrive-discount');
          if (el) {
            el.textContent = `🎁 Sconto +10%!  (Totale -${pct}%)`;
            el.style.display = 'block';
            window.setTimeout(() => { el.style.display = 'none'; }, 1800);
          }
        }
      }

      // Spin the crates for a bit of life.
      for (const cube of cubes) {
        if (!cube.collected) cube.obj.rotation.y += 0.02;
      }

      const relativeCameraOffset = new THREE.Vector3(0, 7, -15);
      relativeCameraOffset.applyQuaternion(carModel.quaternion);
      const cameraOffset = carModel.position.clone().add(relativeCameraOffset);
      camera.position.lerp(cameraOffset, 0.08);

      const lookAtPos = carModel.position.clone().add(new THREE.Vector3(0, 2, 0));
      camera.lookAt(lookAtPos);
    }

    let destroyed = false;
    function animate() {
      if (destroyed) return;
      requestAnimationFrame(animate);
      updatePhysics();
      renderer.render(scene, camera);
    }
    animate();

    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      destroyed = true;
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('keydown', savePoint);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, [kartColor, kartUrl]);

  return (
    <div className="size-full relative overflow-hidden" style={{ background: '#87ceeb' }}>
      <div ref={containerRef} className="absolute inset-0" />

      <div id="testdrive-loader" className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none" style={{ color: 'white', fontFamily: "'Outfit', sans-serif", fontWeight: 800 }}>
        <span style={{ fontSize: 60 }}>🏁</span>
        <p>Caricamento pista...</p>
      </div>

      <button
        onClick={onExit}
        className="absolute top-4 left-4 z-10 px-5 py-2.5 rounded-full font-bold text-white shadow-lg"
        style={{ background: '#E52521', fontFamily: "'Outfit', sans-serif" }}
      >
        ← CONFIGURATORE
      </button>

      {/* SHORT TUTORIAL — shown when entering the test drive */}
      {showTutorial && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', fontFamily: "'Outfit', sans-serif" }}
          onClick={() => setShowTutorial(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(92vw, 430px)',
              background: 'linear-gradient(#fff, #fdeecb)',
              border: '4px solid #1a1a1a',
              borderRadius: 22,
              boxShadow: '0 10px 0 #1a1a1a',
              padding: '22px 24px 24px',
              textAlign: 'center',
              color: '#1a1a1a',
            }}
          >
            <div style={{ fontSize: 40, lineHeight: 1 }}>🏁</div>
            <h2 style={{ fontWeight: 900, fontSize: '1.61rem', margin: '8px 0 4px', textTransform: 'uppercase' }}>
              Come funziona
            </h2>
            <p style={{ fontWeight: 600, fontSize: '1.035rem', opacity: 0.8, margin: '0 0 16px' }}>
              Fai un giro completo della pista per aggiungere il kart al garage!
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={tutBadge}>W A S D</span>
                <span style={{ fontWeight: 700, fontSize: '1.035rem' }}>Guida il kart (oppure le frecce)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={tutBadge}>🏁</span>
                <span style={{ fontWeight: 700, fontSize: '1.035rem' }}>Parti e torna al traguardo per completare il giro</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={tutBadge}>🎁</span>
                <span style={{ fontWeight: 700, fontSize: '1.035rem' }}>Prendi le casse per uno sconto sul prezzo</span>
              </div>
            </div>

            <button
              onClick={() => setShowTutorial(false)}
              style={{
                fontWeight: 900, fontSize: '1.15rem', textTransform: 'uppercase', letterSpacing: '0.03em',
                color: '#06210b', background: 'linear-gradient(#43e06a, #22bd48)',
                border: '3px solid #1a1a1a', borderRadius: 14, padding: '12px 30px',
                boxShadow: '0 4px 0 #1a1a1a', cursor: 'pointer',
              }}
            >
              VIA! 🏎️
            </button>
          </div>
        </div>
      )}

      <div
        id="testdrive-saved"
        className="absolute top-20 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl text-center text-white text-sm font-bold pointer-events-none"
        style={{ display: 'none', background: 'rgba(20,140,40,0.92)', fontFamily: "'Outfit', sans-serif" }}
      >
        📍 Punto di partenza salvato!
      </div>

      <div
        id="testdrive-finishset"
        className="absolute top-20 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl text-center text-white text-sm font-bold pointer-events-none"
        style={{ display: 'none', background: 'rgba(180,30,30,0.92)', fontFamily: "'Outfit', sans-serif" }}
      >
        🏁 Traguardo salvato!
      </div>

      <div
        id="testdrive-discount"
        className="absolute top-32 left-1/2 -translate-x-1/2 z-20 px-5 py-2.5 rounded-xl text-center text-white font-black pointer-events-none"
        style={{ display: 'none', background: 'rgba(230,180,20,0.96)', color: '#1a1a1a', fontFamily: "'Outfit', sans-serif", fontSize: 18 }}
      >
        🎁 Sconto +10%!
      </div>

      <div
        id="testdrive-finish"
        className="absolute inset-0 z-20 flex-col items-center justify-center gap-3 pointer-events-none"
        style={{ display: 'none', background: 'rgba(0,0,0,0.55)', color: 'white', fontFamily: "'Outfit', sans-serif", fontWeight: 900 }}
      >
        <span style={{ fontSize: 80 }}>🏁</span>
        <p style={{ fontSize: 30 }}>Giro completato!</p>
        <p style={{ fontSize: 18, fontWeight: 700 }}>Kart aggiunto al carrello…</p>
      </div>
    </div>
  );
}
