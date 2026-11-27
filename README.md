# Surgaal сургалтын систем

Энэ workspace нь Next.js frontend (`my-app`) болон JSON файлд өгөгдөл хадгалдаг Express backend (`backend`)-ээс бүрдэнэ.

## Ажиллуулах

1. `backend` хавтас руу орж `npm install` ажиллуул.
2. `.env.example`-ийг `.env` болгон хуулж, `JWT_SECRET`-ийг 32 тэмдэгтээс урт санамсаргүй утгаар солино.
3. `npm run seed` нь зөвхөн хоосон `data/users.json` дээр demo хэрэглэгч үүсгэнэ. Нэр/нууц үг: `admin / Admin123!`, `teacher1 / Teacher123!`, `student1 / Student123!`. Эдгээр нь сургалтын локал өгөгдөлд зориулагдсан.
4. `npm run dev` ашиглан API-г 3000 порт дээр эхлүүл.
5. Next.js-ийн `.env.local.example`-ийг `.env.local` болгон хуулна. Frontend-ийг `npm run dev` гэж эхлүүл; frontend `http://localhost:3001` дээр ажиллана.

Backend endpoint-үүд:

- `POST /auth/register`, `POST /auth/login` (нийтийн)
- `GET /students` (optional `?search=` filters by name, email or program), `POST /students`, `DELETE /students/:id`; бүгд `/api/students` alias-тай
- Course CRUD: `/courses` болон `/api/courses` замууд
- Department CRUD: `/departments` болон `/api/departments`; `GET` нь нэвтэрсэн бүх role-д, `POST` зөвхөн admin-д
- `GET /teachers` болон `/api/teachers`: нэвтэрсэн хэрэглэгч шаарддаг

Course/student/department endpoint-үүдэд Bearer JWT шаардана. Бүх role жагсаалт харж болно; admin/teacher course нэмэх, засах; зөвхөн admin course устгах, department нэмэх; admin/teacher student нэмэх; зөвхөн admin student устгах эрхтэй. Register нь role-г хүсэлтээс авахгүй бөгөөд `student` онооно. `users.json` дотор зөвхөн bcrypt hash хадгална.

Frontend-д JWT-г сургалтын хувилбарын дагуу `localStorage` болон SSR жишээг ажиллуулах уншигдах cookie-д хадгалж байна. Энэ нь XSS-д өртөмтгий. Production системд login-ийг серверийн proxy-оор дамжуулж `HttpOnly; Secure; SameSite` cookie тохируулах хэрэгтэй. Браузерын role-based товчнууд нь UX давхарга бөгөөд backend authorization-г орлохгүй.

JWT хугацаа дуусахад frontend token болон session-ийг цэвэрлэж login хуудас руу шилжүүлнэ. Backend-ийн `JWT_EXPIRES_IN`-ийг өөрчилсний дараа backend-ийг дахин эхлүүлж, шинэ token авахын тулд дахин нэвтэрнэ.

## Rendering харьцуулах

- `/courses-client`: `useEffect`-ээр браузераас API дуудах CSR жишээ.
- `/courses-server`: `cache: no-store` ба cookie-с token дамжуулан хүсэлт бүрд серверээс унших SSR жишээ. Cookie байхгүй/хуучирсан үед API 401 буцаана.
- `/about-courses`: нийтийн тогтмол мэдээллийг статик болгох SSG жишээ.
- `/reports`: `next/dynamic` болон `React.lazy` аргыг сонгон турших; `/reports/eager` нь шууд import жишээ; `/reports/baseline` нь memoization/lazy loading-гүй, энгийн `<img>` хэрэглэсэн Туршилтын A; `/reports/optimized` нь dynamic import ба `next/image` хэрэглэсэн Туршилтын B.

## Лаборатори №5–6 Бодит гүйцэтгэлийн хэмжилт

2026-11-20-нд тусдаа production build дээр хэмжсэн. Frontend `localhost:3101`, JSON backend `localhost:3100`; ердийн frontend/backend 3001/3000 портод тусдаа ажиллана. Next.js 16.4.2, Webpack production, Tailwind 4.3.3, Node v24.21.0, Lighthouse 13.6.0, Headless Chrome 157.0.8103.78. Компьютер Apple M2, 8 цөм, macOS arm64. Нэг viewport 1350×940, DPR 1; нэг admin account, Course 3, Student 0, Teacher 1, Department 0 өгөгдөл ашигласан.

