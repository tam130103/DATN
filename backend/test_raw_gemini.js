const axios = require('axios');

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

if (!apiKey) {
  console.error('Set GEMINI_API_KEY or GOOGLE_API_KEY before running this script.');
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
const query =
  process.argv.slice(2).join(' ').trim() ||
  'Write a short Vietnamese social media caption about studying for exams.';

async function runTest(attempt = 1) {
  console.log(`Sending request to Gemini model ${model} (attempt ${attempt})...`);

  try {
    const response = await axios.post(
      url,
      {
        contents: [
          {
            parts: [{ text: query }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    );

    console.log('--- GEMINI RAW RESPONSE ---');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('---------------------------');
    return true;
  } catch (error) {
    const status = error.response?.status;
    console.log(
      `Error occurred (status ${status}):`,
      error.response?.data?.error?.message || error.message,
    );

    if ((status === 503 || status === 429) && attempt < 10) {
      console.log('Retrying in 2 seconds...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return runTest(attempt + 1);
    }

    return false;
  }
}

runTest();
