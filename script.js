// ==========================================
// 1. Import Firebase v9 (Modular)
// ==========================================
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { serverTimestamp, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, deleteDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Config
const firebaseConfig = {
  apiKey: "AIzaSyCndWFEXXbbe6GF__SLTh9FjQ2VZNnk7Bg",
  authDomain: "animeluxe-9d719.firebaseapp.com",
  projectId: "animeluxe-9d719",
  storageBucket: "animeluxe-9d719.firebasestorage.app",
  messagingSenderId: "192136877400",
  appId: "1:192136877400:web:908f9e7e15fa9229f2012d",
  measurementId: "G-L4036GS9GY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let isLoginMode = true;

// ==========================================
// 2. Scurity
// ==========================================
/*
(function checkRequiredScript() {
    const requiredUrl = "https://tightslybella.com/67/a4/ae/67a4ae834810a0cdd163c164f9a6734c.js";
    
    const scriptExists = document.querySelector(`script[src="${requiredUrl}"]`);

    if (!scriptExists) {
        document.addEventListener("DOMContentLoaded", () => {
            document.body.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #000; color: #fff; font-family: sans-serif; text-align: center;">
                    <h2>Something went wrong please refresh this page.</h2>
                </div>
            `;
        });
    }
})();
 */
document.addEventListener('contextmenu', event => event.preventDefault());
document.onkeydown = function(e) {
    if (e.keyCode == 123 || 
       (e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)) || 
       (e.ctrlKey && e.shiftKey && e.keyCode == 'J'.charCodeAt(0)) || 
       (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0))) {
        window.location.href = "https://www.google.com";
        return false;
    }
};

setInterval(function() {
    const startTime = performance.now();
    debugger;
    const endTime = performance.now();
    if (endTime - startTime > 100) {
        window.location.href = "https://www.google.com";
    }
}, 1000);

document.body.classList.add('loading');
window.addEventListener('load', function() {
    document.body.classList.remove('loading');
    document.body.classList.add('loaded');
});

// ==========================================
// 3. Varibles Global
// ==========================================
let animeList = [];
let currentAnimeData = null;
let currentEpisodeData = null;

let homeAllAnime = [];
let homeVisibleCount = 18;
let genreFilteredAnime = [];
let genreVisibleCount = 18;
let currentSlide = 0;
let userBookmarks = [];

// ==========================================
// 4. Routing and Data
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('data.json');
        animeList = await response.json();
        
        const urlParams = new URLSearchParams(window.location.search);
        const page = urlParams.get('page');
        const id = urlParams.get('id');
        const ep = urlParams.get('ep');
        const searchQuery = urlParams.get('search');
        const playId = urlParams.get('play');
        const genreQuery = urlParams.get('genre');

        if (document.getElementById('app-content')) {
            if (page === 'player' && id) {
                const targetEp = ep ? parseInt(ep) : 1; 
                loadPlayer(id, targetEp); 
            } else if (playId) {
                loadPlayer(playId, 1);
            } else if (searchQuery) {
                document.getElementById('searchInput').value = searchQuery;
                executeSearch(searchQuery);
            } else if (page === 'bookmarks') { 
                setTimeout(() => { loadBookmarksPage(); }, 500);
            } else if (page === 'schedule') {
                renderSchedulePage();
            } else {
                loadHome();
            }
        } else if (document.getElementById('genres-content')) {
            generateGenresPage();
            
            if (genreQuery) {
                filterByGenreOnPage(genreQuery);
            } else {
                filterByGenreOnPage('All'); 
            }
        }
    } catch (error) {
        showNotification('Something went wrong please refresh the page', 'error');
    }
});

// ==========================================
// 5. Auth & Firebase Functions system
// ==========================================
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    const authButtons = document.getElementById('auth-buttons');
    const userProfile = document.getElementById('user-profile');
    const navBookmark = document.getElementById('nav-bookmark');

    if (user) {
        if(authButtons) authButtons.style.display = 'none';
        if(userProfile) userProfile.style.display = 'flex';
        const userEmailElem = document.getElementById('user-email');
        if(userEmailElem) userEmailElem.innerText = user.email.split('@')[0];
        if(navBookmark) navBookmark.style.display = 'block';

        try {
            const bookmarksRef = collection(db, 'users', user.uid, 'bookmarks');
            const snapshot = await getDocs(bookmarksRef);
            userBookmarks = snapshot.docs.map(doc => doc.data().animeId);
            updateAllBookmarkIcons();
            
            if(document.getElementById('history-section')) {
                renderContinueWatching(); 
            }

        } catch(e) { showNotification('Something went wrong please refresh the page', 'error'); }

    } else {
        if(authButtons) authButtons.style.display = 'flex';
        if(userProfile) userProfile.style.display = 'none';
        if(navBookmark) navBookmark.style.display = 'none';
        userBookmarks = [];
        updateAllBookmarkIcons();

        const historySec = document.getElementById('history-section');
        if(historySec) historySec.style.display = 'none';
    }
});

function updateAllBookmarkIcons() {
    document.querySelectorAll('.bookmark-btn').forEach(btn => {
        const animeId = btn.getAttribute('data-anime-id');
        const icon = btn.querySelector('i');
        if (!icon || !animeId) return;
        
        if (userBookmarks.includes(animeId)) {
            icon.className = 'fa-solid fa-bookmark';
            icon.style.color = 'var(--accent)';
        } else {
            icon.className = 'fa-regular fa-bookmark';
            icon.style.color = '';
        }
    });
}

let authMode = 'login';
function openAuthModal(mode) {
    authMode = mode; 
    const modal = document.getElementById('auth-modal');
    const title = document.getElementById('auth-title');
    const submitBtn = document.getElementById('auth-submit-btn');
    const switchText = document.getElementById('auth-switch-text');
    const passInput = document.getElementById('auth-password');
    const forgotLink = document.getElementById('forgot-pass-container');

    modal.style.display = 'flex';

    document.getElementById('auth-email').value = '';
    document.getElementById('auth-password').value = '';

    if (mode === 'login') {
        title.innerText = 'Login';
        passInput.style.display = 'block';
        passInput.required = true;
        forgotLink.style.display = 'block'; 
        submitBtn.innerText = 'Login';
        submitBtn.classList.remove('reset-mode'); 
        switchText.innerHTML = 'Don\'t have an account? <span onclick="openAuthModal(\'signup\')">Sign Up</span>';
        
    } else if (mode === 'signup') {
        title.innerText = 'Sign Up';
        passInput.style.display = 'block';
        passInput.required = true;
        forgotLink.style.display = 'none'
        submitBtn.innerText = 'Sign Up';
        submitBtn.classList.remove('reset-mode');
        switchText.innerHTML = 'Already have an account? <span onclick="openAuthModal(\'login\')">Login</span>';
        
    } else if (mode === 'reset') {
        title.innerText = 'Reset Password';
        passInput.style.display = 'none'; 
        passInput.required = false; 
        forgotLink.style.display = 'none';
        submitBtn.innerText = 'Send Reset Link';
        submitBtn.classList.add('reset-mode'); 
        switchText.innerHTML = 'Remember password? <span onclick="openAuthModal(\'login\')">Login</span>';
    }
}

function closeAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('auth-form').reset();
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    updateAuthUI();
}

function updateAuthUI() {
    document.getElementById('auth-title').innerText = isLoginMode ? 'Login' : 'Sign Up';
    document.getElementById('auth-submit-btn').innerText = isLoginMode ? 'Login' : 'Create Account';
    document.getElementById('auth-switch-text').innerHTML = isLoginMode 
        ? "Don't have an account? <span>Sign Up</span>" 
        : "Already have an account? <span>Login</span>";
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const submitBtn = document.getElementById('auth-submit-btn');
    
    // Loading
    const originalText = submitBtn.innerText;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';

    try {
        if (authMode === 'login') {
            await signInWithEmailAndPassword(auth, email, password);
            showNotification("Login successful!", "success"); 
            closeAuthModal();
        } else if (authMode === 'signup') {
            await createUserWithEmailAndPassword(auth, email, password);
            showNotification("Account created successfully!", "success");
            closeAuthModal();
        } else if (authMode === 'reset') {
            if (!email) {
                throw { code: 'no-email' }; 
            }
            await sendPasswordResetEmail(auth, email);
            showNotification("Reset link sent! Please check your email.", "success");
            openAuthModal('login');
        }
    } catch (error) {
        showNotification('Something went wrong please refresh the page', 'error'); 
        
        let errorMsg = "Something went wrong. Please try again.";
        
        if(error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') errorMsg = "Invalid email or password.";
        if(error.code === 'auth/email-already-in-use') errorMsg = "This email is already in use.";
        if(error.code === 'auth/weak-password') errorMsg = "Password should be at least 6 characters.";
        if(error.code === 'auth/missing-email' || error.code === 'no-email') errorMsg = "Please enter your email address.";
        if(error.code === 'auth/invalid-email') errorMsg = "Invalid email format.";
        
        showNotification(errorMsg, "error");
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
    }
}

async function handleLogout() {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        showNotification('Something went wrong please refresh the page', 'error');
    }
}
async function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    
    if (!email) {
        showNotification("Please enter your email address", "error");
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        showNotification("Password reset email sent! Please check your inbox.", "success");
    } catch (error) {
        showNotification("Email not found in our system or an error occurred", "error");
    }
}
// ==========================================
// 6.Bookmarks system
// ==========================================
async function handleBookmark(event, animeId) {
    event.stopPropagation();
    
    if (!currentUser) {
        openAuthModal('login');
        return;
    }

    const button = event.currentTarget;
    const icon = button ? button.querySelector('i') : null;

    if (button.disabled) return;

    let isCurrentlyBookmarked = false;
    
    if (icon) {
        isCurrentlyBookmarked = icon.classList.contains('fa-solid') && !icon.classList.contains('fa-spinner');

        icon.className = 'fa-solid fa-spinner fa-spin';
        icon.style.color = '#888'; 

        button.disabled = true;
        button.style.pointerEvents = 'none';
    }

    try {
        const bookmarkRef = doc(db, 'users', currentUser.uid, 'bookmarks', animeId);
        const docSnap = await getDoc(bookmarkRef);

        if (docSnap.exists()) {
            await deleteDoc(bookmarkRef);
            userBookmarks = userBookmarks.filter(id => id !== animeId);
            if (icon) {
                icon.className = 'fa-regular fa-bookmark';
                icon.style.color = '';
            }
        } else {
            await setDoc(bookmarkRef, { animeId: animeId, addedAt: new Date() });
            if (!userBookmarks.includes(animeId)) userBookmarks.push(animeId);
            if (icon) {
                icon.className = 'fa-solid fa-bookmark';
                icon.style.color = 'var(--accent)'; 
            }
        }
    } catch (error) {
        showNotification('Something went wrong please refresh the page', 'error');

        if (icon) {
            icon.className = isCurrentlyBookmarked ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark';
            icon.style.color = isCurrentlyBookmarked ? 'var(--accent)' : '';
        }
        window.location.href = 'index.html';
        showNotification("An error occurred while updating bookmark. Now refreshing the page.", "error");
        
    } finally {
        if (button) {
            button.disabled = false;
            button.style.pointerEvents = 'auto';
        }
    }
}

async function loadBookmarksPage() {
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    showLoading();
    const app = document.getElementById('app-content');
    try {
        const bookmarksRef = collection(db, 'users', currentUser.uid, 'bookmarks');
        const snapshot = await getDocs(bookmarksRef);
        const bookmarkedIds = [];
        snapshot.forEach(doc => { bookmarkedIds.push(doc.data().animeId); });
        
        const bookmarkedAnime = animeList.filter(anime => bookmarkedIds.includes(anime.id));
        app.innerHTML = `
            <div style="padding-top: 20px;">
                <h2 class="section-title"><i class="fa-solid fa-bookmark"></i> My Bookmarks</h2>
                ${generateGridHTML(bookmarkedAnime)}
            </div>
        `;
        setTimeout(() => {
            document.querySelectorAll('.bookmark-btn i').forEach(icon => {
                icon.classList.replace('fa-regular', 'fa-solid');
                icon.style.color = 'var(--accent)';
            });
            hideLoading();
        }, 300);
    } catch (error) {
        showNotification('Something went wrong please refresh the page', 'error');
        hideLoading();
    }
}

// ==========================================
// 7. help function & UI
// ==========================================
function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if(overlay) { overlay.style.display = 'flex'; updateProgress(0); }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if(overlay) overlay.style.display = 'none';
}

function updateProgress(percentage) {
    const barFill = document.querySelector('.progress-bar-fill');
    const text = document.querySelector('.progress-text');
    if(barFill) barFill.style.width = percentage + '%';
    if(text) text.innerText = percentage + '% complete';
}

function waitForImages(container, callback) {
    const images = container.querySelectorAll('img');
    const totalImages = images.length;
    let loadedImages = 0;
    if (totalImages === 0) { callback(); return; }
    images.forEach(img => {
        img.onload = img.onerror = () => {
            loadedImages++;
            updateProgress(Math.round((loadedImages / totalImages) * 100));
            if (loadedImages === totalImages) callback();
        };
    });
}

function goToPlayer(animeId, epNum = 1) {
    window.location.href = `index.html?page=player&id=${animeId}&ep=${epNum}`;
}

