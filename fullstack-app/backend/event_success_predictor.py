# event_success_predictor.py
"""
AI Event Success Prediction API
Analyzes events and predicts their likelihood of success based on multiple factors
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from openai import OpenAI
import os

app = FastAPI()

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


class Event(BaseModel):
    id: str
    function_name: str
    location: str
    date: str
    organizer_alias: str
    rsvp_count: int
    max_capacity: int
    club_affiliated: bool
    club_name: Optional[str]
    emoji_vibe: Optional[List[str]]
    invitation_image: Optional[str]


class EventInsightsRequest(BaseModel):
    events: List[Event]


class SuccessPrediction(BaseModel):
    eventId: str
    eventName: str
    score: int  # 0-100
    reason: str
    factors: Dict[str, float]


class EventInsightsResponse(BaseModel):
    successPredictions: List[SuccessPrediction]
    recommendation: str


def calculate_time_score(event_date: str) -> float:
    """
    Score based on timing (weekends, evenings = higher scores)
    """
    try:
        dt = datetime.fromisoformat(event_date.replace('Z', '+00:00'))
        
        # Weekend bonus
        is_weekend = dt.weekday() >= 5  # Saturday=5, Sunday=6
        weekend_score = 0.25 if is_weekend else 0.0
        
        # Evening bonus (7pm-11pm is prime time)
        hour = dt.hour
        if 19 <= hour <= 23:
            time_score = 0.3
        elif 17 <= hour < 19:
            time_score = 0.2
        elif 12 <= hour < 17:
            time_score = 0.1
        else:
            time_score = 0.0
        
        return min(1.0, weekend_score + time_score)
    except:
        return 0.5  # Default if date parsing fails


def calculate_location_score(location: str) -> float:
    """
    Score based on location popularity and accessibility
    Popular dorms and central locations score higher
    """
    popular_locations = {
        'gabelli hall': 0.9,
        'stayer hall': 0.85,
        '90 st. thomas more': 0.8,
        'walsh hall': 0.85,
        'ignacio hall': 0.75,
        'the mods': 0.7,
        'rubenstein hall': 0.75,
        'voute hall': 0.7,
        'welch hall': 0.65,
        'roncalli hall': 0.65,
    }
    
    location_lower = location.lower()
    for key, score in popular_locations.items():
        if key in location_lower:
            return score
    
    return 0.5  # Default for unknown locations


def calculate_capacity_utilization_score(rsvp_count: int, max_capacity: int) -> float:
    """
    Optimal utilization is 60-80% (not too empty, not too crowded)
    """
    if max_capacity == 0:
        return 0.5
    
    utilization = rsvp_count / max_capacity
    
    if 0.6 <= utilization <= 0.8:
        return 1.0  # Perfect utilization
    elif 0.4 <= utilization < 0.6:
        return 0.8
    elif 0.3 <= utilization < 0.4:
        return 0.6
    elif 0.8 < utilization <= 0.95:
        return 0.7  # A bit crowded but still good
    elif utilization > 0.95:
        return 0.5  # Too crowded, might turn people away
    else:
        return 0.3  # Too empty, might seem unpopular


def calculate_club_affiliation_score(club_affiliated: bool, club_name: Optional[str]) -> float:
    """
    Club-affiliated events often have better organization and turnout
    """
    if not club_affiliated:
        return 0.5
    
    # Known popular clubs (you'd populate this with actual data)
    popular_clubs = {
        'student government': 0.9,
        'asian caucus': 0.85,
        'acapella': 0.85,
        'comedy club': 0.8,
    }
    
    if club_name:
        club_lower = club_name.lower()
        for key, score in popular_clubs.items():
            if key in club_lower:
                return score
    
    return 0.7  # Default for club events


def calculate_vibe_score(emoji_vibe: Optional[List[str]]) -> float:
    """
    Events with clear vibes/themes tend to attract their target audience better
    """
    if not emoji_vibe or len(emoji_vibe) == 0:
        return 0.5
    
    # More emojis = clearer theme
    if len(emoji_vibe) >= 3:
        return 0.8
    elif len(emoji_vibe) >= 2:
        return 0.7
    else:
        return 0.6


async def get_ai_insights(events: List[Event]) -> str:
    """
    Use OpenAI to generate natural language insights about the event lineup
    """
    try:
        event_summary = "\n".join([
            f"- {e.function_name} at {e.location} on {e.date} ({e.rsvp_count}/{e.max_capacity} RSVPs)"
            for e in events[:5]  # Only send top 5 to keep prompt concise
        ])
        
        response = openai_client.chat.completions.create(
            model="gpt-4o",  # or "gpt-4o-mini" for faster/cheaper
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant that analyzes campus events and provides brief, friendly insights to college students."
                },
                {
                    "role": "user",
                    "content": f"""Analyze these upcoming BC campus events and provide a brief, friendly insight about the overall event landscape. Be encouraging and highlight interesting patterns or standout events.

