export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return Response.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    const response = await fetch("https://api.vapi.ai/auth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
      },
      body: JSON.stringify({
        userId: userId,
      }),
    });

    if (!response.ok) {
      console.error("Failed to generate Vapi token:", response.statusText);
      return Response.json(
        { success: false, error: "Failed to generate token" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return Response.json({ success: true, token: data.token }, { status: 200 });
  } catch (error) {
    console.error("Error generating Vapi token:", error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
