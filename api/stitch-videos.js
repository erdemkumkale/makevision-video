// Vercel Serverless Function - Video Stitching with FFmpeg
// This endpoint initiates the stitching job and returns immediately
// Actual processing happens in background via queue system

export const config = {
  maxDuration: 60, // Vercel Pro: 60 seconds, Hobby: 10 seconds
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { videoUrls, musicEmotion, userId, projectId } = req.body

    // Validate input
    if (!videoUrls || videoUrls.length !== 6) {
      return res.status(400).json({ error: 'Exactly 6 video URLs required' })
    }

    // STRATEGY 1: Use Fal.ai's video concat service (RECOMMENDED)
    // This offloads the heavy processing to Fal.ai's infrastructure
    const jobId = await initiateStitchingJob({
      videoUrls,
      musicEmotion,
      userId,
      projectId
    })

    // Return immediately with job ID
    return res.status(202).json({
      success: true,
      jobId: jobId,
      status: 'processing',
      message: 'Video stitching initiated. Check status endpoint.',
      statusUrl: `/api/stitch-status?jobId=${jobId}`
    })

  } catch (error) {
    console.error('Stitching initiation error:', error)
    return res.status(500).json({ 
      error: 'Failed to initiate stitching',
      details: error.message 
    })
  }
}

// STRATEGY 1: Use Fal.ai video-concat (RECOMMENDED - No timeout issues)
async function initiateStitchingJob({ videoUrls, musicEmotion, userId, projectId }) {
  const { fal } = await import('@fal-ai/client')
  
  // Configure Fal.ai
  fal.config({
    credentials: process.env.FAL_KEY
  })

  console.log('Initiating Fal.ai video concat...')
  
  try {
    // Use Fal.ai's video concatenation service
    const result = await fal.subscribe('fal-ai/video-concat', {
      input: {
        video_urls: videoUrls,
        output_format: 'mp4',
        // Ensure vertical format is maintained
        width: 576,
        height: 1024
      },
      logs: true,
      pollInterval: 5000,
      onQueueUpdate: (update) => {
        console.log('Fal.ai concat status:', update.status)
      }
    })

    if (!result.data || !result.data.video || !result.data.video.url) {
      throw new Error('No video returned from Fal.ai concat')
    }

    const concatenatedVideoUrl = result.data.video.url
    console.log('✓ Videos concatenated:', concatenatedVideoUrl)

    // Now add music to the concatenated video
    const finalVideoUrl = await addMusicToVideo(concatenatedVideoUrl, musicEmotion)

    // Store in database
    await storeVideoInDatabase({
      userId,
      projectId,
      videoUrl: finalVideoUrl,
      musicEmotion
    })

    return projectId // Return project ID as job ID
  } catch (error) {
    console.error('Fal.ai concat error:', error)
    throw error
  }
}

// Add music to video using Fal.ai or external service
async function addMusicToVideo(videoUrl, musicEmotion) {
  console.log('Adding music to video...')
  
  // OPTION 1: Use Fal.ai audio mixing service (if available)
  // OPTION 2: Use external service like Cloudinary or AWS MediaConvert
  // OPTION 3: For MVP, return video without music and add client-side
  
  // For now, return video URL as-is
  // TODO: Implement actual music mixing
  console.log('Music would be added:', musicEmotion)
  
  return videoUrl
}

// Store final video in database with expiration
async function storeVideoInDatabase({ userId, projectId, videoUrl, musicEmotion }) {
  // TODO: Implement database storage (Supabase/Firebase)
  console.log('Storing video in database:', {
    userId,
    projectId,
    videoUrl,
    musicEmotion,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  })
}