Events:
{event_summary}

Respond in 1-2 sentences with actionable insights for students."""
                }
            ],
            max_tokens=150,
            temperature=0.7
        )
        
        return response.choices[0].message.content
    except Exception as e:
        print(f"OpenAI API error: {e}")
        return "Check out the events happening around campus in the next 24 hours!"


def predict_event_success(event: Event) -> SuccessPrediction:
    """
    Main prediction function that combines all factors
    """
    # Calculate individual factor scores
    time_score = calculate_time_score(event.date)
    location_score = calculate_location_score(event.location)
    capacity_score = calculate_capacity_utilization_score(event.rsvp_count, event.max_capacity)
    club_score = calculate_club_affiliation_score(event.club_affiliated, event.club_name)
    vibe_score = calculate_vibe_score(event.emoji_vibe)
    
    # Weights for each factor (adjust based on historical data)
    weights = {
        'timing': 0.25,
        'location': 0.20,
        'current_interest': 0.30,  # RSVP momentum
        'organization': 0.15,  # Club affiliation
        'presentation': 0.10,  # Vibe/theme clarity
    }
    
    # Calculate weighted score
    weighted_score = (
        time_score * weights['timing'] +
        location_score * weights['location'] +
        capacity_score * weights['current_interest'] +
        club_score * weights['organization'] +
        vibe_score * weights['presentation']
    )
    
    # Convert to 0-100 scale
    success_score = int(weighted_score * 100)
    
    # Generate reason based on top factors
    factors = {
        'timing': time_score,
        'location': location_score,
        'current_interest': capacity_score,
        'organization': club_score,
        'presentation': vibe_score,
    }
    
    # Find strongest and weakest factors
    sorted_factors = sorted(factors.items(), key=lambda x: x[1], reverse=True)
    top_factor = sorted_factors[0]
    weak_factor = sorted_factors[-1]
    
    # Generate human-readable reason
    if success_score >= 80:
        reason = f"Strong {top_factor[0].replace('_', ' ')} and good overall setup"
    elif success_score >= 60:
        reason = f"Good {top_factor[0].replace('_', ' ')}, but {weak_factor[0].replace('_', ' ')} could be improved"
    else:
        reason = f"Consider improving {weak_factor[0].replace('_', ' ')} and {sorted_factors[-2][0].replace('_', ' ')}"
    
    return SuccessPrediction(
        eventId=event.id,
        eventName=event.function_name,
        score=success_score,
        reason=reason,
        factors=factors
    )


@app.post("/api/ai/event-insights", response_model=EventInsightsResponse)
async def get_event_insights(request: EventInsightsRequest):
    """
    Analyze events and return success predictions + general insights
    """
    try:
        # Generate predictions for each event
        predictions = [predict_event_success(event) for event in request.events]
        
        # Sort by score to highlight top events
        predictions.sort(key=lambda x: x.score, reverse=True)
        
        # Get OpenAI's natural language insights
        recommendation = await get_ai_insights(request.events)
        
        return EventInsightsResponse(
            successPredictions=predictions,
            recommendation=recommendation
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/events")
async def get_events():
    """
    Mock endpoint for testing - replace with your actual event database
    """
    # This would normally query your database
    return {
        "events": [
            {
                "id": "evt_001",
                "function_name": "Friday Night Karaoke",
                "location": "Gabelli Hall",
                "date": (datetime.now() + timedelta(hours=5)).isoformat(),
                "organizer_alias": "Music Club",
                "rsvp_count": 35,
                "max_capacity": 50,
                "club_affiliated": True,
                "club_name": "BC Music Society",
                "emoji_vibe": ["🎤", "🎵", "🎉"],
                "invitation_image": None
            }
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)