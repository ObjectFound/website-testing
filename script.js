const gallery = document.getElementById('gallery');
const modal = document.getElementById('imageModal');
const modalImg = document.getElementById('modalImage');
const downloadBtn = document.getElementById('downloadBtn');
const searchInput = document.getElementById('searchInput');
const searchBadge = document.getElementById('searchBadge');
const categoryTabs = document.querySelectorAll('.category-tab');
const welcomeScreen = document.getElementById('welcomeScreen');
const enterButton = document.getElementById('enterButton');

// Update folder structure to include names
const FOLDER_IDS = [
    {
        id: '1CXyOs17-2-8VfPqX272uaeHt_Y7zTixt',
        name: 'Adventure 2024'
    },
    {
        id: '1Uv-hwV5VNhqmpgRiqmlvuqXH1aWjZeo4',
        name: 'Travel Memories'
    }
];

const API_KEY = 'AIzaSyAvs1EOvojxbUz2I2MrQw9eTv74Fj3mx3E';
let images = [];

// Add download count to image objects
const DOWNLOAD_THRESHOLD = 5; // Number of downloads to be considered "Popular"

// Add to existing constants
const albumsMap = new Map();

// Function to get proper Google Drive image URL
function getGoogleDriveImageUrl(fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
}

// Function to get download URL
function getDownloadUrl(fileId) {
    return `https://drive.google.com/uc?id=${fileId}&export=download`;
}

// Fetch images from multiple Google Drive folders
async function fetchGoogleDriveImages() {
    try {
        const allImages = [];
        
        for (const folder of FOLDER_IDS) {
            // First get the folder name
            const folderResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files/${folder.id}?key=${API_KEY}`
            );
            const folderData = await folderResponse.json();
            
            // Update folder name from Google Drive
            folder.name = folderData.name;

            // Then get all files
            const DRIVE_API_URL = `https://www.googleapis.com/drive/v3/files?q='${folder.id}'+in+parents&pageSize=1000&fields=files(id,name,mimeType,createdTime)&key=${API_KEY}`;
            const response = await fetch(DRIVE_API_URL);
            const data = await response.json();
            
            const folderImages = data.files.map(file => ({
                id: file.id,
                url: getGoogleDriveImageUrl(file.id),
                title: file.name.split('.')[0].slice(-3).toUpperCase(),
                originalName: file.name,
                mimeType: file.mimeType,
                downloadCount: 0,
                downloadUrl: getDownloadUrl(file.id),
                timestamp: new Date(file.createdTime).getTime(),
                albumId: folder.id,
                albumName: folderData.name // Use actual folder name
            }));
            
            albumsMap.set(folder.id, folderImages);
            allImages.push(...folderImages);
        }
        
        images = allImages.sort((a, b) => b.timestamp - a.timestamp);
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

// Update the loadImages function to maintain category state
let currentCategory = 'latest'; // Track current category

function loadImages(imagesToLoad, preserveCategory = false) {
    if (!preserveCategory) {
        currentCategory = 'all';
    }
    
    gallery.innerHTML = '';
    let popularCount = 0;
    
    imagesToLoad.forEach(image => {
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

// Update infinite scroll to respect current category
window.addEventListener('scroll', () => {
    if (isLoading || currentCategory === 'albums') return;
    
    const currentScrollPosition = window.scrollY;
    if (currentScrollPosition > lastScrollPosition && 
        (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
        
        isLoading = true;
        
        // Clone images based on current category
        const currentImages = currentCategory === 'latest' 
            ? [...images].sort((a, b) => b.timestamp - a.timestamp)
            : images;
            
        const existingLength = currentImages.length;
        const newImages = currentImages.slice(0, Math.min(12, existingLength)).map(img => ({
            ...img,
            id: img.id + Date.now(),
            title: img.title
        }));
        
        images.push(...newImages);
        
        // Maintain category when loading more images
        if (currentCategory === 'latest') {
            loadImages([...images].sort((a, b) => b.timestamp - a.timestamp), true);
        } else {
            loadImages(images, true);
        }
        
        setTimeout(() => {
            isLoading = false;
        }, 1000);
    }
    lastScrollPosition = currentScrollPosition;
});

// Add window resize handler to prevent duplication
let resizeTimeout;

// Update resize handler
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (currentCategory === 'albums') {
            showAlbumView();
        } else if (currentCategory === 'latest') {
            loadImages([...images].sort((a, b) => b.timestamp - a.timestamp), true);
        } else {
            loadImages(images, true);
        }
    }, 250);
});

// Add category handling
categoryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Update active state
        categoryTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Filter images based on category
        const category = tab.dataset.category;
        filterImagesByCategory(category);
    });
});

// Update filterImagesByCategory function
function filterImagesByCategory(category) {
    currentCategory = category;
    let filteredImages;
    
    switch(category) {
        case 'latest':
            filteredImages = [...images].sort((a, b) => b.timestamp - a.timestamp);
            loadImages(filteredImages, true);
            break;
        case 'albums':
            showAlbumView();
            break;
        case 'all':
        default:
            loadImages(images, true);
            break;
    }
}

