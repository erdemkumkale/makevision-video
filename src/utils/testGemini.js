import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

export async function listAvailableModels() {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    
    console.log('=== LISTING AVAILABLE MODELS ===')
    console.log('API Key:', GEMINI_API_KEY ? 'Present' : 'Missing')
    
    // Try to list models
    const models = await genAI.listModels()
    console.log('Available models:', models)
    
    return models
  } catch (error) {
    console.error('Error listing models:', error)
    throw error
  }
}

// Test different model names
export async function testModelNames() {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  
  const modelsToTry = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-pro',
    'gemini-1.0-pro',
    'gemini-1.5-pro'
  ]
  
  console.log('=== TESTING MODEL NAMES ===')
  
  for (const modelName of modelsToTry) {
    try {
      console.log(`Testing: ${modelName}`)
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent('Say "test"')
      const response = await result.response
      console.log(`✓ ${modelName} WORKS!`, response.text())
      return modelName // Return first working model
    } catch (error) {
      console.log(`✗ ${modelName} failed:`, error.message)
    }
  }
  
  console.error('No working model found!')
  return null
}
