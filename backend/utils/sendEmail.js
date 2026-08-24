import nodemailer from "nodemailer";

/* =========================
   EMAIL TRANSPORTER
========================= */
const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* =========================
   SEND EMAIL
========================= */
const sendEmail = async ({
  to,
  subject,
  html
}) => {

  await transporter.sendMail({

    from: `"Quick Connect" <${process.env.EMAIL_USER}>`,

    to,

    subject,

    html

  });

};

export default sendEmail;