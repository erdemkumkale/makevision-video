// LocalStorage utilities for state persistence

const STORAGE_KEYS = {
  GALLERY_STATE: 'mvb_gallery_state',
  VISION_DATA: 'mvb_vision_data',
  PRODUCTION_SCENES: 'mvb_production_scenes',
  FINAL_VIDEO: 'mvb_final_video'
}

export const saveGalleryState = (data) => {
  try {
    localStorage.setItem(STORAGE_KEYS.GALLERY_STATE, JSON.stringify(data))
    console.log('✓ Gallery state saved to localStorage')
  } catch (error) {
    console.error('Failed to save gallery state:', error)
  }
}

export const loadGalleryState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.GALLERY_STATE)
    if (saved) {
      console.log('✓ Gallery state loaded from localStorage')
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('Failed to load gallery state:', error)
  }
  return null
}

export const saveProductionScenes = (scenes) => {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTION_SCENES, JSON.stringify(scenes))
    console.log('✓ Production scenes saved to localStorage')
  } catch (error) {
    console.error('Failed to save production scenes:', error)
  }
}

export const loadProductionScenes = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTION_SCENES)
    if (saved) {
      console.log('✓ Production scenes loaded from localStorage')
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('Failed to load production scenes:', error)
  }
  return null
}

export const saveFinalVideo = (videoUrl) => {
  try {
    localStorage.setItem(STORAGE_KEYS.FINAL_VIDEO, videoUrl)
    console.log('✓ Final video URL saved to localStorage')
  } catch (error) {
    console.error('Failed to save final video:', error)
  }
}

export const loadFinalVideo = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.FINAL_VIDEO)
    if (saved) {
      console.log('✓ Final video URL loaded from localStorage')
      return saved
    }
  } catch (error) {
    console.error('Failed to load final video:', error)
  }
  return null
}

export const clearAllStorage = () => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
    console.log('✓ All storage cleared')
  } catch (error) {
    console.error('Failed to clear storage:', error)
  }
}

