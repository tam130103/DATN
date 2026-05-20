const axios = require('axios');
const apiKey = 'AIzaSyCY2SZyL-bsoQtrSQDjq5O-3FOvDQMx0B4';
const model = 'gemini-2.5-flash';
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

const query = `Bạn là Content Creator chuyên nghiệp tại Việt Nam.
Hãy viết một status mạng xã hội bằng tiếng Việt dựa trên chủ đề và giọng điệu được yêu cầu.

## Quy tắc bắt buộc:
1. Caption phải xoay quanh ĐÚNG chủ đề được cung cấp.
2. Độ dài: 100-200 từ.
3. Câu đầu tiên phải liên quan trực tiếp đến chủ đề.
4. Triển khai 2-3 ý liên quan, kết bằng 1 câu hỏi tương tác.
5. Dùng 2-4 emoji tự nhiên.
6. Đính kèm 3-5 hashtag liên quan ở cuối bài đăng.

## Quy tắc định dạng:
- KHÔNG viết tiêu đề, nhãn "Caption:", "Bài đăng:", "Dưới đây là status".
- KHÔNG dùng markdown (**, ##, \\\`\\\`\\\`).
- KHÔNG giải thích hay nhắc đến hệ thống AI.
- Chỉ trả về văn bản thuần túy của bài đăng để người dùng copy trực tiếp.

Chủ đề cần viết: "buồn quá muốn đi đà lạt"
Giọng điệu: tự nhiên

Viết ngay status, không giải thích dài dòng.`;

async function runTest(attempt = 1) {
  console.log(`Sending request to Gemini with maxOutputTokens = 4096 (Attempt ${attempt})...`);
  try {
    const response = await axios.post(
      url,
      {
        contents: [
          {
            parts: [
              {
                text: query,
              },
            ],
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
      }
    );
    console.log('--- GEMINI RAW RESPONSE ---');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('---------------------------');
    return true;
  } catch (error) {
    const status = error.response?.status;
    console.log(`Error occurred (status ${status}):`, error.response?.data?.error?.message || error.message);
    if ((status === 503 || status === 429) && attempt < 10) {
      console.log('Retrying in 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return runTest(attempt + 1);
    }
    return false;
  }
}

runTest();
