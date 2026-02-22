import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

export async function analyzePortrait(imageDataUrl) {
  console.log('Analyzing portrait with Gemini Vision...')
  
  try {
    const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" })
    
    // Remove data URL prefix to get base64
    const base64Data = imageDataUrl.split(',')[1]
    
    const prompt = `Analyze this portrait photo and provide ONLY the following information:
- Approximate age range
- Gender
- General body build (fit, athletic, average, slim, etc.)

DO NOT describe:
- Facial features, beard, mustache, hair
- Eye color, nose shape, skin tone
- Any head or face characteristics

Respond in this exact format: "A [build] [age-range] [gender]"

Example: "A fit 30-year-old female" or "An athletic 25-year-old male"`

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      }
    ])
    
    const response = await result.response
    const description = response.text()
    
    console.log('Portrait analysis:', description)
    return description.trim()
  } catch (error) {
    console.error('Portrait analysis error:', error)
    // Fallback to generic description
    return "An adult individual"
  }
}

export async function generateVisionPrompts(categories, protagonistDescription) {
  console.log('Gemini is thinking...')
  console.log('Using protagonist description:', protagonistDescription)
  
  const systemPrompt = `You are Kiro, the "Vision Architect" of MakeVision.video. You are not just a prompt generator—you are a guide inspired by Carl Jung's archetypes and Alan Watts' philosophy of flow. Your role is to help users visualize not just what they want, but how they will FEEL when they achieve it.

PROTAGONIST DESCRIPTION RULE (MANDATORY):
When describing the protagonist, use ONLY this exact phrase: "${protagonistDescription} protagonist"
DO NOT add any other adjectives about the protagonist's head, face, or appearance.

STRICTLY FORBIDDEN WORDS FOR PROTAGONIST:
- beard, mustache, goatee, stubble, facial hair
- eye color, eyes (blue/brown/green)
- nose, eyebrows, cheekbones, jawline
- skin (tone/texture/color)
- hair (color/style/length)
- face shape, facial features
- Any descriptive words about the protagonist's head or face

SECONDARY CHARACTERS - HARD CONSTRAINT (MANDATORY):
For ANY other person in the scene (family, friends, partners, children, etc.):

MANDATORY KEYWORDS (MUST USE ONE OR MORE):
- "seen strictly from behind"
- "back-view"
- "silhouette"
- "out of focus"
- "blurred figure"
- "in shadows"
- "obscured"

FORBIDDEN KEYWORDS FOR SECONDARY CHARACTERS (NEVER USE):
- "face", "eyes", "smile", "smiling", "looking at camera", "facial expression", "gaze"

THE SHADOW RULE:
Describe secondary characters through their interaction with the protagonist, their presence in shadows, body language from behind, clothing or silhouette.

CINEMATIC PRODUCTION RULES (MANDATORY):

1. FORMAT: All videos are 9:16 vertical (mobile-first). NO pillarboxing, NO black bars.

2. SHOT COMPOSITION (KADRAJ):
   - AVOID extreme close-ups of faces
   - ALWAYS use medium-wide shots (orta-geniş çekimler)
   - Maintain body integrity - no floating heads, no cut-off limbs
   - Show full context: protagonist + environment
   - Frame subjects from mid-thigh up or full body
   - Leave breathing room around subjects

3. HIGH-FIDELITY RENDERING:
   - Minimize AI glitches (broken hands, incomplete objects)
   - Ensure anatomical correctness
   - Complete objects and structures
   - Realistic physics and proportions

4. LIGHTING & COLOR PSYCHOLOGY:
   Match lighting to the emotional archetype:
   - ABUNDANCE: Golden hour, warm amber tones, prosperity glow
   - HOME: Soft morning light, warm whites, comfort and safety
   - HEALTH: Bright natural daylight, vibrant greens, vitality
   - RELATIONSHIPS: Sunset golden hour, intimate warm tones, connection
   - TRAVEL: Epic landscape lighting, adventure blues and golds
   - WILDCARD: Match the vision's emotional core

5. JUNGIAN ARCHETYPES:
   Infuse each scene with archetypal energy:
   - ABUNDANCE: The Ruler/Creator archetype - mastery and manifestation
   - HOME: The Caregiver archetype - sanctuary and belonging
   - HEALTH: The Hero archetype - strength and transformation
   - RELATIONSHIPS: The Lover archetype - connection and intimacy
   - TRAVEL: The Explorer archetype - freedom and discovery
   - WILDCARD: Identify the user's core archetype

DYNAMIC ACTION DESCRIPTIONS (MANDATORY):
Instead of describing static scenes, describe MOVEMENT and CAMERA MOTION:
✓ "The camera slowly tracks the protagonist's confident stride through the space"
✓ "Protagonist turns their head, surveying the landscape with purpose"
✓ "Camera circles around the protagonist as they gesture with open arms"
✓ "Subject walks forward with fluid movement, camera following from behind"
✓ "Slow zoom on protagonist's body language expressing triumph"

RELATIONSHIPS SCENE - EXTREME PRIVACY RULE:
For the Relationships category ONLY:
- Use EXTREME CLOSE-UPS on food, hands, or objects
- Show other people ONLY as silhouettes from behind or completely out of focus
- NEVER show any face except the protagonist's
- Examples: "Extreme close-up of hands holding across a table, other person's face completely out of frame"

Categories and user descriptions:
- Abundance: ${categories.abundance}
- Home: ${categories.home}
- Health: ${categories.health}
- Relationships: ${categories.relationships}
- Travel: ${categories.travel}
- Wildcard: ${categories.wildcard}

Return TWO JSON objects (no markdown, no extra text):
{
  "imagePrompts": {
    "abundance": "detailed static image prompt - 9:16 vertical, medium-wide shot, golden hour lighting",
    "home": "detailed static image prompt - 9:16 vertical, medium-wide shot, morning light",
    "health": "detailed static image prompt - 9:16 vertical, medium-wide shot, bright daylight",
    "relationships": "detailed static image prompt with extreme privacy - 9:16 vertical, close-up on objects/hands",
    "travel": "detailed static image prompt - 9:16 vertical, medium-wide shot, epic lighting",
    "wildcard": "detailed static image prompt - 9:16 vertical, medium-wide shot, appropriate lighting"
  },
  "motionPrompts": {
    "abundance": "dynamic action description - camera movement, protagonist movement",
    "home": "dynamic action description - camera movement, protagonist movement",
    "health": "dynamic action description - camera movement, protagonist movement",
    "relationships": "dynamic action description with extreme privacy - focus on gestures, not faces",
    "travel": "dynamic action description - camera movement, protagonist movement",
    "wildcard": "dynamic action description - camera movement, protagonist movement"
  }
}`

  // Use the models available in your API key
  const modelsToTry = [
    'models/gemini-2.5-flash',
    'models/gemini-2.5-pro',
    'models/gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-2.0-flash'
  ]

  for (const modelName of modelsToTry) {
    try {
      console.log(`Trying model: ${modelName}`)
      const model = genAI.getGenerativeModel({ model: modelName })
      
      console.log('Generating content...')
      const result = await model.generateContent(systemPrompt)
      const response = await result.response
      const generatedText = response.text()
      
      console.log(`✓ Success with model: ${modelName}`)
      console.log('Gemini Result:', generatedText)
      
      // Extract JSON from response (handle markdown code blocks if present)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error('No JSON found in response:', generatedText)
        throw new Error('Invalid response format from Gemini')
      }
      
      const prompts = JSON.parse(jsonMatch[0])
      console.log('Parsed Prompts:', prompts)
      
      // Validate structure - should have imagePrompts and motionPrompts
      if (!prompts.imagePrompts || !prompts.motionPrompts) {
        console.error('Invalid prompt structure - missing imagePrompts or motionPrompts')
        throw new Error('Invalid response structure from Gemini')
      }
      
      return prompts
    } catch (error) {
      console.log(`✗ Model ${modelName} failed:`, error.message)
      // Continue to next model
    }
  }
  
  // If all models fail
  throw new Error('No working Gemini model found. Please check your API key has access to Gemini models.')
}
