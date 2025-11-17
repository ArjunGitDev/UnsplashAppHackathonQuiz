<script>
const ACCESS_KEY = "azxC7gJDxRQ8ChWOzJqTFDeOHJK-k0MWBPIU6bK__RI";

let currentPage = 1;
let totalPages = 1;
let currentQuery = "";
let currentView = "grid";

// favorites: keep both id list (quick checks) and full photo objects (for download/modal/metadata)
let favorites = [];
let favoritePhotos = [];

let lastModalPhoto = null; // holds the photo object currently shown in modal

const grid = document.getElementById("grid");
const pagination = document.getElementById("pagination");
const resultsInfo = document.getElementById("resultsInfo");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");

// --- Cookie helpers ---
function setCookie(name, value, days = 365) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
  }
  return null;
}

function saveFavorites() {
  try {
    setCookie("unsplash_favorites", JSON.stringify(favorites));
    setCookie("unsplash_favorite_photos", JSON.stringify(favoritePhotos));
  } catch (e) {
    console.error("Failed to save favorites", e);
  }
  updateFavoritesCount();
}

function loadFavorites() {
  const savedFavorites = getCookie("unsplash_favorites");
  const savedPhotos = getCookie("unsplash_favorite_photos");

  if (savedFavorites) {
    try {
      favorites = JSON.parse(savedFavorites) || [];
    } catch (e) {
      favorites = [];
    }
  }

  if (savedPhotos) {
    try {
      favoritePhotos = JSON.parse(savedPhotos) || [];
    } catch (e) {
      favoritePhotos = [];
    }
  }

  updateFavoritesCount();
}

function updateFavoritesCount() {
  // Header counter element: <span id="favoritesCount"></span>
  const countElement = document.getElementById("favoritesCount");
  if (countElement) countElement.textContent = favorites.length;

  // Optional: if you have a totalFavorites or lastAdded element, update them
  const totalElement = document.getElementById("totalFavorites");
  if (totalElement) totalElement.textContent = favorites.length;

  const lastAddedElement = document.getElementById("lastAdded");
  if (lastAddedElement) {
    if (favoritePhotos.length > 0) {
      const lastPhoto = favoritePhotos[favoritePhotos.length - 1];
      if (lastPhoto && lastPhoto.addedDate) {
        lastAddedElement.textContent = new Date(lastPhoto.addedDate).toLocaleDateString();
      } else {
        lastAddedElement.textContent = "Unknown";
      }
    } else {
      lastAddedElement.textContent = "Never";
    }
  }
}

// --- UI Event wiring ---
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

document.querySelectorAll(".view-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".view-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentView = btn.dataset.view;
    grid.className = currentView;
  });
});

document.getElementById("filtersToggle").addEventListener("click", () => {
  const content = document.getElementById("filtersContent");
  const icon = document.getElementById("toggleIcon");
  content.classList.toggle("collapsed");
  icon.textContent = content.classList.contains("collapsed") ? "▶" : "▼";
});

["orientationFilter", "colorFilter", "sortFilter", "perPageFilter"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("change", () => {
    if (currentQuery) performSearch();
  });
});

document.getElementById("modalClose").addEventListener("click", closeModal);
modal.addEventListener("click", e => {
  if (e.target === modal) closeModal();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

// --- Main Functions ---
async function performSearch() {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) {
    showToast("Please enter a search term");
    return;
  }

  currentQuery = query;
  currentPage = 1;
  await fetchAndRender();
}

async function fetchAndRender() {
  showLoading();

  const orientationEl = document.getElementById("orientationFilter");
  const colorEl = document.getElementById("colorFilter");
  const orderEl = document.getElementById("sortFilter");
  const perPageEl = document.getElementById("perPageFilter");

  const orientation = orientationEl ? orientationEl.value : "";
  const color = colorEl ? colorEl.value : "";
  const orderBy = orderEl ? orderEl.value : "";
  const perPage = perPageEl ? perPageEl.value || 30 : 30;

  let url = `https://api.unsplash.com/search/photos?page=${currentPage}&query=${encodeURIComponent(currentQuery)}&per_page=${perPage}`;
  if (orientation) url += `&orientation=${orientation}`;
  if (color) url += `&color=${color}`;
  if (orderBy) url += `&order_by=${orderBy}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${ACCESS_KEY}` }
    });

    if (!res.ok) throw new Error(`Unsplash API error: ${res.status}`);

    const data = await res.json();
    totalPages = data.total_pages || 1;

    renderImages(data.results || []);
    renderPagination();
    updateResultsInfo(data.total || 0, Number(perPage));
  } catch (error) {
    showToast("Error fetching images. Please try again.");
    console.error(error);
  }
}

