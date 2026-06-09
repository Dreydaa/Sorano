
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
  scene.background = new THREE.Color(0x111122)

  const gui = new GUI({ title: 'Parallax Settings', width: 300 })

  const cameraFolder = gui.addFolder('Camera')
  cameraFolder.open()

  const textureLoader = new THREE.TextureLoader()


  /**
   * Fonction pour créer une grille de cubes en diagonale
   */
  function createCubeGrid() {
    const count = 128
    const cubeGroup = new THREE.Group()
    const cubesArray = [] // Tableau pour stocker les cubes individuellement

    // Paramètres des cubes
    const geometry = new THREE.BoxGeometry(2, 2, 0.1)

    // Matériau avec couleur variable
    const materials = [
      new THREE.MeshStandardMaterial({ color: 0x3498db, metalness: 0.3, roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: 0xe74c3c, metalness: 0.3, roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: 0x2ecc71, metalness: 0.3, roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: 0xf39c12, metalness: 0.3, roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: 0x9b59b6, metalness: 0.3, roughness: 0.4 }),
    ]

    for (let i = 0; i < count; i++) {
      // Créer le cube
      const material = materials[i % materials.length]
      const cube = new THREE.Mesh(geometry, material)
      cube.castShadow = true
      cube.receiveShadow = true

      // Position en diagonale
      cube.position.set(
        i * 0,        // Déplacement vers la droite
        i * 0.75,        // Déplacement vers le haut (60% du décalage X)
        -i * 1.5    // Espacement régulier sur Z (vers l'arrière)
      )

      // console.log('cube position:', cube.position)

      // Stocker les infos pour l'animation
      cube.userData.originalPosition = cube.position.clone()
      cube.userData.index = i
      cube.userData.zDepth = -i * 1.5 // Profondeur Z négative

      cubeGroup.add(cube)
      cubesArray.push(cube)
    }

    // Centrer le groupe
    cubeGroup.position.set(0, -2, 5)

    return { group: cubeGroup, cubes: cubesArray }
  }

  // Créer et ajouter la grille de cubes
  const { group: cubeGrid, cubes: cubesArray } = createCubeGrid()
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


  // --- GESTION DU CLIC & CENTRAGE ---
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

 const onCubeClick = (event) => {
    mouse.x = (event.clientX / sizes.width) * 2 - 1
    mouse.y = -(event.clientY / sizes.height) * 2 + 1

    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(cubesArray)

    if (intersects.length > 0) {
      const clickedCube = intersects[0].object
      const cubeIndex = clickedCube.userData.index

      // Position cible du cube
      const targetPos = new THREE.Vector3()
      clickedCube.getWorldPosition(targetPos)
      console.log('cube position:', clickedCube.position)

      // Bloquer les contrôles pendant l'animation
      controls.enabled = false

      const tl = gsap.timeline({
        onComplete: () => {
          if (options.onCubeClick) {
            options.onCubeClick(cubeIndex)
          }
          // Optionnel: réactiver les contrôles après ? 
          // controls.enabled = true 
        }
      })

      // ANIMATION DE CENTRAGE PARFAIT
      // On déplace la caméra ET la cible des contrôles vers le cube
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
        // On garde le Z actuel pour conserver le zoom orthographique
        z: camera.position.z,
        duration: 1.25,
        ease: "power3.inOut",
        onUpdate: () => {
          // Indispensable pour que la caméra recalcule son angle
          camera.lookAt(controls.target)
        }
      }, 0)

      const track = options.playlist ? options.playlist.find(t => t.index === cubeIndex) : null;
      const coverUrl = track ? track.covertArt : null;

      const viewHeight = camera.top - camera.bottom;
      const targetSize = viewHeight * 0.48; // 60vh
      const scaleFactor = targetSize / 2; // /2 car le cube fait 2 unités de base

      // Appliquer la texture si on a l'URL
      if (coverUrl) {
        textureLoader.load(coverUrl, (texture) => {
          clickedCube.material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.3,
            metalness: 0.1
          });
          clickedCube.material.map = texture;
          clickedCube.material.needsUpdate = true;
        });
      }

      // Animation de mise à l'échelle (pendant que les autres disparaissent)
      tl.to(clickedCube.scale, {
        x: scaleFactor,
        y: scaleFactor,
        z: 1, // On garde une petite épaisseur
        duration: 6,
        ease: "expo.out"
      }, 1.0);

      // DISPARITION DES AUTRES CUBES
      cubesArray.forEach(cube => {
        if (cube !== clickedCube) {
          tl.to(cube.scale, {
            x: 0,
            y: 0,
            z: 0,
            duration: 0.8,
            ease: "power2.in"
          }, 0)
        }
      })

      // PAUSE DE 3 SECONDES
      tl.to({}, { duration: 0 })
    }
  }

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

        onLeave: (self) => self.scroll(1), // Boucle infinie : quand on arrive en bas, on remonte en haut
        onLeaveBack: (self) => self.scroll(self.end - 1) // Boucle infinie : quand on arrive en haut, on descend en bas
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
        z: gsap.utils.unitize(gsap.utils.wrap(-moveZ + 25, 25)),
        y: gsap.utils.unitize(gsap.utils.wrap(-moveY + 5, 5))
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

  camera.position.set(9.68, 7.82, 20)  // Vue trois-quarts*
  // (9.68, 7.82, 20)
  // camera.position.set(0, 5, 10)  // Vue trois-quarts*
  // (2.92, 3.18, 7.28) 
  camera.lookAt(0, 0, 0)


  // const cameraSettings = {
  //     fov: 45,
  //     near: 0.1,
  //     far: 1000,
  //     x: 9.68,
  //     y: 7.82,
  //     z: 20,
  //     update: () => {
  //       camera.fov = cameraSettings.fov
  //       camera.near = cameraSettings.near
  //       camera.far = cameraSettings.far
  //       camera.position.set(cameraSettings.x, cameraSettings.y, cameraSettings.z)
  //       camera.updateProjectionMatrix()
  //       controls.target.set(0, 0, 0)
  //       controls.update()
  //     }
  //   }

  //   cameraFolder.add(cameraSettings, 'fov', 20, 120).onChange(() => cameraSettings.update())
  //   cameraFolder.add(cameraSettings, 'near', 0.01, 10).onChange(() => cameraSettings.update())
  //   cameraFolder.add(cameraSettings, 'far', 100, 2000).onChange(() => cameraSettings.update())
  //   cameraFolder.add(cameraSettings, 'x', -10, 20).onChange(() => cameraSettings.update())
  //   cameraFolder.add(cameraSettings, 'y', -10, 20).onChange(() => cameraSettings.update())
  //   cameraFolder.add(cameraSettings, 'z', -10, 20).onChange(() => cameraSettings.update())
  //   cameraFolder.add({ reset: () => {
  //     cameraSettings.fov = 45
  //     cameraSettings.near = 0.1
  //     cameraSettings.far = 1000
  //     cameraSettings.x = 6
  //     cameraSettings.y = 5
  //     cameraSettings.z = 6
  //     cameraSettings.update()
  //   } }, 'reset').name('Reset Camera')


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
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5)
  scene.add(ambientLight)

  const ambientSettings = {
    color: '#404040',
    intensity: 0.5,
    update: () => {
      ambientLight.color.set(ambientSettings.color)
      ambientLight.intensity = ambientSettings.intensity
    }
  }

  // Directional Light (Main Light)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(2, 3, 4)
  directionalLight.castShadow = true
  directionalLight.receiveShadow = true
  scene.add(directionalLight)

  // Fill Light (Point Light)
  const pointLight = new THREE.PointLight(0xffaa66, 0.5)
  pointLight.position.set(1, 2, 2)
  scene.add(pointLight)

  // Back Rim Light
  const backLight = new THREE.PointLight(0x4466ff, 0.3)
  backLight.position.set(-2, 1, -3)
  scene.add(backLight)

  // Optional: Add a simple grid helper and axes helper for reference
  const gridHelper = new THREE.GridHelper(10, 20, 0x888888, 0x444444)
  scene.add(gridHelper)

  const axesHelper = new THREE.AxesHelper(5)
  axesHelper.visible = false

  scene.add(axesHelper)

  /**
   * Renderer
   */
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
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
    // controls.update()
    // console.log('Initial camera position:', camera.position)
    // Render scene
    renderer.render(scene, camera)

    // Optimisation manuelle
  cubesArray.forEach(cube => {
    // Si le cube est trop loin derrière la caméra (z > 10) 
    // ou trop loin devant (z < -100)
    if (cube.position.z > 20 || cube.position.z < -196) {
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
    cubesArray.forEach(cube => {
      cube.geometry.dispose()
      cube.material.dispose()
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

