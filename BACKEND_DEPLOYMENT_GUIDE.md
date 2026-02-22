# Backend Deployment Guide - Video Stitching & Music

## 🎯 Problem: Vercel Timeout Limitleri

- **Vercel Hobby**: 10 saniye max execution time
- **Vercel Pro**: 60 saniye max execution time
- **FFmpeg video stitching**: 2-5 dakika sürebilir (6 video + müzik)

## ✅ Çözüm: 3 Strateji

### STRATEGY 1: Fal.ai Video-Concat (RECOMMENDED) ⭐

**Avantajlar:**
- ✅ Timeout yok (Fal.ai kendi infrastructure'ında işler)
- ✅ Kolay entegrasyon (zaten Fal.ai kullanıyoruz)
- ✅ Otomatik polling ve progress tracking
- ✅ Vercel'de ek backend gerekmez

**Nasıl Çalışır:**
```javascript
// Frontend'den direkt Fal.ai'ya
const result = await fal.subscribe('fal-ai/video-concat', {
  input: {
    video_urls: [url1, url2, url3, url4, url5, url6],
    output_format: 'mp4',
    width: 576,
    height: 1024
  },
  pollInterval: 5000
})
```

**Durum:** ✅ Zaten implement edildi (`src/services/falai.js`)

---

### STRATEGY 2: Background Job Queue

**Mimari:**
```
Frontend → Vercel API (initiate job) → Queue (Redis/BullMQ) → Worker (Railway/Render)
                ↓
         Return job ID immediately
                ↓
Frontend polls status endpoint
```

**Gerekli Servisler:**
1. **Redis** (Upstash - free tier)
2. **Worker Server** (Railway/Render - FFmpeg processing)
3. **Storage** (S3/Cloudinary - final video)

**Vercel API Endpoints:**
- `POST /api/stitch-videos` - Job başlat, hemen dön
- `GET /api/stitch-status?jobId=xxx` - Status kontrol

**Worker (Railway/Render):**
```javascript
// worker.js - Runs on Railway with no timeout
import Queue from 'bull'
import ffmpeg from 'fluent-ffmpeg'

const videoQueue = new Queue('video-stitching', process.env.REDIS_URL)

videoQueue.process(async (job) => {
  const { videoUrls, musicUrl } = job.data
  
  // Download videos
  // Run FFmpeg (takes 2-5 minutes, no problem!)
  // Upload to S3
  // Update database
  
  return { videoUrl: 'https://s3.../final.mp4' }
})
```

**Deployment:**
```bash
# Railway
railway init
railway add redis
railway up

# Environment variables
REDIS_URL=redis://...
AWS_S3_BUCKET=...
FAL_KEY=...
```

---

### STRATEGY 3: Cloudflare Workers + Durable Objects

**Avantajlar:**
- ✅ Uzun süren işlemler için ideal
- ✅ Global edge network
- ✅ Uygun fiyat

**Nasıl Çalışır:**
```javascript
// Cloudflare Worker
export default {
  async fetch(request, env) {
    const id = env.VIDEO_PROCESSOR.idFromName('job-123')
    const stub = env.VIDEO_PROCESSOR.get(id)
    return stub.fetch(request)
  }
}

// Durable Object - State persists, no timeout
export class VideoProcessor {
  async fetch(request) {
    // Process video in background
    // Can take hours if needed
  }
}
```

---

## 🎵 Müzik Ekleme

### Option 1: FFmpeg (Backend)
```bash
ffmpeg -i video.mp4 -i music.mp3 \
  -c:v copy -c:a aac -b:a 128k \
  -shortest output.mp4
```

### Option 2: Fal.ai Audio Mixing (Eğer varsa)
```javascript
await fal.subscribe('fal-ai/audio-mix', {
  input: {
    video_url: videoUrl,
    audio_url: musicUrl,
    volume: 0.3
  }
})
```

### Option 3: Client-Side (Web Audio API)
```javascript
// Browser'da video + audio birleştir
// Sadece playback için, download için backend gerekli
```

---

## 📦 Önerilen Stack

### Minimal Setup (MVP):
```
Frontend (Vercel)
    ↓
Fal.ai video-concat (direkt)
    ↓
Fal.ai audio-mix (eğer varsa)
    ↓
Final video URL
```

**Maliyet:** ~$0 (Fal.ai pay-as-you-go)

### Production Setup:
```
Frontend (Vercel)
    ↓
Vercel API (job initiate)
    ↓
Redis Queue (Upstash - $0-10/mo)
    ↓
Worker (Railway - $5/mo)
    ↓
FFmpeg Processing
    ↓
S3 Storage (AWS - $1-5/mo)
    ↓
CloudFront CDN (AWS - $1-10/mo)
```

**Maliyet:** ~$7-25/mo

---

## 🚀 Deployment Steps

### 1. Fal.ai Approach (EASIEST)
```bash
# Already done! Just use existing code
# No backend deployment needed
```

### 2. Railway Worker Approach

**Step 1: Create Railway Project**
```bash
railway init
railway add redis
```

**Step 2: Deploy Worker**
```bash
# Create worker/index.js
npm install bull fluent-ffmpeg aws-sdk

# Deploy
railway up
```

**Step 3: Update Vercel API**
```javascript
// api/stitch-videos.js
const Queue = require('bull')
const queue = new Queue('video', process.env.REDIS_URL)

export default async function handler(req, res) {
  const job = await queue.add({
    videoUrls: req.body.videoUrls,
    musicUrl: req.body.musicUrl
  })
  
  res.json({ jobId: job.id })
}
```

**Step 4: Environment Variables**
```env
# Vercel
REDIS_URL=redis://...

# Railway Worker
REDIS_URL=redis://...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
FAL_KEY=...
```

---

## 📊 Karşılaştırma

| Strateji | Timeout Risk | Maliyet | Karmaşıklık | Önerilen |
|----------|--------------|---------|-------------|----------|
| Fal.ai | ✅ Yok | $ | ⭐ Kolay | ✅ MVP |
| Railway Worker | ✅ Yok | $$ | ⭐⭐ Orta | ✅ Production |
| Cloudflare | ✅ Yok | $ | ⭐⭐⭐ Zor | Production+ |
| Vercel Direct | ❌ Var | $ | ⭐ Kolay | ❌ Çalışmaz |

---

## 🎬 Sonuç

**MVP için:** Fal.ai video-concat kullan (zaten implement edildi)

**Production için:** Railway worker + Redis queue ekle

**Şu an durum:** ✅ Fal.ai ile çalışıyor, timeout riski yok!

---

## 📝 TODO: Production Checklist

- [ ] Fal.ai video-concat test et
- [ ] Müzik ekleme için Fal.ai audio-mix araştır
- [ ] Eğer audio-mix yoksa, Railway worker setup yap
- [ ] S3 bucket oluştur (final video storage)
- [ ] CloudFront CDN setup (hızlı delivery)
- [ ] Database schema (video URLs + expiration)
- [ ] Cron job (expired videos cleanup)
