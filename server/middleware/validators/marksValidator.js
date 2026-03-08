import { body } from "express-validator";

export const saveMarksValidator = [
  body("subject")
    .trim()
    .notEmpty()
    .withMessage("subject is required"),
  body("exam")
    .trim()
    .notEmpty()
    .withMessage("exam is required"),
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
  body("records")
    .custom((records) => Array.isArray(records) && records.length > 0)
    .withMessage("records cannot be empty"),
  body("records.*.studentId")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("records[].studentId must be a string"),
  body("records.*.studentUserId")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("records[].studentUserId must be a string"),
  body("records.*.marks")
    .notEmpty()
    .withMessage("records[].marks is required")
    .custom((value) => value === "ABSENT" || value === "AB" || !Number.isNaN(Number(value)))
    .withMessage("records[].marks must be numeric or ABSENT/AB"),
];
