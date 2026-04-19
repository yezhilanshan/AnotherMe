"""Run API gateway server."""

import uvicorn

from api_gateway.config import get_settings


if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run("api_gateway.app:app", host=settings.app_host, port=settings.app_port, reload=False)
