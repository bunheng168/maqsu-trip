const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTE5RtiPB3DI_bnki3LDLBjNVMXz5Y0klAES0HCU_4MvzBgV68skzG7R9-MAOp-jIhYeZxaMggTZYpc/pub?gid=685795691&single=true&output=csv';
const container = document.getElementById('carousel');
const timelineContainer = document.getElementById('timeline');
const timelineWrapper = document.getElementById('timelineContainer');
const headerDay = document.getElementById('headerDay');
const detailsSection = document.getElementById('detailsSection');
const detailsDescription = document.getElementById('detailsDescription');
const detailsMap = document.getElementById('detailsMap');
const menuIcon = document.querySelector('.menu-icon');
const sideMenu = document.getElementById('sideMenu');
const menuClose = document.getElementById('menuClose');
const menuOverlayBg = document.getElementById('menuOverlayBg');
let slides = [];
let slidesData = [];
let currentIndex = 0;
let isTransitioning = false;

// Format duration from HH:MM:SS to readable format
function formatDuration(durationStr) {
    if (!durationStr) return '';
    
    // Handle format like "4:00:00" or "04:00:00"
    const parts = durationStr.split(':');
    if (parts.length >= 2) {
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        
        if (hours > 0 && minutes > 0) {
            return `${hours} Hours ${minutes} Min`;
        } else if (hours > 0) {
            return `${hours} ${hours === 1 ? 'Hour' : 'Hours'}`;
        } else if (minutes > 0) {
            return `${minutes} Min`;
        }
    }
    
    return durationStr;
}

// Format time from "10:20:00 AM" to "10:20 AM"
function formatTime(timeStr) {
    if (!timeStr) return '';
    
    // Remove seconds if present (e.g., "10:20:00 AM" -> "10:20 AM")
    return timeStr.replace(/(\d{1,2}:\d{2}):\d{2}(\s*[AP]M)/i, '$1$2');
}

// Parse time string "HH:MM" or "HH:MM AM/PM" to minutes since midnight
function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    
    // Remove any extra whitespace
    timeStr = timeStr.trim();
    
    // Check if it has AM/PM
    const hasAMPM = /AM|PM/i.test(timeStr);
    
    if (hasAMPM) {
        // Parse 12-hour format (e.g., "10:20 AM")
        const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!match) return 0;
        
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const period = match[3].toUpperCase();
        
        // Convert to 24-hour format
        if (period === 'PM' && hours !== 12) {
            hours += 12;
        } else if (period === 'AM' && hours === 12) {
            hours = 0;
        }
        
        return hours * 60 + minutes;
    } else {
        // Parse 24-hour format (e.g., "10:20" or "14:30")
        const parts = timeStr.split(':');
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]) || 0;
        return hours * 60 + minutes;
    }
}

// Get current time in minutes
function getCurrentTimeInMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
}

// Find the current destination based on time
function findCurrentDestinationIndex(data) {
    const currentTime = getCurrentTimeInMinutes();
    
    for (let i = 0; i < data.length; i++) {
        const startTime = timeToMinutes(data[i].start);
        const endTime = timeToMinutes(data[i].end);
        
        // Handle cases where end time is past midnight
        if (endTime < startTime) {
            // Activity spans midnight
            if (currentTime >= startTime || currentTime <= endTime) {
                return i;
            }
        } else {
            // Normal case
            if (currentTime >= startTime && currentTime <= endTime) {
                return i;
            }
        }
    }
    
    // If no match, find the next upcoming activity
    for (let i = 0; i < data.length; i++) {
        const startTime = timeToMinutes(data[i].start);
        if (currentTime < startTime) {
            return i;
        }
    }
    
    // Default to first activity if all activities are in the past
    return 0;
}