async function getRandomPhotos() {
  showLoading();

  try {
    const res = await fetch(`https://api.unsplash.com/photos/random?count=30`, {
      headers: { Authorization: `Client-ID ${ACCESS_KEY}` }
    });

    if (!res.ok) throw new Error(`Unsplash API error: ${res.status}`);

    const data = await res.json();
    currentQuery = "random";
    currentPage = 1;
    totalPages = 1;

    renderImages(data || []);
    pagination.style.display = "none";
    updateResultsInfo(30, 30);
    showToast("✨ Random photos loaded!");
  } catch (error) {
    showToast("Error fetching random images.");
    console.error(error);
  }
}

function renderImages(photos) {
  if (!photos || photos.length === 0) {
    grid.innerHTML = '<div class="loading"><h3>No images found</h3><p>Try a different search term</p></div>';
    return;
  }

  grid.innerHTML = "";

  photos.forEach(photo => {
    const item = createPhotoItem(photo);
    grid.appendChild(item);
  });
}

function createPhotoItem(photo) {
  const item = document.createElement("div");
  item.classList.add("grid-item");

  const isFavorite = favorites.includes(photo.id);

  item.innerHTML = `
    <img src="${photo.urls.small}" alt="${photo.alt_description || ''}" loading="lazy">
    <div class="image-overlay">
      <div class="photographer">📸 ${photo.user.name}</div>
      <div class="image-stats">
        <span>❤️ ${photo.likes}</span>
        <span>👁️ ${photo.views || 'N/A'}</span>
      </div>
    </div>
    <div class="action-buttons">
      <button class="icon-btn favorite-btn ${isFavorite ? 'active' : ''}" data-id="${photo.id}">${isFavorite ? '❤️' : '🤍'}</button>
      <button class="icon-btn fullscreen-btn">⛶</button>
      <button class="icon-btn download-btn">⬇</button>
      <button class="icon-btn info-btn">ℹ️</button>
    </div>
  `;

  // fullscreen / modal
  item.querySelector(".fullscreen-btn").addEventListener("click", e => {
    e.stopPropagation();
    openImageModal(photo);
  });

  // download
  item.querySelector(".download-btn").addEventListener("click", e => {
    e.stopPropagation();
    downloadImage(photo);
  });

  // info
  item.querySelector(".info-btn").addEventListener("click", e => {
    e.stopPropagation();
    openInfoModal(photo);
  });

  // favorite button (store full photo)
  item.querySelector(".favorite-btn").addEventListener("click", e => {
    e.stopPropagation();
    const btn = e.currentTarget;
    toggleFavorite(photo, btn);
  });

  // click on image opens modal
  item.querySelector("img").addEventListener("click", () => openImageModal(photo));

  return item;
}

function renderPagination() {
  if (totalPages <= 1) {
    pagination.style.display = "none";
    return;
  }

  pagination.style.display = "flex";
  pagination.innerHTML = `
    <button class="page-btn" onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>
      ← Previous
    </button>
    <div class="page-info">Page ${currentPage} of ${totalPages}</div>
    <button class="page-btn" onclick="changePage(1)" ${currentPage === totalPages ? 'disabled' : ''}>
      Next →
    </button>
  `;
}

