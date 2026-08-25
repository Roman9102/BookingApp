/* =========================================================
   my-services.js
   QUICKCONNECT PROVIDER SERVICES

   FULL FIXED VERSION

   FIXES:
   - Service images always use the live Render backend
   - Old localhost image URLs are converted automatically
   - /uploads/... paths are converted to full backend URLs
   - Full Render URLs remain supported
   - Images stored as strings or objects are handled
   - Existing images can be viewed
   - Individual images can be deleted
   - Uses DELETE /services/:id/images
   - Handles non-JSON server responses safely
   - New images can be added
   - Form image previews work
   - Preview images can be removed before submitting
   - Maximum 5 images per service
   - Provider services remain separated
========================================================= */

const API = "https://quickconnect-api-m617.onrender.com/api";
const SERVER = "https://quickconnect-api-m617.onrender.com";

console.log("🔥 MY-SERVICES.JS FILE LOADED");

let myServices = [];
let selectedImages = [];
let currentGalleryService = null;


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  console.log("MY SERVICES PAGE LOADED");

  setupProfile();
  setupButtons();
  setupForm();
  setupSearch();
  setupFilter();
  setupImageUpload();
  setupGallery();

  loadMyServices();

});


/* =========================================================
   TOKEN
========================================================= */

function getToken() {

  const token = localStorage.getItem("token");

  if (!token) {

    console.error("No authentication token found.");

    return null;

  }

  return token;

}


/* =========================================================
   SAFE RESPONSE READER
========================================================= */

async function readResponse(response) {

  const contentType =
    response.headers.get("content-type") || "";

  const text = await response.text();

  if (contentType.toLowerCase().includes("application/json")) {

    try {

      return text ? JSON.parse(text) : {};

    } catch (error) {

      console.error(
        "JSON PARSE ERROR:",
        error,
        text
      );

      return {
        message: "The server returned invalid JSON."
      };

    }

  }

  console.error(
    "SERVER RETURNED NON-JSON RESPONSE:",
    response.status,
    text
  );

  return {
    message:
      text && text.trim()
        ? `Server returned an unexpected response (${response.status}).`
        : `Request failed (${response.status}).`
  };

}


/* =========================================================
   PROFILE
========================================================= */

function setupProfile() {

  try {

    const savedUser =
      localStorage.getItem("user");

    if (!savedUser) return;

    const user =
      JSON.parse(savedUser);

    const name =
      user.name || "Provider";

    const topName =
      document.getElementById("topProfileName");

    if (topName) {
      topName.textContent = name;
    }

    const avatar =
      document.getElementById("profileAvatar");

    if (avatar) {

      avatar.textContent =
        name.charAt(0).toUpperCase();

    }

  } catch (err) {

    console.error("PROFILE ERROR:", err);

  }

}


/* =========================================================
   LOAD MY SERVICES
========================================================= */

async function loadMyServices() {

  const loading =
    document.getElementById("servicesLoading");

  const empty =
    document.getElementById("servicesEmpty");

  const grid =
    document.getElementById("servicesGrid");

  if (loading) {
    loading.hidden = false;
  }

  if (empty) {
    empty.hidden = true;
  }

  try {

    const token = getToken();

    if (!token) {

      showServicesError(
        "You are not logged in. Please log in again."
      );

      return;

    }

    const response =
      await fetch(
        `${API}/services/my`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json"
          }
        }
      );

    const data =
      await readResponse(response);

    console.log(
      "MY SERVICES:",
      response.status,
      data
    );

    if (!response.ok) {

      throw new Error(
        data.message ||
        `Unable to load services (${response.status})`
      );

    }

    if (!Array.isArray(data)) {

      throw new Error(
        "Server returned an invalid services response."
      );

    }

    myServices = data;

    updateSummary();
    renderServices();

  } catch (err) {

    console.error(
      "LOAD MY SERVICES ERROR:",
      err
    );

    showServicesError(
      err.message ||
      "Unable to load your services."
    );

  } finally {

    if (loading) {
      loading.hidden = true;
    }

  }

}


/* =========================================================
   ERROR
========================================================= */

