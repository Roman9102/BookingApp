/* =========================
   serviceController.js
   QUICKCONNECT SERVICE CONTROLLER

   IMAGE SYSTEM:
   - Uses one absolute uploads directory
   - Stores image paths consistently as /uploads/<filename>
   - Serves correctly through server.js
   - Supports old stored image formats
   - Maximum 5 images
   - Provider services remain separated
   - Individual image deletion supported
   - Physical files are deleted safely
========================= */

import Service from "../models/service.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

/* =========================================================
   PATH SETUP
========================================================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/*
  Backend/
    controllers/
      serviceController.js
    uploads/

  Therefore uploads is:
    Backend/uploads
*/

const UPLOADS_DIR = path.resolve(__dirname, "../uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, {
    recursive: true
  });
}

console.log("SERVICE UPLOADS DIRECTORY:", UPLOADS_DIR);

/* =========================================================
   MULTER
========================================================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(
      file.originalname || ""
    ).toLowerCase();

    const safeExtension =
      extension && extension.length <= 10
        ? extension
        : "";

    const uniqueName =
      `${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}${safeExtension}`;

    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,

  limits: {
    files: 5,
    fileSize: 10 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    if (
      file.mimetype &&
      file.mimetype.startsWith("image/")
    ) {
      return cb(null, true);
    }

    return cb(
      new Error("Only image files are allowed.")
    );
  }
}).array("images", 5);

/* =========================================================
   IMAGE PATH HELPERS
========================================================= */

/*
  Database image values should always end up looking like:

      /uploads/filename.jpg

  This helper also understands older values such as:

      uploads/filename.jpg
      /api/uploads/filename.jpg
      https://quickconnect-api.../uploads/filename.jpg
      http://localhost:5000/uploads/filename.jpg
*/

function normalizeImagePath(image) {
  if (!image) {
    return "";
  }

  let value = String(image).trim();

  if (!value) {
    return "";
  }

  try {
    value = decodeURIComponent(value);
  } catch {
    // Keep original value.
  }

  /* Full URL */
  try {
    if (
      value.startsWith("http://") ||
      value.startsWith("https://")
    ) {
      const parsed = new URL(value);
      value = parsed.pathname;
    }
  } catch {
    // Keep original value.
  }

  /* Backslashes -> forward slashes */
  value = value.replaceAll("\\", "/");

  /* Remove duplicate leading slashes */
  value = value.replace(/^\/+/, "/");

  /* Remove accidental API prefix */
  value = value.replace(/^\/api\/+/i, "/");

  /* Remove accidental domain-less API path */
  value = value.replace(/^api\/+/i, "/");

  /* Ensure uploads prefix for bare filenames */
  if (
    !value.startsWith("/uploads/")
  ) {
    const uploadsIndex =
      value.toLowerCase().indexOf("/uploads/");

    if (uploadsIndex !== -1) {
      value =
        value.substring(uploadsIndex);
    }
  }

  /* Bare filename */
  if (
    !value.startsWith("/uploads/")
  ) {
    const filename = path.basename(value);

    if (
      filename &&
      filename !== "." &&
      filename !== "/"
    ) {
      value = `/uploads/${filename}`;
    }
  }

  return value;
}

/*
  Return only the physical filename.
*/

function getImageFilename(image) {
  const normalized =
    normalizeImagePath(image);

  if (!normalized) {
    return "";
  }

  return path.basename(normalized);
}

/*
  Get the absolute physical path safely.
*/

function getPhysicalImagePath(image) {
  const filename =
    getImageFilename(image);

  if (!filename) {
    return "";
  }

  const fullPath =
    path.resolve(
      UPLOADS_DIR,
      filename
    );

  /*
    Prevent path traversal.
  */

  const uploadsRoot =
    path.resolve(UPLOADS_DIR) + path.sep;

  if (
    !fullPath.startsWith(
      uploadsRoot
    )
  ) {
    return "";
  }

  return fullPath;
}

/*
  Delete physical image.
*/

function deletePhysicalImage(image) {
  const fullPath =
    getPhysicalImagePath(image);

  if (!fullPath) {
    return;
  }

  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);

      console.log(
        "IMAGE FILE DELETED:",
        fullPath
      );
    }
  } catch (error) {
    console.error(
      "IMAGE FILE DELETE ERROR:",
      error
    );
  }
}

/*
  Convert whatever is in the database into the
  canonical database format.

  IMPORTANT:
  We store relative paths, never localhost URLs
  and never Render URLs.
*/

