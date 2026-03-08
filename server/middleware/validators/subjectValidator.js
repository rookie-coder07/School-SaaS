import { body } from "express-validator";

export const createSubjectValidator = [
  body().custom((value) => {
    const subjectName = String(value?.name ?? value?.subjectName ?? "").trim();
    if (!subjectName) throw new Error("name is required");
    return true;
  }),
  body("class")
    .trim()
    .notEmpty()
    .withMessage("class is required"),
  body("section")
    .trim()
    .notEmpty()
    .withMessage("section is required"),
];

