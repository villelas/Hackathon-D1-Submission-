from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
import firebase_admin
from firebase_admin import credentials, firestore, storage
import random
from datetime import datetime, timedelta
from typing import List, Optional
from enum import Enum
import os
from openai import OpenAI
from dotenv import load_dotenv
import requests
import time
from PIL import Image, ImageDraw, ImageFont
import io
import base64

# Load environment variables from .env file
load_dotenv()

# Initialize FastAPI
app = FastAPI(title="BCPlugHub API")

# Add validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print(f"\n❌ VALIDATION ERROR:")
    print(f"Request body: {await request.body()}")
    print(f"Errors: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
    )

# CORS - allows frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase
cred = credentials.Certificate("bcplubhub-service-account.json")
firebase_admin.initialize_app(cred, {
    'storageBucket': 'bcplubhub.firebasestorage.app'  # Replace with your actual bucket name
})
db = firestore.client()
bucket = storage.bucket()

# Initialize OpenAI using .env file (includes DALL-E for image generation)
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Fallback AI Alias Generator (if OpenAI fails)
ADJECTIVES = ["Velvet", "Neon", "Cosmic", "Shadow", "Electric", "Mystic", "Digital", "Urban", "Midnight", "Golden"]
NOUNS = ["Thunder", "Phantom", "Wolf", "Phoenix", "Viper", "Cipher", "Falcon", "Raven", "Tiger", "Dragon"]

def generate_fallback_alias():
    """Generate a cool AI alias (fallback)"""
    return f"{random.choice(ADJECTIVES)} {random.choice(NOUNS)}"

def generate_ai_invite_image(event_data):
    """Generate invite image using OpenAI DALL-E and upload to Firebase Storage"""
    try:
        print("🎨 Generating AI invite image with DALL-E...")
        
        # Create detailed prompt for image generation
        function_name = event_data.get('function_name', 'Function')
        location = event_data.get('location', 'TBD')
        emoji_vibe = ' '.join(event_data.get('emoji_vibe', ['🔥']))
        date_str = event_data.get('date', '')
        organizer = event_data.get('organizer_alias', 'Anonymous')
        description = event_data.get('description', '')
        
        # Format date if available
        formatted_date = "Soon"
        if date_str:
            try:
                event_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                formatted_date = event_date.strftime('%A, %B %d at %I:%M %p')
            except:
                pass
        
        # Build detailed prompt for DALL-E
        prompt = f"""Create a vibrant, eye-catching party invitation poster.

Event: {function_name}
Location: {location}
Date: {formatted_date}
Hosted by: {organizer}
Vibe: {emoji_vibe}

Style: Instagram story format (vertical/portrait), modern design, bold typography, energetic party vibe.

Design Elements:
- Large bold title "{function_name}"
- "YOU'RE INVITED" text prominently displayed
- Purple and blue gradient background
- Event details clearly visible (location, date, host)
- "BCPlugHub" branding at bottom
- Modern Gen Z aesthetic with vibrant colors
- Trendy, Instagram-ready, shareable design
- Party/event atmosphere matching the vibe emojis

Make it exciting, colorful, and attention-grabbing! Perfect for college students."""
        
        print(f"📝 Generating with DALL-E...")
        print(f"Prompt: {prompt[:150]}...")
        
        # Generate image with DALL-E 3
        dalle_response = openai_client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1792",  # Vertical format (9:16 ratio for Instagram stories)
            quality="standard",
            n=1,
        )
        
        image_url = dalle_response.data[0].url
        print(f"✅ Image URL generated: {image_url[:50]}...")
        
        # Download image
        print("📥 Downloading image...")
        img_response = requests.get(image_url, timeout=30)
        
        if img_response.status_code == 200:
            image_bytes = img_response.content
            print(f"✅ Image downloaded ({len(image_bytes)} bytes)")
            
            # Upload to Firebase Storage
            print("☁️ Uploading to Firebase Storage...")
            
            # Generate unique filename
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            filename = f"event-invites/{timestamp}_{function_name[:30].replace(' ', '_')}.png"
            
            # Upload to Firebase Storage
            blob = bucket.blob(filename)
            blob.upload_from_string(
                image_bytes,
                content_type='image/png'
            )
            
            # Make the blob publicly accessible
            blob.make_public()
            
            # Get public URL
            public_url = blob.public_url
            
            print(f"✅ Image uploaded to Firebase Storage: {public_url}")
            return public_url
        else:
            raise Exception(f"Failed to download image: HTTP {img_response.status_code}")
        
    except Exception as e:
        print(f"❌ Error generating AI image: {e}")
        print(f"🔄 Falling back to traditional image generation")
        return generate_fallback_invite_image(event_data)
            
