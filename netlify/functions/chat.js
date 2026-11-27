exports.handler = async function (event) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: "Please use POST method."
      })
    };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("Gemini API key is missing.");
    }

    const data = JSON.parse(event.body || "{}");
    const message = data.message || data.question;

    if (!message || !message.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Please enter a question."
        })
      };
    }

    const systemPrompt = `
You are Jeevan AI, a helpful Computer Science tutor.

Your job is to answer ANY question the user asks.

Topics include:
- Computer Science
- ADA (Analysis and Design of Algorithms)
- Data Structures
- Java, Python, C, C++
- HTML, CSS, JavaScript
- DBMS and SQL
- Machine Learning
- Artificial Intelligence
- Android Development
- Operating Systems
- Computer Networks
- Software Engineering
- Mathematics
- Programming
- General knowledge

RULES:

1. Answer the user's actual question directly.
2. Use simple, easy-to-understand English.
3. For definitions, provide a clear definition first.
4. For exam questions, use headings and easy points.
5. When the user asks for a program, provide complete working code.
6. Explain code simply after providing it.
7. For differences, use a table when appropriate.
8. For algorithms, explain steps and provide an example.
9. For programming questions, identify the programming language if specified.
10. Never respond that you only answer portfolio questions.
11. Do not give fixed FAQ answers.
12. Generate a fresh answer based on every user question.

You are a friendly tutor helping students learn.
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: systemPrompt
              }
            ]
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: message
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
          }
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error:
            result.error?.message ||
            "Gemini API request failed."
        })
      };
    }

    const answer =
      result.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("");

    if (!answer) {
      throw new Error("Gemini returned an empty answer.");
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        answer: answer
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || "Something went wrong."
      })
    };
  }
};