function generateGridHTML(list) {
    let html = `<div class="anime-grid">`;
    if(list.length === 0) {
        html += `<p style="color: var(--text-muted);">No anime found.</p>`;
    } else {
        list.forEach(anime => {
            const quality = anime.quality || 'HD'; 

            const isBookmarked = typeof userBookmarks !== 'undefined' && userBookmarks.includes(anime.id);
            const iconClass = isBookmarked ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark';
            const iconColor = isBookmarked ? 'color: var(--accent);' : '';          

            html += `
                <div class="anime-card" onclick="goToPlayer('${anime.id}')">
                    <div class="anime-img-wrapper">
                        
                        <div class="quality-badge">${quality}</div>
                        <img src="${anime.image}" alt="${anime.title}" class="anime-img" >
                        <button class="bookmark-btn" data-anime-id="${anime.id}" onclick="handleBookmark(event, '${anime.id}')" title="Add to Bookmark">
                            <i class="${iconClass}" style="${iconColor}"></i>
                        </button>
                        <div class="anime-actions">
                            <button class="action-btn preview-btn" onclick="openPreview('${anime.id}', event)" title="Preview">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <div class="anime-info">
                        <h3>${anime.title}</h3>
                        <span>${anime.genres ? anime.genres.join(', ') : ''}</span>
                    </div>
                </div>
            `;
        });
    }
    html += `</div>`;
    return html;
}

function shuffleArray(array) {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function moveSlide(direction) {
    const slidesContainer = document.getElementById('banner-slides');
    if (!slidesContainer) return;
    const totalSlides = 3; 
    currentSlide += direction;
    if (currentSlide < 0) currentSlide = totalSlides - 1;
    if (currentSlide >= totalSlides) currentSlide = 0;
    slidesContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
}

// ==========================================
// 8. Home & Genres
// ==========================================
function loadHome() {
    showLoading();
    const app = document.getElementById('app-content');
    if(!app || animeList.length === 0) { hideLoading(); return; }

    const bannerAnimes = shuffleArray(animeList).slice(0, 3);
    let slidesHtml = '';
    bannerAnimes.forEach(anime => {
        slidesHtml += `
            <div class="banner-slide" style="background-image: url('${anime.banner || anime.image}');">
                <div class="banner-gradient"></div>
                <div class="banner-clean-content">
                    <h1 class="banner-title">${anime.title}</h1>
                    <p class="banner-synopsis">${anime.synopsis || 'No synopsis available.'}</p>
                    <button class="btn-watch-now" onclick="goToPlayer('${anime.id}')">
                        <i class="fa-solid fa-play"></i> Watch Now
                    </button>
                </div>
            </div>
        `;
    });

    const latestUpdates = [...animeList].reverse().slice(0, 6);
    homeAllAnime = shuffleArray(animeList);
    homeVisibleCount = 18;
    const initialAllAnime = homeAllAnime.slice(0, homeVisibleCount);

    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = `
        <div class="banner-carousel">
            <div class="banner-slides" id="banner-slides">
                ${slidesHtml}
            </div>
            <button class="slider-btn slider-prev" onclick="moveSlide(-1)"><i class="fa-solid fa-chevron-left"></i></button>
            <button class="slider-btn slider-next" onclick="moveSlide(1)"><i class="fa-solid fa-chevron-right"></i></button>
        </div>

        <div id="history-section" style="display: none;"></div>

        <h2 class="section-title">Latest Updates</h2>
        ${generateGridHTML(latestUpdates)}

        <h2 class="section-title" style="margin-top: 40px;">Explore Anime</h2>
        <div id="home-all-anime-container">
            ${generateGridHTML(initialAllAnime)}
        </div>
        ${homeAllAnime.length > homeVisibleCount ? `<button id="btn-load-more-home" class="load-more-btn" onclick="loadMoreHome()">Load More</button>` : ''}
    `;

    waitForImages(tempContainer, () => {
        app.innerHTML = tempContainer.innerHTML;
        window.scrollTo(0, 0);
        currentSlide = 0;
        setTimeout(() => {
            hideLoading();
            renderContinueWatching(); 
        }, 300);
    });
}

function loadMoreHome() {
    homeVisibleCount += 18;
    const container = document.getElementById('home-all-anime-container');
    const btn = document.getElementById('btn-load-more-home');
    container.innerHTML = generateGridHTML(homeAllAnime.slice(0, homeVisibleCount));
    if (homeVisibleCount >= homeAllAnime.length && btn) btn.style.display = 'none';
}

function generateGenresPage() {
    const genresSet = new Set();
    const yearSet = new Set(); 

    animeList.forEach(anime => {
        if(anime.genres) anime.genres.forEach(g => genresSet.add(g));
        if(anime.year) yearSet.add(anime.year); 
    });

    const container = document.getElementById('genres-tags-container');
    if(!container) return;

    let listHtml = `<li onclick="selectPeakGenre('All')">All Anime</li>`;
    genresSet.forEach(genre => {
        listHtml += `<li onclick="selectPeakGenre('${genre}')">${genre}</li>`;
    });

    let yearListHtml = `<li onclick="selectPeakYear('All Year')">All Year</li>`;
    const sortedYears = Array.from(yearSet).sort((a, b) => b - a); 
    sortedYears.forEach(year => {
        yearListHtml += `<li onclick="selectPeakYear('${year}')">${year}</li>`;
    });

    let html = `
        <div style="display: flex; flex-wrap: wrap; gap: 20px; max-width: 10000px; margin: 20px auto 40px auto;">
            
            <div class="peak-genre-filter" style="flex: 1; min-width: 500px; margin: 0;">
                <label class="filter-label">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Genres
                </label>
                <div class="filter-group">
                    <div class="dropdown-wrapper" id="genre-dropdown-wrapper">
                        <i class="fa-solid fa-magnifying-glass search-icon"></i>
                        <input type="text" id="genre-search-input" placeholder="Typing what you want..." 
                               onfocus="openDropdown('genre-dropdown-list')" oninput="searchGenreInList()" value="All Anime">
                        <i class="fa-solid fa-chevron-down arrow-icon"></i>
                        <ul class="dropdown-list" id="genre-dropdown-list">
                            ${listHtml}
                        </ul>
                    </div>
                </div>
            </div>

            <div class="peak-genre-filter" style="flex: 1; min-width: 500px; margin: 0;">
                <label class="filter-label">
                    <i class="fa-solid fa-circle-play"></i> Status
                </label>
                <div class="filter-group">
                    <div class="dropdown-wrapper" id="status-dropdown-wrapper">
                        <i class="fa-solid fa-satellite-dish search-icon"></i>
                        <input type="text" id="status-search-input" placeholder="Select Status..." 
                               onfocus="openDropdown('status-dropdown-list')" readonly value="All Status">
                        <i class="fa-solid fa-chevron-down arrow-icon"></i>
                        <ul class="dropdown-list" id="status-dropdown-list">
                            <li onclick="selectPeakStatus('All Status', 'All Status')">All Status</li>
                            <li onclick="selectPeakStatus('Finished', 'Finished')">Finished</li>
                            <li onclick="selectPeakStatus('Airing', 'Airing')">Airing</li>
                            <li onclick="selectPeakStatus('Upcoming', 'Upcoming')">Upcoming</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="peak-genre-filter" style="flex: 1; min-width: 250px; margin: 0;">
                <label class="filter-label">
                    <i class="fa-regular fa-calendar-days"></i> Year
                </label>
                <div class="filter-group">
                    <div class="dropdown-wrapper" id="year-dropdown-wrapper">
                        <i class="fa-solid fa-calendar search-icon"></i>
                        <input type="text" id="year-search-input" placeholder="Select Year..." 
                               onfocus="openDropdown('year-dropdown-list')" readonly value="All Year">
                        <i class="fa-solid fa-chevron-down arrow-icon"></i>
                        <ul class="dropdown-list" id="year-dropdown-list">
                            ${yearListHtml}
                        </ul>
                    </div>
                </div>
            </div>

        </div>
    `;
    
    container.innerHTML = html;
}

let currentPeakGenre = 'All';
let currentPeakStatus = 'All Status';
let currentPeakYear = 'All Year';


window.selectPeakGenre = (genre) => {
    currentPeakGenre = genre;
    document.getElementById('genre-search-input').value = genre === 'All' ? 'All Anime' : genre;
    document.getElementById('genre-dropdown-list').classList.remove('active');
    filterByGenreOnPage(genre);
};

window.openDropdown = (listId) => {
    document.querySelectorAll('.dropdown-list').forEach(list => list.classList.remove('active'));
    document.getElementById(listId).classList.add('active');
};

window.selectPeakStatus = (statusValue, displayLabel) => {
    currentPeakStatus = statusValue;
    document.getElementById('status-search-input').value = displayLabel;
    document.getElementById('status-dropdown-list').classList.remove('active');
    
    filterByGenreOnPage(currentPeakGenre); 
};

window.openGenreList = () => document.getElementById('genre-dropdown-list').classList.add('active');

window.searchGenreInList = () => {
    const filter = document.getElementById('genre-search-input').value.toUpperCase();
    const li = document.getElementById('genre-dropdown-list').getElementsByTagName('li');
    for (let i = 0; i < li.length; i++) {
        const text = li[i].textContent || li[i].innerText;
        li[i].style.display = text.toUpperCase().indexOf(filter) > -1 ? "" : "none";
    }
};

document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-wrapper')) {
        document.querySelectorAll('.dropdown-list').forEach(list => list.classList.remove('active'));
    }
});

