from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import logging
from gpt_researcher import GPTResearcher
from dotenv import load_dotenv
import os
load_dotenv(override=True)


# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Deep Research API",
    description="基于 GPT Researcher 的深度研究接口",
    version="1.0.0"
)

# 添加 CORS 中间件，允许你的画布前端调用
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境建议限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 请求模型
class ResearchRequest(BaseModel):
    query: str
    report_type: str = "research_report"  # 默认研究报告类型


# 响应模型
class ResearchResponse(BaseModel):
    success: bool
    topic: str
    summary: str

@app.get("/")
async def root():
    """健康检查端点"""
    return {"message": "Deep Research API is running", "status": "healthy"}

@app.post("/research", response_model=ResearchResponse)
async def conduct_research(request: ResearchRequest):
    """
    执行深度研究
    
    Args:
        request: 包含查询、报告类型等参数
        
    Returns:
        结构化的研究报告
    """
    try:
        logger.info(f"开始研究查询: {request.query}")
        
        # 检查环境变量
        import os
        api_key = os.getenv("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_BASE_URL")
        fast_llm = os.getenv("FAST_LLM")
        
        logger.info(f"API Key: {api_key[:10] if api_key else 'None'}...")
        logger.info(f"Base URL: {base_url}")
        logger.info(f"Fast LLM: {fast_llm}")
        
        if not api_key:
            raise HTTPException(
                status_code=400,
                detail="未找到 OPENAI_API_KEY 环境变量"
            )
        
        # 创建 GPT Researcher 实例
        logger.info("创建 GPT Researcher 实例...")
        try:
            researcher = GPTResearcher(
                query=request.query,
                report_type=request.report_type
            )
            logger.info("GPT Researcher 实例创建成功")
        except Exception as e:
            logger.error(f"创建 GPT Researcher 实例失败: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"创建研究实例失败: {str(e)}"
            )
        
        # 执行研究
        logger.info("正在执行研究...")
        research_result = await researcher.conduct_research()
        logger.info(f"研究结果: {research_result}")
        
        # 生成报告
        logger.info("正在生成报告...")
        report = await researcher.write_report()
        logger.info(f"报告长度: {len(report) if report else 0}")
        
        # 构建响应 - 只返回必要字段
        response = ResearchResponse(
            success=True,
            topic=request.query,
            summary=report or "研究完成，但未生成报告"
        )
        
        logger.info("研究完成")
        return response
        
    except Exception as e:
        logger.error(f"研究过程中发生错误: {str(e)}")
        logger.error(f"错误类型: {type(e)}")
        import traceback
        logger.error(f"错误堆栈: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"研究失败: {str(e)}"
        )

@app.get("/research/{query}")
async def get_research_by_path(query: str, report_type: str = "research_report"):
    """
    通过 GET 请求执行研究（方便测试）
    """
    request = ResearchRequest(query=query, report_type=report_type)
    return await conduct_research(request)

if __name__ == "__main__":
    import uvicorn
    from dotenv import load_dotenv
    import os

    load_dotenv(override=True)
    print(os.getenv("OPENAI_API_KEY"))

    uvicorn.run(app, host="0.0.0.0", port=8000)