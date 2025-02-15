const gallery = document.getElementById('gallery');
const modal = document.getElementById('imageModal');
const modalImg = document.getElementById('modalImage');
const downloadBtn = document.getElementById('downloadBtn');
const searchInput = document.getElementById('searchInput');
const searchBadge = document.getElementById('searchBadge');

// Google Drive folder IDs - replace with your folder IDs
const FOLDER_IDS = [
    {
        id: '1CXyOs17-2-8VfPqX272uaeHt_Y7zTixt',
        category: 'Travel'
    },
    {
        id: '1Uv-hwV5VNhqmpgRiqmlvuqXH1aWjZeo4',
        category: 'Adventure'
    }
    // Add more folders as needed
];

const API_KEY = 'AIzaSyAvs1EOvojxbUz2I2MrQw9eTv74Fj3mx3E';
let images = [];

// Add download count to image objects
const DOWNLOAD_THRESHOLD = 5; // Number of downloads to be considered "Popular"

// Function to get proper Google Drive image URL
function getGoogleDriveImageUrl(fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
}

// Function to get download URL
function getDownloadUrl(fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

// Fetch images from multiple Google Drive folders
async function fetchGoogleDriveImages() {
    try {
        const allImages = [];
        
        // Fetch images from each folder
        for (const folder of FOLDER_IDS) {
            const DRIVE_API_URL = `https://www.googleapis.com/drive/v3/files?q='${folder.id}'+in+parents&key=${API_KEY}`;
            const response = await fetch(DRIVE_API_URL);
            const data = await response.json();
            
            const folderImages = data.files.map(file => ({
                id: file.id,
                url: getGoogleDriveImageUrl(file.id),
                title: file.name.split('.')[0].slice(-3).toUpperCase(),
                downloadCount: 0,
                downloadUrl: getDownloadUrl(file.id)
            }));
            
            allImages.push(...folderImages);
        }
        
        // Shuffle images for better presentation
        images = shuffleArray(allImages);
        loadImages(images);
    } catch (error) {
        console.error('Error fetching images:', error);
        gallery.innerHTML = '<p>Error loading images. Please try again later.</p>';
    }
}

// Fisher-Yates shuffle algorithm
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Load images with loading state
function loadImages(images) {
    gallery.innerHTML = '';
    let popularCount = 0;
    
    images.forEach(image => {
        if (image.downloadCount >= DOWNLOAD_THRESHOLD) {
            popularCount++;
        }
        
        const card = document.createElement('div');
        card.className = 'image-card loading';
        
        card.innerHTML = `
            <img src="${image.url}" alt="${image.title}" onload="this.parentElement.classList.remove('loading')">
            <div class="image-overlay">
                <i class="fas fa-download download-icon"></i>
            </div>
            <div class="image-title">${image.title}</div>
            ${image.downloadCount >= DOWNLOAD_THRESHOLD ? '<div class="popular-badge">Popular</div>' : ''}
        `;

        card.addEventListener('click', () => {
            openModal(image.url, image.downloadUrl);
            incrementDownloadCount(image);
        });
        gallery.appendChild(card);
    });
    
    // Update search badge with popular count
    searchBadge.textContent = `${popularCount} Popular`;
}

// Add function to track downloads
function incrementDownloadCount(image) {
    image.downloadCount = (image.downloadCount || 0) + 1;
    if (image.downloadCount === DOWNLOAD_THRESHOLD) {
        // Refresh the gallery to show the popular badge and update count
        loadImages(images);
    }
}

// Search functionality
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredImages = images.filter(image => 
        image.title.toLowerCase().includes(searchTerm)
    );
    loadImages(filteredImages);
});

// Modal functions
function openModal(imageUrl, downloadUrl) {
    modal.style.display = 'block';
    modalImg.src = imageUrl;
    downloadBtn.href = downloadUrl;
}

modal.querySelector('.close-modal').addEventListener('click', () => {
    modal.style.display = 'none';
});

// Close modal when clicking outside the image
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// Initial load
fetchGoogleDriveImages();

// Modified infinite scroll
let isLoading = false;
let lastScrollPosition = 0;

window.addEventListener('scroll', () => {
    if (isLoading) return;
    
    const currentScrollPosition = window.scrollY;
    // Check if user is scrolling down
    if (currentScrollPosition > lastScrollPosition && 
        (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
        
        isLoading = true;
        
        // Clone only a portion of images
        const existingLength = images.length;
        const newImages = images.slice(0, Math.min(12, existingLength)).map(img => ({
            ...img,
            id: img.id + Date.now(), // Ensure unique IDs
            title: img.title + Math.floor(Math.random() * 100)
        }));
        
        images.push(...newImages);
        loadImages(images);
        
        setTimeout(() => {
            isLoading = false;
        }, 1000);
    }
    lastScrollPosition = currentScrollPosition;
});

// Add window resize handler to prevent duplication
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        loadImages(images);
    }, 250);
}); 
