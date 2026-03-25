const axios = require('axios');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

async function analyzeBook(bookTitle, author, chapter) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  let prompt = `You are a music curator creating playlists that capture books' moods and atmosphere.

Book: ${bookTitle}`;

  if (author) {
    prompt += `\nAuthor: ${author}`;
  }

  if (chapter) {
    prompt += `\nChapter: ${chapter}

Consider what typically happens at this point in the book - the narrative arc, emotional journey, pacing, and key themes of this specific chapter.`;
  }

  prompt += `

Analyze this book and return a JSON object with:
- "era": evocative description of the time period/atmosphere
- "moods": array of 3-4 mood words
- "genres": array of 2-3 music genres that fit
- "songs": array of 12-15 objects with "title" and "artist" (real songs on Spotify)
- "playlistName": creative playlist name
- "playlistDescription": one poetic sentence about the playlist

Mix well-known songs with deeper cuts. Be creative and unexpected.

Return ONLY valid JSON, no other text.`;

  const response = await axios.post(
    ANTHROPIC_API_URL,
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    }
  );

  const content = response.data.content[0].text;

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse Claude response as JSON');
  }

  return JSON.parse(jsonMatch[0]);
}

module.exports = { analyzeBook };
