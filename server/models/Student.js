export default function StudentModel(db) {
  return db.collection("students");
}

export const STUDENT_UNIQUE_ROLL_INDEX = {
  key: { schoolId: 1, class: 1, section: 1, rollNo: 1 },
  options: { unique: true, name: "students_school_class_section_roll_unique_idx" },
};
