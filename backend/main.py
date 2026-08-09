from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

# ========== Initialize FastAPI Application ==========
app = FastAPI(title="Travel Planner API")

# ========== CORS Configuration ==========
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://travel-planner-hyun.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== Database Configuration ==========
DATABASE_URL = "sqlite:///./travel.db"

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine
)

Base = declarative_base()

# ========== Data Models ==========

# ========== User Model ==========
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    home_image_url = Column(String, default="")
    created_at = Column(String, default=lambda: datetime.now().isoformat())

# ========== Destination Model ==========

class Destination(Base):
    __tablename__ = "destinations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    rating = Column(Integer, default=5)
    country = Column(String, default="")   
    tags = Column(String, default="")
    status = Column(String, default="wishlist")
    image_url = Column(String, default="")

# ========== Trip Model ==========
class Trip(Base):
    __tablename__ = "trips"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, index=True)
    date_range = Column(String)
    destinations_count = Column(Integer, default=0)
    budget = Column(Integer, default=0)
    rating = Column(Integer, default=5)
    status = Column(String, default="draft")
    image_url = Column(String, default="")
    created_at = Column(String, default=lambda: datetime.now().isoformat())

# ========== TripDestination Model ==========
class TripDestination(Base):
    __tablename__ = "trip_destinations"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, default="")
    day_number = Column(Integer, default=1)
    budget = Column(Integer, default=0)
    actual_cost = Column(Integer, default=0)
    created_at = Column(String, default=lambda: datetime.now().isoformat())

class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "destination_id", name="uq_user_destination_favorite"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=False)
    created_at = Column(String, default=lambda: datetime.now().isoformat())

Base.metadata.create_all(bind=engine)

# ========== Database Migration ==========
def _migrate_favorites_table():
    """Migrate favorites table from old schema (name/city/category) to new schema (user_id/destination_id)."""
    import sqlite3
    db_path = DATABASE_URL.replace("sqlite:///", "")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(favorites)")
    columns = {row[1] for row in cursor.fetchall()}
    if columns and "user_id" not in columns:
        cursor.execute("DROP TABLE IF EXISTS favorites")
        cursor.execute("""
            CREATE TABLE favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id),
                destination_id INTEGER NOT NULL REFERENCES destinations(id),
                created_at VARCHAR,
                CONSTRAINT uq_user_destination_favorite UNIQUE (user_id, destination_id)
            )
        """)
        conn.commit()
    conn.close()
_migrate_favorites_table()


def _migrate_destinations_table():
    """Ensure destinations table contains image_url column for destination images."""
    import sqlite3
    db_path = DATABASE_URL.replace("sqlite:///", "")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(destinations)")
    columns = {row[1] for row in cursor.fetchall()}
    if columns and "image_url" not in columns:
        cursor.execute("ALTER TABLE destinations ADD COLUMN image_url VARCHAR DEFAULT ''")
        conn.commit()
    conn.close()
_migrate_destinations_table()

def _migrate_trips_table():
    """Ensure trips table contains image_url column for trip cover images."""
    import sqlite3
    db_path = DATABASE_URL.replace("sqlite:///", "")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(trips)")
    columns = {row[1] for row in cursor.fetchall()}
    if columns and "image_url" not in columns:
        cursor.execute("ALTER TABLE trips ADD COLUMN image_url VARCHAR DEFAULT ''")
        conn.commit()
    conn.close()
_migrate_trips_table()

def _migrate_users_table():
    """Ensure users table contains home_image_url column for home cover images."""
    import sqlite3
    db_path = DATABASE_URL.replace("sqlite:///", "")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(users)")
    columns = {row[1] for row in cursor.fetchall()}
    if columns and "home_image_url" not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN home_image_url VARCHAR DEFAULT ''")
        conn.commit()
    conn.close()
_migrate_users_table()


# ========== Pydantic Models ==========
# ===== User Pydantic Models =====
class UserRegister(BaseModel):
    email: str
    username: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    home_image_url: str = ""
    created_at: str
    
    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    home_image_url: Optional[str] = None

# ===== Destination Pydantic Models =====
class DestinationCreate(BaseModel):
    name: str
    description: str
    rating: int = 5
    country: str = ""
    tags: str = ""
    status: str = "wishlist"
    image_url: str = ""

class DestinationResponse(BaseModel):
    id: int
    name: str
    description: str
    rating: int
    country: str
    tags: str
    status: str
    image_url: str
    
    model_config = ConfigDict(from_attributes=True)

class TripCreate(BaseModel):
    user_id: int
    title: str
    date_range: str
    destinations_count: int
    budget: int
    rating: int = 5
    status: str = "draft"
    image_url: str = ""

