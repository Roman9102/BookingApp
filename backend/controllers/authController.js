import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/* ========================
   GENERATE TOKEN
======================== */

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
};

/* ========================
   STRONG PASSWORD CHECK
======================== */

const isStrongPassword = (password) => {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
};

/* ========================
   REGISTER
======================== */

export const register = async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    providerPlan,
    paymentTermsAccepted
  } = req.body;

  try {

    /* ========================
       BASIC VALIDATION
    ======================== */

    if (!name || !email || !password) {
      return res.status(400).json({
        message:
          "Name, email and password are required."
      });
    }

    /* ========================
       STRONG PASSWORD
    ======================== */

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message:
          "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character."
      });
    }

    /* ========================
       VALIDATE ROLE
    ======================== */

    const selectedRole =
      role || "user";

    const allowedRoles = [
      "user",
      "serviceProvider"
    ];

    if (!allowedRoles.includes(selectedRole)) {
      return res.status(400).json({
        message:
          "Invalid registration role."
      });
    }

    /* ========================
       PROVIDER PLAN
    ======================== */

    if (
      selectedRole ===
      "serviceProvider"
    ) {

      if (
        providerPlan !==
          "subscription" &&
        providerPlan !==
          "commission"
      ) {
        return res.status(400).json({
          message:
            "Service providers must choose either the Subscription or Commission plan."
        });
      }

      if (
        paymentTermsAccepted !== true
      ) {
        return res.status(400).json({
          message:
            "You must accept the payment terms before registering as a service provider."
        });
      }
    }

    /* ========================
       CHECK EXISTING USER
    ======================== */

    const userExists =
      await User.findOne({
        email
      });

    if (userExists) {
      return res.status(400).json({
        message:
          "User already exists"
      });
    }

    /* ========================
       HASH PASSWORD
    ======================== */

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    /* ========================
       USER DATA
    ======================== */

    const userData = {
      name,
      email,
      password:
        hashedPassword,
      role:
        selectedRole
    };

    /* ========================
       PROVIDER DATA
    ======================== */

    if (
      selectedRole ===
      "serviceProvider"
    ) {

      userData.providerPlan =
        providerPlan;

      userData.paymentTermsAccepted =
        true;

      userData.paymentTermsAcceptedAt =
        new Date();

      /*
        Do NOT set subscriptionStatus
        to null.

        The schema leaves it undefined
        until subscription payment is
        successfully verified.
      */
    }

    /* ========================
       CREATE USER
    ======================== */

    const user =
      await User.create(
        userData
      );

    /* ========================
       GENERATE TOKEN
    ======================== */

    const token =
      generateToken(
        user._id
      );

    /* ========================
       SUBSCRIPTION PAYMENT
    ======================== */

    if (
      selectedRole ===
        "serviceProvider" &&
      providerPlan ===
        "subscription"
    ) {

      const planCode =
        process.env
          .PAYSTACK_SUBSCRIPTION_PLAN_CODE;

      if (!planCode) {

        console.error(
          "PAYSTACK_SUBSCRIPTION_PLAN_CODE is missing."
        );

        return res.status(500).json({
          message:
            "Subscription payment is not configured."
        });
      }

      /* ========================
         INITIALIZE PAYSTACK
      ======================== */

      const paymentResponse =
        await fetch(
          "https://api.paystack.co/transaction/initialize",
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,

              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({

                email:
                  user.email,

                amount:
                  7900,

                currency:
                  "ZAR",

                callback_url:
                  "https://reviving-tarantula-briskly.ngrok-free.dev/subscription-success.html",

                metadata:
                  JSON.stringify({

                    userId:
                      user._id.toString(),

                    providerPlan:
                      "subscription",

                    purpose:
                      "provider_subscription"

                  })

              })
          }
        );

      const paymentData =
        await paymentResponse.json();

      console.log(
        "PAYSTACK SUBSCRIPTION INITIALIZE RESPONSE:",
        paymentData
      );

      if (
        !paymentResponse.ok ||
        !paymentData.status
      ) {

        console.error(
          "Paystack subscription initialization error:",
          paymentData
        );

        return res.status(400).json({
          message:
            paymentData.message ||
            "Unable to initialize subscription payment."
        });
      }

      /* ========================
         RETURN PAYSTACK URL
      ======================== */

      return res.status(201).json({

        message:
          "Registration successful. Subscription payment required.",

        user: {
          _id:
            user._id,

          name:
            user.name,

          email:
            user.email,

          role:
            user.role,

          providerPlan:
            user.providerPlan,

          subscriptionStatus:
            user.subscriptionStatus,

          paymentTermsAccepted:
            user.paymentTermsAccepted
        },

        token,

        authorization_url:
          paymentData.data.authorization_url,

        reference:
          paymentData.data.reference

      });
    }

    /* ========================
       NORMAL / COMMISSION RESPONSE
    ======================== */

    return res.status(201).json({

      message:
        "Registration successful.",

      user: {
        _id:
          user._id,

        name:
          user.name,

        email:
          user.email,

        role:
          user.role,

        providerPlan:
          user.providerPlan,

        subscriptionStatus:
          user.subscriptionStatus,

        paymentTermsAccepted:
          user.paymentTermsAccepted
      },

      token

    });

  } catch (err) {

    console.error(
      "Registration error:",
      err
    );

    return res.status(500).json({
      message:
        err.message
    });
  }
};

