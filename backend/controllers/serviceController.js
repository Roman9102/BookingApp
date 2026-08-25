/* =========================
   serviceController.js
   FULL FIXED VERSION

   FIXES:
   - Provider services stay separated
   - /api/services = public marketplace
   - /api/services/my = logged-in provider only
   - Upload directory is absolute and always created
   - Images and thumbnails remain supported
   - Maximum 5 images
   - Mobile-only services still satisfy existing schema
   - HTML yes/no service modes supported
   - Single image deletion fixed
   - Image path normalization supported
   - Physical image files are removed
   - Existing service functionality preserved
========================= */

import Service from "../models/service.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";


/* =========================
   PATH SETUP
========================= */

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);


/*
  Backend/
    controllers/
      serviceController.js

  Therefore uploads is:

    Backend/uploads
*/

const UPLOADS_DIR =
  path.resolve(
    __dirname,
    "../uploads"
  );


/*
  Always make sure the uploads
  directory exists.
*/

if (!fs.existsSync(UPLOADS_DIR)) {

  fs.mkdirSync(
    UPLOADS_DIR,
    {
      recursive: true
    }
  );

}


/* =========================
   MULTER CONFIG
========================= */

const storage =
  multer.diskStorage({

    destination: (
      req,
      file,
      cb
    ) => {

      cb(
        null,
        UPLOADS_DIR
      );

    },


    filename: (
      req,
      file,
      cb
    ) => {

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


const upload =
  multer({

    storage,

    limits: {
      files: 5
    }

  }).array(
    "images",
    5
  );


/* =====================================================
   IMAGE HELPERS
===================================================== */


/*
  Convert different possible image
  formats into a normal path.

  Examples:

  /uploads/file.jpg
  uploads/file.jpg
  https://example.com/uploads/file.jpg

  all become:

  /uploads/file.jpg
*/

function normalizeImagePath(
  image
) {

  if (!image) {
    return "";
  }


  let value =
    String(image).trim();


  if (!value) {
    return "";
  }


  try {

    value =
      decodeURIComponent(
        value
      );

  } catch {}


  /*
    If a complete URL was stored,
    use only its pathname.
  */

  try {

    if (
      value.startsWith(
        "http://"
      ) ||
      value.startsWith(
        "https://"
      )
    ) {

      const parsed =
        new URL(
          value
        );

      value =
        parsed.pathname;

    }

  } catch {}


  /*
    Remove /api if someone
    accidentally stored it.
  */

  value =
    value.replace(
      /^\/api\/?/i,
      "/"
    );


  /*
    Ensure leading slash.
  */

  if (
    !value.startsWith("/")
  ) {

    value =
      `/${value}`;

  }


  return value;

}


/*
  Get physical filename safely.
*/

function getImageFilename(
  image
) {

  const normalized =
    normalizeImagePath(
      image
    );


  if (!normalized) {
    return "";
  }


  return path.basename(
    normalized
  );

}


/*
  Delete a physical uploaded file.

  This intentionally does not throw
  if the file is already missing.
*/

function deletePhysicalImage(
  image
) {

  const filename =
    getImageFilename(
      image
    );


  if (!filename) {
    return;
  }


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

      console.log(
        "IMAGE FILE DELETED:",
        fullPath
      );

    } else {

      console.log(
        "IMAGE FILE ALREADY MISSING:",
        fullPath
      );

    }

  } catch (error) {

    console.error(
      "PHYSICAL IMAGE DELETE ERROR:",
      error
    );

  }

}


/* =========================
   CREATE SERVICE
========================= */

export const createService =
  (
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
              err.message
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


          if (
            !name ||
            !name.trim()
          ) {

            return res.status(400).json({
              message:
                "Service name is required."
            });

          }


          /* =========================
             SERVICE MODE
          ========================= */

          const serviceMode = [];


          /*
            Your HTML sends:

              yes
              no

            We also support:

              true
              false

            so existing forms remain
            compatible.
          */

          if (
            storeMode === "yes" ||
            storeMode === "true" ||
            storeMode === true
          ) {

            serviceMode.push(
              "store"
            );

          }


          if (
            mobileMode === "yes" ||
            mobileMode === "true" ||
            mobileMode === true
          ) {

            serviceMode.push(
              "mobile"
            );

          }


          if (
            serviceMode.length === 0
          ) {

            return res.status(400).json({
              message:
                "Please select at least one service mode."
            });

          }


          /* =========================
             STORE LOCATION
          ========================= */

          /*
            Your existing schema requires
            storeLocation.

            Mobile-only services therefore
            receive a harmless placeholder.
          */

          const finalStoreLocation =
            storeLocation &&
            storeLocation.trim()
              ? storeLocation.trim()
              : "Mobile service";


          /* =========================
             IMAGES
          ========================= */

          const images =
            Array.isArray(
              req.files
            )
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
                Number(
                  price || 0
                ),

              serviceMode,

              storeLocation:
                finalStoreLocation,

              category:
                category &&
                category.trim()
                  ? category.trim()
                  : "Uncategorized",

              /*
                Always link service
                to logged-in provider.
              */

              provider:
                req.user._id,

              /*
                Main image remains
                for old UI compatibility.
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
                Number(
                  rating || 0
                ),

              location:
                location || ""

            });


          console.log(
            "SERVICE CREATED:",
            service._id
          );


          return res.status(201).json(
            service
          );


        } catch (err) {

          console.error(
            "CREATE SERVICE ERROR:",
            err
          );


          /*
            Clean up newly uploaded
            files if database creation
            failed.
          */

          if (
            Array.isArray(
              req.files
            )
          ) {

            for (
              const file
              of req.files
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

              } catch (
                deleteError
              ) {

                console.error(
                  "UPLOAD CLEANUP ERROR:",
                  deleteError
                );

              }

            }

          }


          return res.status(500).json({
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


      return res.json(
        services
      );


    } catch (err) {

      console.error(
        "GET SERVICES ERROR:",
        err
      );


      return res.status(500).json({
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


      return res.json(
        services
      );


    } catch (err) {

      console.error(
        "GET MY SERVICES ERROR:",
        err
      );


      return res.status(500).json({
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


      /* =========================
         DELETE SERVICE IMAGES
      ========================= */

      if (
        Array.isArray(
          service.images
        )
      ) {

        for (
          const imagePath
          of service.images
        ) {

          deletePhysicalImage(
            imagePath
          );

        }

      }


      /* =========================
         DELETE SERVICE
      ========================= */

      await Service.findByIdAndDelete(
        req.params.id
      );


      return res.json({
        message:
          "Service deleted successfully"
      });


    } catch (err) {

      console.error(
        "DELETE SERVICE ERROR:",
        err
      );


      return res.status(500).json({
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
            Delete uploaded files
            that exceed the 5 image
            maximum.
          */

          const rejectedImages =
            newImages.slice(
              availableSlots
            );


          for (
            const imagePath
            of rejectedImages
          ) {

            deletePhysicalImage(
              imagePath
            );

          }


          service.images = [
            ...service.images,
            ...imagesToAdd
          ].slice(
            0,
            5
          );


          service.image =
            service.images[0] ||
            "";


          await service.save();


          return res.json(
            service
          );


        } catch (err) {

          console.error(
            "ADD SERVICE IMAGES ERROR:",
            err
          );


          /*
            If database update failed,
            clean up newly uploaded files.
          */

          if (
            Array.isArray(
              req.files
            )
          ) {

            for (
              const file
              of req.files
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

              } catch (
                cleanupError
              ) {

                console.error(
                  "ADD IMAGE CLEANUP ERROR:",
                  cleanupError
                );

              }

            }

          }


          return res.status(500).json({
            message:
              err.message
          });

        }

      }

    );

  };


/* =========================
   DELETE SINGLE IMAGE
   FIXED
========================= */

export const deleteServiceImage =
  async (
    req,
    res
  ) => {

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


      /* =========================
         FIND SERVICE
      ========================= */

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


      /* =========================
         OWNER CHECK
      ========================= */

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


      /* =========================
         MAKE SURE IMAGES EXISTS
      ========================= */

      if (
        !Array.isArray(
          service.images
        )
      ) {

        service.images = [];

      }


      /* =========================
         GET IMAGE
      ========================= */

      let image =
        req.body?.image;


      if (!image) {

        return res.status(400).json({
          message:
            "Image is required."
        });

      }


      image =
        String(image).trim();


      if (!image) {

        return res.status(400).json({
          message:
            "Image is required."
        });

      }


      /* =========================
         NORMALIZE REQUESTED IMAGE
      ========================= */

      const normalizedRequestedImage =
        normalizeImagePath(
          image
        );


      /* =========================
         FIND IMAGE
      ========================= */

      const imageIndex =
        service.images.findIndex(
          storedImage => {

            return (
              normalizeImagePath(
                storedImage
              ) ===
              normalizedRequestedImage
            );

          }
        );


      if (
        imageIndex === -1
      ) {

        return res.status(404).json({

          message:
            "Image not found in this service.",

          requestedImage:
            image,

          availableImages:
            service.images

        });

      }


      /* =========================
         GET ACTUAL STORED IMAGE
      ========================= */

      const storedImage =
        service.images[
          imageIndex
        ];


      /* =========================
         DELETE PHYSICAL FILE
      ========================= */

      deletePhysicalImage(
        storedImage
      );


      /* =========================
         REMOVE FROM DATABASE
      ========================= */

      service.images =
        service.images.filter(
          (
            currentImage,
            index
          ) => {

            return (
              index !==
              imageIndex
            );

          }
        );


      /*
        Keep old single image field
        synchronized.
      */

      service.image =
        service.images[0] ||
        "";


      await service.save();


      /* =========================
         SUCCESS RESPONSE
      ========================= */

      return res.status(200).json({

        message:
          "Image deleted successfully",

        service

      });


    } catch (err) {

      console.error(
        "DELETE SERVICE IMAGE ERROR:",
        err
      );


      return res.status(500).json({

        message:
          "Unable to delete service image.",

        error:
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


          /* =========================
             DELETE OLD IMAGES
          ========================= */

          if (
            Array.isArray(
              service.images
            )
          ) {

            for (
              const oldImage
              of service.images
            ) {

              deletePhysicalImage(
                oldImage
              );

            }

          }


          /* =========================
             NEW IMAGES
          ========================= */

          const images =
            Array.isArray(
              req.files
            )
              ? req.files
                  .map(
                    (file) =>
                      `/uploads/${file.filename}`
                  )
                  .slice(
                    0,
                    5
                  )
              : [];


          /* =========================
             UPDATE SERVICE
          ========================= */

          service.images =
            images;


          service.image =
            images[0] ||
            "";


          await service.save();


          return res.json(
            service
          );


        } catch (err) {

          console.error(
            "REPLACE SERVICE IMAGES ERROR:",
            err
          );


          /*
            Clean up newly uploaded
            files if saving failed.
          */

          if (
            Array.isArray(
              req.files
            )
          ) {

            for (
              const file
              of req.files
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

              } catch (
                cleanupError
              ) {

                console.error(
                  "REPLACE IMAGE CLEANUP ERROR:",
                  cleanupError
                );

              }

            }

          }


          return res.status(500).json({
            message:
              err.message
          });

        }

      }

    );

  };