class TripResponse(BaseModel):
    id: int
    user_id: int
    title: str
    date_range: str
    destinations_count: int
    budget: int
    rating: int
    status: str
    image_url: str
    created_at: str
    
    model_config = ConfigDict(from_attributes=True)

# ===== TripDestination Pydantic Models =====
class TripDestinationCreate(BaseModel):
    name: str
    description: str
    day_number: int = 1
    budget: int = 0
    actual_cost: int = 0

class TripDestinationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    day_number: Optional[int] = None
    budget: Optional[int] = None
    actual_cost: Optional[int] = None

class TripDestinationResponse(BaseModel):
    id: int
    trip_id: int
    name: str
    description: str
    day_number: int
    budget: int
    actual_cost: int
    created_at: str

    model_config = ConfigDict(from_attributes=True)

# =====Favorite Pydantic Models =====
class FavoriteCreate(BaseModel):
    user_id: int
    destination_id: int

class FavoriteResponse(BaseModel):
    id: int
    user_id: int
    destination_id: int
    created_at: str
    

    model_config = ConfigDict(from_attributes=True)

# ========== API Routes ==========
# ===== User Routes =====
@app.post("/auth/register")
def register(user: UserRegister):
    """User Registration"""
    db = SessionLocal()
    
    # Check if the email is already registered.
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        db.close()
        return {"error": "Email is already registered"}
    
    # Check if the username already exists
    existing_username = db.query(User).filter(User.username == user.username).first()
    if existing_username:
        db.close()
        return {"error": "Username already exists"}
    
    # Create a new user
    db_user = User(
        email=user.email,
        username=user.username,
        password=user.password  # Not encrypted for now
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    db.close()
    
    return {
        "message": "Registration successful",
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "username": db_user.username
        }
    }

@app.post("/auth/login")
def login(user: UserLogin):
    """User Login"""
    db = SessionLocal()
    
    # Find the user
    db_user = db.query(User).filter(User.email == user.email).first()
    
    if not db_user:
        db.close()
        return {"error": "Email does not exist"}
    
    # Verify password
    if db_user.password != user.password:
        db.close()
        return {"error": "Incorrect password"}
    
    db.close()
    
    return {
        "message": "Login successful",
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "username": db_user.username
        }
    }

@app.get("/user/{user_id}")
def get_user(user_id: int):
    """Get user information"""
    db = SessionLocal()
    user = db.query(User).filter(User.id == user_id).first()
    db.close()
    
    if not user:
        return {"error": "User does not exist"}
    
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "home_image_url": user.home_image_url or "",
        "created_at": user.created_at
    }

@app.put("/user/{user_id}")
def update_user(user_id: int, user_data: UserUpdate):
    """Update user information"""
    db = SessionLocal()
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        db.close()
        return {"error": "User does not exist"}
    
    # Update username
    if user_data.username:
        # Check if the new username already exists
        existing_username = db.query(User).filter(
            User.username == user_data.username,
            User.id != user_id
        ).first()
        if existing_username:
            db.close()
            return {"error": "Username already exists"}
        user.username = user_data.username
    
    # Update password
    if user_data.password:
        user.password = user_data.password

    # Update email
    if user_data.email:
        # Check if the new email already exists
        existing_email = db.query(User).filter(
            User.email == user_data.email,
            User.id != user_id
        ).first()
        if existing_email:
            db.close()
            return {"error": "Email is already registered"}
        user.email = user_data.email

    # Update home image
    if user_data.home_image_url is not None:
        user.home_image_url = user_data.home_image_url
    
    db.commit()
    response_data = {
        "message": "Update successful.",
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "home_image_url": user.home_image_url or ""
        }
    }
    
    db.close()
    
    return response_data
    



# ===== Trip Routes =====

@app.get("/trips/recent")  
def get_recent_trips(user_id: int):
    db = SessionLocal()
    trips = db.query(Trip).filter(Trip.user_id == user_id).all()
    db.close()
    
    result = []
    for trip in trips:
        result.append({
            "id": trip.id,
            "title": trip.title,
            "date_range": trip.date_range,
            "destinations_count": trip.destinations_count,
            "budget": trip.budget,
            "rating": trip.rating,
            "status": trip.status,
            "image_url": trip.image_url
        })
    return result


@app.get("/")
def read_root():
    return {"message": "Welcome to Travel Planner API! ✈️"}

# ===== Destination Routes =====
@app.get("/destinations", response_model=List[DestinationResponse])
def get_destinations():
    db = SessionLocal()
    destinations = db.query(Destination).all()
    db.close()
    return destinations

@app.post("/destinations", response_model=DestinationResponse)
def create_destination(destination: DestinationCreate):
    db = SessionLocal()
    db_destination = Destination(**destination.dict())
    db.add(db_destination)
    db.commit()
    db.refresh(db_destination)
    db.close()
    return db_destination

