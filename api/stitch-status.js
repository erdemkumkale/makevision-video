// Vercel Serverless Function - Check Stitching Job Status
// Frontend polls this endpoint to check if video is ready

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { jobId } = req.query

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID required' })
    }

    // Check job status in database
    const jobStatus = await getJobStatus(jobId)

    return res.status(200).json(jobStatus)

  } catch (error) {
    console.error('Status check error:', error)
    return res.status(500).json({ 
      error: 'Failed to check status',
      details: error.message 
    })
  }
}

async function getJobStatus(jobId) {
  // TODO: Query database for job status
  // For now, return mock status
  
  return {
    jobId: jobId,
    status: 'completed', // 'processing', 'completed', 'failed'
    progress: 100,
    videoUrl: 'https://example.com/final-video.mp4',
    message: 'Video ready for download'
  }
}