// Update timeline - show only items around current index, always centered
function updateTimeline() {
    if (slidesData.length === 0) return;
    
    const itemsToShow = 5; // Show 5 items: 2 left, 1 center (active), 2 right
    const halfItems = Math.floor(itemsToShow / 2);
    
    // Calculate which items to show, trying to center the active item
    let startIndex = currentIndex - halfItems;
    let endIndex = currentIndex + halfItems;
    
    // Adjust for boundaries while trying to keep active item centered
    if (startIndex < 0) {
        const adjustment = Math.abs(startIndex);
        startIndex = 0;
        endIndex = Math.min(endIndex + adjustment, slidesData.length - 1);
    }
    if (endIndex >= slidesData.length) {
        const adjustment = endIndex - slidesData.length + 1;
        endIndex = slidesData.length - 1;
        startIndex = Math.max(0, startIndex - adjustment);
    }
    
    timelineContainer.innerHTML = '';
    
    // Create timeline items for the visible range
    for (let i = startIndex; i <= endIndex; i++) {
        const slideData = slidesData[i];
        const timelineItem = document.createElement('div');
        timelineItem.classList.add('timeline-item');
        
        // Determine position relative to center
        const position = i - currentIndex;
        
        if (i === currentIndex) {
            timelineItem.classList.add('active');
        } else if (position < 0) {
            timelineItem.classList.add('left-item');
        } else {
            timelineItem.classList.add('right-item');
        }
        
        timelineItem.innerHTML = `
            <div class="timeline-bullet">
                <div class="bullet-inner"></div>
                <div class="bullet-pulse"></div>
            </div>
            <div class="timeline-content">
                <span class="timeline-location">${slideData.location}</span>
            </div>
        `;
        
        // Add click handler to navigate to this slide
        timelineItem.addEventListener('click', () => {
            if (!isTransitioning && i !== currentIndex) {
                currentIndex = i;
                updateSlides();
            }
        });
        
        timelineContainer.appendChild(timelineItem);
    }
}

fetch(csvUrl)
    .then(res => res.text())
    .then(data => {
        const rows = data.trim().split('\n').map(r => r.split(','));
        const headers = rows[0].map(h => h.trim());

        // Clear loading
        container.innerHTML = '';

        // Parse all data first
        rows.slice(1).forEach((row) => {
            const field = name => (row[headers.indexOf(name)] || "").trim();
            
            slidesData.push({
                duration: formatDuration(field("រយៈពេល")),
                location: field("ទីតាំង"),
                start: formatTime(field("ផ្តើម")),
                end: formatTime(field("ចប់")),
                activity: field("សកម្មភាព"),
                day: field("Day") || field("day") || "",
                imageUrl: field("Image URL") || field("image url") || field("ImageUrl") || field("imageUrl") || field("Image") || field("image") || "",
                googleMap: field("google map") || field("Google Map") || field("googlemap") || field("GoogleMap") || field("Google Maps") || field("google maps") || field("map") || field("Map") || ""
            });
        });

        // Find current destination index
        const currentDestinationIndex = findCurrentDestinationIndex(slidesData);
        currentIndex = currentDestinationIndex;

        // Create slides
        slidesData.forEach((slideData, index) => {
            const slide = document.createElement('div');
            slide.classList.add('carousel-slide');
            
            // Use image URL if available, otherwise use default
            const defaultImage = 'https://i.postimg.cc/mZ9sfBH8/Cambodia-temple-9.jpg';
            const imageUrl = slideData.imageUrl && slideData.imageUrl.trim() !== '' 
                ? slideData.imageUrl.trim() 
                : defaultImage;
            slide.style.backgroundImage = `url('${imageUrl}')`;
            
            slide.innerHTML = `
                <div class="slide-content">
                    <div class="badges-container">
                        <div class="duration-badge">${slideData.duration}</div>
                    </div>
                    <h1 class="slide-title">${slideData.location}</h1>
                    <div class="time-range">
                        <span>${slideData.start}</span>
                        <span class="time-separator">—</span>
                        <span>${slideData.end}</span>
                    </div>
                    <p class="slide-description">${slideData.activity}</p>
                    <div class="scroll-indicator">
                        <div class="scroll-arrow" onclick="scrollToDetails()">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 5v14M19 12l-7 7-7-7"/>
                            </svg>
                        </div>
                        <div class="scroll-text">More Information</div>
                    </div>
                </div>
            `;
            
            container.appendChild(slide);
            slides.push(slide);
        });

        // Initialize to current destination
        if (slides.length > 0) {
            slides[currentIndex].classList.add('active');
            const offset = currentIndex * window.innerWidth;
            container.style.transform = `translate3d(-${offset}px, 0, 0)`;
            updateHeaderDay();
            updateDetailsSection();
            updateTimeline();
        }

        setupTouchHandlers();
        setupKeyboardNav();
        setupMouseDrag();
    })
    .catch(err => {
        console.error('Error:', err);
        container.innerHTML = '<div class="loading"><div class="loading-spinner"></div><div>Error loading content</div></div>';
    });

