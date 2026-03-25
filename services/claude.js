const axios = require('axios');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

async function analyzeBook(bookTitle, author, chapter) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  let prompt = `You are an expert literary analyst and music curator who creates deeply thoughtful playlists that capture the essence, mood, and atmosphere of books.

Your task is to analyze a book (or specific chapter) and recommend songs that would serve as the perfect soundtrack for reading it.

Book Title: ${bookTitle}`;

  if (author) {
    prompt += `\nAuthor: ${author}`;
  }

  if (chapter) {
    prompt += `\nChapter/Section: ${chapter}

IMPORTANT: Since a specific chapter is mentioned, you must think deeply about what typically happens at this point in the book. Consider:
- The narrative arc: Is this early setup, rising action, climax, or resolution?
- Character development: What emotional journey are characters likely experiencing?
- Typical themes and tensions that emerge in this part of the story
- The pacing and intensity at this stage of the book
- Any iconic scenes or moments commonly associated with this chapter

Base your mood analysis and song selections on the specific emotional landscape of THIS chapter, not just the book as a whole.`;
  }

  prompt += `

First, think through your analysis:
1. What is the historical/cultural setting of this work?
2. What are the dominant emotional undercurrents?
3. What is the pacing—contemplative, urgent, dreamlike, intense?
4. What themes resonate—love, loss, adventure, existential questioning, social commentary?
5. What would the characters listen to, or what music captures their inner world?

Then provide your recommendations in this exact JSON format:
{
  "era": "A evocative description of the time period or atmosphere the book evokes (e.g., 'Regency England drawing rooms and rain-swept moors' or 'Post-war American disillusionment')",
  "moods": ["mood1", "mood2", "mood3", "mood4"],
  "genres": ["genre1", "genre2", "genre3"],
  "songs": [
    {"title": "Song Title", "artist": "Artist Name"},
    ...
  ],
  "playlistName": "A creative, evocative playlist name that captures the book's essence",
  "playlistDescription": "A poetic 1-2 sentence description of what this playlist evokes"
}

Guidelines for song selection:
- Include 12-15 songs that are available on Spotify
- Mix iconic tracks with thoughtful deeper cuts
- Consider instrumental pieces for contemplative works
- Match the emotional arc—don't just pick one mood
- Include songs from various decades if they fit the feeling
- Avoid clichés; be creative and unexpected in your choices

Respond ONLY with the JSON object, no additional text.`;

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
