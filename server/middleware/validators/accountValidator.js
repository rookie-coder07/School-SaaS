import { body } from "express-validator";

export const developerLoginValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("email is required")
    .isEmail()
    .withMessage("email must be valid"),
  body("password")
    .notEmpty()
    .withMessage("password is required")
    .isLength({ min: 6 })
    .withMessage("password must be at least 6 characters"),
];

export const studentPasswordResetRequestValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("email is required")
    .isEmail()
    .withMessage("email must be valid"),
];

export const teacherForgotPasswordValidator = [
  body().custom((_, { req }) => {
    const identifier = String(req.body?.identifier || "").trim();
    const email = String(req.body?.email || "").trim();
    if (!identifier && !email) {
      throw new Error("Teacher ID or Email is required");
    }
    if (identifier.includes("@")) {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
      if (!ok) throw new Error("identifier must be a valid email when using email format");
    }
    if (email) {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!ok) throw new Error("email must be valid");
    }
    return true;
  }),
];

export const adminResetPasswordValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("email is required")
    .isEmail()
    .withMessage("email must be valid"),
  body("newPassword")
    .notEmpty()
    .withMessage("newPassword is required")
    .isLength({ min: 6 })
    .withMessage("newPassword must be at least 6 characters"),
];
