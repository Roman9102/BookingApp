const API = "http://quickconnect-api-m617.onrender.com/api";

/* =====================================================
   CATEGORY IMAGES
===================================================== */

const categoryImages = {
  "Hair Services": "categories/Hair services.jpg",
  "Nail Services": "categories/Nail services.jpg",
  "Barber Services": "categories/Barber services.jpg",
  "Makeup Services": "categories/Makeup services.jpg",
  "Photography": "categories/Photography.jpg",
  "Graphic Design": "categories/Graphic design.jpg",
  "Web Design": "categories/Web design.jpg",
  "Cleaning Services": "categories/Cleaning services.jpg",
  "Guest House": "categories/Guest house.jpg",
  "Fitness": "categories/Fitness.jpg",
  "Music/Band": "categories/Music.jpg",
  "Massage": "categories/Massage.jpg",
  "Other": "categories/Other.jpg"
};


document.addEventListener("DOMContentLoaded", () => {
  loadServices();
});


async function loadServices() {

  try {

    const res = await fetch(`${API}/services`);

    if (!res.ok) {
      throw new Error("Failed to load services");
    }

    const data = await res.json();

    const services = Array.isArray(data)
      ? data
      : data.services || [];

    const container =
      document.getElementById("servicesContainer");

    if (!container) {
      console.error("servicesContainer not found");
      return;
    }

    container.innerHTML = "";

    if (!services.length) {

      container.innerHTML = `
        <div class="empty">
          <h3>No services available</h3>
        </div>
      `;

      return;
    }


    services.forEach(service => {

      const images =
        Array.isArray(service.images) &&
        service.images.length
          ? service.images
          : service.image
            ? [service.image]
            : [];


      /*
        Use the actual service image if one exists.
        If there is no service image, use the
        category picture from /categories/.
      */

      let image;

      if (images.length > 0) {

        const serviceImage = images[0];

        if (
          typeof serviceImage === "string" &&
          serviceImage.startsWith("http")
        ) {

          image = serviceImage;

        } else {

          image =
            `http://quickconnect-api-m617.onrender.com${serviceImage}`;

        }

      } else {

        const category =
          service.category || "Other";

        image =
          categoryImages[category] ||
          categoryImages["Other"];

      }


      const card =
        document.createElement("div");

      card.className =
        "service-card";


      card.innerHTML = `

        <img
          src="${image}"
          alt="${service.name || "Service"}"
          onerror="
            this.onerror=null;
            this.src='categories/Other.jpg';
          ">

        <div class="service-info">

          <h3>
            ${service.name || "Unnamed Service"}
          </h3>

          <p>
            ${service.description || ""}
          </p>

          <p class="price">
            R${Number(service.price || 0).toFixed(2)}
          </p>

          <p>
            <strong>Category:</strong>
            ${service.category || "Other"}
          </p>

          <p>
            <strong>Location:</strong>
            ${service.storeLocation || "Not specified"}
          </p>

          <p>
            <strong>Provider:</strong>
            ${service.providerName || "Unknown"}
          </p>

          <button
            class="book-btn"
            onclick="bookService('${service._id}')">

            Book Now

          </button>

        </div>
      `;


      container.appendChild(card);

    });


  } catch (err) {

    console.error(err);

    const container =
      document.getElementById(
        "servicesContainer"
      );

    if (container) {

      container.innerHTML = `

        <div class="empty">

          Failed to load services.

        </div>

      `;

    }

  }

}


function bookService(id) {

  const token =
    localStorage.getItem("token");

  if (!token) {

    window.location.href =
      "login.html";

    return;

  }


  localStorage.setItem(
    "selectedService",
    id
  );


  window.location.href =
    "booking.html";

}