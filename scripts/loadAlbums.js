import { imageLoader } from './imageLoader.js';

const albumsContainer = document.getElementById('albums');
const nextAlbumsButton = document.getElementById('nextAlbumsButton');
const previousAlbumsButton = document.getElementById('previousAlbumsButton');
const backButton = document.getElementById('backButton');
const nextButton = document.getElementById('nextButton');
const previousButton = document.getElementById('previousButton');
const albumTitleText = document.getElementById('albumtitletext');
const imageTitleText = document.getElementById('imagetitletext');


let albumsData = [];
let currentIndexAlbums = 0;
const albumsPerPageLarge = 8;
const albumsPerPageMedium = 9;

function loadAlbums() {
    nextButton.style.display = 'none';
    previousButton.style.display = 'none';
    backButton.style.display = 'none';
    albumTitleText.style.display = 'block';
    imageTitleText.style.display = 'none';
    fetch('./data/albums.json')
        .then(response => response.json())
        .then(data => {
            albumsData = data;
            currentIndexAlbums = 0;
            displayAlbums();
        })
        .catch(error => console.error('Error loading albums:', error));
}

loadAlbums();

function displayAlbums() {
    albumsContainer.innerHTML = '';
    const albumsPerPage = window.innerWidth >= 1024 ? albumsPerPageLarge : albumsPerPageMedium;

    const startIndex = currentIndexAlbums;
    const endIndex = Math.min(currentIndexAlbums + albumsPerPage, albumsData.length);

    for (let i = startIndex; i < endIndex; i++) {
        const album = albumsData[i];

        const albumThumbnail = document.createElement('div');
        albumThumbnail.classList.add('album-thumbnail');
        albumThumbnail.innerHTML = `
            <img src="${album.coverImagePath}" alt="${album.name}">
            <p>${album.name}</p>
        `;
        albumThumbnail.addEventListener('click', () => {
            imageLoader(album.imagesFolderPath);
            backButton.style.display = 'block';
            albumsContainer.style.display = 'none';
            
        });
        albumsContainer.appendChild(albumThumbnail);
    }

    previousAlbumsButton.style.display = startIndex === 0 ? 'none' : 'block';
    nextAlbumsButton.style.display = endIndex >= albumsData.length ? 'none' : 'block';

    currentIndexAlbums = startIndex;
}

backButton.addEventListener('click', () => {
    backButton.style.display = 'none';
    albumsContainer.style.display = 'block';
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
        const albumsPerPage = window.innerWidth >= 1024 ? albumsPerPageLarge : albumsPerPageMedium;
        currentIndexAlbums -= albumsPerPage;
        if (currentIndexAlbums < 0)
        {
            currentIndexAlbums = 0;
        }
        displayAlbums();
    }
    else if (event.key === 'ArrowRight') {
        const albumsPerPage = window.innerWidth >= 1024 ? albumsPerPageLarge : albumsPerPageMedium;
        currentIndexAlbums += albumsPerPage;
        if (currentIndexAlbums >= albumsData.length)
        {
            currentIndexAlbums -= albumsPerPage;
        }
        displayAlbums();
    }
    else if (event.key === 'Escape') {
        backButton.style.display = 'none';
        albumsContainer.style.display = 'block';
    }
});

nextAlbumsButton.addEventListener('click', () => {
    const albumsPerPage = window.innerWidth >= 1024 ? albumsPerPageLarge : albumsPerPageMedium;
    currentIndexAlbums += albumsPerPage;
    displayAlbums();
});

previousAlbumsButton.addEventListener('click', () => {
    const albumsPerPage = window.innerWidth >= 1024 ? albumsPerPageLarge : albumsPerPageMedium;
    currentIndexAlbums -= albumsPerPage;
    if(currentIndexAlbums < 0)
    {
        currentIndexAlbums = 0;
    }
    displayAlbums();
});

export { loadAlbums };
