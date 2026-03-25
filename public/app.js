document.addEventListener('DOMContentLoaded', () => {
  checkAuthStatus();
  setupFormHandler();
  handleUrlParams();
});

async function checkAuthStatus() {
  try {
    const response = await fetch('/api/auth/status');
    const data = await response.json();

    const loggedOut = document.getElementById('logged-out');
    const loggedIn = document.getElementById('logged-in');
    const mainContent = document.getElementById('main-content');

    if (data.authenticated) {
      loggedOut.classList.add('hidden');
      loggedIn.classList.remove('hidden');
      mainContent.classList.remove('hidden');

      if (data.user) {
        document.getElementById('user-name').textContent = data.user.displayName || data.user.id;
        const avatar = document.getElementById('user-avatar');
        if (data.user.image) {
          avatar.src = data.user.image;
        } else {
          avatar.style.display = 'none';
        }
      }
    } else {
      loggedOut.classList.remove('hidden');
      loggedIn.classList.add('hidden');
      mainContent.classList.add('hidden');
    }
  } catch (error) {
    console.error('Auth check failed:', error);
  }
}

function handleUrlParams() {
  const params = new URLSearchParams(window.location.search);

  if (params.get('error')) {
    const error = params.get('error');
    showError(`Authentication failed: ${error}`);
  }

  // Clean up URL
  if (params.has('success') || params.has('error')) {
    window.history.replaceState({}, document.title, '/');
  }
}

function setupFormHandler() {
  const form = document.getElementById('book-form');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
      bookTitle: document.getElementById('bookTitle').value.trim(),
      author: document.getElementById('author').value.trim(),
      chapter: document.getElementById('chapter').value.trim(),
      chapterDescription: document.getElementById('chapterDescription').value.trim()
    };

    if (!formData.bookTitle) {
      showError('Please enter a book title');
      return;
    }

    await generatePlaylist(formData);
  });
}

async function generatePlaylist(formData) {
  const form = document.getElementById('book-form');
  const loading = document.getElementById('loading');
  const result = document.getElementById('result');
  const error = document.getElementById('error');
  const generateBtn = document.getElementById('generate-btn');

  // Show loading state
  form.classList.add('hidden');
  loading.classList.remove('hidden');
  result.classList.add('hidden');
  error.classList.add('hidden');
  generateBtn.disabled = true;

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.details || 'Failed to generate playlist');
    }

    displayResult(data);
  } catch (err) {
    console.error('Generation error:', err);
    showError(err.message);
  } finally {
    loading.classList.add('hidden');
    generateBtn.disabled = false;
  }
}

function displayResult(data) {
  const result = document.getElementById('result');

  // Display analysis
  document.getElementById('era').textContent = data.analysis.era;
  document.getElementById('moods').textContent = data.analysis.moods.join(', ');
  document.getElementById('genres').textContent = data.analysis.genres.join(', ');

  // Display playlist info
  document.getElementById('playlist-name').textContent = data.playlist.name;
  document.getElementById('track-count').textContent =
    `${data.playlist.tracksFound} of ${data.playlist.tracksRequested} songs added`;

  const playlistLink = document.getElementById('playlist-link');
  playlistLink.href = data.playlist.url;

  // Spotify embed
  const embedContainer = document.getElementById('spotify-embed');
  embedContainer.innerHTML = `
    <iframe
      src="https://open.spotify.com/embed/playlist/${data.playlist.id}?utm_source=generator&theme=0"
      width="100%"
      height="352"
      frameBorder="0"
      allowfullscreen=""
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy">
    </iframe>
  `;

  // Display tracks
  const tracksList = document.getElementById('tracks');
  tracksList.innerHTML = data.playlist.tracks.map(track => `
    <li>
      ${track.image ? `<img src="${track.image}" alt="" class="track-image">` : ''}
      <div class="track-info">
        <div class="track-title">${escapeHtml(track.title)}</div>
        <div class="track-artist">${escapeHtml(track.artist)}</div>
      </div>
    </li>
  `).join('');

  // Display not found songs
  const notFoundSection = document.getElementById('not-found');
  const notFoundList = document.getElementById('not-found-list');

  if (data.playlist.notFound && data.playlist.notFound.length > 0) {
    notFoundList.innerHTML = data.playlist.notFound.map(song =>
      `<li>${escapeHtml(song.title)} - ${escapeHtml(song.artist)}</li>`
    ).join('');
    notFoundSection.classList.remove('hidden');
  } else {
    notFoundSection.classList.add('hidden');
  }

  result.classList.remove('hidden');
}

function showError(message) {
  const form = document.getElementById('book-form');
  const loading = document.getElementById('loading');
  const result = document.getElementById('result');
  const error = document.getElementById('error');

  form.classList.add('hidden');
  loading.classList.add('hidden');
  result.classList.add('hidden');
  error.classList.remove('hidden');

  document.getElementById('error-message').textContent = message;
}

function resetForm() {
  const form = document.getElementById('book-form');
  const loading = document.getElementById('loading');
  const result = document.getElementById('result');
  const error = document.getElementById('error');

  form.classList.remove('hidden');
  loading.classList.add('hidden');
  result.classList.add('hidden');
  error.classList.add('hidden');

  // Optionally reset form fields
  // document.getElementById('book-form').reset();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
