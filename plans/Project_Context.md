# PROJECT CONTEXT DOCUMENT - Six Degrees of Wikipedia

## 1. Tổng quan Dự án (Project Overview)
- **Tên dự án**: Six Degrees of Wikipedia (Hỗ trợ tiếng Việt và tiếng Anh).
- **Mục tiêu**: Xây dựng web app tìm đường liên kết ngắn nhất giữa 2 bài viết (hoặc 2 nhân vật) Wikipedia qua các wikilinks (chữ màu xanh) theo lý thuyết "Six Degrees of Separation".
- **Tính chất**: Solo portfolio project. Thời gian hoàn thành: 4 tuần.
- **Quy mô dự kiến (Traffic)**: 100 users/tháng đầu tiên, hướng tới khoảng 10,000 users/năm.
- **Performance KPI**: Chấp nhận độ trễ (delay) do gọi API thời gian thực, ưu tiên tính chính xác và không lưu trữ trước/dump dữ liệu Wikipedia. Hệ thống vẫn cố gắng tối ưu xử lý đa luồng < 3-5 tối đa 10 giây.

## 2. Phạm vi & Yêu cầu Chức năng
- **Bản chất đường đi**: Chỉ sử dụng các wikilink hợp lệ trực tiếp từ Wikipedia thông qua việc fetch API on-the-fly.
- **Đa ngôn ngữ**: Hoạt động trên `vi.wikipedia.org` và `en.wikipedia.org`. Cung cấp UI switch ngôn ngữ.
- **Tính năng cốt lõi**:
  - Thuật toán Bidirectional BFS (Tìm kiếm hai chiều) qua REST API / MediaWiki API.
  - Visualization dưới dạng Graph (sử dụng đồ thị như React Flow).
  - Lịch sử tìm kiếm cá nhân & Heatmap thống kê (các bài viết là cầu nối phổ biến).
  - Web chia sẻ lại kết quả tìm kiếm (Shareable links).
  - Hệ thống Đăng nhập (User Authentication) bằng NextAuth v5 + GitHub/Google.
- **Giao diện**: Web UI (Next.js App Router), mobile-first, dark mode, chuẩn SEO (SSR), sẵn sàng lên PWA.

## 3. Kiến trúc Hệ thống & Tech Stack
- **Monorepo**: Turborepo + Next.js 15 (App Router).
- **Backend Architecture**: Thiết kế theo mô hình **Modular Monolith** nằm gọn trong vòng đời của Next.js (chạy qua Next.js API Routes / Server Actions):
  1. API Gateway & Router
  2. Search Module (OpenSearch API)
  3. Pathfinding Module (Bidirectional BFS Worker)
  4. Graph Viz Module (Xử lý model UI React Flow)
  5. User Module (Auth + History + Heatmap)
  6. Cache Module (Xử lý Redis lưu Path)
  7. Wiki Proxy Module (Rate limit + exponential backoff khi gọi tới API)
- **Database Backend**:
  - **SQL Server 2019** với mô hình **SQL Graph** (sử dụng hàm Graph native `SHORTEST_PATH` áp dụng để lưu và truy xuất lại các Cached Paths mà người khác đã tìm trước đó).
  - Redis đảm nhận cache trong quy trình tìm đường và giới hạn lượng request (Rate limiting).
- **Deployment & Cloud**:
  - Vercel (chứa Frontend + Backend Module Monolith).
  - Azure SQL Database 2019 + Azure Managed Redis.
  - Tự động hóa CI/CD qua GitHub Actions.

## 4. Cơ chế Cào & Xử lý Dữ liệu
- API request hoàn toàn **real-time**, không dump database.
- BẮT BUỘC có cơ chế rate limiting, caching, retry chống spam API cho mỗi request ra ngoài để không bị block IP.
- Cơ chế giải thuật: Bidirectional BFS. Lưu hoàn toàn kết quả tuyến đường (Path Node và Edge) vào SQL Server 2019 sau khi tìm thành công để làm Cached Result cho người tìm sau này.

## 5. Quy tắc AI Agent & Coding Standards (KHÔNG ĐƯỢC THAY ĐỔI)
- Mọi giải đáp, phản hồi phải dùng tiếng Việt chuyên nghiệp, rõ ràng (TUYỆT ĐỐI KHÔNG SỬ DỤNG EMOJI THEO YÊU CẦU GỐC).
- Comment trong code chỉ dùng khi thật sự cần thiết. Comment ghi bằng tiếng Việt, các thuật ngữ chuyên ngành công nghệ giữ nguyên phiên bản gốc (tiếng Anh).
- TUYỆT ĐỐI KHÔNG chèn emoji (biểu tượng cảm xúc) vào comment code hoặc response document.
- Cung cấp mã nguồn (code) đầy đủ, tránh đặt placeholder quá ngắn vô nghĩa.
- Luôn báo cáo kèm cấu trúc thư mục (folder structure), kịch bản SQL (script), hoặc cấu hình docker-compose nếu bước đó có thay đổi kiến trúc hoặc hạ tầng.
- Mỗi thao tác setup phải đi kèm câu lệnh chạy (run/build command), câu lệnh kiểm tra (test), và một số commit message cơ bản gợi ý cho Git.
- Nhớ phải đưa báo cáo tiến độ và checklist sau khi hoàn tất cụm tính năng của một tuần.
- Bắt buộc tham chiếu Project Context này trước mỗi lần AI (Agent) generate logic code để đảm bảo đi đúng lộ trình hệ thống từ lúc khởi tạo.

## 6. Tiến độ Hiện tại (Current Progress)
- **Phase-01 Day 1 (Hoàn tất)**: Khởi tạo thành công Turborepo monorepo skeleton. Thiết lập Next.js 15 (App Router) với mô hình **Modular Monolith** chứa 6 modules (`search`, `pathfinding`, `wiki-proxy`, `cache`, `user`, `graph-viz`) và các shared packages (`@repo/tsconfig`, `@repo/eslint-config`, `@repo/shared`). Tích hợp thành công TypeScript dạng chuẩn, TailwindCSS v4, ESLint, Prettier và Git init. Tương ứng hoàn thành **Ngày 1** trong Master Execution Plan.
- **Phase-02 Day 2 (Hoàn tất)**: Tạo script `database/01_init_db.sql` kết nối SQL Server 2019 định nghĩa cấu trúc bảng Graph Node/Edge chuẩn. Thiết lập Singleton Connection Instance cho `mssql` và `ioredis` bên trong `apps/web/src/lib/`. Tích hợp hoàn hảo theo dạng Modular Monolith. Đã hoàn thiện **Ngày 2** trong lộ trình Master.