window.selectPeakYear = (year) => {
    currentPeakYear = year;
    document.getElementById('year-search-input').value = year;
    document.getElementById('year-dropdown-list').classList.remove('active');
    filterByGenreOnPage(currentPeakGenre); 
};

function filterByGenreOnPage(genre) {
    const url = new URL(window.location);
    url.searchParams.set('genre', genre);
    window.history.pushState({}, '', url);

    let filtered = animeList.filter(anime => {
        const matchGenre = genre === 'All' || (anime.genres && anime.genres.includes(genre));
        const matchStatus = currentPeakStatus === 'All Status' || anime.status === currentPeakStatus;
        const matchYear = currentPeakYear === 'All Year' || String(anime.year) === String(currentPeakYear);
        
        return matchGenre && matchStatus && matchYear;
    });

    genreFilteredAnime = filtered;
    genreVisibleCount = 18;

    const initialRender = genreFilteredAnime.slice(0, genreVisibleCount);
    const resultsContainer = document.getElementById('genres-results');

    resultsContainer.innerHTML = `
        <h2 class="section-title" style="font-size:1.2rem; color:var(--text-muted);">
            Showing: ${genre} (${genreFilteredAnime.length} titles)
        </h2>
        <div id="genre-grid-container">
            ${generateGridHTML(initialRender)}
        </div>
        ${genreFilteredAnime.length > genreVisibleCount ? `<button id="btn-load-more-genre" class="load-more-btn" onclick="loadMoreGenre()">Load More</button>` : ''}
    `;
}

function loadMoreGenre() {
    genreVisibleCount += 18;
    const container = document.getElementById('genre-grid-container');
    const btn = document.getElementById('btn-load-more-genre');
    container.innerHTML = generateGridHTML(genreFilteredAnime.slice(0, genreVisibleCount));
    if (genreVisibleCount >= genreFilteredAnime.length && btn) btn.style.display = 'none';
}



// ==========================================
// 9. Search & Player
// ==========================================
function checkSearchEnter(event) {
    if (event.key === "Enter") {
        const query = document.getElementById('searchInput').value.trim();
        if(query === '') return;
        if (document.getElementById('app-content')) {
            executeSearch(query);
            window.history.pushState({}, '', `?search=${query}`);
        } else {
            window.location.href = `index.html?search=${query}`;
        }
    }
}

function executeSearch(query) {
    const q = query.toLowerCase();
    const filtered = animeList.filter(anime => {
        const matchTitle = anime.title.toLowerCase().includes(q);
        let matchKeyword = false;
        if(anime.search_keywords) {
            matchKeyword = anime.search_keywords.some(kw => kw.toLowerCase().includes(q));
        }
        return matchTitle || matchKeyword;
    });
    
    const app = document.getElementById('app-content');
    app.innerHTML = `
        <div style="padding-top: 20px;">
            <button class="back-btn" style="position:relative; left:50px; margin-bottom:20px;" onclick="window.location.href='index.html'">&lt; Back to Home</button>
            <h2 class="section-title">Search Results for "${query}"</h2>
            ${generateGridHTML(filtered)}
        </div>
    `;
}

