# 🚀 MakeVision.video - Hızlı Başlangıç

## ⚡ 3 Adımda Deploy Et (15 dakika)

### 1️⃣ GitHub'a Push (5 dakika)

```bash
# Terminal'i aç ve proje klasörüne git
cd /path/to/makevision-video

# Git başlat
git init
git add .
git commit -m "Initial commit - MakeVision.video"

# GitHub'da yeni repo oluştur: makevision-video
# Sonra:
git remote add origin https://github.com/KULLANICI_ADIN/makevision-video.git
git branch -M main
git push -u origin main
```

### 2️⃣ Vercel'e Deploy (5 dakika)

**Kolay Yol (Dashboard):**
1. https://vercel.com/new adresine git
2. GitHub repo'nu import et
3. Environment Variables ekle:
   ```
   VITE_GEMINI_API_KEY = AIzaSyAl5xZ4x_Riy00_yWt3kMdA4EKv8l6clMI
   VITE_FAL_KEY = 4d557fb1-e4cd-4144-bd6a-50a1f21647ba:bd98e452467f216bd825a1ccd0301b4b
   ```
4. "Deploy" tıkla
5. ✅ 2-3 dakika sonra live!

**Hızlı Yol (CLI):**
```bash
# Vercel CLI kur
npm i -g vercel

# Deploy
vercel

# Environment variables gir (sorunca)
# Production deploy
vercel --prod
```

### 3️⃣ Test Et (5 dakika)

1. Live URL'i aç (örn: https://makevision-video.vercel.app)
2. "Login with Google" tıkla
3. Bir selfie yükle
4. 6 kategoriyi doldur
5. "Create My Vision" tıkla
6. ✅ Gemini analiz yapacak
7. ✅ Gallery açılacak

**Not:** Fal.ai kredisi bittiği için görsel/video üretimi çalışmayacak. Kredi ekleyince full test yapabilirsin.

---

## 💳 Fal.ai Kredi Ekle (Sonra)

1. https://fal.ai/dashboard
2. "Billing" → "Add Credits"
3. $10-20 ekle (20-40 full movie için yeterli)
4. ✅ Artık full sistem çalışır!

---

## 🎯 Çalışan Özellikler (Şu An)

- ✅ Login screen
- ✅ Form doldurma
- ✅ Gemini API (portrait analiz + prompt generation)
- ✅ Loading screen
- ✅ Gallery (görsel placeholder'lar ile)
- ✅ Duygu analizi
- ✅ Müzik seçimi
- ✅ Email form
- ✅ 9:16 dikey video player

## ⏸️ Bekleyen Özellikler (Fal.ai Kredi Gerekli)

- ⏸️ Görsel üretimi (Flux Dev)
- ⏸️ Face swap
- ⏸️ Video üretimi (Kling AI)
- ⏸️ Video stitching

---

## 🐛 Sorun Giderme

### Build Hatası
```bash
# node_modules'ü sil ve tekrar kur
rm -rf node_modules
npm install
npm run build
```

### Environment Variables Çalışmıyor
```bash
# Vercel dashboard'da kontrol et
# Settings → Environment Variables
# VITE_ prefix'i olmalı!
```

### Gemini API 429 Hatası
- 60 saniye bekle (rate limit)
- Veya yeni API key al

### Fal.ai 401 Hatası
- API key'i kontrol et
- Kredi var mı kontrol et

---

## 📞 Yardım

Sorun mu var? Kontrol et:
1. `DEPLOYMENT_CHECKLIST.md` - Detaylı adımlar
2. `BACKEND_DEPLOYMENT_GUIDE.md` - Backend setup
3. `README.md` - Genel bilgi

---

## 🎉 Başarılı Deploy Sonrası

1. ✅ Live URL'i kaydet
2. ✅ Fal.ai kredi ekle
3. ✅ Full test yap
4. ✅ Custom domain ekle (isteğe bağlı)
5. ✅ Analytics ekle
6. ✅ Production optimizasyonları

**Tebrikler! MakeVision.video artık live! 🚀**
