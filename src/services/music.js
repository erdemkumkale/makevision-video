// Music selection based on emotional analysis
// In production, these would be actual royalty-free music files

const MUSIC_LIBRARY = {
  success: {
    name: 'Triumph & Achievement',
    url: '/music/success-frequency.mp3',
    emotion: 'Empowerment, Victory, Confidence',
    frequency: '528 Hz (Transformation)'
  },
  peace: {
    name: 'Inner Harmony',
    url: '/music/peace-frequency.mp3',
    emotion: 'Calm, Serenity, Balance',
    frequency: '432 Hz (Natural Harmony)'
  },
  abundance: {
    name: 'Prosperity Flow',
    url: '/music/abundance-frequency.mp3',
    emotion: 'Wealth, Growth, Manifestation',
    frequency: '639 Hz (Connection)'
  },
  love: {
    name: 'Heart Connection',
    url: '/music/love-frequency.mp3',
    emotion: 'Love, Compassion, Unity',
    frequency: '528 Hz (Love Frequency)'
  },
  adventure: {
    name: 'Explorer Spirit',
    url: '/music/adventure-frequency.mp3',
    emotion: 'Freedom, Discovery, Excitement',
    frequency: '741 Hz (Awakening)'
  },
  transformation: {
    name: 'Metamorphosis',
    url: '/music/transformation-frequency.mp3',
    emotion: 'Change, Growth, Evolution',
    frequency: '852 Hz (Spiritual Order)'
  }
}

// Analyze user's vision categories to determine dominant emotion
export function analyzeEmotionalTone(categories) {
  console.log('Analyzing emotional tone from user visions...')
  
  const text = Object.values(categories).join(' ').toLowerCase()
  
  // Keyword mapping to emotions
  const emotionKeywords = {
    success: ['success', 'achieve', 'goal', 'win', 'accomplish', 'career', 'business', 'wealth', 'money', 'rich'],
    peace: ['peace', 'calm', 'relax', 'meditate', 'quiet', 'serene', 'tranquil', 'balance', 'harmony'],
    abundance: ['abundance', 'prosperity', 'financial', 'luxury', 'affluent', 'opulent', 'plentiful'],
    love: ['love', 'family', 'relationship', 'partner', 'connection', 'together', 'bond', 'intimacy'],
    adventure: ['travel', 'explore', 'adventure', 'journey', 'discover', 'freedom', 'world', 'experience'],
    transformation: ['transform', 'change', 'grow', 'evolve', 'health', 'fitness', 'improve', 'better']
  }
  
  // Count keyword matches for each emotion
  const scores = {}
  for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
    scores[emotion] = keywords.filter(keyword => text.includes(keyword)).length
  }
  
  // Find dominant emotion
  const dominantEmotion = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)[0][0]
  
  console.log('Emotion scores:', scores)
  console.log('Dominant emotion:', dominantEmotion)
  
  return dominantEmotion
}

// Get music for the detected emotion
export function getMusicForEmotion(emotion) {
  const music = MUSIC_LIBRARY[emotion] || MUSIC_LIBRARY.transformation
  console.log(`Selected music: ${music.name} (${music.frequency})`)
  return music
}

// Add music to video using FFmpeg (server-side or Fal.ai)
export async function addMusicToVideo(videoUrl, musicEmotion) {
  console.log('=== ADDING MUSIC TO VIDEO ===')
  console.log('Video URL:', videoUrl)
  console.log('Music emotion:', musicEmotion)
  
  const music = getMusicForEmotion(musicEmotion)
  
  try {
    // In production, this would call a server endpoint or Fal.ai service
    // For now, we'll return the video URL as-is
    // TODO: Implement actual music mixing with FFmpeg
    
    console.log('Music would be added:', music.name)
    console.log('Frequency:', music.frequency)
    
    // Placeholder: In production, call FFmpeg service
    // const result = await fetch('/api/add-music', {
    //   method: 'POST',
    //   body: JSON.stringify({ videoUrl, musicUrl: music.url })
    // })
    
    return {
      videoUrl: videoUrl, // Would be new URL with music
      music: music,
      success: true
    }
  } catch (error) {
    console.error('Failed to add music:', error)
    return {
      videoUrl: videoUrl,
      music: null,
      success: false
    }
  }
}

export { MUSIC_LIBRARY }
