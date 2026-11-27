# EDURA frontend

Next.js + React сургалтын орчин. `app/` нь хуудас, `components/` нь харагдац/үйлдэл, `lib/` нь API/session/төрөл, `context/` нь хэрэглэгчийн төлөв. Хуваарийн цаг `../shared/class-periods.json` дотор.

```bash
cd /Users/macbookair/Documents/NEXT_1/my-app/frontend
npm install
npm run dev
```

Хаяг: http://localhost:3001. `.env.local` дахь API_URL болон NEXT_PUBLIC_API_URL нь локал backend-ийн http://localhost:3002 (Docker ашиглавал http://127.0.0.1:5000, Compose ашиглавал http://127.0.0.1:5001). Environment өөрчилбөл dev серверийг restart хийнэ.

Шалгалт: `npx tsc --noEmit`, `npm run build`. Vercel Root Directory нь `frontend`; root-ийн shared файлд build хандахыг зөвшөөрнө. MongoDB болон JWT нууц үгийг frontend environment-д нэмэхгүй.

Дэлгэрэнгүй: [төслийн README](../README.md), [backend README](../backend/README.md).
