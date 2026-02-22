import { fal } from '@fal-ai/client'

// Verify key immediately
console.log('=== FAL.AI KEY VERIFICATION ===')
console.log('Verifying Key:', import.meta.env.VITE_FAL_KEY ? 'Present' : 'MISSING')
console.log('Key value:', import.meta.env.VITE_FAL_KEY)
console.log('All env vars:', import.meta.env)

const FAL_KEY = import.meta.env.VITE_FAL_KEY

if (!FAL_KEY) {
  console.error('CRITICAL: FAL_KEY is missing from environment variables!')
}

console.log('FAL Key check:', FAL_KEY ? 'Key Found' : 'Key Missing')
console.log('FAL Key preview:', FAL_KEY ? `${FAL_KEY.substring(0, 15)}...` : 'MISSING')

// Configure Fal.ai client with explicit credentials
fal.config({
  credentials: FAL_KEY
})

console.log('Fal.ai client configured')
console.log('================================')

export async function faceSwap(sourceImageUrl, targetImageUrl) {
  console.log('Starting face swap with maximum fidelity...')
  console.log('Source (user portrait):', sourceImageUrl.substring(0, 50) + '...')
  console.log('Target (generated image):', targetImageUrl.substring(0, 50) + '...')
  
  try {
    const result = await fal.subscribe('fal-ai/face-swap', {
      input: {
        base_image_url: targetImageUrl,
        swap_image_url: sourceImageUrl
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          console.log('Face swap progress:', update.logs)
        }
      }
    })

    console.log('Face swap result:', result)
    
    if (result.data && result.data.image && result.data.image.url) {
      console.log('✓ Face swap successful with maximum fidelity!')
      return result.data.image.url
    }
    
    throw new Error('No swapped image returned')
  } catch (error) {
    console.error('Face swap error:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    throw error
  }
}

