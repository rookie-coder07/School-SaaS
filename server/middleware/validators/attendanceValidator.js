import { body } from "express-validator";

export const saveAttendanceValidator = [
  body("date")
    .trim()
    .notEmpty()
    .withMessage("date is required"),
  body("className")
    .trim()
    .notEmpty()
    .withMessage("className is required"),
  body("section")
    .trim()
    .notEmpty()
    .withMessage("section is required"),
  body("records")
    .isArray()
    .withMessage("records must be an array"),
];

