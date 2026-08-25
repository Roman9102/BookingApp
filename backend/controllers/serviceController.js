/* =========================
   serviceController.js
   FIXED:
   - Provider services stay separated
   - /api/services = public marketplace
   - /api/services/my = logged-in provider only
   - Upload directory is absolute and always created
   - Images and thumbnails remain supported
   - Maximum 5 images
   - Mobile-only services still satisfy existing schema
========================= */

import Service from "../models/service.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

/* =========================
   PATH SETUP
========================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/*
  Backend/
    controllers/
      serviceController.js

  Therefore:
    ../uploads
*/

const UPLOADS_DIR = path.resolve(
  __dirname,
  "../uploads"
);

/*
  Make absolutely sure the uploads
  directory exists before multer
  attempts to save anything.
*/

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, {
    recursive: true
  });
}

/* =========================
   MULTER CONFIG
========================= */

const storage = multer.diskStorage({

  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },

  filename: (req, file, cb) => {

    const extension =
      path.extname(
        file.originalname
      ).toLowerCase();

    const uniqueName =
      `${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}${extension}`;

    cb(
      null,
      uniqueName
    );
  }
});

const upload = multer({
  storage,

  limits: {
    files: 5
  }
}).array("images", 5);

/* =========================
   CREATE SERVICE
========================= */

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
          message: err.message
        });
      }

      try {

        /* =========================
           AUTHORIZATION
        ========================= */

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
              "Only service providers can create services."
          });
        }

        /* =========================
           BODY
        ========================= */

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

        if (!name || !name.trim()) {
          return res.status(400).json({
            message:
              "Service name is required."
          });
        }

        /* =========================
           SERVICE MODE
        ========================= */

        const serviceMode = [];

        if (
          storeMode === "true" ||
          storeMode === true
        ) {
          serviceMode.push(
            "store"
          );
        }

        if (
          mobileMode === "true" ||
          mobileMode === true
        ) {
          serviceMode.push(
            "mobile"
          );
        }

        if (serviceMode.length === 0) {
          return res.status(400).json({
            message:
              "Please select at least one service mode."
          });
        }

        /* =========================
           STORE LOCATION

           Your existing schema makes
           storeLocation required.

           Therefore mobile-only services
           receive a harmless placeholder
           instead of failing validation.
        ========================= */

        const finalStoreLocation =
          storeLocation &&
          storeLocation.trim()
            ? storeLocation.trim()
            : "Mobile service";

        /* =========================
           IMAGES
        ========================= */

        const images =
          Array.isArray(req.files)
            ? req.files.map(
                (file) =>
                  `/uploads/${file.filename}`
              )
            : [];

        /* =========================
           PROVIDER NAME
        ========================= */

        const finalProviderName =
          providerName &&
          providerName.trim()
            ? providerName.trim()
            : (
                req.user.name ||
                "Unknown Provider"
              );

        /* =========================
           CREATE SERVICE
        ========================= */

        const service =
          await Service.create({

            name:
              name.trim(),

            description:
              description || "",

            price:
              Number(price || 0),

            serviceMode,

            storeLocation:
              finalStoreLocation,

            category:
              category &&
              category.trim()
                ? category.trim()
                : "Uncategorized",

            /*
              ALWAYS link the service
              to the logged-in provider.
            */

            provider:
              req.user._id,

            /*
              Main image remains for
              old UI compatibility.
            */

            image:
              images[0] || "",

            /*
              Full gallery.
            */

            images,

            providerName:
              finalProviderName,

            rating:
              Number(rating || 0),

            location:
              location || ""
          });

        console.log(
          "SERVICE CREATED:",
          service._id
        );

        res.status(201).json(
          service
        );

      } catch (err) {

        console.error(
          "CREATE SERVICE ERROR:",
          err
        );

        /*
          If files were uploaded but
          MongoDB creation failed, remove
          those newly uploaded files.
        */

        if (
          Array.isArray(req.files)
        ) {

          for (
            const file of req.files
          ) {

            try {

              if (
                fs.existsSync(
                  file.path
                )
              ) {
                fs.unlinkSync(
                  file.path
                );
              }

            } catch (deleteError) {

              console.error(
                "UPLOAD CLEANUP ERROR:",
                deleteError
              );
            }
          }
        }

        res.status(500).json({
          message:
            err.message
        });
      }
    }
  );
};

/* =========================
   GET ALL SERVICES
   PUBLIC MARKETPLACE
========================= */

export const getServices =
  async (
    req,
    res
  ) => {

    try {

      const services =
        await Service.find({})
          .sort({
            createdAt: -1
          });

      res.json(
        services
      );

    } catch (err) {

      console.error(
        "GET SERVICES ERROR:",
        err
      );

      res.status(500).json({
        message:
          err.message
      });
    }
  };

/* =========================
   GET MY SERVICES
   PROVIDER DASHBOARD
========================= */

export const getMyServices =
  async (
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
        })
        .sort({
          createdAt: -1
        });

      res.json(
        services
      );

    } catch (err) {

      console.error(
        "GET MY SERVICES ERROR:",
        err
      );

      res.status(500).json({
        message:
          err.message
      });
    }
  };

/* =========================
   DELETE SERVICE
========================= */

