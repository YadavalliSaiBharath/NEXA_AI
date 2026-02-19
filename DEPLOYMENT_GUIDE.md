# 🚀 DEPLOYMENT GUIDE - NEXA AI

## Quick Deployment for RIFT 2026 Hackathon Judges

This guide walks you through deploying NEXA AI to a public URL in **5 minutes**.

---

## 📍 Option 1: Railway (RECOMMENDED - Easiest)

Railway is perfect for full-stack Python + React apps. Deploy in 2 clicks.

### Step 1: Prepare Your Repository
```bash
git add .
git commit -m "RIFT 2026 Submission - NEXA AI Money Mule Detection"
git push origin main
```

### Step 2: Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub (single-click OAuth)
3. Connect your GitHub repository

### Step 3: Deploy
1. Click "New Project" → "Deploy from GitHub"
2. Select `rift_hackathon` repository
3. Railway auto-detects: Python backend + React frontend
4. Click "Deploy"

**⏱️ Deployment time**: 3-5 minutes

**Public URL**: Railway assigns automatically (e.g., `nexa-ai-production.up.railway.app`)

### Step 4: Configure Environment
In Railway dashboard:
1. Set Python version: `3.11`
2. Set build command: `cd modules/frontend && npm run build && cd ../backend/app && pip install -r requirements.txt`
3. Set runtime command: `cd modules/backend/app && python -m uvicorn main:app --host 0.0.0.0 --port $PORT`

---

## 📍 Option 2: Vercel + Heroku (Alternative)

### Deploy Frontend to Vercel
```bash
npm install -g vercel
cd modules/frontend
vercel --prod
```

### Deploy Backend to Heroku
```bash
heroku login
heroku create nexa-ai-backend
git push heroku main
```

Then update frontend Axios base URL in `UploadView.tsx`:
```tsx
const API_URL = 'https://nexa-ai-backend.herokuapp.com';
```

---

## 📍 Option 3: Docker Deployment (Advanced)

### Create Dockerfile
```dockerfile
FROM python:3.11-slim as backend
WORKDIR /app
COPY modules/backend/app/requirements.txt .
RUN pip install -r requirements.txt

FROM node:18 as frontend
WORKDIR /app
COPY modules/frontend/package.json .
RUN npm ci && npm run build

FROM python:3.11-slim
WORKDIR /app
COPY --from=backend /app .
COPY --from=frontend /app/build ./public
COPY modules/ai_engine ./ai_engine
COPY modules/backend/app ./backend/app

EXPOSE 8000
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0"]
```

### Deploy to Docker Hub
```bash
docker build -t {username}/nexa-ai .
docker push {username}/nexa-ai
```

---

## 🧪 Post-Deployment Testing

After deployment, verify the application works:

### Test 1: Health Check
```bash
curl https://your-app-url/api/health
# Expected: {"status": "healthy", "timestamp": "..."}
```

### Test 2: Upload Sample CSV
```bash
curl -X POST "https://your-app-url/api/analyze/upload" \
  -F "file=@transactions.csv"
# Expected: Analysis result JSON with suspicious_accounts, fraud_rings, summary
```

### Test 3: Download Results
```bash
curl "https://your-app-url/api/analysis/{analysis_id}/download" \
  -o results.json
# Expected: Valid JSON file downloaded
```

### Test 4: Browser Test
- Visit: `https://your-app-url`
- Upload sample CSV
- Verify results display in < 10 seconds

---

## 📋 RIFT Submission Checklist

Once deployed, complete your RIFT submission:

1. **Go to RIFT 2026 Website** (Feb 19, 6-8 PM)
   - Select: "Graph Theory / Financial Crime Detection"
   - Problem: "Money Muling Detection Challenge"

2. **Submission Fields**:
   - **GitHub Repo URL**: https://github.com/your-username/rift-2026-money-mule
   - **Live App URL**: https://your-app-url
   - **LinkedIn Video**: (Post video after step 3)

