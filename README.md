# EDURA сургалтын систем

Next.js frontend, Express API болон MongoDB ашигладаг сургалтын жишээ систем. Одоогийн backend нь `backend/`; `backend-legacy/` нь лабораторийн өмнөх JSON хувилбар.

## Хаягууд

| Үйлчилгээ | Хаяг |
|---|---|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:3002 |
| Swagger | http://localhost:3002/api-docs/ |
| MongoDB | `127.0.0.1:27017` |
| Database | `universityDb` |

MongoDB, API, frontend нь тусдаа процесс тул портууд нь өөр. Mongosh, Compass, backend гурав ижил MongoDB-ийн 27017 портод холбогдоно.

## Одоогийн компьютер дээр ажиллуулах

MongoDB Homebrew service ашиглаж байгаа. Ажиллаж байвал дахин асаах шаардлагагүй.

```bash
brew services start mongodb-community
```

Backend — нэг Terminal tab дээр:

```bash
cd /Users/macbookair/Documents/NEXT_1/my-app/backend
npm start
```

Frontend — өөр Terminal tab дээр:

```bash
cd /Users/macbookair/Documents/NEXT_1/my-app/frontend
npm run dev
```

Хөгжүүлэлтийн үед backend кодыг автоматаар дахин ачаалахад `npm run dev` хэрэглэж болно. Terminal процессыг `Ctrl + C`-ээр зогсооно. MongoDB service нь тусдаа ажиллана.

## Шинэ орчинд тохируулах

`my-app/frontend` болон `my-app/backend` тус бүрд `npm install` ажиллуулна. Байгаа `.env` файлыг жишээгээр дарж бичихгүй.

Frontend-ийн `frontend/.env.local`:

```dotenv
API_URL=http://localhost:3002
NEXT_PUBLIC_API_URL=http://localhost:3002
```

Backend-ийн тохиргоог `backend/.env.example`-ээс эхлүүлнэ. `JWT_SECRET` болон MongoDB нууц үгийг бодит утгаар тохируулна. MongoDB database, хэрэглэгчийн эрх болон authentication бэлэн байх шаардлагатай; [backend-ийн заавар](backend/README.md)-ыг үзнэ үү. `JWT_SECRET` үүсгэх команд: `openssl rand -hex 32`.

## Хавтаснууд

| Зам | Агуулга |
|---|---|
| `frontend/app/` | Next.js хуудсууд, CSS |
| `frontend/components/` | Frontend-ийн харагдац, үйлдлүүд |
| `frontend/context/` | Нэвтэрсэн хэрэглэгчийн төлөв |
| `frontend/lib/` | API client, төрөл, цэс, session helper |
| `frontend/public/` | Статик зураг |
| `shared/` | Хичээлийн парын цаг |
| `backend/` | Одоогийн Express/MongoDB backend |
| `backend-legacy/` | Өмнөх JSON backend; одоогийн frontend ашиглахгүй |
| `frontend/reports/` | Өмнөх лабораторийн хэмжилт, тайлан |

## Дүрүүд ба боломжууд

- Админ: хичээл/оюутны бүртгэл, хичээл сонголт батлах/татгалзах, хуваарь зохицуулах, тайлан.
- Багш: өөрийн хичээл, баталгаажсан оюутнууд, дүн, ирц; даалгавар болон шалгалт нийтлэх, оюутны хариу харах/татах.
- Оюутан: төлөвлөгөө, хичээл сонголт, баталгаажсан хуваарь, хувийн дүн/голч, даалгавар болон шалгалтын хариу илгээх.

Багшийн танилцуулгыг бүх дүр харна. Багш, өрөө, тэнхимд backend CRUD API бий; frontend дээр багшийн танилцуулга харах боломжтой, өрөө/тэнхим удирдах тусдаа хуудас одоогоор байхгүй. Оюутны frontend-д нэмэх/устгах бий, засах тусдаа form байхгүй.

### Даалгавар ба шалгалт

`/assignments`, `/exams` хэсгүүд багш, оюутны цэсэнд бий. Одоогийн хялбарчилсан горимд бүх багш нийтэлсэн бүх ажил, оюутны бүх хариуг харна. Бүх оюутан хичээл сонголт/баталгаажуулалтаас үл хамааран нийтэлсэн ажлыг харж хариу илгээнэ. Энэ горим нь дүн, ирц, хуваарийн эрхийн шүүлтийг өөрчлөхгүй.

Багш гарчиг, асуулт/заавар, эцсийн хугацаа, нэг файл нийтэлнэ. «Жишээ бөглөх» товчтой. Оюутан хариу бичих эсвэл нэг файл upload хийж, хугацаанаас өмнө шинэчилж болно. Файл тус бүр 5 MB хүртэл. Шалгалт нь асуулт/файлд хариу илгээх хэлбэртэй; автомат оноолт хэрэгжээгүй. Оюутан зөвхөн өөрийн хариуг харна. Хуудас харагдаж байх үед 5 секунд тутам, мөн tab руу буцаж ороход мэдээлэл шинэчлэгдэнэ.

## Өгөгдөл хаана хадгалагдах вэ?

