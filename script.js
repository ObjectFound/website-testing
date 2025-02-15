const gallery = document.getElementById('gallery');
const modal = document.getElementById('imageModal');
const modalImg = document.getElementById('modalImage');
const downloadBtn = document.getElementById('downloadBtn');
const searchInput = document.getElementById('searchInput');
const searchBadge = document.getElementById('searchBadge');
const monthFilter = document.getElementById('monthFilter');
const yearFilter = document.getElementById('yearFilter');
const dateFilterBtn = document.getElementById('dateFilterBtn');
const dateDropdown = document.getElementById('dateDropdown');
const applyDateFilter = document.getElementById('applyDateFilter');

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
                downloadUrl: getDownloadUrl(file.id),
                date: extractDateFromFilename(file.name)
            }));
            
            allImages.push(...folderImages);
        }
        
        // Shuffle images for better presentation
        images = shuffleArray(allImages);
        loadImages(images);
        populateDateFilters();
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

// Add function to extract date from filename
function extractDateFromFilename(filename) {
    const datePattern = /(\d{4})-(\d{2})-(\d{2})/;
    const match = filename.match(datePattern);
    if (match) {
        return {
            year: match[1],
            month: match[2],
            day: match[3]
        };
    }
    return null;
}

// Add function to populate date filters
function populateDateFilters() {
    const months = new Set();
    const years = new Set();
    
    images.forEach(image => {
        if (image.date) {
            months.add(image.date.month);
            years.add(image.date.year);
        }
    });

    const monthNames = {
        '01': 'January', '02': 'February', '03': 'March',
        '04': 'April', '05': 'May', '06': 'June',
        '07': 'July', '08': 'August', '09': 'September',
        '10': 'October', '11': 'November', '12': 'December'
    };

    // Populate month filter
    monthFilter.innerHTML = '<option value="">Month</option>';
    [...months].sort().forEach(month => {
        monthFilter.innerHTML += `
            <option value="${month}">${monthNames[month]}</option>
        `;
    });

    // Populate year filter
    yearFilter.innerHTML = '<option value="">Year</option>';
    [...years].sort().reverse().forEach(year => {
        yearFilter.innerHTML += `
            <option value="${year}">${year}</option>
        `;
    });
}

// Add click event for date filter button
dateFilterBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dateDropdown.classList.toggle('active');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!dateDropdown.contains(e.target) && !dateFilterBtn.contains(e.target)) {
        dateDropdown.classList.remove('active');
    }
});

// Modify the filterImages function
function filterImages() {
    const selectedMonth = monthFilter.value;
    const selectedYear = yearFilter.value;
    const searchTerm = searchInput.value.toLowerCase();

    const filteredImages = images.filter(image => {
        if (!image.date) return true; // Show images without dates
        
        const matchesMonth = !selectedMonth || image.date.month === selectedMonth;
        const matchesYear = !selectedYear || image.date.year === selectedYear;
        const matchesSearch = !searchTerm || image.title.toLowerCase().includes(searchTerm);
        
        return matchesMonth && matchesYear && matchesSearch;
    });

    loadImages(filteredImages);
    dateDropdown.classList.remove('active'); // Close dropdown after filtering
}

// Update event listeners
applyDateFilter.addEventListener('click', filterImages);

// Remove the previous month and year filter event listeners
monthFilter.removeEventListener('change', filterImages);
yearFilter.removeEventListener('change', filterImages); 