function showServicesError(message) {

  const loading =
    document.getElementById("servicesLoading");

  const empty =
    document.getElementById("servicesEmpty");

  const grid =
    document.getElementById("servicesGrid");

  if (loading) {
    loading.hidden = true;
  }

  if (empty) {
    empty.hidden = true;
  }

  if (!grid) return;

  grid.innerHTML = `

    <div class="services-error">

      <div class="empty-icon">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </div>

      <h3>Could not load services</h3>

      <p>
        ${escapeHTML(message)}
      </p>

      <button
        type="button"
        class="primary-btn"
        onclick="loadMyServices()"
      >
        <i class="fa-solid fa-rotate-right"></i>
        Try Again
      </button>

    </div>

  `;

}


/* =========================================================
   SUMMARY
========================================================= */

function updateSummary() {

  const total =
    myServices.length;

  let mobile = 0;
  let store = 0;

  myServices.forEach(service => {

    const modes =
      Array.isArray(service.serviceMode)
        ? service.serviceMode
        : [];

    if (modes.includes("mobile")) {
      mobile++;
    }

    if (modes.includes("store")) {
      store++;
    }

  });

  setText("totalServices", total);
  setText("activeServices", total);
  setText("mobileServices", mobile);
  setText("storeServices", store);

}


/* =========================================================
   RENDER SERVICES
========================================================= */

function renderServices() {

  const grid =
    document.getElementById("servicesGrid");

  const empty =
    document.getElementById("servicesEmpty");

  if (!grid) return;

  const searchInput =
    document.getElementById("serviceSearch");

  const filter =
    document.getElementById("serviceFilter");

  const search =
    searchInput
      ? searchInput.value.trim().toLowerCase()
      : "";

  const filterValue =
    filter
      ? filter.value
      : "all";

  const filtered =
    myServices.filter(service => {

      const name =
        String(service.name || "").toLowerCase();

      const description =
        String(service.description || "").toLowerCase();

      const category =
        String(service.category || "").toLowerCase();

      const matchesSearch =
        !search ||
        name.includes(search) ||
        description.includes(search) ||
        category.includes(search);

      const modes =
        Array.isArray(service.serviceMode)
          ? service.serviceMode
          : [];

      const matchesFilter =
        filterValue === "all" ||
        modes.includes(filterValue);

      return matchesSearch && matchesFilter;

    });

  if (myServices.length === 0) {

    grid.innerHTML = "";

    if (empty) {
      empty.hidden = false;
    }

    return;

  }

  if (empty) {
    empty.hidden = true;
  }

  if (filtered.length === 0) {

    grid.innerHTML = `

      <div class="services-error">

        <div class="empty-icon">
          <i class="fa-solid fa-magnifying-glass"></i>
        </div>

        <h3>No matching services</h3>

        <p>
          Try another search or filter.
        </p>

      </div>

    `;

    return;

  }

  grid.innerHTML =
    filtered
      .map(service => createServiceCard(service))
      .join("");

}


/* =========================================================
   SERVICE CARD
========================================================= */

