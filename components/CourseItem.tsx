"use client";

import { memo, useEffect } from "react";
import type { Course } from "../lib/types";
import Icon from "./Icon";

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

export function CourseItem({ course, index, enrollmentCount, canEdit, canDelete, onOpen, onEdit, onDelete }: CourseItemProps) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_LAB_MEASUREMENTS === "1") {
      window.dispatchEvent(new CustomEvent("lab:course-item-commit", { detail: { id: course.id } }));
    }
  });
  return <tr><td><div className="person-cell"><div className={`course-symbol small tone-${index % 4}`}><Icon name="book" size={18} /></div><button className="course-detail-button" onClick={() => onOpen(course)}>{course.title}</button></div></td><td>{course.teacher}</td><td>{course.schedule}</td><td>{course.room}</td><td><span className="enrolled-tag">{enrollmentCount} бүртгэл</span></td><td>{canEdit && <button className="delete-button" onClick={() => onEdit(course)} aria-label={`${course.title} хичээлийг засах`} title="Засах"><Icon name="edit" size={16} /></button>}{canDelete && <button className="delete-button" onClick={() => onDelete(course.id)} aria-label={`${course.title} хичээлийг устгах`} title="Устгах"><Icon name="trash" size={16} /></button>}</td></tr>;
}

export default memo(CourseItem);
