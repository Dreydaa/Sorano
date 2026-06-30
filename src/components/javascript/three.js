import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import tracksData from "../data/TracksData.json"; // ← Import du JSON
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";

gsap.registerPlugin(ScrollTrigger);

export default function initScene(canvas, options = {}) {
  const scene = new THREE.Scene();

  const gltfLoader = new GLTFLoader();

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  );
  gltfLoader.setDRACOLoader(dracoLoader);

  /**
   * NOUVELLE FONCTION : Charger tous les modèles uniques du JSON
   */
  function loadUniqueModels() {
    // Extraire tous les chemins de modèles uniques
    const modelPaths = new Set();
    tracksData.forEach((track) => {
      if (track.modelPath) {
        modelPaths.add(track.modelPath);
      }
    });

    console.log(`🔄 Chargement de ${modelPaths.size} modèles uniques...`);

    // Charger tous les modèles en parallèle
    const loadPromises = Array.from(modelPaths).map((path) => {
      return new Promise((resolve, reject) => {
        gltfLoader.load(
          path,
          (gltf) => {
            console.log(`✅ Modèle chargé: ${path}`);
            resolve({ path, scene: gltf.scene });
          },
          undefined,
          (error) => {
            console.error(`❌ Erreur sur ${path}:`, error);
            reject(error);
          },
        );
      });
    });

    return Promise.all(loadPromises);
  }

  /**
   * FONCTION MODIFIÉE : Créer la grille avec les modèles du JSON
   */
  function createCubeGrid(onComplete) {
    const count = tracksData.length; // 128 tracks = 128 modèles
    const cubeGroup = new THREE.Group();
    const cubesArray = [];

    const targetWidth = 2.5;
    const targetHeight = 2.5;
    const targetDepth = 0.1;

    // Charger tous les modèles uniques
    loadUniqueModels()
      .then((loadedModels) => {
        console.log(`✅ ${loadedModels.length} modèles chargés`);

        // Créer un Map pour accès rapide par chemin
        const modelsMap = new Map();
        loadedModels.forEach(({ path, scene }) => {
          modelsMap.set(path, scene);
        });

        // Créer les 128 instances
        for (let i = 0; i < count; i++) {
          const track = tracksData[i];

          // Récupérer le template du modèle pour ce track
          const modelPath = track.modelPath || "./src/assets/model/9.glb"; // Fallback
          const template = modelsMap.get(modelPath);

          if (!template) {
            console.warn(`⚠️ Modèle non trouvé pour track ${i}: ${modelPath}`);
            continue;
          }

          // Cloner le template
          const modelClone = template.clone();

          // Calculer la bbox et centrer le modèle
          const box = new THREE.Box3().setFromObject(modelClone);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);

          // Centrer la géométrie
          modelClone.traverse((child) => {
            if (child.isMesh) {
              child.geometry.translate(-center.x, -center.y, -center.z);
            }
          });

          // Calculer le scale
          const scaleX = targetWidth / size.x;
          const scaleY = targetHeight / size.y;
          const scaleZ = targetDepth / size.z;
          const uniformScale = Math.min(scaleX, scaleY, scaleZ);

          modelClone.scale.set(uniformScale, uniformScale, uniformScale);

          // Ombres et userData
          modelClone.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              child.userData.index = i;
              child.userData.trackId = track.id;
              child.userData.modelPath = modelPath;
            }
          });

          // Position (identique aux cubes)
          modelClone.position.set(i * 0, i * 1, -i * 2);

          // UserData du modèle parent
          modelClone.userData.originalPosition = modelClone.position.clone();
          modelClone.userData.index = i;
          modelClone.userData.zDepth = -i * 1.5;
          modelClone.userData.trackId = track.id;
          modelClone.userData.modelPath = modelPath;

          cubeGroup.add(modelClone);
          cubesArray.push(modelClone);
        }

        cubeGroup.position.set(0, -2, 5);
        console.log(`✅ ${count} modèles créés et positionnés`);

        if (onComplete) {
          onComplete();
        }

        if (options.onLoaded) {
          options.onLoaded();
        }
      })
      .catch((error) => {
        console.error("❌ Erreur lors du chargement des modèles:", error);
      });

    return { group: cubeGroup, cubes: cubesArray };
  }

  const { group: cubeGrid, cubes: cubesArray } = createCubeGrid(() => {
    setupParallaxScroll();
    console.log("✅ Scroll initialisé");
  });

  scene.add(cubeGrid);

  /**
   * Configuration du Scroll Parallaxe
   */
  let scrollTimeline = null;

  const parallaxSettings = {
    enabled: true,
    scrollSpeed: 1.0,
    scrollDistance: 1.0,
    xMapping: 0,
    yMapping: 0,
    zMapping: 0,
    depthMultiplier: 1,
  };

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const onCubeClick = (event) => {
  const rect = canvas.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(cubesArray, true)

  if (intersects.length > 0) {
    const clickedObject = intersects[0].object

    let modelToAnimate = clickedObject
    while (modelToAnimate.parent && !cubesArray.includes(modelToAnimate)) {
      modelToAnimate = modelToAnimate.parent
    }

    const cubeIndex = modelToAnimate.userData.index

    // Guard isTransitioning AVANT le save
    if (isTransitioning) return

    // Save uniquement si on n'est pas déjà en transition
    savedScrollY = scrollY
    savedTargetScrollY = targetScrollY

    cubesArray.forEach(cube => {
      cube.userData.savedScale = cube.scale.clone()
    })

    triggerModelTransition(cubeIndex)
    scrollEnabled = false
    loopEnabled = false
    window.dispatchEvent(new CustomEvent('scrollLocked'))

    if (options.onCubeClick) {
      options.onCubeClick(cubeIndex)
    }
  }
}

  window.addEventListener("click", onCubeClick);

  // Après window.addEventListener('click', onCubeClick)

