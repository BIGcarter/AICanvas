# 🚀 快速启动指南

## 1. 环境准备

确保你的系统已安装：
- Python 3.8+
- pip

## 2. 配置环境变量

复制 `.env` 文件并填入你的 API Key：
```bash
cp .env.example .env
# 编辑 .env 文件，填入你的 OpenAI API Key
```

## 3. 启动服务

### 方法一：使用启动脚本（推荐）
```bash
./start.sh
```

### 方法二：手动启动
```bash
# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate  # macOS/Linux
# 或
venv\Scripts\activate     # Windows

# 安装依赖
pip install -r requirements.txt

# 启动服务
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 4. 验证服务

服务启动后，访问：
- 健康检查：http://localhost:8000/
- API 文档：http://localhost:8000/docs
- 交互式测试：http://localhost:8000/docs#/default

## 5. 测试 API

运行测试脚本：
```bash
python test_api.py
```

或使用 curl 测试：
```bash
# 健康检查
curl http://localhost:8000/

# 执行研究
curl -X POST "http://localhost:8000/research" \
  -H "Content-Type: application/json" \
  -d '{"query": "人工智能在医疗领域的应用"}'
```

## 6. 停止服务

在终端中按 `Ctrl+C`

## 🆘 常见问题

### Q: 研究过程很慢
A: GPT Researcher 会自动管理研究深度，这是正常现象
