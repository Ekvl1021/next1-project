# Лаборатори №8 — MongoDB

Лаборатори №7-ийн `../backend`-ийг хуулж энэ тусдаа backend-ийг үүсгэсэн. Хуучин JSON файлууд хадгалагдсан. MongoDB Student API нь лаборатори №8-ын шинэ contract-ыг ашигладаг; хуучин Next.js frontend-ийн `name/program` form болон array response-д зориулсан кодыг энэ лабораторид өөрчлөөгүй. Swagger эсвэл Postman-аар шинэ API-г туршина.

## Ажиллуулах

Workspace-ийн root дотор MongoDB Community Server, Database Tools, mongosh-ийг `.local-tools/` дотор локал суулгасан. Системийн Homebrew эсвэл PATH-ийг өөрчлөөгүй. MongoDB өгөгдөл `.local-mongodb/data`, log `.local-mongodb/mongod.log` дотор байна.

```sh
cd my-app/backend-lab8
npm install
# Terminal 1: localhost:27017
npm run db:start
# Terminal 2: MongoDB холбогдсоны дараа localhost:3002
npm start
```

MongoDB аль хэдийн ажиллаж байвал дахин `db:start` ажиллуулахгүй. `.env` дотор MongoDB-ийн `MONGODB_HOST`, `MONGODB_PORT`, `MONGODB_DATABASE`, `MONGODB_USERNAME`, `MONGODB_PASSWORD`, `MONGODB_AUTH_SOURCE` тохиргоог тус тусад нь хадгална; `config/db.js` эдгээрээс connection URI-г байгуулна. Compass-д ижил утгуудаар нэвтэрнэ. Өөр компьютерт `.env.example`-ийг хуулж жинхэнэ нууц үг болон JWT_SECRET тохируулна. Lab 7 нь 3000 порт дээр тусдаа хэвээр байна.

Swagger: <http://localhost:3002/api-docs/>. Login `/api/auth/login` эсвэл `/auth/login`; demo admin `admin / Admin123!`, teacher `teacher1 / Teacher123!`, student `student1 / Student123!` (өмнөх seed-ийн password-ийг өөрчлөөгүй тохиолдолд). Authorize-д JWT-г Bearer угтваргүй оруулна. Token-ийн хугацаа `.env`-ийн JWT_EXPIRES_IN-ээс хамаарна.

## Хэрэгжүүлсэн зүйл

- `config/db.js`: Mongoose холболт; холболт болон index амжилттай болсны дараа сервер асна.
- `models/Student.js`: Number `id`, code, firstName, lastName, email, timestamps; id/code/email unique index. `_id` нь MongoDB ObjectId хэвээр, API id-тай солихгүй.
- `controllers/student-controller.js`, `routes/student-routes.js`: MongoDB Student CRUD. ID-г atomic counter-оор үүсгэнэ, гаднаас импортолсон хамгийн их id-г мөн тооцно. Алдаатай create үед ID алгасаж болно.
- GET `/api/students?search=номин&page=1&limit=5`: firstName/lastName/code literal хайлт, өсөх id эрэмбэ, pagination; limit хамгийн их 100.
- GET `/api/students/:id`, POST, PUT, DELETE. `/students` alias мөн ижил шинэ contract ашиглана.
- GET/POST/PUT: admin эсвэл teacher; DELETE: admin. Student role нь №8-ын route бодлогын дагуу 403 авна. Course-ийн өмнөх role бодлого хэвээр.
- `validateStudent`: POST/PUT дөрвөн үндсэн талбарыг заавал авна; id/_id болон үл мэдэгдэх талбарыг оруулахгүй. program/courseId optional. Буруу ID/body 400, олдохгүй бол 404, duplicate code/email 409.
- JWT, CORS, logger, төвлөрсөн error handler, demo-error болон Swagger хадгалсан. Student schema/security/response болон query-уудыг OpenAPI-д нэмсэн.
- `scripts/migrate.js`: students/courses/teachers/departments migration, numeric id conversion, duplicate preflight. Existing ID-г дарж бичихгүй, давтан ажиллуулахад нэмэлт duplicate үүсгэхгүй.
- `scripts/migration-report.js`: эх JSON/MongoDB count, нэмэлт ID, missing/different fields, duplicate id/code/email, `$type` тайлан.
- `scripts/clean-student-ids.js`: CSV-ийн string id-г Number болгоно; invalid/colliding ID байвал өөрчлөхөөс өмнө зогсоно.
- `scripts/verify-lab.js`: Database Tools-аар JSON/CSV import/export, BSON directory болон gzip archive backup, тусдаа restore database-ууд; тоо болон document-ийн бүх утгыг харьцуулна.