function changePage(direction) {
  const newPage = currentPage + direction;
  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    fetchAndRender();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function updateResultsInfo(total, perPage) {
  const start = (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, total);
  resultsInfo.textContent = `Showing ${start}-${end} of ${Number(total).toLocaleString()} results`;
}

function openImageModal(photo) {
  lastModalPhoto = photo; // store current photo for modal download
  modalBody.innerHTML = `
    <img class="modal-image" src="${photo.urls.regular}" alt="${photo.alt_description || ''}">
    <div class="info-section">
      <h4>${photo.description || photo.alt_description || 'Untitled'}</h4>
      <div class="info-row">
        <span class="info-label">Photographer</span>
        <span class="info-value"><a href="${photo.user.links.html}?utm_source=glassy_app&utm_medium=referral" target="_blank" style="color: var(--primary-light);">${photo.user.name}</a></span>
      </div>
      <div class="info-row">
        <span class="info-label">Dimensions</span>
        <span class="info-value">${photo.width} × ${photo.height} px</span>
      </div>
      <div class="info-row">
        <span class="info-label">Likes</span>
        <span class="info-value">❤️ ${photo.likes}</span>
      </div>
      ${photo.location?.name ? `
      <div class="info-row">
        <span class="info-label">Location</span>
        <span class="info-value">📍 ${photo.location.name}</span>
      </div>
      ` : ''}
      <div class="info-row">
        <span class="info-label">Created</span>
        <span class="info-value">${new Date(photo.created_at).toLocaleDateString()}</span>
      </div>
    </div>
    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
      <button class="btn" id="modalDownloadBtn" style="flex: 1;">
        <span>⬇ Download</span>
      </button>
      <button class="btn" id="modalViewBtn" style="flex: 1; background: linear-gradient(135deg, var(--secondary), var(--accent));">
        <span>🔗 View on Unsplash</span>
      </button>
    </div>
  `;
  // attach listeners to modal buttons
  const downloadBtn = document.getElementById("modalDownloadBtn");
  if (downloadBtn) downloadBtn.addEventListener("click", () => {
    if (lastModalPhoto) downloadImage(lastModalPhoto);
  });

  const viewBtn = document.getElementById("modalViewBtn");
  if (viewBtn) viewBtn.addEventListener("click", () => {
    if (lastModalPhoto) window.open(`${lastModalPhoto.links.html}?utm_source=glassy_app&utm_medium=referral`, "_blank");
  });

  modal.classList.add("show");
}

function openInfoModal(photo) {
  openImageModal(photo);
}

function closeModal() {
  modal.classList.remove("show");
}

async function downloadImage(photo) {
  try {
    // Call download_location to register download with Unsplash (if available)
    if (photo.links && photo.links.download_location) {
      try {
        await fetch(photo.links.download_location, {
          headers: { Authorization: `Client-ID ${ACCESS_KEY}` }
        });
      } catch (e) {
        // Not critical if this fails; continue to fetch image
        console.warn("Failed to call download_location:", e);
      }
    }

    const response = await fetch(photo.urls.full);
    if (!response.ok) throw new Error("Failed to fetch full image");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unsplash-${photo.id}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showToast("✅ Image downloaded!");
  } catch (error) {
    showToast("❌ Download failed");
    console.error(error);
  }
}

// toggleFavorite now accepts a full photo object and the clicked button element
function toggleFavorite(photo, btn) {
  const id = photo.id;
  const index = favorites.indexOf(id);

  if (index > -1) {
    // remove
    favorites.splice(index, 1);
    const photoIndex = favoritePhotos.findIndex(p => p.id === id);
    if (photoIndex > -1) favoritePhotos.splice(photoIndex, 1);
    if (btn) {
      btn.textContent = "🤍";
      btn.classList.remove("active");
    }
    showToast("Removed from favorites");
  } else {
    // add
    favorites.push(id);
    // attach addedDate if not present
    const copy = Object.assign({}, photo);
    copy.addedDate = new Date().toISOString();
    favoritePhotos.push(copy);
    if (btn) {
      btn.textContent = "❤️";
      btn.classList.add("active");
    }
    showToast("❤️ Added to favorites");
  }

  saveFavorites();
}

function showLoading() {
  grid.innerHTML = '<div class="loading"><div class="spinner"></div><h3>Loading beautiful images...</h3></div>';
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideInRight 0.4s ease reverse";
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// --- Initial load ---
window.addEventListener("load", () => {
  loadFavorites();
  showToast("🌟 Welcome! Try searching or click Random for inspiration");
});
</script>
