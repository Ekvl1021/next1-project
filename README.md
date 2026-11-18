# Surgaal сургалтын систем

Энэ workspace нь Next.js frontend (`my-app`) болон JSON файлд өгөгдөл хадгалдаг Express backend (`backend`)-ээс бүрдэнэ.

## Ажиллуулах

1. `backend` хавтас руу орж `npm install` ажиллуул.
2. `.env.example`-ийг `.env` болгон хуулж, `JWT_SECRET`-ийг 32 тэмдэгтээс урт санамсаргүй утгаар солино.
3. `npm run seed` нь зөвхөн хоосон `data/users.json` дээр demo хэрэглэгч үүсгэнэ. Нэр/нууц үг: `admin / Admin123!`, `teacher1 / Teacher123!`, `student1 / Student123!`. Эдгээр нь сургалтын локал өгөгдөлд зориулагдсан.
4. `npm run dev` ашиглан API-г 3000 порт дээр эхлүүл.
5. Next.js-ийн `.env.local.example`-ийг `.env.local` болгон хуулна. Frontend-ийг `npm run dev` гэж эхлүүл; frontend `http://localhost:3001` дээр ажиллана.

Backend endpoint-үүд:

- `POST /auth/register`, `POST /auth/login`
- `GET /students` (optional `?search=` filters by name, email or program), `POST /students`, `DELETE /students/:id`
- `GET /courses`, `GET /courses/:id`, `POST /courses`, `PUT /courses/:id`, `DELETE /courses/:id`
- `GET /departments`, `POST /departments`

Course/student/department endpoint-үүдэд Bearer JWT шаардана. Бүх role жагсаалт харж болно; admin/teacher course нэмэх, засах; зөвхөн admin course устгах, department нэмэх; admin/teacher student нэмэх; зөвхөн admin student устгах эрхтэй. Register нь role-г хүсэлтээс авахгүй бөгөөд `student` онооно. `users.json` дотор зөвхөн bcrypt hash хадгална.

Frontend-д JWT-г сургалтын хувилбарын дагуу `localStorage` болон SSR жишээг ажиллуулах уншигдах cookie-д хадгалж байна. Энэ нь XSS-д өртөмтгий. Production системд login-ийг серверийн proxy-оор дамжуулж `HttpOnly; Secure; SameSite` cookie тохируулах хэрэгтэй. Браузерын role-based товчнууд нь UX давхарга бөгөөд backend authorization-г орлохгүй.

JWT хугацаа дуусахад frontend token болон session-ийг цэвэрлэж login хуудас руу шилжүүлнэ. Backend-ийн `JWT_EXPIRES_IN`-ийг өөрчилсний дараа backend-ийг дахин эхлүүлж, шинэ token авахын тулд дахин нэвтэрнэ.

## Rendering харьцуулах

- `/courses-client`: `useEffect`-ээр браузераас API дуудах CSR жишээ.
- `/courses-server`: `force-dynamic`, `cache: no-store` ба cookie-с token дамжуулан хүсэлт бүрд серверээс унших SSR жишээ. Cookie байхгүй/хуучирсан үед 401 алдааг харуулна.
- `/about-courses`: нийтийн тогтмол мэдээллийг статик болгох SSG жишээ.
- `/reports`: `next/dynamic` болон `React.lazy` аргыг сонгон турших; `/reports/eager` нь шууд import жишээ; `/reports/baseline` нь memoization/lazy loading-гүй, энгийн `<img>` хэрэглэсэн Туршилтын A; `/reports/optimized` нь dynamic import ба `next/image` хэрэглэсэн Туршилтын B.

## Гүйцэтгэлийн хэмжилт

Туршилтын A/B-ийн production build artifact хэмжилт (`npm run build`; ижил тайлангийн component, өгөгдлийн эх үүсвэр, SVG source asset):

| Хэмжүүр | Туршилтын A: `/reports/baseline` | Туршилтын B: `/reports/optimized` |
|---|---:|---:|
| Тайлангийн component JS | 3,986 байт (gzip 1,697 байт), route-ийн эхний bundle-д | 2,641 байт (gzip 1,213 байт), товч дарахад deferred chunk |
| Route-specific JS chunk | 3,986 байт (gzip 1,697 байт) | 21,358 байт (gzip 7,674 байт), тайлангийн component ороогүй |
| Зургийн source asset | Энгийн `<img>`, `course-banner.svg` 1,805 байт | `next/image`, ижил SVG source asset 1,805 байт |

JS-ийн хэмжээнд нийтлэг runtime/framework chunk-ууд ороогүй. Энэ build-д B-ийн route-specific chunk A-гаас 17,372 байтаар их гарсан; үүнийг нуухгүйгээр тэмдэглэв. Харин тайлангийн 2,641 байтын chunk B-ийн эхний route chunk-д орохгүй, хэрэглэгч тайлан нээхэд тусдаа татагдана. Ижил SVG source хэрэглэсэн тул `next/image` нь SVG-ийн байтыг бууруулаагүй; responsive хэмжээсийн дүрслэлийг хэрэглэж байна. Иймд энэ туршилтын үр дүн нь “B бүх анхны JS-ийг багасгав” гэж дүгнэхгүй, харин тайлангийн JS-ийг хойшлуулсан гэдгийг харуулна.

Эдгээр нь build файлын хэмжээг gzip-аар тооцсон үзүүлэлт бөгөөд ижил төхөөрөмж дээрх бодит сүлжээний хугацаа, браузерын transfer size, Core Web Vitals хэмжилт биш. Бодит A/B хэмжилт хийхдээ ижил төхөөрөмж, өгөгдөл, сүлжээ ашиглаж production build-ийг ажиллуулан DevTools Network-ийн Disable cache нөхцөлд `/reports/baseline` ба `/reports/optimized`-ийн эхний таталт, тайлан нээсний дараах нэмэлт chunk-ийн хэмжээ/хугацааг тусад нь тэмдэглэнэ. `React.memo`, `useMemo`, `useCallback` нь курсийн жагсаалт/хайлт дээр хэрэглэгддэг бөгөөд тайлангийн жижиг тоон статистик component-д зориуд нэмээгүй.

Хэрэглэгчид өөр харагдах dashboard-ийг SSG болговол build үеэр хэрэглэгчийн session байхгүй тул хувьчилж render хийж чадахгүй. Мөн build үеийн мэдээлэл хуучрах, нууц мэдээлэл статик HTML-д бусдад хүрэх эрсдэлтэй.