Turbopack-ийн CSS worker орчны порт нээх хязгаарлалтад унасан тул хоёр хувилбарыг ижил Webpack build болон тохирох Tailwind PostCSS adapter-аар бүтээсэн. Default development build-ийг өөрчлөөгүй. Хэмжилтийн build `.next-lab-performance` дотор тусдаа байна.

### Үндсэн үр дүн

Хувилбар тус бүрийг 3 удаа хэмжсэн арифметик дундаж. KB = 1000 байт.

| Үзүүлэлт | A baseline | B optimized |
|---|---:|---:|
| Эхний ажиглалтын цонхонд татсан JS, KB | 161.35 | 170.83 |
| Эхний GET API хүсэлтийн тоо | 3 | 0 |
| Navigation load event, секунд | 0.0332 | 0.0343 |
| CourseItem commit, 3 мөр ба parent-ийн 10 update | 33 | 3 |
| Тайлан нээхэд нэмэлт JS, KB | 0.000 | 1.499 |
| Тайлан нээхэд нэмэлт API хүсэлт | 0 | 3 |
| Lighthouse Performance, 100-аас | 85.3 | 89.0 |
| Lighthouse LCP, миллисекунд | 296.7 | 278.7 |
| Lighthouse CLS | 0.2937 | 0.2165 |
| SVG зургийн бодит transfer, байт | 1182 | 1182 |

A хувилбар тайланг шууд харуулдаг. B эхлээд нээх товч харуулж, товч дарахад тайлангийн код болон өгөгдлийг татдаг. Иймээс эхний дэлгэцийн мэдээллийн хэмжээ ижил биш. B-ийн товч дарснаас тайлан DOM-д бэлэн болох дундаж хугацаа 321.5 ms байсан. A-д тайлангийн код болон API хүсэлтүүд эхний ачаалалд орсон тул нээх нэмэлт ачааллыг 0 гэж тэмдэглэсэн; нийт зардал 0 гэсэн үг биш.

### Давталт бүрийн утга

| Хувилбар | Давталт | Эхний JS, KB | load event, ms | Lighthouse |
|---|---:|---:|---:|---:|
| A | 1 | 143.860 | 38.1 | 88 |
| A | 2 | 170.102 | 28.8 | 84 |
| A | 3 | 170.102 | 32.8 | 84 |
| B | 1 | 170.828 | 37.0 | 89 |
| B | 2 | 170.828 | 35.2 | 89 |
| B | 3 | 170.828 | 30.7 | 89 |
| Dashboard | 1 | 152.206 | 31.9 | 100 |
| Dashboard | 2 | 152.206 | 29.8 | 100 |
| Dashboard | 3 | 152.206 | 29.1 | 100 |

Dashboard-ийн 3 давталтын Performance оноо 100/100/100; эхний JS дунджаар 152.21 KB, API 2 хүсэлт, load event 0.0303 секунд. Dashboard-ийн өмнөх өөр build байхгүй тул үүнийг A/B ахиц гэж тайлбарлахгүй.

### Render болон caching туршилт

`/reports/render-test?mode=baseline` болон `?mode=optimized` нь ижил бодит 3 Course-ийг ашигладаг. Эхний mount бүр 3 commit; parent counter-ийг 10 удаа өөрчлөхөд memo-гүй хувилбар 30 нэмэлт commit, memo-той хувилбар 0 нэмэлт commit хийсэн. Гурван давталт бүгд 33 ба 3 гэсэн нийт commit өгсөн. Энэ нь React Profiler UI-ийн экспорт биш: зөвхөн `NEXT_PUBLIC_LAB_MEASUREMENTS=1` build-д идэвхждэг effect-ээр бодит CourseItem commit-ийг бүртгэсэн. Тасалдсан/дуусаагүй render invocation-ийг тоолоогүй.

| Resource | Next.js рүү хүсэлт | no-store үед Express рүү | revalidate 60 үед Express рүү |
|---|---:|---:|---:|
| courses | 3 | 3 | 1 |
| departments | 3 | 3 | 1 |