function setupTouchHandlers() {
    let startX = 0, startY = 0, isDragging = false;

    container.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = true;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const diffY = Math.abs(e.touches[0].clientY - startY);
        const diffX = Math.abs(e.touches[0].clientX - startX);
        if (diffX > diffY && diffX > 10) {
            e.preventDefault();
        }
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        const diff = e.changedTouches[0].clientX - startX;
        if (Math.abs(diff) > 50 && !isTransitioning) {
            diff > 0 ? prevSlide() : nextSlide();
        }
        isDragging = false;
    }, { passive: true });
}

function setupKeyboardNav() {
    document.addEventListener('keydown', (e) => {
        if (isTransitioning) return;
        if (e.key === 'ArrowLeft') prevSlide();
        if (e.key === 'ArrowRight') nextSlide();
    });
}

function setupMouseDrag() {
    let startX = 0, isDragging = false;

    container.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        isDragging = true;
    });

    container.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        const diff = e.clientX - startX;
        if (Math.abs(diff) > 50 && !isTransitioning) {
            diff > 0 ? prevSlide() : nextSlide();
        }
        isDragging = false;
    });
}

function updateSlides() {
    isTransitioning = true;
    const offset = currentIndex * window.innerWidth;
    container.style.transform = `translate3d(-${offset}px, 0, 0)`;
    
    slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === currentIndex);
    });

    // Update header day display
    updateHeaderDay();

    // Update details section
    updateDetailsSection();

    // Update timeline to show items around current index
    updateTimeline();

    setTimeout(() => isTransitioning = false, 500);
}

// Update header day display
function updateHeaderDay() {
    if (slidesData.length === 0 || !headerDay) return;
    
    const currentSlideData = slidesData[currentIndex];
    if (currentSlideData && currentSlideData.day) {
        // Format day: if it's just a number, add "Day" prefix, otherwise use as is
        let dayText = currentSlideData.day.trim();
        // Check if it's just a number (with or without "Day" prefix)
        if (/^\d+$/.test(dayText)) {
            // It's just a number, add "Day" prefix
            headerDay.textContent = `Day ${dayText}`;
        } else if (!/^day\s+/i.test(dayText)) {
            // It doesn't start with "Day", add it
            headerDay.textContent = `Day ${dayText}`;
        } else {
            // It already has "Day", use as is (but capitalize properly)
            headerDay.textContent = dayText.charAt(0).toUpperCase() + dayText.slice(1);
        }
        headerDay.style.display = 'block';
    } else {
        headerDay.style.display = 'none';
    }
}

