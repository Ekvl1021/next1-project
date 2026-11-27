# EDURA backend — Express ба MongoDB

Одоогийн frontend-ийн backend. Student, Course, Teacher, Room, Department болон сургалтын бусад мэдээллийг Mongoose/MongoDB-оос уншиж хадгална. `../backend/` нь өмнөх JSON хувилбар.

## Холболт ба ажиллуулах

| Үйлчилгээ | Утга |
|---|---|
| API | `http://localhost:3002` |
| Swagger | `http://localhost:3002/api-docs/` |
| Frontend origin | `http://localhost:3001` |
| MongoDB | `127.0.0.1:27017` |
| Database | `universityDb` |

Одоогийн компьютер дээр MongoDB нь Homebrew service:

```bash
brew services start mongodb-community
cd /Users/macbookair/Documents/NEXT_1/my-app/backend-lab8
npm start
```

Код өөрчлөх үед `npm run dev` нь Node watch горим ашиглана. Backend MongoDB-д амжилттай холбогдсоны дараа HTTP серверээ асаана. MongoDB аль хэдийн ажиллаж байвал дахин сервер асаахгүй. Хуучин 27018 сервер зогссон; одоогийн backend, Compass, mongosh бүгд 27017 ашиглана.

`npm run db:start` нь localhost портыг шалгаад, сервер байхгүй үед workspace-ийн хуучин `.local-mongodb/data` хавтсаас MongoDB асаах fallback helper юм. Энэ нь Homebrew-ийн одоогийн data directory биш тул одоогийн орчинд Homebrew service-ээ ашиглана. Homebrew config: `/opt/homebrew/etc/mongod.conf`, data: `/opt/homebrew/var/mongodb`.

## Орчны тохиргоо

Шинэ checkout дээр `npm install` ажиллуулж, `.env.example`-ээс `.env` үүсгэн бодит утгууд тохируулна. Байгаа `.env`-ийг дарж бичихгүй.

```dotenv
PORT=3002
JWT_SECRET=өөрийн-үүсгэсэн-урт-санамсаргүй-түлхүүр
JWT_EXPIRES_IN=1h
CORS_ORIGINS=http://localhost:3001
MONGODB_HOST=127.0.0.1
MONGODB_PORT=27017
MONGODB_DATABASE=universityDb
MONGODB_USERNAME=universityUser
MONGODB_PASSWORD=өөрийн-нууц-үг
MONGODB_AUTH_SOURCE=universityDb
```

`JWT_SECRET` дор хаяж 32 тэмдэгттэй байна; `openssl rand -hex 32` ашиглаж үүсгэж болно. Энэ нь MongoDB нууц үг биш. `.env` дахь `JWT_EXPIRES_IN` нь token-ийн хугацаа; өөрчилсний дараа backend restart хийж дахин login хийнэ.

`config/db.js` нь дээрх MongoDB талбаруудаас URI байгуулж, нууц үгийн тусгай тэмдэгтүүдийг encode хийнэ. `MONGODB_URI` байвал түүнд давуу эрх өгнө; тусдаа талбаруудаар тохируулж байгаа үед хуучин authentication-гүй URI үлдээхгүй.

## MongoDB-д нэвтрэх

Authentication идэвхтэй. Эдгээр нь сайтын admin/teacher/student данснаас тусдаа MongoDB хэрэглэгчид.

| Хэрэглэгч | Эрх | Локал нууц үг |
|---|---|---|
| `universityUser` | Зөвхөн `universityDb` дээр `readWrite` | `.env` → `MONGODB_PASSWORD` |
| `adminUser` | `admin` database дахь `root` | `.env.mongodb-admin` → `MONGODB_ADMIN_PASSWORD` |

Backend зөвхөн `universityUser` ашиглана. Нууц файлууд Git-д орохгүй, шинэ clone-д автоматаар ирэхгүй. Шинэ MongoDB сервер дээр эдгээр хэрэглэгчийг админ эрхтэйгээр тусад нь үүсгэж authentication идэвхжүүлэх шаардлагатай.

Энгийн Terminal дээр төслийн хэрэглэгчээр:

```bash
mongosh --host 127.0.0.1 --port 27017 --username universityUser --authenticationDatabase universityDb universityDb
```