function canonicalImagePath(image) {
  const normalized =
    normalizeImagePath(image);

  if (!normalized) {
    return "";
  }

  const filename =
    getImageFilename(normalized);

  if (!filename) {
    return "";
  }

  return `/uploads/${filename}`;
}

/*
  Clean image arrays before returning them.
*/

function normalizeServiceImages(service) {
  const existingImages =
    Array.isArray(service.images)
      ? service.images
      : [];

  const normalizedImages =
    existingImages
      .map(canonicalImagePath)
      .filter(Boolean)
      .slice(0, 5);

  /*
    Old services may only have image.
  */

  if (
    normalizedImages.length === 0 &&
    service.image
  ) {
    const oldImage =
      canonicalImagePath(service.image);

    if (oldImage) {
      normalizedImages.push(oldImage);
    }
  }

  service.images =
    normalizedImages;

  service.image =
    normalizedImages[0] || "";

  return service;
}

/* =========================================================
   CREATE SERVICE
========================================================= */

export const createService = (
  req,
  res
) => {
  upload(
    req,
    res,
    async (err) => {
      if (err) {
        console.error(
          "MULTER CREATE ERROR:",
          err
        );

        return res.status(400).json({
          message:
            err.message ||
            "Unable to upload images."
        });
      }

      try {
        if (!req.user) {
          return res.status(401).json({
            message: "Not authorized"
          });
        }

        if (
          req.user.role !==
          "serviceProvider"
        ) {
          return res.status(403).json({
            message:
              "Only service providers can create services."
          });
        }

        const {
          name,
          description,
          price,
          storeLocation,
          storeMode,
          mobileMode,
          category,
          providerName,
          rating,
          location
        } = req.body;

        if (
          !name ||
          !String(name).trim()
        ) {
          return res.status(400).json({
            message:
              "Service name is required."
          });
        }

        const serviceMode = [];

        const storeSelected =
          storeMode === "yes" ||
          storeMode === "true" ||
          storeMode === true;

        const mobileSelected =
          mobileMode === "yes" ||
          mobileMode === "true" ||
          mobileMode === true;

        if (storeSelected) {
          serviceMode.push("store");
        }

        if (mobileSelected) {
          serviceMode.push("mobile");
        }

        if (serviceMode.length === 0) {
          return res.status(400).json({
            message:
              "Please select at least one service mode."
          });
        }

        const finalStoreLocation =
          storeLocation &&
          String(storeLocation).trim()
            ? String(storeLocation).trim()
            : "Mobile service";

        const images =
          Array.isArray(req.files)
            ? req.files
                .map(
                  file =>
                    `/uploads/${file.filename}`
                )
                .slice(0, 5)
            : [];

        const finalProviderName =
          providerName &&
          String(providerName).trim()
            ? String(providerName).trim()
            : (
                req.user.name ||
                "Unknown Provider"
              );

        const service =
          await Service.create({
            name:
              String(name).trim(),

            description:
              description
                ? String(description)
                : "",

            price:
              Number(price || 0),

            serviceMode,

            storeLocation:
              finalStoreLocation,

            category:
              category &&
              String(category).trim()
                ? String(category).trim()
                : "Uncategorized",

            provider:
              req.user._id,

            image:
              images[0] || "",

            images,

            providerName:
              finalProviderName,

            rating:
              Number(rating || 0),

            location:
              location
                ? String(location)
                : ""
          });

        console.log(
          "SERVICE CREATED:",
          service._id
        );

        return res.status(201).json(
          normalizeServiceImages(service)
        );
      } catch (error) {
        console.error(
          "CREATE SERVICE ERROR:",
          error
        );

        if (Array.isArray(req.files)) {
          for (const file of req.files) {
            try {
              if (
                file.path &&
                fs.existsSync(file.path)
              ) {
                fs.unlinkSync(file.path);
              }
            } catch (cleanupError) {
              console.error(
                "CREATE IMAGE CLEANUP ERROR:",
                cleanupError
              );
            }
          }
        }

        return res.status(500).json({
          message:
            error.message ||
            "Unable to create service."
        });
      }
    }
  );
};

/* =========================================================
   GET ALL SERVICES
========================================================= */

