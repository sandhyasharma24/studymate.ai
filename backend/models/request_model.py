from pydantic import BaseModel, Field


class TopicRequest(BaseModel):

    topic: str

    num_flashcards: int = Field(
        default=5,
        ge=1,
        le=20
    )

    mode: str = Field(
        default="general"
    )


class RagQueryRequest(BaseModel):

    question: str