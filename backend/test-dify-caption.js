const axios = require('axios');

async function test() {
  try {
    const response = await axios.post(
      'https://api.dify.ai/v1/workflows/run',
      {
        inputs: {
          topic: 'Sáng nay ở Hà Nội',
          tone: 'tự nhiên'
        },
        response_mode: 'blocking',
        user: 'datn-user-123'
      },
      {
        headers: {
          'Authorization': 'Bearer app-LHr2dB4CrbIzuCZrOMapT61E',
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(JSON.stringify(response.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error(JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
  }
}

test();