function loadPlayer(animeId, epNum = 1) {
    showLoading();
    const anime = animeList.find(a => String(a.id) === String(animeId));
    if(!anime || !anime.episodes || anime.episodes.length === 0) { 
        hideLoading(); 
        loadHome(); 
        return; 
    }

    currentAnimeData = anime;
    currentEpisodeData = anime.episodes.find(e => String(e.ep_num) === String(epNum)) || anime.episodes[0];
    saveWatchHistory(anime.id, currentEpisodeData.ep_num);
    
    const app = document.getElementById('app-content');
    const tempContainer = document.createElement('div');

    let episodesHtml = '';
    anime.episodes.forEach(ep => {
        const isActive = ep.ep_num === currentEpisodeData.ep_num ? 'active' : '';
        episodesHtml += `
            <button id="btn-ep-${ep.ep_num}" class="ep-btn ${isActive}" onclick="switchEpisode(${ep.ep_num})">
                <i class="fa-solid fa-play"></i> ${ep.title}
            </button>
        `;
    });

    let serversHtml = '';
    if(currentEpisodeData.servers && currentEpisodeData.servers.length > 0) {
        currentEpisodeData.servers.forEach((srv, index) => {
            const isActive = index === 0 ? 'active' : ''; 
            serversHtml += `
                <button class="server-btn ${isActive}" onclick="switchServer(${index})">
                    ${srv.name}
                </button>`;
        });
    }

    const initialVideo = (currentEpisodeData.servers && currentEpisodeData.servers.length > 0) 
                         ? currentEpisodeData.servers[0].video_url 
                         : (currentEpisodeData.video_url || "");


    tempContainer.innerHTML = `
        <div class="player-header">
            <button class="back-btn" onclick="window.location.href='index.html'">
                <i class="fa-solid fa-chevron-left"></i> Back
            </button>
            <h1 class="player-title">${anime.title}</h1>
        </div>
        <div class="player-layout">
            <div class="video-section">
                <div class="server-selection">
                    <span><i class="fa-solid fa-satellite-dish"></i> Servers:</span>
                    <div class="server-btn-group" id="server-btn-group">
                        ${serversHtml}
                    </div>
                </div>

                <div class="video-wrapper">
                    <div id="video-player-loader" class="video-loading-overlay">
                        <div class="spinner"></div>
                        <p>LOADING VIDEO...</p>
                    </div>

                    <iframe id="anime-video" src="${initialVideo}" frameborder="0" allowfullscreen style="width: 100%; aspect-ratio: 16/9; border-radius: 8px;"></iframe>
                </div>

                <div class="video-info-bar"> 
                    <div class="video-info-text"> 
                        <h2 id="current-ep-title">${currentEpisodeData.title}</h2> 
                        <span class="video-status" id="video-status-text">Now Playing from Server 1</span> 
                    </div> 

                    
                    
                    <div style="display: flex; gap: 10px; align-items: center;">
                        ${currentAnimeData.MalId ? `
                        <a href="https://myanimelist.net/anime/${currentAnimeData.MalId}" target="_blank" title="View on MyAnimeList" 
                        style=" width: 42px; height: 42px; border-radius: 8px; display: flex; align-items: center; justify-content: center; text-decoration: none; transition: 0.3s; overflow: hidden; padding: 4px; border: 1px solid var(--border);"
                        onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                            <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcShyLfYo83MQCbrtyPn4-MdjoPiSXrzeWqfcA&s" 
                                style="width: 100%; height: 100%; object-fit: contain; border-radius: 4px;">
                        </a>` : ''}
                        <button class="btn-secondary" onclick="openDetailsModal()">
                            <i class="fa-solid fa-circle-info"></i> Details
                        </button>

                        <button class="btn-secondary" onclick="resetVideo()">
                            <i class="fa-solid fa-rotate-right"></i> Reload Server
                        </button>

                        <button class="btn-secondary" onclick="openReportModal()" style="border: 1px solid #ff4d4d; background: rgba(255, 77, 77, 0.1); color: #ff4d4d;">
                            <i class="fa-solid fa-triangle-exclamation"></i> Report broken file
                        </button>
                    </div>
                </div>
            </div>
            <div class="episode-section">
                <div class="ep-header">
                    <h3><i class="fa-solid fa-list-ul"></i> Episodes</h3>
                </div>
                ${episodesHtml}
            </div>
        </div>

        <div id="anime-details-modal" class="modal-overlays" onclick="closeDetailsModal(event)">
            <div class="modal-content anime-info-card" onclick="event.stopPropagation()">
                <button class="modal-close" onclick="closeDetailsModal()">&times;</button>
                <div id="modal-loader" class="details-loading">
                    <i class="fa-solid fa-spinner fa-spin"></i> Fetching...
                </div>
                <div id="modal-body-content"></div>
            </div>
        </div>
    `;

    waitForImages(tempContainer, () => {
        app.innerHTML = tempContainer.innerHTML;
        window.scrollTo(0, 0); 
        setTimeout(hideLoading, 300);

        if (currentAnimeData.MalId) {
            fetchAnimeDetails(currentAnimeData.MalId); 
        }
    });
}

function switchEpisode(epNum) {
    if(!currentAnimeData) return;
    currentEpisodeData = currentAnimeData.episodes.find(e => String(e.ep_num) === String(epNum));
    if(!currentEpisodeData) return;
    saveWatchHistory(currentAnimeData.id, currentEpisodeData.ep_num);

    const iframe = document.getElementById('anime-video');
    const videoLoader = document.getElementById('video-player-loader');
    if(videoLoader) videoLoader.style.display = 'flex';

    iframe.onload = function() {
        if(videoLoader) videoLoader.style.display = 'none';
    };

    const newVideoUrl = (currentEpisodeData.servers && currentEpisodeData.servers.length > 0) 
                 ? currentEpisodeData.servers[0].video_url 
                 : (currentEpisodeData.video_url || "");
    
    iframe.src = newVideoUrl;

    document.getElementById('video-status-text').innerText = 'Now Playing from Server 1';
    document.getElementById('current-ep-title').innerText = currentEpisodeData.title;

    let serversHtml = '';
    if(currentEpisodeData.servers && currentEpisodeData.servers.length > 0) {
        currentEpisodeData.servers.forEach((srv, index) => {
            const isActive = index === 0 ? 'active' : ''; 
            serversHtml += `<button class="server-btn ${isActive}" onclick="switchServer(${index})">${srv.name}</button>`;
        });
    }
    document.getElementById('server-btn-group').innerHTML = serversHtml;

    document.querySelectorAll('.ep-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-ep-${epNum}`);
    if(activeBtn) activeBtn.classList.add('active');
}

function switchServer(serverIndex) {
    if(!currentEpisodeData || !currentEpisodeData.servers) return;
    const server = currentEpisodeData.servers[serverIndex];
    const iframe = document.getElementById('anime-video');
    const videoLoader = document.getElementById('video-player-loader');

    if(videoLoader) videoLoader.style.display = 'flex';
    iframe.onload = function() {
        if(videoLoader) videoLoader.style.display = 'none';
    };
    if (server.video_url == "0"){
        showNotification('Server not found','error')
        switchServer(0)
        isActive = 0
    }else{
        iframe.src = server.video_url;
    }

    const buttons = document.querySelectorAll('.server-btn');
    buttons.forEach((btn, idx) => {
        if(idx === serverIndex) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    document.getElementById('video-status-text').innerText = `Now Playing from ${server.name}`;
}

function resetVideo() {
    const iframeElement = document.getElementById('anime-video');
    if(iframeElement) {
        const currentSrc = iframeElement.src;
        iframeElement.src = '';
        setTimeout(() => { iframeElement.src = currentSrc; }, 100);
    }
}

// ==========================================
// Continue Watching (History)
// ==========================================
async function saveWatchHistory(animeId, epNum) {
    const getLoggedInUser = () => {
        return new Promise((resolve) => {
            if (currentUser) return resolve(currentUser);
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                unsubscribe();
                resolve(user);
            });
        });
    };

    const user = await getLoggedInUser();
    if (!user) return; 

    try {
        const historyRef = doc(db, 'users', user.uid, 'history', String(animeId));
        await setDoc(historyRef, {
            animeId: String(animeId),
            epNum: parseInt(epNum),
            timestamp: serverTimestamp()
        });

    } catch (error) {
        showNotification("Something went wrong please refresh the page","error")
    }
}

async function renderContinueWatching() {
    const container = document.getElementById('history-section');
    if (!container) return;

    if (!currentUser) {
        container.style.display = 'none';
        return;
    }

    try {
        const historyRef = collection(db, 'users', currentUser.uid, 'history');
        const q = query(historyRef, orderBy('timestamp', 'desc'), limit(4)); 
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            container.style.display = 'none';
            return;
        }

        let html = `<h2 class="section-title"><i class="fa-solid fa-clock-rotate-left" style="color: var(--accent);"></i> History</h2>
                    <div class="history-grid">`;

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const anime = animeList.find(a => a.id === data.animeId);
            
            if (anime) {
                const imgUrl = anime.banner || anime.image; 
                const epTitle = anime.episodes.find(e => e.ep_num === data.epNum)?.title || `Episode ${data.epNum}`;

                html += `
                    <div class="history-card" onclick="goToPlayer('${anime.id}', ${data.epNum})">
                        <div class="history-img-wrapper">
                            <img src="${imgUrl}" class="history-img" alt="${anime.title}">
                            <div class="history-ep-badge"><i class="fa-solid fa-play"></i> ${epTitle}</div>
                        </div>
                        <div class="history-info">
                            <h3>${anime.title}</h3>
                            <i class="fa-solid fa-arrow-right-long"></i>
                        </div>
                    </div>
                `;
            }
        });
        html += `</div>`;
        
        container.innerHTML = html;
        container.style.display = 'block';

    } catch (error) {
        showNotification('Something went wrong please refresh the page', 'error');
    }
}