function createServiceCard(service) {

  const images =
    getServiceImages(service);

  const firstImage =
    images.length
      ? images[0]
      : "";

  const name =
    escapeHTML(
      service.name ||
      "Unnamed Service"
    );

  const description =
    escapeHTML(
      service.description ||
      "No description available."
    );

  const category =
    escapeHTML(
      service.category ||
      "Uncategorized"
    );

  const price =
    Number(service.price || 0).toFixed(2);

  const modes =
    Array.isArray(service.serviceMode)
      ? service.serviceMode
      : [];

  const modeHTML =
    modes.length
      ? modes
          .map(mode => `

            <span class="service-mode-tag">

              <i class="fa-solid ${
                mode === "mobile"
                  ? "fa-car-side"
                  : "fa-store"
              }"></i>

              ${escapeHTML(mode)}

            </span>

          `)
          .join("")
      : `

          <span class="service-mode-tag">

            <i class="fa-solid fa-circle-info"></i>

            Not specified

          </span>

        `;

  const imageHTML =
    firstImage
      ? `

          <img
            src="${escapeHTML(firstImage)}"
            alt="${name}"
            loading="lazy"
            class="service-main-image"
            onerror="
              this.style.display='none';
              this.parentElement.classList.add('no-image');
            "
          >

        `
      : `

          <div class="service-no-image">

            <i class="fa-solid fa-image"></i>

          </div>

        `;

  return `

    <article
      class="service-card"
      data-id="${escapeHTML(service._id || "")}"
    >

      <div class="service-card-image">

        ${imageHTML}

        ${
          images.length
            ? `

              <span class="image-count">

                <i class="fa-solid fa-images"></i>

                ${images.length}

              </span>

            `
            : ""
        }

      </div>

      <div class="service-card-content">

        <div class="service-card-top">

          <span class="service-category">
            ${category}
          </span>

          <span class="service-price">
            R${price}
          </span>

        </div>

        <h3>
          ${name}
        </h3>

        <p class="service-description">
          ${description}
        </p>

        <div class="service-modes">
          ${modeHTML}
        </div>

        ${
          service.location
            ? `

              <div class="service-location">

                <i class="fa-solid fa-location-dot"></i>

                ${escapeHTML(service.location)}

              </div>

            `
            : ""
        }

        <div class="service-card-actions">

          <button
            type="button"
            class="service-action"
            onclick="triggerServiceImageUpload('${escapeJS(service._id)}')"
          >
            <i class="fa-solid fa-plus"></i>
            Add Image
          </button>

          ${
            images.length
              ? `

                <button
                  type="button"
                  class="service-action"
                  onclick="openServiceGallery('${escapeJS(service._id)}')"
                >
                  <i class="fa-solid fa-images"></i>
                  View Images
                </button>

              `
              : ""
          }

          <button
            type="button"
            class="service-action delete"
            onclick="deleteMyService('${escapeJS(service._id)}')"
          >
            <i class="fa-solid fa-trash"></i>
            Delete
          </button>

          <input
            type="file"
            id="service-image-${escapeHTML(service._id || "")}"
            accept="image/*"
            multiple
            hidden
            onchange="uploadServiceImages(event, '${escapeJS(service._id)}')"
          >

        </div>

      </div>

    </article>

  `;

}


/* =========================================================
   GET ALL SERVICE IMAGES
========================================================= */

function getServiceImages(service) {

  let images = [];

  if (Array.isArray(service.images)) {

    images =
      service.images
        .map(extractImageValue)
        .filter(Boolean);

  }

  /*
    Backward compatibility:
    Some older services only have "image".
  */

  if (
    images.length === 0 &&
    service.image
  ) {

    const legacyImage =
      extractImageValue(service.image);

    if (legacyImage) {
      images = [legacyImage];
    }

  }

  /*
    Remove duplicate image URLs while
    preserving their original order.
  */

  const unique = [];
  const seen = new Set();

  images.forEach(image => {

    const normalized =
      normalizeImageURL(image);

    if (
      normalized &&
      !seen.has(normalized)
    ) {

      seen.add(normalized);
      unique.push(normalized);

    }

  });

  return unique.slice(0, 5);

}


/* =========================================================
   EXTRACT IMAGE VALUE
   Supports:

   "/uploads/file.jpg"

   "uploads/file.jpg"

   "https://.../uploads/file.jpg"

   { url: "/uploads/file.jpg" }

   { path: "/uploads/file.jpg" }

   { filename: "file.jpg" }
========================================================= */

function extractImageValue(image) {

  if (!image) {
    return "";
  }

  if (typeof image === "string") {
    return image.trim();
  }

  if (typeof image === "object") {

    if (typeof image.url === "string") {
      return image.url.trim();
    }

    if (typeof image.path === "string") {
      return image.path.trim();
    }

    if (typeof image.src === "string") {
      return image.src.trim();
    }

    if (typeof image.filename === "string") {
      return `/uploads/${image.filename}`;
    }

  }

  return "";

}


/* =========================================================
   NORMALIZE IMAGE URL
   CRITICAL IMAGE FIX
========================================================= */

