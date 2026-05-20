const axios = require('axios');

async function test() {
  console.log('Sending request to local NestJS server at port 3000...');
  try {
    const response = await axios.post(
      'http://localhost:3000/api/v1/posts/ai/generate-caption',
      {
        prompt: 'buồn quá muốn đi đà lạt',
        tone: 'tự nhiên'
      },
      {
        timeout: 30000,
      }
    );
    console.log('--- LOCAL SERVER RESPONSE ---');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('----------------------------');
  } catch (error) {
    console.error('Error occurred:', error.response?.data || error.message);
  }
}

test();
