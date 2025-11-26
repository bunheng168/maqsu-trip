const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQYZZZbzCKQ5X4If91dMyhDKwJAil4qtK23fsDBctNciNemV-qMRSiN0rUHTazIxuWmpNrbQ6ghD6gu/pub?gid=685795691&single=true&output=csv';
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
let dateToDayMap = {}; // Maps date strings to day numbers
let userHasNavigated = false; // Track if user has manually navigated

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

// Check if a slide has passed (its end time is before current time)
function hasSlidePassed(index) {
    if (index < 0 || index >= slidesData.length) return false;
    
    const slideData = slidesData[index];
    if (!slideData) return false;
    
    const currentTime = getCurrentTimeInMinutes();
    const currentDate = new Date();
    const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    
    // Check if the slide is on a different date
    const slideDate = slideData.day ? parseDate(slideData.day.trim()) : null;
    
    if (slideDate) {
        // Compare dates (ignoring time)
        const slideDateOnly = new Date(slideDate.getFullYear(), slideDate.getMonth(), slideDate.getDate());
        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        if (slideDateOnly < todayOnly) {
            // Slide is on a past date
            return true;
        } else if (slideDateOnly > todayOnly) {
            // Slide is on a future date - not passed
            return false;
        }
        // Same date, check time below
    }
    
    // If no end time, can't determine if passed
    if (!slideData.end) return false;
    
    const endTime = timeToMinutes(slideData.end);
    const startTime = timeToMinutes(slideData.start);
    
    // Handle cases where end time is past midnight (activity spans midnight)
    if (endTime < startTime) {
        // Activity spans midnight
        // If current time is before start time, the activity hasn't started yet
        if (currentTime < startTime) {
            return false; // Activity hasn't started
        }
        // If current time is after end time (which is next day), activity has passed
        return currentTime >= endTime;
    }
    
    // Normal case: activity doesn't span midnight
    return currentTime > endTime;
}

// Find the current destination based on date and time
function findCurrentDestinationIndex(data) {
    const currentTime = getCurrentTimeInMinutes();
    const currentDate = new Date();
    const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    
    // First, filter activities for today's date
    const todayActivities = [];
    for (let i = 0; i < data.length; i++) {
        const slideData = data[i];
        if (!slideData) continue;
        
        const slideDate = slideData.day ? parseDate(slideData.day.trim()) : null;
        
        if (slideDate) {
            // Compare dates (ignoring time)
            const slideDateOnly = new Date(slideDate.getFullYear(), slideDate.getMonth(), slideDate.getDate());
            const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            
            // Only include activities from today
            if (slideDateOnly.getTime() === todayOnly.getTime()) {
                todayActivities.push({ index: i, data: slideData });
            }
        }
    }
    
    // If we have activities for today, find the current one based on time
    if (todayActivities.length > 0) {
        // First, try to find an activity that's currently happening
        for (let i = 0; i < todayActivities.length; i++) {
            const activity = todayActivities[i];
            const startTime = timeToMinutes(activity.data.start);
            const endTime = timeToMinutes(activity.data.end);
            
            // Handle cases where end time is past midnight
            if (endTime < startTime) {
                // Activity spans midnight
                if (currentTime >= startTime || currentTime <= endTime) {
                    return activity.index;
                }
            } else {
                // Normal case
                if (currentTime >= startTime && currentTime <= endTime) {
                    return activity.index;
                }
            }
        }
        
        // If no current activity, find the next upcoming activity for today
        for (let i = 0; i < todayActivities.length; i++) {
            const activity = todayActivities[i];
            const startTime = timeToMinutes(activity.data.start);
            if (currentTime < startTime) {
                return activity.index;
            }
        }
        
        // If all today's activities have passed, show the last one for today
        return todayActivities[todayActivities.length - 1].index;
    }
    
    // No activities for today - find the next upcoming activity (could be future days)
    for (let i = 0; i < data.length; i++) {
        const slideData = data[i];
        if (!slideData) continue;
        
        const slideDate = slideData.day ? parseDate(slideData.day.trim()) : null;
        
        if (slideDate) {
            const slideDateOnly = new Date(slideDate.getFullYear(), slideDate.getMonth(), slideDate.getDate());
            const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            
            // If this is a future date, or same date with future time
            if (slideDateOnly > todayOnly) {
                return i;
            } else if (slideDateOnly.getTime() === todayOnly.getTime()) {
                // Same date but we already checked today's activities above
                // This shouldn't happen, but just in case
                const startTime = timeToMinutes(slideData.start);
                if (currentTime < startTime) {
                    return i;
                }
            }
        } else {
            // No date info - check by time only (fallback behavior)
            const startTime = timeToMinutes(slideData.start);
            if (currentTime < startTime) {
                return i;
            }
        }
    }
    
    // Default to first activity if all activities are in the past
    return 0;
}

