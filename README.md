# EDURA сургалтын систем

Next.js frontend, Express API болон MongoDB ашигладаг сургалтын жишээ систем. Одоогийн backend нь `backend-lab8/`; `backend/` нь лабораторийн өмнөх JSON хувилбар.

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
cd /Users/macbookair/Documents/NEXT_1/my-app/backend-lab8
npm start
```

Frontend — өөр Terminal tab дээр:

```bash
cd /Users/macbookair/Documents/NEXT_1/my-app
npm run dev
```

Хөгжүүлэлтийн үед backend кодыг автоматаар дахин ачаалахад `npm run dev` хэрэглэж болно. Terminal процессыг `Ctrl + C`-ээр зогсооно. MongoDB service нь тусдаа ажиллана.

## Шинэ орчинд тохируулах

`my-app` болон `my-app/backend-lab8` тус бүрд `npm install` ажиллуулна. Байгаа `.env` файлыг жишээгээр дарж бичихгүй.

Frontend-ийн `.env.local`:

```dotenv
API_URL=http://localhost:3002
NEXT_PUBLIC_API_URL=http://localhost:3002
```

Backend-ийн тохиргоог `backend-lab8/.env.example`-ээс эхлүүлнэ. `JWT_SECRET` болон MongoDB нууц үгийг бодит утгаар тохируулна. MongoDB database, хэрэглэгчийн эрх болон authentication бэлэн байх шаардлагатай; [backend-ийн заавар](backend-lab8/README.md)-ыг үзнэ үү. `JWT_SECRET` үүсгэх команд: `openssl rand -hex 32`.

## Хавтаснууд

| Зам | Агуулга |
|---|---|
| `app/` | Next.js хуудсууд, CSS |
| `components/` | Frontend-ийн харагдац, үйлдлүүд |
| `context/` | Нэвтэрсэн хэрэглэгчийн төлөв |
| `lib/` | API client, төрөл, цэс, session helper |
| `public/` | Статик зураг |
| `shared/` | Хичээлийн парын цаг |
| `backend-lab8/` | Одоогийн Express/MongoDB backend |
| `backend/` | Өмнөх JSON backend; одоогийн frontend ашиглахгүй |
| `reports/` | Өмнөх лабораторийн хэмжилт, тайлан |

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

`backend-lab8/data/` доторх үндсэн JSON файлууд нь MongoDB-оос экспортолсон хуулбар. Экспортлох үеийн тоо: 40 хичээл, 39 оюутан, 12 багш, 10 өрөө, 2 тэнхим. Эдгээр нь цаашдын API өөрчлөлтөөр автоматаар шинэчлэгдэхгүй. Дахин экспортлох:

```bash
cd backend-lab8
node scripts/export-data.js
```

Өмнөх JSON файлуудыг түр хавтсанд нөөцлөөд шинэчилнэ. CSV/import fixture-ууд нь тусдаа лабораторийн жишээ.

## Нэвтрэлт ба эрх

Сайтын JWT хэрэглэгч (`admin`, `teacher`, `student` role) болон MongoDB хэрэглэгч нь тусдаа.

- `universityUser`: зөвхөн `universityDb` дээр `readWrite`; backend ашиглана. Нууц үг `backend-lab8/.env` дотор.
- `adminUser`: MongoDB-ийн `root`; админ ажиллагаанд хэрэглэнэ. Нууц үг локал `backend-lab8/.env.mongodb-admin` дотор. Backend үүнийг ашиглахгүй.

Хоёр нууц файл Git-д орохгүй. MongoDB authentication идэвхтэй. Compass тохиргоо болон mongosh командуудыг [backend README](backend-lab8/README.md#mongodb-д-нэвтрэх)-ээс үзнэ үү.

Сайтын demo нэвтрэлт: `admin / Admin123!`, `teacher1 / Teacher123!`, `student1 / Student123!` (дансны нууц үгийг өөрчлөөгүй үед). Кодтой бусад жишээ оюутны анхны нууц үг `0000`. Эдгээр нь сургалтын локал данс. Нийтийн бүртгэл хаалттай.

JWT хугацаа дуусвал дахин нэвтэрнэ. `JWT_SECRET` соливол өмнөх token хүчингүй болно. Frontend token-ийг localStorage болон SSR жишээний уншигдах cookie-д хадгалдаг; энэ нь production cookie хамгаалалтын загвар биш.

## Шалгалт ба лабораторийн жишээнүүд

Frontend: `npx tsc --noEmit`, `npm run lint`, `npm run build`. Бүх шалгалт одоогийн өөрчлөлтөд автоматаар тэнцсэн гэсэн үг биш; тухайн командыг ажиллуулж үр дүнг шалгана.

Backend-ийн тестүүд болон шаардлагатай MongoDB эрхийг [backend README](backend-lab8/README.md#тест)-ээс үзнэ үү.

`/courses-client` (CSR), `/courses-server` (SSR), `/about-courses` (статик мэдээлэл), `/reports/baseline`, `/reports/optimized`, `/reports/render-test` нь rendering/гүйцэтгэлийн лабораторийн жишээнүүд. 2026-11-20-ны хэмжилт `reports/lab56-performance/` дотор; тухайн үеийн 3100/3101 порт, build, өгөгдөлд хамаарна. Одоогийн 3002/3001 системийн шинэ хэмжилт биш.