/* ========================
   LOGIN
======================== */

export const login = async (
  req,
  res
) => {

  const {
    email,
    password
  } = req.body;

  try {

    const user =
      await User.findOne({
        email
      });

    if (!user) {
      return res.status(401).json({
        message:
          "Invalid email or password"
      });
    }

    const isMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isMatch) {
      return res.status(401).json({
        message:
          "Invalid email or password"
      });
    }

    return res.json({

      user: {
        _id:
          user._id,

        name:
          user.name,

        email:
          user.email,

        role:
          user.role,

        providerPlan:
          user.providerPlan,

        subscriptionStatus:
          user.subscriptionStatus,

        paymentTermsAccepted:
          user.paymentTermsAccepted
      },

      token:
        generateToken(
          user._id
        )
    });

  } catch (err) {

    console.error(
      "Login error:",
      err
    );

    return res.status(500).json({
      message:
        err.message
    });
  }
};

/* ========================
   GET PROFILE
======================== */

export const getProfile = async (
  req,
  res
) => {

  try {

    if (!req.user) {
      return res.status(401).json({
        message:
          "Not authorized"
      });
    }

    const user =
      await User.findById(
        req.user._id
      ).select("-password");

    if (!user) {
      return res.status(404).json({
        message:
          "User not found"
      });
    }

    return res.json({
      user
    });

  } catch (err) {

    console.error(
      "GET PROFILE ERROR:",
      err
    );

    return res.status(500).json({
      message:
        err.message
    });
  }
};

/* ========================
   UPDATE PERSONAL INFORMATION
======================== */

export const updatePersonalInfo = async (
  req,
  res
) => {

  try {

    if (!req.user) {
      return res.status(401).json({
        message:
          "Not authorized"
      });
    }

    const user =
      await User.findById(
        req.user._id
      );

    if (!user) {
      return res.status(404).json({
        message:
          "User not found"
      });
    }

    const {
      name,
      email
    } = req.body;

    /* ========================
       UPDATE NAME
    ======================== */

    if (
      typeof name === "string" &&
      name.trim()
    ) {
      user.name =
        name.trim();
    }

    /* ========================
       UPDATE EMAIL
    ======================== */

    if (
      typeof email === "string" &&
      email.trim()
    ) {

      const newEmail =
        email.trim().toLowerCase();

      if (
        newEmail !==
        user.email
      ) {

        const emailExists =
          await User.findOne({
            email:
              newEmail,
            _id: {
              $ne:
                user._id
            }
          });

        if (emailExists) {
          return res.status(400).json({
            message:
              "Email address is already in use."
          });
        }

        user.email =
          newEmail;
      }
    }

    await user.save();

    return res.json({
      message:
        "Personal information updated successfully.",

      user: {
        _id:
          user._id,

        name:
          user.name,

        email:
          user.email,

        role:
          user.role,

        providerPlan:
          user.providerPlan,

        subscriptionStatus:
          user.subscriptionStatus,

        paymentTermsAccepted:
          user.paymentTermsAccepted
      }
    });

  } catch (err) {

    console.error(
      "UPDATE PERSONAL INFO ERROR:",
      err
    );

    return res.status(500).json({
      message:
        err.message
    });
  }
};

