# Deep Research API

基于 FastAPI 和 GPT Researcher 的深度研究接口

## 功能特性

- 🔍 深度网络搜索和研究
- 📝 自动生成研究报告
- 🔗 来源引用和链接
- 📊 关键要点提取
- 🏗️ 结构化章节分析

## 安装和运行

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 配置环境变量
创建 `.env` 文件：
```bash
# OpenAI API 配置
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=your_base_url_here
FAST_LLM=your_llm_model_here

# 其他配置
LOG_LEVEL=INFO
```

### 3. 运行服务
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API 接口

### 健康检查
```
GET /
```

### 执行研究
```
POST /research
```

请求体：
```json
{
  "query": "人工智能在医疗领域的应用",
  "report_type": "research_report"
}
```

### 通过路径执行研究
```
GET /research/{query}?report_type=research_report
```

## 响应格式

```json
{
  "success": true,
  "topic": "查询主题",
  "summary": "完整研究报告"
}
```

## 测试

### 使用 curl 测试
```bash
# POST 请求
curl -X POST "http://localhost:8000/research" \
  -H "Content-Type: application/json" \
  -d '{"query": "人工智能在医疗领域的应用"}'

# GET 请求
curl "http://localhost:8000/research/人工智能在医疗领域的应用"
```

### 访问 API 文档
启动服务后，访问：http://localhost:8000/docs

## 注意事项

1. 需要有效的 OpenAI API Key
2. 研究过程可能需要几分钟时间
3. 建议在生产环境中限制 CORS 来源
4. GPT Researcher 会自动管理研究深度和迭代次数