from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import json
import numpy as np
from scipy import stats
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io
import base64

app = FastAPI(title="WHALE Data Analysis API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/whale_db"
)

def get_db_connection():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

class AnalysisRequest(BaseModel):
    user_id: int
    start_date: str
    end_date: str
    analysis_type: str

class TrendAnalysisResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
    chart: Optional[str] = None

@app.get("/")
async def root():
    return {
        "message": "WHALE Data Analysis API",
        "version": "1.0.0",
        "endpoints": [
            "/api/analysis/mood-trends",
            "/api/analysis/vital-trends",
            "/api/analysis/activity-patterns",
            "/api/analysis/medication-adherence",
            "/api/analysis/sleep-patterns",
            "/api/analysis/ai-recommendations"
        ]
    }

@app.post("/api/analysis/mood-trends", response_model=TrendAnalysisResponse)
async def analyze_mood_trends(request: AnalysisRequest):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT date, emotion_icon, mood_score, mood_detail
            FROM daily_records
            WHERE user_id = %s AND date BETWEEN %s AND %s
            ORDER BY date ASC
        """, (request.user_id, request.start_date, request.end_date))
        
        records = cursor.fetchall()
        cursor.close()
        conn.close()
        
        if not records:
            raise HTTPException(status_code=404, detail="No records found")
        
        dates = [rec['date'].isoformat() for rec in records]
        emotion_icons = [rec['emotion_icon'] or 5 for rec in records]
        mood_scores = [rec['mood_score'] or 5 for rec in records]
        
        emotion_mean = np.mean(emotion_icons)
        emotion_std = np.std(emotion_icons)
        mood_mean = np.mean(mood_scores)
        mood_std = np.std(mood_scores)
        
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8))
        
        ax1.plot(range(len(dates)), emotion_icons, marker='o', linewidth=2, label='Emotion Icon')
        ax1.axhline(y=emotion_mean, color='r', linestyle='--', label=f'Mean: {emotion_mean:.1f}')
        ax1.set_ylabel('Emotion Level (1-10)')
        ax1.set_title('Emotion Trends Over Time')
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        ax1.set_ylim(0, 11)
        
        ax2.plot(range(len(dates)), mood_scores, marker='s', linewidth=2, label='Mood Score', color='green')
        ax2.axhline(y=mood_mean, color='r', linestyle='--', label=f'Mean: {mood_mean:.1f}')
        ax2.set_xlabel('Date')
        ax2.set_ylabel('Mood Score (1-10)')
        ax2.set_title('Mood Score Trends Over Time')
        ax2.legend()
        ax2.grid(True, alpha=0.3)
        ax2.set_ylim(0, 11)
        
        plt.xticks(range(0, len(dates), max(1, len(dates)//10)), 
                   [dates[i] if i < len(dates) else '' for i in range(0, len(dates), max(1, len(dates)//10))],
                   rotation=45)
        
        img_buffer = io.BytesIO()
        plt.savefig(img_buffer, format='png', bbox_inches='tight')
        img_buffer.seek(0)
        img_str = base64.b64encode(img_buffer.getvalue()).decode()
        plt.close()
        
        analysis_data = {
            "period": {
                "start_date": request.start_date,
                "end_date": request.end_date,
                "record_count": len(records)
            },
            "emotion_analysis": {
                "mean": float(emotion_mean),
                "std": float(emotion_std),
                "min": float(min(emotion_icons)),
                "max": float(max(emotion_icons)),
                "trend": "improving" if emotion_icons[-1] > emotion_mean else "declining"
            },
            "mood_analysis": {
                "mean": float(mood_mean),
                "std": float(mood_std),
                "min": float(min(mood_scores)),
                "max": float(max(mood_scores)),
                "trend": "improving" if mood_scores[-1] > mood_mean else "declining"
            },
            "recommendation": generate_mood_recommendation(emotion_mean, mood_mean)
        }
        
        return TrendAnalysisResponse(
            success=True,
            data=analysis_data,
            chart=f"data:image/png;base64,{img_str}"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/api/analysis/vital-trends", response_model=TrendAnalysisResponse)
async def analyze_vital_trends(request: AnalysisRequest):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT date, body_temperature, blood_pressure_systolic, blood_pressure_diastolic, pulse, spo2
            FROM daily_records
            WHERE user_id = %s AND date BETWEEN %s AND %s
            ORDER BY date ASC
        """, (request.user_id, request.start_date, request.end_date))
        
        records = cursor.fetchall()
        cursor.close()
        conn.close()
        
        if not records:
            raise HTTPException(status_code=404, detail="No vital sign records found")
        
        dates = [rec['date'].isoformat() for rec in records]
        temps = [rec['body_temperature'] or 36.5 for rec in records]
        systolics = [rec['blood_pressure_systolic'] or 120 for rec in records]
        diastolics = [rec['blood_pressure_diastolic'] or 80 for rec in records]
        pulses = [rec['pulse'] or 75 for rec in records]
        spo2s = [rec['spo2'] or 98 for rec in records]
        
        fig, axes = plt.subplots(3, 2, figsize=(14, 12))
        
        axes[0, 0].plot(range(len(dates)), temps, marker='o', color='red', linewidth=2)
        axes[0, 0].axhline(y=37.0, color='orange', linestyle='--', alpha=0.7)
        axes[0, 0].set_ylabel('Temperature (°C)')
        axes[0, 0].set_title('Body Temperature Trend')
        axes[0, 0].grid(True, alpha=0.3)
        
        axes[0, 1].plot(range(len(dates)), systolics, marker='o', color='blue', label='Systolic', linewidth=2)
        axes[0, 1].plot(range(len(dates)), diastolics, marker='s', color='lightblue', label='Diastolic', linewidth=2)
        axes[0, 1].set_ylabel('Blood Pressure (mmHg)')
        axes[0, 1].set_title('Blood Pressure Trend')
        axes[0, 1].legend()
        axes[0, 1].grid(True, alpha=0.3)
        
        axes[1, 0].plot(range(len(dates)), pulses, marker='o', color='purple', linewidth=2)
        axes[1, 0].set_ylabel('Pulse (bpm)')
        axes[1, 0].set_title('Pulse Trend')
        axes[1, 0].grid(True, alpha=0.3)
        
        axes[1, 1].plot(range(len(dates)), spo2s, marker='o', color='green', linewidth=2)
        axes[1, 1].axhline(y=95, color='red', linestyle='--', alpha=0.7, label='Low threshold')
        axes[1, 1].set_ylabel('SpO2 (%)')
        axes[1, 1].set_title('SpO2 Trend')
        axes[1, 1].legend()
        axes[1, 1].grid(True, alpha=0.3)
        
        axes[2, 0].axis('off')
        axes[2, 1].axis('off')
        
        plt.tight_layout()
        
        img_buffer = io.BytesIO()
        plt.savefig(img_buffer, format='png', bbox_inches='tight')
        img_buffer.seek(0)
        img_str = base64.b64encode(img_buffer.getvalue()).decode()
        plt.close()
        
        analysis_data = {
            "period": {
                "start_date": request.start_date,
                "end_date": request.end_date,
                "record_count": len(records)
            },
            "temperature": {
                "mean": float(np.mean(temps)),
                "std": float(np.std(temps)),
                "min": float(min(temps)),
                "max": float(max(temps)),
                "normal": len([t for t in temps if 36.0 <= t <= 37.5]) / len(temps) * 100
            },
            "blood_pressure": {
                "systolic_mean": float(np.mean(systolics)),
                "diastolic_mean": float(np.mean(diastolics)),
                "systolic_std": float(np.std(systolics)),
                "diastolic_std": float(np.std(diastolics))
            },
            "pulse": {
                "mean": float(np.mean(pulses)),
                "std": float(np.std(pulses)),
                "min": float(min(pulses)),
                "max": float(max(pulses))
            },
            "spo2": {
                "mean": float(np.mean(spo2s)),
                "std": float(np.std(spo2s)),
                "min": float(min(spo2s)),
                "max": float(max(spo2s)),
                "normal": len([s for s in spo2s if s >= 95]) / len(spo2s) * 100
            },
            "alerts": generate_vital_alerts(temps, systolics, diastolics, spo2s)
        }
        
        return TrendAnalysisResponse(
            success=True,
            data=analysis_data,
            chart=f"data:image/png;base64,{img_str}"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/api/analysis/activity-patterns", response_model=TrendAnalysisResponse)
async def analyze_activity_patterns(request: AnalysisRequest):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT date, exercise, exercise_duration, steps, walking, bathing, washing, tooth_brushing
            FROM daily_records
            WHERE user_id = %s AND date BETWEEN %s AND %s
            ORDER BY date ASC
        """, (request.user_id, request.start_date, request.end_date))
        
        records = cursor.fetchall()
        cursor.close()
        conn.close()
        
        if not records:
            raise HTTPException(status_code=404, detail="No activity records found")
        
        exercise_count = sum(1 for r in records if r['exercise'])
        total_duration = sum(r['exercise_duration'] or 0 for r in records)
        total_steps = sum(r['steps'] or 0 for r in records)
        bathing_count = sum(1 for r in records if r['bathing'])
        washing_count = sum(1 for r in records if r['washing'])
        brushing_count = sum(1 for r in records if r['tooth_brushing'])
        
        fig, axes = plt.subplots(2, 2, figsize=(12, 10))
        
        axes[0, 0].bar(['Exercise', 'No Exercise'], [exercise_count, len(records) - exercise_count], color=['green', 'gray'])
        axes[0, 0].set_title('Exercise Frequency')
        axes[0, 0].set_ylabel('Count')
        
        axes[0, 1].bar(['Bathing', 'Washing', 'Brushing'], 
                       [bathing_count, washing_count, brushing_count], 
                       color=['blue', 'orange', 'purple'])
        axes[0, 1].set_title('Personal Hygiene Activities')
        axes[0, 1].set_ylabel('Count')
        
        axes[1, 0].plot(range(len(records)), [r['exercise_duration'] or 0 for r in records], 
                       marker='o', linewidth=2)
        axes[1, 0].set_title('Daily Exercise Duration')
        axes[1, 0].set_ylabel('Duration (minutes)')
        axes[1, 0].grid(True, alpha=0.3)
        
        axes[1, 1].plot(range(len(records)), [r['steps'] or 0 for r in records], 
                       marker='s', color='green', linewidth=2)
        axes[1, 1].set_title('Daily Steps')
        axes[1, 1].set_ylabel('Steps')
        axes[1, 1].grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        img_buffer = io.BytesIO()
        plt.savefig(img_buffer, format='png', bbox_inches='tight')
        img_buffer.seek(0)
        img_str = base64.b64encode(img_buffer.getvalue()).decode()
        plt.close()
        
        analysis_data = {
            "period": {
                "start_date": request.start_date,
                "end_date": request.end_date,
                "record_count": len(records)
            },
            "exercise": {
                "frequency": exercise_count,
                "frequency_percentage": exercise_count / len(records) * 100,
                "total_duration": total_duration,
                "average_duration": total_duration / exercise_count if exercise_count > 0 else 0
            },
            "steps": {
                "total": total_steps,
                "average_per_day": total_steps / len(records),
                "max_day": max([r['steps'] or 0 for r in records]),
                "min_day": min([r['steps'] or 0 for r in records])
            },
            "hygiene": {
                "bathing": bathing_count,
                "washing": washing_count,
                "tooth_brushing": brushing_count
            },
            "recommendation": generate_activity_recommendation(exercise_count, len(records), total_steps / len(records))
        }
        
        return TrendAnalysisResponse(
            success=True,
            data=analysis_data,
            chart=f"data:image/png;base64,{img_str}"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/api/analysis/medication-adherence", response_model=TrendAnalysisResponse)
async def analyze_medication_adherence(request: AnalysisRequest):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT 
                date,
                morning_medication,
                noon_medication,
                evening_medication,
                bedtime_medication
            FROM daily_records
            WHERE user_id = %s AND date BETWEEN %s AND %s
            ORDER BY date ASC
        """, (request.user_id, request.start_date, request.end_date))
        
        records = cursor.fetchall()
        cursor.close()
        conn.close()
        
        if not records:
            raise HTTPException(status_code=404, detail="No medication records found")
        
        morning_adherence = sum(1 for r in records if r['morning_medication']) / len(records) * 100
        noon_adherence = sum(1 for r in records if r['noon_medication']) / len(records) * 100
        evening_adherence = sum(1 for r in records if r['evening_medication']) / len(records) * 100
        bedtime_adherence = sum(1 for r in records if r['bedtime_medication']) / len(records) * 100
        
        overall_adherence = (morning_adherence + noon_adherence + evening_adherence + bedtime_adherence) / 4
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
        
        medications = ['Morning', 'Noon', 'Evening', 'Bedtime']
        adherences = [morning_adherence, noon_adherence, evening_adherence, bedtime_adherence]
        colors = ['green' if a >= 80 else 'orange' if a >= 60 else 'red' for a in adherences]
        
        ax1.bar(medications, adherences, color=colors)
        ax1.axhline(y=80, color='green', linestyle='--', alpha=0.7, label='Target (80%)')
        ax1.set_ylabel('Adherence (%)')
        ax1.set_title('Medication Adherence by Time of Day')
        ax1.set_ylim(0, 100)
        ax1.legend()
        ax1.grid(True, alpha=0.3, axis='y')
        
        ax2.plot(range(len(records)), 
                [sum([r['morning_medication'], r['noon_medication'], r['evening_medication'], r['bedtime_medication']]) 
                 for r in records],
                marker='o', linewidth=2, color='blue')
        ax2.set_xlabel('Date')
        ax2.set_ylabel('Medications Taken')
        ax2.set_title('Daily Medication Completion')
        ax2.set_ylim(0, 4.5)
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        img_buffer = io.BytesIO()
        plt.savefig(img_buffer, format='png', bbox_inches='tight')
        img_buffer.seek(0)
        img_str = base64.b64encode(img_buffer.getvalue()).decode()
        plt.close()
        
        analysis_data = {
            "period": {
                "start_date": request.start_date,
                "end_date": request.end_date,
                "record_count": len(records)
            },
            "adherence_by_time": {
                "morning": round(morning_adherence, 2),
                "noon": round(noon_adherence, 2),
                "evening": round(evening_adherence, 2),
                "bedtime": round(bedtime_adherence, 2)
            },
            "overall_adherence": round(overall_adherence, 2),
            "adherence_status": "excellent" if overall_adherence >= 90 else "good" if overall_adherence >= 80 else "needs_improvement",
            "recommendation": generate_medication_recommendation(overall_adherence)
        }
        
        return TrendAnalysisResponse(
            success=True,
            data=analysis_data,
            chart=f"data:image/png;base64,{img_str}"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/api/analysis/sleep-patterns", response_model=TrendAnalysisResponse)
async def analyze_sleep_patterns(request: AnalysisRequest):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT date, wake_up_time, sleep_time
            FROM daily_records
            WHERE user_id = %s AND date BETWEEN %s AND %s AND wake_up_time IS NOT NULL AND sleep_time IS NOT NULL
            ORDER BY date ASC
        """, (request.user_id, request.start_date, request.end_date))
        
        records = cursor.fetchall()
        cursor.close()
        conn.close()
        
        if not records:
            raise HTTPException(status_code=404, detail="No sleep records found")
        
        sleep_durations = []
        for r in records:
            wake_time = datetime.strptime(str(r['wake_up_time']), '%H:%M:%S')
            sleep_time = datetime.strptime(str(r['sleep_time']), '%H:%M:%S')
            
            if sleep_time < wake_time:
                duration = (24 - wake_time.hour + sleep_time.hour) * 60 + (sleep_time.minute - wake_time.minute)
            else:
                duration = (wake_time.hour - sleep_time.hour) * 60 + (wake_time.minute - sleep_time.minute)
            
            sleep_durations.append(duration / 60)
        
        dates = [rec['date'].isoformat() for rec in records]
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
        
        ax1.plot(range(len(dates)), sleep_durations, marker='o', linewidth=2, color='blue')
        ax1.axhline(y=7, color='green', linestyle='--', label='Recommended (7h)')
        ax1.axhline(y=8, color='green', linestyle='--', alpha=0.7)
        ax1.set_ylabel('Sleep Duration (hours)')
        ax1.set_title('Daily Sleep Duration')
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        ax1.set_ylim(0, 12)
        
        sleep_quality_bins = [0, 5, 7, 9, 12]
        sleep_quality_labels = ['Poor (<5h)', 'Fair (5-7h)', 'Good (7-9h)', 'Excessive (>9h)']
        hist, _ = np.histogram(sleep_durations, bins=sleep_quality_bins)
        ax2.bar(sleep_quality_labels, hist, color=['red', 'orange', 'green', 'blue'])
        ax2.set_ylabel('Frequency')
        ax2.set_title('Sleep Quality Distribution')
        ax2.grid(True, alpha=0.3, axis='y')
        
        plt.tight_layout()
        
        img_buffer = io.BytesIO()
        plt.savefig(img_buffer, format='png', bbox_inches='tight')
        img_buffer.seek(0)
        img_str = base64.b64encode(img_buffer.getvalue()).decode()
        plt.close()
        
        good_sleep = len([d for d in sleep_durations if 7 <= d <= 9])
        
        analysis_data = {
            "period": {
                "start_date": request.start_date,
                "end_date": request.end_date,
                "record_count": len(records)
            },
            "sleep_statistics": {
                "average_hours": round(np.mean(sleep_durations), 2),
                "std": round(np.std(sleep_durations), 2),
                "min_hours": round(min(sleep_durations), 2),
                "max_hours": round(max(sleep_durations), 2),
                "good_sleep_percentage": round(good_sleep / len(sleep_durations) * 100, 2)
            },
            "sleep_quality": "good" if np.mean(sleep_durations) >= 7 else "poor",
            "recommendation": generate_sleep_recommendation(np.mean(sleep_durations))
        }
        
        return TrendAnalysisResponse(
            success=True,
            data=analysis_data,
            chart=f"data:image/png;base64,{img_str}"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

def generate_mood_recommendation(emotion_mean: float, mood_mean: float) -> str:
    if emotion_mean < 4 and mood_mean < 4:
        return "Low mood detected. Consider recommending professional support or counseling."
    elif emotion_mean > 7 and mood_mean > 7:
        return "Good mood maintained. Continue current activities and lifestyle."
    elif emotion_mean >= 4 and emotion_mean <= 6 and mood_mean >= 4 and mood_mean <= 6:
        return "Stable mood. Monitor for any significant changes."
    else:
        return "Mood fluctuations observed. Consider tracking triggers and patterns."

def generate_vital_alerts(temps: List, systolics: List, diastolics: List, spo2s: List) -> List[str]:
    alerts = []
    
    high_temps = [t for t in temps if t >= 38.0]
    if len(high_temps) / len(temps) > 0.2:
        alerts.append("Frequent high temperature readings detected")
    
    high_bp = [s for s, d in zip(systolics, diastolics) if s >= 160 or d >= 100]
    if len(high_bp) / len(systolics) > 0.2:
        alerts.append("Frequent elevated blood pressure detected")
    
    low_spo2 = [s for s in spo2s if s < 95]
    if len(low_spo2) / len(spo2s) > 0.3:
        alerts.append("Low oxygen saturation detected frequently")
    
    return alerts

def generate_activity_recommendation(exercise_count: int, total_days: int, avg_steps: float) -> str:
    exercise_rate = exercise_count / total_days
    
    if exercise_rate < 0.3 and avg_steps < 5000:
        return "Low activity level. Encourage more physical activity and movement throughout the day."
    elif exercise_rate >= 0.5 and avg_steps >= 7000:
        return "Good activity level maintained. Continue current exercise routine."
    else:
        return "Moderate activity. Consider increasing exercise frequency or intensity."

def generate_medication_recommendation(adherence: float) -> str:
    if adherence >= 90:
        return "Excellent medication adherence. Continue current routine."
    elif adherence >= 80:
        return "Good medication adherence. Monitor for any missed doses."
    elif adherence >= 60:
        return "Moderate adherence. Consider reminder system or medication management support."
    else:
        return "Low adherence detected. Recommend medication counseling and adherence support."

def generate_sleep_recommendation(avg_sleep: float) -> str:
    if 7 <= avg_sleep <= 9:
        return "Adequate sleep duration maintained. Continue current sleep schedule."
    elif avg_sleep < 7:
        return "Insufficient sleep. Recommend sleep hygiene improvement and consultation with healthcare provider."
    else:
        return "Excessive sleep duration. May indicate fatigue or health concerns. Recommend medical evaluation."

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