// ==========================================
// 10.help function & UI
// ==========================================


function getTimestampForDay(dayName) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDayIndex = days.indexOf(dayName.toLowerCase());
    
    const now = new Date();
    const currentDayIndex = now.getDay();
    
    let diff = targetDayIndex - currentDayIndex;
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + diff);
    
    targetDate.setHours(0, 0, 0, 0);
    const startTimestamp = Math.floor(targetDate.getTime() / 1000);
    const endTimestamp = startTimestamp + 86400;
    
    return { greater: startTimestamp, lesser: endTimestamp };
}

async function renderSchedulePage(day = '') {
    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    const currentDay = day || new Date().toLocaleString('en-us', {weekday: 'long'}).toLowerCase();
    
    appContent.innerHTML = `
        <div class="schedule-container">
            <h1 class="section-title"><i class="fa-solid fa-calendar-days"></i> Broadcast Schedule</h1>
            <div class="day-selector" id="daySelector">
                ${['Sunday','Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => `
                    <button class="day-btn ${d.toLowerCase() === currentDay ? 'active' : ''}" 
                            onclick="updateScheduleDay('${d.toLowerCase()}')">${d}</button>
                `).join('')}
            </div>
            <div id="scheduleLoading" class="loading-state" style="text-align:center; padding: 50px; display:none;">
                <div class="spinner"></div>
                <p style="color: var(--text-muted); margin-top: 15px;">Loading...</p>
            </div>
            <div class="schedule-grid" id="scheduleGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px;"></div>
        </div>
    `;

    loadScheduleData(currentDay);
}

async function loadScheduleData(day) {
    const grid = document.getElementById('scheduleGrid');
    const loader = document.getElementById('scheduleLoading');
    
    grid.innerHTML = '';
    loader.style.display = 'block';

    const { greater, lesser } = getTimestampForDay(day);

    const query = `
    query ($page: Int, $greater: Int, $lesser: Int) {
        Page(page: $page, perPage: 50) {
            pageInfo {
                hasNextPage
            }
            airingSchedules(airingAt_greater: $greater, airingAt_lesser: $lesser, sort: TIME) {
                airingAt
                episode
                media {
                    id
                    title { romaji english native }
                    synonyms
                }
            }
        }
    }`;

    let rawData = [];
    let currentPage = 1;
    let hasNextPage = true;

    try {
        while (hasNextPage) {
            const variables = { page: currentPage, greater, lesser };
            
            const response = await fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ query, variables })
            });
            
            const result = await response.json();
            const pageData = result.data.Page;

            rawData = rawData.concat(pageData.airingSchedules);
            
            hasNextPage = pageData.pageInfo.hasNextPage;
            currentPage++;
        }

        const matchedAnimeList = [];

        rawData.forEach(item => {
            const aniMedia = item.media;
            
            const aniTitles = [
                aniMedia.title.english, 
                aniMedia.title.romaji, 
                aniMedia.title.native,
                ...(aniMedia.synonyms || [])
            ].filter(Boolean).map(t => t.toLowerCase().trim());

            const matchedDbAnime = animeList.find(dbAnime => {
                
                const currentStatus = dbAnime.status ? dbAnime.status.toLowerCase().trim() : "";

                // วิธีที่ 1: แบนเฉพาะภาคที่จบไปแล้ว (แนะนำวิธีนี้ครับ ตัดปัญหาภาค 1 โผล่ และไม่กระทบเรื่องที่ลืมใส่ status)
                if (currentStatus === "completed" || currentStatus === "finished" || currentStatus === "ended") {
                    return false; // ถ้าเป็นภาคที่จบแล้ว ปัดตกทันที!
                }

                // วิธีที่ 2: ถ้าอยากบังคับว่าต้องใส่ Airing เท่านั้นถึงจะโผล่ (ถ้าใช้วิธีนี้ให้ลบเครื่องหมาย // ข้างหน้าออก)
                // if (currentStatus !== "airing" && currentStatus !== "ongoing") {
                //     return false; 
                // }

                if (dbAnime.anilistId && Number(dbAnime.anilistId) === aniMedia.id) {
                    return true;
                }

                if (!dbAnime.title) return false;
                
                let dbNames = [dbAnime.title.toLowerCase().trim()];
                
                if (dbAnime.keywords) {
                    if (Array.isArray(dbAnime.keywords)) {
                        const kwArray = dbAnime.keywords.map(k => k.toLowerCase().trim());
                        dbNames = dbNames.concat(kwArray);
                    } else if (typeof dbAnime.keywords === 'string') {
                        const kwArray = dbAnime.keywords.split(',').map(k => k.toLowerCase().trim());
                        dbNames = dbNames.concat(kwArray);
                    }
                }

                return dbNames.some(dbName => {
                    return aniTitles.some(aniTitle => {
                        if (dbName.length <= 2 || aniTitle.length <= 2) {
                            return dbName === aniTitle; 
                        }
                        return aniTitle.includes(dbName) || dbName.includes(aniTitle);
                    });
                });
            });

            if (matchedDbAnime) {
                const isDuplicate = matchedAnimeList.find(m => m.dbData.id === matchedDbAnime.id);
                if (!isDuplicate) {
                    matchedAnimeList.push({
                        airingInfo: item,
                        dbData: matchedDbAnime
                    });
                }
            }
        });


        if (matchedAnimeList.length === 0) {
            grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No scheduled anime for this day.</p>`;
        } else {
            matchedAnimeList.forEach(item => {
                const dbAnime = item.dbData;
                const airingInfo = item.airingInfo;
                
                const date = new Date(airingInfo.airingAt * 1000);
                const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                const card = document.createElement('div');
                const isBookmarked = typeof userBookmarks !== 'undefined' && userBookmarks.includes(dbAnime.id);
                const iconClass = isBookmarked ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark';
                const iconColor = isBookmarked ? 'color: var(--accent);' : '';
                card.innerHTML = `
                    <div class="anime-card">
                    <div class="anime-img-wrapper">
                        <img src="${dbAnime.image}" alt="${dbAnime.title}" class="anime-img" >
                        <button class="bookmark-btn" data-anime-id="${dbAnime.id}" onclick="handleBookmark(event, '${dbAnime.id}')" title="Add to Bookmark">
                            <i class="${iconClass}" style="${iconColor}"></i>
                        </button>
                        <div class="time-badge" style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.8); padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; color: var(--accent); border-left: 3px solid var(--accent); z-index: 2;">
                            ~ ${timeString} (Ep ${airingInfo.episode})
                        </div>

                        <div class="anime-actions">
                            <button class="action-btn preview-btn" onclick="openPreview('${dbAnime.id}', event)" title="Preview">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <div class="anime-info">
                        <h3>${dbAnime.title}</h3>
                        <span>${dbAnime.genres ? dbAnime.genres.slice(0, 2).join(', ') : 'Anime'}</span>
                    </div>
                </div>
                `;

                card.onclick = () => window.goToPlayer(dbAnime.id);
                card.style.cursor = 'pointer';
                grid.appendChild(card);
            });
        }
    } catch (error) {
        console.error("AniList Fetch Error:", error);
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #ff4d4d;">Failed to load schedule.</p>`;
    } finally {
        loader.style.display = 'none';
    }
}

