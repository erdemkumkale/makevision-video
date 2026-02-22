import { useState, useEffect } from 'react'
import VisionCard from './VisionCard'
import { generateImage } from '../services/falai'
import { saveGalleryState, loadGalleryState } from '../utils/storage'

const categories = ['abundance', 'home', 'health', 'relationships', 'travel', 'wildcard']

export default function PreviewGallery({ visionData, onStartFullProduction, existingCardStates }) {
  const [cardStates, setCardStates] = useState(
    existingCardStates || categories.reduce((acc, cat) => ({
      ...acc,
      [cat]: {
        selectedVersion: 1,
        isGenerating: true,
        generationError: null,
        regenerateCount: 0, // Track regenerate usage
        versions: {
          1: null,
          2: null
        }
      }
    }), {})
  )

  // Only generate images if we don't have existing states
  useEffect(() => {
    if (!existingCardStates) {
      // Try to load from localStorage first
      const savedState = loadGalleryState()
      if (savedState && savedState.cardStates) {
        console.log('Loading gallery from localStorage...')
        setCardStates(savedState.cardStates)
      } else {
        console.log('No saved state, generating new images...')
        generateInitialImages()
      }
    }
  }, [])

  // Save to localStorage whenever cardStates change
  useEffect(() => {
    if (cardStates && Object.values(cardStates).some(state => state.versions[1])) {
      console.log('Saving gallery state to localStorage...')
      saveGalleryState({ cardStates, visionData })
    }
  }, [cardStates])

  const generateInitialImages = async () => {
    console.log('Generating initial images with Fal.ai...')
    
    for (const category of categories) {
      try {
        const imageUrl = await generateImage(
          visionData.directorPrompts.imagePrompts[category],
          visionData.portrait
        )
        
        setCardStates(prev => ({
          ...prev,
          [category]: {
            ...prev[category],
            isGenerating: false,
            versions: {
              ...prev[category].versions,
              1: imageUrl
            }
          }
        }))
      } catch (error) {
        console.error(`Failed to generate ${category}:`, error)
        setCardStates(prev => ({
          ...prev,
          [category]: {
            ...prev[category],
            isGenerating: false,
            generationError: error.message
          }
        }))
      }
    }
  }

  const handleRegenerate = async (category) => {
    console.log(`Regenerating ${category}...`)
    
    // Check if already used regenerate
    if (cardStates[category].regenerateCount >= 1) {
      console.log('Regenerate limit reached for', category)
      return
    }

    // Set generating state
    setCardStates(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        isGenerating: true,
        generationError: null
      }
    }))

    try {
      const imageUrl = await generateImage(
        visionData.directorPrompts.imagePrompts[category],
        visionData.portrait
      )
      
      setCardStates(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          isGenerating: false,
          regenerateCount: prev[category].regenerateCount + 1,
          selectedVersion: 2, // Switch to version 2
          versions: {
            ...prev[category].versions,
            2: imageUrl
          }
        }
      }))
      
      console.log(`✓ ${category} regenerated successfully`)
    } catch (error) {
      console.error(`Failed to regenerate ${category}:`, error)
      setCardStates(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          isGenerating: false,
          generationError: error.message
        }
      }))
    }
  }

  const handleGenerateFullMovie = () => {
    // Bypass payment for testing
    const confirmed = window.confirm('Ready to generate your full cinematic movie? This will create a complete 60-second video with 6 scenes (10 seconds each).')
    
    if (confirmed) {
      // Collect all images with both image and motion prompts
      const selectedImages = categories.reduce((acc, cat) => ({
        ...acc,
        [cat]: {
          imageUrl: cardStates[cat].versions[cardStates[cat].selectedVersion],
          prompt: visionData.categories[cat],
          imagePrompt: visionData.directorPrompts.imagePrompts[cat],
          motionPrompt: visionData.directorPrompts.motionPrompts[cat]
        }
      }), {})
      
      // Start full movie production with card states for back navigation
      onStartFullProduction(selectedImages, cardStates)
    }
  }

  return (
    <div className="min-h-screen bg-black py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-light mb-2">Your Vision Gallery</h1>
          <p className="text-gray-500">Review and refine your vision</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {categories.map(category => (
            <VisionCard
              key={category}
              category={category}
              prompt={visionData.categories[category]}
              directorPrompt={visionData.directorPrompts?.imagePrompts?.[category]}
              state={cardStates[category]}
              onRegenerate={handleRegenerate}
            />
          ))}
        </div>

        <div className="max-w-2xl mx-auto bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-700">
          <div className="text-center space-y-6">
            <div>
              <h2 className="text-2xl font-light mb-2">Ready to Create Your Cinematic Movie?</h2>
              <p className="text-gray-400">
                Transform your 6 visions into a complete 60-second cinematic masterpiece (10 seconds per scene)
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl font-light">$20</span>
              <span className="text-gray-500">one-time</span>
            </div>

            <button
              onClick={handleGenerateFullMovie}
              className="w-full py-4 bg-white text-black font-medium rounded-full hover:bg-gray-100 transition-all duration-300 hover:scale-105"
            >
              Generate 60-Second Cinematic Movie ($20)
            </button>

            <p className="text-xs text-gray-600">
              Powered by Lemon Squeezy • Secure Payment
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