// Update timeline - show only items around current index, no wrap-around
function updateTimeline() {
    if (slidesData.length === 0 || !timelineContainer) return;
    
    // Ensure currentIndex is valid
    if (currentIndex < 0 || currentIndex >= slidesData.length) {
        currentIndex = Math.max(0, Math.min(currentIndex, slidesData.length - 1));
    }
    
    const itemsToShow = 5; // Show 5 items: 2 left, 1 center (active), 2 right
    const halfItems = Math.floor(itemsToShow / 2);
    
    timelineContainer.innerHTML = '';
    
    // Create timeline items without wrap-around - only show valid indices
    for (let offset = -halfItems; offset <= halfItems; offset++) {
        // Calculate the actual index without wrap-around
        let itemIndex = currentIndex + offset;
        
        // Skip items that are out of bounds (no wrapping)
        if (itemIndex < 0 || itemIndex >= slidesData.length) {
            continue; // Skip this item instead of wrapping
        }
        
        const slideData = slidesData[itemIndex];
        // Safety check: ensure slideData exists
        if (!slideData) continue;
        
        const timelineItem = document.createElement('div');
        timelineItem.classList.add('timeline-item');
        
        // Determine position relative to center - this ensures consistent styling
        // Items before currentIndex are left-item, items after are right-item
        if (offset === 0) {
            timelineItem.classList.add('active');
        } else if (offset < 0) {
            timelineItem.classList.add('left-item');
        } else if (offset > 0) {
            timelineItem.classList.add('right-item');
        }
        
        // Removed 'passed' class - all items are now clickable regardless of date
        
        // Add 'complete' class if status is complete (for visual styling)
        if (slideData.status && slideData.status.toLowerCase() === 'completed') {
            timelineItem.classList.add('complete');
        }
        
        // Get image URL or use default
        const defaultImage = 'https://i.postimg.cc/mZ9sfBH8/Cambodia-temple-9.jpg';
        const imageUrl = slideData.imageUrl && slideData.imageUrl.trim() !== '' 
            ? slideData.imageUrl.trim() 
            : defaultImage;
        
        // Format time range
        const timeRange = slideData.start && slideData.end 
            ? `${slideData.start} — ${slideData.end}`
            : '';
        
        // Get location with fallback
        const location = slideData.location || 'Unknown Location';
        
        timelineItem.innerHTML = `
            <div class="timeline-image-container">
                <img src="${imageUrl}" alt="${location}" class="timeline-image" />
            </div>
            <div class="timeline-content">
                <span class="timeline-location">${location}</span>
                ${timeRange ? `<span class="timeline-time">${timeRange}</span>` : ''}
            </div>
        `;
        
        // Handle image loading for skeleton
        const timelineImg = timelineItem.querySelector('.timeline-image');
        const timelineImageContainer = timelineItem.querySelector('.timeline-image-container');
        
        if (timelineImg && timelineImageContainer) {
            // Show skeleton while loading
            timelineImg.classList.remove('loaded');
            
            // Remove skeleton when image loads
            timelineImg.onload = function() {
                timelineImg.classList.add('loaded');
                timelineImageContainer.classList.add('image-loaded');
            };
            
            // Handle image error - fallback to default
            timelineImg.onerror = function() {
                if (timelineImg.src !== defaultImage) {
                    // Try default image
                    timelineImg.src = defaultImage;
                } else {
                    // Even if default fails, show it and remove skeleton
                    timelineImg.classList.add('loaded');
                    timelineImageContainer.classList.add('image-loaded');
                }
            };
            
            // If image is already cached, trigger load immediately
            if (timelineImg.complete && timelineImg.naturalHeight !== 0) {
                timelineImg.classList.add('loaded');
                timelineImageContainer.classList.add('image-loaded');
            }
        }
        
        // Add click handler to navigate to this slide
        timelineItem.addEventListener('click', () => {
            if (isTransitioning) return;
            
            // Prevent navigating to slides with status "complete"
            const slideData = slidesData[itemIndex];
            if (slideData && slideData.status && slideData.status.toLowerCase() === 'completed') {
                return; // Block navigation to completed items
            }
            
            if (itemIndex !== currentIndex) {
                currentIndex = itemIndex;
                userHasNavigated = true; // Mark that user has manually navigated
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
                about:  field("About"),
                day: field("Day") || field("day") || "",
                imageUrl: field("Image URL") || field("image url") || field("ImageUrl") || field("imageUrl") || field("Image") || field("image") || "",
                googleMap: field("google map") || field("Google Map") || field("googlemap") || field("GoogleMap") || field("Google Maps") || field("google maps") || field("map") || field("Map") || "",
                status: field("Status") || field("status") || ""
            });
        });

        // Build date to day number mapping
        buildDateToDayMap();

        // Start from first date (index 0)
        currentIndex = 0;

        // Create slides
        slidesData.forEach((slideData, index) => {
            const slide = document.createElement('div');
            slide.classList.add('carousel-slide', 'image-loading');
            
            // Use image URL if available, otherwise use default
            const defaultImage = 'https://i.postimg.cc/mZ9sfBH8/Cambodia-temple-9.jpg';
            const imageUrl = slideData.imageUrl && slideData.imageUrl.trim() !== '' 
                ? slideData.imageUrl.trim() 
                : defaultImage;
            
            // Add skeleton placeholder
            slide.innerHTML = `
                <div class="image-skeleton"></div>
                <div class="slide-content">
                    <div class="badges-container">
                        <div class="duration-badge">${slideData.duration}</div>
                    </div>
                    <h1 class="slide-title">${slideData.location}</h1>
                    <div class="time-range">
                        <svg class="time-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
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
            
            // Preload image
            const img = new Image();
            img.onload = function() {
                slide.style.backgroundImage = `url('${imageUrl}')`;
                slide.classList.remove('image-loading');
                slide.classList.add('image-loaded');
            };
            img.onerror = function() {
                // If image fails to load, use default and still remove skeleton
                slide.style.backgroundImage = `url('${defaultImage}')`;
                slide.classList.remove('image-loading');
                slide.classList.add('image-loaded');
            };
            img.src = imageUrl;
        });

        // Initialize to first slide (index 0)
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
// Parse date string (DD/MM/YYYY) to Date object for sorting
function parseDate(dateStr) {
    if (!dateStr) return null;
    
    const trimmed = dateStr.trim();
    // Check if it's in DD/MM/YYYY format
    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
        const day = parseInt(match[1]);
        const month = parseInt(match[2]) - 1; // Month is 0-indexed
        const year = parseInt(match[3]);
        return new Date(year, month, day);
    }
    
    return null;
}

// Build date to day number mapping
function buildDateToDayMap() {
    dateToDayMap = {};
    
    // Collect all unique dates
    const uniqueDates = new Set();
    slidesData.forEach(slide => {
        if (slide.day && slide.day.trim()) {
            uniqueDates.add(slide.day.trim());
        }
    });
    
    // Convert to array and sort chronologically
    const sortedDates = Array.from(uniqueDates).sort((a, b) => {
        const dateA = parseDate(a);
        const dateB = parseDate(b);
        
        // If both are valid dates, sort by date
        if (dateA && dateB) {
            return dateA - dateB;
        }
        
        // If only one is a date, date comes first
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        
        // If neither is a date, sort alphabetically
        return a.localeCompare(b);
    });
    
    // Map each date to its day number (1, 2, 3, ...)
    sortedDates.forEach((date, index) => {
        dateToDayMap[date] = index + 1;
    });
}

function updateHeaderDay() {
    if (slidesData.length === 0 || !headerDay) return;
    
    const currentSlideData = slidesData[currentIndex];
    if (currentSlideData && currentSlideData.day) {
        const dayValue = currentSlideData.day.trim();
        
        // Check if it's a date format (DD/MM/YYYY)
        if (parseDate(dayValue)) {
            // It's a date, look up the day number
            const dayNumber = dateToDayMap[dayValue];
            if (dayNumber) {
                headerDay.textContent = `Day ${dayNumber}`;
            } else {
                // Fallback: use the date as is
                headerDay.textContent = dayValue;
            }
        } else {
            // It's not a date, check if it's just a number
            if (/^\d+$/.test(dayValue)) {
                // It's just a number, add "Day" prefix
                headerDay.textContent = `Day ${dayValue}`;
            } else if (!/^day\s+/i.test(dayValue)) {
                // It doesn't start with "Day", add it
                headerDay.textContent = `Day ${dayValue}`;
            } else {
                // It already has "Day", use as is (but capitalize properly)
                headerDay.textContent = dayValue.charAt(0).toUpperCase() + dayValue.slice(1);
            }
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
            detailsDescription.innerHTML = `<h2>About</h2><p>${currentSlideData.about}</p>`;
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
    
    // Don't allow sliding forward if we're already on the last page
    if (currentIndex >= slides.length - 1) {
        return; // Block navigation - already at last page
    }
    
    const nextIndex = currentIndex + 1;
    
    // Prevent navigating to slides with status "complete"
    const nextSlideData = slidesData[nextIndex];
    if (nextSlideData && nextSlideData.status && nextSlideData.status.toLowerCase() === 'completed') {
        return; // Block navigation to completed items
    }
    
    currentIndex = nextIndex;
    userHasNavigated = true; // Mark that user has manually navigated
    updateSlides();
}

function prevSlide() {
    if (isTransitioning || slides.length === 0) return;
    
    // Don't allow sliding backward if we're already on the first page
    if (currentIndex <= 0) {
        return; // Block navigation - already at first page
    }
    
    // Calculate the immediate previous slide index
    const prevIndex = currentIndex - 1;
    
    // Prevent navigating to slides with status "complete"
    const prevSlideData = slidesData[prevIndex];
    if (prevSlideData && prevSlideData.status && prevSlideData.status.toLowerCase() === 'completed') {
        return; // Block navigation to completed items
    }
    
    currentIndex = prevIndex;
    userHasNavigated = true; // Mark that user has manually navigated
    updateSlides();
}

window.addEventListener('resize', () => {
    if (!isTransitioning) {
        const offset = currentIndex * window.innerWidth;
        container.style.transform = `translate3d(-${offset}px, 0, 0)`;
    }
});

// Auto-update disabled - starts from first date and stays there
// (Removed auto-update to current destination since we start from first date)

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

// Make timeline smaller when scrolling down - using Intersection Observer for better reliability
function initTimelineScroll() {
    const timelineEl = document.getElementById('timelineContainer');
    const detailsEl = document.getElementById('detailsSection');
    
    if (!timelineEl) return;
    
    // Method 1: Use Intersection Observer to detect when details section comes into view
    if (detailsEl && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const headerDayEl = document.getElementById('headerDay');
                const mobileNavEl = document.querySelector('.mobile-nav');
                
                if (entry.isIntersecting) {
                    timelineEl.classList.add('scrolled');
                    // Hide headerDay and mobile-nav when details section is visible
                    if (headerDayEl) {
                        headerDayEl.classList.add('hidden');
                    }
                    if (mobileNavEl) {
                        mobileNavEl.classList.add('hidden');
                    }
                } else {
                    // Only remove if scrolled back to top
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    if (scrollTop < 100) {
                        timelineEl.classList.remove('scrolled');
                        // Show headerDay and mobile-nav when at top
                        if (headerDayEl) {
                            headerDayEl.classList.remove('hidden');
                        }
                        if (mobileNavEl) {
                            mobileNavEl.classList.remove('hidden');
                        }
                    }
                }
            });
        }, {
            threshold: 0.1, // Trigger when 10% of details section is visible
            rootMargin: '-100px 0px 0px 0px' // Start shrinking before it's fully in view
        });
        
        observer.observe(detailsEl);
    }
    
    // Method 2: Fallback to scroll listener
    function handleScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
        const headerDayEl = document.getElementById('headerDay');
        const mobileNavEl = document.querySelector('.mobile-nav');
        
        if (scrollTop > 100) {
            timelineEl.classList.add('scrolled');
            // Hide headerDay and mobile-nav when scrolled
            if (headerDayEl) {
                headerDayEl.classList.add('hidden');
            }
            if (mobileNavEl) {
                mobileNavEl.classList.add('hidden');
            }
        } else {
            timelineEl.classList.remove('scrolled');
            // Show headerDay and mobile-nav when at top
            if (headerDayEl) {
                headerDayEl.classList.remove('hidden');
            }
            if (mobileNavEl) {
                mobileNavEl.classList.remove('hidden');
            }
        }
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check
}

// Initialize after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTimelineScroll);
} else {
    setTimeout(initTimelineScroll, 200);
}