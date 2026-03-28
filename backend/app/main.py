from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routes import router
from app.errors import AppError

app = FastAPI(
    title="PSRCHIVE Viewer Backend",
    version="0.1.0",
    description="Data server for interactive pulsar archive visualization",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """Handle all AppError exceptions and return appropriate JSON responses."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.message,
            **exc.details
        }
    )


app.include_router(router, prefix="/api")
