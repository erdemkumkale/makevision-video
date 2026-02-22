// Simple test to verify API key works
export async function verifyGeminiApiKey(apiKey) {
  try {
    // Try direct REST API call to list models
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    )
    
    console.log('API Key verification response status:', response.status)
    
    if (!response.ok) {
      const error = await response.json()
      console.error('API Key verification failed:', error)
      return { success: false, error }
    }
    
    const data = await response.json()
    console.log('Available models:', data)
    
    // Extract model names
    const modelNames = data.models?.map(m => m.name) || []
    console.log('Model names:', modelNames)
    
    return { success: true, models: modelNames }
  } catch (error) {
    console.error('Error verifying API key:', error)
    return { success: false, error: error.message }
  }
}
