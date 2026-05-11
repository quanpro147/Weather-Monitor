"""
One-shot entrypoint for GitHub Actions.
Chạy một lần rồi thoát — không có vòng lặp schedule.
GitHub Actions cron job sẽ gọi script này mỗi giờ.
"""
from Collect_RealTime import main

if __name__ == "__main__":
    main()
