from fastapi import FastAPI

app = FastAPI(title="Pythia API")

@app.get("/health")
async def health():
    return {"status": "alive", "logic": "monolith"}