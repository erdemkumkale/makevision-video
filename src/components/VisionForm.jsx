import { useState } from 'react'

const categories = [
  { key: 'abundance', label: 'Abundance', placeholder: 'Describe your vision of abundance...' },
  { key: 'home', label: 'Home', placeholder: 'Describe your dream home...' },
  { key: 'health', label: 'Health', placeholder: 'Describe your ideal health...' },
  { key: 'relationships', label: 'Relationships', placeholder: 'Describe your ideal relationships...' },
  { key: 'travel', label: 'Travel', placeholder: 'Describe your travel dreams...' },
  { key: 'wildcard', label: 'Wildcard', placeholder: 'Anything else you envision...' }
]

export default function VisionForm({ onSubmit, error }) {
  const [portrait, setPortrait] = useState(null)
  const [portraitPreview, setPortraitPreview] = useState(null)
  const [formData, setFormData] = useState({
    abundance: '',
    home: '',
    health: '',
    relationships: '',
    travel: '',
    wildcard: ''
  })

  const handlePortraitUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPortrait(file)
      const reader = new FileReader()
      reader.onloadend = () => setPortraitPreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleInputChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      portrait: portraitPreview,
      categories: formData
    })
  }

  const isFormValid = portrait && Object.values(formData).every(val => val.trim())

  return (
    <div className="min-h-screen bg-black py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-light mb-2">Your Vision</h1>
          <p className="text-gray-500">Define the life you're creating</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Portrait Upload */}
          <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800">
            <label className="block mb-4">
              <span className="text-lg font-medium">Portrait / Selfie</span>
              <span className="text-sm text-gray-500 ml-2">(Waist-up)</span>
            </label>
            
            <div className="flex items-center gap-6">
              {portraitPreview ? (
                <img 
                  src={portraitPreview} 
                  alt="Portrait preview" 
                  className="w-32 h-32 rounded-xl object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-xl bg-gray-800 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              
              <label className="cursor-pointer px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors">
                <span>Upload Photo</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePortraitUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Category Inputs */}
          <div className="grid gap-6">
            {categories.map(({ key, label, placeholder }) => (
              <div key={key} className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                <label className="block mb-3">
                  <span className="text-lg font-medium">{label}</span>
                </label>
                <textarea
                  value={formData[key]}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  placeholder={placeholder}
                  rows={3}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-gray-600 transition-colors resize-none"
                />
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-center">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!isFormValid}
            className="w-full py-4 bg-white text-black font-medium rounded-full hover:bg-gray-100 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            Create My Vision
          </button>
        </form>
      </div>
    </div>
  )
}
