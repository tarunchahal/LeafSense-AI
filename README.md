🍃 LeafSense-AI: Intelligent Plant Disease Diagnostic System

   

LeafSense-AI is a full-stack agricultural AI platform that combines deep learning plant disease detection with Gemini-powered multilingual farming guidance. It helps farmers and researchers instantly identify plant diseases, understand symptoms, receive treatment recommendations, and track historical detections.


---

✨ Key Features

🔍 AI Disease Detection using TensorFlow/Keras CNN

💬 Gemini-powered multilingual chatbot

📜 Disease treatment + prevention guidance

🌦️ Season-aware farming recommendations

🗂️ Detection history with SQLite

🌍 12-language support

🔐 User authentication system

📊 Confidence score based predictions



---

🏗️ System Architecture

graph TD
    User((Farmer)) -->|Upload Leaf Image| FE[Frontend: HTML/CSS/JS]
    FE -->|REST API| BE[Backend: FastAPI]

    subgraph AI Engines
        BE --> CNN[TensorFlow CNN Model]
        BE --> GEM[Gemini AI Engine]
    end

    subgraph Data Layer
        BE --> DB[(SQLite Database)]
    end

    CNN --> BE
    GEM --> BE
    DB --> BE
    BE --> FE


---

⚙️ Technical Implementation Details

Input Pipeline: 224x224 RGB normalized image preprocessing

Model: CNN trained on PlantVillage-style dataset

Inference: TensorFlow/Keras .h5 model

Prompt Engine: Gemini multilingual dynamic prompts

Backend: Async FastAPI endpoints

Database: Auto-initialized SQLite

Frontend State: localStorage session persistence

Authentication: SHA-256 password hashing



---

🛠️ Tech Stack

Frontend

HTML5

CSS3

JavaScript (Vanilla)


Backend

FastAPI

Python

SQLite3


AI/ML

TensorFlow

Keras

Gemini API



---

🚀 Getting Started

1) Clone repository

git clone https://github.com/your-username/LeafSense-AI.git
cd LeafSense-AI

2) Create virtual environment

python -m venv venv
venv\\Scripts\\activate

3) Install dependencies

pip install -r requirements_simple.txt

4) Configure Gemini API key

Add your API key in config.py:

GEMINI_API_KEY = "YOUR_API_KEY_HERE"

5) Run backend

python api.py

Then open:

frontend/index.html


---

📦 Project Files Distribution

To keep the repository lightweight and easy to clone, the project is split between GitHub and Google Drive.

📁 Available in GitHub

Backend source code

Frontend UI

SQLite database logic

Config and requirements

README documentation

JSON class mappings


☁️ Available on Google Drive

Large ML assets and datasets:

best_model.h5

backup/final model files

Data.zip

extra project resources


📥 Google Drive Folder
https://drive.google.com/drive/folders/19uvSl6XpTajdxCkH6iZz9ht3GNCE_Fe7?usp=drive_link


---

📡 API Endpoints

Method	Endpoint	Description

POST	/api/auth/register	Register user
POST	/api/auth/login	Login
POST	/api/predict	Predict plant disease
GET	/api/detections/{id}	Get detection history
POST	/api/chat	AI farming chatbot
POST	/api/guidance	Crop guidance



---

🎯 Use Cases

Farmer-side instant disease detection

Research crop health monitoring

Historical disease analytics

Multilingual farmer support assistant

Smart farming advisory workflows



---

🗺️ Roadmap

[ ] Mobile app for farmers (Android)

[ ] Offline prediction using TensorFlow Lite

[ ] Live weather API based crop guidance

[ ] Disease severity estimation

[ ] Multi-image batch prediction

[ ] Fertilizer recommendation engine

[ ] Voice chatbot in Indian languages

[ ] Farmer community forum

[ ] Crop yield prediction

[ ] Drone field disease scanning



---

📄 License

This project is licensed under the MIT License. See the LICENSE file for details.


---

👨‍💻 Author

Tarun Chahal AI | ML | Full Stack | Agricultural Intelligence Systems


---

Built with ❤️ for smarter agriculture and real farmer impact 🌱