function normalizeImageURL(image) {

  const raw =
    extractImageValue(image);

  if (!raw) {
    return "";
  }

  let value =
    raw.trim();

  /*
    Convert Windows-style paths.
  */

  value =
    value.replace(/\\/g, "/");

  /*
    Decode encoded paths where possible.
  */

  try {

    value =
      decodeURIComponent(value);

  } catch (_) {}

  /*
    Full URL:
    Always convert old localhost URLs
    to the current Render backend.

    Example:

    http://localhost:5000/uploads/a.jpg

    becomes:

    https://quickconnect-api-m617.onrender.com/uploads/a.jpg
  */

  if (
    /^https?:\/\//i.test(value)
  ) {

    try {

      const parsed =
        new URL(value);

      /*
        If this is an uploaded image,
        force it through the live backend.
      */

      if (
        parsed.pathname
          .toLowerCase()
          .includes("/uploads/")
      ) {

        return `${SERVER}${parsed.pathname}${parsed.search || ""}`;

      }

      /*
        Keep external images untouched.
      */

      return value;

    } catch (_) {

      return value;

    }

  }

  /*
    Remove accidental /api prefix.
  */

  value =
    value.replace(
      /^\/api\/?/i,
      "/"
    );

  /*
    If only "uploads/file.jpg"
    was stored, add the slash.
  */

  if (
    !value.startsWith("/")
  ) {

    value =
      `/${value}`;

  }

  /*
    Final image URL.
  */

  return `${SERVER}${value}`;

}


/* =========================================================
   ADD IMAGE BUTTON
========================================================= */

function triggerServiceImageUpload(serviceId) {

  const input =
    document.getElementById(
      `service-image-${serviceId}`
    );

  if (!input) {

    console.error(
      "Service image input not found:",
      serviceId
    );

    return;

  }

  input.value = "";
  input.click();

}


/* =========================================================
   UPLOAD SERVICE IMAGES
========================================================= */

async function uploadServiceImages(event, serviceId) {

  const input =
    event.target;

  const files =
    Array.from(input.files || []);

  if (!files.length) {
    return;
  }

  const service =
    myServices.find(
      item => item._id === serviceId
    );

  const existingImages =
    service
      ? getServiceImages(service).length
      : 0;

  const availableSlots =
    5 - existingImages;

  if (availableSlots <= 0) {

    alert(
      "This service already has the maximum of 5 images."
    );

    input.value = "";

    return;

  }

  if (files.length > availableSlots) {

    alert(
      `You can only add ${availableSlots} more image${
        availableSlots === 1 ? "" : "s"
      }. Maximum is 5 images per service.`
    );

    input.value = "";

    return;

  }

  const token =
    getToken();

  if (!token) {

    alert("Please log in again.");

    input.value = "";

    return;

  }

  const formData =
    new FormData();

  files.forEach(file => {

    formData.append(
      "images",
      file
    );

  });

  try {

    console.log(
      "Uploading images:",
      serviceId,
      files.length
    );

    const response =
      await fetch(
        `${API}/services/${serviceId}/images`,
        {
          method: "POST",

          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json"
          },

          body: formData
        }
      );

    const data =
      await readResponse(response);

    console.log(
      "IMAGE UPLOAD RESPONSE:",
      response.status,
      data
    );

    if (!response.ok) {

      throw new Error(
        data.message ||
        "Unable to upload images."
      );

    }

    input.value = "";

    const updatedService =
      data.service || data;

    const index =
      myServices.findIndex(
        item => item._id === serviceId
      );

    if (
      index !== -1 &&
      updatedService &&
      updatedService._id
    ) {

      myServices[index] =
        updatedService;

    }

    updateSummary();
    renderServices();

  } catch (err) {

    console.error(
      "UPLOAD SERVICE IMAGES ERROR:",
      err
    );

    alert(
      err.message ||
      "Unable to upload images."
    );

    input.value = "";

  }

}


/* =========================================================
   GALLERY SETUP
========================================================= */

function setupGallery() {

  const modal =
    document.getElementById(
      "serviceImageModal"
    );

  if (!modal) return;

  modal.addEventListener(
    "click",
    event => {

      if (event.target === modal) {

        closeServiceGallery();

      }

    }
  );

}


/* =========================================================
   OPEN SERVICE GALLERY
========================================================= */