/* ========================
   UPDATE BUSINESS INFORMATION
======================== */

export const updateBusinessInfo = async (
  req,
  res
) => {

  try {

    if (!req.user) {
      return res.status(401).json({
        message:
          "Not authorized"
      });
    }

    const user =
      await User.findById(
        req.user._id
      );

    if (!user) {
      return res.status(404).json({
        message:
          "User not found"
      });
    }

    /*
      Only update fields that actually
      exist in the User schema.

      This prevents accidental creation
      of unrelated fields.
    */

    const allowedFields = [
      "businessName",
      "businessDescription",
      "businessPhone",
      "businessEmail",
      "businessAddress",
      "businessLocation",
      "businessCategory",
      "website",
      "phone",
      "address"
    ];

    for (
      const field of allowedFields
    ) {

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          field
        ) &&
        user.schema.path(field)
      ) {

        user[field] =
          req.body[field];
      }
    }

    await user.save();

    return res.json({
      message:
        "Business information updated successfully.",

      user: {
        _id:
          user._id,

        name:
          user.name,

        email:
          user.email,

        role:
          user.role,

        providerPlan:
          user.providerPlan,

        subscriptionStatus:
          user.subscriptionStatus,

        paymentTermsAccepted:
          user.paymentTermsAccepted
      }
    });

  } catch (err) {

    console.error(
      "UPDATE BUSINESS INFO ERROR:",
      err
    );

    return res.status(500).json({
      message:
        err.message
    });
  }
};

/* ========================
   CHANGE PASSWORD
======================== */

export const changePassword = async (
  req,
  res
) => {

  try {

    /* ========================
       AUTH CHECK
    ======================== */

    if (!req.user) {
      return res.status(401).json({
        message:
          "Not authorized"
      });
    }

    /* ========================
       GET PASSWORDS
    ======================== */

    const {
      currentPassword,
      newPassword
    } = req.body;

    /* ========================
       VALIDATION
    ======================== */

    if (
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        message:
          "Current password and new password are required."
      });
    }

    /* ========================
       STRONG PASSWORD
    ======================== */

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        message:
          "New password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character."
      });
    }

    /* ========================
       FIND USER
    ======================== */

    const user =
      await User.findById(
        req.user._id
      );

    if (!user) {
      return res.status(404).json({
        message:
          "User not found."
      });
    }

    /* ========================
       CHECK CURRENT PASSWORD
    ======================== */

    const passwordMatch =
      await bcrypt.compare(
        currentPassword,
        user.password
      );

    if (!passwordMatch) {
      return res.status(400).json({
        message:
          "Current password is incorrect."
      });
    }

    /* ========================
       CHECK SAME PASSWORD
    ======================== */

    const samePassword =
      await bcrypt.compare(
        newPassword,
        user.password
      );

    if (samePassword) {
      return res.status(400).json({
        message:
          "New password must be different from your current password."
      });
    }

    /* ========================
       HASH NEW PASSWORD
    ======================== */

    user.password =
      await bcrypt.hash(
        newPassword,
        10
      );

    await user.save();

    /* ========================
       SUCCESS
    ======================== */

    return res.json({
      message:
        "Password changed successfully."
    });

  } catch (err) {

    console.error(
      "CHANGE PASSWORD ERROR:",
      err
    );

    return res.status(500).json({
      message:
        err.message
    });
  }
};

/* ========================
   DELETE ACCOUNT
======================== */

export const deleteAccount = async (
  req,
  res
) => {

  try {

    /* ========================
       AUTH CHECK
    ======================== */

    if (!req.user) {
      return res.status(401).json({
        message:
          "Not authorized"
      });
    }

    /* ========================
       FIND USER
    ======================== */

    const user =
      await User.findById(
        req.user._id
      );

    if (!user) {
      return res.status(404).json({
        message:
          "User not found."
      });
    }

    /* ========================
       DELETE ACCOUNT
    ======================== */

    await User.findByIdAndDelete(
      req.user._id
    );

    /* ========================
       SUCCESS
    ======================== */

    return res.json({
      message:
        "Account deleted successfully."
    });

  } catch (err) {

    console.error(
      "DELETE ACCOUNT ERROR:",
      err
    );

    return res.status(500).json({
      message:
        err.message
    });
  }
};