function updateScheduleDay(day) {
    const btns = document.querySelectorAll('.day-btn');
    btns.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    loadScheduleData(day);
}


const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('page') === 'schedule') {
    renderSchedulePage();
}
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove('active');
    modal.classList.add('closing'); 

    setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.remove('closing');
    }, 350); 
}
async function loadAnimeData() {
    showLoading();
    try {
        const url = 'data.json';
        const cacheName = 'peakani-data-cache-v1';

        const cache = await caches.open(cacheName);
        let cachedResponse = await cache.match(url);

        const fetchPromise = fetch(url).then(networkResponse => {
            cache.put(url, networkResponse.clone()); 
            return networkResponse;
        }).catch(() => console.warn("ไม่สามารถดึงข้อมูลใหม่ได้ ใช้ข้อมูลเดิมไปก่อน"));

        let finalResponse;

        if (cachedResponse) {

            finalResponse = cachedResponse;
            
            fetchPromise.then(async (res) => {
                if (res) {
                    const freshData = await res.json();
                    animeList = freshData; 
                }
            });
        } else {
            const res = await fetchPromise;
            if(!res) throw new Error("Network Error");
            finalResponse = res;
        }

        animeList = await finalResponse.json();
        

        if (typeof splitEpisodes === 'function') {
            allEpisodesList = splitEpisodes(animeList);
        }

        const urlParams = new URLSearchParams(window.location.search);
        const page = urlParams.get('page');
        const watchId = urlParams.get('watch');
        const genre = urlParams.get('genre');

        if (watchId) {
            renderPlayerPage(watchId);
        } else if (page === 'bookmarks') {
            renderBookmarksPage();
        } else if (window.location.pathname.includes('genres.html')) {
            generateGenresPage();
            if (genre) filterByGenreOnPage(genre);
            else filterByGenreOnPage('All');
        } else {
            renderHomePage();
        }
    } catch (error) {
        console.error("Error loading anime data:", error);
        document.getElementById('app-content').innerHTML = `
            <div style="text-align: center; margin-top: 50px;">
                <h2 style="color: #ef4444;">Failed to load data.</h2>
                <button class="btn-watch-now" onclick="location.reload()">Retry</button>
            </div>
        `;
    } finally {
        hideLoading();
    }
}
function openDetailsModal() {
    const modal = document.getElementById('anime-details-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (currentAnimeData && currentAnimeData.MalId) {
        fetchAnimeDetails(currentAnimeData.MalId);
    }
}

