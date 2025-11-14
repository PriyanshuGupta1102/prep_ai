import Vapi from "@vapi-ai/web";

/**
 * Initialize Vapi with public token
 * Falls back to session token approach if needed
 */
export const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN!);

/**
 * Get a session token from the backend to bypass CORS issues
 * This should be called before starting a call
 */
export async function getVapiSessionToken(userId: string): Promise<string> {
  try {
    const response = await fetch("/api/vapi/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      throw new Error("Failed to get session token");
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error("Error getting Vapi session token:", error);
    // Fallback to public token if session token fails
    return process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN || "";
  }
}
