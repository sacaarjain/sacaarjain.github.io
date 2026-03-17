const imagesContainer = document.getElementById('images');
const nextButton = document.getElementById('nextButton');
const previousButton = document.getElementById('previousButton');
const backButton = document.getElementById('backButton');
const albumTitleText = document.getElementById('albumtitletext');
const imageTitleText = document.getElementById('imagetitletext');
const overlayToggleBtn = document.getElementById('overlayToggleBtn');

let currentAlbumImages = []; // Store currently selected album images
let currentIndexImages = 0;
const imagesPerPageLarge = 8;
const imagesPerPageMedium = 9;

// ── Overlay toggle (desktop only) ───────────────────────────────────────────
const EYE_OPEN = `Camera Info: <span class="eye-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></span>`;
const EYE_CLOSED = `Camera Info: <span class="eye-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg></span>`;

let overlayEnabled = localStorage.getItem('overlayEnabled') !== 'false';

function applyOverlayToggle(animate = false) {
    const eyeSpan = overlayToggleBtn.querySelector('.eye-icon');
    if (animate && eyeSpan) {
        eyeSpan.style.opacity = '0';
        setTimeout(() => {
            if (overlayEnabled) {
                imagesContainer.classList.remove('overlay-disabled');
                overlayToggleBtn.innerHTML = EYE_OPEN;
            } else {
                imagesContainer.classList.add('overlay-disabled');
                overlayToggleBtn.innerHTML = EYE_CLOSED;
            }
            overlayToggleBtn.querySelector('.eye-icon').style.opacity = '1';
        }, 150);
    } else {
        if (overlayEnabled) {
            imagesContainer.classList.remove('overlay-disabled');
            overlayToggleBtn.innerHTML = EYE_OPEN;
        } else {
            imagesContainer.classList.add('overlay-disabled');
            overlayToggleBtn.innerHTML = EYE_CLOSED;
        }
    }
}

applyOverlayToggle();

overlayToggleBtn.addEventListener('click', () => {
    overlayEnabled = !overlayEnabled;
    localStorage.setItem('overlayEnabled', overlayEnabled);
    applyOverlayToggle(true);
});

function imageLoader(imagesFolderPath) {
    imagesContainer.style.display = 'block';
    albumTitleText.style.display = 'none';
    imageTitleText.style.display = 'block';

    fetch(imagesFolderPath) // Fetch the JSON file containing image paths
        .then(response => response.json())
        .then(data => {
            currentAlbumImages = data.map(image => ({
                filePath: image.filePath,
                thumbnailPath: image.thumbnailPath,
                metadata: image.metadata || {}
            }));
            currentIndexImages = 0;
            displayImages();
        })
        .catch(error => console.error('Error loading album images:', error));
}

function buildMetadataHTML(metadata) {
    const fields = [
        ['Camera', metadata.cameraMaker],
        ['Model',  metadata.cameraModel],
        ['F-stop', metadata.fStop],
        ['Exposure', metadata.exposureTime],
        ['ISO', metadata.iso],
        ['Exp. bias', metadata.exposureBias],
        ['Focal length', metadata.focalLength],
        ['Max aperture', metadata.maxAperture],
        ['Metering', metadata.meteringMode],
        ['Subject dist.', metadata.subjectDistance],
        ['Flash', metadata.flashMode],
        ['Flash energy', metadata.flashEnergy],
        ['35mm equiv.', metadata.focalLength35mm],
    ];

    const rows = fields
        .filter(([, value]) => value !== undefined && value !== '')
        .map(([label, value]) => `
            <div class="metadata-row">
                <span class="metadata-label">${label}</span>
                <span class="metadata-value">${value}</span>
            </div>`)
        .join('');

    const body = rows || `<div class="metadata-unavailable">No camera details available</div>`;
    return `<div class="metadata-content"><div class="metadata-header">Camera</div>${body}</div>`;
}

