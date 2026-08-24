import express from "express";

import {
  forgotPassword,
  resetPassword
} from "../controllers/passwordController.js";

const router = express.Router();

/* =========================
   FORGOT PASSWORD
========================= */
router.post(
  "/forgot-password",
  forgotPassword
);

/* =========================
   RESET PASSWORD
========================= */
router.post(
  "/reset-password",
  resetPassword
);

export default router;