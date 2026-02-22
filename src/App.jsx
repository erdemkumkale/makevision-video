import { useState } from 'react'
import LoginScreen from './components/LoginScreen'
import VisionForm from './components/VisionForm'
import PreviewGallery from './components/PreviewGallery'
import LoadingScreen from './components/LoadingScreen'
import MovieStudio from './components/MovieStudio'
import FinalMovie from './components/FinalMovie'
import { generateVisionPrompts, analyzePortrait } from './services/gemini'
import { generateVideo, stitchVideos } from './services/falai'
import { analyzeEmotionalTone, addMusicToVideo } from './services/music'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [formSubmitted, setFormSubmitted] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isProducingMovie, setIsProducingMovie] = useState(false)
  const [movieComplete, setMovieComplete] = useState(false)
  const [error, setError] = useState(null)
  const [productionScenes, setProductionScenes] = useState([])
  const [productionProgress, setProductionProgress] = useState(0)
  const [savedCardStates, setSavedCardStates] = useState(null)
  const [finalVideoUrl, setFinalVideoUrl] = useState(null)
  const [selectedMusic, setSelectedMusic] = useState(null)
  const [visionData, setVisionData] = useState({
    portrait: null,
    protagonistDescription: null,
    categories: {
      abundance: '',
      home: '',
      health: '',
      relationships: '',
      travel: '',
      wildcard: ''
    },
    directorPrompts: null
  })

  const handleLogin = () => {
    // Mock Google OAuth - in production, integrate with Google OAuth
    setIsAuthenticated(true)
    
    // Verify API key on login
    import('./utils/verifyApiKey').then(({ verifyGeminiApiKey }) => {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      console.log('Verifying API key...')
      verifyGeminiApiKey(apiKey).then(result => {
        if (result.success) {
          console.log('✓ API Key is valid!')
          console.log('Available models:', result.models)
        } else {
          console.error('✗ API Key verification failed:', result.error)
        }
      })
    })
  }

  const handleFormSubmit = async (data) => {
    console.log('Form submitted with data:', data)
    setIsGenerating(true)
    setFormSubmitted(true) // Immediately transition to loading/gallery state
    setError(null)
    
    try {
      // First, analyze the portrait
      console.log('Step 1: Analyzing portrait...')
      const protagonistDescription = await analyzePortrait(data.portrait)
      console.log('Protagonist description:', protagonistDescription)
      
      // Then generate vision prompts with the protagonist description
      console.log('Step 2: Generating vision prompts...')
      const directorPrompts = await generateVisionPrompts(data.categories, protagonistDescription)
      
      // Step 3: Analyze emotional tone for music selection
      console.log('Step 3: Analyzing emotional tone for music...')
      const emotionalTone = analyzeEmotionalTone(data.categories)
      console.log('Detected emotional tone:', emotionalTone)
      
      setVisionData({
        portrait: data.portrait,
        protagonistDescription: protagonistDescription,
        categories: data.categories,
        directorPrompts,
        emotionalTone: emotionalTone
      })
      console.log('Vision data updated:', { 
        portrait: data.portrait, 
        protagonistDescription,
        categories: data.categories, 
        directorPrompts 
      })
    } catch (err) {
      const errorMessage = err.message || 'Failed to generate vision prompts. Please try again.'
      
      // Check for rate limiting
      if (err.message && err.message.includes('429')) {
        setError('⏱️ Rate limit reached. Please wait 60 seconds and try again. Gemini API has usage limits.')
      } else if (err.message && err.message.includes('quota')) {
        setError('⚠️ API quota exceeded. Please check your Gemini API key billing and quota limits.')
      } else {
        setError(errorMessage)
      }
      
      console.error('Error generating prompts:', err)
      console.error('Full error details:', JSON.stringify(err, null, 2))
      
      // Keep the user on the loading screen with error message instead of going back to form
      // This prevents the "page refresh" feeling
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateMovie = (selectedImages) => {
    // Mock payment integration - ready for Lemon Squeezy
    console.log('Generate movie with selected images:', selectedImages)
    alert('Payment integration ready. Selected images prepared for backend.')
  }

  const startFullMovieProduction = async (selectedImages, cardStates) => {
    console.log('=== STARTING FULL CINEMATIC MOVIE PRODUCTION ===')
    console.log('Selected images:', selectedImages)
    console.log('Card states:', cardStates)
    
    // Save card states for back navigation
    setSavedCardStates(cardStates)
    setIsProducingMovie(true)
    
    // Initialize scenes
    const categories = ['abundance', 'home', 'health', 'relationships', 'travel', 'wildcard']
    const initialScenes = categories.map(cat => ({
      category: cat,
      description: selectedImages[cat].prompt,
      imagePrompt: selectedImages[cat].imagePrompt,
      motionPrompt: selectedImages[cat].motionPrompt,
      imageUrl: selectedImages[cat].imageUrl,
      videoUrl: null,
      status: 'pending',
      statusText: 'Waiting to start...',
      progress: 0
    }))
    
    console.log('Initial scenes:', initialScenes)
    setProductionScenes(initialScenes)
    
    // Process scenes sequentially with detailed progress
    let completedCount = 0
    const completedVideos = []
    
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i]
      const scene = selectedImages[category]
      
      console.log(`\n=== PROCESSING SCENE ${i + 1}/${categories.length}: ${category.toUpperCase()} ===`)
      console.log('Scene data:', scene)
      
      // Validate scene data
      if (!scene.imageUrl) {
        console.error(`CRITICAL: No image URL for ${category}!`)
        setProductionScenes(prev => prev.map((s, idx) => 
          idx === i ? { 
            ...s, 
            status: 'error', 
            statusText: 'No image available', 
            progress: 0 
          } : s
        ))
        continue
      }
      
      if (!scene.motionPrompt) {
        console.error(`CRITICAL: No motion prompt for ${category}!`)
        setProductionScenes(prev => prev.map((s, idx) => 
          idx === i ? { 
            ...s, 
            status: 'error', 
            statusText: 'No motion prompt available', 
            progress: 0 
          } : s
        ))
        continue
      }
      
      // Update status to processing - rendering cinematic motion
      setProductionScenes(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: 'processing', statusText: 'Rendering cinematic motion...', progress: 10 } : s
      ))
      
      try {
        // Generate video with progress callback using motion prompt
        console.log(`Calling generateVideo for ${category}...`)
        console.log('Image URL:', scene.imageUrl)
        console.log('Motion Prompt:', scene.motionPrompt)
        console.log('Portrait URL:', visionData.portrait ? 'Present' : 'Missing')
        
        const videoUrl = await generateVideo(
          scene.imageUrl,
          scene.motionPrompt, // Use motion prompt for dynamic action
          visionData.portrait,
          (progressText) => {
            console.log(`Progress update for ${category}:`, progressText)
            // Update progress text in real-time
            setProductionScenes(prev => prev.map((s, idx) => 
              idx === i ? { 
                ...s, 
                statusText: progressText,
                progress: progressText.includes('Applying face') ? 70 : progressText.includes('Complete') ? 100 : 40
              } : s
            ))
          }
        )
        
        console.log(`✓ Video generated successfully for ${category}:`, videoUrl)
        
        // Update with completed video
        setProductionScenes(prev => prev.map((s, idx) => 
          idx === i ? { 
            ...s, 
            videoUrl, 
            status: 'completed', 
            statusText: 'Scene complete!', 
            progress: 100 
          } : s
        ))
        
        completedVideos.push(videoUrl)
        completedCount++
        setProductionProgress((completedCount / categories.length) * 100)
        
      } catch (error) {
        console.error(`\n=== FAILED TO GENERATE VIDEO FOR ${category.toUpperCase()} ===`)
        console.error('PRODUCTION ERROR:', error)
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
        
        setProductionScenes(prev => prev.map((s, idx) => 
          idx === i ? { 
            ...s, 
            status: 'error', 
            statusText: `Failed: ${error.message}`, 
            progress: 0 
          } : s
        ))
      }
    }
    
    // All scenes complete - stitch videos into ONE 60-second masterpiece
    if (completedVideos.length === categories.length) {
      console.log('\n=== ALL SCENES COMPLETE! STITCHING FINAL CINEMATIC MOVIE ===')
      setProductionScenes(prev => [...prev, {
        category: 'final',
        description: 'Stitching all scenes into one 60-second cinematic movie',
        status: 'processing',
        statusText: 'Creating final movie...',
        progress: 50
      }])
      
      try {
        const stitchResult = await stitchVideos(completedVideos, (progressText) => {
          console.log('Stitch progress:', progressText)
          setProductionScenes(prev => prev.map(s => 
            s.category === 'final' ? {
              ...s,
              statusText: progressText,
              progress: 75
            } : s
          ))
        })
        
        console.log('Stitch result:', stitchResult)
        
        if (stitchResult.success && stitchResult.finalVideo) {
          // Add music to the final video
          console.log('\n=== ADDING EMOTIONAL MUSIC ===')
          setProductionScenes(prev => prev.map(s => 
            s.category === 'final' ? {
              ...s,
              statusText: 'Adding frequency music...',
              progress: 85
            } : s
          ))
          
          const musicResult = await addMusicToVideo(
            stitchResult.finalVideo,
            visionData.emotionalTone
          )
          
          // Store the final stitched video with music
          setFinalVideoUrl(musicResult.videoUrl)
          setSelectedMusic(musicResult.music)
          console.log('✓ Final 60-second movie URL:', musicResult.videoUrl)
          console.log('✓ Music added:', musicResult.music?.name)
        }
        
        setProductionScenes(prev => prev.map(s => 
          s.category === 'final' ? {
            ...s,
            status: 'completed',
            statusText: stitchResult.message,
            progress: 100
          } : s
        ))
      } catch (error) {
        console.error('Failed to stitch videos:', error)
        setProductionScenes(prev => prev.map(s => 
          s.category === 'final' ? {
            ...s,
            status: 'error',
            statusText: 'Stitching failed - videos available individually',
            progress: 0
          } : s
        ))
      }
    }
    
    // All scenes complete
    console.log('=== FULL CINEMATIC MOVIE PRODUCTION COMPLETE ===')
    setMovieComplete(true)
  }

  const handleBackToGallery = () => {
    setIsProducingMovie(false)
    setMovieComplete(false)
    // Keep savedCardStates so gallery doesn't regenerate
  }

  const handleRetry = () => {
    setError(null)
    setFormSubmitted(false)
    setIsGenerating(false)
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />
  }

  if (isGenerating || error) {
    return <LoadingScreen error={error} onRetry={handleRetry} />
  }

  if (movieComplete) {
    return <FinalMovie scenes={productionScenes} onBack={handleBackToGallery} finalVideoUrl={finalVideoUrl} selectedMusic={selectedMusic} />
  }

  if (isProducingMovie) {
    return (
      <MovieStudio 
        scenes={productionScenes} 
        progress={productionProgress}
        onComplete={() => setMovieComplete(true)}
      />
    )
  }

  if (!formSubmitted) {
    return <VisionForm onSubmit={handleFormSubmit} error={error} />
  }

  return (
    <PreviewGallery 
      visionData={visionData} 
      onStartFullProduction={startFullMovieProduction}
      existingCardStates={savedCardStates}
    />
  )
}

export default App
