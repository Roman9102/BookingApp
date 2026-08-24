/* ============================================================
   services-gallery.js
   PART 1
   ============================================================ */

let currentGalleryImages = [];
let currentGalleryIndex = 0;
let currentService = null;

let touchStartX = 0;
let touchEndX = 0;

let zoomed = false;

/* ============================================================
   OPEN GALLERY
============================================================ */

function openGallery(serviceId) {

    currentService = allServices.find(s => s._id === serviceId);

    if (!currentService) return;

    currentGalleryImages =
        Array.isArray(currentService.images) &&
        currentService.images.length
            ? currentService.images
            : currentService.image
            ? [currentService.image]
            : [];

    currentGalleryIndex = 0;

    buildGallery();
}

/* ============================================================
   BUILD MODAL
============================================================ */

function buildGallery() {

    closeGallery();

    const modal = document.createElement("div");
    modal.id = "galleryModal";

    modal.innerHTML = `

<div class="gallery-overlay">

<div class="gallery-box">

<button class="gallery-close" onclick="closeGallery()">
✕
</button>

<button class="gallery-arrow left"
onclick="prevGalleryImage()">

❮

</button>

<div class="gallery-center">

<img
id="galleryImage"
src="${galleryImage(currentGalleryIndex)}"
/>

<div
class="gallery-counter"
id="galleryCounter">

${currentGalleryIndex + 1}
/
${currentGalleryImages.length}

</div>

</div>

<button
class="gallery-arrow right"
onclick="nextGalleryImage()">

❯

</button>

</div>

<div
class="gallery-thumbs"
id="galleryThumbs">

${renderThumbs()}

</div>

<div
class="gallery-dots"
id="galleryDots">

${renderDots()}

</div>

</div>

`;

    document.body.appendChild(modal);

    registerGalleryEvents();

    preloadImages();

}

/* ============================================================
   IMAGE PATH
============================================================ */

function galleryImage(index) {

    if (!currentGalleryImages[index])
        return "";

    const img = currentGalleryImages[index];

    if (img.startsWith("http"))
        return img;

    return "https://quickconnect-api-m617.onrender.com" + img;

}

/* ============================================================
   THUMBNAILS
============================================================ */

function renderThumbs() {

    return currentGalleryImages.map((img,index)=>`

<img

src="${galleryImage(index)}"

class="gallery-thumb
${index===currentGalleryIndex?'active':''}"

onclick="goToGalleryImage(${index})"

>

`).join("");

}

/* ============================================================
   DOTS
============================================================ */

function renderDots(){

    return currentGalleryImages.map((x,index)=>`

<span

class="gallery-dot
${index===currentGalleryIndex?'active':''}"

onclick="goToGalleryImage(${index})">

</span>

`).join("");

}

/* ============================================================
   UPDATE VIEW
============================================================ */

function updateGallery(){

    const image =
        document.getElementById("galleryImage");

    image.src =
        galleryImage(currentGalleryIndex);

    document.getElementById(
        "galleryCounter"
    ).innerHTML =

    `${currentGalleryIndex+1}
    /
    ${currentGalleryImages.length}`;

    document.getElementById(
        "galleryThumbs"
    ).innerHTML = renderThumbs();

    document.getElementById(
        "galleryDots"
    ).innerHTML = renderDots();

    zoomed=false;

    image.style.transform="scale(1)";

    preloadImages();

}

/* ============================================================
   NEXT
============================================================ */

function nextGalleryImage(){

    if(
        currentGalleryIndex
        <
        currentGalleryImages.length-1
    ){

        currentGalleryIndex++;

    }else{

        currentGalleryIndex=0;

    }

    updateGallery();

}

/* ============================================================
   PREVIOUS
============================================================ */

function prevGalleryImage(){

    if(currentGalleryIndex>0){

        currentGalleryIndex--;

    }else{

        currentGalleryIndex=
        currentGalleryImages.length-1;

    }

    updateGallery();

}

/* ============================================================
   GO TO IMAGE
============================================================ */

function goToGalleryImage(index){

    currentGalleryIndex=index;

    updateGallery();

}

/* ============================================================
   CLOSE
============================================================ */

function closeGallery(){

    document
    .getElementById("galleryModal")
    ?.remove();

}
/* ============================================================
   PART 2
   CONTINUES DIRECTLY AFTER PART 1
============================================================ */

/* ============================================================
   EVENTS
============================================================ */

function registerGalleryEvents() {

    const img = document.getElementById("galleryImage");

    if (!img) return;

    /* ---------- Double Click Zoom ---------- */

    img.ondblclick = () => {

        zoomed = !zoomed;

        img.style.transform = zoomed
            ? "scale(2)"
            : "scale(1)";

    };

    /* ---------- Double Tap Zoom ---------- */

    let lastTap = 0;

    img.addEventListener("touchend", e => {

        const now = Date.now();

        if (now - lastTap < 300) {

            zoomed = !zoomed;

            img.style.transform = zoomed
                ? "scale(2)"
                : "scale(1)";

            e.preventDefault();

        }

        lastTap = now;

    });

    /* ---------- Swipe ---------- */

    img.addEventListener("touchstart", e => {

        touchStartX = e.changedTouches[0].clientX;

    });

    img.addEventListener("touchend", e => {

        touchEndX = e.changedTouches[0].clientX;

        handleSwipe();

    });

}

/* ============================================================
   HANDLE SWIPE
============================================================ */

function handleSwipe() {

    const distance = touchStartX - touchEndX;

    if (Math.abs(distance) < 50) return;

    if (distance > 0) {

        nextGalleryImage();

    } else {

        prevGalleryImage();

    }

}

/* ============================================================
   KEYBOARD SUPPORT
============================================================ */

document.addEventListener("keydown", e => {

    if (!document.getElementById("galleryModal"))
        return;

    if (e.key === "ArrowRight")
        nextGalleryImage();

    if (e.key === "ArrowLeft")
        prevGalleryImage();

    if (e.key === "Escape")
        closeGallery();

});

/* ============================================================
   PRELOAD IMAGES
============================================================ */

function preloadImages() {

    if (!currentGalleryImages.length)
        return;

    const next =
        (currentGalleryIndex + 1) %
        currentGalleryImages.length;

    const prev =
        currentGalleryIndex === 0
            ? currentGalleryImages.length - 1
            : currentGalleryIndex - 1;

    [next, prev].forEach(i => {

        const preload = new Image();

        preload.src = galleryImage(i);

    });

}

/* ============================================================
   OPEN GALLERY FROM CARD
============================================================ */

function galleryButton(serviceId){

    openGallery(serviceId);

}

/* ============================================================
   USE THIS HTML INSIDE renderServices()

REPLACE:

<img src="${getServiceImage(s)}" alt="${s.name}">

WITH:

<div class="service-gallery-preview">

<img
src="${getServiceImage(s)}"
alt="${s.name}"
onclick="openGallery('${s._id}')">

${Array.isArray(s.images) && s.images.length > 1
? `
<div class="gallery-preview-count">
<i class="fa-solid fa-images"></i>
${s.images.length}
</div>
`
: ""}

</div>

============================================================ */

/* ============================================================
   OPTIONAL:
   SHOW THUMBNAILS UNDER EACH CARD

<div class="thumb-strip">

${
(Array.isArray(s.images)?s.images:[])
.slice(0,4)
.map(img=>`

<img

src="${
img.startsWith("http")
? img
: "https://quickconnect-api-m617.onrender.com"+img
}"

onclick="openGallery('${s._id}')"

>

`).join("")
}

</div>

============================================================ */