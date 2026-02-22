export default function LoadingScreen({ error, onRetry }) {
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="text-center space-y-8 max-w-md">
          <div className="w-24 h-24 mx-auto bg-red-900/20 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-light">Generation Failed</h2>
            <p className="text-gray-400">{error}</p>
          </div>

          {onRetry && (
            <button
              onClick={onRetry}
              className="px-8 py-3 bg-white text-black rounded-full hover:bg-gray-100 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center space-y-8">
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 border-4 border-gray-800 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-light">Architecting your future...</h2>
          <p className="text-gray-500">Analyzing portrait and generating cinematic prompts</p>
        </div>
      </div>
    </div>
  )
}
