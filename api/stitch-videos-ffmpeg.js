// ALTERNATIVE APPROACH: FFmpeg-based stitching
// WARNING: This approach has timeout risks on Vercel
// Use this only if Fal.ai video-concat is not available

import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import fetch from 'node-fetch'

const execAsync = promisify(exec)

export const config = {
  maxDuration: 60, // Maximum for Vercel Pro
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { videoUrls, musicUrl } = req.body

    // CRITICAL: For Vercel, we must use a queue system
    // This endpoint should only initiate the job, not process it
    
    // RECOMMENDED: Use a background job queue like:
    // - Vercel Cron Jobs
    // - AWS Lambda
    // - Railway/Render (longer timeouts)
    // - Cloudflare Workers (Durable Objects)
    
    return res.status(501).json({
      error: 'Direct FFmpeg processing not recommended on Vercel',
      recommendation: 'Use Fal.ai video-concat service instead',
      alternative: 'Deploy FFmpeg processing to Railway/Render with longer timeouts'
    })

  } catch (error) {
    console.error('FFmpeg error:', error)
    return res.status(500).json({ error: error.message })
  }
}

// This function would work on a server with longer timeouts (Railway, Render, etc.)
async function stitchVideosWithFFmpeg(videoUrls, musicUrl, outputPath) {
  const tempDir = '/tmp/video-stitch'
  await fs.mkdir(tempDir, { recursive: true })

  try {
    // Step 1: Download all videos
    console.log('Downloading videos...')
    const videoFiles = []
    for (let i = 0; i < videoUrls.length; i++) {
      const videoPath = path.join(tempDir, `video_${i}.mp4`)
      await downloadFile(videoUrls[i], videoPath)
      videoFiles.push(videoPath)
    }

    // Step 2: Create FFmpeg concat file
    const concatFilePath = path.join(tempDir, 'concat.txt')
    const concatContent = videoFiles.map(f => `file '${f}'`).join('\n')
    await fs.writeFile(concatFilePath, concatContent)

    // Step 3: Download music
    const musicPath = path.join(tempDir, 'music.mp3')
    await downloadFile(musicUrl, musicPath)

    // Step 4: Concatenate videos and add music
    const outputFile = path.join(tempDir, 'output.mp4')
    
    // FFmpeg command for vertical video (9:16) with music
    const ffmpegCommand = `
      ffmpeg -f concat -safe 0 -i ${concatFilePath} \
      -i ${musicPath} \
      -c:v libx264 -preset fast -crf 23 \
      -vf "scale=576:1024:force_original_aspect_ratio=decrease,pad=576:1024:(ow-iw)/2:(oh-ih)/2" \
      -c:a aac -b:a 128k \
      -shortest \
      -y ${outputFile}
    `.replace(/\s+/g, ' ').trim()

    console.log('Running FFmpeg:', ffmpegCommand)
    await execAsync(ffmpegCommand)

    // Step 5: Upload to storage (S3, Cloudinary, etc.)
    const finalUrl = await uploadToStorage(outputFile)

    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true })

    return finalUrl

  } catch (error) {
    // Cleanup on error
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
    throw error
  }
}

async function downloadFile(url, outputPath) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to download: ${url}`)
  const buffer = await response.buffer()
  await fs.writeFile(outputPath, buffer)
}

async function uploadToStorage(filePath) {
  // TODO: Upload to S3, Cloudinary, or similar
  // For now, return mock URL
  return 'https://storage.example.com/final-video.mp4'
}