Student success response нь `{ "success": true, "data": ... }`; жагсаалт нэмэлт `pagination`-тай. DELETE 200 болон message буцаана. Course/department API энэ үндсэн даалгаврын хүрээнд JSON хэвээр; тэдний хуучин өгөгдлийг MongoDB collection руу migration хийсэн. Нэмэлт Course/Teacher/Department Mongoose Schema/Model-уудыг мөн үүсгэж migration-ийн өмнөх validation/index бэлтгэлд ашигласан. Тэдний API controller-ийг MongoDB руу шилжүүлээгүй.

## Migration ба импорт/экспорт

```sh
npm run migrate
npm run migration:report
npm run ids:clean
npm run lab:verify
npm test
```

Эх өгөгдөл: students 0, courses 3, departments 0. teachers.json байхгүй байсан тул users.json-ийн teacher role-той 1 хэрэглэгчээс зөвхөн id/username/role-г авдаг; passwordHash MongoDB teachers рүү орохгүй. Course-ийн string id-уудыг Number болгож хувиргана. Legacy student-ийн ганц name байвал firstName-д хэвээр авч, дутуу lastName-г `—`, дутуу code-г `LEGACY{id}` болгодог; эдгээр өөрчлөлт тайланд орно.

Жишээ import: `data/import_students.json` 2 student (10,11), `data/students.csv` 3 student (20,21,22). Verification эдгээрийг импортлоод students 5 болно. Давтан ажиллахад ижил fixture-уудыг upsert хийнэ; өөр хүний ID-тай мөргөлдвөл дарж бичихгүй зогсоно. Импортын дараах migration report-ийн students зөрүү +5 нь эдгээр нэмэлт импортын мөрүүд юм. Swagger UI-аар POST/PUT шалгахад id=23, code=SWAGGER-LAB8-TEMP гэсэн нэмэлт жишээ бичлэг үүсгэсэн; үндсэн students одоо 6 бичлэгтэй.

Экспорт: `exports/backup_students.json`, `exports/students_public.json`, `exports/students_export.csv`. Numeric id, JSON array, CSV header болон Монгол кириллийг автоматаар шалгадаг. Backup нь backend-ээс гадна `../../mongo-backups/<timestamp>/` дотор байна. Restore нь эх database-ийг өөрчлөхгүй; test_restore нэр сул байвал түүнийг, үгүй бол timestamp-тай шинэ нэр ашиглана. Archive restore тусдаа `_archive` database руу орно. `--drop` ашиглахгүй.

Database Tools-ийг гараар ашиглах бол workspace root-д:

```sh
export PATH="$PWD/.local-tools/bin:$PATH"
mongosh "mongodb://127.0.0.1:27017/university_course_management"
```

Shell дээр `show collections`, `db.students.countDocuments()`, `db.students.find().limit(5)` болон `db.students.aggregate([{ $project: { id: 1, idType: { $type: "$id" } } }])` шалгана. JSON-ийн `--jsonArray` нь array файлд шаардлагатай; CSV-д `--type=csv --headerline` хэрэглэнэ. Ажилласан командууд болон tool diagnostics нь `reports/lab8-verification.json` дотор хадгалагдана.

## API туршилт

POST/PUT body:

```json
{"code":"ST2026099","firstName":"Номин","lastName":"Бат","email":"nomin99@example.com"}
```