const handleScrollUnlock = () => {
  isTransitioning = false
  scrollEnabled = true
  scrollY = savedScrollY
  targetScrollY = savedTargetScrollY

  // Reset caméra instantané sans animation
  camera.position.set(9.68, 7.82, 20)
  controls.target.set(0, 0, 0)
  camera.lookAt(0, 0, 0)
  controls.update()
  controls.enabled = true

  cubesArray.forEach(cube => {
    cube.visible = true
    if (cube.userData.savedScale) {
      gsap.to(cube.scale, {
        x: cube.userData.savedScale.x,
        y: cube.userData.savedScale.y,
        z: cube.userData.savedScale.z,
        duration: 0.6,
        ease: 'power2.out'
      })
    }
  })

  setTimeout(() => { loopEnabled = true }, 600)
}

  window.addEventListener("scrollUnlocked", handleScrollUnlock);

  let hoveredModel = null;
  let hoverTween = null;
  let scrollEnabled = true;
  let savedScrollY = 0;
  let savedTargetScrollY = 0;
  let scrollY = 0; // ← déplace depuis setupParallaxScroll
  let targetScrollY = 0;
  let loopEnabled = true;

  const onScroll = () => {
    if (hoveredModel && hoveredModel.userData.baseY !== undefined) {
      if (hoverTween) hoverTween.kill();
      hoveredModel.userData.baseY = undefined;
      hoveredModel = null;
    }
  };

  window.addEventListener("scroll", onScroll, true); // true = capture phase, attrape tous les scrolls

  const onMouseMove = (event) => {
    if (!scrollEnabled) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(cubesArray, true);

    if (intersects.length > 0) {
      let model = intersects[0].object;
      while (model.parent && !cubesArray.includes(model)) {
        model = model.parent;
      }

      if (model !== hoveredModel) {
        // Reset ancien hover
        if (hoveredModel) {
          const prev = hoveredModel;
          gsap.to(prev.userData, {
            hoverOffset: 0,
            duration: 0.4,
            ease: "power2.out",
          });
        }

        hoveredModel = model;

        model.userData.hoverOffset = model.userData.hoverOffset || 0;

        if (hoverTween) hoverTween.kill();
        hoverTween = gsap.to(model.userData, {
          hoverOffset: 0.3,
          duration: 0.4,
          ease: "power2.out",
        });

        canvas.style.cursor = "pointer";

        canvas.style.cursor = "pointer";
      }
    } else {
      // Mouse out
      if (hoveredModel) {
        gsap.to(hoveredModel.userData, {
          hoverOffset: 0,
          duration: 0.4,
          ease: "power2.out",
        });
        hoveredModel = null;
      }
      canvas.style.cursor = "default";
    }
  };

  window.addEventListener("mousemove", onMouseMove);

  /**
   * NOUVELLE FONCTION COMMUNE : Gère la transition et le zoom sur un modèle précis
   */

  let isTransitioning = false;
  function triggerModelTransition(cubeIndex) {
    if (isTransitioning) return;
    isTransitioning = true;
    console.log("🎬 transition start, loopEnabled:", loopEnabled);
    loopEnabled = false; // ← stoppe le loop avant la transition
    console.log("🔒 loopEnabled set to false:", loopEnabled);
    const modelToAnimate = cubesArray.find(
      (cube) => cube.userData.index === cubeIndex,
    );
    if (!modelToAnimate) return;

    cubesArray.forEach((cube) => {
      cube.userData.savedScale = cube.scale.clone();
      cube.userData.savedPosition = cube.position.clone();
    });

    const targetPos = new THREE.Vector3();
    modelToAnimate.getWorldPosition(targetPos);

    if (controls) controls.enabled = false;

    const tl = gsap.timeline();

    // Déplacement de la cible des contrôles vers le modèle
    tl.to(
      controls.target,
      {
        x: targetPos.x,
        y: targetPos.y - 0.67,
        z: targetPos.z,
        duration: 1.5,
        ease: "power3.inOut",
      },
      0,
    );

    // Déplacement de la caméra
    tl.to(
      camera.position,
      {
        x: targetPos.x,
        y: targetPos.y,
        z: camera.position.z,
        duration: 1.25,
        ease: "power3.inOut",
        onUpdate: () => {
          camera.lookAt(controls.target);
        },
      },
      0,
    );

    // Calcul de la taille de zoom globale (comme ton code initial)
    const viewHeight = camera.top - camera.bottom;
    const targetSize = viewHeight * 0.9;
    const scaleFactor = targetSize * 2;

    // On zoome et affiche le modèle sélectionné
    tl.to(
      modelToAnimate.scale,
      {
        x: scaleFactor,
        y: scaleFactor,
        z: 1,
        duration: 1.2,
        ease: "expo.out",
      },
      0.3,
    );

    // On cache absolument tous les autres modèles (scale à 0)
    cubesArray.forEach((cube) => {
      if (cube !== modelToAnimate) {
        tl.to(
          cube.scale,
          {
            x: 0,
            y: 0,
            z: 0,
            duration: 0.6,
            ease: "power2.in",
          },
          0,
        );
      }
    });
  }

  // Écouteur d'événement envoyé par React lors d'un skip
  const handleTrackChangeFromReact = (event) => {
    const nextCubeIndex = event.detail.cubeIndex;
    console.log("📢 Synchronisation 3D reçue pour l'index :", nextCubeIndex);

    isTransitioning = false
    
    triggerModelTransition(nextCubeIndex);
  };
  window.addEventListener("trackChanged", handleTrackChangeFromReact);

  function setupParallaxScroll() {
    // Supprimer l'ancienne scroll-container si elle existe
    const oldContainer = document.querySelector(".scroll-container");
    if (oldContainer) oldContainer.remove();
    if (scrollTimeline) scrollTimeline.kill();
    ScrollTrigger.getAll().forEach((t) => t.kill());

    if (!parallaxSettings.enabled) return;

    // Espacement entre chaque modèle sur l'axe Z
    const spacing = 2;
    const total = cubesArray.length;

    // Position initiale de chaque modèle
    cubesArray.forEach((cube, i) => {
      cube.position.y = i * 1;
      cube.position.z = -i * spacing;
    });

    // Longueur totale du "tunnel"
    const totalLength = total * spacing;

    // Valeur de scroll virtuel (en unités Three.js)
    const scrollSpeed = 0.009; // lerp factor (fluidité)
    const wheelStrength = 0.4; // sensibilité molette

    // Lerp dans la boucle animate
    const updateLoop = () => {
      if (!loopEnabled) return;
      // Lerp fluide
      scrollY += (targetScrollY - scrollY) * scrollSpeed;

      cubesArray.forEach((cube, i) => {
        let z = -i * spacing + scrollY;
        let y = i * 1 - scrollY * 0.5;

        z = ((z % totalLength) + totalLength) % totalLength;
        if (z > totalLength / 2) z -= totalLength;

        y = ((y % (total * 1)) + total * 1) % (total * 1);
        if (y > (total * 1) / 2) y -= total * 1;

        cube.position.z = z;
        cube.position.y = y + (cube.userData.hoverOffset || 0); // ← ajout offset hover
        cube.visible = z > -30 && z < 15;
      });
    };

    // Injecter dans la boucle animate existante
    // On stocke la fonction pour l'appeler dans animate()
    parallaxSettings._updateLoop = updateLoop;

    // Écoute molette
    const onWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!scrollEnabled) return; // ← bloque le scroll
      controls.enabled = false;
      targetScrollY += e.deltaY * wheelStrength * 0.01;
      clearTimeout(onWheel._timeout);
      onWheel._timeout = setTimeout(() => {
        controls.enabled = true;
      }, 200);
    };

    // Touch support
    let lastTouchY = 0;
    const onTouchStart = (e) => {
      lastTouchY = e.touches[0].clientY;
    };
    const onTouchMove = (e) => {
      e.preventDefault();
      const delta = lastTouchY - e.touches[0].clientY;
      targetScrollY += delta * wheelStrength * 0.02;
      lastTouchY = e.touches[0].clientY;
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });

    // Stocker les listeners pour le cleanup
    parallaxSettings._cleanup = () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
    };
  }

  setupParallaxScroll();

  const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  const aspect = sizes.width / sizes.height;
  const frustumSize = 5;
  const camera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    1,
    1000,
  );

  camera.position.set(9.68, 7.82, 20);
  // camera.position.set(6.1, 2.5, 7.9)
  camera.lookAt(0, 0, 0);

  const cameraSettings = {
    fov: 45,
    near: 0.1,
    far: 1000,
    x: 11.78,
    y: 8.72,
    z: 15.5,
    update: () => {
      camera.fov = cameraSettings.fov;
      camera.near = cameraSettings.near;
      camera.far = cameraSettings.far;
      camera.position.set(cameraSettings.x, cameraSettings.y, cameraSettings.z);
      camera.updateProjectionMatrix();
      controls.target.set(0, 0, 0);
      controls.update();
    },
  };

  const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
  directionalLight.position.set(5, 10, 5);
  directionalLight.castShadow = true;
  directionalLight.receiveShadow = true;

  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 500;
  directionalLight.shadow.camera.left = -50;
  directionalLight.shadow.camera.right = 50;
  directionalLight.shadow.camera.top = 50;
  directionalLight.shadow.camera.bottom = -50;
  directionalLight.shadow.bias = -0.0001;
  directionalLight.shadow.normalBias = 0.02;

  scene.add(directionalLight);

  // cameraFolder.add(cameraSettings, 'fov', 20, 120).onChange(() => cameraSettings.update())
  // cameraFolder.add(cameraSettings, 'near', 0.01, 10).onChange(() => cameraSettings.update())
  // cameraFolder.add(cameraSettings, 'far', 100, 2000).onChange(() => cameraSettings.update())
  // cameraFolder.add(cameraSettings, 'x', -50, 50).onChange(() => cameraSettings.update())
  // cameraFolder.add(cameraSettings, 'y', -50, 50).onChange(() => cameraSettings.update())
  // cameraFolder.add(cameraSettings, 'z', -50, 50).onChange(() => cameraSettings.update())
  // cameraFolder.add({
  //   reset: () => {
  //     cameraSettings.fov = 45
  //     cameraSettings.near = 0.1
  //     cameraSettings.far = 1000
  //     cameraSettings.x = 6
  //     cameraSettings.y = 5
  //     cameraSettings.z = 6
  //     cameraSettings.update()
  //   }
  // }, 'reset').name('Reset Camera')

  scene.add(camera);

  const controls = new OrbitControls(camera, canvas);
  controls.enabled = true;
  controls.enablePan = false
controls.enableRotate = false

  const ambientLight = new THREE.AmbientLight(0xffffff, 2);
  scene.add(ambientLight);

  const axesHelper = new THREE.AxesHelper(5);
  axesHelper.visible = false;
  scene.add(axesHelper);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  function animate() {
    // controls.update()

    if (parallaxSettings._updateLoop) {
      parallaxSettings._updateLoop();
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();

  const handleResize = () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
  };

  window.addEventListener("resize", handleResize);

  return () => {
    window.removeEventListener("resize", handleResize);
    window.removeEventListener("click", onCubeClick);
    window.removeEventListener("trackChanged", handleTrackChangeFromReact);
    window.removeEventListener("scroll", onScroll, true);
    window.removeEventListener("scrollUnlocked", handleScrollUnlock);

    scene.remove(cubeGrid);
    cubesArray.forEach((model) => {
      model.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });

    if (scrollTimeline) scrollTimeline.kill();
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());

    const scrollContainer = document.querySelector(".scroll-container");
    if (scrollContainer) {
      scrollContainer.remove();
    }
    renderer.dispose();
  };
}
