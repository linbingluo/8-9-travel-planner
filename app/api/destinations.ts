// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";


export interface Destination {
  id: number;
  name: string;
  description: string;
  rating: number;
  latitude: number | null;
  longitude: number | null;
}



export interface CreateDestinationRequest {
  name: string;
  description: string;
  rating?: number;
}

// Get all destinations
export async function getDestinations(): Promise<Destination[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/destinations`);
    if (!response.ok) {
      throw new Error("Failed to fetch destinations");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching destinations:", error);
    return [];
  }
}

// Create a new destination
export async function createDestination(
  destination: CreateDestinationRequest
): Promise<Destination | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/destinations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(destination),
    });
    if (!response.ok) {
      throw new Error("Failed to create destination");
    }
    return await response.json();
  } catch (error) {
    console.error("Error creating destination:", error);
    return null;
  }
}

// Get a single destination
export async function getDestination(id: number): Promise<Destination | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/destinations/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch destination");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching destination:", error);
    return null;
  }
}

// Delete a destination
export async function deleteDestination(id: number): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/destinations/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete destination");
    }
    return true;
  } catch (error) {
    console.error("Error deleting destination:", error);
    return false;
  }
}