Caching-ийг хэмжилтийн flag-аар хамгаалагдсан `/api/lab-cache` route дээр 60 секундын дотор дараалсан 3 хүсэлтээр шалгасан. Express-ийн бодит logger мөрүүдийг тоолсон; зөвхөн browser-ийн хүсэлт тоолоогүй. Authorization header нь fetch cache key-д ордог; хэрэглэгчийн JWT-г тайлан/логт хадгалаагүй. Энэ туршилт нь хэвийн Course API-д caching нэвтрүүлсэн гэсэн үг биш. 60 секундын дараах expiration/refetch-ийг тусад нь хэмжээгүй.

### Аргачлал ба тайлбар

- Network туршилт бүр шинэ browser, хүчинтэй login session, browser cache disabled нөхцөлтэй. CDP Network.loadingFinished-ийн encodedDataLength-ээр HTTP response header болон шахсан body-ийн transfer хэмжээг авсан. CORS OPTIONS-ийг GET API тоонд оруулаагүй.
- Эхний JS тоонд Next.js-ийн автомат navigation prefetch орсон. Эхний A давталтад байхгүй байсан 26,242 байтын бусад route-ийн script дараагийн A давталтуудад татагдсан. Иймд ганц chunk-ийн source хэмжээтэй адилтгахгүй, давталтуудыг нууж нэг утгаар дүгнэхгүй.
- Navigation load event нь browser-ийн loadEventEnd; серверээс API өгөгдөл ирж бүх UI бэлэн болох хугацаатай адил биш. Network туршилтад localhost, CPU/network throttling ашиглаагүй.
- Lighthouse нь тусдаа 3 audit: desktop, simulated RTT 40 ms, throughput 10,240 Kbps, CPU slowdown 1. Шинэ browser бүрд login хуудас ачаалж session хадгалсан; disableStorageReset=true. Энэ нөхцөлийг cache-disabled navigation хэмжилттэй хольж нэг хугацаа гэж үзэхгүй.
- B-ийн эхний JS A-гаас бага гараагүй. Lazy loading нь 3 API хүсэлт болон 1.499 KB script-ийг тайлан нээх хүртэл хойшлуулсан боловч нийт эхний JS багассан, бүх хуудас хурдсан гэж дүгнэхгүй.
- Lighthouse-ийн онооны ялгаатай хамт CLS өөрчлөгдсөн. Тайлангийн хоёр хувилбарт layout шилжилт үлдсэн; зураг болон loading/hydration төлөвийн зайг тогтвортой байлгах нь цаашдын сайжруулалт болно.
- Зураг нь ижил SVG тул img ба next/image-ийн transfer хэмжээ хоёул 1,182 байт. SVG-ийн байт багассан эсвэл raster формат хөрвүүлэлт хэмжсэн гэж тайлбарлахгүй.
- Render болон cache туршилтууд assertion-тай амжилттай дууссан, network run-д JavaScript page error бүртгэгдээгүй. Энэ ажил нь lab-ийн үлдсэн бүх боломжийг шинээр хэрэгжүүлсэн гэсэн үг биш; хоёр дахь өөр dynamic component-ийн шаардлага тусдаа үлдэнэ.

### Нотолгоо ба дахин ажиллуулах

- [Бүх давталтын raw JSON](reports/lab56-performance/measurements.json)
- [A Lighthouse HTML](reports/lab56-performance/reports-baseline-1-lighthouse.html)
- [B Lighthouse HTML](reports/lab56-performance/reports-optimized-1-lighthouse.html)
- [Dashboard Lighthouse HTML](reports/lab56-performance/dashboard-1-lighthouse.html)
- [A screenshot](reports/lab56-performance/reports-baseline-1-initial.png)
- [B тайлан нээхээс өмнө](reports/lab56-performance/reports-optimized-1-initial.png)
- [B тайлан нээсний дараа](reports/lab56-performance/reports-optimized-1-opened.png)
- [Memo-гүй render screenshot](reports/lab56-performance/render-baseline.png)
- [Memo-той render screenshot](reports/lab56-performance/render-optimized.png)