def generate_fallback_invite_image(event_data):
    """Generate invite image using PIL (fallback)"""
    try:
        # Create image (1080x1920 - Instagram story size)
        width, height = 1080, 1920
        
        # Gradient background based on vibe
        img = Image.new('RGB', (width, height), color='#1a1a2e')
        draw = ImageDraw.Draw(img)
        
        # Create gradient effect
        for i in range(height):
            r = int(26 + (i / height) * 80)  # 1a -> 66
            g = int(26 + (i / height) * 33)  # 1a -> 33  
            b = int(46 + (i / height) * 150) # 2e -> cc
            draw.rectangle([(0, i), (width, i+1)], fill=(r, g, b))
        
        # Try to use custom fonts, fallback to default
        try:
            title_font = ImageFont.truetype("arial.ttf", 80)
            emoji_font = ImageFont.truetype("seguiemj.ttf", 120)
            body_font = ImageFont.truetype("arial.ttf", 50)
            small_font = ImageFont.truetype("arial.ttf", 40)
        except:
            title_font = ImageFont.load_default()
            emoji_font = ImageFont.load_default()
            body_font = ImageFont.load_default()
            small_font = ImageFont.load_default()
        
        # Draw content
        y_position = 200
        
        # Vibe emojis at top
        emoji_text = ' '.join(event_data.get('emoji_vibe', ['🔥', '💃', '🎵']))
        emoji_bbox = draw.textbbox((0, 0), emoji_text, font=emoji_font)
        emoji_width = emoji_bbox[2] - emoji_bbox[0]
        draw.text(((width - emoji_width) / 2, y_position), emoji_text, 
                 fill='white', font=emoji_font)
        y_position += 200
        
        # "YOU'RE INVITED"
        invited_text = "YOU'RE INVITED"
        invited_bbox = draw.textbbox((0, 0), invited_text, font=body_font)
        invited_width = invited_bbox[2] - invited_bbox[0]
        draw.text(((width - invited_width) / 2, y_position), invited_text, 
                 fill='#FFD700', font=body_font)
        y_position += 100
        
        # Function name (wrapped if too long)
        function_name = event_data.get('function_name', 'Function')
        if len(function_name) > 20:
            # Wrap text
            words = function_name.split()
            line1 = ' '.join(words[:len(words)//2])
            line2 = ' '.join(words[len(words)//2:])
            
            bbox1 = draw.textbbox((0, 0), line1, font=title_font)
            width1 = bbox1[2] - bbox1[0]
            draw.text(((width - width1) / 2, y_position), line1, 
                     fill='white', font=title_font)
            y_position += 100
            
            bbox2 = draw.textbbox((0, 0), line2, font=title_font)
            width2 = bbox2[2] - bbox2[0]
            draw.text(((width - width2) / 2, y_position), line2, 
                     fill='white', font=title_font)
        else:
            name_bbox = draw.textbbox((0, 0), function_name, font=title_font)
            name_width = name_bbox[2] - name_bbox[0]
            draw.text(((width - name_width) / 2, y_position), function_name, 
                     fill='white', font=title_font)
        
        y_position += 150
        
        # Location
        location = f"📍 {event_data.get('location', 'TBD')}"
        loc_bbox = draw.textbbox((0, 0), location, font=body_font)
        loc_width = loc_bbox[2] - loc_bbox[0]
        draw.text(((width - loc_width) / 2, y_position), location, 
                 fill='white', font=body_font)
        y_position += 100
        
        # Date/Time
        date_str = event_data.get('date', '')
        if date_str:
            try:
                event_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                formatted_date = event_date.strftime('%A, %B %d')
                formatted_time = event_date.strftime('%I:%M %p')
                
                date_text = f"🗓️ {formatted_date}"
                date_bbox = draw.textbbox((0, 0), date_text, font=body_font)
                date_width = date_bbox[2] - date_bbox[0]
                draw.text(((width - date_width) / 2, y_position), date_text, 
                         fill='white', font=body_font)
                y_position += 80
                
                time_text = f"🕐 {formatted_time}"
                time_bbox = draw.textbbox((0, 0), time_text, font=body_font)
                time_width = time_bbox[2] - time_bbox[0]
                draw.text(((width - time_width) / 2, y_position), time_text, 
                         fill='white', font=body_font)
            except:
                pass
        
        y_position += 150
        
        # Hosted by
        organizer = event_data.get('organizer_alias', 'Anonymous')
        host_text = f"Hosted by {organizer}"
        host_bbox = draw.textbbox((0, 0), host_text, font=small_font)
        host_width = host_bbox[2] - host_bbox[0]
        draw.text(((width - host_width) / 2, y_position), host_text, 
                 fill='#cccccc', font=small_font)
        
        # BCPlugHub branding at bottom
        y_position = height - 150
        brand_text = "BCPlugHub"
        brand_bbox = draw.textbbox((0, 0), brand_text, font=body_font)
        brand_width = brand_bbox[2] - brand_bbox[0]
        draw.text(((width - brand_width) / 2, y_position), brand_text, 
                 fill='#FFD700', font=body_font)
        
        # Upload to Firebase Storage instead of base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        # Generate unique filename
        function_name = event_data.get('function_name', 'Function')
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        filename = f"event-invites/{timestamp}_{function_name[:30].replace(' ', '_')}_fallback.png"
        
        # Upload to Firebase Storage
        blob = bucket.blob(filename)
        blob.upload_from_file(buffer, content_type='image/png')
        blob.make_public()
        
        public_url = blob.public_url
        print(f"✅ Fallback image uploaded to Firebase Storage")
        
        return public_url
        
    except Exception as e:
        print(f"Error generating invite image: {e}")
        return None

def generate_ai_alias(description: str, name: str = None) -> str:
    """Generate an alias using OpenAI based on user's description and name"""
    user_info = f"Description: {description}"
    if name:
        user_info += f", Name: {name}"
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "You are a creative alias generator for BCPlugHub, a college social app. Generate ONLY a cool, mysterious 2-word alias (Adjective + Noun) based on the user's info. Make it edgy, fun, and campus-appropriate. The alias should feel like a secret identity. Examples: 'Neon Thunder', 'Cosmic Wolf', 'Digital Phoenix', 'Velvet Cipher'. Respond with ONLY the 2-word alias, nothing else."
                },
                {
                    "role": "user",
                    "content": f"Generate an alias for: {user_info}"
                }
            ],
            max_tokens=10,
            temperature=0.9
        )
        alias = response.choices[0].message.content.strip()
        print(f"Generated alias: {alias}")
        return alias
    except Exception as e:
        print(f"OpenAI error: {e}")
        # Simple fallback
        return "Campus Legend"

# Pydantic Models (Request/Response validation)
class UserCreate(BaseModel):
    bc_email: EmailStr
    password: str
    name: str
    instagram_handle: str = None  # Optional during registration

class AliasGenerate(BaseModel):
    description: str

class AliasResponse(BaseModel):
    ai_generated_alias: str

class InstagramUpdate(BaseModel):
    instagram_handle: str
    instagram_followers: list[str] = []

class ClubsUpdate(BaseModel):
    bc_club_affiliations: list[str]

class FunctionHistory(BaseModel):
    function_name: str
    event_id: str
    date: str
    rating: float
    people_invited: int
    emoji_vibe: list[str]
    location: str
    club_affiliated: bool
    public_or_private: str
    before_function_user_rating: float
    after_function_user_rating: float
    invitation_image: str = None
    comments: list[str] = []

class CurrentFunction(BaseModel):
    function_name: str
    event_id: str
    emoji_vibe: list[str]
    status: str  # 'upcoming', 'cancelled', 'live'
    date: str
    public_or_private: str
    number_of_invites: int
    number_of_invite_shares: int = 0
    invitation_image: str = None

class EventCreate(BaseModel):
    function_name: str
    location: str
    date: str
    description: str = ""
    emoji_vibe: list[str] = []  # Make optional with default
    max_capacity: int = 50
    public_or_private: str = "public"
    club_affiliated: bool = False
    club_name: str | None = None  # Allow None explicitly
    organizer_user_id: str
    organizer_alias: str = "Anonymous"  # Make optional with default
    invitation_image: str | None = None  # Pre-generated AI image

class UserResponse(BaseModel):
    user_id: str
    bc_email: str
    name: str
    ai_generated_alias: str
    created_at: str

class UserCreateResponse(BaseModel):
    user_id: str
    bc_email: str
    name: str
    created_at: str

# Routes
@app.get("/")
def read_root():
    return {"message": "BCPlugHub API is running 🔥"}

@app.post("/api/users/register", response_model=UserCreateResponse)
async def register_user(user: UserCreate):
    """Register a new user WITHOUT alias (alias comes later)"""
    
    # Check if user already exists
    users_ref = db.collection('users')
    existing = users_ref.where('bc_email', '==', user.bc_email).limit(1).get()
    
    if len(list(existing)) > 0:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create user document with full data structure
    user_data = {
        'bc_email': user.bc_email,
        'password': user.password,  # ⚠️ TODO: Hash this in production!
        'name': user.name,
        'ai_generated_alias': None,  # Will be set later
        'created_at': datetime.utcnow().isoformat(),
        
        # New fields
        'personal_rating': 5,  # Default rating (1-10 scale)
        'instagram_handle': user.instagram_handle if user.instagram_handle else None,
        'instagram_followers': [],  # List of follower usernames
        'instagram_follower_count': 0,  # Total follower count
        'bc_club_affiliations': [],  # List of BC clubs
    }
    
    # Add to Firestore
    doc_ref = users_ref.add(user_data)
    user_id = doc_ref[1].id
    
    return UserCreateResponse(
        user_id=user_id,
        bc_email=user.bc_email,
        name=user.name,
        created_at=user_data['created_at']
    )

@app.post("/api/users/{user_id}/generate-alias", response_model=AliasResponse)
async def generate_user_alias(user_id: str, data: AliasGenerate):
    """Generate AI alias based on user's description"""
    
    # Check if user exists
    user_ref = db.collection('users').document(user_id)
    user_doc = user_ref.get()
    
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_data = user_doc.to_dict()
    
    # Generate alias using OpenAI with name and description
    alias = generate_ai_alias(data.description, user_data.get('name'))
    
    # Make sure we have a valid alias
    if not alias:
        alias = "Campus Legend"
    
    # Update user with alias
    user_ref.update({
        'ai_generated_alias': alias
    })
    
    return AliasResponse(ai_generated_alias=alias)

@app.post("/api/users/login")
async def login_user(bc_email: EmailStr, password: str):
    """Login user"""
    
    users_ref = db.collection('users')
    users = users_ref.where('bc_email', '==', bc_email).where('password', '==', password).limit(1).get()
    
    user_list = list(users)
    if len(user_list) == 0:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_doc = user_list[0]
    user_data = user_doc.to_dict()
    
    return {
        'user_id': user_doc.id,
        'bc_email': user_data['bc_email'],
        'name': user_data['name'],
        'ai_generated_alias': user_data.get('ai_generated_alias')
    }

@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    """Get user by ID"""
    
    user_doc = db.collection('users').document(user_id).get()
    
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_data = user_doc.to_dict()
    return {
        'user_id': user_doc.id,
        'bc_email': user_data['bc_email'],
        'name': user_data['name'],
        'ai_generated_alias': user_data.get('ai_generated_alias'),
        'created_at': user_data.get('created_at'),
        'personal_rating': user_data.get('personal_rating', 5),
        'instagram_handle': user_data.get('instagram_handle'),
        'instagram_followers': user_data.get('instagram_followers', []),
        'instagram_follower_count': user_data.get('instagram_follower_count', 0),
        'bc_club_affiliations': user_data.get('bc_club_affiliations', [])
    }

@app.put("/api/users/{user_id}/instagram")
async def update_instagram(user_id: str, data: InstagramUpdate):
    """Update user's Instagram info"""
    
    user_ref = db.collection('users').document(user_id)
    user_doc = user_ref.get()
    
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_ref.update({
        'instagram_handle': data.instagram_handle,
        'instagram_followers': data.instagram_followers
    })
    
    return {"message": "Instagram info updated successfully"}

@app.put("/api/users/{user_id}/clubs")
async def update_clubs(user_id: str, data: ClubsUpdate):
    """Update user's BC club affiliations"""
    
    user_ref = db.collection('users').document(user_id)
    user_doc = user_ref.get()
    
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_ref.update({
        'bc_club_affiliations': data.bc_club_affiliations
    })
    
    return {"message": "Club affiliations updated successfully"}

@app.post("/api/users/{user_id}/past-functions")
async def add_past_function(user_id: str, function: FunctionHistory):
    """Add a completed function to user's history"""
    
    user_ref = db.collection('users').document(user_id)
    user_doc = user_ref.get()
    
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_data = user_doc.to_dict()
    past_functions = user_data.get('past_functions', [])
    past_functions.append(function.dict())
    
    # Update personal rating based on after_function_user_rating
    user_ref.update({
        'past_functions': past_functions,
        'personal_rating': function.after_function_user_rating
    })
    
    return {"message": "Past function added successfully"}

@app.post("/api/users/{user_id}/current-functions")
async def add_current_function(user_id: str, function: CurrentFunction):
    """Add an upcoming function"""
    
    user_ref = db.collection('users').document(user_id)
    user_doc = user_ref.get()
    
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_data = user_doc.to_dict()
    current_functions = user_data.get('current_functions', [])
    current_functions.append(function.dict())
    
    user_ref.update({
        'current_functions': current_functions
    })
    
    return {"message": "Current function added successfully", "function": function.dict()}

@app.get("/api/users/{user_id}/functions")
async def get_user_functions(user_id: str):
    """Get user's past and current functions"""
    
    user_doc = db.collection('users').document(user_id).get()
    
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_data = user_doc.to_dict()
    
    return {
        'past_functions': user_data.get('past_functions', []),
        'current_functions': user_data.get('current_functions', []),
        'personal_rating': user_data.get('personal_rating', 5)
    }

class ImageGenerationRequest(BaseModel):
    function_name: str
    location: str
    date: str
    emoji_vibe: list[str]
    organizer_alias: str
    description: str = ""

@app.post("/api/generate-invite-preview")
async def generate_invite_preview(request: ImageGenerationRequest):
    """Generate AI invite image preview for event"""
    
    print(f"\n{'='*60}")
    print(f"🎨 GENERATING IMAGE PREVIEW")
    print(f"{'='*60}")
    print(f"Function Name: {request.function_name}")
    print(f"{'='*60}\n")
    
    event_data = {
        'function_name': request.function_name,
        'location': request.location,
        'date': request.date,
        'emoji_vibe': request.emoji_vibe,
        'organizer_alias': request.organizer_alias,
        'description': request.description
    }
    
    # Generate AI invite image
    invite_image = generate_ai_invite_image(event_data)
    
    return {
        "invitation_image": invite_image,
        "message": "Image generated successfully"
    }

@app.post("/api/events")
async def create_event(event: EventCreate):
    """Create a new event/function"""
    
    print(f"\n{'='*60}")
    print(f"📥 EVENT CREATION REQUEST")
    print(f"{'='*60}")
    print(f"Function Name: {event.function_name}")
    print(f"Location: {event.location}")
    print(f"Date: {event.date}")
    print(f"Organizer ID: {event.organizer_user_id}")
    print(f"Organizer Alias: {event.organizer_alias}")
    print(f"{'='*60}\n")
    
    # Create event document
    event_data = {
        'function_name': event.function_name,
        'location': event.location,
        'date': event.date,
        'description': event.description,
        'emoji_vibe': event.emoji_vibe,
        'max_capacity': event.max_capacity,
        'public_or_private': event.public_or_private,
        'club_affiliated': event.club_affiliated,
        'club_name': event.club_name,
        'organizer_user_id': event.organizer_user_id,
        'organizer_alias': event.organizer_alias,
        'created_at': datetime.utcnow().isoformat(),
        'status': 'upcoming',  # upcoming, live, completed, cancelled
        'attendees': [],
        'invite_count': 0,
        'rsvp_count': 0,
        'invitation_image': event.invitation_image  # Use pre-generated image
    }
    
    print(f"✅ Using pre-generated invitation image")
    
    # Add to events collection
    events_ref = db.collection('events')
    doc_ref = events_ref.add(event_data)
    event_id = doc_ref[1].id
    
    print(f"✅ Event created with ID: {event_id}")
    
    # Add to organizer's current_functions
    print(f"📝 Adding event to organizer's current_functions...")
    try:
        user_ref = db.collection('users').document(event.organizer_user_id)
        user_doc = user_ref.get()
        
        if user_doc.exists:
            user_data = user_doc.to_dict()
            current_functions = user_data.get('current_functions', [])
            
            # Create the current function object
            current_function = {
                'function_name': event.function_name,
                'event_id': event_id,
                'emoji_vibe': event.emoji_vibe,
                'status': 'upcoming',
                'date': event.date,
                'public_or_private': event.public_or_private,
                'number_of_invites': 0,
                'number_of_invite_shares': 0,
                'invitation_image': event_data.get('invitation_image')
            }
            
            current_functions.append(current_function)
            
            # Update user document
            user_ref.update({
                'current_functions': current_functions
            })
            
            print(f"✅ Added to organizer's current_functions")
        else:
            print(f"⚠️ Warning: Organizer user not found (ID: {event.organizer_user_id})")
    
    except Exception as e:
        print(f"❌ Error adding to current_functions: {e}")
        # Don't fail the whole request if this part fails
    
    return {
        "message": "Event created successfully",
        "event_id": event_id,
        "event": event_data
    }

@app.get("/api/events/{event_id}")
async def get_event(event_id: str):
    """Get event details"""
    
    event_doc = db.collection('events').document(event_id).get()
    
    if not event_doc.exists:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event_data = event_doc.to_dict()
    event_data['event_id'] = event_id
    
    return event_data

@app.get("/api/events")
async def get_all_events():
    """Get all public upcoming events"""
    
    events_ref = db.collection('events')
    events = events_ref.where('public_or_private', '==', 'public').where('status', '==', 'upcoming').stream()
    
    event_list = []
    for event in events:
        event_data = event.to_dict()
        event_data['event_id'] = event.id
        event_list.append(event_data)
    
    return event_list

@app.get("/api/users/{user_id}/events")
async def get_user_events(user_id: str, status: str = None):
    """Get user's events (as organizer)"""
    
    events_ref = db.collection('events')
    query = events_ref.where('organizer_user_id', '==', user_id)
    
    # Filter by status if provided
    if status:
        query = query.where('status', '==', status)
    
    events = query.stream()
    
    event_list = []
    for event in events:
        event_data = event.to_dict()
        event_data['event_id'] = event.id
        event_list.append(event_data)
    
    return event_list

@app.get("/api/users/{user_id}/functions")
async def get_user_functions(user_id: str):
    """Get user's current and past functions"""
    
    try:
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = user_doc.to_dict()
        current_functions = user_data.get('current_functions', [])
        past_functions = user_data.get('past_functions', [])
        
        # Sort current by date (soonest first)
        current_functions.sort(key=lambda x: x.get('date', ''))
        
        # Sort past by date (most recent first)
        past_functions.sort(key=lambda x: x.get('date', ''), reverse=True)
        
        return {
            "user_id": user_id,
            "current_functions": current_functions,
            "past_functions": past_functions,
            "current_count": len(current_functions),
            "past_count": len(past_functions)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching user functions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch user functions: {str(e)}")

class RSVPRequest(BaseModel):
    user_id: str
    user_alias: str

@app.post("/api/events/{event_id}/rsvp")
async def rsvp_to_event(event_id: str, rsvp_data: RSVPRequest):
    """RSVP to an event"""
    
    print(f"\n{'='*60}")
    print(f"📝 RSVP REQUEST")
    print(f"{'='*60}")
    print(f"Event ID: {event_id}")
    print(f"User ID: {rsvp_data.user_id}")
    print(f"User Alias: {rsvp_data.user_alias}")
    print(f"{'='*60}\n")
    
    # Get event document
    event_ref = db.collection('events').document(event_id)
    event_doc = event_ref.get()
    
    if not event_doc.exists:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event_data = event_doc.to_dict()
    attendees = event_data.get('attendees', [])
    
    # Check if user already RSVP'd
    user_ids = [a.get('user_id') for a in attendees]
    if rsvp_data.user_id in user_ids:
        raise HTTPException(status_code=400, detail="Already RSVP'd to this event")
    
    # Check capacity
    max_capacity = event_data.get('max_capacity', 50)
    if len(attendees) >= max_capacity:
        raise HTTPException(status_code=400, detail="Event is at full capacity")
    
    # Add attendee
    attendees.append({
        'user_id': rsvp_data.user_id,
        'user_alias': rsvp_data.user_alias,
        'rsvp_time': datetime.utcnow().isoformat()
    })
    
    # Update event
    event_ref.update({
        'attendees': attendees,
        'rsvp_count': len(attendees)
    })
    
    print(f"✅ RSVP successful! Total attendees: {len(attendees)}/{max_capacity}")
    
    # Send notification to organizer
    try:
        organizer_id = event_data.get('organizer_user_id')
        
        notification_data = {
            'user_id': organizer_id,
            'type': 'rsvp_received',
            'title': '✅ New RSVP!',
            'message': f"{rsvp_data.user_alias} RSVP'd to {event_data.get('function_name')}",
            'event_id': event_id,
            'event_name': event_data.get('function_name'),
            'sender_id': rsvp_data.user_id,
            'sender_name': rsvp_data.user_alias,
            'read': False,
            'created_at': datetime.utcnow().isoformat(),
            'action_required': False
        }
        
        db.collection('notifications').add(notification_data)
        print(f"✅ Sent RSVP notification to organizer\n")
        
    except Exception as e:
        print(f"⚠️ Could not send RSVP notification: {e}\n")
        # Don't fail RSVP if notification fails
    
    return {
        "message": "RSVP successful",
        "attendee_count": len(attendees),
        "max_capacity": max_capacity
    }

@app.delete("/api/events/{event_id}/rsvp/{user_id}")
async def cancel_rsvp(event_id: str, user_id: str):
    """Cancel RSVP to an event"""
    
    print(f"\n{'='*60}")
    print(f"❌ CANCEL RSVP REQUEST")
    print(f"{'='*60}")
    print(f"Event ID: {event_id}")
    print(f"User ID: {user_id}")
    print(f"{'='*60}\n")
    
    # Get event document
    event_ref = db.collection('events').document(event_id)
    event_doc = event_ref.get()
    
    if not event_doc.exists:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event_data = event_doc.to_dict()
    attendees = event_data.get('attendees', [])
    
    # Remove user from attendees
    attendees = [a for a in attendees if a.get('user_id') != user_id]
    
    # Update event
    event_ref.update({
        'attendees': attendees,
        'rsvp_count': len(attendees)
    })
    
    print(f"✅ RSVP cancelled! Total attendees: {len(attendees)}")
    
    return {
        "message": "RSVP cancelled",
        "attendee_count": len(attendees)
    }

@app.get("/api/events/{event_id}/attendees")
async def get_event_attendees(event_id: str):
    """Get list of attendees for an event"""
    
    event_doc = db.collection('events').document(event_id).get()
    
    if not event_doc.exists:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event_data = event_doc.to_dict()
    attendees = event_data.get('attendees', [])
    
    return {
        "event_id": event_id,
        "attendees": attendees,
        "attendee_count": len(attendees),
        "max_capacity": event_data.get('max_capacity', 50)
    }

@app.post("/api/events/move-to-historical")
async def move_past_events_to_historical():
    """
    Move all past events to historical_events collection
    and update organizers' past_functions
    
    This should be run periodically (e.g., daily cron job or manually)
    """
    
    print(f"\n{'='*60}")
    print(f"🕐 MOVING PAST EVENTS TO HISTORICAL")
    print(f"{'='*60}\n")
    
    try:
        current_time = datetime.utcnow()
        moved_count = 0
        updated_users = set()
        
        # Get all events from events collection
        events_ref = db.collection('events')
        all_events = events_ref.stream()
        
        for event_doc in all_events:
            event_data = event_doc.to_dict()
            event_id = event_doc.id
            
            # Parse event date
            try:
                event_date_str = event_data.get('date')
                if event_date_str:
                    # Handle ISO format with Z
                    if event_date_str.endswith('Z'):
                        event_date = datetime.fromisoformat(event_date_str.replace('Z', '+00:00'))
                    else:
                        event_date = datetime.fromisoformat(event_date_str)
                    
                    # Check if event has passed
                    if event_date.replace(tzinfo=None) < current_time:
                        print(f"📅 Moving event: {event_data.get('function_name')} (ID: {event_id})")
                        
                        # Add to historical_events collection
                        historical_ref = db.collection('historical_events')
                        historical_data = {
                            **event_data,
                            'original_event_id': event_id,
                            'moved_to_historical_at': current_time.isoformat(),
                            'status': 'completed'
                        }
                        historical_ref.add(historical_data)
                        
                        # Move to organizer's past_functions
                        organizer_id = event_data.get('organizer_user_id')
                        if organizer_id:
                            user_ref = db.collection('users').document(organizer_id)
                            user_doc = user_ref.get()
                            
                            if user_doc.exists:
                                user_data = user_doc.to_dict()
                                current_functions = user_data.get('current_functions', [])
                                past_functions = user_data.get('past_functions', [])
                                
                                # Find and remove from current_functions
                                function_to_move = None
                                updated_current = []
                                
                                for func in current_functions:
                                    if func.get('event_id') == event_id:
                                        function_to_move = func
                                    else:
                                        updated_current.append(func)
                                
                                if function_to_move:
                                    # Add to past_functions with completion data
                                    past_function = {
                                        **function_to_move,
                                        'status': 'completed',
                                        'completed_at': current_time.isoformat(),
                                        'final_attendee_count': event_data.get('rsvp_count', 0),
                                        'original_event_id': event_id
                                    }
                                    past_functions.append(past_function)
                                    
                                    # Update user document
                                    user_ref.update({
                                        'current_functions': updated_current,
                                        'past_functions': past_functions
                                    })
                                    
                                    updated_users.add(organizer_id)
                                    print(f"  ✅ Moved to user's past_functions")
                        
                        # Delete from events collection
                        events_ref.document(event_id).delete()
                        moved_count += 1
                        print(f"  ✅ Deleted from events collection\n")
                        
            except Exception as e:
                print(f"  ❌ Error processing event {event_id}: {e}\n")
                continue
        
        print(f"{'='*60}")
        print(f"✅ COMPLETED")
        print(f"{'='*60}")
        print(f"Events moved to historical: {moved_count}")
        print(f"Users updated: {len(updated_users)}")
        print(f"{'='*60}\n")
        
        return {
            "message": "Past events moved to historical successfully",
            "events_moved": moved_count,
            "users_updated": len(updated_users)
        }
        
    except Exception as e:
        print(f"❌ Error moving events to historical: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to move events: {str(e)}")


@app.post("/api/users/{user_id}/move-past-functions")
async def move_user_past_functions(user_id: str):
    """
    Move only this user's past events to historical
    Called when user visits MyFunctions page
    More efficient than moving all events
    """
    
    print(f"\n{'='*60}")
    print(f"🕐 CHECKING USER'S PAST EVENTS")
    print(f"User ID: {user_id}")
    print(f"{'='*60}\n")
    
    try:
        current_time = datetime.utcnow()
        moved_count = 0
        
        # Get user document
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = user_doc.to_dict()
        current_functions = user_data.get('current_functions', [])
        past_functions = user_data.get('past_functions', [])
        
        updated_current = []
        
        # Check each current function
        for func in current_functions:
            event_date_str = func.get('date')
            event_id = func.get('event_id')
            
            try:
                # Parse date
                if event_date_str:
                    if event_date_str.endswith('Z'):
                        event_date = datetime.fromisoformat(event_date_str.replace('Z', '+00:00'))
                    else:
                        event_date = datetime.fromisoformat(event_date_str)
                    
                    # Check if event has passed
                    if event_date.replace(tzinfo=None) < current_time:
                        print(f"📅 Moving: {func.get('function_name')} (ID: {event_id})")
                        
                        # Get full event data from events collection
                        event_ref = db.collection('events').document(event_id)
                        event_doc = event_ref.get()
                        
                        if event_doc.exists:
                            event_data = event_doc.to_dict()
                            
                            # Add to historical_events collection
                            historical_ref = db.collection('historical_events')
                            historical_data = {
                                **event_data,
                                'original_event_id': event_id,
                                'moved_to_historical_at': current_time.isoformat(),
                                'status': 'completed',
                                'ratings': [],
                                'average_rating': 0,
                                'total_ratings': 0,
                                'rating_finalized': False
                            }
                            historical_ref.add(historical_data)
                            
                            # Send rating notifications to all attendees/invited
                            try:
                                attendees = event_data.get('attendees', [])
                                invited_users = event_data.get('invited_users', [])
                                user_ids = set([a.get('user_id') for a in attendees] + invited_users)
                                
                                expires_at = (current_time + timedelta(hours=24)).isoformat()
                                
                                for rating_user_id in user_ids:
                                    try:
                                        notification_data = {
                                            'user_id': rating_user_id,
                                            'type': 'rate_function',
                                            'title': '⭐ Rate the Function',
                                            'message': f"How was {func.get('function_name')}? Rate it now!",
                                            'event_id': event_id,
                                            'event_name': func.get('function_name'),
                                            'read': False,
                                            'created_at': current_time.isoformat(),
                                            'expires_at': expires_at,
                                            'action_required': True,
                                            'metadata': {
                                                'rating_deadline': expires_at
                                            }
                                        }
                                        db.collection('notifications').add(notification_data)
                                    except:
                                        pass
                                print(f"  ✅ Sent rating notifications to {len(user_ids)} users")
                            except Exception as e:
                                print(f"  ⚠️ Could not send rating notifications: {e}")
                            
                            # Add to past_functions with completion data
                            past_function = {
                                **func,
                                'status': 'completed',
                                'completed_at': current_time.isoformat(),
                                'final_attendee_count': event_data.get('rsvp_count', 0),
                                'original_event_id': event_id
                            }
                            past_functions.append(past_function)
                            
                            # Delete from events collection
                            event_ref.delete()
                            moved_count += 1
                            print(f"  ✅ Moved to past_functions and historical\n")
                        else:
                            # Event doesn't exist in events collection anymore
                            # Just move to past_functions
                            past_function = {
                                **func,
                                'status': 'completed',
                                'completed_at': current_time.isoformat(),
                                'final_attendee_count': 0,
                                'original_event_id': event_id
                            }
                            past_functions.append(past_function)
                            moved_count += 1
                            print(f"  ✅ Moved to past_functions (event already removed)\n")
                    else:
                        # Event hasn't passed yet - keep in current
                        updated_current.append(func)
                else:
                    # No date - keep in current
                    updated_current.append(func)
                    
            except Exception as e:
                print(f"  ⚠️ Error processing function {event_id}: {e}")
                # Keep in current if error
                updated_current.append(func)
        
        # Update user document if changes were made
        if moved_count > 0:
            user_ref.update({
                'current_functions': updated_current,
                'past_functions': past_functions
            })
            print(f"✅ Updated user document: {moved_count} functions moved to past\n")
        else:
            print(f"✅ No past events to move\n")
        
        return {
            "message": "User's past events processed successfully",
            "events_moved": moved_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error processing user's past events: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process past events: {str(e)}")


@app.get("/api/events/historical")
async def get_historical_events(limit: int = 50, offset: int = 0):
    """Get historical (past) events"""
    
    try:
        historical_ref = db.collection('historical_events')
        
        # Get events sorted by date (most recent first)
        query = historical_ref.order_by('date', direction=firestore.Query.DESCENDING).limit(limit).offset(offset)
        events = query.stream()
        
        event_list = []
        for event in events:
            event_data = event.to_dict()
            event_data['event_id'] = event.id
            event_data['original_event_id'] = event_data.get('original_event_id', event.id)
            event_list.append(event_data)
        
        return {
            "events": event_list,
            "count": len(event_list)
        }
        
    except Exception as e:
        print(f"❌ Error fetching historical events: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch historical events: {str(e)}")


@app.get("/api/users/{user_id}/past-functions")
async def get_user_past_functions(user_id: str):
    """Get user's past functions (completed events they organized)"""
    
    try:
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = user_doc.to_dict()
        past_functions = user_data.get('past_functions', [])
        
        # Sort by date (most recent first)
        past_functions.sort(key=lambda x: x.get('date', ''), reverse=True)
        
        return {
            "user_id": user_id,
            "past_functions": past_functions,
            "count": len(past_functions)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching past functions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch past functions: {str(e)}")

class CancelEventRequest(BaseModel):
    user_id: str
    cancelled_same_day: bool = False

@app.delete("/api/events/{event_id}")
async def cancel_event(event_id: str, cancel_data: CancelEventRequest):
    """Cancel an event and remove from user's current_functions"""
    
    print(f"\n{'='*60}")
    print(f"🗑️ EVENT CANCELLATION REQUEST")
    print(f"{'='*60}")
    print(f"Event ID: {event_id}")
    print(f"User ID: {cancel_data.user_id}")
    print(f"Same Day Cancellation: {cancel_data.cancelled_same_day}")
    print(f"{'='*60}\n")
    
    # Get event document
    event_ref = db.collection('events').document(event_id)
    event_doc = event_ref.get()
    
    if not event_doc.exists:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event_data = event_doc.to_dict()
    
    # Verify user is the organizer
    if event_data.get('organizer_user_id') != cancel_data.user_id:
        raise HTTPException(status_code=403, detail="Only the organizer can cancel this event")
    
    try:
        # Delete event from events collection
        event_ref.delete()
        print(f"✅ Event deleted from events collection")
        
        # Remove from user's current_functions
        user_ref = db.collection('users').document(cancel_data.user_id)
        user_doc = user_ref.get()
        
        if user_doc.exists:
            user_data = user_doc.to_dict()
            current_functions = user_data.get('current_functions', [])
            
            # Remove the cancelled function
            updated_functions = [
                func for func in current_functions 
                if func.get('event_id') != event_id
            ]
            
            # Apply rating penalty if cancelled same day
            current_rating = user_data.get('personal_rating', 5)
            
            if cancel_data.cancelled_same_day:
                new_rating = max(1, current_rating - 2)  # Minimum rating is 1
                user_ref.update({
                    'current_functions': updated_functions,
                    'personal_rating': new_rating
                })
                print(f"⚠️ Same-day cancellation! Rating decreased from {current_rating} to {new_rating}")
            else:
                user_ref.update({
                    'current_functions': updated_functions
                })
                print(f"✅ Event removed from user's current_functions (no rating penalty)")
        
        return {
            "message": "Event cancelled successfully",
            "rating_penalty_applied": cancel_data.cancelled_same_day,
            "new_rating": max(1, user_data.get('personal_rating', 5) - 2) if cancel_data.cancelled_same_day else user_data.get('personal_rating', 5)
        }
        
    except Exception as e:
        print(f"❌ Error cancelling event: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to cancel event: {str(e)}")


# ==========================================
# NOTIFICATION SYSTEM ENDPOINTS
# ==========================================

class NotificationType(str, Enum):
    PRIVATE_INVITE = "private_invite"
    RSVP_RECEIVED = "rsvp_received"
    RATE_FUNCTION = "rate_function"
    FUNCTION_CANCELLED = "function_cancelled"

class InviteUsersRequest(BaseModel):
    invited_user_ids: List[str]  # List of BC emails or user IDs
    personal_message: Optional[str] = None

class RateFunctionRequest(BaseModel):
    user_id: str
    rating: int  # 1-5 stars
    comment: Optional[str] = None
    attended: bool = True


@app.post("/api/events/{event_id}/invite-users")
async def invite_users_to_private_event(event_id: str, invite_data: InviteUsersRequest):
    """Invite specific users to a private event - sends notifications to each invited user"""
    
    print(f"\n{'='*60}")
    print(f"📬 INVITING USERS TO PRIVATE EVENT")
    print(f"Event ID: {event_id}")
    print(f"Users to invite: {len(invite_data.invited_user_ids)}")
    print(f"{'='*60}\n")
    
    try:
        # Get event details
        event_ref = db.collection('events').document(event_id)
        event_doc = event_ref.get()
        
        if not event_doc.exists:
            raise HTTPException(status_code=404, detail="Event not found")
        
        event_data = event_doc.to_dict()
        
        # Verify event is private
        if event_data.get('public_or_private') != 'private':
            raise HTTPException(status_code=400, detail="Can only invite users to private events")
        
        # Check max capacity
        max_capacity = event_data.get('max_capacity', 50)
        current_invites = len(event_data.get('invited_users', []))
        
        if current_invites + len(invite_data.invited_user_ids) > max_capacity:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot invite {len(invite_data.invited_user_ids)} users. Only {max_capacity - current_invites} spots remaining."
            )
        
        # Get organizer info
        organizer_id = event_data.get('organizer_user_id')
        organizer_alias = event_data.get('organizer_alias', 'Someone')
        
        # Create notifications for each invited user
        notifications_created = 0
        invited_users = event_data.get('invited_users', [])
        
        for user_identifier in invite_data.invited_user_ids:
            try:
                # Find user by email or ID
                users_ref = db.collection('users')
                
                # Try to find by email first (BC email)
                if '@bc.edu' in user_identifier:
                    user_query = users_ref.where('bc_email', '==', user_identifier).limit(1).stream()
                    user_docs = list(user_query)
                    if user_docs:
                        user_doc = user_docs[0]
                        invited_user_id = user_doc.id
                    else:
                        print(f"⚠️ User not found: {user_identifier}")
                        continue
                else:
                    # Assume it's a user ID
                    invited_user_id = user_identifier
                    user_doc = users_ref.document(invited_user_id).get()
                    if not user_doc.exists:
                        print(f"⚠️ User not found: {user_identifier}")
                        continue
                
                # Check if already invited
                if invited_user_id in invited_users:
                    print(f"⚠️ User already invited: {invited_user_id}")
                    continue
                
                # Create notification
                notification_data = {
                    'user_id': invited_user_id,
                    'type': 'private_invite',
                    'title': f"🎉 You're Invited!",
                    'message': f"{organizer_alias} invited you to {event_data.get('function_name')}",
                    'event_id': event_id,
                    'event_name': event_data.get('function_name'),
                    'sender_id': organizer_id,
                    'sender_name': organizer_alias,
                    'read': False,
                    'created_at': datetime.utcnow().isoformat(),
                    'action_required': True,
                    'metadata': {
                        'personal_message': invite_data.personal_message,
                        'event_date': event_data.get('date'),
                        'event_location': event_data.get('location')
                    }
                }
                
                # Add to notifications collection
                db.collection('notifications').add(notification_data)
                
                # Add to invited_users list
                invited_users.append(invited_user_id)
                notifications_created += 1
                
                print(f"✅ Invited user: {invited_user_id}")
                
            except Exception as e:
                print(f"❌ Error inviting user {user_identifier}: {e}")
                continue
        
        # Update event with invited users list
        event_ref.update({
            'invited_users': invited_users,
            'invite_count': len(invited_users)
        })
        
        print(f"\n✅ Successfully invited {notifications_created} users\n")
        
        return {
            "message": f"Invited {notifications_created} users successfully",
            "notifications_created": notifications_created,
            "total_invited": len(invited_users)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error inviting users: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to invite users: {str(e)}")


@app.get("/api/users/{user_id}/notifications")
async def get_user_notifications(user_id: str, unread_only: bool = False):
    """Get all notifications for a user"""
    
    try:
        notifications_ref = db.collection('notifications')
        query = notifications_ref.where('user_id', '==', user_id).order_by('created_at', direction=firestore.Query.DESCENDING)
        
        if unread_only:
            query = query.where('read', '==', False)
        
        notifications = query.stream()
        
        notification_list = []
        for notif in notifications:
            notif_data = notif.to_dict()
            notif_data['notification_id'] = notif.id
            notification_list.append(notif_data)
        
        return {
            "notifications": notification_list,
            "count": len(notification_list),
            "unread_count": len([n for n in notification_list if not n.get('read', False)])
        }
        
    except Exception as e:
        print(f"❌ Error fetching notifications: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch notifications: {str(e)}")


@app.get("/api/users")
async def get_all_users():
    """Get all registered users (for private event invitations)"""
    
    try:
        users_ref = db.collection('users')
        users = users_ref.stream()
        
        user_list = []
        for user_doc in users:
            user_data = user_doc.to_dict()
            # Only return necessary fields for privacy
            user_list.append({
                'user_id': user_doc.id,
                'ai_generated_alias': user_data.get('ai_generated_alias'),
                'bc_email': user_data.get('bc_email'),
                'personal_rating': user_data.get('personal_rating', 5)
            })
        
        # Sort by alias alphabetically
        user_list.sort(key=lambda x: x.get('ai_generated_alias', ''))
        
        return {
            "users": user_list,
            "count": len(user_list)
        }
        
    except Exception as e:
        print(f"❌ Error fetching users: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch users: {str(e)}")


@app.patch("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark a notification as read"""
    
    try:
        notif_ref = db.collection('notifications').document(notification_id)
        notif_ref.update({'read': True})
        
        return {"message": "Notification marked as read"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark notification as read: {str(e)}")


@app.delete("/api/notifications/{notification_id}")
async def delete_notification(notification_id: str):
    """Delete a notification"""
    
    try:
        db.collection('notifications').document(notification_id).delete()
        return {"message": "Notification deleted"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete notification: {str(e)}")


@app.post("/api/events/{event_id}/rate")
async def rate_function(event_id: str, rating_data: RateFunctionRequest):
    """Rate a completed function - users have 24 hours after event ends to rate"""
    
    print(f"\n{'='*60}")
    print(f"⭐ RATING FUNCTION")
    print(f"Event ID: {event_id}")
    print(f"User ID: {rating_data.user_id}")
    print(f"Rating: {rating_data.rating}/5")
    print(f"{'='*60}\n")
    
    try:
        # Validate rating
        if rating_data.rating < 1 or rating_data.rating > 5:
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        
        # Check if event exists in historical_events
        historical_ref = db.collection('historical_events')
        query = historical_ref.where('original_event_id', '==', event_id).limit(1).stream()
        historical_docs = list(query)
        
        if not historical_docs:
            raise HTTPException(status_code=404, detail="Event not found in historical events")
        
        historical_doc = historical_docs[0]
        historical_id = historical_doc.id
        event_data = historical_doc.to_dict()
        
        # Check if rating period is still open (24 hours after event)
        event_date = datetime.fromisoformat(event_data.get('date').replace('Z', '+00:00'))
        current_time = datetime.utcnow()
        hours_since_event = (current_time - event_date.replace(tzinfo=None)).total_seconds() / 3600
        
        if hours_since_event > 24:
            raise HTTPException(status_code=400, detail="Rating period has expired (24 hours after event)")
        
        # Check if user was invited or RSVPed
        attendees = event_data.get('attendees', [])
        invited_users = event_data.get('invited_users', [])
        
        user_ids_eligible = [a.get('user_id') for a in attendees] + invited_users
        
        if rating_data.user_id not in user_ids_eligible:
            raise HTTPException(status_code=403, detail="Only attendees and invited users can rate this event")
        
        # Get or create ratings list
        ratings = event_data.get('ratings', [])
        
        # Check if user already rated
        existing_rating = next((r for r in ratings if r.get('user_id') == rating_data.user_id), None)
        if existing_rating:
            raise HTTPException(status_code=400, detail="You have already rated this event")
        
        # Add new rating
        new_rating = {
            'user_id': rating_data.user_id,
            'rating': rating_data.rating,
            'comment': rating_data.comment,
            'attended': rating_data.attended,
            'rated_at': current_time.isoformat()
        }
        ratings.append(new_rating)
        
        # Calculate average rating
        total_ratings = len(ratings)
        average_rating = sum(r['rating'] for r in ratings) / total_ratings
        
        # Update historical event
        historical_ref.document(historical_id).update({
            'ratings': ratings,
            'average_rating': average_rating,
            'total_ratings': total_ratings
        })
        
        print(f"✅ Rating added: {rating_data.rating}/5")
        print(f"📊 New average: {average_rating:.2f}/5 ({total_ratings} ratings)\n")
        
        # Check if rating period should close (all eligible users rated or 24 hours passed)
        if total_ratings >= len(user_ids_eligible) or hours_since_event >= 24:
            # Finalize rating and update organizer's rating
            await finalize_event_rating(event_id, event_data, average_rating, historical_id)
        
        return {
            "message": "Rating submitted successfully",
            "average_rating": average_rating,
            "total_ratings": total_ratings
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error rating function: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to rate function: {str(e)}")


async def finalize_event_rating(event_id: str, event_data: dict, average_rating: float, historical_id: str):
    """Finalize event rating and update organizer's overall rating"""
    
    print(f"\n{'='*60}")
    print(f"🎯 FINALIZING EVENT RATING")
    print(f"Event: {event_data.get('function_name')}")
    print(f"Final Rating: {average_rating:.2f}/5")
    print(f"{'='*60}\n")
    
    try:
        organizer_id = event_data.get('organizer_user_id')
        
        if not organizer_id:
            print("⚠️ No organizer ID found")
            return
        
        # Get organizer
        user_ref = db.collection('users').document(organizer_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            print("⚠️ Organizer not found")
            return
        
        user_data = user_doc.to_dict()
        
        # Get current personal rating
        current_rating = user_data.get('personal_rating', 5)
        
        # Get past functions
        past_functions = user_data.get('past_functions', [])
        
        # Count total rated functions
        rated_functions_count = len([f for f in past_functions if f.get('final_rating')])
        
        # Calculate new weighted average
        # Formula: (current_rating * rated_count + new_rating) / (rated_count + 1)
        new_personal_rating = ((current_rating * rated_functions_count) + average_rating) / (rated_functions_count + 1)
        
        # Round to 1 decimal place
        new_personal_rating = round(new_personal_rating, 1)
        
        # Update organizer's rating
        user_ref.update({
            'personal_rating': new_personal_rating
        })
        
        # Update the function in past_functions with final rating
        for func in past_functions:
            if func.get('event_id') == event_id or func.get('original_event_id') == event_id:
                func['final_rating'] = average_rating
                func['rating_finalized'] = True
                break
        
        user_ref.update({
            'past_functions': past_functions
        })
        
        print(f"✅ Organizer rating updated: {current_rating} → {new_personal_rating}")
        print(f"📊 Based on {rated_functions_count + 1} rated functions\n")
        
        # Mark historical event as rating finalized
        historical_ref = db.collection('historical_events')
        historical_ref.document(historical_id).update({
            'rating_finalized': True,
            'rating_finalized_at': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Error finalizing rating: {e}")


# Run with: uvicorn main:app --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)