| Туршилт | Үр дүн |
|---|---|
| GET /api/students, GET /api/students/10 | 200 |
| GET /api/students/abc | 400 |
| GET /api/students/999999 | 404 |
| POST /api/students (admin/teacher) | 201, сервер numeric id үүсгэнэ |
| PUT /api/students/:id (admin/teacher) | 200 |
| DELETE /api/students/:id (admin) | 200 |
| Token байхгүй, хүчингүй эсвэл хугацаа дууссан | 401 |
| Teacher DELETE, student Student API | 403 |
| Хоосон/буруу body | 400 |
| Давхардсан code/email | 409 |

`npm test` бодит MongoDB дээр `lab8_api_test_*` тусдаа database үүсгэж, дуусахдаа зөвхөн тэр database-ийг цэвэрлэнэ. CRUD persistence, concurrent create, string id cleanup, JWT/role, CORS headers, Swagger, 404/500 шалгана. Main database болон JSON файлыг тест өөрчлөхгүй.

## Compass болон screenshot

Compass-д `mongodb://127.0.0.1:27017` URI ашиглана. `university_course_management` дээр migration collection/document-уудаа харна. Давтан GUI импорт нь үндсэн students-ийн unique талбаруудтай мөргөлдөх тул GUI туршилтыг тусдаа collection дээр хийнэ. JSON/CSV import хийхдээ id-г Number болгоод, Export Data-аас JSON/CSV гаргаж header, кирилл болон document count-ийг CLI экспорттой харьцуулна.

