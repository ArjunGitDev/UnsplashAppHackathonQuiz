const ACCESS_KEY = "azxC7gJDxRQ8ChWOzJqTFDeOHJK-k0MWBPIU6bK__RI";

let currentPage = 1;
let totalPages = 1;
let currentQuery = "";
let currentView = "grid";
let favorites = [];

const grid = document.getElementById("grid");
const pagination = document.getElementById("pagination");
const resultsInfo = document.getElementById("resultsInfo");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");

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
    document.getElementById(id).addEventListener("change", () => {
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

window.addEventListener("load", () => showToast("🌟 Welcome! Try searching or click Random for inspiration"));