function openServiceGallery(serviceId) {

  const service =
    myServices.find(
      item => item._id === serviceId
    );

  if (!service) {
    return;
  }

  const images =
    getServiceImages(service);

  if (!images.length) {
    return;
  }

  currentGalleryService =
    service;

  let modal =
    document.getElementById(
      "serviceImageModal"
    );

  if (!modal) {

    modal =
      document.createElement("div");

    modal.id =
      "serviceImageModal";

    modal.className =
      "service-modal";

    document.body.appendChild(modal);

  }

  modal.innerHTML = `

    <div
      class="modal-content service-gallery-content"
      onclick="event.stopPropagation()"
    >

      <button
        type="button"
        class="modal-close"
        onclick="closeServiceGallery()"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>

      <h2 class="modal-title">
        ${escapeHTML(
          service.name ||
          "Service Images"
        )}
      </h2>

      <div
        class="gallery-main"
        id="galleryMain"
      >

        <img
          id="galleryMainImage"
          src="${escapeHTML(images[0])}"
          alt="Service image"
          onerror="this.style.display='none';"
        >

      </div>

      <div
        class="gallery-thumbnails"
        id="galleryThumbnails"
      >

        ${images
          .map(
            (image, index) => `

              <div
                class="gallery-thumbnail-item"
                data-index="${index}"
              >

                <img
                  src="${escapeHTML(image)}"
                  alt="Image ${index + 1}"
                  class="${
                    index === 0
                      ? "active"
                      : ""
                  }"
                  onclick="selectGalleryImage(${index})"
                  onerror="this.style.display='none';"
                >

                <button
                  type="button"
                  class="gallery-delete-image"
                  onclick="
                    event.stopPropagation();
                    deleteServiceImage(
                      '${escapeJS(service._id)}',
                      ${index}
                    );
                  "
                  title="Delete image"
                >

                  <i class="fa-solid fa-trash"></i>

                </button>

              </div>

            `
          )
          .join("")}

      </div>

    </div>

  `;

  modal.classList.add("show");

  document.body.style.overflow =
    "hidden";

}


/* =========================================================
   SELECT GALLERY IMAGE
========================================================= */

function selectGalleryImage(index) {

  if (!currentGalleryService) {
    return;
  }

  const images =
    getServiceImages(
      currentGalleryService
    );

  if (!images[index]) {
    return;
  }

  const mainImage =
    document.getElementById(
      "galleryMainImage"
    );

  if (mainImage) {

    mainImage.src =
      images[index];

    mainImage.style.display =
      "";

  }

  document
    .querySelectorAll(
      ".gallery-thumbnails img"
    )
    .forEach(
      (img, imageIndex) => {

        img.classList.toggle(
          "active",
          imageIndex === index
        );

      }
    );

}


/* =========================================================
   DELETE SINGLE SERVICE IMAGE

   DELETE:
   /api/services/:id/images

   BODY:
   {
     image: "original database image path"
   }
========================================================= */

