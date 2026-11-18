import Image from "next/image";

export default function CourseBanner() {
  return (
    <section className="course-banner" aria-label="Course Management">
      <Image
        src="/images/course-banner.svg"
        alt="Course Management — сургалтын системийн хичээлийн танилцуулга"
        width={1600}
        height={520}
        sizes="(max-width: 700px) calc(100vw - 28px), 1040px"
      />
    </section>
  );
}