Хэмжилтийн хэрэгслүүд workspace-ийн `.lab-tools` (puppeteer 25.18.1, Lighthouse 13.6.0), `.lab-postcss-tools` (@tailwindcss/postcss 4.3.3) хавтсанд суусан. Build helper нь түр PostCSS config үүсгээд дуусмагц устгадаг; байгаа хэрэглэгчийн config-ийг дарж бичихгүй.

```sh
# Workspace root-д хэрэгсэл суулгах, хэрэгтэй үед:
PUPPETEER_SKIP_CHROME_DOWNLOAD=true npm install --prefix .lab-tools puppeteer@25.18.1 lighthouse@13.6.0
npm install --prefix .lab-postcss-tools @tailwindcss/postcss@4.3.3
node .lab-tools/node_modules/puppeteer/lib/cjs/puppeteer/node/cli.js browsers install chrome-headless-shell

# Backend terminal:
cd my-app/backend
PORT=3100 JWT_EXPIRES_IN=1h CORS_ORIGINS=http://localhost:3101 node server.js

# Frontend terminal, my-app дотор:
node scripts/build-lab56.mjs
LAB_DIST_DIR=.next-lab-performance NEXT_PUBLIC_LAB_MEASUREMENTS=1 npm run start -- --port 3101

# Test terminal, my-app дотор:
LAB_CHROME_SHELL=1 node scripts/measure-lab56.mjs
```

Дахин хэмжилт өмнөх `reports/lab56-performance` файлуудыг шинэчилнэ. Өмнөх нотолгоогоо хадгалах бол хавтсыг урьдчилан хуулна. Туршилт JSON өгөгдөлд CRUD бичилт хийгээгүй. Өөр компьютерт цаг, score, transfer үр дүн өөр гарч болно.

## Лаборатори №7: Middleware, CORS, Swagger

Backend ажиллаж байх үед `http://localhost:3000/api-docs/` хаягаар Swagger UI нээнэ (PORT өөр бол тухайн портыг ашиглана). OpenAPI тодорхойлолт: `backend/swagger/openapi.yaml`; JSON хувилбар: `/api-docs/openapi.json`.

Middleware дараалал: CORS → JSON parser → logger → route-ийн authentication → authorization → validation → controller → JSON 404 → error handler. Logger нь хугацаа, method, query-тэй URL, status, зарцуулсан миллисекундыг terminal-д хэвлэнэ. `/api/demo-error` нь зориуд 500 буцааж error handler-ийг туршина. Буруу JSON 400, хэт том body 413, үл мэдэгдэх route 404 буцаана.

`backend/.env` дотор `CORS_ORIGINS=http://localhost:3001,https://your-frontend.example` гэж зөвшөөрөх origin-уудыг таслалаар тусгаарлаж тохируулна. Тохиргоо байхгүй бол өмнөх `FRONTEND_ORIGIN`, дараа нь `http://localhost:3001` утгыг ашиглана. Орчин бүрийн `.env`-д өөр жагсаалт өгч backend-ийг дахин эхлүүлнэ.

Swagger-аар турших дараалал:

1. `POST /api/auth/login` → Try it out → demo хэрэглэгчийн username/password оруулж Execute хийнэ. Өмнөх `/auth/login` зам мөн ажиллана.
2. Хариуны `token`-ийг хуулж Authorize дээр `Bearer` угтваргүй оруулна. Жагсаалт харахад мөн JWT шаардлагатай.
3. `GET /api/courses` болон `?search=web` туршина. Хайлт title, teacher, schedule, room дотор хийгдэнэ.
4. Admin/teacher token-оор POST хийнэ. Төслийн бодит талбарууд: `{"title":"Веб систем ба технологи","teacher":"teacher1","schedule":"Monday 10:00","room":"A-301"}`. Амжилттай бол 201; хоосон/буруу талбарууд 400 болон `errors` жагсаалт буцаана.
5. Үүссэн ID-аар GET, PUT туршина. PUT нь өөрчлөх нэг буюу хэд хэдэн талбар авна; хоосон объект, хоосон string, буруу төрлийг 400 болгоно.
6. Student token-оор DELETE хийхэд 403; admin token-оор 204 (body байхгүй). Устсан ID дахин авахад 404.
7. Authorize-ийг цэвэрлээд 401, буруу/хугацаа дууссан JWT-ээр 401 шалгана. `/api/demo-error` → 500, байхгүй endpoint → JSON 404.
8. Тайланд Swagger endpoint жагсаалт, CRUD response-ууд, хоёр өөр endpoint-ийн terminal log, frontend browser-ийн CORS үр дүнгийн screenshot авна.

