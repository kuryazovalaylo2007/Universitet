# Smart University — Talabalar Tizimi

## Loyiha haqida
Talabalar baholarini va davomatini tahlil qiluvchi web tizim.
- **Backend**: Flask + Pandas (Python)
- **Frontend**: HTML + CSS + JavaScript + Chart.js
- **Deploy**: Render.com

---

## Fayl Tuzilmasi

```
smart_university/
├── backend/
│   └── app.py              # Flask API server
├── frontend/
│   ├── templates/
│   │   └── index.html      # Asosiy sahifa
│   └── static/
│       ├── css/
│       │   └── style.css
│       └── js/
│           └── main.js
├── requirements.txt         # Python paketlar
├── Procfile                 # Render uchun run command
├── render.yaml              # Render konfiguratsiyasi
└── README.txt
```

---

## LOCAL (lokal) da ishga tushirish

### 1. Python o'rnatish (3.9+)

### 2. Paketlarni o'rnatish:
```
pip install -r requirements.txt
```

### 3. Dasturni ishga tushirish:
```
python backend/app.py
```

### 4. Brauzerda ochish:
```
http://localhost:5000
```

---

## RENDER.COM ga Deploy qilish

### Usul 1: GitHub orqali (tavsiya etiladi)

1. GitHub'da yangi repository yarating
2. Barcha fayllarni push qiling:
   ```
   git init
   git add .
   git commit -m "Smart University dastlabki versiya"
   git remote add origin https://github.com/USERNAME/REPO.git
   git push -u origin main
   ```

3. Render.com ga kiring: https://render.com
4. "New +" → "Web Service" bosing
5. GitHub reponi ulang
6. Quyidagi sozlamalarni kiriting:
   - **Name**: smart-university
   - **Environment**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn backend.app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
7. "Create Web Service" bosing
8. Deploy tugashini kuting (2-5 daqiqa)
9. Berilgan URL da saytingiz ochiladi!

### Usul 2: render.yaml orqali (avtomatik)
Agar render.yaml fayli mavjud bo'lsa, Render uni avtomatik aniqlaydi.

---

## API Endpoints

| Endpoint | Metod | Tavsif |
|----------|-------|--------|
| `/` | GET | Asosiy sahifa |
| `/api/dashboard` | GET | Dashboard statistikasi |
| `/api/talabalar` | GET | Talabalar ro'yxati |
| `/api/talaba/<id>` | GET | Bitta talaba ma'lumoti |
| `/api/baholar/tahlil` | GET | Baholar tahlili |
| `/api/davomat/tahlil` | GET | Davomat tahlili |
| `/api/reytinglar` | GET | Talabalar reytingi |
| `/api/health` | GET | Server holati |

### Filter parametrlar:
- `/api/talabalar?guruh=CS-101&q=talaba` — guruh va ism bo'yicha qidirish
- `/api/baholar/tahlil?fan=Matematika&semestr=1` — fan va semestr bo'yicha filtr

---

## Xususiyatlar

- Dashboard: Umumiy statistika va grafiklar
- Talabalar: Ro'yxat, qidiruv, filtr, batafsil modal
- Baholar Tahlili: Statistika (max, min, o'rtacha, median), harf taqsimoti
- Davomat: Guruh/fan bo'yicha tahlil, xavfli talabalar
- Reyting: Top 10 va eng past 10 talaba

---

## Muallif
Smart University Tizimi — Render.com ga tayyor
