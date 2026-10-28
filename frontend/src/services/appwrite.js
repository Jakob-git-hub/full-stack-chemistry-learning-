import { Client, Databases, ID, Query } from "appwrite";

// ---------------------------------------------------------------------------
// Appwrite Web SDK Konfiguration
// Project: ChemLeaner (6ae104eb001d990f63e6)
// Endpoint: https://fra.cloud.appwrite.io/v1
// ---------------------------------------------------------------------------
const client = new Client();

client
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6ae104eb001d990f63e6");

const databases = new Databases(client);

/**
 * Testet die Appwrite-Verbindung.
 * Aufruf in main.jsx nach React-Mount.
 */
export async function testAppwriteConnection() {
  try {
    await client.ping();
    console.log("✅ Appwrite connected successfully");
    return true;
  } catch (err) {
    console.warn("⚠️ Appwrite connection failed (using demo mode):", err.message);
    return false;
  }
}

export const APPWRITE_CONFIG = {
  DATABASE_ID: "chemvibe",
  COLLECTION_ID: "lessons",
  PROFILES_COLLECTION_ID: "user_profiles",
};

/**
 * Lädt alle Lektionen aus der Appwrite-Collection `lessons`.
 * Optional filterbar nach Status (z.B. "published" für den öffentlichen Lernpfad).
 */
export async function fetchLessons(statusFilter = null) {
  try {
    const queries = [];
    if (statusFilter) {
      queries.push(Query.equal("status", statusFilter));
    }

    const response = await databases.listDocuments(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTION_ID,
      queries
    );

    return response.documents.map((doc) => ({
      id: doc.$id,
      title: doc.title,
      category: doc.category,
      theory: doc.theory,
      challenge: doc.challenge,
      status: doc.status,
      topic: doc.topic,
      createdAt: doc.$createdAt,
      updatedAt: doc.$updatedAt,
    }));
  } catch (error) {
    console.error("Fehler beim Laden der Lektionen:", error);
    throw error;
  }
}

/**
 * Lädt eine einzelne Lektion anhand ihrer ID.
 */
export async function fetchLessonById(lessonId) {
  try {
    const doc = await databases.getDocument(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTION_ID,
      lessonId
    );

    return {
      id: doc.$id,
      title: doc.title,
      category: doc.category,
      theory: doc.theory,
      challenge: doc.challenge,
      status: doc.status,
      topic: doc.topic,
      createdAt: doc.$createdAt,
      updatedAt: doc.$updatedAt,
    };
  } catch (error) {
    console.error("Fehler beim Laden der Lektion:", error);
    throw error;
  }
}

/**
 * Lädt alle Lektionen mit Status "draft" (für das Admin-Dashboard).
 */
export async function fetchDrafts() {
  return fetchLessons("draft");
}

/**
 * Lädt alle veröffentlichten Lektionen (für den öffentlichen Lernpfad).
 */
export async function fetchPublishedLessons() {
  return fetchLessons("published");
}

export { client, databases, ID, Query };