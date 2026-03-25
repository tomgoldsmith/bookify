const axios = require('axios');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

async function analyzeBook(bookTitle, author, chapter, chapterDescription) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  let prompt = `You are a music curator who creates playlists that capture the mood and atmosphere of books.

Analyze the following book and suggest songs that would complement its reading:

Book Title: ${bookTitle}`;

  if (author) {
    prompt += `\nAuthor: ${author}`;
  }
  if (chapter) {
    prompt += `\nChapter/Section: ${chapter}`;
  }
  if (chapterDescription) {
    prompt += `\nChapter Description/Context: ${chapterDescription}`;
  }

  prompt += `

Based on this book (or chapter), provide:
1. The era/time period the book is set in or evokes
2. 3-5 mood descriptors (e.g., melancholic, triumphant, mysterious)
3. Suggested music genres that fit
4. A list of 12-15 specific song recommendations with artist names

Respond in this exact JSON format:
{
  "era": "description of era/time period",
  "moods": ["mood1", "mood2", "mood3"],
  "genres": ["genre1", "genre2"],
  "songs": [
    {"title": "Song Title", "artist": "Artist Name"},
    ...
  ],
  "playlistName": "A creative playlist name based on the book",
  "playlistDescription": "A short description for the playlist"
}

Focus on songs that are likely to be available on Spotify. Mix well-known tracks with some deeper cuts that fit the mood.`;

  const response = await axios.post(
    ANTHROPIC_API_URL,
    {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
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

  // Extract JSON from the response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse Claude response as JSON');
  }

  return JSON.parse(jsonMatch[0]);
}

module.exports = { analyzeBook };
