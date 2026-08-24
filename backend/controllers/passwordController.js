import bcrypt from "bcryptjs";
import User from "../models/user.js";

/* =========================
   SEND OTP
========================= */
export const forgotPassword = async (req, res) => {
  try {

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required."
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase()
    });

    if (!user) {
      return res.status(404).json({
        message: "No account found with that email."
      });
    }

    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const expires =
      new Date(Date.now() + 10 * 60 * 1000);

    user.resetOTP = otp;
    user.resetOTPExpires = expires;

    await user.save();

    /* Email sending will be added later */
    console.log(`
=================================
QUICK CONNECT PASSWORD RESET
Email : ${user.email}
OTP   : ${otp}
Expires: ${expires}
=================================
`);

    res.json({
      message:
        "OTP generated successfully. Check your email."
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: err.message
    });

  }
};

/* =========================
   RESET PASSWORD
========================= */
export const resetPassword = async (req, res) => {
  try {

    const {
      email,
      otp,
      newPassword
    } = req.body;

    if (
      !email ||
      !otp ||
      !newPassword
    ) {
      return res.status(400).json({
        message: "All fields are required."
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase()
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    if (
      !user.resetOTP ||
      user.resetOTP !== otp
    ) {
      return res.status(400).json({
        message: "Invalid OTP."
      });
    }

    if (
      !user.resetOTPExpires ||
      user.resetOTPExpires < new Date()
    ) {
      return res.status(400).json({
        message: "OTP has expired."
      });
    }

    const hashedPassword =
      await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;

    user.resetOTP = null;
    user.resetOTPExpires = null;

    await user.save();

    res.json({
      message:
        "Password reset successfully."
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: err.message
    });

  }
};