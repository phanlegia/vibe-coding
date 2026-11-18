---
description: Chạy pipeline 3 agent (Research → Proposal → Prototype) cho Novagroup
argument-hint: [chủ đề/ngành ưu tiên, tùy chọn]
---

Điều phối pipeline sau, chạy **tuần tự** (mỗi bước phụ thuộc bước trước), dùng Agent tool với đúng subagent_type:

1. `research-agent` — nghiên cứu use case trải nghiệm số của các tập đoàn đa ngành thế giới. Trọng tâm bổ sung từ người dùng: $ARGUMENTS
2. `proposal-agent` — đọc `outputs/01-research.md`, thiết kế use case cho hệ sinh thái Novagroup.
3. `prototype-agent` — đọc `outputs/02-proposal.md`, dựng prototype cho các use case ưu tiên.

Sau mỗi bước, kiểm tra file đầu ra đã tồn tại và có nội dung hợp lý trước khi sang bước tiếp; nếu thiếu, chạy lại agent đó với chỉ dẫn cụ thể. Cuối cùng tóm tắt cho người dùng (tiếng Việt): các file đã tạo, 3 use case được chọn, cách mở prototype, và các giả định/chưa xác minh.
