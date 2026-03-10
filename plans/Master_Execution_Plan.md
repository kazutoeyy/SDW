# MASTER EXECUTION PLAN - Six Degrees of Wikipedia

Project Roadmap được thiết kế theo 4 tuần. Mọi code và structure tuân thủ nghiêm ngặt Next.js 15, Turborepo, SQL Server 2019 Graph, và Redis vởi mô hình Modular Monolith.

## TUẦN 1: Hạ tầng, Cấu trúc Dữ liệu & Core Modules
**Mục tiêu:** Hệ thống thiết lập thành công nhánh Frontend, các module Backend cốt lõi, cơ sở dữ liệu và thư viện Proxy gọi đến Wikipedia.

- [ ] **Ngày 1: Khởi tạo Vùng chứa (Monorepo & Framework)**
  - Setup Turborepo skeleton (tạo các workspace `apps/web` và `packages`).
  - Khởi tạo Next.js 15 (App Router) với TypeScript, TailwindCSS, ESLint, Prettier.
  - Thiết lập Git convention và GitHub Actions.
- [ ] **Ngày 2: Database Layer & SQL 2019 Graph Init**
  - Viết file script `01_init_db.sql` kết nối SQL Server 2019.
  - Tạo Schema hệ thống và kích hoạt đặc tính SQL Graph.
  - Tạo các bảng lưu Graph Path Cached, bảng tài khoản và lịch sử (Users, History, Heatmap).
- [ ] **Ngày 3: Authentication & Cấu trúc User Module**
  - Tích hợp NextAuth.js v5 trực tiếp trên Next.js (chạy chức năng Gateway auth).
  - Cấu hình OAuth providers (GitHub, Google).
- [ ] **Ngày 4: Thư viện Proxy & Caching Layer (Wiki Proxy)**
  - Tích hợp package `ioredis` và nối tới Azure Cache for Redis (hoặc Redis container local).
  - Xây dựng `Wiki Proxy Module`: thiết kế class gọi sang MediaWiki API.
  - Triển khai Rate Limiting và Exponential Backoff để chống block IP từ server của Wikipedia.
- [ ] **Ngày 5: Review Core Layers & Unit Test cơ bản**
  - Test tương tác dữ liệu với SQL 2019 Graph.
  - Tích hợp logic lưu tạm (cache) raw web responses cho Wiki Proxy.

## TUẦN 2: Giải thuật BFS Live & Pathfinding Module
**Mục tiêu:** Xử lý logic tìm đường BFS hai chiều theo thời gian thực (Real-time).

- [ ] **Ngày 6: Xây dựng Search Module (Autocomplete)**
  - API Route phục vụ Search tên bài viết Wikipedia on-the-fly.
  - Tích hợp OpenSearch API của Wiki để làm autocomplete.
- [ ] **Ngày 7: Live Pathfinding Logic (BFS Engine)**
  - Cài đặt thuật toán Bidirectional BFS trong Next.js API.
  - Mỗi vòng lặp sẽ gọi tới `Wiki Proxy` để bóc tách liên kết của bài viết. Mở rộng hai đầu nút (Source & Target).
- [ ] **Ngày 8: Asynchronous Queuing & Performance Tuning**
  - Do fetch API nhiều, áp dụng Promise.all kèm chunking giới hạn concurency.
  - Viết logic thoát sớm (early exit) khi một trong hai nhánh chạm nhau.
- [ ] **Ngày 9: Caching Success Paths (SQL Graph)**
  - Khi luồng Live BFS tìm ra một đường (Path) thành công, hệ thống tự động insert các Nodes và Edges đó vào trong cơ sở dữ liệu SQL Server 2019 Graph.
  - Những lần query sau, hệ thống sẽ ưu tiên dùng lệnh `SHORTEST_PATH` của SQL Server truy vấn trước khi gọi Live BFS.
- [ ] **Ngày 10: Tối ưu Bộ đệm (Cache) & Thử nghiệm**
  - Toàn bộ danh sách chuỗi Cached Paths sẽ được đồng bộ lên Redis (TTL).
  - Test POST request đảm bảo code không gặp Timeout trên Vercel (giới hạn thường là 10s-60s tuỳ tier). Cân nhắc setup background worker nếu Vercel Timeout.

## TUẦN 3: Giao diện Front-End, Visualization & Lịch sử
**Mục tiêu:** Hiển thị dữ liệu đồ họa, giúp trải nghiệm Web hiện đại theo chuẩn mobile-first.

- [ ] **Ngày 11: Base UI, Navbar, & Theme Configuration**
  - Xây dựng file Layout ở `apps/web/src/app/layout.tsx`.
  - Design Next.js Dark Mode toggle. Nút chuyển ngôn ngữ vi/enWiki.
- [ ] **Ngày 12: React Flow & Graph Visualization**
  - Tích hợp package đồ thị `reactflow`.
  - Viết module logic chuẩn hóa mảng `nodes` và `edges` cho React Flow hiển thị.
- [ ] **Ngày 13: Search Page & Logic Data Fetching**
  - Cấu tạo giao diện điểm A và B.
  - Loading UI real-time (ví dụ tiến trình đang fetch ở level mấy).
- [ ] **Ngày 14: Trang Lịch sử Tìm kiếm (User Dashboard)**
  - Render màn hình Dashboard thống kê cho tài khoản.
  - Truy xuất lịch sử từ Auth DB.
- [ ] **Ngày 15: Heatmap Module & Tối ưu Giao diện**
  - Cập nhật số đếm thống kê mỗi khi có node xuất hiện vào một bảng `HeatmapStats`.
  - Vẽ biểu đồ hiển thị "Top các bài nối nhiều nhất".

## TUẦN 4: Polish, QA, CI/CD & Production Launch
**Mục tiêu:** Sửa lỗi edge-cases, tính năng chia sẻ và Deploy.

- [ ] **Ngày 16: System Polish & SEO Management**
  - Next.js metadata, sitemap.xml.
  - Cấu hình PWA manifests.
- [ ] **Ngày 17: Tính năng Chia sẻ Link (Permalink)**
  - Sinh Shared UUID link bằng cách dùng Base64 hoặc Insert thẳng vào SQL.
  - Cấu hình OpenGraph Dynamic Image (`app/api/og/route.ts`).
- [ ] **Ngày 18: System Testing & Edge Cases Fixes**
  - Xử lý các trang vòng lặp và trang chết trên Wiki. Bổ sung thông báo "Max node limits reached".
- [ ] **Ngày 19: CI/CD Pipeline Build**
  - Test lệnh Github Actions. File Docker Compose (nếu test môi trường local).
- [ ] **Ngày 20: Cloud Deployment (Vercel & Azure)**
  - Vercel Frontend + API.
  - Khởi chạy Azure SQL 2019. Check log monitor. 