// Update details section with description and google map
function updateDetailsSection() {
    if (slidesData.length === 0 || !detailsSection || !detailsDescription || !detailsMap) return;
    
    const currentSlideData = slidesData[currentIndex];
    // Debug: log the google map data
    console.log('Current slide data:', currentSlideData);
    console.log('Google Map data:', currentSlideData?.googleMap);
    console.log('Google Map data type:', typeof currentSlideData?.googleMap);
    console.log('Contains iframe?', currentSlideData?.googleMap?.includes('<iframe') || currentSlideData?.googleMap?.includes('<IFRAME'));
    
    if (currentSlideData) {
        // Update description
        if (currentSlideData.activity) {
            detailsDescription.innerHTML = `<h2>About</h2><p>${currentSlideData.activity}</p>`;
        } else {
            detailsDescription.innerHTML = '';
        }
        
        // Update Google Map - Display iframe directly from spreadsheet
        if (currentSlideData.googleMap && currentSlideData.googleMap.trim() !== '') {
            const mapData = currentSlideData.googleMap.trim();
            let mapHTML = '';
            
            // Check if it's an iframe embed code
            const hasIframe = mapData.toLowerCase().includes('<iframe') || mapData.toLowerCase().includes('&lt;iframe') || mapData.includes('embed?pb=');
            
            if (hasIframe) {
                // Extract the pb parameter value from the broken data
                // Look for pb= followed by the parameter string (starts with ! and contains alphanumeric and special chars)
                const pbMatch = mapData.match(/pb=([!0-9a-zA-Z%\-_\.]+)/i);
                
                if (pbMatch) {
                    // Found the pb parameter, reconstruct the clean URL
                    const pbValue = pbMatch[1]
                        .replace(/&quot;/g, '')
                        .replace(/&amp;/g, '&')
                        .replace(/""/g, '')
                        .replace(/"/g, '')
                        .split('"')[0]  // Take only before any broken quotes
                        .split('=')[0]  // Take only before any = signs
                        .trim();
                    
                    const cleanUrl = 'https://www.google.com/maps/embed?pb=' + pbValue;
                    // Create a link to open the map in Google Maps (convert embed URL to regular map URL)
                    const mapLinkUrl = cleanUrl.replace('/embed?pb=', '/?pb=');
                    console.log('Reconstructed clean embed URL:', cleanUrl);
                    
                    // Create a clean iframe with open map button at the bottom
                    mapHTML = `<h2>Location</h2><div class="map-container"><iframe src="${cleanUrl}" width="100%" height="400" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div><div class="map-link-container"><a href="${mapLinkUrl}" target="_blank" class="map-link">Open Map</a></div>`;
                } else {
                    // Try to find embed?pb= pattern more broadly
                    const embedMatch = mapData.match(/embed\?pb=([^\s"'>]+)/i);
                    if (embedMatch) {
                        let pbValue = embedMatch[1]
                            .replace(/&quot;/g, '')
                            .replace(/&amp;/g, '&')
                            .replace(/""/g, '')
                            .replace(/"/g, '')
                            .split('"')[0]
                            .split('=')[0]
                            .trim();
                        
                        const cleanUrl = 'https://www.google.com/maps/embed?pb=' + pbValue;
                        const mapLinkUrl = cleanUrl.replace('/embed?pb=', '/?pb=');
                        console.log('Extracted embed URL:', cleanUrl);
                        mapHTML = `<h2>Location</h2><div class="map-container"><iframe src="${cleanUrl}" width="100%" height="400" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div><div class="map-link-container"><a href="${mapLinkUrl}" target="_blank" class="map-link">Open Map</a></div>`;
                    } else {
                        // Last resort: try to extract any URL pattern
                        const urlPattern = /https?:\/\/[^\s"'>]+/i;
                        const urlMatch = mapData.match(urlPattern);
                        if (urlMatch) {
                            let cleanUrl = urlMatch[0]
                                .replace(/&quot;/g, '')
                                .replace(/&amp;/g, '&')
                                .replace(/""/g, '')
                                .trim();
                            const mapLinkUrl = cleanUrl.includes('/embed') ? cleanUrl.replace('/embed', '') : cleanUrl;
                            mapHTML = `<h2>Location</h2><div class="map-container"><iframe src="${cleanUrl}" width="100%" height="400" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div><div class="map-link-container"><a href="${mapLinkUrl}" target="_blank" class="map-link">Open Map</a></div>`;
                        } else {
                            mapHTML = `<h2>Location</h2><div class="map-container"><p style="color: #fff; padding: 20px;">Unable to parse map URL from data.</p></div>`;
                        }
                    }
                }
            } else {
                // Not an iframe, display as is
                mapHTML = `<h2>Location</h2><div class="map-container">${mapData}</div>`;
            }
            
            detailsMap.innerHTML = mapHTML;
            detailsMap.style.display = 'block';
        } else {
            // No map data - hide the details-map section
            detailsMap.innerHTML = '';
            detailsMap.style.display = 'none';
        }
    }
}

function nextSlide() {
    if (isTransitioning || slides.length === 0) return;
    currentIndex = (currentIndex + 1) % slides.length;
    updateSlides();
}

function prevSlide() {
    if (isTransitioning || slides.length === 0) return;
    currentIndex = (currentIndex - 1 + slides.length) % slides.length;
    updateSlides();
}

window.addEventListener('resize', () => {
    if (!isTransitioning) {
        const offset = currentIndex * window.innerWidth;
        container.style.transform = `translate3d(-${offset}px, 0, 0)`;
    }
});

// Auto-update current destination every minute
setInterval(() => {
    const newCurrentIndex = findCurrentDestinationIndex(slidesData);
    if (newCurrentIndex !== currentIndex) {
        currentIndex = newCurrentIndex;
        updateSlides();
    }
}, 60000); // Check every minute

// Scroll to details section when arrow is clicked
function scrollToDetails() {
    const detailsSection = document.getElementById('detailsSection');
    if (detailsSection) {
        detailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Menu functionality - Side menu slides from right
if (menuIcon) {
    menuIcon.addEventListener('click', () => {
        sideMenu.classList.add('active');
        menuOverlayBg.classList.add('active');
    });
}

if (menuClose) {
    menuClose.addEventListener('click', () => {
        sideMenu.classList.remove('active');
        menuOverlayBg.classList.remove('active');
    });
}

// Close side menu when clicking on overlay background
if (menuOverlayBg) {
    menuOverlayBg.addEventListener('click', () => {
        sideMenu.classList.remove('active');
        menuOverlayBg.classList.remove('active');
    });
}