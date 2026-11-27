exports.handler = async function(event) {

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: "POST request required."
      })
    };
  }

  try {

    // Get the secret API key from Netlify
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "GEMINI_API_KEY is missing in Netlify."
        })
      };
    }

    // Read incoming messages
    const body = JSON.parse(event.body || "{}");
    const messages = body.messages || [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Please send a message."
        })
      };
    }

    // Convert chat history to Gemini format
    const contents = messages
      .filter(function(m) {
        return m.role === "user" || m.role === "assistant";
      })
      .map(function(m) {
        return {
          role: m.role === "assistant" ? "model" : "user",
          parts: [
            {
              text: String(m.content || "")
            }
          ]
        };
      });

    // Gemini system instructions
    const systemInstruction = {
      parts: [
        {
          text:
            "You are Jeevan AI, a helpful computer science tutor. " +
            "Answer general computer science questions, definitions, " +
            "algorithms, programming, Java, Python, C, SQL, DBMS, " +
            "ADA, machine learning, web development, and exam questions. " +
            "Use simple English and easy points when requested. " +
            "For definitions, give a clear definition. " +
            "For exam answers, organize with headings and numbered points. " +
            "For programming requests, provide complete working code, " +
            "explain the code, and mention its output when useful. " +
            "Be accurate, friendly, and educational. " +
            "Do not restrict answers only to Jeevan's portfolio."
        }
      ]
    };

    // Call Gemini API
    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: systemInstruction,
          contents: contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
          }
        })
      }
    );

    const result = await geminiResponse.json();

    // Handle Google API errors
    if (!geminiResponse.ok) {
      return {
        statusCode: geminiResponse.status,
        body: JSON.stringify({
          error:
            result.error?.message ||
            "Gemini API request failed."
        })
      };
    }

    // Extract generated answer
    const answer =
      result.candidates?.[0]?.content?.parts
        ?.map(function(part) {
          return part.text || "";
        })
        .join("")
        .trim();

    if (!answer) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Gemini returned an empty answer."
        })
      };
    }

    // Send answer back to website
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        answer: answer
      })
    };

  } catch (error) {

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Server error."
      })
    };

  }

};
