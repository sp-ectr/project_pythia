from pydantic import BaseModel
from project_pythia.app.schemas.bundle import BundleId

class PaymentCreate(BaseModel):
    user_id: int
    bundle_id: BundleId
    tokens: int
    stars: int