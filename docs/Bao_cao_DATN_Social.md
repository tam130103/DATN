# BÁO CÁO ĐỒ ÁN TỐT NGHIỆP
## XÂY DỰNG HỆ THỐNG MẠNG XÃ HỘI TÍCH HỢP REALTIME VÀ AI - DATN SOCIAL

Sinh viên thực hiện: Nguyễn Thế Tâm
Đơn vị đào tạo: Trường Đại học Mỏ - Địa chất
Tên project: DATN Social
Ngôn ngữ và nền tảng chính: React, TypeScript, NestJS, PostgreSQL, Socket.IO, Dify AI, Tailwind CSS, Docker

---PAGEBREAK---

# CHƯƠNG 1: CƠ SỞ LÝ THUYẾT

## 1.1 Tổng quan mạng xã hội

### 1.1.1 Khái niệm

Mạng xã hội là hệ thống phần mềm cho phép người dùng tạo hồ sơ cá nhân, kết nối với các tài khoản khác, đăng tải nội dung và thực hiện các hành vi tương tác trên cùng một nền tảng trực tuyến. Về bản chất, mạng xã hội là sự kết hợp giữa dữ liệu người dùng, dữ liệu nội dung, các quan hệ kết nối và các cơ chế lan truyền thông tin.

Trong một hệ thống mạng xã hội hiện đại, ba thành phần trung tâm thường xuất hiện là người dùng, nội dung và tương tác. Người dùng là chủ thể tạo lập hồ sơ, thiết lập quan hệ theo dõi hoặc trò chuyện. Nội dung bao gồm bài viết, ảnh, video, hashtag, nội dung AI sinh ra hoặc dữ liệu đồng bộ từ nguồn khác. Tương tác bao gồm lượt thích, bình luận, lưu bài viết, nhắn tin trực tiếp, thông báo và phản hồi theo thời gian thực. Các thành phần này kết hợp với nhau để hình thành dòng chảy dữ liệu liên tục trong toàn hệ thống.

### 1.1.2 Vai trò

Mạng xã hội đóng vai trò quan trọng trong việc kết nối người dùng ở quy mô lớn mà không phụ thuộc vào khoảng cách địa lý. Với cá nhân, đây là môi trường để chia sẻ đời sống, kiến thức, cảm xúc và duy trì các mối quan hệ. Với tổ chức, mạng xã hội còn là công cụ quảng bá thương hiệu, xây dựng cộng đồng, thu thập phản hồi và hỗ trợ vận hành nội dung.

Trong môi trường doanh nghiệp hoặc tổ chức chuyên biệt, một hệ thống mạng xã hội nội bộ hoặc bán công khai có thể giúp chuẩn hóa luồng thông tin, chủ động kiểm soát dữ liệu, quản lý người dùng và áp dụng các quy tắc vận hành riêng. Đây là lý do khiến các mô hình mạng xã hội tùy biến theo nhu cầu ngày càng được quan tâm trong thực tế phát triển phần mềm.

## 1.2 Công nghệ sử dụng

### 1.2.1 Frontend

Frontend của DATN Social được xây dựng bằng React 18 kết hợp TypeScript và Vite. React cung cấp mô hình component để tái sử dụng giao diện, trong khi TypeScript giúp kiểm soát kiểu dữ liệu ở các layer page, component, context và service. Vite đóng vai trò dev server và build tool, hỗ trợ quá trình phát triển nhanh và tối ưu gói phát hành. Về state management, project sử dụng Zustand kết hợp React Context API; server state được quản lý qua TanStack React Query. Tailwind CSS được dùng làm utility-first styling, Phosphor Icons làm hệ thống icon và Framer Motion cho animation.

Tại tầng giao diện, project tổ chức theo các trang nghiệp vụ như FeedPage, ProfilePage, ExplorePage, MessagesPage, NotificationsPage và nhóm trang quản trị. Điều này giúp mỗi nhóm nghiệp vụ có thể phát triển độc lập nhưng vẫn dùng chung các component nền như AppShell, ProtectedRoute, Avatar, NotificationBell và các service gọi API. Frontend sử dụng React Router để điều hướng, Axios để giao tiếp với backend và Socket.IO Client để cập nhật chat, trạng thái online và thông báo theo thời gian thực.

### 1.2.2 Backend

Backend của hệ thống được xây dựng trên Node.js theo phong cách NestJS. Kiến trúc module của NestJS phù hợp với project có nhiều miền chức năng như xác thực, người dùng, bài viết, tương tác, chat, thông báo, tìm kiếm, AI và quản trị. Mỗi module bao gồm controller để tiếp nhận request, service để xử lý nghiệp vụ và entity hoặc DTO để mô tả dữ liệu.

NestJS còn hỗ trợ tốt cho việc triển khai guard, decorator và cơ chế dependency injection. Trong project, `JwtAuthGuard` và `RolesGuard` được dùng để bảo vệ tài nguyên, còn các decorator như `@CurrentUser()` giúp truy xuất thông tin người dùng hiện tại một cách rõ ràng. Cấu trúc này tạo điều kiện để backend phát triển theo hướng modular, dễ kiểm thử và ít phụ thuộc chéo.

### 1.2.3 Database

Hệ quản trị cơ sở dữ liệu được sử dụng là PostgreSQL. Đây là hệ quản trị dữ liệu quan hệ mạnh, ổn định, phù hợp với các hệ thống cần đảm bảo tính toàn vẹn dữ liệu, truy vấn linh hoạt và hỗ trợ tốt cho quan hệ một-nhiều hoặc nhiều-nhiều.

Project sử dụng TypeORM để ánh xạ entity trong TypeScript sang các bảng dữ liệu. TypeORM hỗ trợ khai báo quan hệ giữa các entity, migration, truy vấn theo repository và query builder. Trong hệ thống DATN Social, đây là nền tảng quan trọng để triển khai các bảng như users, posts, comments, messages, conversations, notifications, follows, saved_posts, hashtags và reports.

### 1.2.4 Realtime

Để triển khai các chức năng yêu cầu phản hồi tức thời, hệ thống sử dụng Socket.IO. Đây là thư viện realtime phù hợp cho web application vì hỗ trợ tốt cơ chế event-driven, room-based messaging, reconnect và xác thực ở handshake.

