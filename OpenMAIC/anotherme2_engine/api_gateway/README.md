# API Gateway (Phase 1)

统一后端网关：对接 OpenMAIC 课程生成与 AnotherMe2 拍题视频生成。

## 启动

```bash
python run_gateway.py
python run_gateway_worker.py
```

## 主要接口

- `POST /v1/uploads` 上传拍题图片，返回 `object_key`
- `POST /v1/jobs` 创建任务（`course_generate` / `problem_video_generate` / `study_package_generate`）
- `GET /v1/jobs/{job_id}` 查询任务状态
- `GET /v1/jobs/{job_id}/result` 查询任务结果

## 统一任务状态机

- `queued -> running -> succeeded|failed`
- 统一返回字段：`progress`、`step`、`error_code`、`error_message`、`result`

## 任务输入契约

- `course_generate`
  - `requirement` 必填
  - `language` 默认 `zh-CN`
  - `options`: `enable_web_search`、`enable_image_generation`、`enable_video_generation`、`enable_tts`、`agent_mode`
- `problem_video_generate`
  - `image_object_key` 必填
  - `problem_text` 可选
  - `geometry_file` 可选
  - `output_profile` 默认 `1080p`
- `study_package_generate`
  - `source.type`: `topic | photo`
  - `source.topic` 或 `source.image_object_key`
  - `outputs`: `course:boolean`、`problem_video:boolean`

## 任务输出契约

- `course_generate` -> `{classroom_id, classroom_url, scenes_count}`
- `problem_video_generate` -> `{video_url, duration_sec, script_steps_count, debug_bundle_url}`
- `study_package_generate` -> `{package_id, course_result?, problem_video_result?}`

## 关键环境变量

- `GATEWAY_DATABASE_URL`（例如 `postgresql+psycopg://user:pass@localhost:5432/anotherme2`）
- `GATEWAY_REDIS_URL`（例如 `redis://localhost:6379/0`）
- `OPENMAIC_BASE_URL`（例如 `http://localhost:3000`）
- `OBJECT_STORAGE_DRIVER`（`local` / `s3` / `minio`）
- `OBJECT_STORAGE_BUCKET`、`OBJECT_STORAGE_ENDPOINT_URL`、`OBJECT_STORAGE_ACCESS_KEY`、`OBJECT_STORAGE_SECRET_KEY`

默认支持 `local` 存储用于本地调试；生产建议使用 MinIO/S3。
