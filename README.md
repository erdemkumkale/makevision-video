# 🎬 MakeVision.video

> Transform your vision into a 60-second cinematic masterpiece

A premium SaaS platform inspired by Joe Dispenza's Mind Movies, powered by AI and Carl Jung's archetypes.

## ✨ Features

- 🎨 **AI-Powered Vision Generation** - Gemini 2.5 Flash analyzes your portrait and creates cinematic prompts
- 🖼️ **High-Fidelity Images** - Flux Dev generates 9:16 vertical images with perfect face-swap
- 🎥 **Cinematic Videos** - Kling AI creates 10-second clips with dynamic camera movements
- 🎵 **Frequency Music** - Automatic emotional analysis and music selection (432 Hz, 528 Hz, etc.)
- 📧 **Email Delivery** - Premium HTML email with download link
- 💾 **State Persistence** - localStorage saves your progress

## 🎯 User Flow

1. Upload selfie portrait
2. Fill 6 vision categories (Abundance, Home, Health, Relationships, Travel, Wildcard)
3. AI generates 6 cinematic images
4. Review and regenerate (1 time per image)
5. Generate 60-second movie ($20)
6. Watch progress with cinematic messages
7. Download or receive via email

## 🛠️ Tech Stack

### Frontend
- React + Vite
- Tailwind CSS (Dark Mode)
- localStorage persistence

### AI Services
- **Gemini 2.5 Flash** - Portrait analysis & prompt generation
- **Fal.ai Flux Dev** - Image generation (576x1024)
- **Fal.ai Face Swap** - Perfect likeness (image + video)
- **Fal.ai Kling AI** - Video generation (9:16, 10s)
- **Fal.ai Video Concat** - Stitching 6 clips into 60s movie

### Backend (Ready for Implementation)
- Vercel Serverless Functions
- SendGrid/Mailgun (email)
- Supabase/Firebase (database)
- Lemon Squeezy (payment)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Gemini API key
- Fal.ai API key

### Installation

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/makevision-video.git
cd makevision-video

# Install dependencies
npm install

# Create .env.local file
cp .env .env.local

# Add your API keys to .env.local
VITE_GEMINI_API_KEY=your_gemini_key
VITE_FAL_KEY=your_fal_key

# Run development server
npm run dev
```

Open http://localhost:5173

### Build for Production

```bash
npm run build
npm run preview
```

## 📦 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variables when prompted
# VITE_GEMINI_API_KEY
# VITE_FAL_KEY

# Deploy to production
vercel --prod
```

Or use Vercel Dashboard:
1. Import GitHub repository
2. Add environment variables
3. Deploy

## 🎨 Cinematic Rules

### Format
- All videos: 9:16 vertical (mobile-first)
- No letterbox/pillarbox
- High-fidelity rendering (35 steps, guidance 4.0)

### Shot Composition
- Medium-wide shots (avoid extreme close-ups)
- Body integrity (full body or waist-up)
- Protagonist + environment together

### Lighting & Color Psychology
- **Abundance:** Golden hour, warm amber
- **Home:** Soft morning light
- **Health:** Bright natural daylight
- **Relationships:** Sunset golden hour
- **Travel:** Epic landscape lighting
- **Wildcard:** Emotion-based

### Carl Jung Archetypes
- **Abundance:** Ruler/Creator
- **Home:** Caregiver
- **Health:** Hero
- **Relationships:** Lover
- **Travel:** Explorer
- **Wildcard:** Dynamic

## 📁 Project Structure

```
makevision-video/
├── api/                      # Vercel serverless functions
│   ├── stitch-videos.js      # Video stitching endpoint
│   └── stitch-status.js      # Job status polling
├── src/
│   ├── components/           # React components
│   │   ├── LoginScreen.jsx
│   │   ├── VisionForm.jsx
│   │   ├── PreviewGallery.jsx
│   │   ├── VisionCard.jsx
│   │   ├── LoadingScreen.jsx
│   │   ├── MovieStudio.jsx
│   │   └── FinalMovie.jsx
│   ├── services/             # API services
│   │   ├── gemini.js         # Gemini API
│   │   ├── falai.js          # Fal.ai API
│   │   ├── music.js          # Music selection
│   │   └── email.js          # Email delivery
│   ├── utils/
│   │   └── storage.js        # localStorage utilities
│   ├── App.jsx               # Main app component
│   ├── main.jsx              # Entry point
│   └── index.css             # Global styles
├── public/                   # Static assets
├── .env.local                # Environment variables (not in git)
├── vercel.json               # Vercel configuration
└── package.json
```

## 🔐 Environment Variables

```env
# Required
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_FAL_KEY=your_fal_api_key

# Optional (for production)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
SENDGRID_API_KEY=your_sendgrid_key
LEMON_SQUEEZY_API_KEY=your_lemon_squeezy_key
```

## 💰 Cost Estimate

### MVP
- Vercel Hosting: **Free** (Hobby plan)
- Gemini API: **Free** (15 requests/min)
- Fal.ai: **Pay-as-you-go** (~$0.50 per full movie)

### Production
- Vercel Pro: **$20/mo**
- Supabase: **$0-25/mo**
- SendGrid: **$0-15/mo**
- Lemon Squeezy: **5% + $0.50** per transaction
- Fal.ai: **Pay-as-you-go**

**Total:** ~$20-60/mo (usage-based)

## 📝 TODO

- [ ] Implement Supabase database
- [ ] Add SendGrid email service
- [ ] Integrate Lemon Squeezy payment
- [ ] Add Google OAuth
- [ ] Implement video expiration (7 days)
- [ ] Add analytics (Vercel Analytics)
- [ ] Add error monitoring (Sentry)
- [ ] Custom domain setup

## 🤝 Contributing

This is a private project. For inquiries, contact the owner.

## 📄 License

Proprietary - All rights reserved

## 🙏 Acknowledgments

- Inspired by Joe Dispenza's Mind Movies
- Carl Jung's Archetypes
- Alan Watts' Philosophy of Flow

---

**Built with ❤️ by Kiro - Vision Architect**
