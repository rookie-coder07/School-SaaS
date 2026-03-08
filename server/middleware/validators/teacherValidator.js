import { body } from "express-validator";

export const createTeacherValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("name is required")
    .isString()
    .withMessage("name must be a string"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("email is required")
    .isEmail()
    .withMessage("email must be valid"),
  body("className")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("className must be a string"),
  body("section")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("section must be a string"),
  body("subject")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("subject must be a string"),
  body("password")
    .optional({ values: "falsy" })
    .isLength({ min: 6 })
    .withMessage("password must be at least 6 characters"),
  body().custom((value) => {
    const teacherPhone = String(value?.phone ?? value?.mobile ?? value?.teacherPhone ?? "").trim();
    if (!teacherPhone) throw new Error("phone is required");
    if (!/^\d{7,15}$/.test(teacherPhone)) throw new Error("phone must be 7-15 digits");
    return true;
  }),
];
