import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import GUI from 'lil-gui';

// Enregistrer le plugin ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

export default function initScene(canvas, options = {}) {
  // Scene
  const scene = new THREE.Scene()

  const gui = new GUI({ title: 'Parallax Settings', width: 300 })


  const cameraFolder = gui.addFolder('Camera')
  cameraFolder.open()

  // const textureLoader = new THREE.TextureLoader()

  const gltfLoader = new GLTFLoader()

  /**
   * Fonction pour créer une grille de cubes en diagonale
   */
  function createCubeGrid(onComplete) {  // ← Ajouter un paramètre callback
    const count = 128
    const cubeGroup = new THREE.Group()
    const cubesArray = []

    const modelPath = './src/assets/model/niska.glb'

    gltfLoader.load(
      modelPath,
      (gltf) => {
        console.log('✅ Template chargé')

        const template = gltf.scene

        const box = new THREE.Box3().setFromObject(template)
        const size = new THREE.Vector3()
        box.getSize(size)
        const center = new THREE.Vector3()
        box.getCenter(center)

        template.traverse((child) => {
          if (child.isMesh) {
            // Déplacer TOUTES les géométries pour centrer le modèle à l'origine
            child.geometry.translate(-center.x, -center.y, -center.z)
          }
        })

        // Vérification
        const newBox = new THREE.Box3().setFromObject(template)
        const newCenter = new THREE.Vector3()
        newBox.getCenter(newCenter)
        console.log('✅ Nouveau centre après correction:', newCenter)

        const targetWidth = 2
        const targetHeight = 2
        const targetDepth = 0.2

        const scaleX = targetWidth / size.x
        const scaleY = targetHeight / size.y
        const scaleZ = targetDepth / size.z
        const uniformScale = Math.min(scaleX, scaleY, scaleZ)

        template.scale.set(uniformScale, uniformScale, uniformScale)

        for (let i = 0; i < count; i++) {
          const modelClone = template.clone()

          modelClone.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true
              child.receiveShadow = true
              child.userData.index = i
            }
          })

          modelClone.position.set(i * 0, i * 0.75, -i * 1.5)

          modelClone.userData.originalPosition = modelClone.position.clone()
          modelClone.userData.index = i
          modelClone.userData.zDepth = -i * 1.5

          cubeGroup.add(modelClone)
          cubesArray.push(modelClone)
        }

        cubeGroup.position.set(0, -2, 5)
        console.log(cubeGroup.position)


        console.log(`✅ ${count} modèles créés`)

        // ← Appeler le callback APRÈS que tout soit chargé
        if (onComplete) {
          onComplete()
        }
      },
      undefined,
      (error) => {
        console.error('❌ Erreur chargement:', error)
      }
    )

    return { group: cubeGroup, cubes: cubesArray }
  }

  const { group: cubeGrid, cubes: cubesArray } = createCubeGrid(() => {
    // ← Ce callback s'exécute APRÈS le chargement
    setupParallaxScroll()
    console.log('✅ Scroll initialisé')
  })

  scene.add(cubeGrid)

  /**
   * Configuration du Scroll Parallaxe
   */
  let scrollTimeline = null

  const parallaxSettings = {
    enabled: true,
    scrollSpeed: 1.0,
    scrollDistance: 1.0, // Distance totale de scroll pour l'effet parallaxe
    xMapping: 0,        // Mapping X : 0 = pas de mouvement, 1 = mouvement complet
    yMapping: 0,        // Mapping Y : 0 = pas de mouvement, 1 = mouvement complet
    zMapping: 0,        // Mapping Z : 0 = pas de mouvement, 1 = mouvement complet
    depthMultiplier: 1, // Multiplicateur de profondeur pour l'effet parallaxe
  }


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

      // Trouver le modèle complet (parent) dans cubesArray
      let modelToAnimate = clickedObject
      while (modelToAnimate.parent && !cubesArray.includes(modelToAnimate)) {
        modelToAnimate = modelToAnimate.parent
      }

      const cubeIndex = modelToAnimate.userData.index

      // Position mondiale du modèle
      const targetPos = new THREE.Vector3()
      modelToAnimate.getWorldPosition(targetPos)

      console.log('Position cible:', targetPos.x, targetPos.y, targetPos.z)

      if (options.onCubeClick) {
        options.onCubeClick(cubeIndex)
      }

      // Bloquer les contrôles pendant l'animation
      if (controls) controls.enabled = false

      const tl = gsap.timeline()

      // --- ANIMATION DE LA CAMÉRA ET CIBLE ---
      tl.to(controls.target, {
        x: targetPos.x,
        y: targetPos.y - 0.67,
        z: targetPos.z,
        duration: 2.7,
        ease: "power3.inOut"
      }, 0)

      tl.to(camera.position, {
        x: targetPos.x,
        y: targetPos.y,
        z: camera.position.z,
        duration: 1.25,
        ease: "power3.inOut",
        onUpdate: () => {
          camera.lookAt(controls.target)
        }
      }, 0)

      // --- ANIMATION DE MISE À L'ÉCHELLE (corrigée) ---
      const viewHeight = camera.top - camera.bottom
      const targetSize = viewHeight * 0.90  // ← 0.90 au lieu de 0.48
      const scaleFactor = targetSize * 2    // ← Multiplication au lieu de division

      tl.to(modelToAnimate.scale, {
        x: scaleFactor,
        y: scaleFactor,
        z: 1,
        duration: 1.5,
        ease: "expo.out"
      }, 0.5)

      // --- DISPARITION DES AUTRES MODÈLES ---
      cubesArray.forEach(cube => {
        if (cube !== modelToAnimate) {
          tl.to(cube.scale, {
            x: 0,
            y: 0,
            z: 0,
            duration: 0.8,
            ease: "power2.in"
          }, 0)
        }
      })
    }
  }
  // let modelTemplate = null;

  // gltfLoader.load('./src/assets/model/9.glb', (gltf) => {
  //   console.log('✅ Modèle chargé :', gltf);
  //   console.log('Structure de la scène :', gltf.scene);

  //   modelTemplate = gltf.scene;
  //   const box = new THREE.Box3().setFromObject(modelTemplate)
  //   const size = new THREE.Vector3()
  //   box.getSize(size)
  //   const maxDim = Math.max(size.x, size.y, size.z)
  //   const scaleFactor = 2 / maxDim
  //   modelTemplate.scale.set(scaleFactor, scaleFactor, scaleFactor)

  //   createCubeGrid();
  // });


  window.addEventListener('click', onCubeClick)

  function setupParallaxScroll() {
    // Nettoyer l'ancienne timeline si elle existe
    if (scrollTimeline) {
      scrollTimeline.kill()
      ScrollTrigger.getAll().forEach(trigger => trigger.kill())
    }

    if (!parallaxSettings.enabled) return

    const scrollHeight = Math.max(100, cubesArray.length * 10 * parallaxSettings.scrollDistance) // vh

    // Créer un container scrollable FIXE
    let scrollContainer = document.querySelector('.scroll-container')
    if (!scrollContainer) {
      scrollContainer = document.createElement('div')
      scrollContainer.className = 'scroll-container'

      // Styles du container
      scrollContainer.style.position = 'fixed'
      scrollContainer.style.top = '0'
      scrollContainer.style.left = '0'
      scrollContainer.style.width = '100%'
      scrollContainer.style.height = '100vh'
      scrollContainer.style.overflowY = 'scroll'
      scrollContainer.style.zIndex = '10'
      scrollContainer.style.pointerEvents = 'none'

      // Contenu scrollable interne
      const scrollContent = document.createElement('div')
      scrollContent.className = 'scroll-content'
      scrollContent.style.height = '1000vh' // Hauteur de scroll
      scrollContent.style.width = '100%'
      scrollContent.style.pointerEvents = 'auto'

      scrollContainer.appendChild(scrollContent)
      document.body.appendChild(scrollContainer)
    }

    // Mettre à jour la hauteur du scroll-content dynamiquement
    const scrollContent = scrollContainer.querySelector('.scroll-content')
    scrollContent.style.height = `${scrollHeight}vh`

    // ScrollTrigger cible le CONTAINER
    scrollTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: '.scroll-content',
        scroller: '.scroll-container',
        start: 'top top',
        end: 'bottom bottom',
        scrub: parallaxSettings.scrollSpeed,
        markers: true,
        // onLeave: (self) => self.scroll(1), // Boucle infinie : quand on arrive en bas, on remonte en haut
        // onLeaveBack: (self) => self.scroll(self.end - 1) // Boucle infinie : quand on arrive en haut, on descend en bas
      }
    })

    const positions = cubesArray.map(cube => cube.position);

    const moveY = 128 * 0.75
    const moveZ = 128 * 1.5

    scrollTimeline.to(positions, {
      y: `-=${moveY}`,
      z: `+=${moveZ}`,
      ease: 'none',
      stagger: {
        each: parallaxSettings.staggerAmount,
      },

      modifiers: {
        // z: gsap.utils.unitize(gsap.utils.wrap(-moveZ + 25, 25)),
        // y: gsap.utils.unitize(gsap.utils.wrap(-moveY + 5, 5))
      }
    });

  }

  // Initialiser le scroll parallaxe
  setupParallaxScroll()

  /**
   * Sizes
   */
  const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
  }

  /**
   * Camera
   */
  // const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 1, 1000)
  const aspect = sizes.width / sizes.height
  const frustumSize = 5
  const camera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    1,
    1000
  );

  // camera.position.set(11.78, 8.72, 15.5)  // Vue trois-quarts*
  camera.position.set(9.68, 7.82, 20)  // Vue trois-quarts*
  // (9.68, 7.82, 20)
  // camera.position.set(0, 5, 10)  // Vue trois-quarts*
  // (2.92, 3.18, 7.28) 
  camera.lookAt(0, 0, 0)


  const cameraSettings = {
    fov: 45,
    near: 0.1,
    far: 1000,
    x: 11.78,
    y: 8.72,
    z: 15.5,
    update: () => {
      camera.fov = cameraSettings.fov
      camera.near = cameraSettings.near
      camera.far = cameraSettings.far
      camera.position.set(cameraSettings.x, cameraSettings.y, cameraSettings.z)
      camera.updateProjectionMatrix()
      controls.target.set(0, 0, 0)
      controls.update()
    }
  }

  // Directional Light (Main Light) - POUR LES OMBRES
  const directionalLight = new THREE.DirectionalLight(0xffffff, 3)
  directionalLight.position.set(5, 10, 5)  // Au-dessus et devant
  directionalLight.castShadow = true
  directionalLight.receiveShadow = true

  // Configuration des ombres de la lumière
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
  directionalLight.shadow.camera.near = 0.5
  directionalLight.shadow.camera.far = 500
  directionalLight.shadow.camera.left = -50
  directionalLight.shadow.camera.right = 50
  directionalLight.shadow.camera.top = 50
  directionalLight.shadow.camera.bottom = -50
  directionalLight.shadow.bias = -0.0001
  directionalLight.shadow.normalBias = 0.02

  scene.add(directionalLight)

  cameraFolder.add(cameraSettings, 'fov', 20, 120).onChange(() => cameraSettings.update())
  cameraFolder.add(cameraSettings, 'near', 0.01, 10).onChange(() => cameraSettings.update())
  cameraFolder.add(cameraSettings, 'far', 100, 2000).onChange(() => cameraSettings.update())
  cameraFolder.add(cameraSettings, 'x', -50, 50).onChange(() => cameraSettings.update())
  cameraFolder.add(cameraSettings, 'y', -50, 50).onChange(() => cameraSettings.update())
  cameraFolder.add(cameraSettings, 'z', -50, 50).onChange(() => cameraSettings.update())
  cameraFolder.add({
    reset: () => {
      cameraSettings.fov = 45
      cameraSettings.near = 0.1
      cameraSettings.far = 1000
      cameraSettings.x = 6
      cameraSettings.y = 5
      cameraSettings.z = 6
      cameraSettings.update()
    }
  }, 'reset').name('Reset Camera')


  scene.add(camera)

  /**
   * Controls for dragging and moving the object
   */
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.rotateSpeed = 1.0
  controls.zoomSpeed = 1.2
  controls.panSpeed = 0.8
  controls.enableZoom = true
  controls.enablePan = true
  controls.enabled = true
  controls.target.set(0, 0, 0)

  /**
   * Lighting System
   */

  // Ambient Light
  const ambientLight = new THREE.AmbientLight(0xffffff, 2)
  //   ambientLight.castShadow = true
  // ambientLight.receiveShadow = true

  scene.add(ambientLight)


  // Directional Light (Main Light)
  // const directionalLight = new THREE.DirectionalLight(0xffffff, 2)
  // directionalLight.position.set(2, 3, 4)
  // directionalLight.castShadow = true
  // directionalLight.receiveShadow = true
  // scene.add(directionalLight)

  // Fill Light (Point Light)
  // const pointLight = new THREE.PointLight(0xffaa66, 2)
  // pointLight.position.set(1, 2, 2)
  //   // pointLight.castShadow = true
  // // pointLight.receiveShadow = true
  // scene.add(pointLight)

  // Back Rim Light
  // const backLight = new THREE.PointLight(0xffffff, 3)
  // backLight.position.set(-2, 1, -3)
  // scene.add(backLight)

  // Optional: Add a simple grid helper and axes helper for reference
  // const gridHelper = new THREE.GridHelper(10, 20, 0x888888, 0x444444)
  // scene.add(gridHelper)



  const axesHelper = new THREE.AxesHelper(5)
  axesHelper.visible = false


  scene.add(axesHelper)

  /**
   * Renderer
   */
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = true // Enable shadows
  renderer.shadowMap.type = THREE.PCFSoftShadowMap // Softer shadows

  /**
   * Animation
   */
  function animate() {
    // Update controls if auto-rotate is enabled
    controls.update()
    // console.log('Initial camera position:', camera.position)
    // Render scene
    renderer.render(scene, camera)
    // Optimisation manuelle
    cubesArray.forEach(cube => {
      // Si le cube est trop loin derrière la caméra (z > 10) 
      // ou trop loin devant (z < -100)
      if (cube.position.z > 25 || cube.position.z < -190) {
        cube.visible = false; // Désactive complètement le rendu pour ce cube
      } else {
        cube.visible = true;
      }
    });
    // Request next frame
    requestAnimationFrame(animate)
  }

  animate()

  // Handle window resize
  const handleResize = () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    renderer.setSize(sizes.width, sizes.height)
  }

  window.addEventListener('resize', handleResize)

  // Cleanup function
  return () => {
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('click', onCubeClick)

    scene.remove(cubeGrid)
    cubesArray.forEach(model => {
      model.traverse((child) => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose())
          } else {
            child.material.dispose()
          }
        }
      })
    })

    // Nettoyer GSAP et ScrollTrigger
    if (scrollTimeline) scrollTimeline.kill()
    ScrollTrigger.getAll().forEach(trigger => trigger.kill())

    // Nettoyer le scroll container
    const scrollContainer = document.querySelector('.scroll-container')
    if (scrollContainer) {
      scrollContainer.remove()
    }
    renderer.dispose()
    // controls.dispose()
  }
}