// Add function to show album view
function showAlbumView() {
    currentCategory = 'albums';
    gallery.innerHTML = '';
    
    FOLDER_IDS.forEach(folder => {
        const albumFiles = albumsMap.get(folder.id);
        if (!albumFiles?.length) return;

        const albumCard = document.createElement('div');
        albumCard.className = 'album-card';
        
        // Get preview images
        const previewImages = albumFiles
            .filter(file => file.mimeType.startsWith('image/'))
            .slice(0, 4);
        
        const imageCount = albumFiles.filter(file => file.mimeType.startsWith('image/')).length;
        const videoCount = albumFiles.filter(file => file.mimeType.startsWith('video/')).length;
        
        albumCard.innerHTML = `
            <div class="album-preview">
                ${previewImages.map(img => `
                    <div class="preview-image">
                        <img src="${img.url}" alt="${img.title}">
                    </div>
                `).join('')}
            </div>
            <div class="album-info">
                <h3>${folder.name}</h3>
                <p>${albumFiles.length} total (${imageCount} images, ${videoCount} videos)</p>
                <button class="album-download-btn">
                    <i class="fas fa-download"></i> Download ${imageCount} Images
                </button>
            </div>
        `;

        // Update click handlers
        albumCard.querySelector('.album-download-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            downloadAlbum(folder.id, folder.name);
        });

        albumCard.addEventListener('click', () => {
            const albumImages = albumFiles;
            loadImages(albumImages, true);
            categoryTabs.forEach(tab => {
                tab.classList.remove('active');
                if (tab.dataset.category === 'all') tab.classList.add('active');
            });
            currentCategory = 'all';
        });

        gallery.appendChild(albumCard);
    });
}

// Update the downloadAlbum function
async function downloadAlbum(albumId, albumName) {
    const albumFiles = albumsMap.get(albumId);
    if (!albumFiles) return;

    // Filter only images
    const albumImages = albumFiles.filter(file => 
        file.mimeType.startsWith('image/')
    );

    const loadingToast = document.createElement('div');
    loadingToast.className = 'loading-toast';
    loadingToast.textContent = `Preparing ${albumImages.length} images...`;
    document.body.appendChild(loadingToast);

    try {
        const zip = new JSZip();
        const folder = zip.folder(albumName);
        let downloadedCount = 0;
        const totalFiles = albumImages.length;

        // Process images sequentially to avoid rate limiting
        for (const image of albumImages) {
            try {
                loadingToast.textContent = `Downloading: ${downloadedCount + 1}/${totalFiles}`;
                
                // Use the direct download URL
                const response = await fetch(image.downloadUrl);
                if (!response.ok) throw new Error('Download failed');

                const blob = await response.blob();
                folder.file(image.originalName, blob);
                downloadedCount++;
                
                // Add a small delay between downloads
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (error) {
                console.error('Error downloading image:', error);
                continue; // Continue with next image if one fails
            }
        }

        if (downloadedCount === 0) {
            throw new Error('No images were downloaded successfully');
        }

        loadingToast.textContent = 'Creating zip file...';
        
        // Generate zip with compression
        const content = await zip.generateAsync({ 
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 6
            }
        });
        
        // Trigger download
        const zipUrl = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = zipUrl;
        link.download = `${albumName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(zipUrl);

        loadingToast.textContent = `Successfully downloaded ${downloadedCount} images!`;
        setTimeout(() => document.body.removeChild(loadingToast), 3000);
    } catch (error) {
        console.error('Download error:', error);
        loadingToast.textContent = 'Download failed. Please try again.';
        setTimeout(() => document.body.removeChild(loadingToast), 3000);
    }
}

// Add helper function to get file extension
function getFileExtension(mimeType) {
    const mimeToExt = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'video/mp4': '.mp4',
        'video/quicktime': '.mov'
    };
    return mimeToExt[mimeType] || '.jpg';
}

// Function to check if welcome screen should be shown
function shouldShowWelcome() {
    const lastVisit = localStorage.getItem('lastVisit');
    const now = new Date().getTime();
    
    if (!lastVisit) {
        localStorage.setItem('lastVisit', now);
        return true;
    }

    const timeDiff = now - parseInt(lastVisit);
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff >= 24) {
        localStorage.setItem('lastVisit', now);
        return true;
    }

    return false;
}

// Show welcome screen if needed
if (shouldShowWelcome()) {
    welcomeScreen.classList.add('visible');
    document.body.style.overflow = 'hidden';
}

// Handle enter button click
enterButton.addEventListener('click', () => {
    welcomeScreen.classList.remove('visible');
    document.body.style.overflow = '';
});

// Modify the initial load to start with 'latest' category
document.addEventListener('DOMContentLoaded', () => {
    fetchGoogleDriveImages().then(() => {
        // Set 'Latest' as active category
        categoryTabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.category === 'latest') {
                tab.classList.add('active');
            }
        });
        // Show latest images
        filterImagesByCategory('latest');
    });
}); 
