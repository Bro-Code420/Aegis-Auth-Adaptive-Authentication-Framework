from src.api.main import app

if __name__ == "__main__":
    import uvicorn
    from src.config.settings import API_HOST, API_PORT, API_RELOAD
    
    uvicorn.run(
        "main:app",
        host=API_HOST,
        port=API_PORT,
        reload=API_RELOAD,
        log_level="info",
    )
