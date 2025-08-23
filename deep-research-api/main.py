import asyncio
import logging
from typing import Dict, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
load_dotenv(override=True)
import sys

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Deep Research API", version="1.0.0")

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 请求和响应模型
class ResearchRequest(BaseModel):
    query: str
    report_type: str = "research_report"

class ResearchResponse(BaseModel):
    success: bool
    topic: str
    summary: str

# 全局任务管理
tasks: Dict[str, asyncio.Task] = {}
current_task_id: Optional[str] = None

async def long_async_task(query: str, report_type: str) -> dict:
    """长时间运行的异步研究任务"""
    try:
        # 导入 GPT Researcher
        from gpt_researcher import GPTResearcher
        
        # 设置环境变量
        api_key = os.getenv("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_BASE_URL")
        fast_llm = os.getenv("FAST_LLM")
        
        if not api_key:
            raise ValueError("OPENAI_API_KEY 环境变量未设置")
        
        logger.info(f"开始研究查询: {query}")
        logger.info(f"API Key: {api_key[:10]}...")
        logger.info(f"Base URL: {base_url}")
        logger.info(f"Fast LLM: {fast_llm}")
        
        # 创建 GPT Researcher 实例
        researcher = GPTResearcher(
            query=query,
            report_type=report_type
        )
        
        # 执行研究
        research_result = await researcher.conduct_research()
        
        # 生成报告
        report = await researcher.write_report()
        
        return {
            "success": True,
            "topic": query,
            "summary": report
        }
        
    except asyncio.CancelledError:
        logger.info("研究任务被用户取消")
        raise
    except Exception as e:
        logger.error(f"研究过程中发生错误: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/research", response_model=ResearchResponse)
async def conduct_research(request: ResearchRequest):
    """执行研究任务"""
    global current_task_id, tasks
    
    # 如果有正在进行的任务，先取消它
    if current_task_id and current_task_id in tasks:
        logger.info(f"取消正在进行的任务: {current_task_id}")
        tasks[current_task_id].cancel()
        del tasks[current_task_id]
    
    # 创建新的任务
    task_id = f"research_{int(asyncio.get_event_loop().time())}"
    task = asyncio.create_task(long_async_task(request.query, request.report_type))
    tasks[task_id] = task
    current_task_id = task_id
    
    logger.info(f"创建研究任务: {task_id}")
    
    try:
        # 等待任务完成
        result = await task
        
        if result.get("success"):
            response = ResearchResponse(
                success=True,
                topic=result["topic"],
                summary=result["summary"]
            )
            logger.info("研究完成")
            return response
        else:
            raise HTTPException(
                status_code=500,
                detail=f"GPT Researcher 执行失败: {result.get('error', '未知错误')}"
            )
            
    except asyncio.CancelledError:
        logger.info("研究任务被取消")
        raise HTTPException(
            status_code=499,  # Client Closed Request
            detail="研究任务被用户取消"
        )
    except Exception as e:
        logger.error(f"研究过程中发生错误: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"研究失败: {str(e)}"
        )
    finally:
        # 清理任务
        if task_id in tasks:
            del tasks[task_id]
        if current_task_id == task_id:
            current_task_id = None

@app.post("/cancel-research")
async def cancel_research():
    """取消当前进行的研究"""
    global current_task_id, tasks
    
    if not current_task_id or current_task_id not in tasks:
        return {"message": "No research in progress", "success": False}
    
    try:
        logger.info(f"用户请求取消研究任务: {current_task_id}")
        
        # 取消任务
        task = tasks[current_task_id]
        task.cancel()
        
        # 等待任务取消完成
        try:
            await task
        except asyncio.CancelledError:
            logger.info("研究任务已成功取消")
        
        # 清理任务
        del tasks[current_task_id]
        current_task_id = None
        
        return {"message": "Research cancelled successfully", "success": True}
        
    except Exception as e:
        logger.error(f"取消研究时发生错误: {e}")
        return {"message": f"Failed to cancel research: {str(e)}", "success": False}

@app.get("/research-status")
async def get_research_status():
    """获取当前研究状态"""
    global current_task_id, tasks
    
    if current_task_id and current_task_id in tasks:
        task = tasks[current_task_id]
        if task.done():
            if task.cancelled():
                return {"status": "cancelled", "message": "Research was cancelled"}
            else:
                return {"status": "completed", "message": "Research completed"}
        else:
            return {"status": "running", "task_id": current_task_id, "message": "Research in progress"}
    else:
        return {"status": "idle", "message": "No research in progress"}

@app.get("/debug-tasks")
async def debug_tasks():
    """调试任务状态"""
    global current_task_id, tasks
    
    debug_info = {
        "current_task_id": current_task_id,
        "total_tasks": len(tasks),
        "task_details": {}
    }
    
    for task_id, task in tasks.items():
        debug_info["task_details"][task_id] = {
            "done": task.done(),
            "cancelled": task.cancelled(),
            "exception": str(task.exception()) if task.done() and not task.cancelled() else None
        }
    
    return debug_info

@app.get("/")
async def root():
    """健康检查端点"""
    return {"message": "Deep Research API is running", "status": "healthy"}

@app.get("/test-gpt-researcher")
async def test_gpt_researcher():
    """测试 GPT Researcher 基本功能"""
    try:
        from gpt_researcher import GPTResearcher
        
        # 测试创建实例
        researcher = GPTResearcher(
            query="test query",
            report_type="research_report"
        )
        
        return {
            "success": True,
            "message": "GPT Researcher 实例创建成功",
            "methods": {
                "conduct_research": hasattr(researcher, 'conduct_research'),
                "write_report": hasattr(researcher, 'write_report')
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)