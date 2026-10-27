// دکمه‌ی منو رو به پنلش وصل می‌کنیم تا باز و بسته شدنش رو درست اعلام کنه
const menuToggle = document.querySelector(".menu-toggle");
const menuPanel = document.querySelector(".menu-panel");
const menuBackdrop = document.querySelector(".menu-backdrop");

function setMenuOpen(isOpen, returnFocus = false) {
	menuToggle.setAttribute("aria-expanded", String(isOpen));
	menuPanel.hidden = !isOpen;
	menuBackdrop.hidden = !isOpen;

	if (isOpen) {
		menuPanel.querySelector("a")?.focus();
	} else if (returnFocus) {
		menuToggle.focus();
	}
}

menuToggle.addEventListener("click", () => {
	setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
});

menuBackdrop.addEventListener("click", () => setMenuOpen(false, true));
menuPanel.addEventListener("click", (event) => {
	if (event.target instanceof Element && event.target.closest("a")) {
		setMenuOpen(false);
	}
});

document.addEventListener("keydown", (event) => {
	if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
		setMenuOpen(false, true);
	}
});

// اسلایدر رو بدون کتابخونه راه می‌اندازیم که صفحه توی اجرای مستقیم هم بالا بیاد
const carousel = document.querySelector("#featured-carousel");
const slides = [...carousel.querySelectorAll(".feature-slide")];
const slideDots = [...document.querySelectorAll("[data-slide-target]")];
const previousSlideButton = document.querySelector(".stage-arrow-previous");
const nextSlideButton = document.querySelector(".stage-arrow-next");
const autoplayToggle = document.querySelector(".autoplay-toggle");
const playbackIcon = document.querySelector(".playback-icon");
const slideCount = document.querySelector(".slide-count");
const upNextList = document.querySelector(".up-next-list");
const recommendationItems = [...upNextList.querySelectorAll("li")];
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let activeSlideIndex = 0;
let autoplayTimer;
let autoplayAllowed = !prefersReducedMotion;

function updateAutoplayControl(isRunning) {
	autoplayToggle.setAttribute(
		"aria-label",
		isRunning ? "Pause automatic slideshow" : "Play automatic slideshow"
	);
	autoplayToggle.title = isRunning ? "Pause slideshow" : "Play slideshow";
	playbackIcon.textContent = isRunning ? "Ⅱ" : "▶";
}

// سه فیلم بعدی رو با توجه به اسلاید فعلی می‌چینیم
function updateRecommendations() {
	recommendationItems.forEach((item) => {
		item.hidden = true;
	});

	for (let distance = 1; distance < slides.length; distance += 1) {
		const upcomingIndex = (activeSlideIndex + distance) % slides.length;
		const upcomingItem = recommendationItems.find((item) => {
			return Number(item.querySelector("[data-slide-to]").dataset.slideTo) === upcomingIndex;
		});

		if (upcomingItem) {
			upcomingItem.hidden = false;
			upNextList.append(upcomingItem);
		}
	}
}