async function deleteServiceImage(
  serviceId,
  imageIndex
) {

  const service =
    myServices.find(
      item => item._id === serviceId
    );

  if (!service) {

    console.error(
      "Service not found:",
      serviceId
    );

    return;

  }

  /*
    IMPORTANT:
    Use the original database array.
    Do not use getServiceImages() here
    because that converts the paths to
    full URLs.
  */

  const rawImages =
    Array.isArray(service.images)
      ? service.images.filter(Boolean)
      : [];

  /*
    If this is an old service with only
    the legacy image field, support it.
  */

  if (
    rawImages.length === 0 &&
    service.image
  ) {

    rawImages.push(
      service.image
    );

  }

  if (!rawImages[imageIndex]) {

    console.error(
      "Image not found at index:",
      imageIndex
    );

    return;

  }

  const image =
    extractImageValue(
      rawImages[imageIndex]
    );

  if (!image) {

    console.error(
      "Could not determine original image path."
    );

    return;

  }

  const confirmed =
    window.confirm(
      "Are you sure you want to delete this image?"
    );

  if (!confirmed) {
    return;
  }

  const token =
    getToken();

  if (!token) {

    alert("Please log in again.");

    return;

  }

  try {

    console.log(
      "🗑️ DELETING SERVICE IMAGE"
    );

    console.log(
      "Service ID:",
      serviceId
    );

    console.log(
      "Image index:",
      imageIndex
    );

    console.log(
      "Original image:",
      image
    );

    const response =
      await fetch(
        `${API}/services/${serviceId}/images`,
        {
          method: "DELETE",

          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },

          body: JSON.stringify({
            image: image
          })
        }
      );

    const data =
      await readResponse(response);

    console.log(
      "DELETE IMAGE RESPONSE:",
      response.status,
      data
    );

    if (!response.ok) {

      throw new Error(
        data.message ||
        `Unable to delete image (${response.status}).`
      );

    }

    const updatedService =
      data.service || null;

    const serviceIndex =
      myServices.findIndex(
        item => item._id === serviceId
      );

    if (serviceIndex === -1) {

      throw new Error(
        "The service could not be found after deleting the image."
      );

    }

    if (
      updatedService &&
      updatedService._id
    ) {

      myServices[serviceIndex] =
        updatedService;

      currentGalleryService =
        updatedService;

    } else {

      const localService =
        {
          ...myServices[serviceIndex]
        };

      localService.images =
        Array.isArray(localService.images)
          ? localService.images.filter(
              (_, index) =>
                index !== imageIndex
            )
          : [];

      localService.image =
        localService.images[0] || "";

      myServices[serviceIndex] =
        localService;

      currentGalleryService =
        localService;

    }

    updateSummary();
    renderServices();

    const refreshedService =
      myServices.find(
        item => item._id === serviceId
      );

    if (
      refreshedService &&
      getServiceImages(refreshedService).length > 0
    ) {

      openServiceGallery(serviceId);

    } else {

      closeServiceGallery();

    }

    console.log(
      "✅ SERVICE IMAGE DELETED SUCCESSFULLY"
    );

  } catch (err) {

    console.error(
      "DELETE SERVICE IMAGE ERROR:",
      err
    );

    alert(
      err.message ||
      "Unable to delete image."
    );

  }

}


/* =========================================================
   CLOSE GALLERY
========================================================= */

function closeServiceGallery() {

  const modal =
    document.getElementById(
      "serviceImageModal"
    );

  if (modal) {

    modal.classList.remove("show");

  }

  document.body.style.overflow =
    "";

  currentGalleryService =
    null;

}


/* =========================================================
   BUTTONS
========================================================= */

function setupButtons() {

  const addButton =
    document.getElementById(
      "addServiceButton"
    );

  const emptyButton =
    document.getElementById(
      "emptyAddServiceButton"
    );

  const cancelButton =
    document.getElementById(
      "cancelServiceButton"
    );

  if (addButton) {

    addButton.addEventListener(
      "click",
      showServiceForm
    );

  }

  if (emptyButton) {

    emptyButton.addEventListener(
      "click",
      showServiceForm
    );

  }

  if (cancelButton) {

    cancelButton.addEventListener(
      "click",
      hideServiceForm
    );

  }

}


/* =========================================================
   SHOW FORM
========================================================= */

function showServiceForm() {

  const card =
    document.getElementById(
      "serviceFormCard"
    );

  if (!card) return;

  card.hidden = false;

  card.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


/* =========================================================
   HIDE FORM
========================================================= */

function hideServiceForm() {

  const card =
    document.getElementById(
      "serviceFormCard"
    );

  const form =
    document.getElementById(
      "serviceForm"
    );

  if (card) {
    card.hidden = true;
  }

  if (form) {
    form.reset();
  }

  selectedImages = [];

  updateImagePreview();

  setText(
    "serviceMessage",
    ""
  );

}


/* =========================================================
   FORM
========================================================= */

function setupForm() {

  const form =
    document.getElementById(
      "serviceForm"
    );

  if (!form) {

    console.error(
      "serviceForm not found."
    );

    return;

  }

  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      await createService();

    }
  );

}


/* =========================================================
   CREATE SERVICE
========================================================= */

