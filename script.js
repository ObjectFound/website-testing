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

// Add rate limiting and abuse prevention
const RATE_LIMIT = {
    downloads: {
        count: 0,
        lastReset: Date.now(),
        limit: 50 // downloads per hour
    }
};

// Function to get proper Google Drive image URL
function getGoogleDriveImageUrl(fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
}

// Function to get download URL
function getDownloadUrl(fileId) {
    return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`;
}

// Fetch images from multiple Google Drive folders
async function fetchGoogleDriveImages() {
    try {
        const allImages = [];
        const seenIds = new Set(); // Track seen image IDs
        
        for (const folder of FOLDER_IDS) {
            const DRIVE_API_URL = `https://www.googleapis.com/drive/v3/files?q='${folder.id}'+in+parents&pageSize=1000&fields=files(id,name,mimeType,createdTime,modifiedTime)&key=${API_KEY}`;
            const response = await fetch(DRIVE_API_URL);
            const data = await response.json();
            
            const folderImages = data.files
                .filter(file => !seenIds.has(file.id)) // Only include unseen images
                .map(file => {
                    seenIds.add(file.id); // Mark as seen
                    return {
                        id: file.id,
                        url: getGoogleDriveImageUrl(file.id),
                        title: file.name.split('.')[0].slice(-3).toUpperCase(),
                        originalName: file.name,
                        mimeType: file.mimeType,
                        downloadCount: 0,
                        downloadUrl: getDownloadUrl(file.id),
                        timestamp: Math.max(
                            new Date(file.createdTime).getTime(),
                            new Date(file.modifiedTime).getTime()
                        ),
                        albumId: folder.id,
                        albumName: folder.name
                    };
                });
            
            albumsMap.set(folder.id, folderImages);
            allImages.push(...folderImages);
        }
        
        // Store unique images
        images = [...new Set(allImages)];
        
        // Show Latest category by default
        categoryTabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.category === 'latest') {
                tab.classList.add('active');
            }
        });
        filterImagesByCategory('latest');
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
    
    imagesToLoad.forEach(image => {
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

// Update infinite scroll to prevent duplicates
window.addEventListener('scroll', () => {
    if (isLoading || currentCategory === 'albums' || currentCategory === 'latest') return;
    
    const currentScrollPosition = window.scrollY;
    if (currentScrollPosition > lastScrollPosition && 
        (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
        
        isLoading = true;
        
        // Only load more for 'all' category and prevent duplicates
        if (currentCategory === 'all') {
            const uniqueImages = [...new Set([...images])];
            loadImages(uniqueImages, true);
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
    
    switch(category) {
        case 'latest':
            // Get all images from all folders and sort by timestamp
            const allFolderImages = [];
            albumsMap.forEach(folderImages => {
                allFolderImages.push(...folderImages);
            });
            
            const latestImages = [...new Set(allFolderImages)]
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 300);
            loadImages(latestImages, true);
            break;
        case 'albums':
            showAlbumView();
            break;
        case 'all':
        default:
            const uniqueImages = [...new Set([...images])];
            loadImages(uniqueImages, true);
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

        albumCard.querySelector('.album-download-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            downloadAlbum(folder.id, folder.name);
        });

        gallery.appendChild(albumCard);
    });
}

// Update the downloadAlbum function
let isDownloading = false;

async function downloadAlbum(albumId, albumName) {
    if (isDownloading) return;
    isDownloading = true;
    
    const loadingToast = document.createElement('div');
    loadingToast.className = 'loading-toast';
    loadingToast.textContent = `Preparing files...`;
    document.body.appendChild(loadingToast);

    try {
        const albumFiles = albumsMap.get(albumId);
        if (!albumFiles) {
            alert('No files found in this album');
            return;
        }

        // Filter only images
        const albumImages = albumFiles.filter(file => 
            file.mimeType.startsWith('image/')
        );

        if (albumImages.length === 0) {
            alert('No images found in this album');
            return;
        }

        // Create zip instance
        const zip = new JSZip();
        const folder = zip.folder(albumName);
        let downloadedCount = 0;
        const totalFiles = albumImages.length;
        const failedFiles = [];

        // Download files sequentially
        for (const file of albumImages) {
            try {
                loadingToast.textContent = `Downloading file ${downloadedCount + 1}/${totalFiles}`;
                
                // Fetch file with timeout and retry
                const response = await fetchWithRetry(file.downloadUrl);
                
                if (!response.ok) {
                    throw new Error(`Failed to download ${file.originalName}`);
                }

                const blob = await response.blob();
                
                // Add file to zip with original name
                folder.file(file.originalName, blob);
                downloadedCount++;

            } catch (error) {
                console.error(`Error downloading ${file.originalName}:`, error);
                failedFiles.push(file.originalName);
                continue;
            }
        }

        if (downloadedCount === 0) {
            throw new Error('No files were downloaded successfully');
        }

        // Create and download zip
        loadingToast.textContent = 'Creating zip file...';
        const content = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 5 }
        });

        // Download zip file
        const zipUrl = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = zipUrl;
        link.download = `${albumName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(zipUrl);

        // Show completion message
        if (failedFiles.length > 0) {
            loadingToast.textContent = `Downloaded ${downloadedCount} files. ${failedFiles.length} files failed.`;
        } else {
            loadingToast.textContent = `Successfully downloaded ${downloadedCount} files!`;
        }
        setTimeout(() => document.body.removeChild(loadingToast), 3000);

    } catch (error) {
        console.error('Download error:', error);
        loadingToast.textContent = 'Download failed. Please try again.';
        setTimeout(() => document.body.removeChild(loadingToast), 3000);
    } finally {
        isDownloading = false;
    }
}

// Add helper function for fetch with retry
async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': '*/*',
                },
                timeout: 30000 // 30 second timeout
            });
            
            if (response.ok) return response;
            
            // If response wasn't ok, wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        } catch (error) {
            if (i === retries - 1) throw error;
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
    throw new Error('Failed after retries');
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

// Initialize with 'all' category
document.addEventListener('DOMContentLoaded', () => {
    categoryTabs.forEach(tab => tab.classList.remove('active'));
    document.querySelector('[data-category="all"]').classList.add('active');
    fetchGoogleDriveImages();
});

// Update download warning
window.addEventListener('beforeunload', (e) => {
    if (isDownloading) {
        e.preventDefault();
        const message = 'Download in progress. Are you sure you want to leave?';
        e.returnValue = message;
        return message;
    }
}); 