Trong project, realtime được chia thành hai namespace chính là `/chat` và `/notifications`. Namespace chat phục vụ gửi nhận tin nhắn, hiển thị trạng thái người dùng, sự kiện đang gõ và cập nhật chưa đọc. Namespace notifications phụ trách đẩy thông báo thích, bình luận, theo dõi, đánh dấu đã đọc và cập nhật số lượng thông báo chưa xem. Cách tách này giúp luồng realtime rõ ràng và dễ mở rộng.

### 1.2.5 AI

Khối AI của DATN Social được xây dựng xoay quanh Dify API, bao gồm workflow cho sinh caption và chatbot agent cho trợ lý hội thoại. Ngoài ra, backend còn triển khai các hàm AI xử lý kiểm duyệt nội dung, gợi ý hashtag và phân tích cảm xúc. Điểm đáng chú ý là service AI có cơ chế fallback cục bộ trong trường hợp upstream AI gặp lỗi hoặc timeout, nhờ đó hệ thống không phụ thuộc hoàn toàn vào một lần gọi dịch vụ bên ngoài.

Việc tích hợp AI vào mạng xã hội tạo ra hai giá trị rõ rệt. Thứ nhất, AI hỗ trợ người dùng tạo nội dung hiệu quả hơn thông qua caption suggestion và hashtag suggestion. Thứ hai, AI hỗ trợ hệ thống duy trì chất lượng nội dung thông qua kiểm duyệt, đánh giá cảm xúc và trợ lý AI trong hội thoại. Đây là một hướng tiếp cận phù hợp với yêu cầu hiện đại hóa trải nghiệm trên nền tảng xã hội.

---PAGEBREAK---

# CHƯƠNG 2: PHÂN TÍCH VÀ THIẾT KẾ

## 2.1 Mô tả bài toán

DATN Social hướng đến bài toán xây dựng một nền tảng mạng xã hội có khả năng phục vụ cả giao tiếp cá nhân lẫn quản trị nội dung ở quy mô cộng đồng. Trong hệ thống này, người dùng có thể đăng ký, đăng nhập, cập nhật hồ sơ, đăng bài kèm ảnh hoặc video, thích bài viết, bình luận, lưu bài viết, theo dõi người dùng khác, khám phá hashtag, trao đổi qua chat realtime và nhận thông báo tức thời. Hệ thống đồng thời cung cấp một khu vực quản trị để admin giám sát người dùng, bài viết, bình luận và báo cáo vi phạm.

Khác với một hệ thống CRUD thông thường, bài toán mạng xã hội yêu cầu dữ liệu phải được kết nối chặt chẽ giữa nhiều miền chức năng. Một bài viết không chỉ cần lưu caption và media mà còn liên quan đến hashtag, mention, lượt thích, bình luận, trạng thái ghim, trạng thái kiểm duyệt và nguồn dữ liệu. Một phiên chat không chỉ là lưu message mà còn phải kiểm tra thành viên hội thoại, đồng bộ trạng thái đã đọc, xử lý kết nối socket và mở rộng được cho AI assistant. Do đó, quá trình thiết kế cần hướng đến kiến trúc rõ trách nhiệm và có khả năng phát triển dài hạn.

### 2.1.1 FDD

Dựa trên yêu cầu nghiệp vụ và cấu trúc thực tế của project, các nhóm chức năng chính của hệ thống có thể phân rã theo mô hình FDD như sau:

- Quản lý người dùng: đăng ký, đăng nhập, đăng nhập Google, cập nhật hồ sơ, theo dõi, quản lý trạng thái tài khoản.
- Quản lý bài viết: tạo bài viết, chỉnh sửa caption, ghim bài viết, hiển thị feed, hiển thị bài theo hồ sơ, bài được gắn thẻ và bài đã lưu.
- Quản lý tương tác: like, comment, lưu bài viết, trả lời bình luận và phát sinh thông báo liên quan.
- Chat realtime: tạo hội thoại, gửi nhận tin nhắn, đánh dấu đã đọc, theo dõi người dùng online và hiển thị trạng thái đang gõ.
- Thông báo realtime: nhận thông báo mới, đồng bộ unread count, đánh dấu đọc một phần hoặc toàn bộ.
- Tìm kiếm và khám phá: tìm người dùng, hashtag, nội dung xu hướng.
- AI hỗ trợ nội dung: gợi ý caption, gợi ý hashtag, kiểm duyệt nội dung, phân tích cảm xúc, trợ lý AI trong chat.
- Quản trị hệ thống: thống kê dashboard, quản lý user, kiểm duyệt bài viết, kiểm duyệt bình luận, xử lý report.

### 2.1.2 Use Case

Hai actor chính của hệ thống là User và Admin.

Với actor User, các use case tiêu biểu bao gồm đăng ký, đăng nhập, đăng nhập Google, xem feed, tạo bài viết, tải media, chỉnh sửa bài viết, bình luận, thích bài viết, lưu bài viết, theo dõi người dùng khác, tìm kiếm, nhắn tin, xem thông báo, yêu cầu AI gợi ý caption hoặc hashtag và trò chuyện với AI assistant.

Với actor Admin, các use case trọng tâm là đăng nhập quản trị, xem dashboard, thống kê người dùng và nội dung, thay đổi role người dùng, chặn hoặc mở chặn tài khoản, ẩn hoặc khôi phục bài viết, ẩn bình luận và xử lý báo cáo vi phạm. Admin có trách nhiệm đảm bảo nền tảng vận hành ổn định và đúng chính sách nội dung.

### 2.1.3 Phân rã Use Case: Đăng bài

Use case đăng bài trong DATN Social có thể được phân rã thành các bước nghiệp vụ cụ thể như sau:

1. Người dùng đăng nhập và truy cập giao diện tạo bài viết.
2. Người dùng nhập caption, có thể chèn hashtag và mention.
3. Nếu có ảnh hoặc video, frontend gửi file đến endpoint upload để backend đưa media lên Cloudinary và nhận về URL.
4. Frontend gom caption và danh sách media URL rồi gửi request tạo bài viết tới backend.
5. Backend kiểm duyệt caption bằng AI; nếu nội dung không an toàn thì từ chối tạo bài.
6. Nếu caption hợp lệ, backend tiếp tục ghi nhận telemetry phân tích cảm xúc.
7. Hệ thống lưu bài viết vào bảng posts, lưu media vào bảng media, tách hashtag vào hashtags và post_hashtags, tách mention vào post_mentions.
8. Kết quả cuối cùng được trả về dưới dạng bài viết đã enrich kèm thông tin user, media, lượt thích, số bình luận và trạng thái lưu.
9. Bài viết mới xuất hiện trên feed của người sở hữu và những người theo dõi tương ứng.

