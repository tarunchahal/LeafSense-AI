import sqlite3
import hashlib
import uuid
import os

class DatabaseManager:
    def __init__(self, db_path='plant_disease.db'):
        self.db_path = db_path
        self.setup_database()
        
    def get_connection(self):
        return sqlite3.connect(self.db_path, check_same_thread=False)
        
    def setup_database(self):
        """Setup SQLite database"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    full_name TEXT,
                    role TEXT DEFAULT 'user',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP,
                    is_active BOOLEAN DEFAULT 1
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS detections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    predicted_disease TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    detection_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            ''')
            
            try:
                cursor.execute('ALTER TABLE users ADD COLUMN last_login TIMESTAMP')
            except sqlite3.OperationalError:
                pass 
            
            cursor.execute('SELECT COUNT(*) FROM users WHERE role = "admin"')
            admin_count = cursor.fetchone()[0]
            
            if admin_count == 0:
                admin_password = hashlib.sha256("admin123".encode()).hexdigest()
                cursor.execute('''
                    INSERT INTO users (username, email, password_hash, full_name, role)
                    VALUES (?, ?, ?, ?, ?)
                ''', ("admin", "admin@plantdisease.com", admin_password, "Admin", "admin"))
            
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Database setup error: {e}")

    def hash_password(self, password):
        return hashlib.sha256(password.encode()).hexdigest()
    
    def verify_password(self, password, hashed):
        return self.hash_password(password) == hashed
        
    def register_user(self, username, email, password, full_name):
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            password_hash = self.hash_password(password)
            cursor.execute('''
                INSERT INTO users (username, email, password_hash, full_name)
                VALUES (?, ?, ?, ?)
            ''', (username, email, password_hash, full_name))
            conn.commit()
            conn.close()
            return True
        except sqlite3.IntegrityError:
            return False

    def authenticate_user(self, username, password):
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, username, password_hash, full_name, role FROM users 
                WHERE username = ?
            ''', (username,))
            user = cursor.fetchone()
            
            if user and self.verify_password(password, user[2]):
                cursor.execute('''
                    UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
                ''', (user[0],))
                conn.commit()
                conn.close()
                return {"id": user[0], "username": user[1], "full_name": user[3], "role": user[4]}
            conn.close()
            return None
        except Exception as e:
            print(f"Auth error: {e}")
            return None

    def save_detection(self, user_id, predicted_disease, confidence):
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO detections (user_id, predicted_disease, confidence)
                VALUES (?, ?, ?)
            ''', (user_id, predicted_disease, float(confidence)))
            detection_id = cursor.lastrowid
            conn.commit()
            conn.close()
            return detection_id
        except Exception as e:
            print(f"Save detection error: {e}")
            return None

    def get_user_detections(self, user_id):
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, predicted_disease, confidence, detection_time
                FROM detections WHERE user_id = ? ORDER BY detection_time DESC LIMIT 50
            ''', (user_id,))
            detections = cursor.fetchall()
            conn.close()
            
            clean_detections = []
            for d in detections:
                try:
                    clean_detections.append({
                        "id": d[0],
                        "predicted_disease": d[1],
                        "confidence": float(d[2]),
                        "detection_time": d[3]
                    })
                except Exception:
                    pass
            return clean_detections
        except Exception as e:
            print(f"Get detections error: {e}")
            return []