Админаар:

```bash
mongosh --host 127.0.0.1 --port 27017 --username adminUser --authenticationDatabase admin
```

Нууц үгийг prompt дээр оруулна. Mongosh дотор:

```javascript
use universityDb
show collections
db.courses.findOne()
db.students.countDocuments()
```

Командуудыг нэг нэгээр нь ажиллуулна. `mongosh ...` нь энгийн Terminal команд; `universityDb>` prompt дотор дахин бичихгүй. `show collections` нь олон тоогоор бичигдэнэ.

Compass: Host `127.0.0.1`, Port `27017`, Authentication `Username/Password`, Username `universityUser`, Password `.env`-ээс, Authentication Database `universityDb`. Админ хэрэглэгчийн Authentication Database нь `admin`. Connection-ийн Name нь зөвхөн харагдах нэр; бодит порт General/URI дотор тохируулагдана.

## API ба эрх

`POST /api/auth/login` (мөн `/auth/login`) нь JWT буцаана. Нийтийн register 403; дансыг удирдлагын урсгалаар үүсгэнэ. Swagger-ийн Authorize талбарт token-ийг `Bearer` угтваргүй оруулна.

| API | Хандах эрх |
|---|---|
| `/api/students` | GET: admin/teacher; POST: admin; PUT/PATCH: admin/teacher; DELETE: admin |
| `/api/courses` | GET: нэвтэрсэн хэрэглэгч; POST/PUT/PATCH/DELETE: admin |
| `/api/teachers`, `/api/departments`, `/api/rooms` | GET: нэвтэрсэн хэрэглэгч; бичих/устгах: admin |
| `/api/course-selections` | Оюутны хүсэлт, админы батлах/татгалзах урсгал |
| `/api/academic` | Profile, schedule, roster, багшийн дүн |
| `/api/attendance` | Багшийн ирц |
| `/api/planner` | Хэрэглэгчийн хувийн төлөвлөгөө |
| `/api/assessments` | Багш, оюутны даалгавар/шалгалт |

Student, Course, Teacher, Department API-д `/students`, `/courses`, `/teachers`, `/departments` alias бий. Student жагсаалт нь `{success,data,pagination}`; хайлт `search`, pagination `page`, `limit` (хамгийн их 100). Student numeric `id` болон MongoDB `_id` нь тусдаа.

Student POST/PUT жишээ:

```json
{"code":"ST2026099","firstName":"Номин","lastName":"Бат","email":"nomin99@example.com"}
```

Validation/body/ID алдаа 400, token алдаа 401, эрх хүрэхгүй 403, олдохгүй 404, давхардсан unique талбар 409. CORS, request logger болон төвлөрсөн error handler ашиглана. `/api/demo-error` зориуд 500 буцаана. OpenAPI: `swagger/openapi.yaml`, JSON: `/api-docs/openapi.json`. Шинэ assessment API-ийн заавар дараагийн хэсэгт; Swagger бүх шинэ урсгалыг бүрэн жагсаасан гэж үзэхгүй.

## Даалгавар ба шалгалт

Одоогийн хялбарчилсан горимд бүх багш бүх ажлыг, бүх оюутны хариуг харна. Бүх оюутан хичээл сонголтын төлөвөөс үл хамааран бүх ажилд хариу илгээнэ. Оюутан өөрийн хариу болон хариуны файлыг л харна. Нийтэлсэн материалын файл бүх багш/оюутанд харагдана.

- `GET /api/assessments`: хичээлүүд, ажлууд, тухайн хэрэглэгчид харагдах хариунууд.
- `POST /api/assessments`: багш нийтэлнэ; `courseId`, `kind` (`assignment`/`exam`), `title`, `description`, ирээдүйн `dueAt`, optional `attachment`.
- `PUT /api/assessments/:id/submission`: оюутан `answer`, optional `attachment` илгээнэ. Хариу эсвэл файл шаардлагатай. Хугацаа дуусахаас өмнө өөрийн хариуг шинэчилж болно.
- `GET /api/assessments/:id/file`: нийтэлсэн материал; `?submission=ID` нэмбэл хариуны файл.

