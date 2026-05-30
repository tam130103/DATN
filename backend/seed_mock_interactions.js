const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const mainUserConfig = {
  email: 'tam@gmail.com',
  password: 'Tam130103',
  name: 'Lê Hồng Tám',
  username: 'tam_le',
  bio: 'Sinh viên khoa CNTT - Đang thực hiện Đồ án tốt nghiệp hệ thống Mạng xã hội.'
};

const fakeUsersConfig = [
  {
    email: 'nguyena@gmail.com',
    password: 'Password123',
    name: 'Nguyễn Văn An',
    username: 'an_nguyen',
    bio: 'Developer đam mê NodeJS, React và thiết kế hệ thống phân tán.'
  },
  {
    email: 'tranb@gmail.com',
    password: 'Password123',
    name: 'Trần Thị Bình',
    username: 'binh_tran',
    bio: 'UI/UX Designer. Thiết kế trải nghiệm người dùng hiện đại và trực quan.'
  },
  {
    email: 'lec@gmail.com',
    password: 'Password123',
    name: 'Lê Văn Cường',
    username: 'cuong_le',
    bio: 'AI Engineer. Đam mê Python, Large Language Models và tích hợp chatbot.'
  },
  {
    email: 'hoangd@gmail.com',
    password: 'Password123',
    name: 'Hoàng Thị Dung',
    username: 'dung_hoang',
    bio: 'Project Manager. Thích cafe, thảo luận công nghệ và tối ưu quy trình làm việc.'
  }
];