export const getServices =
  async (req, res) => {
    try {
      const services =
        await Service.find({})
          .sort({
            createdAt: -1
          });

      const cleanedServices =
        services.map(
          service =>
            normalizeServiceImages(
              service
            )
        );

      return res.json(
        cleanedServices
      );
    } catch (error) {
      console.error(
        "GET SERVICES ERROR:",
        error
      );

      return res.status(500).json({
        message:
          error.message ||
          "Unable to load services."
      });
    }
  };

/* =========================================================
   GET MY SERVICES
========================================================= */

export const getMyServices =
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message:
            "Not authorized"
        });
      }

      if (
        req.user.role !==
        "serviceProvider"
      ) {
        return res.status(403).json({
          message:
            "Only service providers can access their dashboard services."
        });
      }

      const services =
        await Service.find({
          provider:
            req.user._id
        }).sort({
          createdAt: -1
        });

      const cleanedServices =
        services.map(
          service =>
            normalizeServiceImages(
              service
            )
        );

      return res.json(
        cleanedServices
      );
    } catch (error) {
      console.error(
        "GET MY SERVICES ERROR:",
        error
      );

      return res.status(500).json({
        message:
          error.message ||
          "Unable to load your services."
      });
    }
  };

/* =========================================================
   DELETE SERVICE
========================================================= */

export const deleteService =
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message:
            "Not authorized"
        });
      }

      const service =
        await Service.findById(
          req.params.id
        );

      if (!service) {
        return res.status(404).json({
          message:
            "Service not found"
        });
      }

      if (
        !service.provider ||
        service.provider.toString() !==
          req.user._id.toString()
      ) {
        return res.status(403).json({
          message:
            "You are not authorized to delete this service."
        });
      }

      const images =
        Array.isArray(service.images)
          ? service.images
          : [];

      for (const image of images) {
        deletePhysicalImage(image);
      }

      /*
        Also remove old main image if it
        isn't already represented in images.
      */

      if (
        service.image &&
        !images.some(
          image =>
            canonicalImagePath(image) ===
            canonicalImagePath(
              service.image
            )
        )
      ) {
        deletePhysicalImage(
          service.image
        );
      }

      await Service.findByIdAndDelete(
        req.params.id
      );

      return res.json({
        message:
          "Service deleted successfully"
      });
    } catch (error) {
      console.error(
        "DELETE SERVICE ERROR:",
        error
      );

      return res.status(500).json({
        message:
          error.message ||
          "Unable to delete service."
      });
    }
  };

/* =========================================================
   ADD SERVICE IMAGES
========================================================= */

export const addServiceImages =
  (req, res) => {
    upload(
      req,
      res,
      async (err) => {
        if (err) {
          return res.status(400).json({
            message:
              err.message ||
              "Unable to upload images."
          });
        }

        try {
          if (!req.user) {
            return res.status(401).json({
              message:
                "Not authorized"
            });
          }

          const service =
            await Service.findById(
              req.params.id
            );

          if (!service) {
            return res.status(404).json({
              message:
                "Service not found"
            });
          }

          if (
            !service.provider ||
            service.provider.toString() !==
              req.user._id.toString()
          ) {
            return res.status(403).json({
              message:
                "You are not authorized to modify this service."
            });
          }

          normalizeServiceImages(
            service
          );

          const existingImages =
            service.images;

          const availableSlots =
            Math.max(
              0,
              5 -
                existingImages.length
            );

          const uploadedImages =
            Array.isArray(req.files)
              ? req.files.map(
                  file =>
                    `/uploads/${file.filename}`
                )
              : [];

          const imagesToAdd =
            uploadedImages.slice(
              0,
              availableSlots
            );

          const rejectedImages =
            uploadedImages.slice(
              availableSlots
            );

          for (
            const image of rejectedImages
          ) {
            deletePhysicalImage(image);
          }

          service.images = [
            ...existingImages,
            ...imagesToAdd
          ].slice(0, 5);

          service.image =
            service.images[0] || "";

          await service.save();

          return res.json(
            normalizeServiceImages(
              service
            )
          );
        } catch (error) {
          console.error(
            "ADD SERVICE IMAGES ERROR:",
            error
          );

          if (Array.isArray(req.files)) {
            for (const file of req.files) {
              try {
                if (
                  file.path &&
                  fs.existsSync(file.path)
                ) {
                  fs.unlinkSync(file.path);
                }
              } catch (cleanupError) {
                console.error(
                  "ADD IMAGE CLEANUP ERROR:",
                  cleanupError
                );
              }
            }
          }

          return res.status(500).json({
            message:
              error.message ||
              "Unable to add service images."
          });
        }
      }
    );
  };