Үндсэн хадгалалт нь MongoDB-ийн `universityDb`. `students`, `teachers`, `courses`, `rooms`, `departments`, `users`, `courseselections`, `grades`, `attendances`, `planners`, `assessments`, `assessmentsubmissions`, `counters` collection-уудтай. Upload хийсэн файл assessment/submission document-ийн `attachment.name`, `attachment.data` (Base64) талбарт хадгалагдана.

`backend/data/` доторх үндсэн JSON файлууд нь MongoDB-оос экспортолсон хуулбар. Экспортлох үеийн тоо: 40 хичээл, 39 оюутан, 12 багш, 10 өрөө, 2 тэнхим. Эдгээр нь цаашдын API өөрчлөлтөөр автоматаар шинэчлэгдэхгүй. Дахин экспортлох:

```bash
cd backend
node scripts/export-data.js
```

Өмнөх JSON файлуудыг түр хавтсанд нөөцлөөд шинэчилнэ. CSV/import fixture-ууд нь тусдаа лабораторийн жишээ.

## Нэвтрэлт ба эрх

Сайтын JWT хэрэглэгч (`admin`, `teacher`, `student` role) болон MongoDB хэрэглэгч нь тусдаа.

- `universityUser`: зөвхөн `universityDb` дээр `readWrite`; backend ашиглана. Нууц үг `backend/.env` дотор.
- `adminUser`: MongoDB-ийн `root`; админ ажиллагаанд хэрэглэнэ. Нууц үг локал `backend/.env.mongodb-admin` дотор. Backend үүнийг ашиглахгүй.

Хоёр нууц файл Git-д орохгүй. MongoDB authentication идэвхтэй. Compass тохиргоо болон mongosh командуудыг [backend README](backend/README.md#mongodb-д-нэвтрэх)-ээс үзнэ үү.

Сайтын demo нэвтрэлт: `admin / Admin123!`, `teacher1 / Teacher123!`, `student1 / Student123!` (дансны нууц үгийг өөрчлөөгүй үед). Кодтой бусад жишээ оюутны анхны нууц үг `0000`. Эдгээр нь сургалтын локал данс. Нийтийн бүртгэл хаалттай.

JWT хугацаа дуусвал дахин нэвтэрнэ. `JWT_SECRET` соливол өмнөх token хүчингүй болно. Frontend token-ийг localStorage болон SSR жишээний уншигдах cookie-д хадгалдаг; энэ нь production cookie хамгаалалтын загвар биш.

## Шалгалт ба лабораторийн жишээнүүд

Frontend (`frontend/` дотроос): `npx tsc --noEmit`, `npm run lint`, `npm run build`. Бүх шалгалт одоогийн өөрчлөлтөд автоматаар тэнцсэн гэсэн үг биш; тухайн командыг ажиллуулж үр дүнг шалгана.

Backend-ийн тестүүд болон шаардлагатай MongoDB эрхийг [backend README](backend/README.md#тест)-ээс үзнэ үү.

`/courses-client` (CSR), `/courses-server` (SSR), `/about-courses` (статик мэдээлэл), `/reports/baseline`, `/reports/optimized`, `/reports/render-test` нь rendering/гүйцэтгэлийн лабораторийн жишээнүүд. 2026-11-20-ны хэмжилт `frontend/reports/lab56-performance/` дотор; тухайн үеийн 3100/3101 порт, build, өгөгдөлд хамаарна. Одоогийн 3002/3001 системийн шинэ хэмжилт биш.

## Repository-ийн бүтэц ба Vercel

```text
my-app/
├── backend/           # Express + MongoDB REST API
├── frontend/          # Next.js: app, components, lib, package.json
├── shared/            # Хоёр талын ашигладаг хичээлийн парын цаг
├── backend-legacy/    # Өмнөх JSON backend, архив
├── docker/            # Compose MongoDB init
├── compose.yaml
└── README.md
```

Git repository-ийн үндэс `my-app/` хэвээр; frontend болон backend тус бүр өөрийн package.json, node_modules, environment файлтай. Vercel дээр **Root Directory: frontend**, Framework: Next.js, Build: `npm run build`. `frontend/lib/class-periods.ts` нь root-ийн `shared/` ашигладаг тул Vercel-ийн Root Directory тохиргооны **Include source files outside of the Root Directory in the Build Step** сонголтыг идэвхжүүлнэ. API_URL/NEXT_PUBLIC_API_URL нь онлайн HTTPS backend хаяг байна; localhost-ийг нийтэд deploy хийх API хаяг болгож ашиглахгүй.

Docker build болон Compose-ийг repository-ийн үндэс `my-app/` дотроос ажиллуулна. Заавар: [backend README](backend/README.md#docker-оор-api-ажиллуулах). Frontend тусдаа локал 3001, backend локал 3002, ганц Docker backend 5000, Compose backend 5001 порттой.

Production deployment бэлтгэл, CORS origin болон HTTPS API гаргах дараалал: [backend deployment төлөвлөгөө](backend/README.md#https-public-api-гаргах-төлөвлөгөө). Public API болон production domain одоогоор үүсгээгүй.
