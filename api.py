from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import numpy as np
import tensorflow as tf
from PIL import Image
import io, json, os, sys

# Load config
sys.path.insert(0, os.path.dirname(__file__))
from config import GEMINI_API_KEY
from database import DatabaseManager
import google.generativeai as genai

genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI(title="LeafSense-AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    if request.method == "POST":
        body = await request.body()
        if "multipart/form-data" not in request.headers.get("content-type", ""):
            try:
                print(f"DEBUG INCOMING BODY: {body.decode()[:500]}")
            except Exception:
                pass
        # Re-create the request to ensure the next handler can read the body
        async def receive():
            return {"type": "http.request", "body": body}
        request = Request(request.scope, receive)
    response = await call_next(request)
    return response

db = DatabaseManager()

# --- Load Model ---
model = None
class_indices = {}
try:
    with open('class_indices.json', 'r') as f:
        class_indices = json.load(f)
    if os.path.exists('best_model.h5'):
        model = tf.keras.models.load_model('best_model.h5')
    elif os.path.exists('plant_disease_final.h5'):
        model = tf.keras.models.load_model('plant_disease_final.h5')
    print("✅ Model loaded successfully")
except Exception as e:
    print(f"⚠️ Model load failed: {e}")

# --- Pydantic Models ---
class LoginData(BaseModel):
    username: str
    password: str

class RegisterData(BaseModel):
    username: str
    email: str
    full_name: str
    password: str

class ChatRequest(BaseModel):
    question: str
    disease: Optional[str] = None
    language: Optional[str] = "en"

class GuidanceRequest(BaseModel):
    category: str       # "weather" | "season" | "tips" | "crop"
    selection: str      # e.g. "Humid", "Summer", "Organic Farming", "Tomato"
    language: Optional[str] = "en"

# --- Language map ---
LANG_NAMES = {
    "en": "English", "hi": "Hindi", "bn": "Bengali", "ta": "Tamil",
    "te": "Telugu", "mr": "Marathi", "gu": "Gujarati", "kn": "Kannada",
    "ml": "Malayalam", "pa": "Punjabi", "or": "Odia", "as": "Assamese"
}

# --- Auth Routes ---
@app.post("/api/auth/login")
async def login(data: LoginData):
    user = db.authenticate_user(data.username, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {"status": "success", "user": user}

@app.post("/api/auth/register")
async def register(data: RegisterData):
    success = db.register_user(data.username, data.email, data.password, data.full_name)
    if not success:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    return {"status": "success", "message": "Registered successfully"}

# --- Predict Route ---
@app.post("/api/predict")
async def predict(user_id: int, file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    try:
        contents = await file.read()
        img = Image.open(io.BytesIO(contents)).convert('RGB').resize((224, 224))
        arr = np.expand_dims(np.array(img) / 255.0, axis=0)
        pred = model.predict(arr)
        idx = int(np.argmax(pred))
        confidence = float(pred[0][idx]) * 100
        class_names = list(class_indices.keys())
        predicted = class_names[idx] if idx < len(class_names) else "Unknown"
        db.save_detection(user_id, predicted, confidence)
        return {"status": "success", "prediction": predicted, "confidence": round(confidence, 2)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Detection History ---
@app.get("/api/detections/{user_id}")
async def get_detections(user_id: int):
    return {"status": "success", "data": db.get_user_detections(user_id)}

# --- AI Chat ---
@app.post("/api/chat")
async def chat(req: ChatRequest):
    try:
        print(f"DEBUG Chat Req: {req}")
        lang = LANG_NAMES.get(req.language, "English")
        context = f"about the plant disease '{req.disease}'" if req.disease else "about plant diseases and farming"
        prompt = f"""You are an expert agricultural advisor. The user is asking {context}.
Question: {req.question}
CRITICAL: Respond ONLY in {lang} language. Be practical, concise and helpful."""
        
        gemini = genai.GenerativeModel('gemini-2.5-flash')
        response = gemini.generate_content(prompt)
        
        if not response.text:
             print("AI Chat Warning: Empty response from Gemini")
             return {"status": "success", "response": "The AI could not generate a response for this query."}
             
        return {"status": "success", "response": response.text}
    except Exception as e:
        import traceback
        print(f"AI Chat Error Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Disease Info ---
@app.get("/api/disease-info")
async def disease_info(disease: str, language: str = "en"):
    try:
        print(f"DEBUG Disease Info: {disease}, lang: {language}")
        lang = LANG_NAMES.get(language, "English")
        prompt = f"""Provide comprehensive information about the plant disease: {disease.replace('_', ' ')}.
CRITICAL: Respond ONLY in {lang} language.
Include: 1. What is this disease 2. Symptoms 3. Causes 4. Treatment 5. Prevention 6. Affected crops
Format with clear headings. Be practical for farmers."""
        gemini = genai.GenerativeModel('gemini-2.5-flash')
        response = gemini.generate_content(prompt)
        return {"status": "success", "info": response.text}
    except Exception as e:
        import traceback
        print(f"Disease Info Error Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Farming Guidance (Weather / Season / Tips / Crop Library) ---
@app.post("/api/guidance")
async def guidance(req: GuidanceRequest):
    try:
        print(f"DEBUG Guidance Req: {req}")
        lang = LANG_NAMES.get(req.language, "English")
        if req.category == "weather":
            prompt = f"""Provide comprehensive farming guidance for {req.selection} weather conditions.
CRITICAL: Respond ONLY in {lang} language.
Include: 1. Best crops to grow 2. Irrigation schedule 3. Fertilizer recommendations
4. Disease prevention tips 5. Farming practices 6. Crops to avoid 7. Precautions"""
        elif req.category == "season":
            prompt = f"""Provide a comprehensive seasonal farming guide for {req.selection}.
CRITICAL: Respond ONLY in {lang} language.
Include: 1. Crops to plant 2. Harvesting schedule 3. Fertilizer timing
4. Disease prevention 5. Irrigation needs 6. Best practices 7. What to avoid"""
        elif req.category == "tips":
            prompt = f"""Provide 12 practical farming tips about {req.selection}.
CRITICAL: Respond ONLY in {lang} language.
Make it actionable and easy to understand for farmers. Number each tip clearly."""
        elif req.category == "crop":
            prompt = f"""Provide comprehensive cultivation guide for {req.selection}.
CRITICAL: Respond ONLY in {lang} language.
Include: 1. Best season to grow 2. Soil requirements 3. Water needs 4. Fertilizer
5. Common diseases and prevention 6. Harvesting time 7. Yield expectations 8. Best practices"""
        else:
            raise HTTPException(status_code=400, detail="Unknown category")

        gemini = genai.GenerativeModel('gemini-2.5-flash')
        response = gemini.generate_content(prompt)
        return {"status": "success", "content": response.text}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Guidance Error Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
