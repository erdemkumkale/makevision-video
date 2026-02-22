import { useState } from 'react'
import { sendVideoEmail } from '../services/email'

export default function FinalMovie({ scenes, onBack, finalVideoUrl, selectedMusic }) {
  const [emailInput, setEmailInput] = useState('')
  const [emailStatus, setEmailStatus] = useState(null)
  const [isSending, setIsSending] = useState(false)
  
  // Filter out the 'final' stitching scene
  const videoScenes = scenes.filter(s => s.category !== 'final' && s.videoUrl)
  
  const handleSendEmail = async () => {
    if (!emailInput || !emailInput.includes('@')) {
      setEmailStatus({ success: false, message: 'Please enter a valid email address' })
      return
    }
    
    setIsSending(true)
    setEmailStatus(null)
    
    try {
      const result = await sendVideoEmail(emailInput, finalVideoUrl || videoScenes[0]?.videoUrl)
      setEmailStatus(result)
      if (result.success) {
        setEmailInput('') // Clear input on success
      }
    } catch (error) {
      setEmailStatus({ success: false, message: 'Failed to send email. Please try again.' })
    } finally {
      setIsSending(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-black py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-light mb-2">Your Cinematic Vision Movie</h1>
          <p className="text-gray-500">A 60-second journey through your future</p>
        </div>

        {/* Main unified player - shows stitched video if available */}
        <div className="mb-12 flex justify-center">
          <div className="bg-gray-900/50 rounded-2xl overflow-hidden border border-gray-800 p-4 max-w-md w-full">
            <h2 className="text-2xl font-light mb-4 text-center">
              {finalVideoUrl ? 'Your Complete 60-Second Movie' : 'Your Vision Scenes'}
            </h2>
            <div className="relative w-full" style={{ aspectRatio: '9/16' }}>
              <video 
                src={finalVideoUrl || videoScenes[0]?.videoUrl}
                controls
                autoPlay
                className="w-full h-full rounded-xl object-cover"
                style={{ aspectRatio: '9/16', objectFit: 'cover' }}
              />
            </div>
            {!finalVideoUrl && (
              <p className="text-sm text-gray-500 text-center mt-4">
                Note: Video stitching in progress. Currently showing individual scenes.
              </p>
            )}
            {finalVideoUrl && (
              <div className="space-y-2 mt-4">
                <p className="text-sm text-green-500 text-center">
                  ✓ Complete 60-second cinematic movie ready!
                </p>
                {selectedMusic && (
                  <div className="text-center text-xs text-gray-500 space-y-1">
                    <p>🎵 {selectedMusic.name}</p>
                    <p>{selectedMusic.frequency} - {selectedMusic.emotion}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Individual scenes */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {videoScenes.map((scene) => (
            <div key={scene.category} className="bg-gray-900/50 rounded-xl overflow-hidden border border-gray-800">
              <div className="relative w-full" style={{ aspectRatio: '9/16' }}>
                <video 
                  src={scene.videoUrl}
                  controls
                  loop
                  className="w-full h-full object-cover"
                  style={{ aspectRatio: '9/16', objectFit: 'cover' }}
                />
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium capitalize mb-1">{scene.category}</h3>
                <p className="text-xs text-gray-600">10s</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-700 text-center">
          <h2 className="text-2xl font-light mb-4">Your Cinematic Movie is Ready!</h2>
          <p className="text-gray-400 mb-6">
            {finalVideoUrl 
              ? 'Your complete 60-second cinematic masterpiece with perfect face-swap likeness'
              : `All ${videoScenes.length} cinematic scenes (10 seconds each) have been generated`
            }
          </p>
          
          {/* Email Delivery Section */}
          <div className="max-w-md mx-auto mb-8 p-6 bg-gray-900/50 rounded-xl border border-gray-800">
            <h3 className="text-lg font-medium mb-3">📧 Receive via Email</h3>
            <p className="text-sm text-gray-500 mb-4">Get your movie delivered to your inbox</p>
            
            <div className="flex gap-2 mb-3">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-full focus:outline-none focus:border-gray-600 transition-colors"
                disabled={isSending}
              />
              <button
                onClick={handleSendEmail}
                disabled={isSending || !emailInput}
                className="px-6 py-3 bg-white text-black hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  'Send'
                )}
              </button>
            </div>
            
            {emailStatus && (
              <div className={`text-sm p-3 rounded-lg ${emailStatus.success ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
                {emailStatus.message}
              </div>
            )}
          </div>
          
          <div className="flex gap-4 justify-center flex-wrap">
            <button
              onClick={onBack}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors"
            >
              Back to Gallery
            </button>
            {finalVideoUrl && (
              <a
                href={finalVideoUrl}
                download="my-vision-movie.mp4"
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-full transition-colors"
              >
                Download Movie
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