## 2.2 Luồng nghiệp vụ

### 2.2.1 Luồng feed

Khi người dùng mở feed, frontend gọi API lấy danh sách bài viết. Backend xác định danh sách tài khoản mà người dùng đang theo dõi, bổ sung user hiện tại và tài khoản bot Facebook nếu tính năng đồng bộ được bật. Từ tập user này, hệ thống truy vấn các bài viết đang ở trạng thái hiển thị, ưu tiên bài ghim của chính người dùng lên đầu, sau đó sắp xếp theo thời gian tạo hoặc thời gian nguồn gốc. Sau khi truy vấn, backend enrich dữ liệu để bổ sung media, hashtag, số lượt thích, số bình luận, trạng thái liked, saved và thông tin người đăng trước khi trả về cho giao diện.

### 2.2.2 Luồng chat

Luồng chat của hệ thống diễn ra theo mô hình event-driven. Người dùng gửi nội dung tin nhắn từ frontend thông qua socket event `sendMessage`. ChatGateway xác thực token, kiểm tra thành viên hội thoại, lưu tin nhắn vào cơ sở dữ liệu rồi phát sự kiện `newMessage` đến room tương ứng của conversation. Khi người dùng mở cuộc trò chuyện, hệ thống có thể gửi thêm trạng thái `membersOnline`, `userTyping`, `conversationRead` và `unreadCount`. Nếu cuộc trò chuyện có bot AI, backend còn kích hoạt phản hồi tự động qua Dify agent và phát trả lại tin nhắn AI vào cùng room hội thoại.

### 2.2.3 Luồng thông báo

Khi người dùng thực hiện một hành vi như thích bài viết hoặc bình luận vào bài viết của người khác, tầng nghiệp vụ tạo notification mới trong database. Sau khi lưu thành công, NotificationGateway dùng room của người nhận để phát event `notification`. Đồng thời, hệ thống cập nhật `unreadCount` để giao diện có thể hiển thị badge thông báo tức thời. Khi người dùng đánh dấu đọc một thông báo hoặc toàn bộ thông báo, số lượng chưa đọc được đồng bộ lại ngay trên socket.

### 2.2.4 Luồng kiểm duyệt và quản trị

Đối với nội dung do người dùng tạo, hệ thống thực hiện kiểm duyệt bước đầu ngay khi tạo bài viết hoặc cập nhật caption. Với nội dung bị người dùng báo cáo hoặc cần can thiệp thủ công, admin sử dụng dashboard để xem bài viết, bình luận hoặc report liên quan. Sau đó admin có thể chuyển trạng thái bài viết sang `hidden`, bình luận sang `hidden` hoặc `deleted`, đồng thời gắn lý do kiểm duyệt và lưu dấu vết admin thực hiện. Luồng này giúp kết hợp kiểm duyệt tự động và kiểm duyệt quản trị viên trong cùng một hệ thống.

## 2.3 Mô hình dữ liệu

Mô hình dữ liệu của DATN Social được xây dựng theo hướng tách rõ thực thể lõi và thực thể hỗ trợ.

Các thực thể lõi gồm:

- `User`: lưu thông tin tài khoản, hồ sơ, quyền, trạng thái hoạt động, nhà cung cấp đăng nhập và các bộ đếm follower hoặc following.
- `Post`: lưu bài viết, caption, trạng thái hiển thị, trạng thái ghim, dấu vết chỉnh sửa và thông tin nguồn.
- `Comment`: lưu bình luận, quan hệ reply thông qua `parentId`, trạng thái hiển thị và thông tin kiểm duyệt.
- `Conversation`: mô tả một cuộc trò chuyện riêng hoặc nhóm, có thể gắn `difyConversationId` để duy trì ngữ cảnh với AI.
- `Message`: lưu nội dung tin nhắn, người gửi, hội thoại, trạng thái đã đọc và media đính kèm.
- `Notification`: lưu loại thông báo, người gửi, người nhận, dữ liệu bổ sung và trạng thái đã đọc.

Các thực thể hỗ trợ gồm:

- `Media`: mô tả ảnh hoặc video gắn với bài viết.
- `Hashtag` và `PostHashtag`: quản lý quan hệ nhiều-nhiều giữa bài viết và hashtag.
- `PostMention`: mô tả việc nhắc tên người dùng trong bài viết.
- `Like`: lưu lượt thích bài viết.
- `SavedPost`: lưu danh sách bài viết đã bookmark.
- `Follow`: biểu diễn quan hệ theo dõi giữa hai người dùng.
- `ConversationMember`: lưu thành viên của cuộc trò chuyện và trạng thái rời nhóm.
- `Report`: lưu các báo cáo vi phạm, trong project thực tế báo cáo được mô hình hóa theo `targetType` và `targetId`, nhờ đó có thể áp dụng cho nhiều loại đối tượng như bài viết hoặc bình luận.

Mô hình này cho phép backend xử lý linh hoạt các nghiệp vụ xã hội trong khi vẫn giữ được cấu trúc dữ liệu quan hệ chặt chẽ và dễ mở rộng.

## 2.4 Database

Hệ thống sử dụng PostgreSQL với nhiều bảng được liên kết bằng khóa ngoại và ràng buộc duy nhất nhằm đảm bảo tính toàn vẹn dữ liệu. Các bảng quan trọng gồm `users`, `posts`, `media`, `comments`, `likes`, `saved_posts`, `follows`, `conversations`, `conversation_members`, `messages`, `notifications`, `hashtags`, `post_hashtags`, `post_mentions` và `reports`.

Các mối quan hệ nổi bật trong cơ sở dữ liệu bao gồm:

- Một `user` có nhiều `post`, `comment`, `message`, `notification`.
- Một `post` có nhiều `media`, `comment`, `like`, `saved_post`, `post_mention`.
- `posts` và `hashtags` có quan hệ nhiều-nhiều thông qua `post_hashtags`.
- `users` tự liên kết nhiều-nhiều với nhau thông qua bảng `follows`.
- Một `conversation` có nhiều `conversation_member` và nhiều `message`.
- Một `comment` có thể tham chiếu đến một `comment` khác thông qua `parentId`, từ đó hỗ trợ reply.