async function createService() {

  const form =
    document.getElementById(
      "serviceForm"
    );

  const submitButton =
    document.getElementById(
      "saveServiceButton"
    );

  const submitText =
    document.getElementById(
      "serviceSubmitText"
    );

  if (!form) return;

  const token =
    getToken();

  if (!token) {

    setMessage(
      "Please log in again.",
      true
    );

    return;

  }

  const getValue =
    id => {

      const element =
        document.getElementById(id);

      return element
        ? element.value.trim()
        : "";

    };

  const name =
    getValue("serviceName");

  const price =
    document.getElementById(
      "servicePrice"
    )?.value || "";

  const category =
    document.getElementById(
      "serviceCategory"
    )?.value || "";

  const location =
    getValue("serviceLocation");

  const description =
    getValue("serviceDescription");

  const storeMode =
    Boolean(
      document.getElementById(
        "storeMode"
      )?.checked
    );

  const mobileMode =
    Boolean(
      document.getElementById(
        "mobileMode"
      )?.checked
    );

  const storeLocation =
    getValue("storeLocation");

  if (
    !storeMode &&
    !mobileMode
  ) {

    setMessage(
      "Please select Store, Mobile, or both.",
      true
    );

    return;

  }

  if (
    storeMode &&
    !storeLocation &&
    !location
  ) {

    setMessage(
      "Please enter your store location.",
      true
    );

    return;

  }

  if (
    selectedImages.length > 5
  ) {

    setMessage(
      "You can select a maximum of 5 images.",
      true
    );

    return;

  }

  const formData =
    new FormData();

  formData.append(
    "name",
    name
  );

  formData.append(
    "description",
    description
  );

  formData.append(
    "price",
    price
  );

  formData.append(
    "category",
    category
  );

  formData.append(
    "location",
    location
  );

  formData.append(
    "storeLocation",
    storeLocation
  );

  /*
    Backend accepts:
    yes / no
    true / false
  */

  formData.append(
    "storeMode",
    storeMode ? "true" : "false"
  );

  formData.append(
    "mobileMode",
    mobileMode ? "true" : "false"
  );

  selectedImages.forEach(image => {

    formData.append(
      "images",
      image
    );

  });

  try {

    if (submitButton) {
      submitButton.disabled = true;
    }

    if (submitText) {
      submitText.textContent = "Adding...";
    }

    setMessage(
      "Creating your service...",
      false
    );

    const response =
      await fetch(
        `${API}/services`,
        {
          method: "POST",

          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json"
          },

          body: formData
        }
      );

    const data =
      await readResponse(response);

    console.log(
      "CREATE SERVICE RESPONSE:",
      response.status,
      data
    );

    if (!response.ok) {

      throw new Error(
        data.message ||
        "Unable to create service."
      );

    }

    setMessage(
      "Service added successfully!",
      false
    );

    if (
      data &&
      data._id
    ) {

      myServices.unshift(data);

    }

    updateSummary();
    renderServices();

    form.reset();

    selectedImages = [];

    updateImagePreview();

    setTimeout(
      () => {

        hideServiceForm();

        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });

      },
      700
    );

  } catch (err) {

    console.error(
      "CREATE SERVICE ERROR:",
      err
    );

    setMessage(
      err.message ||
      "Unable to create service.",
      true
    );

  } finally {

    if (submitButton) {
      submitButton.disabled = false;
    }

    if (submitText) {
      submitText.textContent = "Add Service";
    }

  }

}


/* =========================================================
   FORM IMAGE UPLOAD
========================================================= */

function setupImageUpload() {

  const input =
    document.getElementById(
      "serviceImage"
    );

  if (!input) return;

  input.addEventListener(
    "change",
    event => {

      const files =
        Array.from(
          event.target.files || []
        );

      if (files.length > 5) {

        setMessage(
          "You can select a maximum of 5 images.",
          true
        );

        input.value = "";

        selectedImages = [];

        updateImagePreview();

        return;

      }

      selectedImages =
        files.slice(0, 5);

      updateImagePreview();

    }
  );

}


/* =========================================================
   FORM IMAGE PREVIEW
========================================================= */

