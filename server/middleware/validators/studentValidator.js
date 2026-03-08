import { body } from "express-validator";

export const createStudentValidator = [
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
  body("class")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("class must be a string"),
  body().custom((value) => {
    const classValue = String(value?.className ?? value?.class ?? "").trim();
    if (!classValue) throw new Error("class is required");
    return true;
  }),
  body("section")
    .trim()
    .notEmpty()
    .withMessage("section is required"),
  body("rollNo")
    .notEmpty()
    .withMessage("rollNo is required")
    .isNumeric()
    .withMessage("rollNo must be numeric"),
  body("password")
    .optional({ values: "falsy" })
    .isLength({ min: 6 })
    .withMessage("password must be at least 6 characters"),
  body("parentName")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("parentName must be a string"),
  body().custom((value) => {
    const parentName = String(value?.parentName ?? "").trim();
    if (!parentName) throw new Error("parentName is required");
    return true;
  }),
  body().custom((value) => {
    const parentPhone = String(value?.parentPhone ?? value?.phone ?? "").trim();
    if (!parentPhone) throw new Error("parentPhone is required");
    if (!/^\d{7,15}$/.test(parentPhone)) throw new Error("parentPhone must be 7-15 digits");
    return true;
  }),
];