export const deleteService =
  async (
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

      /*
        Delete uploaded image files
        belonging to this service.
      */

      if (
        Array.isArray(
          service.images
        )
      ) {

        for (
          const imagePath
          of service.images
        ) {

          const filename =
            path.basename(
              imagePath
            );

          const fullPath =
            path.join(
              UPLOADS_DIR,
              filename
            );

          try {

            if (
              fs.existsSync(
                fullPath
              )
            ) {
              fs.unlinkSync(
                fullPath
              );
            }

          } catch (fileError) {

            console.error(
              "IMAGE DELETE ERROR:",
              fileError
            );
          }
        }
      }

      await Service.findByIdAndDelete(
        req.params.id
      );

      res.json({
        message:
          "Service deleted successfully"
      });

    } catch (err) {

      console.error(
        "DELETE SERVICE ERROR:",
        err
      );

      res.status(500).json({
        message:
          err.message
      });
    }
  };

/* =========================
   ADD IMAGES
   APPEND + MAX 5
========================= */

export const addServiceImages =
  (
    req,
    res
  ) => {

    upload(
      req,
      res,
      async (err) => {

        if (err) {
          return res.status(400).json({
            message:
              err.message
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

          if (
            !Array.isArray(
              service.images
            )
          ) {
            service.images = [];
          }

          const newImages =
            Array.isArray(
              req.files
            )
              ? req.files.map(
                  (file) =>
                    `/uploads/${file.filename}`
                )
              : [];

          const availableSlots =
            Math.max(
              0,
              5 -
                service.images.length
            );

          const imagesToAdd =
            newImages.slice(
              0,
              availableSlots
            );

          /*
            Delete files that exceed
            the five-image limit.
          */

          const rejectedImages =
            newImages.slice(
              availableSlots
            );

          for (
            const imagePath
            of rejectedImages
          ) {

            const filename =
              path.basename(
                imagePath
              );

            const fullPath =
              path.join(
                UPLOADS_DIR,
                filename
              );

            try {

              if (
                fs.existsSync(
                  fullPath
                )
              ) {
                fs.unlinkSync(
                  fullPath
                );
              }

            } catch {}
          }

          service.images = [
            ...service.images,
            ...imagesToAdd
          ].slice(0, 5);

          service.image =
            service.images[0] ||
            "";

          await service.save();

          res.json(
            service
          );

        } catch (err) {

          console.error(
            "ADD SERVICE IMAGES ERROR:",
            err
          );

          res.status(500).json({
            message:
              err.message
          });
        }
      }
    );
  };

/* =========================
   DELETE SINGLE IMAGE
========================= */

export const deleteServiceImage =
  async (
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

      if (
        !Array.isArray(
          service.images
        )
      ) {
        service.images = [];
      }

      let {
        image
      } = req.body;

      if (!image) {
        return res.status(400).json({
          message:
            "Image is required."
        });
      }

      try {
        image =
          decodeURIComponent(
            image
          );
      } catch {}

      const imageExists =
        service.images.includes(
          image
        );

      if (!imageExists) {
        return res.status(404).json({
          message:
            "Image not found in this service."
        });
      }

      /*
        Remove physical file.
      */

      const filename =
        path.basename(
          image
        );

      const fullPath =
        path.join(
          UPLOADS_DIR,
          filename
        );

      try {

        if (
          fs.existsSync(
            fullPath
          )
        ) {
          fs.unlinkSync(
            fullPath
          );
        }

      } catch (fileError) {

        console.error(
          "PHYSICAL IMAGE DELETE ERROR:",
          fileError
        );
      }

      service.images =
        service.images.filter(
          (img) =>
            img !== image
        );

      service.image =
        service.images[0] ||
        "";

      await service.save();

      res.json({
        message:
          "Image deleted successfully",
        service
      });

    } catch (err) {

      console.error(
        "DELETE SERVICE IMAGE ERROR:",
        err
      );

      res.status(500).json({
        message:
          err.message
      });
    }
  };

/* =========================
   REPLACE ALL IMAGES
========================= */

export const replaceServiceImages =
  (
    req,
    res
  ) => {

    upload(
      req,
      res,
      async (err) => {

        if (err) {
          return res.status(400).json({
            message:
              err.message
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

          /*
            Delete old physical images.
          */

          if (
            Array.isArray(
              service.images
            )
          ) {

            for (
              const oldImage
              of service.images
            ) {

              const filename =
                path.basename(
                  oldImage
                );

              const fullPath =
                path.join(
                  UPLOADS_DIR,
                  filename
                );

              try {

                if (
                  fs.existsSync(
                    fullPath
                  )
                ) {
                  fs.unlinkSync(
                    fullPath
                  );
                }

              } catch {}
            }
          }

          const images =
            Array.isArray(
              req.files
            )
              ? req.files
                  .map(
                    (file) =>
                      `/uploads/${file.filename}`
                  )
                  .slice(0, 5)
              : [];

          service.images =
            images;

          service.image =
            images[0] ||
            "";

          await service.save();

          res.json(
            service
          );

        } catch (err) {

          console.error(
            "REPLACE SERVICE IMAGES ERROR:",
            err
          );

          res.status(500).json({
            message:
              err.message
          });
        }
      }
    );
  };