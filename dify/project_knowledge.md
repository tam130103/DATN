# THÔNG TIN DỰ ÁN: DATN SOCIAL NETWORK

## Tổng quan
- **Tên dự án**: DATN Social Network (Mạng xã hội đồ án tốt nghiệp)
- **Mục tiêu**: Xây dựng một không gian mạng xã hội thu nhỏ cho phép người dùng chia sẻ khoảnh khắc, tương tác và trò chuyện theo thời gian thực, tích hợp sâu các tính năng Trí Tuệ Nhân Tạo (AI) nhằm nâng cao trải nghiệm người dùng.
- **Tác giả / Nhóm phát triển**: Sinh viên (HUMG) làm Đồ án tốt nghiệp (DATN).

## Công nghệ sử dụng
- **Frontend**: React.js, TypeScript, Vite, TailwindCSS, Zustand (State Management), React Router.
- **Backend**: NestJS, TypeScript, TypeORM, PostgreSQL, Socket.io (WebSockets cho real-time).
- **Hệ thống AI**: Tích hợp Dify (LLM Workflow/Agent) kết hợp các model như DeepSeek, Gemini.
- **Cơ sở hạ tầng**: Docker & Docker Compose, Supabase (Database Hosting), Cloudinary (Lưu trữ ảnh/video).

## Các tính năng chính (Core Features)
1. **Quản lý tài khoản**: Đăng ký, Đăng nhập (Local & Google OAuth), quản lý Profile.
2. **Giao tiếp & Tương tác (Feed)**: 
   - Đăng bài viết kèm hình ảnh/video.
   - Thích (Like), Bình luận (Comment), Theo dõi (Follow).
3. **Nhắn tin thời gian thực (Chat)**:
   - Chat 1-1 giữa người dùng với nhau hoặc chat nhóm.
   - Trạng thái online, "đang gõ..." (typing indicator), và đánh dấu đã đọc.
4. **Đồng bộ Facebook**: Auto-sync bài đăng từ một Fanpage Facebook cụ thể về bản tin hệ thống qua Webhooks.

## Các tính năng Trí Tuệ Nhân Tạo (AI Features) - Tích hợp Dify
Hệ thống mạng xã hội DATN Social nhấn mạnh vào sự hỗ trợ của AI cho người dùng ở mọi khía cạnh:
1. **AI Chatbot Companion (Trợ lý nhắn tin)**: 
   - Chatbot AI đóng vai trò như một người bạn hoặc trợ lý hỗ trợ trực tiếp bên trong mục Messages. 
   - Có khả năng ghi nhớ ngữ cảnh hội thoại (memory) dựa vào ID cuộc hội thoại (`difyConversationId`).
2. **Draft Caption (Tạo nội dung tự động)**: 
   - Khi người dùng đăng bài, chỉ cần gõ vài từ khóa, AI sẽ thay người dùng viết nháp một đoạn trạng thái (caption) dài, tự nhiên và phong phú. Cắt bỏ hoàn toàn các thẻ lập trình hoặc tư duy nháp của LLM.
3. **Suggest Hashtags (Gợi ý Hashtag)**: 
   - Đọc nội dung người dùng viết và trả về danh sách các hashtags (`#`) phù hợp để tăng độ nhận diện bài viết.
4. **AI Content Moderation (Kiểm duyệt nội dung ngầm)**:
   - Mỗi lần người dùng đăng bài, backend gọi AI check độ an toàn của từ ngữ (Safety & Sentiment analysis). Nếu chứa từ chửi bậy, bạo lực hay vi phạm, AI sẽ gắn cờ đánh dấu không an toàn.

## Kiến trúc Database (Mô hình Dữ liệu)
- **User**: Lưu thông tin người đăng ký, mật khẩu băm, avatar mạng xã hội.
- **Post & Media**: Lưu bài viết và đường dẫn link ảnh/video trên Cloudinary.
- **Engagement**: Lưu lượt like, comment.
- **Conversation & Message**: Hệ thống chat. Conversation (`difyConversationId` dùng để liên kết chuỗi hội thoại với Dify).
- **Notifications**: Lưu thông báo sự kiện mạng xã hội.

## Quy định và Tone giọng của AI Chatbot
- **Bắt buộc**: Chatbot là "Trợ lý ảo DATN", xưng "Tôi" hoặc "Mình", gọi người dùng là "Bạn". 
- **Tính cách**: Thân thiện, hỗ trợ, rành mạch, hiểu biết sâu về dự án mạng xã hội này. 
- Nếu người dùng hỏi các câu liên quan đến đồ án hoặc tính năng ("làm thế nào để đăng bài?", "bạn có tính năng gì?"), AI phải lấy thông tin từ tài liệu dự án này để giải đáp một cách chính xác.