Hệ thống còn áp dụng nhiều ràng buộc thực tế như `UNIQUE(postId, userId)` cho lượt thích và bài viết đã lưu, `UNIQUE(followerId, followingId)` cho quan hệ theo dõi và `UNIQUE(userId, source, sourceId)` để tránh trùng dữ liệu khi đồng bộ bài viết Facebook. Tại tầng TypeORM, các entity đã được định nghĩa kèm index và migration giúp việc triển khai, nâng cấp và duy trì dữ liệu được an toàn hơn.

---PAGEBREAK---

# CHƯƠNG 3: KẾT QUẢ THỰC NGHIỆM

## 3.1 Kiến trúc hệ thống

DATN Social được triển khai theo mô hình client-server nhiều lớp. Frontend React đóng vai trò giao diện người dùng, gửi request REST đến backend NestJS thông qua Axios. Backend xử lý nghiệp vụ, truy xuất dữ liệu bằng TypeORM và lưu trữ trên PostgreSQL. Đối với các tác vụ yêu cầu phản hồi tức thời, frontend và backend kết nối thêm qua Socket.IO. Ngoài ra, hệ thống còn giao tiếp với Cloudinary để lưu media và Dify để xử lý các chức năng AI.

Kiến trúc tổng quát của hệ thống có thể mô tả ngắn gọn như sau:

- React Frontend -> REST API -> NestJS Backend -> PostgreSQL
- React Frontend -> Socket.IO -> ChatGateway, NotificationGateway
- NestJS Backend -> Cloudinary -> Lưu ảnh và video
- NestJS Backend -> Dify API -> Caption, hashtag, moderation, sentiment, assistant chat

Ưu điểm của kiến trúc này là tách biệt rõ ràng trách nhiệm giữa các tầng. Frontend tập trung vào hiển thị và trải nghiệm người dùng. Backend chịu trách nhiệm xác thực, nghiệp vụ, kiểm soát dữ liệu và tích hợp dịch vụ ngoài. Data layer đảm bảo tính nhất quán của dữ liệu. Realtime layer và AI layer được tổ chức thành các module riêng để không làm rối luồng xử lý chính.

## 3.2 Backend

Backend là phần trọng tâm của project vì đây là nơi tổ chức toàn bộ API, logic nghiệp vụ, realtime và tích hợp AI. Cấu trúc thực tế của backend được xây dựng theo module NestJS, giúp mỗi miền chức năng được quản lý độc lập nhưng vẫn giao tiếp mạch lạc thông qua dependency injection.

### 3.2.1 Controller

Các controller chính đang có trong project gồm:

- `AuthController`: xử lý đăng ký, đăng nhập, đăng nhập Google, trả thông tin người dùng hiện tại.
- `UserController`: xử lý thông tin hồ sơ, follow hoặc unfollow, cài đặt người dùng.
- `PostController`: tạo bài viết, upload media, lấy feed, lấy bài theo user, lấy bài được tag, lấy bài đã lưu, cập nhật caption, ghim bài và gọi các endpoint AI cho caption hoặc hashtag.
- `EngagementController`: xử lý like, comment, lưu bài viết và các thao tác tương tác khác.
- `ChatController`: quản lý danh sách hội thoại, tạo hội thoại, lấy tin nhắn, đánh dấu đã đọc.
- `NotificationController`: truy vấn thông báo theo người dùng.
- `SearchController`: tìm kiếm người dùng, hashtag và nội dung liên quan.
- `AdminController`: dashboard, quản lý user, bài viết, bình luận, report.
- `AiToolsController`: cung cấp API tool riêng cho lớp agent hoặc công cụ AI bên ngoài truy vấn dữ liệu hệ thống.
- `FacebookWebhookController`: nhận sự kiện đồng bộ Facebook Page khi tính năng này được bật.

### 3.2.2 Service

Các service cốt lõi của backend gồm:

- `auth.service`: đăng ký, băm mật khẩu, xác thực đăng nhập, phát hành JWT.
- `user.service`: quản lý hồ sơ, follow, bot AI và dữ liệu người dùng.
- `post.service`: xử lý tạo bài viết, feed, hashtag, mention, bài ghim, đồng bộ Facebook.
- `engagement.service`: xử lý like, comment, save và tạo notification liên quan.
- `chat.service`: quản lý conversation, message, unread count, logic phản hồi AI trong hội thoại.
- `notification.service`: lưu thông báo, lấy số lượng chưa đọc, đánh dấu đã đọc.
- `admin.service`: thống kê dashboard, khóa tài khoản, phân quyền, kiểm duyệt bài viết, bình luận và report.
- `ai.service`: caption suggestion, hashtag suggestion, moderation, sentiment và assistant chat.
- `ai-tools.service`: chuẩn bị dữ liệu để AI agent truy vấn nhanh.
- `cloudinary.service`: đẩy file lên Cloudinary theo dạng stream.
- `facebook-sync.service`: đồng bộ bài viết từ Facebook Page vào hệ thống.

### 3.2.3 Realtime layer

Phần realtime của backend được triển khai bằng hai gateway:

- `ChatGateway` ở namespace `/chat`: xác thực socket bằng JWT, quản lý user online, join room conversation, gửi nhận message, typing, markAsRead và kích hoạt phản hồi AI.
- `NotificationGateway` ở namespace `/notifications`: xác thực socket, đưa socket vào room của user, emit notification và unread count.

Nhờ tách gateway theo namespace, project hạn chế được việc trộn lẫn event giữa các nghiệp vụ và giúp frontend tổ chức service socket rõ ràng hơn.

## 3.3 Cấu trúc thư mục

Cấu trúc thư mục tổng quan của repo được tổ chức theo mô hình fullstack:

- `frontend/`: mã nguồn React SPA.
- `backend/`: mã nguồn NestJS, API, entity, migration và gateway.
- `dify/`: cấu hình workflow và agent AI phục vụ caption và trợ lý hội thoại.
- `docs/`: tài liệu kiến trúc, ERD, realtime flow và báo cáo.

