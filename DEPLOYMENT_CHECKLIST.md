# 🚀 MakeVision.video - Deployment Checklist

## ✅ Şu An Yapılacaklar (Sırayla)

### 1. GitHub'a Push Et
```bash
# Eğer git repo yoksa
git init
git add .
git commit -m "Initial commit - MakeVision.video MVP"

# GitHub'da yeni repo oluştur: makevision-video
# Sonra:
git remote add origin https://github.com/KULLANICI_ADIN/makevision-video.git
git branch -M main
git push -u origin main
```

### 2. Vercel'e Deploy Et

**Option A: Vercel Dashboard (Kolay)**
1. https://vercel.com/new adresine git
2. "Import Git Repository" tıkla
3. GitHub repo'nu seç
4. Environment Variables ekle:
   - `VITE_GEMINI_API_KEY` = `AIzaSyAl5xZ4x_Riy00_yWt3kMdA4EKv8l6clMI`
   - `VITE_FAL_KEY` = `4d557fb1-e4cd-4144-bd6a-50a1f21647ba:bd98e452467f216bd825a1ccd0301b4b`
5. "Deploy" tıkla
6. 2-3 dakika bekle
7. ✅ Live URL: `https://makevision-video.vercel.app`

**Option B: Vercel CLI (Hızlı)**
```bash
# Vercel CLI kur
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Environment variables ekle (ilk deploy'da sorar)
# VITE_GEMINI_API_KEY: AIzaSyAl5xZ4x_Riy00_yWt3kMdA4EKv8l6clMI
# VITE_FAL_KEY: 4d557fb1-e4cd-4144-bd6a-50a1f21647ba:bd98e452467f216bd825a1ccd0301b4b

# Production deploy
vercel --prod
```

### 3. Test Et (Fal.ai Kredisi Olmadan)

**Çalışacak Özellikler:**
- ✅ Login screen
- ✅ Form doldurma
- ✅ Gemini API (portrait analiz + prompt generation)
- ✅ Loading screen
- ✅ Gallery görüntüleme (görsel olmadan)

**Çalışmayacak Özellikler (Fal.ai kredi gerekli):**
- ❌ Görsel üretimi
- ❌ Video üretimi
- ❌ Face swap

**Test Senaryosu:**
1. Siteyi aç
2. Login tıkla
3. Selfie yükle (herhangi bir resim)
4. 6 kategoriyi doldur
5. "Create My Vision" tıkla
6. ✅ Gemini analiz yapacak
7. ✅ Gallery açılacak (görsel placeholder'lar ile)
8. ❌ Görsel üretimi Fal.ai kredi hatası verecek

---

## 💳 Fal.ai Kredi Ekledikten Sonra

### 4. Fal.ai Kredi Ekle
1. https://fal.ai/dashboard adresine git
2. "Billing" → "Add Credits"
3. $10-20 ekle (test için yeterli)
4. API key'in aktif olduğunu kontrol et

### 5. Full Test
```bash
# Vercel'de environment variable'ı güncelle (gerekirse)
vercel env pull

# Yeni deploy (eğer değişiklik yaptıysan)
vercel --prod
```

**Tam Test Senaryosu:**
1. ✅ Login
2. ✅ Selfie yükle
3. ✅ 6 kategori doldur
4. ✅ Gemini analiz
5. ✅ 6 görsel üretimi (Flux Dev + Face Swap)
6. ✅ Gallery'de görselleri gör
7. ✅ 1 görseli regenerate et
8. ✅ "Generate 60-Second Movie" tıkla
9. ✅ 6 video üretimi (Kling AI + Face Swap)
10. ✅ Video stitching (Fal.ai concat)
11. ✅ Müzik ekleme
12. ✅ Final movie görüntüleme (9:16 dikey)
13. ✅ Email gönderme
14. ✅ Download

---

## 🔧 Production Optimizasyonları (Sonra)

### 6. Custom Domain (İsteğe Bağlı)
```bash
# Vercel dashboard'da:
# Settings → Domains → Add Domain
# makevision.video ekle
# DNS ayarlarını yap
```

### 7. Analytics Ekle
```bash
npm install @vercel/analytics

# src/main.jsx
import { Analytics } from '@vercel/analytics/react'

<Analytics />
```

### 8. Error Monitoring (Sentry)
```bash
npm install @sentry/react

# src/main.jsx
import * as Sentry from "@sentry/react"

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production"
})
```

### 9. Database Setup (Supabase)
```bash
# 1. https://supabase.com/dashboard
# 2. New Project oluştur
# 3. Tables oluştur:
#    - users (id, email, created_at)
#    - projects (id, user_id, video_url, expires_at)
#    - videos (id, project_id, scene_url, category)

# 4. Environment variable ekle
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
```

### 10. Email Service (SendGrid)
```bash
# 1. https://sendgrid.com/
# 2. API Key oluştur
# 3. Vercel'e environment variable ekle:
# SENDGRID_API_KEY=...

# 4. api/send-email.js oluştur
```

### 11. Payment (Lemon Squeezy)
```bash
# 1. https://lemonsqueezy.com/
# 2. Product oluştur ($20)
# 3. Webhook setup
# 4. Environment variables:
# LEMON_SQUEEZY_API_KEY=...
# LEMON_SQUEEZY_STORE_ID=...
```

---

## 📊 Deployment Status

| Feature | Status | Notes |
|---------|--------|-------|
| Frontend | ✅ Ready | Vercel'e deploy edilebilir |
| Gemini API | ✅ Working | API key aktif |
| Fal.ai API | ⏸️ Paused | Kredi gerekli |
| Video Stitching | ✅ Ready | Fal.ai concat hazır |
| Music System | ✅ Ready | Duygu analizi çalışıyor |
| Email Service | 🔧 Mock | Backend gerekli |
| Payment | 🔧 Mock | Lemon Squeezy gerekli |
| Database | 🔧 Mock | Supabase gerekli |

---

## 🎯 Şu An Yapılacak İlk 3 Adım

1. **GitHub'a push et** (5 dakika)
2. **Vercel'e deploy et** (5 dakika)
3. **Test et** (Gemini çalışıyor mu?) (5 dakika)

**Toplam:** 15 dakika sonra live site! 🚀

---

## 💰 Maliyet Tahmini

### MVP (Şu An):
- Vercel Hosting: **$0** (Hobby plan)
- Gemini API: **$0** (Free tier - 15 requests/min)
- Fal.ai: **Pay-as-you-go** (~$0.10-0.50 per video)

### Production (Sonra):
- Vercel Pro: **$20/mo** (daha uzun timeout)
- Supabase: **$0-25/mo** (database)
- SendGrid: **$0-15/mo** (email)
- Lemon Squeezy: **5% + $0.50** per transaction
- Fal.ai: **Pay-as-you-go** (~$0.50 per full movie)

**Toplam:** ~$20-60/mo (kullanıma göre)

---

## 🚨 Önemli Notlar

1. **API Keys:** `.env.local` dosyası GitHub'a push edilmemeli (zaten .gitignore'da)
2. **Fal.ai Kredi:** Test için $10-20 yeterli (yaklaşık 20-40 full movie)
3. **Vercel Timeout:** Fal.ai kullandığımız için problem yok
4. **CORS:** Vercel otomatik hallediyor
5. **Build Time:** İlk deploy 2-3 dakika sürer

---

## ✅ Deployment Komutu (Tek Satır)

```bash
git init && git add . && git commit -m "Initial commit" && vercel
```

Sonra environment variables'ı gir ve **ENTER!** 🚀
