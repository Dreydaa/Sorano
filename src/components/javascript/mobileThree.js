import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import tracksData from "../data/TracksData.json";

gsap.registerPlugin(MotionPathPlugin);

export default function initMobileScene(canvas, options = {}) {
  const scene = new THREE.Scene();
  const sizes = { width: window.innerWidth, height: window.innerHeight };

  // ─── Loader ───
  const gltfLoader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  );
  gltfLoader.setDRACOLoader(dracoLoader);

  // ─── Camera ───
  const camera = new THREE.PerspectiveCamera(
    45,
    sizes.width / sizes.height,
    0.1,
    100,
  );
  camera.position.set(0, 0, 6);
  scene.add(camera);

  // ─── Lights ───
  scene.add(new THREE.AmbientLight(0xffffff, 2));
  const dirLight = new THREE.DirectionalLight(0xffffff, 3);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);

  // ─── Renderer ───
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  // ─── Carousel layout constants ───
  const SLOT = {
    offLeft: { x: -3.0, y: -0.5, z: -2 },
    left: { x: -2.25, y: -0.4, z: -1 },
    center: { x: 0, y: 0.2, z: 0 },
    right: { x: 2.25, y: -0.4, z: -1 },
    offRight: { x: 3.0, y: -0.5, z: -2 },
  };
  const SIDE_SCALE_FACTOR = 1;
  const CENTER_SCALE_FACTOR = 1;
  const TRANSITION_DURATION = 0.6;
  const TRANSITION_EASE = "power2.inOut";

  // ─── State ───
  let currentIndex = 0;
  let isAnimating = false;
  const modelsCache = new Map();

  // The 3 visible slots
  let slots = {
    left: { model: null, index: -1 },
    center: { model: null, index: -1 },
    right: { model: null, index: -1 },
  };

  // ─── Model helpers ───

  function setupModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    model.traverse((child) => {
      if (child.isMesh)
        child.geometry.translate(-center.x, -center.y, -center.z);
    });

    const scale = 2 / Math.max(size.x, size.y);
    model.scale.set(scale, scale, scale);
    model.userData.baseScale = scale;
    return model;
  }

  function loadModel(index) {
    return new Promise((resolve) => {
      const track = tracksData[index];
      if (!track?.modelPath) return resolve(null);

      if (modelsCache.has(track.modelPath)) {
        resolve(setupModel(modelsCache.get(track.modelPath).clone()));
        return;
      }

      if (modelsCache.size >= 10) {
        const firstKey = modelsCache.keys().next().value;
        const oldTemplate = modelsCache.get(firstKey);
        disposeModel(oldTemplate);
        modelsCache.delete(firstKey);
      }

      gltfLoader.load(
        track.modelPath,
        (gltf) => {
          modelsCache.set(track.modelPath, gltf.scene);
          resolve(setupModel(gltf.scene.clone()));
        },
        undefined,
        (err) => {
          console.error("Model load error:", err);
          resolve(null);
        },
      );
    });
  }

  function placeInSlot(model, slotName) {
    if (!model) return;
    const baseScale = model.userData.baseScale || 1;
    const s =
      slotName === "center"
        ? baseScale * CENTER_SCALE_FACTOR
        : baseScale * SIDE_SCALE_FACTOR;
    model.scale.set(s, s, s);
    const pos = SLOT[slotName];
    model.position.set(pos.x, pos.y, pos.z);
  }

  function getArcPoint(start, end) {
    return {
      x: (start.x + end.x) / 2,
      y: Math.max(start.y, end.y) + 0.3, // Control point higher up for the bezier arc
      z: (start.z + end.z) / 2,
    };
  }

  function animateSlot(model, startKey, endKey, tl) {
    if (!model) return;
    const start = SLOT[startKey];
    const end = SLOT[endKey];

    let scaleF = SIDE_SCALE_FACTOR;
    if (endKey === "center") scaleF = CENTER_SCALE_FACTOR;

    const targetS = (model.userData.baseScale || 1) * scaleF;
    tl.to(
      model.scale,
      {
        x: targetS,
        y: targetS,
        z: targetS,
        duration: TRANSITION_DURATION,
        ease: TRANSITION_EASE,
      },
      0,
    );

    tl.to(
      model.position,
      {
        motionPath: {
          path: [getArcPoint(start, end), end],
          type: "soft", // Soft path makes it curve using the intermediate point
        },
        duration: TRANSITION_DURATION,
        ease: TRANSITION_EASE,
      },
      0,
    );
  }

  function wrap(index) {
    return (
      ((index % tracksData.length) + tracksData.length) % tracksData.length
    );
  }

  // ─── Carousel initialization ───

  async function initCarousel() {
    const centerIdx = 0;
    const leftIdx = wrap(centerIdx - 1);
    const rightIdx = wrap(centerIdx + 1);

    const [leftModel, centerModel, rightModel] = await Promise.all([
      loadModel(leftIdx),
      loadModel(centerIdx),
      loadModel(rightIdx),
    ]);

    if (leftModel) {
      placeInSlot(leftModel, "left");
      scene.add(leftModel);
      slots.left = { model: leftModel, index: leftIdx };
    }

    if (centerModel) {
      placeInSlot(centerModel, "center");
      scene.add(centerModel);
      slots.center = { model: centerModel, index: centerIdx };
    }

    if (rightModel) {
      placeInSlot(rightModel, "right");
      scene.add(rightModel);
      slots.right = { model: rightModel, index: rightIdx };
    }

    currentIndex = centerIdx;
    if (options.onLoaded) options.onLoaded();
  }

  // ─── Carousel transitions ───

  function disposeModel(model) {
    if (!model) return;
    model.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        } else {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      }
    });
    scene.remove(model);
  }

  async function swipeNext() {
    if (isAnimating) return;
    isAnimating = true;

    const newCenterIdx = wrap(currentIndex + 1);
    const newRightIdx = wrap(newCenterIdx + 1);
    const newModelPromise = loadModel(newRightIdx);

    const tl = gsap.timeline({
      onComplete: async () => {
        if (slots.left.model) disposeModel(slots.left.model);
        slots.left = { model: slots.center.model, index: slots.center.index };
        slots.center = { model: slots.right.model, index: slots.right.index };

        const newModel = await newModelPromise;
        if (newModel) {
          placeInSlot(newModel, "right");
          scene.add(newModel);
          slots.right = { model: newModel, index: newRightIdx };
        } else {
          slots.right = { model: null, index: newRightIdx };
        }

        currentIndex = newCenterIdx;
        isAnimating = false;
      },
    });

    animateSlot(slots.left.model, "left", "offLeft", tl);
    animateSlot(slots.center.model, "center", "left", tl);
    animateSlot(slots.right.model, "right", "center", tl);
  }

  async function swipePrev() {
    if (isAnimating) return;
    isAnimating = true;

    const newCenterIdx = wrap(currentIndex - 1);
    const newLeftIdx = wrap(newCenterIdx - 1);
    const newModelPromise = loadModel(newLeftIdx);

    const tl = gsap.timeline({
      onComplete: async () => {
        if (slots.right.model) disposeModel(slots.right.model);
        slots.right = { model: slots.center.model, index: slots.center.index };
        slots.center = { model: slots.left.model, index: slots.left.index };

        const newModel = await newModelPromise;
        if (newModel) {
          placeInSlot(newModel, "left");
          scene.add(newModel);
          slots.left = { model: newModel, index: newLeftIdx };
        } else {
          slots.left = { model: null, index: newLeftIdx };
        }

        currentIndex = newCenterIdx;
        isAnimating = false;
      },
    });

    animateSlot(slots.right.model, "right", "offRight", tl);
    animateSlot(slots.center.model, "center", "right", tl);
    animateSlot(slots.left.model, "left", "center", tl);
  }

  async function rebuildCarousel(newCenterIdx, direction) {
    if (isAnimating) return;
    isAnimating = true;

    const leftIdx = wrap(newCenterIdx - 1);
    const rightIdx = wrap(newCenterIdx + 1);
    const modelsPromise = Promise.all([
      loadModel(leftIdx),
      loadModel(newCenterIdx),
      loadModel(rightIdx),
    ]);
    const exitKey = direction > 0 ? "offLeft" : "offRight";

    const tl = gsap.timeline({
      onComplete: async () => {
        if (slots.left.model) disposeModel(slots.left.model);
        if (slots.center.model) disposeModel(slots.center.model);
        if (slots.right.model) disposeModel(slots.right.model);

        const [newLeft, newCenter, newRight] = await modelsPromise;

        if (newLeft) {
          placeInSlot(newLeft, "left");
          scene.add(newLeft);
        }
        if (newCenter) {
          placeInSlot(newCenter, "center");
          scene.add(newCenter);
        }
        if (newRight) {
          placeInSlot(newRight, "right");
          scene.add(newRight);
        }

        slots = {
          left: { model: newLeft, index: leftIdx },
          center: { model: newCenter, index: newCenterIdx },
          right: { model: newRight, index: rightIdx },
        };
        currentIndex = newCenterIdx;
        isAnimating = false;
      },
    });

    animateSlot(slots.left.model, "left", exitKey, tl);
    animateSlot(slots.center.model, "center", exitKey, tl);
    animateSlot(slots.right.model, "right", exitKey, tl);
  }

  initCarousel();

  // ─── Touch / swipe / click detection ───
  let touchStartX = 0;
  let touchStartY = 0;
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const onTouchStart = (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  };

  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const rect = canvas.getBoundingClientRect();
      mouse.x =
        ((e.changedTouches[0].clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y =
        -((e.changedTouches[0].clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const modelsToIntersect = [
        slots.left.model,
        slots.center.model,
        slots.right.model,
      ].filter(Boolean);
      const intersects = raycaster.intersectObjects(modelsToIntersect, true);

      if (intersects.length > 0) {
        let clickedModel = intersects[0].object;
        while (
          clickedModel.parent &&
          !modelsToIntersect.includes(clickedModel)
        ) {
          clickedModel = clickedModel.parent;
        }
        let clickedIndex = -1;
        if (clickedModel === slots.left.model) clickedIndex = slots.left.index;
        else if (clickedModel === slots.center.model)
          clickedIndex = slots.center.index;
        else if (clickedModel === slots.right.model)
          clickedIndex = slots.right.index;

        if (clickedIndex !== -1 && options.onCubeClick)
          options.onCubeClick(clickedIndex);
      }
      return;
    }

    if (Math.abs(dx) < Math.abs(dy) || Math.abs(dx) < 50) return;

    if (dx < 0) {
      const next = wrap(currentIndex + 1);
      swipeNext();
      if (options.onTrackChange) options.onTrackChange(next, 1);
    } else {
      const prev = wrap(currentIndex - 1);
      swipePrev();
      if (options.onTrackChange) options.onTrackChange(prev, -1);
    }
  };

  const handleTrackChange = (e) => {
    const { cubeIndex, direction } = e.detail;
    if (cubeIndex === currentIndex) return;

    const nextIdx = wrap(currentIndex + 1);
    const prevIdx = wrap(currentIndex - 1);

    if (cubeIndex === nextIdx) swipeNext();
    else if (cubeIndex === prevIdx) swipePrev();
    else rebuildCarousel(cubeIndex, direction || 1);
  };

  canvas.addEventListener("touchstart", onTouchStart, { passive: true });
  canvas.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("trackChanged", handleTrackChange);

  let animFrameId;
  function animate() {
    // Models stay completely static
    if (slots.left.model) {
      slots.left.model.rotation.set(0, 0, 0);
    }
    if (slots.center.model) {
      slots.center.model.rotation.set(0, 0, 0);
    }
    if (slots.right.model) {
      slots.right.model.rotation.set(0, 0, 0);
    }

    renderer.render(scene, camera);
    animFrameId = requestAnimationFrame(animate);
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
    cancelAnimationFrame(animFrameId);
    window.removeEventListener("resize", handleResize);
    window.removeEventListener("trackChanged", handleTrackChange);
    canvas.removeEventListener("touchstart", onTouchStart);
    canvas.removeEventListener("touchend", onTouchEnd);

    disposeModel(slots.left.model);
    disposeModel(slots.center.model);
    disposeModel(slots.right.model);

    modelsCache.forEach((template) => disposeModel(template));
    modelsCache.clear();

    dracoLoader.dispose();
    renderer.dispose();
  };
}
