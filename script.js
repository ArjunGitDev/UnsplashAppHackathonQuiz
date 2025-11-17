const ACCESS_KEY = "azxC7gJDxRQ8ChWOzJqTFDeOHJK-k0MWBPIU6bK__RI";

let currentPage = 1;
let totalPages = 1;
let currentQuery = "";
let currentView = "grid";
let favorites = [];
let favoritePhotos = [];

function setCookie(name, value, days = 365) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function saveFavorites() {
  setCookie('unsplash_favorites', JSON.stringify(favorites));
  setCookie('unsplash_favorite_photos', JSON.stringify(favoritePhotos));
  updateFavoritesCount();
}

function loadFavorites() {
  const savedFavorites = getCookie('unsplash_favorites');
  const savedPhotos = getCookie('unsplash_favorite_photos');

  if (savedFavorites) {
    try {
      favorites = JSON.parse(savedFavorites);
    } catch (e) {
      favorites = [];
    }
  }

  if (savedPhotos) {
    try {
      favoritePhotos = JSON.parse(savedPhotos);
    } catch (e) {
      favoritePhotos = [];
    }
  }

  updateFavoritesCount();
}

function updateFavoritesCount() {
  const countElement = document.getElementById('favoritesCount');
  const totalElement = document.getElementById('totalFavorites');
  const lastAddedElement = document.getElementById('lastAdded');

  countElement.textContent = favorites.length;
  totalElement.textContent = favorites.length;

  if (favorites.length > 0 && favoritePhotos.length > 0) {
    const lastPhoto = favoritePhotos[favoritePhotos.length - 1];
    if (lastPhoto && lastPhoto.addedDate) {
      const date = new Date(lastPhoto.addedDate);
      lastAddedElement.textContent = date.toLocaleDateString();
    }
  } else {
    lastAddedElement.textContent = 'Never';
  }
}

const grid = document.getElementById("grid");
const favoritesGrid = document.getElementById("favoritesGrid");
const pagination = document.getElementById("pagination");
const resultsInfo = document.getElementById("resultsInfo");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");
const emptyFavorites = document.getElementById("emptyFavorites");

document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    switchTab(tabName);
  });
});

function switchTab(tabName) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`${tabName}Tab`).classList.add('active');

  if (tabName === 'favorites') {
    renderFavorites();
  }
}

function switchToExplore() {
  switchTab('explore');
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

document.querySelectorAll(".view-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".view-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentView = btn.dataset.view;
    grid.className = currentView;
    favoritesGrid.className = currentView;
  });
});

document.getElementById("filtersToggle").addEventListener("click", () => {
  const content = document.getElementById("filtersContent");
  const icon = document.getElementById("toggleIcon");
  content.classList.toggle("collapsed");
  icon.textContent = content.classList.contains("collapsed") ? "▶" : "▼";
});

["orientationFilter", "colorFilter", "sortFilter", "perPageFilter"].forEach(id => {
  document.getElementById(id).addEventListener("change", () => {
    if (currentQuery) performSearch();
  });
});

document.getElementById("clearFavoritesBtn").addEventListener("click", () => {
  if (favorites.length === 0) {
    showToast("No favorites to clear");
    return;
  }

  if (confirm(`Are you sure you want to clear all ${favorites.length} favorites?`)) {
    favorites = [];
    favoritePhotos = [];
    saveFavorites();
    renderFavorites();
    showToast("✅ All favorites cleared");
  }
});

document.getElementById("modalClose").addEventListener("click", closeModal);
modal.addEventListener("click", e => {
  if (e.target === modal) closeModal();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

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

  const orientation = document.getElementById("orientationFilter").value;
  const color = document.getElementById("colorFilter").value;
  const orderBy = document.getElementById("sortFilter").value;
  const perPage = document.getElementById("perPageFilter").value;

  let url = `https:
  if (orientation) url += `&orientation=${orientation}`;
  if (color) url += `&color=${color}`;
  if (orderBy) url += `&order_by=${orderBy}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${ACCESS_KEY}` }
    });

    const data = await res.json();
    totalPages = data.total_pages;

    renderImages(data.results);
    renderPagination();
    updateResultsInfo(data.total, perPage);
  } catch (error) {
    showToast("Error fetching images. Please try again.");
    console.error(error);
  }
}

async function getRandomPhotos() {
  showLoading();

  try {
    const res = await fetch(`https:
      headers: { Authorization: `Client-ID ${ACCESS_KEY}` }
    });

    const data = await res.json();
    currentQuery = "random";
    currentPage = 1;
    totalPages = 1;

    renderImages(data);
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

  item.querySelector(".fullscreen-btn").addEventListener("click", e => {
    e.stopPropagation();
    openImageModal(photo);
  });

  item.querySelector(".download-btn").addEventListener("click", e => {
    e.stopPropagation();
    downloadImage(photo);
  });

  item.querySelector(".info-btn").addEventListener("click", e => {
    e.stopPropagation();
    openInfoModal(photo);
  });

  item.querySelector(".favorite-btn").addEventListener("click", e => {
    e.stopPropagation();
    toggleFavorite(photo, e.currentTarget);
  });

  item.querySelector("img").addEventListener("click", () => openImageModal(photo));

  return item;
}

function renderFavorites() {
  if (favorites.length === 0) {
    favoritesGrid.innerHTML = '';
    emptyFavorites.classList.add('show');
    return;
  }

  emptyFavorites.classList.remove('show');
  favoritesGrid.innerHTML = "";

  favoritePhotos.forEach(photo => {
    const item = createPhotoItem(photo);
    favoritesGrid.appendChild(item);
  });
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
  resultsInfo.textContent = `Showing ${start}-${end} of ${total.toLocaleString()} results`;
}

function openImageModal(photo) {
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
      <button class="btn" onclick="downloadImageFromModal('${photo.id}')" style="flex: 1;">
        <span>⬇ Download</span>
      </button>
      <button class="btn" onclick="window.open('${photo.links.html}?utm_source=glassy_app&utm_medium=referral', '_blank')" style="flex: 1; background: linear-gradient(135deg, var(--secondary), var(--accent));">
        <span>🔗 View on Unsplash</span>
      </button>
    </div>
  `;
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
    if (photo.links.download_location) {
      await fetch(photo.links.download_location, {
        headers: { Authorization: `Client-ID ${ACCESS_KEY}` }
      });
    }

    const response = await fetch(photo.urls.full);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
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

function downloadImageFromModal(photoId) {
  const photo = favoritePhotos.find(p => p.id === photoId);
  if (photo) {
    downloadImage(photo);
  }
}

function toggleFavorite(photo, btn) {
  const index = favorites.indexOf(photo.id);
  if (index > -1) {
    favorites.splice(index, 1);
    const photoIndex = favoritePhotos.findIndex(p => p.id === photo.id);
    if (photoIndex > -1) {
      favoritePhotos.splice(photoIndex, 1);
    }
    btn.textContent = "🤍";
    btn.classList.remove('active');
    showToast("Removed from favorites");
  } else {
    favorites.push(photo.id);
    photo.addedDate = new Date().toISOString();
    favoritePhotos.push(photo);
    btn.textContent = "❤️";
    btn.classList.add('active');
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

window.addEventListener("load", () => {
  loadFavorites();
  showToast("🌟 Welcome! Try searching or click Random for inspiration");
});
