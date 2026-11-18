# Novagroup Multi-Agent System

Hệ thống 3 sub-agent chạy tuần tự, mỗi agent đọc output của agent trước:

1. `research-agent`  → `outputs/01-research.md`   (use case trải nghiệm số của các tập đoàn đa ngành thế giới)
2. `proposal-agent`  → `outputs/02-proposal.md`   (use case phù hợp hệ sinh thái Novagroup)
3. `prototype-agent` → `outputs/prototypes/`      (prototype HTML chạy được cho từng use case)

Chạy toàn bộ pipeline: `/novagroup [chủ đề/ngành ưu tiên, tùy chọn]`.
Chạy từng bước: gọi trực tiếp agent theo tên (ví dụ "dùng proposal-agent ...").

## Quy ước
- Ngôn ngữ đầu ra: tiếng Việt (thuật ngữ kỹ thuật giữ tiếng Anh).
- Không bịa số liệu/nguồn: mọi use case nghiên cứu phải có URL nguồn; điều gì không xác minh được thì ghi "chưa xác minh".
- Thông tin về Novagroup (các công ty thành viên, ngành, hệ thống khách hàng) phải được xác minh qua web trước khi dùng; chỉ coi là giả định khi không tìm được và ghi rõ.
- Prototype dùng dữ liệu mẫu giả lập, không chứa dữ liệu cá nhân thật.