@app.get("/destinations/{destination_id}", response_model=DestinationResponse)
def get_destination(destination_id: int):
    db = SessionLocal()
    destination = db.query(Destination).filter(
        Destination.id == destination_id
    ).first()
    db.close()
    
    if not destination:
        return {"error": "Destination not found"}
    return destination

@app.put("/destinations/{destination_id}", response_model=DestinationResponse)
def update_destination(destination_id: int, data: DestinationCreate):
    db = SessionLocal()
    destination = db.query(Destination).filter(Destination.id == destination_id).first()
    if not destination:
        db.close()
        raise HTTPException(status_code=404, detail="Destination not found")
    destination.name = data.name
    destination.description = data.description
    destination.rating = data.rating
    destination.country = data.country
    destination.tags = data.tags
    destination.status = data.status
    destination.image_url = data.image_url
    db.commit()
    db.refresh(destination)
    db.close()
    return destination

@app.delete("/destinations/{destination_id}")
def delete_destination(destination_id: int):
    db = SessionLocal()
    destination = db.query(Destination).filter(
        Destination.id == destination_id
    ).first()
    
    if not destination:
        db.close()
        return {"error": "Destination not found"}
    
    db.delete(destination)
    db.commit()
    db.close()
    return {"message": "Deletion successful"}

# ===== Trip Routes =====
@app.get("/trips", response_model=List[TripResponse])
def get_trips(user_id: int):
    db = SessionLocal()
    trips = db.query(Trip).filter(Trip.user_id == user_id).order_by(Trip.created_at.desc()).limit(2).all()
    db.close()
    return trips

@app.post("/trips", response_model=TripResponse)
def create_trip(trip: TripCreate):
    db = SessionLocal()
    db_trip = Trip(**trip.dict())
    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)
    db.close()
    return db_trip

@app.put("/trips/{trip_id}")
def update_trip(trip_id: int, trip_data: dict):
    db = SessionLocal()
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        db.close()
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Update field
    if "title" in trip_data:
        trip.title = trip_data["title"]
    if "date_range" in trip_data:
        trip.date_range = trip_data["date_range"]
    if "destinations_count" in trip_data:
        trip.destinations_count = trip_data["destinations_count"]
    if "budget" in trip_data:
        trip.budget = trip_data["budget"]
    if "rating" in trip_data:
        trip.rating = trip_data["rating"]
    if "status" in trip_data:
        trip.status = trip_data["status"]
    if "image_url" in trip_data:
        trip.image_url = trip_data["image_url"]
    
    db.commit()
    db.close()
    return {"message": "Trip updated successfully", "id": trip_id}

@app.get("/trips/{trip_id}", response_model=TripResponse)
def get_trip(trip_id: int):
    db = SessionLocal()
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    db.close()
    
    if not trip:
        return {"error": "Trip not found"}
    return trip

@app.delete("/trips/{trip_id}")
def delete_trip(trip_id: int):
    db = SessionLocal()
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    
    if not trip:
        db.close()
        return {"error": "Trip not found"}
    
    db.delete(trip)
    db.commit()
    db.close()
    return {"message": "Deletion successful"}

# ===== Statistics Routes =====
@app.get("/stats")
def get_stats(user_id: int):
    db = SessionLocal()
    total_trips = db.query(Trip).filter(Trip.user_id == user_id).count()
    total_destinations = (
        db.query(TripDestination)
        .join(Trip, TripDestination.trip_id == Trip.id)
        .filter(Trip.user_id == user_id)
        .count()
    )
    completed_trips = db.query(Trip).filter(Trip.user_id == user_id, Trip.status == "completed").count()
    db.close()
    
    return {
        "total_trips": total_trips,
        "total_destinations": total_destinations,
        "completed_trips": completed_trips
    }

# ===== Trip Destination Routes =====
@app.get("/trips/{trip_id}/destinations")
def get_trip_destinations(trip_id: int):
    """Get all destinations for a trip"""
    db = SessionLocal()
    destinations = db.query(TripDestination).filter(
        TripDestination.trip_id == trip_id
    ).order_by(TripDestination.day_number).all()
    db.close()
    return [
        {
            "id": d.id,
            "trip_id": d.trip_id,
            "name": d.name,
            "description": d.description,
            "day_number": d.day_number,
            "budget": d.budget,
            "actual_cost": d.actual_cost,
            "created_at": d.created_at,
        }
        for d in destinations
    ]