`attachment` нь `{name,data}`; `data` Base64. Файл тус бүр 5 MB хүртэл. Assessment хүсэлтийн JSON limit 8 MB, бусад API 32 KB. Жагсаалтад файлын агуулга ирэхгүй; татах API-аар уншина. Шалгалт нь файл/текст хариу авах хэлбэртэй, автомат оноолт байхгүй. Frontend 5 секунд тутам шинэчлэгдэнэ.

`node scripts/seed-assessments.js` нь багш бүрийн нэг хичээлд жишээ даалгавар/шалгалт, зааврын файл нэмнэ; давтан ажиллуулахад давхардуулахгүй.

## Хичээл сонголт, хуваарь, дүн, ирц

Хүсэлт `pending` → `approved`/`rejected`. Оюутны хуваарь зөвхөн баталгаажсан сонголтоос бүрдэнэ. Багш өөрийн хичээлийн баталгаажсан оюутанд дүн, ирц оруулна. Даалгавар/шалгалтын нээлттэй горим эдгээр эрхийг өөрчлөхгүй.

Пар: `../shared/class-periods.json`; 1-р пар 08:40–10:10, 2-р пар 10:20–11:50, 3-р пар 12:00–13:30, 4-р пар 13:40–15:10, 5-р пар 15:20–16:50. `Course.sessions` нь day (0=Даваа ... 6=Ням), start, end, room, kind хадгална. Админ хуваарь тохируулж, сервер багш/өрөө/оюутны давхцлыг шалгана. Багшийн Grade болон оюутны хувийн Planner GPA нь тусдаа хадгалалттай.

## Өгөгдөл, экспорт, migration

Collection-ууд: `students`, `teachers`, `rooms`, `departments`, `courses`, `users`, `courseselections`, `grades`, `attendances`, `planners`, `assessments`, `assessmentsubmissions`, `counters`.

`data/` дахь үндсэн JSON snapshot: students 39, teachers 12, rooms 10, departments 2, courses 40 (2026-11-27-ны экспорт). Энэ нь runtime database-ийн цаашдын өөрчлөлтөөр автоматаар шинэчлэгдэхгүй.

```bash
node scripts/export-data.js
```

Өмнөх JSON-ийг түр хавтсанд нөөцлөөд таван үндсэн файлыг MongoDB-оос шинэчилнэ. `data/users.json` болон CSV/import fixture-уудыг энэ команд өөрчлөхгүй. JSON экспорт нь database-ийн бүрэн backup биш.

Лабораторийн migration/import/backup helper-ууд `scripts/` дотор бий: `npm run migrate`, `npm run migration:report`, `npm run ids:clean`, `npm run lab:verify`, `npm run backup:verify`, `npm run departments:verify`. Import/seed/cleanup нь өгөгдөл өөрчилж болно. Backup/restore helper нь тусдаа database үүсгэх эрх шаарддаг; өдөр тутмын `universityUser` зөвхөн үндсэн database дээр эрхтэй тул эдгээрт админы/тусгай орчны холболт шаардлагатай. Хуучин тайлангийн database нэр, мөрийн тоо нь тухайн үеийн түүхэн үр дүн.

## Тест

Database-гүй парын тест:

```bash
node --test test/periods.test.js
```

Одоогийн `.env` холболт дээр түр нэртэй collection үүсгээд цэвэрлэдэг assessment integration тест:

```bash
node --test test/assessments.test.js
```

Бүрэн suite:

```bash
npm test
```

`test/api.test.js` нь `MONGODB_TEST_URI` (өгөхгүй бол 27017) ашиглан `lab8_api_test_*` тусдаа database үүсгэнэ. Authentication асаалттай орчинд тэр database-ийг үүсгэх/цэвэрлэх эрхтэй тестийн холболт заавал тохируулна. Үндсэн database-ийн `readWrite` хэрэглэгч хангалтгүй. Credential-ийг командын түүх эсвэл Git-д оруулахгүй. Бүрэн suite-ийг authentication өөрчилснөөс хойш дахин тэнцсэн гэж баримтжуулаагүй.

Өмнөх migration, performance, backup тайлангууд `reports/` болон `../reports/` дотор хадгалагдсан; эдгээр нь одоогийн dataset-ийн шинэ баталгаа биш.