Автомат шалгалт: `cd backend && npm test`. Тест түр localhost порт дээр API-г эхлүүлж login, JWT, role, CRUD, validation, хайлт, CORS preflight, алдааны хариу болон Swagger файлуудыг шалгана. JSON хадгалалтыг санах ойгоор орлуулдаг тул бодит өгөгдлийг өөрчлөхгүй. Browser-ийн CORS enforcement болон screenshot-ийг тусад нь гараар шалгана.

## Лаборатори №8

MongoDB хувилбар нь тусдаа `backend-lab8/` дотор байна. [Ажиллуулах, migration, import/export, backup/restore болон API тестийн заавар](backend-lab8/README.md). Lab 7 backend 3000, Lab 8 backend 3002 порт ашиглана. Lab 8-ын Student request/response загвар шинэчлэгдсэн тул шинэ API-г өөрийн Swagger UI-аар туршина.

## EDURA сургалтын орчин

Одоогийн локал систем: http://localhost:3001/dashboard. Lab 8 API/Swagger: http://localhost:3002/api-docs/.

Оюутны хичээл сонголт зөвхөн админд очно. Админ хуваарь тохируулж баталсны дараа оюутны хуваарьт орно. Багш зөвхөн өөрийн хичээл, баталгаажсан оюутанд дүн болон ирц бүртгэнэ. Дүр бүрийн цэс ялгаатай. Нийт 40 хичээл / 120 кредитийн жишээ төлөвлөгөө, 40 оюутны бүртгэл болон багшийн зурагтай танилцуулга нэмэгдсэн. Шинэ хуудас `/teachers`.

Дэлгэрэнгүй хэрэгжилт, шалгалт: [backend-lab8/README.md](backend-lab8/README.md). MongoDB холболт энэ компьютерт `127.0.0.1:27018`; Compass холболтын URI-г мөн энэ порттой хадгалсан.

Demo оюутны хуучин нэвтрэлт: `student1 / Student123!` (student role). Кодтой бусад оюутан өөрийн code болон `0000` нууц үгээр нэвтэрнэ.

## Даалгавар ба шалгалт

Багш, оюутны цэсэнд `/assignments`, `/exams` хэсгүүд бий. Багш зөвхөн өөрийн хичээлд гарчиг, заавар, эцсийн хугацаа болон нэг файл (5 MB хүртэл) нийтэлнэ. «Жишээ бөглөх» товч зааврын жишээг бөглөнө. Оюутанд зөвхөн баталгаажсан хичээлийн ажлууд харагдана; хариу бичих, файл upload хийх, хугацаанаас өмнө хариугаа шинэчлэх боломжтой. Багш хариу болон хавсралтыг харж татна. Хавсралт болон хариу MongoDB-д хадгалагдана. Шалгалт нь асуулт / файлд хариу илгээх хэлбэртэй.

API: `GET/POST /api/assessments`, `PUT /api/assessments/:id/submission`, `GET /api/assessments/:id/file` (хариуны файлд `?submission=ID`). Бүх API JWT болон хичээлийн эрх шалгана. Интеграцийн тест: `cd backend-lab8 && node --test test/assessments.test.js` (локал `.env` MongoDB дээр түр нэртэй collection үүсгээд цэвэрлэнэ). Жишээ нийтлэл нэмэх: `node scripts/seed-assessments.js`; давтан ажиллуулахад давхардахгүй.

Даалгавар / шалгалтын хялбарчилсан горим: бүх багш нийтэлсэн бүх ажил, оюутны бүх хариуг харна. Бүх оюутан хичээл сонголтын төлөвөөс үл хамааран бүх ажилд хариу илгээнэ. Оюутан зөвхөн өөрийн хариу болон хавсралтыг харна. Хуудас 5 секунд тутам автоматаар шинэчлэгдэнэ.