function updateImagePreview() {

  const preview =
    document.getElementById(
      "imagePreview"
    );

  if (!preview) return;

  if (
    selectedImages.length === 0
  ) {

    preview.hidden = true;
    preview.innerHTML = "";

    return;

  }

  preview.hidden = false;

  preview.innerHTML =
    selectedImages
      .map(
        (file, index) => {

          const url =
            URL.createObjectURL(file);

          return `

            <div
              class="preview-image"
              data-preview-index="${index}"
            >

              <img
                src="${url}"
                alt="Preview ${index + 1}"
              >

              <button
                type="button"
                class="preview-remove"
                onclick="removeSelectedImage(${index})"
                title="Remove image"
              >

                <i class="fa-solid fa-xmark"></i>

              </button>

              <span>
                ${index + 1}
              </span>

            </div>

          `;

        }
      )
      .join("");

}


/* =========================================================
   REMOVE FORM PREVIEW IMAGE
========================================================= */

function removeSelectedImage(index) {

  if (
    index < 0 ||
    index >= selectedImages.length
  ) {
    return;
  }

  selectedImages.splice(
    index,
    1
  );

  const input =
    document.getElementById(
      "serviceImage"
    );

  if (input) {

    const transfer =
      new DataTransfer();

    selectedImages.forEach(file => {

      transfer.items.add(file);

    });

    input.files =
      transfer.files;

  }

  updateImagePreview();

}


/* =========================================================
   SEARCH
========================================================= */

function setupSearch() {

  const search =
    document.getElementById(
      "serviceSearch"
    );

  if (!search) return;

  search.addEventListener(
    "input",
    renderServices
  );

}


/* =========================================================
   FILTER
========================================================= */

function setupFilter() {

  const filter =
    document.getElementById(
      "serviceFilter"
    );

  if (!filter) return;

  filter.addEventListener(
    "change",
    renderServices
  );

}


/* =========================================================
   DELETE SERVICE
========================================================= */

async function deleteMyService(serviceId) {

  if (!serviceId) return;

  const confirmed =
    window.confirm(
      "Are you sure you want to delete this service?"
    );

  if (!confirmed) {
    return;
  }

  const token =
    getToken();

  if (!token) {

    alert("Please log in again.");

    return;

  }

  try {

    const response =
      await fetch(
        `${API}/services/${serviceId}`,
        {
          method: "DELETE",

          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json"
          }
        }
      );

    const data =
      await readResponse(response);

    if (!response.ok) {

      throw new Error(
        data.message ||
        "Unable to delete service."
      );

    }

    myServices =
      myServices.filter(
        service =>
          service._id !== serviceId
      );

    if (
      currentGalleryService &&
      currentGalleryService._id === serviceId
    ) {

      closeServiceGallery();

    }

    updateSummary();
    renderServices();

  } catch (err) {

    console.error(
      "DELETE SERVICE ERROR:",
      err
    );

    alert(
      err.message ||
      "Unable to delete service."
    );

  }

}


/* =========================================================
   MESSAGE
========================================================= */

function setMessage(
  text,
  isError
) {

  const message =
    document.getElementById(
      "serviceMessage"
    );

  if (!message) return;

  message.textContent =
    text || "";

  message.classList.toggle(
    "error",
    Boolean(isError)
  );

  message.classList.toggle(
    "success",
    !isError && Boolean(text)
  );

}


/* =========================================================
   SET TEXT
========================================================= */

function setText(
  id,
  value
) {

  const element =
    document.getElementById(id);

  if (element) {

    element.textContent =
      value;

  }

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


/* =========================================================
   ESCAPE JAVASCRIPT STRING
========================================================= */

function escapeJS(value) {

  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");

}


/* =========================================================
   LOGOUT
========================================================= */

function logout() {

  localStorage.removeItem("token");
  localStorage.removeItem("user");

  window.location.href =
    "login.html";

}


/* =========================================================
   GLOBAL FUNCTIONS
========================================================= */

window.loadMyServices =
  loadMyServices;

window.deleteMyService =
  deleteMyService;

window.triggerServiceImageUpload =
  triggerServiceImageUpload;

window.uploadServiceImages =
  uploadServiceImages;

window.deleteServiceImage =
  deleteServiceImage;

window.openServiceGallery =
  openServiceGallery;

window.selectGalleryImage =
  selectGalleryImage;

window.closeServiceGallery =
  closeServiceGallery;

window.removeSelectedImage =
  removeSelectedImage;

window.logout =
  logout;