Албан ёсны суулгах заавар: [MongoDB macOS](https://www.mongodb.com/docs/v8.0/tutorial/install-mongodb-on-os-x/), [Database Tools](https://www.mongodb.com/docs/database-tools/installation/).

## Шалгалтын нотолгоо

- `reports/api-test.log`: бодит MongoDB дээр 8 тест, 8 pass, 0 fail.
- `reports/mongosh-check.txt`: ping, collection жагсаалт, импортын id-ийн `$type`.
- `reports/lab8-verification.json`: ажилласан import/export/backup/restore командууд, count, document equality.
- `reports/migration-report.json`: JSON ба MongoDB-ийн ялгаа. Импорт болон Swagger жишээ нь JSON source-д байхгүй тул нэмэлт ID гэж гарна.
- Safari Swagger UI: admin login 200, Student GET 200, POST 201 (id 23), PUT 200 баталгаажсан. DELETE болон алдааны/role кейсүүдийг автомат API тестээр шалгасан.

Postman ашиглах бол `postman/lab8.postman_collection.json`-ийг Import хийнэ. Base URL нь localhost:3002. Collection Runner-ийг дарааллаар ажиллуулахад demo role token-ууд авна, зөвхөн өөрийн үүсгэсэн test student-ийг CRUD хийнэ; response status assertion-уудтай. Token хугацаа дуусвал дахин login хийнэ. Collection-ийг Postman app дотор ажиллуулж шалгаагүй; API-ийн ижил кейсүүд автомат тестээр баталгаажсан.

Compass 1.53.2 нь workspace-ийн `../../.local-tools/compass/MongoDB Compass.app` дотор суусан бөгөөд localhost:27017-д холбогдсон. GUI дээр database жагсаалт харагдсаныг баталгаажуулсан. Гэхдээ UI automation нь collection нээх/импортлох оролдлогод `noWindowsAvailable` алдаа давтан өгсөн тул Compass GUI Import/Export болон түүний screenshot баталгаажаагүй. CLI import/export болон directory/archive restore нь бүрэн шалгагдсан; GUI алхмууд дээрх зааврын дагуу үлдсэн.

## Нэмэлт 7 даалгаврын баталгаажуулалт

Бүх нэмэлт даалгаврын хэрэгжилтийг шалгасан. `test/api.test.js` нь Course/Teacher/Department model-уудыг бодит MongoDB-д хадгалж, буруу болон давхардсан ID-г шалгана. Student API-ийн хайлтыг firstName (`болор`), lastName (`бат`), code (`concurrent0`) тус бүрээр шалгаж, page=1/limit=5 болон хоёр дахь хуудсанд давхардсан мөргүйг баталгаажуулдаг. Duplicate code/email 409, CSV string ID хувиргалт болон мөргөлдвөл урьдчилан зогсох шалгалтуудтай. Нийт 9 тест амжилттай.

`npm run backup:verify` шинэ команд нь импорт/migration хийхгүйгээр одоогийн database-ийг archive+gzip backup авч, шинэ `test_restore_<timestamp>_<suffix>` database руу сэргээнэ. Эх database-ийг өөрчлөхгүй, --drop хэрэглэхгүй. Collection бүрийн document count болон бүх document-ийн утгыг харьцуулж `reports/backup-restore-report.json` гаргана. Иймээс өмнө импортолсон оюутнаа Swagger-аар зассан үед ч энэ командыг ашиглаж болно; `lab:verify`-ийн fixture импорт дахин ажиллахгүй.

Ажиллуулах:

```sh
cd my-app/backend-lab8
npm test
npm run ids:clean
npm run migration:report
npm run backup:verify
```

2026-11-20-ны нэмэлт шалгалт: CSV cleanup converted=0/total=6 (одоогийн ID-ууд зөв Number); backup restore students 6→6, courses 3→3, teachers 1→1, departments 0→0, counters 1→1. Бүх document-ийн утга таарсан. Нотолгоо: `reports/additional-tasks.json`, `reports/additional-api-test.log`, `reports/migration-report.json`, `reports/backup-restore-report.json`.

Course/Teacher/Department Schema/Model бий болсон ч тэдний API controller-ууд JSON ашиглаж байгаа; Student CRUD нь MongoDB ашигладаг. teachers.json байхгүй үед migration report нь users.json-ийн teacher account-уудаас авсан эх үүсвэрийн тоог харуулдаг.

## Department JSON импорт экспортын баталгаажуулалт

2026-11-20-нд `data/departments.json` файлд id=1 Мэдээллийн технологи, id=2 Математик гэсэн 2 жишээ тэнхим нэмсэн. Өмнөх хоосон файлыг `reports/departments-before-import.json` дотор хадгалсан. Бодит `mongoimport` ажиллуулж MongoDB departments 0→2 болсон; `mongoexport`-оор `exports/departments_export.json` дотор 2 мөр гаргасан. JSON array, numeric id, мөрийн тоо, name болон Монгол кирилл утгууд таарч байгааг assertion-аар шалгасан.

Дахин шалгах команд: `npm run departments:verify`. Ижил ID-тай боловч өөр өгөгдөл байвал дарж бичихгүй зогсоно. Нотолгоо: `reports/departments-json-verification.json`. Одоогийн migration report-д departments JSON=2, MongoDB=2, зөрүү=0. Өмнөх backup тайлан дахь departments=0 нь тухайн backup авсан үеийн түүхэн тоо юм. Энэ үйлдэл зөвхөн backend-lab8-ийн JSON болон MongoDB-д хийгдсэн; өмнөх backend-ийн JSON API хэвээр.

## EDURA сургалтын орчин — 2026-11-26

Frontend нь http://localhost:3001/dashboard, API ба Swagger нь localhost:3002 дээр ажиллана. Хэрэглэгчид харагдах нэр EDURA болсон; хуучин нэвтрэлтийн хадгалалтын түлхүүрүүд нийцтэй хэвээр.

- Оюутан: нүүр, курс/улирлаар санал болгох төлөвлөгөө, хичээл сонголтын хүсэлт, баталгаажсан хуваарь, багшийн дүн, хувийн голч тооцоолуур, багшийн танилцуулга.
- Админ: сонголтын хүсэлт батлах/татгалзах, нэгдсэн хуваарь тохируулах, хичээл/оюутны бүртгэл, багшийн танилцуулга, тайлан.
- Багш: зөвхөн өөрийн заадаг хичээлүүд, баталгаажсан сонголттой оюутнууд, дүн оруулах, ирц бүртгэх, багшийн танилцуулга. Хичээл сонголт болон миний хуваарь цэс байхгүй.

Хуваарь `Course.sessions` дотор day (0=Даваа ... 6=Ням), start, end, room, kind талбаруудаар хадгалагдана. Админы `/schedule` хэсэгт нэг хичээлд олон өдрийн лекц/лаборатори оруулж болно. Өөр өдрийн ижил цаг давхцал биш. Багш/өрөөний давхцал, бүртгэлтэй оюутны өөр хичээлийн давхцлыг сервер шалгана. Хуучин schedule текстийг дэмжсэн хөрвүүлэлттэй.

Хүсэлт pending → approved/rejected шилжинэ. Шийдвэрлэсэн хүсэлтийг дахин батлахад 409; баталгаажсан хичээлийг оюутан өөрөө цуцлахгүй. Оюутны хуваарь зөвхөн approved сонголт болон админы тогтоосон цагуудаас үүснэ. Багшид pending хүсэлт очихгүй. Нэг оюутны зэрэгцээ баталгаажуулалтыг энэ API процесс дотор дарааллуулдаг.

`/api/academic/grades` нь багшийн албан үнэлгээг тусдаа Grade collection-д хадгална. Зөвхөн тухайн хичээлийн багш, баталгаажсан оюутанд 0–100 оноо оруулна. Оюутан өөрийн дүнг харна. Хувийн GPA тооцоолуурын мэдээлэл Planner.grades-д тусдаа хадгалагдаж, PATCH хүсэлт зөвхөн өөрчилсөн бүлгээ шинэчилнэ. Өөр табын хуучин schedule/tasks нь дүнг дарж арилгахгүй.

`node scripts/expand-curriculum.js` командаар 4 курс, 8 улирлын нийт 40 хичээл / 120 кредитийн сургалтын жишээ төлөвлөгөө бэлдсэн. Өмнө байсан 9 хичээлийг хадгалж, 31-ийг нэмсэн. Өөрчлөхөөс өмнөх Course/Teacher өгөгдөл reports/curriculum-before-*.json-д бий. Хөрөг зураг нь Random User-ийн жишээ зураг; сургуулийн бодит багшийн баталгаажсан зураг биш.

Шалгалт: `npm test` 13/13 pass, үүнд зэрэгцээ баталгаажуулалт, хоёр өөр өдрийн ижил цаг, ижил өдрийн давхцал, дүнгийн хадгалалт, GPA-ийн бүлэгчилсэн PATCH, эрхийн хязгаарлалт багтсан. Frontend `npx tsc --noEmit` болон тусдаа build (`LAB_DIST_DIR=.next-portal-check npm run build`) амжилттай. Багшийн шинэ directory-ийн desktop харагдацыг Safari дээр шалгасан. Browser host тасалдсан тул бүх дүрийн browser үйлдлийг төгсгөл хүртэл автоматжуулж шалгаагүй; API тест болон HTTP шалгалт хийсэн.

Оюутны өргөтгөл: `node scripts/expand-students.js` командаар өмнөх 6 бүртгэлийг хадгалж 34 жишээ оюутан нэмсэн, нийт 40. student1 нэвтрэх дансанд дутуу байсан Student profile нэмсэн. Бусад жишээ оюутны нэвтрэх данс эсвэл баталгаажсан сонголтыг автоматаар үүсгээгүй. Давтан ажиллуулахад 40-өөс давуулж нэмэхгүй. Нотолгоо: reports/student-expansion.json. Эх төлөв: reports/students-before-expansion-*.json.

Compass-ийн хадгалсан URI дахь бодит портыг 27017-оос 27018 болгож Save & Connect хийсэн. Connected to 127.0.0.1:27018 болон university_course_management database GUI дээр харагдсаныг баталгаажуулсан.

2026-11-26: Одоогийн 40 Student profile бүр нэвтрэх данстай болсон. Оюутны нэвтрэх нэр нь code, нууц үг нь хэрэглэгчийн хүсэлтээр `0000`. Багш болон админы нууц үгийг өөрчлөөгүй. Багшийн дүнгийн хуудас сонгосон хичээл/улирлыг хэрэглэгч тус бүрээр санаж, хадгалсан бүх дүнг тусдаа хүснэгтэд серверээс дахин уншиж харуулна. Улирлын урд/хойд зайг цэвэрлэж оноо хоосон харагдахаас сэргийлсэн.

Сүүлийн нэвтрэлтийн тохиргоо: хэрэглэгчийн хүсэлтээр зөвхөн `student1` demo дансны хуучин `Student123!` нууц үгийг сэргээсэн. Кодтой бусад оюутны нууц үг `0000` хэвээр. student1 нь student role-оор оюутны бүх цэсийг ашиглана; бусад оюутны хувийн дүнг харахгүй.

### Сонгосон хичээлийн 1–5-р парын хуваарь

Хуваарь нь мөрөөр 1–5-р пар, баганаар Даваа–Ням харагдана. Цагийн нэг эх үүсвэр: `../shared/class-periods.json`: 1-р пар 08:40–10:10, 2-р пар 10:20–11:50, 3-р пар 12:00–13:30, 4-р пар 13:40–15:10, 5-р пар 15:20–16:50. Админ хуваарь засахдаа өдөр болон пар сонгоно; дараалсан эсвэл өөр өдрийн олон пар нэмж болно.

Бүх каталогийн хичээлийг автоматаар хуваарьт байрлуулахгүй. Админы тохируулах жагсаалтад pending/approved сонголттой хичээлүүд л орно. Үндсэн хүснэгтэд approved оюутантай хичээлүүд, оюутны хувийн хуваарьт зөвхөн өөрийн approved сонголт харагдана. Сонгогдоогүй каталогийн хичээлийн жишээ цаг багш/өрөөг эзлэхгүй. Админ батлах үед бодит баталгаажсан хичээлийн багш, өрөө, оюутны цагийн давхцлыг шалгана.

Бүх 40 хичээлд хийсэн түр автомат байршуулалтыг хэрэглэгчийн залруулгын дагуу бүрэн буцаасан; period-schedule-report.json нь applied=false. Зөвхөн одоогийн approved сонголттой 3 хичээлийн хуучин цагийг стандарт парын хилд ойртуулсан. Сонгогдоогүй 37 хичээл, дүн, хүсэлтийн төлөвийг өөрчлөөгүй. Нотолгоо: reports/selected-periods-report.json; өмнөх цагийн хуулбар: reports/selected-periods-before-*.json.

Ирц бүртгэх хуудасны хичээл/огнооны талбарууд padding, шошго, тусдаа хүрээтэй болсон; зөвхөн баталгаажсан roster харагдана. Бүгд ирсэн товч, тэмдэглэсэн оюутны тоо, хадгалсан ирцийн дахин уншилттай. API болон парын шалгалт нийлээд 17/17 pass.

MongoDB-ийн одоогийн үндсэн өгөгдлийг `data/students.json`, `teachers.json`, `rooms.json`, `departments.json`, `courses.json` руу шинэчлэх: `node scripts/export-data.js` (`backend-lab8` дотроос). Скрипт өмнөх JSON файлуудыг түр хавтсанд нөөцлөөд шинэчилнэ. Эдгээр нь экспортын snapshot тул цаашдын API өөрчлөлт автоматаар JSON руу бичигдэхгүй.

## Одоогийн нэгдсэн локал MongoDB

Холболт `mongodb://127.0.0.1:27017/universityDb`. Backend, mongosh болон Compass бүгд энэ порт, database-ийг ашиглана. `.env`-ийн `MONGODB_URI` энэ холболттой. MongoDB аль хэдийн ажиллаж байвал дахин сервер асаахгүй; `npm run db:start` ажиллаж байгааг шалгана. Хуучин 27018 сервер зогссон, өгөгдөл нь нөөцөөр хадгалагдсан.

MongoDB authentication идэвхтэй. Backend `.env` дахь `universityUser`-ээр зөвхөн `universityDb` дээр `readWrite` эрхтэй холбогдоно; authentication-гүй `MONGODB_URI` ашиглахгүй. Админы credential `.env.mongodb-admin` файлд тусдаа хадгалагдаж Git-д орохгүй. Терминал: `mongosh --host 127.0.0.1 --port 27017 --username universityUser --authenticationDatabase universityDb universityDb` (нууц үгийг prompt дээр оруулна). Админд `--username adminUser --authenticationDatabase admin` ашиглана.