@app.post("/trips/{trip_id}/destinations")
def add_trip_destination(trip_id: int, dest: TripDestinationCreate):
    """Add a destination to a trip"""
    db = SessionLocal()
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        db.close()
        raise HTTPException(status_code=404, detail="Trip not found")

    db_dest = TripDestination(
        trip_id=trip_id,
        name=dest.name,
        description=dest.description,
        day_number=dest.day_number,
        budget=dest.budget,
        actual_cost=dest.actual_cost,
    )
    db.add(db_dest)

    # Update destinations_count on the trip
    trip.destinations_count = db.query(TripDestination).filter(
        TripDestination.trip_id == trip_id
    ).count() + 1

    db.commit()
    db.refresh(db_dest)
    result = {
        "id": db_dest.id,
        "trip_id": db_dest.trip_id,
        "name": db_dest.name,
        "description": db_dest.description,
        "day_number": db_dest.day_number,
        "budget": db_dest.budget,
        "actual_cost": db_dest.actual_cost,
        "created_at": db_dest.created_at,
    }
    db.close()
    return result

@app.put("/trips/{trip_id}/destinations/{dest_id}")
def update_trip_destination(trip_id: int, dest_id: int, dest_data: TripDestinationUpdate):
    """Update a destination in a trip"""
    db = SessionLocal()
    dest = db.query(TripDestination).filter(
        TripDestination.id == dest_id,
        TripDestination.trip_id == trip_id
    ).first()
    if not dest:
        db.close()
        raise HTTPException(status_code=404, detail="Destination not found")

    if dest_data.name is not None:
        dest.name = dest_data.name
    if dest_data.description is not None:
        dest.description = dest_data.description
    if dest_data.day_number is not None:
        dest.day_number = dest_data.day_number
    if dest_data.budget is not None:
        dest.budget = dest_data.budget
    if dest_data.actual_cost is not None:
        dest.actual_cost = dest_data.actual_cost

    db.commit()
    db.close()
    return {"message": "Destination updated successfully"}

@app.delete("/trips/{trip_id}/destinations/{dest_id}")
def delete_trip_destination(trip_id: int, dest_id: int):
    """Delete a destination from a trip"""
    db = SessionLocal()
    dest = db.query(TripDestination).filter(
        TripDestination.id == dest_id,
        TripDestination.trip_id == trip_id
    ).first()
    if not dest:
        db.close()
        raise HTTPException(status_code=404, detail="Destination not found")

    db.delete(dest)

    # Update destinations_count
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if trip:
        trip.destinations_count = db.query(TripDestination).filter(
            TripDestination.trip_id == trip_id
        ).count() - 1

    db.commit()
    db.close()
    return {"message": "Destination deleted successfully"}

@app.post("/favorites")
def create_favorite(favorite: FavoriteCreate) -> dict:
    """Add a destination to a user's favorites."""
    db = SessionLocal()

    user = db.query(User).filter(User.id == favorite.user_id).first()
    if not user:
        db.close()
        raise HTTPException(status_code=404, detail="User not found")

    destination = db.query(Destination).filter(Destination.id == favorite.destination_id).first()
    if not destination:
        db.close()
        raise HTTPException(status_code=404, detail="Destination not found")

    db_favorite = Favorite(
        user_id=favorite.user_id,
        destination_id=favorite.destination_id,
    )
    db.add(db_favorite)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        db.close()
        raise HTTPException(status_code=409, detail="Destination is already in favorites")
    db.refresh(db_favorite)

    result = {
        "message": "Favorite added successfully",
        "favorite": {
            "id": db_favorite.id,
            "user_id": db_favorite.user_id,
            "destination_id": db_favorite.destination_id,
            "created_at": db_favorite.created_at,
        }
    }
    db.close()
    return result

@app.get("/favorites")
def get_favorites(user_id: int) -> List[dict]:
    """Get all favorites for a user, including destination details."""
    db = SessionLocal()
    favorites = db.query(Favorite, Destination).join(
        Destination, Favorite.destination_id == Destination.id
    ).filter(
        Favorite.user_id == user_id
    ).all()

    result = []
    for favorite, destination in favorites:
        result.append({
            "id": favorite.id,
            "user_id": favorite.user_id,
            "destination_id": favorite.destination_id,
            "created_at": favorite.created_at,
            "destination": {
                "id": destination.id,
                "name": destination.name,
                "description": destination.description,
                "rating": destination.rating,
                "country": destination.country,
                "tags": destination.tags,
                "status": destination.status,
                "image_url": destination.image_url,
            }
        })

    db.close()
    return result

@app.delete("/favorites/{favorite_id}")
def delete_favorite(favorite_id: int, user_id: int) -> dict:
    """Delete a favorite item for the specified user."""
    db = SessionLocal()
    favorite = db.query(Favorite).filter(
        Favorite.id == favorite_id,
        Favorite.user_id == user_id
    ).first()

    if not favorite:
        db.close()
        raise HTTPException(status_code=404, detail="Favorite not found")

    db.delete(favorite)
    db.commit()
    db.close()
    return {"message": "Favorite deleted successfully"}



# ========== Main Program Entry ==========
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
