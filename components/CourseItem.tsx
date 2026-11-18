"use client";

import { memo } from "react";
import type { Course } from "../lib/types";

type CourseItemProps = {
  course: Course;
  index: number;
  enrollmentCount: number;
  canEdit: boolean;
  canDelete: boolean;
  onOpen: (course: Course) => void;
  onEdit: (course: Course) => void;
  onDelete: (id: string) => void;
};

function CourseItem({ course, index, enrollmentCount, canEdit, canDelete, onOpen, onEdit, onDelete }: CourseItemProps) {
  return <tr><td><div className="person-cell"><div className={`course-symbol small tone-${index % 4}`}>{["⌘", "◉", "✳", "∑"][index % 4]}</div><button className="course-detail-button" onClick={() => onOpen(course)}>{course.title}</button></div></td><td>{course.teacher}</td><td>{course.schedule}</td><td>{course.room}</td><td><span className="enrolled-tag">{enrollmentCount} бүртгэл</span></td><td>{canEdit && <button className="delete-button" onClick={() => onEdit(course)} aria-label={`${course.title} хичээлийг засах`} title="Засах">✎</button>}{canDelete && <button className="delete-button" onClick={() => onDelete(course.id)} aria-label={`${course.title} хичээлийг устгах`} title="Устгах">⌫</button>}</td></tr>;
}

export default memo(CourseItem);
