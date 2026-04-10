from pydantic import BaseModel, ConfigDict


class City(BaseModel):
    city_id: int
    city: str
    country: str
    latitude: float
    longitude: float

    model_config = ConfigDict(from_attributes=True)
