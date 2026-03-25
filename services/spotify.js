const axios = require('axios');

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

async function searchTrack(accessToken, title, artist) {
  const query = `track:${title} artist:${artist}`;

  const response = await axios.get(`${SPOTIFY_API_BASE}/search`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    params: {
      q: query,
      type: 'track',
      limit: 1
    }
  });

  const tracks = response.data.tracks.items;
  return tracks.length > 0 ? tracks[0] : null;
}

async function searchTrackFallback(accessToken, title, artist) {
  // Try exact search first
  let track = await searchTrack(accessToken, title, artist);

  if (!track) {
    // Fallback: search with just the title and artist name combined
    const response = await axios.get(`${SPOTIFY_API_BASE}/search`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      params: {
        q: `${title} ${artist}`,
        type: 'track',
        limit: 1
      }
    });

    const tracks = response.data.tracks.items;
    track = tracks.length > 0 ? tracks[0] : null;
  }

  return track;
}

async function getCurrentUser(accessToken) {
  const response = await axios.get(`${SPOTIFY_API_BASE}/me`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return response.data;
}

async function createPlaylist(accessToken, userId, name, description) {
  const response = await axios.post(
    `${SPOTIFY_API_BASE}/users/${userId}/playlists`,
    {
      name,
      description,
      public: false
    },
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
}

async function addTracksToPlaylist(accessToken, playlistId, trackUris) {
  // Spotify allows max 100 tracks per request
  const chunks = [];
  for (let i = 0; i < trackUris.length; i += 100) {
    chunks.push(trackUris.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    await axios.post(
      `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`,
      {
        uris: chunk
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

async function createPlaylistFromSongs(accessToken, songs, playlistName, playlistDescription) {
  // Get current user
  const user = await getCurrentUser(accessToken);

  // Search for all songs and collect URIs
  const trackUris = [];
  const foundSongs = [];
  const notFoundSongs = [];

  for (const song of songs) {
    try {
      const track = await searchTrackFallback(accessToken, song.title, song.artist);
      if (track) {
        trackUris.push(track.uri);
        foundSongs.push({
          title: track.name,
          artist: track.artists.map(a => a.name).join(', '),
          album: track.album.name,
          image: track.album.images[0]?.url
        });
      } else {
        notFoundSongs.push(song);
      }
    } catch (error) {
      console.error(`Error searching for ${song.title} by ${song.artist}:`, error.message);
      notFoundSongs.push(song);
    }
  }

  if (trackUris.length === 0) {
    throw new Error('No songs could be found on Spotify');
  }

  // Create the playlist
  const playlist = await createPlaylist(
    accessToken,
    user.id,
    playlistName,
    playlistDescription
  );

  // Add tracks to the playlist
  await addTracksToPlaylist(accessToken, playlist.id, trackUris);

  return {
    playlistUrl: playlist.external_urls.spotify,
    playlistId: playlist.id,
    playlistName: playlist.name,
    foundSongs,
    notFoundSongs,
    totalFound: foundSongs.length,
    totalRequested: songs.length
  };
}

module.exports = {
  searchTrack,
  searchTrackFallback,
  getCurrentUser,
  createPlaylist,
  addTracksToPlaylist,
  createPlaylistFromSongs
};
