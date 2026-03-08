import { body } from "express-validator";

export const announcementValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("title is required"),
  body("message")
    .trim()
    .notEmpty()
    .withMessage("message is required"),
  body("recipientRole")
    .trim()
    .notEmpty()
    .withMessage("recipientRole is required")
    .isIn(["TEACHER", "STUDENT", "ALL"])
    .withMessage("recipientRole must be TEACHER, STUDENT, or ALL"),
];

export const homeworkValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("title is required"),
  body("subject")
    .trim()
    .notEmpty()
    .withMessage("subject is required"),
  body("dueDate")
    .notEmpty()
    .withMessage("dueDate is required")
    .isISO8601()
    .withMessage("dueDate must be a valid date"),
  body("description")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("description must be a string"),
];