/* =========================================================
   DELETE SINGLE SERVICE IMAGE
========================================================= */

export const deleteServiceImage =
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message:
            "Not authorized"
        });
      }

      const service =
        await Service.findById(
          req.params.id
        );

      if (!service) {
        return res.status(404).json({
          message:
            "Service not found"
        });
      }

      if (
        !service.provider ||
        service.provider.toString() !==
          req.user._id.toString()
      ) {
        return res.status(403).json({
          message:
            "You are not authorized to modify this service."
        });
      }

      normalizeServiceImages(
        service
      );

      let requestedImage =
        req.body?.image;

      if (!requestedImage) {
        return res.status(400).json({
          message:
            "Image is required."
        });
      }

      requestedImage =
        canonicalImagePath(
          requestedImage
        );

      if (!requestedImage) {
        return res.status(400).json({
          message:
            "Invalid image path."
        });
      }

      const imageIndex =
        service.images.findIndex(
          storedImage =>
            canonicalImagePath(
              storedImage
            ) === requestedImage
        );

      if (imageIndex === -1) {
        return res.status(404).json({
          message:
            "Image not found in this service.",
          requestedImage,
          availableImages:
            service.images
        });
      }

      const storedImage =
        service.images[
          imageIndex
        ];

      deletePhysicalImage(
        storedImage
      );

      service.images =
        service.images.filter(
          (_, index) =>
            index !== imageIndex
        );

      service.image =
        service.images[0] || "";

      await service.save();

      return res.status(200).json({
        message:
          "Image deleted successfully",

        service:
          normalizeServiceImages(
            service
          )
      });
    } catch (error) {
      console.error(
        "DELETE SERVICE IMAGE ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to delete service image.",
        error:
          error.message
      });
    }
  };

/* =========================================================
   REPLACE ALL IMAGES
========================================================= */

export const replaceServiceImages =
  (req, res) => {
    upload(
      req,
      res,
      async (err) => {
        if (err) {
          return res.status(400).json({
            message:
              err.message ||
              "Unable to upload images."
          });
        }

        try {
          if (!req.user) {
            return res.status(401).json({
              message:
                "Not authorized"
            });
          }

          const service =
            await Service.findById(
              req.params.id
            );

          if (!service) {
            return res.status(404).json({
              message:
                "Service not found"
            });
          }

          if (
            !service.provider ||
            service.provider.toString() !==
              req.user._id.toString()
          ) {
            return res.status(403).json({
              message:
                "You are not authorized to modify this service."
            });
          }

          normalizeServiceImages(
            service
          );

          /*
            Save old images first.
            Only delete them after the new upload
            has successfully been written.
          */

          const oldImages =
            [...service.images];

          const newImages =
            Array.isArray(req.files)
              ? req.files
                  .map(
                    file =>
                      `/uploads/${file.filename}`
                  )
                  .slice(0, 5)
              : [];

          /*
            Delete any files beyond the maximum.
          */

          if (
            Array.isArray(req.files) &&
            req.files.length > 5
          ) {
            for (
              const file of req.files.slice(5)
            ) {
              try {
                if (
                  file.path &&
                  fs.existsSync(file.path)
                ) {
                  fs.unlinkSync(file.path);
                }
              } catch (cleanupError) {
                console.error(
                  "REPLACE EXTRA IMAGE CLEANUP ERROR:",
                  cleanupError
                );
              }
            }
          }

          /*
            Update database.
          */

          service.images =
            newImages;

          service.image =
            newImages[0] || "";

          await service.save();

          /*
            Database save succeeded.
            Now remove old physical files.
          */

          for (const oldImage of oldImages) {
            deletePhysicalImage(
              oldImage
            );
          }

          return res.json(
            normalizeServiceImages(
              service
            )
          );
        } catch (error) {
          console.error(
            "REPLACE SERVICE IMAGES ERROR:",
            error
          );

          if (Array.isArray(req.files)) {
            for (const file of req.files) {
              try {
                if (
                  file.path &&
                  fs.existsSync(file.path)
                ) {
                  fs.unlinkSync(file.path);
                }
              } catch (cleanupError) {
                console.error(
                  "REPLACE IMAGE CLEANUP ERROR:",
                  cleanupError
                );
              }
            }
          }

          return res.status(500).json({
            message:
              error.message ||
              "Unable to replace service images."
          });
        }
      }
    );
  };