function showSlide(index) {
	activeSlideIndex = (index + slides.length) % slides.length;

	slides.forEach((slide, slideIndex) => {
		const isActive = slideIndex === activeSlideIndex;
		slide.classList.toggle("is-active", isActive);
		slide.setAttribute("aria-hidden", String(!isActive));
		slide.inert = !isActive;
	});

	slideDots.forEach((dot, dotIndex) => {
		const isActive = dotIndex === activeSlideIndex;
		dot.classList.toggle("is-active", isActive);

		if (isActive) {
			dot.setAttribute("aria-current", "true");
		} else {
			dot.removeAttribute("aria-current");
		}
	});

	slideCount.textContent = `${String(activeSlideIndex + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
	updateRecommendations();
}

function startAutoplay() {
	if (!autoplayAllowed || slides.length < 2 || autoplayTimer) {
		return;
	}

	autoplayTimer = window.setInterval(() => showSlide(activeSlideIndex + 1), 6500);
	updateAutoplayControl(true);
}

function stopAutoplay() {
	window.clearInterval(autoplayTimer);
	autoplayTimer = undefined;
	updateAutoplayControl(false);
}

previousSlideButton.addEventListener("click", () => showSlide(activeSlideIndex - 1));
nextSlideButton.addEventListener("click", () => showSlide(activeSlideIndex + 1));
slideDots.forEach((dot) => {
	dot.addEventListener("click", () => showSlide(Number(dot.dataset.slideTarget)));
});

upNextList.addEventListener("click", (event) => {
	const recommendation = event.target.closest("[data-slide-to]");
	if (recommendation) {
		showSlide(Number(recommendation.dataset.slideTo));
	}
});

autoplayToggle.addEventListener("click", () => {
	if (autoplayTimer) {
		autoplayAllowed = false;
		stopAutoplay();
	} else {
		autoplayAllowed = true;
		startAutoplay();
	}
});

carousel.addEventListener("mouseenter", stopAutoplay);
carousel.addEventListener("mouseleave", startAutoplay);
showSlide(0);
if (autoplayAllowed) {
	startAutoplay();
} else {
	updateAutoplayControl(false);
}

// واچ‌لیست رو توی همین مرورگر نگه می‌داریم تا دفعه‌ی بعد هم سر جاش باشه
const watchlistStorageKey = "imdb-project-watchlist";
let watchlistIds = new Set();

try {
	watchlistIds = new Set(JSON.parse(localStorage.getItem(watchlistStorageKey) || "[]"));
} catch (error) {
	console.error("واچ‌لیست ذخیره‌شده خوانده نشد.", error);
}

const movieGrid = document.querySelector(".movie-grid");
const movieCards = [...movieGrid.querySelectorAll(".movie-card")];
const movieSearch = document.querySelector("#movie-filter");
const genreFilter = document.querySelector("#genre-filter");
const movieSort = document.querySelector("#movie-sort");
const watchlistFilter = document.querySelector(".watchlist-filter");
const movieResults = document.querySelector(".movie-results");
const siteSearchForm = document.querySelector(".search-form");
const siteSearchInput = document.querySelector("#site-search");
const searchCategory = document.querySelector("#search-category");
const headerWatchlistLink = document.querySelector(".watchlist-link");
const personCards = [...document.querySelectorAll(".person-card")];
let watchlistOnly = false;

function getMovieId(card) {
	return card.querySelector(".movie-poster").dataset.movieId;
}

function updateWatchlistButtons() {
	movieCards.forEach((card) => {
		const button = card.querySelector(".card-watchlist-toggle");
		const isSaved = watchlistIds.has(getMovieId(card));
		button.setAttribute("aria-pressed", String(isSaved));
		button.textContent = isSaved ? "✓ In Watchlist" : "＋ Add to Watchlist";
	});
}

function renderMovies() {
	const query = movieSearch.value.trim().toLocaleLowerCase();
	const selectedGenre = genreFilter.value;
	const sortedCards = [...movieCards];
	let visibleRank = 0;

	sortedCards.sort((first, second) => {
		if (movieSort.value === "newest") {
			return Number(second.querySelector(".movie-year").textContent) -
				Number(first.querySelector(".movie-year").textContent);
		}
		if (movieSort.value === "title") {
			return first.querySelector("h3").textContent.localeCompare(second.querySelector("h3").textContent);
		}
		return Number(second.querySelector(".movie-rating").textContent.match(/[\d.]+/)[0]) -
			Number(first.querySelector(".movie-rating").textContent.match(/[\d.]+/)[0]);
	});

	sortedCards.forEach((card) => {
		const title = card.querySelector("h3").textContent.toLocaleLowerCase();
		const genres = card.querySelector(".movie-genre").textContent.toLocaleLowerCase();
		const matchesQuery = !query || title.includes(query) || genres.includes(query);
		const matchesGenre = selectedGenre === "all" || genres.includes(selectedGenre);
		const matchesWatchlist = !watchlistOnly || watchlistIds.has(getMovieId(card));
		const isVisible = matchesQuery && matchesGenre && matchesWatchlist;
		card.hidden = !isVisible;
		card.querySelector(".movie-rank").textContent = isVisible
			? String(++visibleRank).padStart(2, "0")
			: "--";
		movieGrid.append(card);
	});

	const visibleCount = visibleRank;
	movieResults.textContent = visibleCount
		? `${visibleCount} ${visibleCount === 1 ? "title" : "titles"}`
		: "No titles match your filters.";
}

function renderPeople(query = "") {
	const normalizedQuery = query.trim().toLocaleLowerCase();
	personCards.forEach((card) => {
		card.hidden = Boolean(normalizedQuery) &&
			!card.dataset.personName.includes(normalizedQuery);
	});
}

siteSearchForm.addEventListener("submit", (event) => {
	event.preventDefault();
	const query = siteSearchInput.value.trim();

	movieSearch.value = searchCategory.value === "people" ? "" : query;
	renderMovies();

	renderPeople(searchCategory.value === "movies" ? "" : query);

	document.querySelector(searchCategory.value === "people" ? "#people-heading" : "#movie-picks")
		.scrollIntoView({ behavior: "smooth", block: "start" });
});

headerWatchlistLink.addEventListener("click", () => {
	watchlistOnly = true;
	watchlistFilter.setAttribute("aria-pressed", "true");
	watchlistFilter.classList.add("is-active");
	renderMovies();
});

movieSearch.addEventListener("input", renderMovies);
genreFilter.addEventListener("change", renderMovies);
movieSort.addEventListener("change", renderMovies);

movieGrid.addEventListener("click", (event) => {
	const button = event.target.closest(".card-watchlist-toggle");
	if (!button) {
		return;
	}

	const movieId = getMovieId(button.closest(".movie-card"));
	if (watchlistIds.has(movieId)) {
		watchlistIds.delete(movieId);
	} else {
		watchlistIds.add(movieId);
	}

	try {
		localStorage.setItem(watchlistStorageKey, JSON.stringify([...watchlistIds]));
	} catch (error) {
		console.error("واچ‌لیست در مرورگر ذخیره نشد.", error);
	}

	updateWatchlistButtons();
	renderMovies();
});

watchlistFilter.addEventListener("click", () => {
	watchlistOnly = !watchlistOnly;
	watchlistFilter.setAttribute("aria-pressed", String(watchlistOnly));
	watchlistFilter.classList.toggle("is-active", watchlistOnly);
	renderMovies();
});

updateWatchlistButtons();
renderMovies();

// طول میله‌ها رو از روی بودجه‌ی هر فیلم می‌سازیم تا مقایسه راحت‌تر باشه
const budgetRows = [...document.querySelectorAll(".budget-row")];
const highestBudget = Math.max(...budgetRows.map((row) => Number(row.dataset.budget)));

budgetRows.forEach((row) => {
	const budget = Number(row.dataset.budget);
	row.querySelector(".budget-bar").style.setProperty(
		"--budget-width",
		`${(budget / highestBudget) * 100}%`
	);
	row.setAttribute("aria-label", `${row.querySelector(".budget-label span").textContent}: $${budget} million`);
});
