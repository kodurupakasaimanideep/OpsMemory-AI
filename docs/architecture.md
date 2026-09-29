# OpsMind Architecture

## System Diagram
```
                     ┌───────────────────────────┐
                     │       User Interface      │
                     │ React, TypeScript, Lucide │
                     └─────────────┬─────────────┘
                                   │ HTTP/JSON
                                   ▼
                     ┌───────────────────────────┐
                     │      FastAPI Backend      │
                     │    Async REST Services    │
                     └─────────────┬─────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
     ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
     │  Incident Agent  │ │ Hindsight Memory │ │ Telemetry Engine │
     │  & LLM Reasoning │ │   Vector & Graph │ │ & Metrics Logger │
     └────────┬─────────┘ └────────┬─────────┘ └──────────────────┘
              │                    │
              └──────────┬─────────┘
                         ▼
             ┌─────────────────────────┐
             │ Root Cause Engine &     │
             │ Evidence Chain Builder  │
             └─────────────────────────┘
```

## Memory Retrieval Mechanism
OpsMind integrates the **Hindsight Memory Architecture**:
1. **Semantic Extraction**: Extracts incident vectors (service, error code, deployment context, symptoms).
2. **Episodic Matching**: Queries historical incident records in Hindsight with confidence scoring.
3. **Graph Associator**: Correlates multiple previous incidents that share resolution patterns.
4. **Learning Feedback Loop**: When an engineer marks an incident as resolved with feedback, OpsMind stores new episodic and semantic nodes, reinforcing future queries.
