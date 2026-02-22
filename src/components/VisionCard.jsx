export default function VisionCard({ category, prompt, directorPrompt, state, onRegenerate }) {
  const { selectedVersion, versions, isGenerating, generationError, regenerateCount = 0 } = state
  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1)
  const canRegenerate = regenerateCount < 1 && !isGenerating

  return (
    <div className="bg-gray-900/50 rounded-2xl overflow-hidden border border-gray-800 transition-all duration-300 hover:border-gray-700">
      <div className="aspect-[9/16] bg-gray-800 relative overflow-hidden">
        {isGenerating ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 border-4 border-gray-700 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-sm text-gray-400">Painting your future...</p>
            <p className="text-xs text-gray-600 mt-1">Applying face swap for perfect likeness</p>
          </div>
        ) : generationError ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
            <svg className="w-12 h-12 text-red-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-400">Failed to generate image</p>
            {canRegenerate && (
              <button
                onClick={() => onRegenerate(category)}
                className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-full text-sm transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        ) : versions[selectedVersion] ? (
          <img 
            src={versions[selectedVersion]} 
            alt={`${categoryLabel} vision`}
            className="w-full h-full object-cover transition-opacity duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-gray-600">No image</p>
          </div>
        )}
      </div>

      <div className="p-5 space-y-3">
        <div>
          <h3 className="text-lg font-medium mb-1">{categoryLabel}</h3>
          <p className="text-xs text-gray-600 mb-2">Your Vision:</p>
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{prompt}</p>
          
          {directorPrompt && (
            <div className="pt-3 border-t border-gray-800">
              <p className="text-xs text-gray-600 mb-1">Director's Description:</p>
              <p className="text-sm text-gray-300 leading-relaxed line-clamp-3">{directorPrompt}</p>
            </div>
          )}
        </div>

        {/* Regenerate Button - 1 time only */}
        {!isGenerating && versions[selectedVersion] && (
          <div className="pt-3 border-t border-gray-800">
            {canRegenerate ? (
              <button
                onClick={() => onRegenerate(category)}
                className="w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-sm transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerate (1 time left)
              </button>
            ) : (
              <div className="text-center py-2 text-xs text-gray-600">
                ✓ Regenerate used
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
