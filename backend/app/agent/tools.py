from typing import Dict, Any, List
from ..utils.helpers import get_data_dir, load_json_file
from ..hindsight.memory import memory_engine

class DevOpsAgentTools:
    @staticmethod
    def read_service_logs(service_name: str, lines: int = 50) -> List[str]:
        data_dir = get_data_dir()
        log_file = data_dir / "logs" / "connection_pool_exhaustion.log"
        if "order" in service_name.lower():
            log_file = data_dir / "logs" / "database_failure.log"
        elif "auth" in service_name.lower():
            log_file = data_dir / "logs" / "api_timeout.log"

        if log_file.exists():
            with open(log_file, "r", encoding="utf-8") as f:
                return [line.strip() for line in f.readlines()[-lines:]]
        return ["No raw logs available for service."]

    @staticmethod
    def query_hindsight_memory(query: str) -> List[Dict[str, Any]]:
        store = memory_engine.get_store()
        return store.get("recently_learned", [])

    @staticmethod
    def get_runbook(runbook_id: str) -> str:
        data_dir = get_data_dir()
        rb_file = data_dir / "runbooks" / f"{runbook_id}.md"
        if rb_file.exists():
            with open(rb_file, "r", encoding="utf-8") as f:
                return f.read()
        return "Runbook not found."

agent_tools = DevOpsAgentTools()