function displayImages() {
    imagesContainer.innerHTML = '';
    const imagesPerPage = window.innerWidth >= 1024 ? imagesPerPageLarge : imagesPerPageMedium;
    const startIndex = currentIndexImages;
    const endIndex = Math.min(currentIndexImages + imagesPerPage, currentAlbumImages.length);

    for (let i = startIndex; i < endIndex; i++) {
        const { filePath, thumbnailPath, metadata } = currentAlbumImages[i];

        const img = document.createElement('img');
        img.src = thumbnailPath;
        img.alt = 'Image';
        img.loading = 'lazy';

        const overlay = document.createElement('div');
        overlay.classList.add('metadata-overlay');
        overlay.innerHTML = buildMetadataHTML(metadata);

        const imageWrapper = document.createElement('div');
        imageWrapper.classList.add('image-wrapper');
        imageWrapper.appendChild(img);
        imageWrapper.appendChild(overlay);

        // Desktop: click opens full res
        imageWrapper.addEventListener('click', () => {
            window.open(filePath, '_blank');
        });

        // Mobile: single tap opens full res, double tap toggles overlay
        let touchStartY = 0;
        let tapTimer = null;
        let lastTapTime = 0;

        imageWrapper.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        imageWrapper.addEventListener('touchend', (e) => {
            const touchEndY = e.changedTouches[0].clientY;
            if (Math.abs(touchEndY - touchStartY) > 10) return; // scrolling, ignore

            e.preventDefault(); // prevent click event from firing

            const now = Date.now();

            // If overlay is active, any tap dismisses it
            if (imageWrapper.classList.contains('overlay-active')) {
                imageWrapper.classList.remove('overlay-active');
                lastTapTime = 0;
                return;
            }

            if (tapTimer && now - lastTapTime < 300) {
                // Double tap — show overlay
                clearTimeout(tapTimer);
                tapTimer = null;
                imageWrapper.classList.add('overlay-active');
            } else {
                // Start timer — if no second tap comes, open image
                lastTapTime = now;
                tapTimer = setTimeout(() => {
                    tapTimer = null;
                    window.open(filePath, '_blank');
                }, 300);
            }
        });

        imagesContainer.appendChild(imageWrapper);
    }

    backButton.style.display = 'block';
    overlayToggleBtn.style.display = 'flex';
    nextButton.style.display = endIndex >= currentAlbumImages.length ? 'none' : 'block';
    previousButton.style.display = startIndex === 0 ? 'none' : 'block';
}

document.addEventListener('keydown', (event) => {
    if (backButton.style.display === 'block')
    {
        if (event.key === 'ArrowRight') {
            const imagesPerPage = window.innerWidth >= 1024 ? imagesPerPageLarge : imagesPerPageMedium;
            currentIndexImages += imagesPerPage;
            if (currentAlbumImages.length < currentIndexImages)
            {
                currentIndexImages -= imagesPerPage;
            }
            displayImages();
        }
        else if (event.key === 'ArrowLeft') {
            const imagesPerPage = window.innerWidth >= 1024 ? imagesPerPageLarge : imagesPerPageMedium;
            currentIndexImages -= imagesPerPage;
            if (currentIndexImages < 0)
            {
                currentIndexImages = 0;
            }
            displayImages();
        }
        else if (event.key === 'Escape') {
            backButton.style.display = 'none';
            overlayToggleBtn.style.display = 'none';
            imagesContainer.innerHTML = '';
            imagesContainer.style.display = 'none';
            nextButton.style.display = 'none';
            previousButton.style.display = 'none';
            imageTitleText.style.display = 'none';
            albumTitleText.style.display = 'block';
        }
    }
});

nextButton.addEventListener('click', () => {
    const imagesPerPage = window.innerWidth >= 1024 ? imagesPerPageLarge : imagesPerPageMedium;
    currentIndexImages += imagesPerPage;
    displayImages();
});

backButton.addEventListener('click', () => {
    backButton.style.display = 'none';
    overlayToggleBtn.style.display = 'none';
    imagesContainer.innerHTML = '';
    imagesContainer.style.display = 'none';
    nextButton.style.display = 'none';
    previousButton.style.display = 'none';
    imageTitleText.style.display = 'none';
    albumTitleText.style.display = 'block';
});

previousButton.addEventListener('click', () => {
    const imagesPerPage = window.innerWidth >= 1024 ? imagesPerPageLarge : imagesPerPageMedium;
    currentIndexImages -= imagesPerPage;
    if (currentIndexImages < 0)
    {
        currentIndexImages = 0;
    }
    displayImages();
});

export { imageLoader };
