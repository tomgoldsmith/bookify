const express = require('express');
const router = express.Router();
const { analyzeBook } = require('../services/claude');
const { createPlaylistFromSongs } = require('../services/spotify');
const { refreshTokenIfNeeded } = require('./auth');

// Generate playlist endpoint
router.post('/generate', refreshTokenIfNeeded, async (req, res) => {
  const { bookTitle, author, chapter, chapterDescription } = req.body;

  if (!bookTitle) {
    return res.status(400).json({ error: 'Book title is required' });
  }

  try {
    // Step 1: Analyze the book with Claude
    console.log(`Analyzing: "${bookTitle}" by ${author || 'Unknown'}`);
    const analysis = await analyzeBook(bookTitle, author, chapter, chapterDescription);
    console.log(`Claude suggested ${analysis.songs.length} songs`);

    // Step 2: Create Spotify playlist
    const accessToken = req.session.accessToken;
    const result = await createPlaylistFromSongs(
      accessToken,
      analysis.songs,
      analysis.playlistName,
      analysis.playlistDescription
    );

    // Step 3: Return combined result
    res.json({
      success: true,
      analysis: {
        era: analysis.era,
        moods: analysis.moods,
        genres: analysis.genres
      },
      playlist: {
        name: result.playlistName,
        url: result.playlistUrl,
        id: result.playlistId,
        tracksFound: result.totalFound,
        tracksRequested: result.totalRequested,
        tracks: result.foundSongs,
        notFound: result.notFoundSongs
      }
    });
  } catch (err) {
    console.error('Playlist generation error:', err.response?.data || err.message);

    if (err.response?.status === 401) {
      return res.status(401).json({ error: 'Spotify authentication expired. Please reconnect.' });
    }

    res.status(500).json({
      error: 'Failed to generate playlist',
      details: err.message
    });
  }
});

module.exports = router;