function closeDetailsModal(event) {
    const modal = document.getElementById('anime-details-modal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

async function fetchAnimeDetails(malId) {
    const loader = document.getElementById('modal-loader');
    const content = document.getElementById('modal-body-content');

    loader.style.display = 'block';
    content.innerHTML = '';

    try {
        const response = await fetch(`https://api.jikan.moe/v4/anime/${malId}`);
        const result = await response.json();
        const data = result.data;

        content.innerHTML = `
            <div class="modal-grid">
                <div class="modal-poster">
                    <img src="${data.images.jpg.large_image_url}" alt="${data.title}">
                    <div class="modal-score"><i class="fa-solid fa-star"></i> ${data.score || 'N/A'}</div>
                </div>
                <div class="modal-info">
                    <h2>${data.title} ( ${data.mal_id} )</h2>
                    <p class="japanese-title">${data.title_japanese || ''}</p>
                    <div class="info-tags">
                        <span>${data.type}</span> • <span>${data.episodes || '?'} EP</span> • <span>${data.status}</span> • <span>${data.aired.prop.from.year}</span>
                    </div>
                    <div class="synopsis-scroll">
                        <strong>synopsis:</strong><br>
                        ${data.synopsis ? data.synopsis.replace(/\n/g, '<br>').replace("[Written by MAL Rewrite]", "") : 'No synopsis'}
                    </div>
                    <div class="extra-info">
                        <div><strong>Studio:</strong> ${data.studios?.map(s => s.name).join(', ') || 'N/A'}</div>
                        <div><strong>Genres:</strong> ${data.genres?.map(g => g.name).join(', ') || 'N/A'}</div>
                    </div>
                </div>
            </div>
        `;
        loader.style.display = 'none';
    } catch (error) {
        loader.innerHTML = 'Couldn\'t Fetching data :(';
    }
}

function showNotification(message, type = 'success') {
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.innerHTML = `
            .toast-container {
                position: fixed; bottom: 20px; right: 20px; z-index: 9999;
                display: flex; flex-direction: column; gap: 10px;
            }
            .toast-msg {
                background: #222; color: #fff; padding: 15px 20px; border-radius: 8px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                display: flex; align-items: center; gap: 12px; font-family: sans-serif;
                transform: translateX(120%); transition: transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.35);
            }
            .toast-msg.show { transform: translateX(0); }
            .toast-msg.success { border-left: 4px solid #4caf50; }
            .toast-msg.error { border-left: 4px solid #f44336; }
        `;
        document.head.appendChild(style);
    }

    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-msg ${type}`;
    const icon = type === 'success' ? '<i class="fa-solid fa-circle-check" style="color: #4caf50; font-size: 1.2rem;"></i>' : '<i class="fa-solid fa-circle-exclamation" style="color: #f44336; font-size: 1.2rem;"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function openPreview(animeId, event) {
    if (event) event.stopPropagation();

    const anime = animeList.find(a => String(a.id) === String(animeId));
  
    if (!anime || !anime.preview || anime.preview.trim() === "") {
        showNotification('No Trailer found for this anime', 'error'); 
        return; 
    }

    const modal = document.getElementById('preview-modal');
    const container = document.getElementById('preview-container');

    let iframeHTML = anime.preview;
    if (!iframeHTML.includes('<iframe')) {
        iframeHTML = `<iframe src="${anime.preview}" width="100%" height="100%" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen autoplay></iframe>`;
    }

    container.innerHTML = iframeHTML;
    modal.style.display = 'flex'; 
}

function closePreview() {
    const modal = document.getElementById('preview-modal');
    const container = document.getElementById('preview-container');
    modal.style.display = 'none';
    container.innerHTML = '';
}

// =========================================
// Donate Modal & Copy Address
// =========================================
function openDonateModal() {
    document.getElementById('donate-modal').style.display = 'flex';
}

function closeDonateModal() {
    document.getElementById('donate-modal').style.display = 'none';
}

function copyCryptoAddress(networkName, address) {
    navigator.clipboard.writeText(address).then(() => {
        if (typeof showNotification === "function") {
            showNotification(`Copied ${networkName} address!`, 'success');
        } else {
            alert(`Copied ${networkName} address!`);
        }
    }).catch(err => {
        showNotification('Something went wrong please refresh the page', 'error');
        if (typeof showNotification === "function") {
            showNotification('Failed to copy address. Please try again.', 'error');
        }
    });
}

// =========================================
// Report Modal & Discord Webhook Integration
// =========================================
function openRequestModal() {
    document.getElementById('request-modal').style.display = 'flex';
}

function closeRequestModal() {
    document.getElementById('request-modal').style.display = 'none';
    document.getElementById('request-title').value = '';
    document.getElementById('request-mal').value = '';
}

async function submitRequest() {
    const titleInput = document.getElementById('request-title').value.trim();
    const malInput = document.getElementById('request-mal').value.trim();
    const submitBtn = document.getElementById('submit-request-btn');

    if (!titleInput) {
        if (typeof showNotification === "function") {
            showNotification("Please enter the anime title.", "error");
        } else {
            alert("Please enter the anime title.");
        }
        return;
    }

    const webhookUrl = "https://discord.com/api/webhooks/1059125897787088989/8wvWuE3N_YFndO27EczfQ8i_9e4p7_Rnm4rE6A5zOHnHXGON28zMuJDJM1LqJh7F5lxi";

    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    submitBtn.disabled = true;

    const payload = {
        embeds: [{
            title: "🎬 New Anime Request",
            color: 3698680, 
            fields: [
                { name: "Anime Title", value: titleInput, inline: false }
            ],
            timestamp: new Date().toISOString()
        }]
    };

    if (malInput) {
        payload.embeds[0].fields.push({
            name: "MAL ID / Link",
            value: malInput,
            inline: false
        });
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            if (typeof showNotification === "function") showNotification("Request sent successfully!", "success");
            closeRequestModal();
        } else {
            throw new Error("Failed to send webhook");
        }
    } catch (error) {
        showNotification('Something went wrong please refresh the page', 'error');
        if (typeof showNotification === "function") showNotification("Error submitting request", "error");
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function openReportModal() {
    if (!currentAnimeData || !currentEpisodeData) return;
    
    const modal = document.getElementById('report-modal');
    const Note = document.getElementById('Note');
    const selectBox = document.getElementById('report-server-select');

    selectBox.innerHTML = '';
    currentEpisodeData.servers.forEach(server => {
        const option = document.createElement('option');
        option.value = server.name;
        option.innerText = server.name;
        selectBox.appendChild(option);
    });
    
    modal.style.display = 'flex';
}

function closeReportModal() {
    document.getElementById('report-modal').style.display = 'none';
}

async function submitReport() {
    if (!currentAnimeData || !currentEpisodeData) return;
    
    const selectedServer = document.getElementById('report-server-select').value;
    const webhookUrl = "https://discord.com/api/webhooks/1059125897787088989/8wvWuE3N_YFndO27EczfQ8i_9e4p7_Rnm4rE6A5zOHnHXGON28zMuJDJM1LqJh7F5lxi";

    const payload = {
        username: "PeakAni System", 
        embeds: [{
            title: "🚨 Report Broken File",
            color: 16711680,
            fields: [
                { name: "📺 Anime", value: currentAnimeData.title || " ", inline: false },
                { name: "🎬 Episode", value: currentEpisodeData.title || " ", inline: true },
                { name: "❌ Server Issue", value: selectedServer, inline: true },
                { name: "🔗 Player Link", value: `https://varomine.github.io/website/index.html?page=player&id=${currentAnimeData.id}&ep=${currentEpisodeData.ep_num}`, inline: false },
                { name: "📝 Note", value: document.getElementById('Note').value || "No additional notes provided.", inline: false }
            ],
            thumbnail: {
                url: currentAnimeData.image || ""
            },
            timestamp: new Date().toISOString()
        }]
    };
    
    const submitBtn = document.getElementById('submit-report-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    submitBtn.disabled = true;
    
    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        closeReportModal();
        if (typeof showNotification === "function") {
            showNotification("Report submitted successfully!", "success");
        } else {
            alert("Report submitted successfully!");
        }
    } catch (error) {
        showNotification('Something went wrong please refresh the page', 'error');
        if (typeof showNotification === "function") {
            showNotification("Error submitting report", "error");
        }
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// ==========================================
// 11. Bug Fixes <script type="module">
// ==========================================

window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.toggleAuthMode = toggleAuthMode;
window.handleAuthSubmit = handleAuthSubmit;
window.handleLogout = handleLogout;
window.handleBookmark = handleBookmark;
window.checkSearchEnter = checkSearchEnter;
window.goToPlayer = goToPlayer;
window.moveSlide = moveSlide;
window.loadMoreHome = loadMoreHome;
window.filterByGenreOnPage = filterByGenreOnPage;
window.loadMoreGenre = loadMoreGenre;
window.switchEpisode = switchEpisode;
window.switchServer = switchServer;
window.resetVideo = resetVideo;
window.showNotification = showNotification;
window.handleForgotPassword = handleForgotPassword;
window.openPreview = openPreview;
window.closePreview = closePreview;
window.openDonateModal = openDonateModal;
window.closeDonateModal = closeDonateModal;
window.copyCryptoAddress = copyCryptoAddress;
window.openReportModal = openReportModal;
window.closeReportModal = closeReportModal;
window.submitReport = submitReport;
window.openRequestModal = openRequestModal;
window.closeRequestModal = closeRequestModal;
window.submitRequest = submitRequest;
window.openDetailsModal = openDetailsModal;
window.closeDetailsModal = closeDetailsModal;
window.updateScheduleDay = updateScheduleDay;