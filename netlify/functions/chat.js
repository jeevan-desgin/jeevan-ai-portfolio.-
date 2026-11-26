netlify/functions/chat.js

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Only POST requests are allowed." })
    };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Gemini API key is missing. Add GEMINI_API_KEY in Netlify environment variables."
        })
      };
    }

    const body = JSON.parse(event.body || "{}");
    const messages = body.messages || [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Please send a message." })
      };
    }

    const contents = messages.slice(-12).map(function(message) {
      return {
        role: message.role === "assistant" ? "model" : "user",
        parts: [{
          text: String(message.text || "").slice(0, 4000)
        }]
      };
    });

    const systemPrompt = `
You are the friendly AI assistant on Jeevan G T's personal portfolio website.

Portfolio information:
Name: Jeevan G T
Degree: BSc student
College: Adichunchanagiri University
Graduation year: 2027
CGPA: 8.47

Skills:
HTML, CSS, JavaScript, Java, Python, C, SQL,
DBMS, MS Excel, Web Development and Machine Learning basics.

Projects:
1. Hospital Management System
2. Personal Portfolio Website
3. Student Pass Prediction System

Email: jeevangt99@email.com

Answer questions about Jeevan accurately using the above information.
Do not invent experience, awards, skills, marks, or personal details.
You are also a helpful general AI assistant and can answer other questions.
Use clear, friendly, simple language.
    `;

    const apiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: contents,
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.7
          }
        })
      }
    );

    const result = await apiResponse.json();

    if (!apiResponse.ok) {
      return {
        statusCode: apiResponse.status,
        body: JSON.stringify({
          error: result.error?.message || "Gemini API error."
        })
      };
    }

    const reply = result.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

    if (!reply) {
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: "Gemini returned an empty response. Please try again."
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ reply: reply })
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
