const ACCESS_KEY = "azxC7gJDxRQ8ChWOzJqTFDeOHJK-k0MWBPIU6bK__RI";

let currentPage = 1;
let totalPages = 1;
let currentQuery = "";
let currentView = "grid";

let favorites = [];          
let favoritePhotos = [];     
let lastModalPhoto = null;   

const grid = document.getElementById("grid");
const pagination = document.getElementById("pagination");
const resultsInfo = document.getElementById("resultsInfo");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");

function setCookie(name, value, days = 365) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");

  for (let c of ca) {
    c = c.trim();
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length));
    }
  }
  return null;
}

function saveFavorites() {
  setCookie("unsplash_favorites", JSON.stringify(favorites));
  setCookie("unsplash_favorite_photos", JSON.stringify(favoritePhotos));
  updateFavoritesCount();
}

function loadFavorites() {
  try {
    favorites = JSON.parse(getCookie("unsplash_favorites")) || [];
  } catch {
    favorites = [];
  }

  try {
    favoritePhotos = JSON.parse(getCookie("unsplash_favorite_photos")) || [];
  } catch {
    favoritePhotos = [];
  }

  updateFavoritesCount();
}

function updateFavoritesCount() {
  const count = document.getElementById("favoritesCount");
  if (count) count.textContent = favorites.length;

  const total = document.getElementById("totalFavorites");
  if (total) total.textContent = favorites.length;

  const lastAdded = document.getElementById("lastAdded");
  if (lastAdded) {
    if (favoritePhotos.length === 0) {
      lastAdded.textContent = "Never";
    } else {
      const date = favoritePhotos[favoritePhotos.length - 1].addedDate;
      lastAdded.textContent = date
        ? new Date(date).toLocaleDateString()
        : "Unknown";
    }
  }
}

document.getElementById("searchBtn").addEventListener("click", performSearch);
document.getElementById("randomBtn").addEventListener("click", getRandomPhotos);

document.getElementById("searchInput").addEventListener("keypress", e => {
  if (e.key === "Enter") performSearch();
});

document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    document.getElementById("searchInput").value = chip.dataset.search;
    performSearch();
  });
});

async function performSearch() {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) return showToast("Enter a search term");

  currentQuery = query;
  currentPage = 1;

  await fetchAndRender();
}

async function fetchAndRender() {
  showLoading();

  const orientation = document.getElementById("orientationFilter").value;
  const color = document.getElementById("colorFilter").value;
  const sort = document.getElementById("sortFilter").value;
  const perPage = document.getElementById("perPageFilter").value || 30;

  let url = `https:

  if (orientation) url += `&orientation=${orientation}`;
  if (color) url += `&color=${color}`;
  if (sort) url += `&order_by=${sort}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${ACCESS_KEY}` }
    });

    if (!res.ok) throw new Error("API error");

    const data = await res.json();

    totalPages = data.total_pages || 1;
    renderImages(data.results);
    renderPagination();
    updateResultsInfo(data.total, perPage);

  } catch (err) {
    showToast("Error loading images");
    console.error(err);
  }
}

async function getRandomPhotos() {
  showLoading();

  try {
    const res = await fetch(
      `https:
      { headers: { Authorization: `Client-ID ${ACCESS_KEY}` } }
    );

    if (!res.ok) throw new Error("API error");

    const data = await res.json();

    currentQuery = "random";
    totalPages = 1;
    pagination.style.display = "none";

    renderImages(data);
    updateResultsInfo(30, 30);

  } catch (err) {
    showToast("Random load failed");
  }
}

function renderImages(photos) {
  grid.innerHTML = "";

  if (!photos || photos.length === 0) {
    grid.innerHTML = `<div class="loading"><h3>No images found</h3></div>`;
    return;
  }

  photos.forEach(photo => grid.appendChild(createPhotoItem(photo)));
}

function createPhotoItem(photo) {
  const item = document.createElement("div");
  item.className = "grid-item";

  const isFav = favorites.includes(photo.id);

  item.innerHTML = `
    <img src="${photo.urls.small}" loading="lazy">
    <div class="image-overlay">
      <div class="photographer">📸 ${photo.user.name}</div>
    </div>
    <div class="action-buttons">
      <button class="icon-btn favorite-btn ${isFav ? "active" : ""}">
        ${isFav ? "❤️" : "🤍"}
      </button>
      <button class="icon-btn fullscreen-btn">⛶</button>
      <button class="icon-btn download-btn">⬇</button>
      <button class="icon-btn info-btn">ℹ️</button>
    </div>
  `;

  item.querySelector("img").addEventListener("click", () => openImageModal(photo));
  item.querySelector(".fullscreen-btn").addEventListener("click", () => openImageModal(photo));
  item.querySelector(".download-btn").addEventListener("click", () => downloadImage(photo));
  item.querySelector(".info-btn").addEventListener("click", () => openImageModal(photo));

  item.querySelector(".favorite-btn").addEventListener("click", e => {
    toggleFavorite(photo, e.target);
  });

  return item;
}

