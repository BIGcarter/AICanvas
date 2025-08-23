

from dotenv import load_dotenv
import os
from gpt_researcher import GPTResearcher
import asyncio

load_dotenv(override=True)
print(os.getenv("OPENAI_API_KEY"))

async def get_report(query: str, report_type: str):
    researcher = GPTResearcher(query, report_type)
    research_result = await researcher.conduct_research()
    report = await researcher.write_report()
    
    # Get additional information
    research_context = researcher.get_research_context()
    research_costs = researcher.get_costs()
    research_images = researcher.get_research_images()
    research_sources = researcher.get_research_sources()
    
    return report, research_context, research_costs, research_images, research_sources

if __name__ == "__main__":
    # query = "what team may win the NBA finals?"
    # report_type = "research_report"

    query = "人工智能在医疗领域的应用"
    report_type = "resource_report"


    report, context, costs, images, sources = asyncio.run(get_report(query, report_type))
    
    # print("Report:")
    # print(report)
    # print("\nResearch Costs:")
    # print(costs)
    # print("\nNumber of Research Images:")
    # print(len(images))
    # print("\nNumber of Research Sources:")
    # print(len(sources))