3. **Record & Post LinkedIn Video**
   - Length: 2-3 minutes max
   - Content:
     ```
     0:00-0:30   Intro & Problem Statement
     0:30-1:30   Live Demo (Upload CSV, show results)
     1:30-2:30   Algorithm Explanation & Architecture
     2:30-3:00   Key Achievements & Conclusion
     ```
   - Must tag: RIFT official page
   - Must include hashtags:
     - #RIFTHackathon
     - #MoneyMulingDetection
     - #FinancialCrimeDetection
   - Make post: PUBLIC (not private)

4. **Submit Deployment Links**
   - Final RIFT website submission (Feb 19, 6-8 PM only)

---

## 🔐 Production Security Checklist

Before going live:

- [ ] **HTTPS**: Your hosting platform provides SSL/TLS (Railway does)
- [ ] **CORS**: Update allowed origins in `main.py`:
  ```python
  allow_origins=["https://your-app-url", "http://localhost:3000"]
  ```
- [ ] **Environment Variables**: Set in platform dashboard, not in code
  - `DATABASE_URL` (if using DB)
  - `SECRET_KEY` (if needed)
  - `API_KEY` (if needed)
- [ ] **No Debug Mode**: Set `DEBUG = False` in production
- [ ] **Logging**: Monitor via platform's log viewer
- [ ] **Rate Limiting**: Consider adding to high-traffic endpoints
- [ ] **Input Validation**: Already implemented in CSV loader

---

## ⚡ Performance Optimization

If deployment is slow:

### Frontend
```bash
# Build with optimization
npm run build -- --optimize-for-browser

# Enable gzip compression
# (Already enabled in Railway/Vercel)
```

### Backend
```bash
# Use Gunicorn with multiple workers
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 main:app

# Or with uvicorn workers
uvicorn main:app --workers 4
```

### Database (if added later)
- Index on `sender_id`, `receiver_id`, `timestamp` for fast queries
- Use connection pooling (SQLAlchemy default)
- Cache common queries

---

## 📊 Monitoring Post-Launch

### Metrics to Track
- API response time (target: < 1s for most endpoints)
- CSV upload size (max: 100MB)
- Concurrent users (target: handle 10+ concurrent uploads)
- Error rate (target: < 0.1%)

### Logging
```python
# Already implemented in main.py
# Logs track:
# - Upload events
# - Analysis duration
# - Errors (with traceback)
# - API requests (via uvicorn)
```

View logs in:
- Railway: Dashboard → "Logs" tab
- Vercel: Dashboard → "Logs" → "Function Logs"
- Heroku: `heroku logs --tail`

---

## 🆘 Troubleshooting

### ❌ "Connection refused" on deployed URL
- **Cause**: Backend not running or port wrong
- **Fix**: Check Railway logs, verify port is `8000`

### ❌ "CORS error" in browser console
- **Cause**: Frontend domain not in CORS whitelist
- **Fix**: Update `allow_origins` in `main.py`

### ❌ "CSV upload hangs"
- **Cause**: File too large (> 100MB)
- **Fix**: Increase `maxSize` in frontend, or stream upload

### ❌ "Analysis takes > 30 seconds"
- **Cause**: Large dataset (> 10K transactions)
- **Fix**: Implement dataset sampling or increase timeout

### ❌ "Out of memory" error
- **Cause**: Creating large graph structures
- **Fix**: Use Railway's 4GB+ plan, or optimize graph memory usage

---

## 📞 Support Links

- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **Heroku Docs**: https://devcenter.heroku.com
- **FastAPI Deploy**: https://fastapi.tiangolo.com/deployment/
- **React Deploy**: https://react.dev/learn/deployment

---

## 🏁 Final Submission

1. ✅ Code committed to GitHub
2. ✅ App deployed to public URL
3. ✅ Video recorded and posted on LinkedIn
4. ✅ Submit via RIFT website (Feb 19, 6-8 PM only)

**You're ready for evaluation! 🚀**

---

**Remember**: Your app stays live during evaluation. RIFT judges may:
- Upload their own CSVs
- Test performance at scale
- Validate JSON output format
- Check algorithm accuracy on test cases

**Follow the money. 💰🔍**

*Good luck with RIFT 2026!*