export async function faceSwapVideo(sourceImageUrl, targetVideoUrl, onProgress) {
  console.log('Starting video face swap for consistent likeness...')
  console.log('Source (user portrait):', sourceImageUrl.substring(0, 50) + '...')
  console.log('Target (generated video):', targetVideoUrl.substring(0, 50) + '...')
  
  try {
    const result = await fal.subscribe('fal-ai/face-swap/video', {
      input: {
        video_url: targetVideoUrl,
        face_url: sourceImageUrl
      },
      logs: true,
      pollInterval: 5000, // Poll every 5 seconds
      onQueueUpdate: (update) => {
        console.log('Face swap update:', update)
        if (update.status === 'IN_PROGRESS') {
          console.log('Video face swap progress:', update.logs)
          if (onProgress) onProgress('Applying face swap... ' + (update.logs?.[0] || ''))
        }
        if (update.status === 'IN_QUEUE') {
          console.log('Face swap in queue, waiting...')
          if (onProgress) onProgress('Face swap in queue...')
        }
      }
    })

    console.log('Video face swap result:', result)
    
    if (result.data && result.data.video && result.data.video.url) {
      console.log('✓ Video face swap successful!')
      return result.data.video.url
    }
    
    throw new Error('No swapped video returned')
  } catch (error) {
    console.error('Video face swap error:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    throw error
  }
}

export async function generateVideo(imageUrl, motionPrompt, portraitUrl, onProgress) {
  console.log('=== GENERATING CINEMATIC VIDEO - START ===')
  console.log('FAL VIDEO INPUT:', {
    image_url: imageUrl,
    prompt: motionPrompt,
    portrait_url: portraitUrl
  })
  console.log('Image URL length:', imageUrl?.length)
  console.log('Prompt length:', motionPrompt?.length)
  console.log('Portrait URL length:', portraitUrl?.length)
  
  // Validate inputs
  if (!imageUrl) {
    console.error('CRITICAL: Image URL is missing!')
    throw new Error('Image URL is required for video generation')
  }
  
  if (!motionPrompt) {
    console.error('CRITICAL: Motion prompt is missing!')
    throw new Error('Motion prompt is required for video generation')
  }
  
  try {
    // Step 1: Generate high-end cinematic video using Kling AI
    console.log('Step 1: Calling Kling AI Video API...')
    console.log('API Endpoint: fal-ai/kling-video/v1/standard/image-to-video')
    if (onProgress) onProgress('Rendering cinematic motion...')
    
    const klingInput = {
      prompt: motionPrompt,
      image_url: imageUrl,
      duration: "10", // 10 seconds per clip for high-end cinematic feel
      aspect_ratio: "9:16" // MANDATORY: Vertical format for mobile-first experience, NO pillarboxing
    }
    
    console.log('Kling AI Input:', JSON.stringify(klingInput, null, 2))
    
    // Use Kling AI for high-end cinematic quality
    const result = await fal.subscribe('fal-ai/kling-video/v1/standard/image-to-video', {
      input: klingInput,
      logs: true,
      pollInterval: 5000, // Poll every 5 seconds
      onQueueUpdate: (update) => {
        console.log('Kling AI queue update:', update)
        if (update.status === 'IN_PROGRESS') {
          console.log('Kling AI progress:', update.logs)
          if (onProgress) onProgress('Rendering cinematic motion... ' + (update.logs?.[0] || ''))
        }
        if (update.status === 'IN_QUEUE') {
          console.log('Kling AI in queue, waiting...')
          if (onProgress) onProgress('In production queue...')
        }
      }
    })

    console.log('Kling AI Response:', JSON.stringify(result, null, 2))
    
    if (!result.data || !result.data.video || !result.data.video.url) {
      console.error('CRITICAL: Invalid video result structure:', result)
      throw new Error('No video generated - invalid response structure')
    }
    
    const baseVideoUrl = result.data.video.url
    console.log('✓ Cinematic base video generated successfully!')
    console.log('Video URL:', baseVideoUrl)
    
    // Step 2: Apply face swap to video for consistent likeness
    if (portraitUrl) {
      console.log('Step 2: Applying face swap to video...')
      if (onProgress) onProgress('Applying face swap...')
      
      try {
        const swappedVideoUrl = await faceSwapVideo(portraitUrl, baseVideoUrl, onProgress)
        console.log('✓ Final cinematic video with face swap:', swappedVideoUrl)
        if (onProgress) onProgress('Complete!')
        return swappedVideoUrl
      } catch (swapError) {
        console.error('FACE SWAP ERROR:', swapError)
        console.error('Face swap error details:', JSON.stringify(swapError, null, 2))
        if (onProgress) onProgress('Face swap failed, using base video')
        // Return base video if face swap fails
        return baseVideoUrl
      }
    }
    
    if (onProgress) onProgress('Complete!')
    console.log('=== CINEMATIC VIDEO GENERATION - SUCCESS ===')
    return baseVideoUrl
    
  } catch (error) {
    console.error('=== VIDEO GENERATION ERROR ===')
    console.error('PRODUCTION ERROR:', error)
    console.error('Error type:', error.constructor.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    console.error('Full error object:', JSON.stringify(error, null, 2))
    
    // Check for specific error types
    if (error.message && error.message.includes('500')) {
      throw new Error('Fal.ai server error (500). The service may be temporarily unavailable. Please try again.')
    }
    
    if (error.message && error.message.includes('401')) {
      throw new Error('Authentication failed. Please check your Fal.ai API key.')
    }
    
    if (error.message && error.message.includes('timeout')) {
      throw new Error('Video generation timed out. Please try again.')
    }
    
    if (error.message && error.message.includes('404')) {
      throw new Error('Model not found. Please check the API endpoint.')
    }
    
    throw error
  }
}

export async function stitchVideos(videoUrls, onProgress) {
  console.log('=== STITCHING CINEMATIC MOVIE ===')
  console.log('Number of videos to stitch:', videoUrls.length)
  console.log('Video URLs:', videoUrls)
  
  if (!videoUrls || videoUrls.length === 0) {
    throw new Error('No videos to stitch')
  }
  
  try {
    if (onProgress) onProgress('Merging scenes into final movie...')
    
    // STRATEGY 1: Use Fal.ai video-concat (RECOMMENDED - No timeout issues)
    console.log('Calling Fal.ai video-concat service...')
    
    const concatInput = {
      video_urls: videoUrls,
      output_format: 'mp4',
      // Maintain vertical format
      width: 576,
      height: 1024
    }
    
    console.log('FFmpeg concat input:', JSON.stringify(concatInput, null, 2))
    
    const result = await fal.subscribe('fal-ai/video-concat', {
      input: concatInput,
      logs: true,
      pollInterval: 5000,
      onQueueUpdate: (update) => {
        console.log('FFmpeg concat update:', update)
        if (update.status === 'IN_PROGRESS') {
          console.log('Stitching progress:', update.logs)
          if (onProgress) onProgress('Stitching scenes... ' + (update.logs?.[0] || ''))
        }
        if (update.status === 'IN_QUEUE') {
          console.log('Concat in queue...')
          if (onProgress) onProgress('Waiting to stitch...')
        }
      }
    })
    
    console.log('FFmpeg concat result:', JSON.stringify(result, null, 2))
    
    if (!result.data || !result.data.video || !result.data.video.url) {
      console.error('CRITICAL: Invalid concat result:', result)
      // Fallback: return individual videos
      console.log('Falling back to individual videos')
      return {
        success: false,
        videos: videoUrls,
        finalVideo: null,
        message: 'Stitching failed - videos available individually'
      }
    }
    
    const finalVideoUrl = result.data.video.url
    console.log('✓ Final 60-second movie created:', finalVideoUrl)
    
    if (onProgress) onProgress('Movie complete!')
    
    return {
      success: true,
      videos: videoUrls,
      finalVideo: finalVideoUrl,
      message: 'Your 60-second cinematic masterpiece is ready!'
    }
  } catch (error) {
    console.error('Video stitching error:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    
    // Fallback: return individual videos if stitching fails
    console.log('Stitching failed, returning individual videos')
    return {
      success: false,
      videos: videoUrls,
      finalVideo: null,
      message: 'Stitching failed - videos available individually',
      error: error.message
    }
  }
}

// ALTERNATIVE: Backend API approach (for custom FFmpeg processing)
export async function stitchVideosViaBackend(videoUrls, musicEmotion, userId, projectId) {
  console.log('=== STITCHING VIA BACKEND API ===')
  
  try {
    // Call backend API to initiate stitching job
    const response = await fetch('/api/stitch-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoUrls,
        musicEmotion,
        userId,
        projectId
      })
    })

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`)
    }

    const result = await response.json()
    console.log('Backend response:', result)

    // If job initiated successfully, poll for status
    if (result.jobId) {
      return await pollJobStatus(result.jobId)
    }

    return result
  } catch (error) {
    console.error('Backend stitching error:', error)
    throw error
  }
}

// Poll backend for job completion
async function pollJobStatus(jobId, maxAttempts = 60) {
  console.log('Polling job status:', jobId)
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
    
    try {
      const response = await fetch(`/api/stitch-status?jobId=${jobId}`)
      const status = await response.json()
      
      console.log(`Job status (attempt ${attempt + 1}):`, status)
      
      if (status.status === 'completed') {
        return {
          success: true,
          finalVideo: status.videoUrl,
          message: 'Video ready!'
        }
      }
      
      if (status.status === 'failed') {
        throw new Error(status.message || 'Job failed')
      }
      
      // Still processing, continue polling
    } catch (error) {
      console.error('Status poll error:', error)
      if (attempt === maxAttempts - 1) throw error
    }
  }
  
  throw new Error('Job timeout - took too long to complete')
}

export async function generateImage(prompt, referenceImageUrl) {
  console.log('Fal.ai generating image for prompt:', prompt.substring(0, 50) + '...')
  console.log('Reference image provided:', !!referenceImageUrl)
  
  try {
    // Step 1: Generate base image with Flux Dev (better quality for face swap)
    console.log('Step 1: Generating base image with Flux Dev...')
    const result = await fal.subscribe('fal-ai/flux/dev', {
      input: {
        prompt: prompt,
        image_size: {
          width: 576,  // 9:16 vertical format (mobile-first)
          height: 1024
        },
        num_inference_steps: 35, // Higher steps for high-fidelity, minimal AI glitches
        guidance_scale: 4.0, // Stronger guidance for better composition
        num_images: 1,
        enable_safety_checker: true
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          console.log('Flux Dev generation progress:', update.logs)
        }
      }
    })

    console.log('Base image generation result:', result)
    
    if (!result.data || !result.data.images || result.data.images.length === 0) {
      throw new Error('No image generated')
    }
    
    const baseImageUrl = result.data.images[0].url
    console.log('✓ Base image generated with Flux Dev:', baseImageUrl)
    
    // Step 2: Sequential face swap with maximum fidelity
    if (referenceImageUrl) {
      console.log('Step 2: Applying face swap for premium likeness...')
      try {
        const swappedImageUrl = await faceSwap(referenceImageUrl, baseImageUrl)
        console.log('✓ Final image with premium face swap:', swappedImageUrl)
        return swappedImageUrl
      } catch (swapError) {
        console.error('Face swap failed, returning base image:', swapError)
        // Return base image if face swap fails
        return baseImageUrl
      }
    }
    
    return baseImageUrl
  } catch (error) {
    console.error('Fal.ai error:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    throw error
  }
}

export async function generateAllVisionImages(directorPrompts, portraitUrl) {
  console.log('Starting batch image generation with face swap...')
  
  const categories = ['abundance', 'home', 'health', 'relationships', 'travel', 'wildcard']
  const results = {}
  
  for (const category of categories) {
    try {
      console.log(`Generating ${category} image...`)
      const imageUrl = await generateImage(directorPrompts[category], portraitUrl)
      results[category] = {
        success: true,
        url: imageUrl,
        error: null
      }
    } catch (error) {
      console.error(`Failed to generate ${category}:`, error)
      results[category] = {
        success: false,
        url: null,
        error: error.message
      }
    }
  }
  
  return results
}
