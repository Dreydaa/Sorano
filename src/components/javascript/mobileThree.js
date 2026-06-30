import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import gsap from 'gsap'
import tracksData from '../data/tracksData.json'

export default function initMobileScene(canvas, options = {}) {
  const scene = new THREE.Scene()
  const sizes = { width: window.innerWidth, height: window.innerHeight }

  // Loader
  const gltfLoader = new GLTFLoader()
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
  gltfLoader.setDRACOLoader(dracoLoader)

  // Camera
  const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100)
  camera.position.set(0, 0, 6)
  scene.add(camera)

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 2))
  const dirLight = new THREE.DirectionalLight(0xffffff, 3)
  dirLight.position.set(5, 10, 5)
  scene.add(dirLight)

  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true

  // State
  let currentIndex = 0
  let currentModel = null
  let isAnimating = false
  const modelsCache = new Map()

  function setupModel(model) {
    const box = new THREE.Box3().setFromObject(model)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)

    model.traverse(child => {
      if (child.isMesh) child.geometry.translate(-center.x, -center.y, -center.z)
    })

    const scale = 2.5 / Math.max(size.x, size.y)
    model.scale.set(scale, scale, scale)
    return model
  }

  function loadModel(index) {
    return new Promise(resolve => {
      const track = tracksData[index]
      if (!track?.modelPath) return resolve(null)

      if (modelsCache.has(track.modelPath)) {
        resolve(setupModel(modelsCache.get(track.modelPath).clone()))
        return
      }

      gltfLoader.load(track.modelPath, gltf => {
        modelsCache.set(track.modelPath, gltf.scene)
        resolve(setupModel(gltf.scene.clone()))
      }, undefined, err => {
        console.error('Model load error:', err)
        resolve(null)
      })
    })
  }

  async function showModel(index, direction = 1) {
    if (isAnimating) return
    isAnimating = true

    const newModel = await loadModel(index)
    if (!newModel) { isAnimating = false; return }

    newModel.position.x = direction * 10
    newModel.position.y = 0
    scene.add(newModel)

    if (currentModel) {
      const old = currentModel
      gsap.to(old.position, {
        x: -direction * 10,
        duration: 0.5,
        ease: 'power2.inOut',
        onComplete: () => scene.remove(old)
      })
    }

    gsap.to(newModel.position, {
      x: 0,
      duration: 0.5,
      ease: 'power2.inOut',
      onComplete: () => { isAnimating = false }
    })

    currentModel = newModel
    currentIndex = index
  }

  // Initial load
  showModel(0)

  // Swipe detection
  let touchStartX = 0
  let touchStartY = 0

  const onTouchStart = e => {
    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY
  }

  const onTouchEnd = e => {
    const dx = e.changedTouches[0].clientX - touchStartX
    const dy = e.changedTouches[0].clientY - touchStartY
    if (Math.abs(dx) < Math.abs(dy) || Math.abs(dx) < 50) return

    if (dx < 0) {
      const next = (currentIndex + 1) % tracksData.length
      showModel(next, 1)
      if (options.onTrackChange) options.onTrackChange(next, 1)
    } else {
      const prev = (currentIndex - 1 + tracksData.length) % tracksData.length
      showModel(prev, -1)
      if (options.onTrackChange) options.onTrackChange(prev, -1)
    }
  }

  // Sync depuis React (skip btn)
  const handleTrackChange = e => {
    const { cubeIndex, direction } = e.detail
    if (cubeIndex !== currentIndex) {
      showModel(cubeIndex, direction || 1)
    }
  }

  canvas.addEventListener('touchstart', onTouchStart, { passive: true })
  canvas.addEventListener('touchend', onTouchEnd, { passive: true })
  window.addEventListener('trackChanged', handleTrackChange)

  // Auto-rotate
  function animate() {
    if (currentModel) currentModel.rotation.y += 0.004
    renderer.render(scene, camera)
    requestAnimationFrame(animate)
  }
  animate()

  const handleResize = () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    renderer.setSize(sizes.width, sizes.height)
  }
  window.addEventListener('resize', handleResize)

  return () => {
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('trackChanged', handleTrackChange)
    canvas.removeEventListener('touchstart', onTouchStart)
    canvas.removeEventListener('touchend', onTouchEnd)
    renderer.dispose()
  }
}