Ở frontend, mã nguồn được chia thành `components`, `pages`, `contexts`, `services`, `types`, `utils`. Cách tổ chức này giúp tách giao diện dùng chung khỏi logic nghiệp vụ và khỏi lớp giao tiếp API.

Ở backend, mã nguồn tập trung trong `src/modules`, `src/config`, `src/common`, `src/migrations`. Mỗi module đều có controller, service, dto và entity riêng. Đây là cấu trúc phù hợp cho dự án học thuật nhưng vẫn đủ gần với phong cách phát triển sản phẩm thật.

## 3.4 Cấu hình hệ thống

Phần cấu hình của DATN Social được quản lý thông qua biến môi trường. Ở backend, `ConfigModule.forRoot()` nạp file `.env` toàn cục và `main.ts` đọc các biến như `PORT`, `FRONTEND_URL`, `UPLOAD_DIR`, `API_PREFIX`. Backend thiết lập global prefix mặc định là `api/v1`, tạo thư mục upload tĩnh nếu chưa tồn tại và bật CORS theo origin của frontend.

Ngoài cấu hình web cơ bản, backend còn sử dụng nhiều biến môi trường cho các dịch vụ ngoài như:

- Cấu hình PostgreSQL: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`.
- Cấu hình bảo mật: `JWT_SECRET`.
- Cấu hình frontend: `FRONTEND_URL`.
- Cấu hình AI: `DIFY_API_URL`, `DIFY_CAPTION_WORKFLOW_KEY`, `DIFY_GENERAL_API_KEY`, `DIFY_CHATBOT_API_KEY`.
- Cấu hình media: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- Cấu hình Facebook sync: `FB_PAGE_ID`, `FB_PAGE_ACCESS_TOKEN`, `FB_SYNC_ENABLED`, `FB_WEBHOOK_VERIFY_TOKEN`.

Ở frontend, file `.env` chủ yếu khai báo `VITE_API_URL` và các cấu hình liên quan đến Google Sign-In. Việc tách cấu hình theo môi trường giúp project thuận lợi khi chạy local, build production hoặc triển khai với Docker Compose.

## 3.5 Data layer

Tầng dữ liệu của hệ thống được xây dựng bằng TypeORM. Trong `app.module.ts`, backend sử dụng `TypeOrmModule.forRootAsync` để khởi tạo kết nối dựa trên `ConfigService`. Trong `data-source.ts`, project cấu hình tập trung cho entity path, migration path và đặt `synchronize: false` để tránh việc tự động thay đổi schema trên môi trường production.

Lựa chọn `synchronize: false` là một quyết định phù hợp với hệ thống có nhiều dữ liệu quan trọng, vì nó buộc việc thay đổi schema phải đi qua migration. Trong project hiện tại đã có nhiều migration như bổ sung trường xác thực cho user, chuẩn hóa kiểu dữ liệu chat, thêm trường nguồn dữ liệu bài viết, thêm saved posts, thêm các trường kiểm duyệt admin và mở rộng conversation cho Dify.

Mỗi entity trong TypeORM được định nghĩa rõ tên bảng, kiểu dữ liệu, quan hệ và index. Nhờ đó, tầng service có thể truy xuất dữ liệu bằng repository hoặc query builder một cách mạch lạc, đồng thời vẫn giữ được tính chặt chẽ của quan hệ dữ liệu.

## 3.6 Entity

Các entity nổi bật của hệ thống bao gồm:

- `User`: gồm `id`, `email`, `username`, `name`, `bio`, `avatarUrl`, `googleId`, `password`, `provider`, `role`, `status`, `followersCount`, `followingCount`, `notificationEnabled`, `blockedReason`, `blockedAt`, `createdAt`, `updatedAt`.
- `Post`: gồm `id`, `userId`, `caption`, `source`, `sourceId`, `sourceCreatedAt`, `status`, `moderationReason`, `moderatedBy`, `moderatedAt`, `isPinned`, `isEdited`, `createdAt`, `updatedAt`.
- `Comment`: gồm `id`, `content`, `userId`, `postId`, `parentId`, `status`, `moderationReason`, `moderatedBy`, `moderatedAt`, `createdAt`.
- `Message`: gồm `id`, `conversationId`, `senderId`, `content`, `mediaUrl`, `isRead`, `createdAt`.
- `Conversation`: mô tả hội thoại 1-1 hoặc nhóm, có `difyConversationId` để liên kết cuộc trò chuyện AI.
- `Notification`: lưu kiểu thông báo, dữ liệu bổ sung và trạng thái đọc.
- `Like`, `SavedPost`, `Follow`, `Hashtag`, `PostHashtag`, `PostMention`, `Report`: bổ sung cho các quan hệ nghiệp vụ xã hội và quản trị.

Nhìn ở góc độ thiết kế, hệ thống không chỉ dùng bốn thực thể cơ bản user, post, comment, message mà còn xây dựng thêm nhiều entity hỗ trợ để đáp ứng đúng bản chất của một mạng xã hội thực thụ. Đây là điểm giúp project có giá trị thực nghiệm cao hơn so với một ứng dụng CRUD đơn giản.

## 3.7 DTO

Tầng DTO trong project được dùng để chuẩn hóa request và hỗ trợ validation. Một số DTO tiêu biểu có thể kể đến:

- `RegisterDto`, `LoginDto` cho xác thực.
- `UpdateProfileDto`, `UpdateNotificationDto` cho người dùng.
- `CreatePostDto` cho tạo bài viết.
- `CreateCommentDto` cho bình luận.
- `CreateConversationDto`, `CreateMessageDto` cho chat.
- `CreateNotificationDto` cho thông báo.
- `AdminUserQueryDto`, `UpdateUserStatusDto`, `UpdateUserRoleDto`, `ModeratePostDto`, `ModerateCommentDto`, `CreateReportDto`, `ReviewReportDto` cho khu vực quản trị.

Việc dùng DTO kết hợp với `ValidationPipe` toàn cục giúp backend loại bỏ dữ liệu thừa, biến đổi kiểu dữ liệu phù hợp và hạn chế các request không hợp lệ ngay từ lớp vào. Đây là một yếu tố quan trọng để đảm bảo ổn định cho API.

## 3.8 File upload

Project hỗ trợ upload ảnh và video khi tạo bài viết. Luồng xử lý được thiết kế theo hai bước. Ở bước đầu, frontend gửi file thô tới endpoint `/posts/upload` bằng `FormData`. Tại backend, `PostController` sử dụng `FileInterceptor` để nhận file, giới hạn dung lượng tối đa 20MB và kiểm tra loại file phải thuộc nhóm image hoặc video.

Sau khi file hợp lệ, `CloudinaryService` sử dụng `cloudinary.uploader.upload_stream` để đưa dữ liệu lên Cloudinary. Endpoint upload trả về `secure_url` để frontend lưu lại. Ở bước tiếp theo, khi người dùng thực sự đăng bài, frontend gửi caption cùng danh sách media URL và kiểu media cho endpoint tạo post. Cách tách hai bước này giúp media được quản lý rõ ràng, tránh việc phải lưu file thô trong backend lâu dài.

## 3.9 Business rules

Qua phân tích mã nguồn, một số luật nghiệp vụ quan trọng của hệ thống được rút ra như sau:

- Người dùng phải đăng nhập mới có thể truy cập các chức năng riêng tư như tạo bài viết, tương tác, chat và xem thông báo.
- Chỉ chủ sở hữu bài viết mới được chỉnh sửa caption, ghim hoặc xóa bài viết của mình.
- Mỗi người dùng chỉ được ghim một bài viết tại một thời điểm; khi ghim bài mới, bài ghim cũ sẽ tự động bỏ ghim.
- Nội dung caption của bài viết mới hoặc bài viết chỉnh sửa phải qua bước kiểm duyệt AI trước khi lưu.
- Chỉ thành viên của hội thoại mới được gửi tin nhắn, xem tin nhắn và đánh dấu đã đọc.
- Hệ thống không tạo notification khi người dùng tương tác với chính nội dung của mình.
- Like, follow và saved post đều có ràng buộc duy nhất để tránh trùng dữ liệu.
- Admin có quyền thay đổi trạng thái user, role, kiểm duyệt bài viết, bình luận và review report.
- Các websocket connection bắt buộc phải xác thực token ở giai đoạn handshake.

Những luật này bảo đảm rằng hệ thống vừa đúng về nghiệp vụ mạng xã hội, vừa an toàn trong quá trình vận hành.

## 3.10 Workflow

### 3.10.1 Workflow feed

User login -> frontend lưu JWT -> gọi `/posts/feed` -> backend lấy danh sách following -> truy vấn posts đang hiển thị -> enrich user, media, likes, comments, saved -> frontend render FeedPage.

### 3.10.2 Workflow chat

User mở MessagesPage -> socket kết nối namespace `/chat` với token -> join conversation -> gửi event `sendMessage` -> ChatGateway lưu DB -> emit `newMessage` -> đối phương nhận tin nhắn theo thời gian thực -> event `markAsRead` cập nhật trạng thái đã đọc.

### 3.10.3 Workflow AI caption

User nhập ý tưởng nội dung -> frontend gọi `/posts/ai/generate-caption` -> backend chuyển tiếp đến `ai.service` -> Dify workflow sinh caption -> backend trả về caption và meta nguồn xử lý -> frontend đưa kết quả vào vùng soạn bài viết.

### 3.10.4 Workflow AI chat assistant

User gửi tin nhắn trong cuộc hội thoại có bot AI -> `ChatGateway` gọi `ChatService.sendAssistantReplyIfNeeded()` -> `AIService.chatWithAssistant()` trao đổi với Dify agent -> kết quả được lưu thành một message mới -> gateway phát `newMessage` trở lại conversation room.

### 3.10.5 Workflow quản trị

Admin đăng nhập -> truy cập `AdminShell` -> mở dashboard, users, posts, comments hoặc reports -> gọi API admin tương ứng -> backend kiểm tra role -> cập nhật trạng thái dữ liệu -> frontend hiển thị lại kết quả quản trị.

## 3.11 Testing và giao diện người dùng

Về kiểm thử, backend hiện có script `npm test` sử dụng Jest, trong đó đã xuất hiện các file test cho `ai.service` và `post.controller` hoặc `post.service`. Ở frontend, project khai báo Playwright cho kiểm thử end-to-end thông qua lệnh `playwright test`. Điều này cho thấy hệ thống đã được chuẩn bị nền tảng để kiểm thử cả logic backend lẫn hành vi giao diện.

Về giao diện, frontend đã xây dựng đầy đủ các trang quan trọng gồm đăng nhập, đăng ký, bảng tin, hồ sơ cá nhân, khám phá, hashtag, chi tiết bài viết, tin nhắn, thông báo và khu vực admin. Tầng component cũng được tách thành nhóm dùng chung, nhóm layout và nhóm post, giúp việc tổ chức UI rõ ràng và thuận tiện cho mở rộng.

Hệ thống đã tích hợp `@nestjs/swagger` để tự động sinh tài liệu API theo chuẩn OpenAPI. Swagger UI được phục vụ tại endpoint `/api/docs` với cấu hình Bearer Auth cho các endpoint yêu cầu xác thực. Điều này giúp việc kiểm thử và bàn giao API trở nên trực quan và thuận tiện hơn.

---PAGEBREAK---

# KẾT LUẬN

## 1. Đánh giá kết quả đạt được

Qua quá trình phân tích, thiết kế và hiện thực hóa, đề tài đã xây dựng được một hệ thống mạng xã hội fullstack tương đối hoàn chỉnh với đầy đủ các thành phần quan trọng của một nền tảng hiện đại. Hệ thống bao gồm frontend React cho trải nghiệm người dùng, backend NestJS cho xử lý nghiệp vụ, PostgreSQL cho lưu trữ dữ liệu, Socket.IO cho realtime và Dify AI cho các chức năng thông minh liên quan đến nội dung và hội thoại.

Xét theo góc độ kỹ thuật, project cho thấy kiến trúc module hoạt động ổn định và có khả năng mở rộng. Các nhóm chức năng như xác thực, bài viết, tương tác, chat, thông báo, AI và quản trị đã được tách thành module rõ ràng. Các thực thể dữ liệu được thiết kế tương đối đầy đủ cho một hệ thống xã hội thực tế, đồng thời có hỗ trợ migration và triển khai môi trường qua Docker Compose.

## 2. So sánh với mục tiêu đề ra

Đề tài nhìn chung đã đáp ứng các mục tiêu nghiên cứu đã xác định từ đầu. Frontend được triển khai bằng React kết hợp TypeScript. Backend được tổ chức theo phong cách NestJS với controller, service, dto và entity tách biệt. Hệ thống API REST đã được hình thành cho các nghiệp vụ chính. Cơ chế realtime đã được triển khai cho chat và thông báo. Khối AI đã được tích hợp vào các chức năng thiết thực như kiểm duyệt nội dung, gợi ý caption, gợi ý hashtag, phân tích cảm xúc và hỗ trợ người dùng trong hội thoại.

Ngoài các mục tiêu cốt lõi, project còn mở rộng thêm những yếu tố có giá trị thực tiễn như dashboard quản trị, saved posts, tagged posts, tích hợp upload Cloudinary và khả năng đồng bộ dữ liệu từ Facebook Page. Điều này cho thấy phạm vi thực hiện của đề tài không chỉ dừng ở mức minh họa mà đã tiến gần hơn đến một sản phẩm có thể triển khai thật.

## 3. Vai trò của AI trong hệ thống

AI là một thành phần nổi bật của DATN Social. Trong project này, AI được dùng để sinh caption cho bài viết dựa trên prompt và tone, gợi ý hashtag phù hợp với nội dung, kiểm duyệt caption để chặn nội dung không an toàn, phân tích cảm xúc của bài viết và trả lời người dùng trong hội thoại với bot trợ lý.

So với việc chỉ thêm một chatbot đơn lẻ, cách tích hợp AI trong hệ thống DATN Social có giá trị hơn ở chỗ AI tham gia trực tiếp vào chu trình nội dung. Nó vừa hỗ trợ người dùng sáng tạo nội dung, vừa hỗ trợ hệ thống duy trì chất lượng nội dung và tăng mức độ tương tác. Đây là hướng đi phù hợp với xu hướng phát triển web application thông minh trong giai đoạn hiện nay.

## 4. Hướng phát triển

Trong tương lai, hệ thống có thể phát triển theo các hướng sau:

- Xây dựng ứng dụng mobile riêng bằng React Native hoặc Flutter để mở rộng khả năng tiếp cận.
- Tách các module lớn như chat, notification hoặc AI thành microservices khi quy mô hệ thống tăng lên.
- Bổ sung Swagger hoặc cổng tài liệu API đầy đủ để phục vụ kiểm thử và bàn giao.
- Xây dựng hệ gợi ý nội dung, gợi ý kết bạn hoặc gợi ý bài viết dựa trên hành vi người dùng.
- Nâng cấp AI theo hướng cá nhân hóa sâu hơn, hỗ trợ tóm tắt hội thoại, phân loại nội dung và phát hiện bất thường.
- Tăng cường hạ tầng triển khai bằng queue, cache, object storage và monitoring để đáp ứng khối lượng truy cập lớn hơn.

Tổng thể, đề tài đã hoàn thành tốt vai trò của một đồ án tốt nghiệp theo định hướng ứng dụng, đồng thời tạo ra nền tảng kỹ thuật đủ chắc chắn để tiếp tục phát triển thành sản phẩm thực tế trong các giai đoạn sau.

# MỤC LỤC

- PHẦN MỞ ĐẦU
- Chương 1. Cơ sở lý thuyết
- Chương 2. Phân tích và thiết kế hệ thống
- Chương 3. Kết quả thực nghiệm
- Kết luận

---PAGEBREAK---

# PHẦN MỞ ĐẦU

## 1. Tính cấp thiết của đề tài

Trong bối cảnh chuyển đổi số diễn ra mạnh mẽ, mạng xã hội đã trở thành một trong những hạ tầng giao tiếp quan trọng nhất của môi trường Internet hiện đại. Người dùng không chỉ sử dụng mạng xã hội để kết nối cá nhân mà còn để trao đổi thông tin, chia sẻ hình ảnh, video, cảm xúc và xây dựng cộng đồng. Cùng với sự phát triển của thiết bị di động, hạ tầng điện toán đám mây và công nghệ web hiện đại, nhu cầu sử dụng những nền tảng giao tiếp trực tuyến có khả năng cập nhật tức thời, trải nghiệm mượt mà và hỗ trợ đa phương tiện ngày càng tăng cao.

Mặc dù hiện nay đã có nhiều nền tảng mạng xã hội phổ biến, phần lớn các hệ thống này được xây dựng theo mô hình chung cho số đông người dùng và chưa đáp ứng đầy đủ nhu cầu cá nhân hóa ở mức nghiệp vụ cụ thể. Nhiều nền tảng chưa tích hợp AI một cách sâu vào các quy trình như kiểm duyệt nội dung, gợi ý nội dung, hỗ trợ hội thoại hoặc phân tích dữ liệu người dùng theo thời gian thực. Đối với tổ chức, doanh nghiệp hoặc cộng đồng riêng, việc phụ thuộc hoàn toàn vào nền tảng bên thứ ba cũng đặt ra các vấn đề về kiểm soát dữ liệu, quản trị người dùng, chính sách nội dung và khả năng mở rộng theo nhu cầu đặc thù.

Từ góc độ hệ thống, một nền tảng mạng xã hội hiện đại cần đồng thời giải quyết nhiều yêu cầu cốt lõi như quản lý bài viết, xử lý tương tác dưới dạng bình luận, lượt thích, lưu bài viết, nhắn tin trực tiếp, thông báo và cơ chế realtime. Bên cạnh đó, hệ thống còn cần cơ chế xác thực an toàn, quản trị phân quyền, lưu trữ media, tích hợp AI hỗ trợ xử lý nội dung và khả năng tổ chức code theo kiến trúc fullstack rõ ràng để thuận lợi cho phát triển lâu dài. Đây cũng chính là các yêu cầu thực tế mà project DATN Social hướng đến khi được xây dựng trên nền React ở frontend và NestJS ở backend.

Xuất phát từ những phân tích trên, đề tài xây dựng hệ thống mạng xã hội fullstack tích hợp realtime và AI là cần thiết cả về mặt học thuật lẫn thực tiễn. Đề tài không chỉ giúp làm rõ cách tổ chức một hệ thống web hiện đại theo mô hình client-server mà còn cho phép kiểm chứng hiệu quả của việc đưa AI vào các nghiệp vụ mạng xã hội như kiểm duyệt nội dung, gợi ý caption, gợi ý hashtag và hỗ trợ người dùng trong hội thoại.

## 2. Mục tiêu nghiên cứu

### 2.1 Mục tiêu tổng quát

Mục tiêu tổng quát của đề tài là xây dựng một hệ thống mạng xã hội fullstack có khả năng hoạt động theo thời gian thực, tích hợp AI vào các chức năng hỗ trợ nội dung và được tổ chức theo kiến trúc module rõ ràng để dễ bảo trì, mở rộng và triển khai thực tế.

### 2.2 Mục tiêu cụ thể

- Nghiên cứu và áp dụng React kết hợp TypeScript để xây dựng giao diện người dùng hiện đại, tách biệt thành các page, component và service.
- Nghiên cứu Node.js theo phong cách NestJS để tổ chức backend theo module, controller, service và entity.
- Thiết kế hệ thống API REST cho các nghiệp vụ xác thực, người dùng, bài viết, tương tác, tìm kiếm, quản trị và tích hợp AI.
- Tích hợp WebSocket thông qua Socket.IO để triển khai chat realtime và đồng bộ thông báo tức thời.
- Tích hợp AI vào các chức năng như kiểm duyệt nội dung, gợi ý caption, gợi ý hashtag, phân tích cảm xúc và trợ lý hội thoại.
- Thiết kế cơ sở dữ liệu quan hệ với PostgreSQL, bảo đảm tính toàn vẹn giữa user, post, comment, message và các bảng hỗ trợ.

## 3. Đối tượng và phạm vi nghiên cứu

### 3.1 Đối tượng nghiên cứu

Đối tượng nghiên cứu của đề tài là hệ thống mạng xã hội DATN Social, bao gồm đầy đủ các lớp frontend, backend, cơ sở dữ liệu, kênh giao tiếp realtime và mô-đun AI phục vụ cho hoạt động của hệ thống.

### 3.2 Phạm vi nghiên cứu

Về backend, đề tài tập trung vào xây dựng API, xác thực người dùng bằng JWT và Google OAuth, xử lý bài viết, bình luận, lượt thích, theo dõi, chat realtime, thông báo, quản trị và tích hợp AI. Về frontend, đề tài tập trung vào giao diện React cho các trang đăng nhập, đăng ký, bảng tin, hồ sơ cá nhân, khám phá, chat, thông báo và khu vực quản trị. Về dữ liệu, phạm vi chính xoay quanh các thực thể người dùng, bài viết, bình luận, tin nhắn và các thực thể hỗ trợ như media, hashtag, notification, follow, saved post, conversation, report.

Đề tài không đi sâu vào các bài toán rất lớn như phân tán đa vùng, cân bằng tải ở quy mô hàng triệu người dùng hoặc huấn luyện mô hình AI chuyên biệt. Thay vào đó, luận văn tập trung chứng minh tính khả thi của một kiến trúc fullstack hoàn chỉnh có thể mở rộng dần thành sản phẩm thực tế.

## 4. Phương pháp nghiên cứu

Đề tài được thực hiện theo hướng kết hợp giữa nghiên cứu lý thuyết và thực nghiệm triển khai hệ thống. Trước hết, nhóm nghiên cứu khảo sát các khái niệm nền tảng về REST API, JWT, WebSocket, cơ sở dữ liệu quan hệ, kiến trúc module và tích hợp AI cho web application. Tiếp theo, đề tài phân tích đặc trưng của các hệ thống mạng xã hội phổ biến để xác định các nhóm chức năng cốt lõi cần có như đăng bài, tương tác, nhắn tin, thông báo và kiểm duyệt nội dung.

Sau giai đoạn khảo sát, hệ thống được thiết kế dưới dạng các mô hình chức năng, use case, luồng nghiệp vụ và mô hình dữ liệu. Tư duy thiết kế theo UML được áp dụng ở mức logic thông qua phân rã chức năng, mô tả actor, xác định thực thể và quan hệ giữa các thành phần. Cuối cùng, project được hiện thực hóa bằng mã nguồn, cấu hình môi trường, kiểm thử nghiệp vụ trên backend và giao diện, từ đó đánh giá kết quả thực nghiệm dựa trên tính đầy đủ chức năng và mức độ ổn định của hệ thống.

## 5. Ý nghĩa khoa học và thực tiễn

### 5.1 Ý nghĩa khoa học

- Đề tài cho thấy cách áp dụng kiến trúc fullstack hiện đại vào việc xây dựng một hệ thống mạng xã hội hoàn chỉnh.
- Đề tài minh họa rõ cách tách lớp frontend, backend, realtime và data layer trong một hệ thống web có nhiều nghiệp vụ.
- Đề tài thể hiện khả năng tích hợp AI vào ứng dụng web không chỉ ở mức chatbot mà còn ở mức xử lý nội dung và hỗ trợ vận hành.
- Đề tài là cơ sở để nghiên cứu sâu hơn về mở rộng hệ thống, hệ gợi ý và tối ưu trải nghiệm người dùng.

### 5.2 Ý nghĩa thực tiễn

- Kết quả của đề tài có thể phát triển tiếp thành nền tảng mạng xã hội riêng cho cộng đồng hoặc doanh nghiệp.
- Hệ thống có thể áp dụng cho các mô hình truyền thông nội bộ, cộng đồng trường học, nhóm sáng tạo nội dung hoặc dịch vụ trực tuyến.
- Kiến trúc module của backend và cấu trúc service ở frontend giúp project thuận lợi cho bảo trì và mở rộng về sau.
- Việc tích hợp AI giúp tăng giá trị thực tiễn của hệ thống khi hỗ trợ tự động hóa một phần quy trình tạo và kiểm duyệt nội dung.

## 6. Kết cấu của luận văn

Nội dung luận văn được tổ chức thành ba chương chính. Chương 1 trình bày cơ sở lý thuyết về mạng xã hội và các công nghệ được sử dụng trong project. Chương 2 tập trung phân tích bài toán, use case, luồng nghiệp vụ, mô hình dữ liệu và thiết kế cơ sở dữ liệu của hệ thống DATN Social. Chương 3 trình bày kết quả thực nghiệm, mô tả kiến trúc triển khai, cấu trúc mã nguồn, các thành phần backend, frontend, realtime, AI và đánh giá mức độ hoàn thành mục tiêu đề ra.

---PAGEBREAK---
