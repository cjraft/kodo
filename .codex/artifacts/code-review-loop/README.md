# Code Review Loop Artifacts

这个目录用于保存外层 harness 持久化的单轮结果。

约定：

1. 每一轮结果保存为 `round-<n>.json`，例如 `round-1.json`。
2. 文件内容必须满足 [`../../schemas/code-review-round-result.json`](../../schemas/code-review-round-result.json)。
3. 这些文件由外层 controller 在校验通过后写入，不由单轮 worker 直接维护。
4. 如果需要最新快照，可额外维护 `latest.json`，但单轮结果仍以 `round-<n>.json` 为准。
