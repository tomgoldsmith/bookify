document.addEventListener('DOMContentLoaded', () => {
  setupFormHandler();
  setupTypeahead();
});

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function setupTypeahead() {
  const input = document.getElementById('bookTitle');
  const suggestions = document.getElementById('suggestions');
  const authorInput = document.getElementById('author');

  let selectedIndex = -1;
  let currentSuggestions = [];

  const searchBooks = debounce(async (query) => {
    if (query.length < 2) {
      suggestions.classList.add('hidden');
      return;
    }

    try {
      const response = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=6&fields=title,author_name,first_publish_year,cover_i`
      );
      const data = await response.json();

      currentSuggestions = data.docs || [];
      selectedIndex = -1;

      if (currentSuggestions.length === 0) {
        suggestions.classList.add('hidden');
        return;
      }

      suggestions.innerHTML = currentSuggestions.map((book, index) => {
        const author = book.author_name ? book.author_name[0] : 'Unknown Author';
        const year = book.first_publish_year || '';
        const coverId = book.cover_i;
        const coverUrl = coverId
          ? `https://covers.openlibrary.org/b/id/${coverId}-S.jpg`
          : null;

        return `
          <div class="suggestion-item" data-index="${index}">
            ${coverUrl
              ? `<img src="${coverUrl}" alt="" class="suggestion-cover">`
              : `<div class="suggestion-cover-placeholder"></div>`
            }
            <div class="suggestion-info">
              <div class="suggestion-title">${escapeHtml(book.title)}</div>
              <div class="suggestion-author">${escapeHtml(author)}${year ? ` (${year})` : ''}</div>
            </div>
          </div>
        `;
      }).join('');

      suggestions.classList.remove('hidden');
    } catch (error) {
      console.error('Search error:', error);
      suggestions.classList.add('hidden');
    }
  }, 300);

  input.addEventListener('input', (e) => {
    searchBooks(e.target.value.trim());
  });

  input.addEventListener('keydown', (e) => {
    const items = suggestions.querySelectorAll('.suggestion-item');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
      updateSelection(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, -1);
      updateSelection(items);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      selectSuggestion(selectedIndex);
    } else if (e.key === 'Escape') {
      suggestions.classList.add('hidden');
    }
  });

  function updateSelection(items) {
    items.forEach((item, index) => {
      item.classList.toggle('selected', index === selectedIndex);
    });
    if (selectedIndex >= 0) {
      items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  function selectSuggestion(index) {
    const book = currentSuggestions[index];
    if (book) {
      input.value = book.title;
      if (book.author_name && book.author_name[0]) {
        authorInput.value = book.author_name[0];
      }
      suggestions.classList.add('hidden');
    }
  }

  suggestions.addEventListener('click', (e) => {
    const item = e.target.closest('.suggestion-item');
    if (item) {
      const index = parseInt(item.dataset.index, 10);
      selectSuggestion(index);
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-wrapper') && !e.target.closest('.search-box')) {
      suggestions.classList.add('hidden');
    }
  });

  input.addEventListener('focus', () => {
    if (currentSuggestions.length > 0 && input.value.length >= 2) {
      suggestions.classList.remove('hidden');
    }
  });
}

function setupFormHandler() {
  const form = document.getElementById('book-form');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
      bookTitle: document.getElementById('bookTitle').value.trim(),
      author: document.getElementById('author').value.trim(),
      chapter: document.getElementById('chapter').value.trim()
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
  const hero = document.getElementById('hero');
  const loading = document.getElementById('loading');
  const result = document.getElementById('result');
  const error = document.getElementById('error');
  const generateBtn = document.getElementById('generate-btn');

  form.classList.add('hidden');
  hero.classList.add('hidden');
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

  document.getElementById('era').textContent = data.analysis.era;
  document.getElementById('moods').textContent = data.analysis.moods.join(', ');
  document.getElementById('genres').textContent = data.analysis.genres.join(', ');

  document.getElementById('playlist-name').textContent = data.playlist.name;
  document.getElementById('playlist-description').textContent = data.playlist.description;
  document.getElementById('track-count').textContent = `${data.playlist.totalSongs} songs`;

  const tracksList = document.getElementById('tracks');
  tracksList.innerHTML = data.playlist.songs.map((song, index) => `
    <li class="track-item">
      <span class="track-num">${index + 1}</span>
      <div class="track-info">
        <div class="track-title">${escapeHtml(song.title)}</div>
        <div class="track-artist">${escapeHtml(song.artist)}</div>
      </div>
      <div class="track-links">
        <a href="${song.spotifySearchUrl}" target="_blank" class="btn-link btn-spotify" title="Search on Spotify">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
        </a>
        <a href="${song.youtubeSearchUrl}" target="_blank" class="btn-link btn-youtube" title="Search on YouTube">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        </a>
      </div>
    </li>
  `).join('');

  result.classList.remove('hidden');
  result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showError(message) {
  const form = document.getElementById('book-form');
  const hero = document.getElementById('hero');
  const loading = document.getElementById('loading');
  const result = document.getElementById('result');
  const error = document.getElementById('error');

  form.classList.add('hidden');
  hero.classList.add('hidden');
  loading.classList.add('hidden');
  result.classList.add('hidden');
  error.classList.remove('hidden');

  document.getElementById('error-message').textContent = message;
}

function resetForm() {
  const form = document.getElementById('book-form');
  const hero = document.getElementById('hero');
  const loading = document.getElementById('loading');
  const result = document.getElementById('result');
  const error = document.getElementById('error');

  form.classList.remove('hidden');
  hero.classList.remove('hidden');
  loading.classList.add('hidden');
  result.classList.add('hidden');
  error.classList.add('hidden');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