async function getOrRegisterUser(config) {
  let token = '';
  let user = null;

  console.log(`Checking/Registering user: ${config.email}...`);
  try {
    // Try to login
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: config.email,
      password: config.password
    });
    token = loginRes.data.accessToken;
    user = loginRes.data.user;
    console.log(`✓ Logged in existing user: ${config.email}`);
  } catch (err) {
    // If login fails, register the user
    console.log(`User ${config.email} not found or incorrect credentials. Registering new...`);
    try {
      await axios.post(`${API_URL}/auth/register`, {
        email: config.email,
        password: config.password,
        name: config.name
      });
      console.log(`✓ Registered user: ${config.email}`);
      await delay(8000); // delay 8s to prevent rate limiting on next login/register

      // Login to get token
      const loginRes = await axios.post(`${API_URL}/auth/login`, {
        email: config.email,
        password: config.password
      });
      token = loginRes.data.accessToken;
      user = loginRes.data.user;
    } catch (regErr) {
      console.error(`✗ Failed to register/login ${config.email}:`, regErr.response?.data || regErr.message);
      throw regErr;
    }
  }

  // Update profile details (excluding avatarUrl to avoid Cloudinary validation error)
  try {
    await delay(1000);
    const updateRes = await axios.patch(
      `${API_URL}/users/me`,
      {
        username: config.username,
        name: config.name,
        bio: config.bio
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    user = updateRes.data;
    console.log(`✓ Updated profile for ${config.username} (${config.name})`);
  } catch (updateErr) {
    console.warn(`⚠ Warning: Could not update profile for ${config.username}:`, updateErr.response?.data || updateErr.message);
  }

  return { token, user };
}

async function followUser(token, targetUserId, username, targetUsername) {
  try {
    await axios.post(`${API_URL}/users/${targetUserId}/follow`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✓ ${username} followed ${targetUsername}`);
  } catch (err) {
    console.warn(`⚠ Warning: ${username} could not follow ${targetUsername}:`, err.response?.data || err.message);
  }
}

async function createPost(token, caption) {
  try {
    const res = await axios.post(`${API_URL}/posts`, { caption }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✓ Created post: "${caption.substring(0, 40)}..."`);
    return res.data;
  } catch (err) {
    console.error(`✗ Failed to create post:`, err.response?.data || err.message);
    return null;
  }
}

async function likePost(token, postId) {
  try {
    await axios.post(`${API_URL}/posts/${postId}/like`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✓ Liked post ID: ${postId}`);
  } catch (err) {
    console.warn(`⚠ Warning: Could not like post ${postId}:`, err.response?.data || err.message);
  }
}

async function createComment(token, postId, content, parentId = null) {
  try {
    const res = await axios.post(
      `${API_URL}/posts/${postId}/comments`,
      { content, parentId },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    console.log(`✓ Created comment: "${content}"`);
    return res.data;
  } catch (err) {
    console.error(`✗ Failed to create comment:`, err.response?.data || err.message);
    return null;
  }
}

async function createConversation(token, isGroup, participantIds, name = null) {
  try {
    const res = await axios.post(
      `${API_URL}/conversations`,
      { isGroup, participantIds, name },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    console.log(`✓ Created/Found conversation (Group: ${isGroup}, Name: ${name})`);
    return res.data;
  } catch (err) {
    console.error(`✗ Failed to create conversation:`, err.response?.data || err.message);
    return null;
  }
}

async function sendMessage(token, conversationId, content) {
  try {
    const res = await axios.post(
      `${API_URL}/conversations/${conversationId}/messages`,
      { content },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    console.log(`✓ Sent message: "${content.substring(0, 40)}..."`);
    return res.data;
  } catch (err) {
    console.error(`✗ Failed to send message:`, err.response?.data || err.message);
    return null;
  }
}

async function run() {
  console.log('=== STARTING SEED MOCK INTERACTIONS ===');
  console.log(`Backend API Endpoint: ${API_URL}`);

  // 1. Authenticate & Setup Main User
  let mainUser;
  try {
    mainUser = await getOrRegisterUser(mainUserConfig);
  } catch (e) {
    console.error('Fatal Error: Cannot setup main user tam@gmail.com. Is the backend server running at localhost:3000?', e.message);
    process.exit(1);
  }

  // 2. Authenticate & Setup Fake Users
  const fakeUsers = [];
  for (const config of fakeUsersConfig) {
    try {
      await delay(8000); // generous delay to avoid rate limit (ThrottlerException)
      const result = await getOrRegisterUser(config);
      fakeUsers.push(result);
    } catch (e) {
      console.warn(`Skipping user ${config.email} due to registration error.`);
    }
  }

  if (fakeUsers.length === 0) {
    console.error('Fatal Error: No fake users could be created. Exiting.');
    process.exit(1);
  }

  console.log('\n--- SETTING UP FOLLOW RELATIONSHIPS ---');
  // 3. Mutual Follows between Main User and all Fake Users
  for (const fake of fakeUsers) {
    if (fake && fake.user) {
      // Main user follows fake user
      await followUser(mainUser.token, fake.user.id, mainUser.user.username, fake.user.username);
      await delay(500);
      // Fake user follows main user
      await followUser(fake.token, mainUser.user.id, fake.user.username, mainUser.user.username);
      await delay(500);
    }
  }

  // Make fake users follow each other to build a network
  for (let i = 0; i < fakeUsers.length; i++) {
    for (let j = 0; j < fakeUsers.length; j++) {
      if (i !== j && fakeUsers[i] && fakeUsers[j]) {
        await followUser(fakeUsers[i].token, fakeUsers[j].user.id, fakeUsers[i].user.username, fakeUsers[j].user.username);
        await delay(500);
      }
    }
  }

  console.log('\n--- CREATING POSTS ---');
  // 4. Create Posts
  // Main User Posts
  const mainPost1 = await createPost(
    mainUser.token,
    'Hôm nay mình hoàn thành đồ án tốt nghiệp Mạng xã hội nội bộ. Hệ thống tích hợp nhắn tin realtime, bảng tin, tương tác bài viết và chatbot AI thông minh. Rất mong mọi người trải nghiệm và góp ý để hoàn thiện hơn nhé! #DATN #SocialNetwork #AI'
  );
  await delay(800);

  const mainPost2 = await createPost(
    mainUser.token,
    'Vừa hoàn thiện xong việc cài đặt Web Analytics của Vercel cho ứng dụng Frontend. Theo dõi hoạt động realtime siêu mượt và chi tiết luôn các bạn! Tiện lợi vô cùng.'
  );
  await delay(800);

  // Fake User Posts
  const fakePosts = [];
  const postCaptions = [
    'Chào cả nhà! Mình vừa tham gia mạng xã hội này. Có anh em nào đang làm đồ án tốt nghiệp về mảng Web/Mobile muốn giao lưu lập nhóm học chung không? Mình đang tìm hiểu NestJS và NestJS WebSockets.',
    'Mới thiết kế xong bộ layout UI/UX cho ứng dụng học trực tuyến mới. Mọi người xem thử tone màu pastel này có hợp mắt không nhé? 🎨✨ Rất cần những nhận xét thẳng thắn từ anh em frontend.',
    'Cuối tuần rồi làm tách cà phê và review code thôi. Code chạy mượt không lỗi, test pass hết, cảm giác thật sướng! Chúc mọi người cuối tuần vui vẻ!'
  ];

  for (let i = 0; i < Math.min(fakeUsers.length, postCaptions.length); i++) {
    if (fakeUsers[i]) {
      const post = await createPost(fakeUsers[i].token, postCaptions[i]);
      if (post) {
        fakePosts.push(post);
      }
      await delay(800);
    }
  }

  console.log('\n--- CREATING ENGAGEMENTS (LIKES & COMMENTS) ---');
  // 5. Fake Users Like Main User's Posts
  if (mainPost1) {
    for (const fake of fakeUsers) {
      if (fake) {
        await likePost(fake.token, mainPost1.id);
        await delay(300);
      }
    }
  }
  if (mainPost2) {
    // Some users like the second post
    if (fakeUsers[0]) {
      await likePost(fakeUsers[0].token, mainPost2.id);
      await delay(300);
    }
    if (fakeUsers[1]) {
      await likePost(fakeUsers[1].token, mainPost2.id);
      await delay(300);
    }
  }

  // 6. Fake Users Comment on Main User's Posts
  if (mainPost1) {
    // Comment 1 from Nguyen Van An
    let comment1;
    if (fakeUsers[0]) {
      comment1 = await createComment(
        fakeUsers[0].token,
        mainPost1.id,
        'Dự án xịn quá Tám ơi! Giao diện mượt mà, phản hồi nhanh lắm. Phần nhắn tin realtime dùng Socket.IO chạy rất mượt.'
      );
      await delay(600);
    }

    // Comment 2 from Tran Thi Binh
    let comment2;
    if (fakeUsers[1]) {
      comment2 = await createComment(
        fakeUsers[1].token,
        mainPost1.id,
        'Tone màu tối (dark mode) của web thiết kế rất dịu mắt, layout bento grid hiển thị thông tin trực quan. Đúng gu mình luôn!'
      );
      await delay(600);
    }

    // Comment 3 from Le Van Cuong
    if (fakeUsers[2]) {
      await createComment(
        fakeUsers[2].token,
        mainPost1.id,
        'Đã test thử các tính năng AI gợi ý hashtag và tạo caption, kết quả phản hồi rất tự nhiên và nhanh. Good job bro!'
      );
      await delay(600);
    }

    // Replies from Main User
    if (comment1) {
      await createComment(
        mainUser.token,
        mainPost1.id,
        'Cảm ơn An nhé, mình đã tối ưu hóa database index và tối giản hóa payload API để tốc độ load được nhanh nhất đó!',
        comment1.id
      );
      await delay(600);
    }

    if (comment2) {
      await createComment(
        mainUser.token,
        mainPost1.id,
        'Cảm ơn Bình nhiều nhé! Nhờ có sự góp ý về mặt UX từ bạn trước đây nên mình mới chỉnh lại khoảng cách và padding hợp lý hơn đó.',
        comment2.id
      );
      await delay(600);
    }
  }

  if (mainPost2) {
    // Comment on post 2
    let comment4;
    if (fakeUsers[3]) {
      comment4 = await createComment(
        fakeUsers[3].token,
        mainPost2.id,
        'Gắn Vercel Analytics xong là thống kê được cả thiết bị lẫn nguồn truy cập của người dùng luôn. Rất thích hợp để báo cáo slide thuyết trình đồ án!'
      );
      await delay(600);
    }

    if (comment4) {
      await createComment(
        mainUser.token,
        mainPost2.id,
        'Dạ đúng rồi chị Dung, cái này giúp em có số liệu trực quan để bỏ vào slide thuyết trình hội đồng báo cáo sắp tới luôn ạ.',
        comment4.id
      );
      await delay(600);
    }
  }

  console.log('\n--- CREATING DIRECT MESSAGE CHATS ---');
  // 7. Create Direct Messages between main user and fakes
  // Chat with Nguyen Van An
  if (fakeUsers[0]) {
    const chatAn = await createConversation(mainUser.token, false, [fakeUsers[0].user.id]);
    if (chatAn) {
      await sendMessage(fakeUsers[0].token, chatAn.id, 'Chào Tám, dự án này bạn làm trong bao lâu thế? Một mình gánh cả back và front luôn à?');
      await delay(500);
      await sendMessage(mainUser.token, chatAn.id, 'Chào An, mình làm ròng rã tầm 3 tháng đó bạn. Backend viết bằng NestJS, Frontend dùng React Vite TypeScript.');
      await delay(500);
      await sendMessage(fakeUsers[0].token, chatAn.id, 'Đỉnh thật! Nhìn mượt mà chuyên nghiệp không thua gì các app thực tế đâu. Có gặp khó khăn gì phần Socket.IO không?');
      await delay(500);
      await sendMessage(mainUser.token, chatAn.id, 'Lúc đầu cấu hình cors và quản lý state tin nhắn hơi rối, nhưng sau khi phân chia gateway hợp lý thì chạy ngon lành rồi An.');
      await delay(500);
    }
  }

  // Chat with Tran Thi Binh
  if (fakeUsers[1]) {
    const chatBinh = await createConversation(mainUser.token, false, [fakeUsers[1].user.id]);
    if (chatBinh) {
      await sendMessage(fakeUsers[1].token, chatBinh.id, 'Tám ơi, slide báo cáo phần UI bạn làm đến đâu rồi? Có cần mình phụ chỉnh sửa bố cục slide cho nghệ thuật tí không?');
      await delay(500);
      await sendMessage(mainUser.token, chatBinh.id, 'Ôi thế thì tốt quá Bình! Mình đang để slide dạng basic trắng đen nhìn hơi thô sơ. Lát mình gửi file qua Canva bạn xem giúp mình nha.');
      await delay(500);
      await sendMessage(fakeUsers[1].token, chatBinh.id, 'Ok bạn, cứ gửi link Canva qua đây nhé, mình vào layout và phối màu lại cho chuẩn chỉ.');
      await delay(500);
      await sendMessage(mainUser.token, chatBinh.id, 'Cảm ơn Bình nhiều nha!');
      await delay(500);
    }
  }

  // Chat with Le Van Cuong
  if (fakeUsers[2]) {
    const chatCuong = await createConversation(mainUser.token, false, [fakeUsers[2].user.id]);
    if (chatCuong) {
      await sendMessage(fakeUsers[2].token, chatCuong.id, 'Tám ơi, chiều nay tầm 4h rảnh đi làm tách cà phê bóng bàn về phần AI Chatbot chút không? Mình có mấy ý tưởng nâng cấp prompt.');
      await delay(500);
      await sendMessage(mainUser.token, chatCuong.id, 'Chiều nay 4h ok nha Cường, mình rảnh. Quán cà phê cũ gần trường đúng không?');
      await delay(500);
      await sendMessage(fakeUsers[2].token, chatCuong.id, 'Đúng rồi, quán cà phê High Lands đối diện cổng trường nha.');
      await delay(500);
      await sendMessage(mainUser.token, chatCuong.id, 'Ok chốt lịch, hẹn gặp Cường lúc 4h.');
      await delay(500);
    }
  }

  console.log('\n--- CREATING GROUP MESSAGE CHAT ---');
  // 8. Create Group Chat with Main User, An, Binh, Dung
  const groupParticipantIds = [mainUser.user.id];
  for (const fake of fakeUsers) {
    if (fake && fake.user) {
      groupParticipantIds.push(fake.user.id);
    }
  }

  // Filter out the main user for participantIds list as required by createConversation
  const otherParticipantIds = groupParticipantIds.filter((id) => id !== mainUser.user.id);

  if (otherParticipantIds.length >= 2) {
    const groupChat = await createConversation(
      mainUser.token,
      true,
      otherParticipantIds,
      'Nhóm Đồ Án Tốt Nghiệp 2026'
    );

    if (groupChat) {
      // Find who is present
      const hasAn = fakeUsers[0];
      const hasBinh = fakeUsers[1];
      const hasDung = fakeUsers[3];

      if (hasDung) {
        await sendMessage(hasDung.token, groupChat.id, 'Chào cả nhóm, hôm nay chị Dung lập nhóm này để chúng ta dễ thảo luận và báo cáo tiến độ chuẩn bị đồ án tốt nghiệp nhé.');
        await delay(500);
      }
      if (hasAn) {
        await sendMessage(hasAn.token, groupChat.id, 'Dạ em chào chị Dung và mọi người! Em đã hoàn thành phần slide thuyết trình cơ bản và dàn ý báo cáo rồi ạ.');
        await delay(500);
      }
      await sendMessage(mainUser.token, groupChat.id, 'Dạ em chào chị! Về phần code demo, em đã deploy frontend lên Vercel và backend lên Render thành công, hệ thống đã chạy ổn định ạ.');
      await delay(500);
      if (hasBinh) {
        await sendMessage(hasBinh.token, groupChat.id, 'Em chào cả nhà! Em đang chỉnh sửa lại thiết kế slide của An cho đồng bộ và chuyên nghiệp hơn, chiều nay là xong ạ.');
        await delay(500);
      }
      if (hasDung) {
        await sendMessage(hasDung.token, groupChat.id, 'Tuyệt vời, tiến độ nhóm rất tốt! Sáng mai 9h chúng ta sẽ meeting online để duyệt thử slide và chạy thử demo một lượt nhé.');
        await delay(500);
      }
      await sendMessage(mainUser.token, groupChat.id, 'Dạ vâng, em sẽ chuẩn bị môi trường demo sẵn sàng ạ.');
      await delay(500);
      if (hasAn) {
        await sendMessage(hasAn.token, groupChat.id, 'Dạ vâng chị Dung.');
        await delay(500);
      }
    }
  } else {
    console.log('Skipping group conversation because we do not have enough fake users registered.');
  }

  console.log('\n=== SEED MOCK INTERACTIONS COMPLETED SUCCESSFULLY ===');
  console.log(`Main User: ${mainUserConfig.email} | Pass: ${mainUserConfig.password}`);
}

run().catch((err) => {
  console.error('\n✗ Seed process failed with error:', err.response?.data || err.message);
});
