from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import pandas as pd

app = FastAPI()

bundle = joblib.load("model.pkl")
model = bundle["model"]
threshold = bundle["threshold"]
features = bundle["features"]

class RequestData(BaseModel):
    requestRate: float
    uniqueEndpoints: float
    errorRate: float
    uaLen: float
    adminHits: float

@app.post("/predict")
def predict(data: RequestData):
    df = pd.DataFrame([[ 
        data.requestRate,
        data.uniqueEndpoints,
        data.errorRate,
        data.uaLen,
        data.adminHits
    ]], columns=features)

    prob = model.predict_proba(df)[0][1]
    pred = int(prob >= threshold)

    return {
        "prediction": pred,
        "probability": round(prob, 4),
        "threshold": round(threshold, 2)
    }
