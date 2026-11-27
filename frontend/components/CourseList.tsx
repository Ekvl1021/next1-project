import CourseItem from "./CourseItem";
import type { Course } from "../lib/types";

type CourseListProps = {
  courses: Course[];
  enrollmentCount: (courseId: string) => number;
  canEdit: boolean;
  canDelete: boolean;
  onOpen: (course: Course) => void;
  onEdit: (course: Course) => void;
  onDelete: (id: string) => void;
};

export default function CourseList(props: CourseListProps) {
  if (props.courses.length === 0) return <div className="empty-state"><span>◌</span>Хичээл олдсонгүй.</div>;
  return <div className="table-wrap"><table><thead><tr><th>ХИЧЭЭЛ</th><th>БАГШ</th><th>ХУВААРЬ</th><th>ӨРӨӨ</th><th>ОЮУТАН</th><th /></tr></thead><tbody>{props.courses.map((course, index) => <CourseItem key={course.id} course={course} index={index} enrollmentCount={props.enrollmentCount(course.id)} canEdit={props.canEdit} canDelete={props.canDelete} onOpen={props.onOpen} onEdit={props.onEdit} onDelete={props.onDelete} />)}</tbody></table></div>;
}
