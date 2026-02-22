export default function MovieStudio({ scenes, progress, onComplete }) {
  // Cinematic progress messages
  const getProgressMessage = (sceneIndex, totalScenes) => {
    const messages = [
      "Analyzing quantum frequencies...",
      "Aligning archetypal energies...",
      "Calibrating cinematic resonance...",
      "Manifesting visual reality...",
      "Synchronizing temporal flow...",
      "Weaving narrative threads..."
    ]
    return messages[sceneIndex % messages.length]
  }

  return (
    <div className="min-h-screen bg-black py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-light mb-2">Cinematic Production Studio</h1>
          <p className="text-gray-500">Crafting your 60-second masterpiece</p>
        </div>

        <div className="space-y-6">
          {scenes.map((scene, index) => (
            <div key={scene.category} className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium capitalize">{scene.category}</h3>
                  <p className="text-sm text-gray-500 line-clamp-1">{scene.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  {scene.status === 'completed' && (
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {scene.status === 'processing' && (
                    <div className="relative w-6 h-6">
                      <div className="absolute inset-0 border-2 border-gray-700 rounded-full"></div>
                      <div className="absolute inset-0 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  {scene.status === 'error' && (
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">
                    {scene.status === 'processing' ? getProgressMessage(index, scenes.length) : scene.statusText}
                  </span>
                  <span className="text-gray-500">{scene.progress}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-white to-gray-300 h-full transition-all duration-500"
                    style={{ width: `${scene.progress}%` }}
                  />
                </div>
              </div>

              {scene.videoUrl && (
                <div className="mt-4 flex justify-center">
                  <div className="relative w-full max-w-xs" style={{ aspectRatio: '9/16' }}>
                    <video 
                      src={scene.videoUrl}
                      controls
                      className="w-full h-full rounded-xl object-cover"
                      style={{ aspectRatio: '9/16', objectFit: 'cover' }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-700">
          <div className="text-center">
            <h2 className="text-2xl font-light mb-4">Overall Progress</h2>
            <div className="flex justify-center items-center gap-4 mb-6">
              <div className="text-5xl font-light">{Math.round(progress)}%</div>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden mb-6">
              <div 
                className="bg-gradient-to-r from-white to-gray-300 h-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            {progress < 100 && (
              <p className="text-sm text-gray-500 animate-pulse">
                {getProgressMessage(Math.floor(progress / 20), 6)}
              </p>
            )}
            {progress === 100 && (
              <button
                onClick={onComplete}
                className="px-8 py-4 bg-white text-black font-medium rounded-full hover:bg-gray-100 transition-all duration-300 hover:scale-105"
              >
                View Your Cinematic Movie
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
