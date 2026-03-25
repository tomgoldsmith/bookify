const express = require('express');
const router = express.Router();
const { analyzeBook } = require('../services/claude');

// Generate playlist endpoint (no Spotify auth required)
router.post('/generate', async (req, res) => {
  const { bookTitle, author, chapter, chapterDescription } = req.body;

  if (!bookTitle) {
    return res.status(400).json({ error: 'Book title is required' });
  }

  try {
    // Analyze the book with Claude
    console.log(`Analyzing: "${bookTitle}" by ${author || 'Unknown'}`);
    const analysis = await analyzeBook(bookTitle, author, chapter, chapterDescription);
    console.log(`Claude suggested ${analysis.songs.length} songs`);

    // Generate Spotify search URLs for each song
    const songsWithLinks = analysis.songs.map(song => ({
      title: song.title,
      artist: song.artist,
      spotifySearchUrl: `https://open.spotify.com/search/${encodeURIComponent(song.title + ' ' + song.artist)}`,
      youtubeSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(song.title + ' ' + song.artist)}`
    }));

    res.json({
      success: true,
      analysis: {
        era: analysis.era,
        moods: analysis.moods,
        genres: analysis.genres
      },
      playlist: {
        name: analysis.playlistName,
        description: analysis.playlistDescription,
        songs: songsWithLinks,
        totalSongs: songsWithLinks.length
      }
    });
  } catch (err) {
    console.error('Playlist generation error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Failed to generate playlist',
      details: err.message
    });
  }
});

module.exports = router;