function renderPagination() {
  if (totalPages <= 1) {
    pagination.style.display = "none";
    return;
  }

  pagination.style.display = "flex";

  pagination.innerHTML = `
    <button class="page-btn" onclick="changePage(-1)" ${currentPage === 1 ? "disabled" : ""}>← Previous</button>
    <div class="page-info">Page ${currentPage} of ${totalPages}</div>
    <button class="page-btn" onclick="changePage(1)" ${currentPage === totalPages ? "disabled" : ""}>Next →</button>
  `;
}

function changePage(dir) {
  const newPage = currentPage + dir;

  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    fetchAndRender();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function updateResultsInfo(total, perPage) {
  const start = (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, total);
  resultsInfo.textContent = `Showing ${start}-${end} of ${total}`;
}

function toggleFavorite(photo, btn = null) {
  const id = photo.id;
  const index = favorites.indexOf(id);

  if (index !== -1) {
    favorites.splice(index, 1);
    favoritePhotos = favoritePhotos.filter(p => p.id !== id);

    if (btn) {
      btn.textContent = "🤍";
      btn.classList.remove("active");
    }

    showToast("Removed from favorites");
  } else {
    favorites.push(id);

    const copy = { ...photo, addedDate: new Date().toISOString() };
    favoritePhotos.push(copy);

    if (btn) {
      btn.textContent = "❤️";
      btn.classList.add("active");
    }

    showToast("Added to favorites");
  }

  saveFavorites();
}

function renderFavorites() {
  const grid = document.getElementById("favoritesGrid");
  const empty = document.getElementById("emptyFavorites");

  if (favoritePhotos.length === 0) {
    grid.style.display = "none";
    empty.style.display = "flex";
    return;
  }

  grid.style.display = "grid";
  empty.style.display = "none";
  grid.innerHTML = "";

  favoritePhotos.forEach(photo => {
    const item = document.createElement("div");
    item.className = "grid-item";

    item.innerHTML = `
      <img src="${photo.urls.small}">
      <div class="image-overlay"><div class="photographer">📸 ${photo.user.name}</div></div>
      <div class="action-buttons">
        <button class="icon-btn fullscreen-btn">⛶</button>
        <button class="icon-btn download-btn">⬇</button>
        <button class="icon-btn favorite-btn active">❤️</button>
      </div>
    `;

    item.querySelector(".fullscreen-btn").addEventListener("click", () => openImageModal(photo));
    item.querySelector(".download-btn").addEventListener("click", () => downloadImage(photo));
    item.querySelector(".favorite-btn").addEventListener("click", () => {
      toggleFavorite(photo);
      renderFavorites();
    });

    grid.appendChild(item);
  });
}

document.getElementById("clearFavoritesBtn").addEventListener("click", () => {
  if (confirm("Clear all favorites?")) {
    favorites = [];
    favoritePhotos = [];
    saveFavorites();
    renderFavorites();
  }
});

document.querySelectorAll(".nav-tab").forEach(tab => {
  tab.addEventListener("click", () => {

    document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    const target = tab.dataset.tab;

    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    document.getElementById(target + "Tab").classList.add("active");

    if (target === "favorites") renderFavorites();
  });
});

function openImageModal(photo) {
  lastModalPhoto = photo;

  modalBody.innerHTML = `
    <img class="modal-image" src="${photo.urls.regular}">
    <div class="info-section">
      <h4>${photo.description || photo.alt_description || "Untitled"}</h4>
      <div class="info-row"><span class="info-label">Photographer</span><span>${photo.user.name}</span></div>
      <div class="info-row"><span class="info-label">Dimensions</span><span>${photo.width} × ${photo.height}</span></div>
      <div class="info-row"><span class="info-label">Likes</span><span>❤️ ${photo.likes}</span></div>
      <div class="info-row"><span class="info-label">Created</span><span>${new Date(photo.created_at).toLocaleDateString()}</span></div>
    </div>
    <div class="modal-buttons">
      <button class="btn" id="modalDownloadBtn">⬇ Download</button>
      <button class="btn" id="modalViewBtn">🔗 View on Unsplash</button>
    </div>
  `;

  document.getElementById("modalDownloadBtn").addEventListener("click", () => downloadImage(photo));
  document.getElementById("modalViewBtn").addEventListener("click", () => {
    window.open(photo.links.html, "_blank");
  });

  modal.classList.add("show");
}

document.getElementById("modalClose").addEventListener("click", closeModal);
modal.addEventListener("click", e => {
  if (e.target === modal) closeModal();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

function closeModal() {
  modal.classList.remove("show");
}

async function downloadImage(photo) {
  try {

    if (photo.links.download_location) {
      fetch(photo.links.download_location, {
        headers: { Authorization: `Client-ID ${ACCESS_KEY}` }
      });
    }

    const res = await fetch(photo.urls.full);
    const blob = await res.blob();

    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `unsplash-${photo.id}.jpg`;
    a.click();
    URL.revokeObjectURL(url);

    showToast("Download started!");
  } catch (err) {
    showToast("Download failed");
  }
}

function showLoading() {
  grid.innerHTML = `<div class="loading"><div class="spinner"></div><h3>Loading...</h3></div>`;
}

function showToast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);

  setTimeout(() => {
    t.style.animation = "slideInRight 0.4s reverse";
    setTimeout(() => t.remove(), 400);
  }, 2500);
}

window.addEventListener("load", () => {
  loadFavorites();
  showToast("🌟 Welcome! Start exploring!");
});
