import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. AI features will fallback to offline mock responses.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 1. Parse raw/voice input into structured tasks
app.post("/api/tasks/parse", async (req, res) => {
  const { text, currentTime } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Text prompt is required" });
  }

  const prompt = `Analyze this user's typed or spoken instruction: "${text}".
Current Local Time is: ${currentTime}.
Extract and generate an array of one or more structured tasks that the user wants to accomplish.
Return ONLY a valid JSON object matching the requested schema.`;

  try {
    const ai = getGemini();
    if (process.env.GEMINI_API_KEY) {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert NLP parser for Orderly AI. Extract multiple tasks with complete detail. Map relative descriptions like 'tomorrow at 8pm' to absolute YYYY-MM-DD values based on the Current Local Time.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Short, descriptive task name" },
                    deadline: { type: Type.STRING, description: "YYYY-MM-DD format. Infer from relative text based on current time." },
                    exactTime: { type: Type.STRING, description: "HH:MM format in 24hr time (e.g. '20:00'). Defaults to '12:00' if unspecified." },
                    alarmTime: { 
                      type: Type.STRING, 
                      description: "ISO date-time string (YYYY-MM-DDTHH:MM:00) representing when the alarm reminder should trigger (e.g., 'today at 6pm' becomes '2026-06-30T18:00:00'). If a alarm time can be calculated, set it. Otherwise, return null." 
                    }
                  },
                  required: ["name", "deadline", "exactTime"]
                }
              }
            },
            required: ["tasks"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } else {
      // Fallback offline parser for preview safety
      res.json({
        tasks: [
          {
            name: text.substring(0, 40) || "New Voice Task",
            deadline: currentTime.split("T")[0],
            exactTime: "18:00",
            alarmTime: null
          }
        ]
      });
    }
  } catch (error: any) {
    console.error("Parse Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Break down single task and detect priority
app.post("/api/tasks/breakdown", async (req, res) => {
  const { name, deadline, exactTime, currentTime } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Task name is required" });
  }

  const prompt = `Task Name: "${name}"
Deadline Date: "${deadline}"
Exact Time: "${exactTime}"
Current Local Time is: ${currentTime}

Analyze this task and break it down into very small, bite-sized actionable steps (maximum 5-6 steps).
The steps MUST be highly specific to the given task name (e.g. for a Meeting, steps should be 'Review agenda', 'Prepare questions', 'Open meeting link', etc.). 
You MUST NEVER include generic wellness or generic productivity advice like 'Drink water', 'Grab water', 'Clear browser tabs', 'Stretch your body', 'Clear your mind', or 'Check your microphone' unless the task name is explicitly about wellness or coaching.

Determine the overall priority ('low', 'medium', 'high', 'urgent') based on how much effort is required and how close the deadline is relative to the current time.
Provide a concise, sassy, supportive, but motivational introductory 'aiNote' designed to kick procrastination.`;

  try {
    const ai = getGemini();
    if (process.env.GEMINI_API_KEY) {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are the Orderly AI coach. Be slightly cheeky, motivational, highly proactive, and direct. Break down tasks into highly specific, realistic action units. Never output generic wellness advice (like drinking water, body stretching, clearing browser tabs) unless explicitly relevant to the task.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              priority: { type: Type.STRING, description: "Must be 'low', 'medium', 'high', or 'urgent'." },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING, description: "A very clear, single actionable step starting with a verb." }
                  },
                  required: ["text"]
                }
              },
              aiNote: { type: Type.STRING, description: "Cheeky, proactive, sassy motivational quote or kick-start nudge tailored to this task." }
            },
            required: ["priority", "steps", "aiNote"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } else {
      // Mock Fallback
      res.json({
        priority: "medium",
        steps: [
          { text: "Clarify the first sub-goal" },
          { text: "Prepare materials and workspace" },
          { text: "Spend exactly 10 minutes focused" }
        ],
        aiNote: "API Key offline. I'm pretending this task is a piece of cake. Now go get it done!"
      });
    }
  } catch (error: any) {
    console.error("Breakdown Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Adaptive AI Behavior (user ignoring a task)
app.post("/api/tasks/adapt", async (req, res) => {
  const { task, currentTime } = req.body;
  if (!task) {
    return res.status(400).json({ error: "Task is required" });
  }

  const prompt = `The user has ignored or snoozed this task ${task.ignoredCount} times.
Task Name: "${task.name}"
Priority was: "${task.priority}"
Deadline: "${task.deadline} at ${task.exactTime}"
Current Local Time is: ${currentTime}

Formulate an intervention strategy. Since the user is procrastinating, we need to alter our strategy.
Suggest whether we should activate 'quickStartMode' (breaking down the task into a single 10-minute micro-sprint focusing ONLY on the first step to reduce resistance).
Increase priority if the deadline is close.
Generate a sassy, witty, highly proactive alarm or status message 'suggestedMessage' (e.g. 'Procrastination alarm! The deadline is in 2 hours. Strategy updated: Let\'s do 10 minutes of step 1 right now. No excuses!') and a detailed 'aiNote'.`;

  try {
    const ai = getGemini();
    if (process.env.GEMINI_API_KEY) {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are the Orderly AI crisis intervention unit. When the user procrastinates or snoozes, respond with witty sarcasm combined with high psychological support. Make the task feel incredibly easy to start.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              priority: { type: Type.STRING, description: "Low, medium, high, or urgent (usually upgrade priority if ignored or close to deadline)." },
              quickStartMode: { type: Type.BOOLEAN, description: "True if the user should do a 10-minute micro-focus to get unstuck." },
              aiNote: { type: Type.STRING, description: "Detailed strategy change note, talking about the 10-minute sprint or simplified entry." },
              suggestedMessage: { type: Type.STRING, description: "High-impact, cheeky notification/alert message to pop up." }
            },
            required: ["priority", "quickStartMode", "aiNote", "suggestedMessage"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } else {
      res.json({
        priority: "urgent",
        quickStartMode: true,
        aiNote: "Crisis Mode! API Key offline, but we've downgraded this task to a 10-minute sprint to bypass your procrastination shield.",
        suggestedMessage: "Delay detected! Switching strategy: let's focus on step 1 for just 10 minutes."
      });
    }
  } catch (error: any) {
    console.error("Adapt Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Daily AI Review (Completed vs Delayed vs Pending)
app.post("/api/review", async (req, res) => {
  const { tasks, currentTime } = req.body;
  if (!tasks || !Array.isArray(tasks)) {
    return res.status(400).json({ error: "Tasks array is required" });
  }

  const prompt = `Current time is: ${currentTime}.
Tasks list:
${JSON.stringify(tasks, null, 2)}

Analyze the user's productivity for the day.
Summarize:
- Completed tasks
- Delayed/overdue tasks (deadline passed but not completed)
- Pending tasks

Write a personalized, highly motivational, witty, slightly sassy 'critique' praising their wins and humorously poking them for delays.
Also, generate a sequence of 3 to 5 clear, actionable focus items or a schedule for tomorrow in 'planTomorrow'.`;

  try {
    const ai = getGemini();
    if (process.env.GEMINI_API_KEY) {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are the head coach of Orderly AI. Conduct a high-energy, witty, sassy end-of-day daily review. Make them laugh, feel proud, or feel the urge to step up tomorrow.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              critique: { type: Type.STRING, description: "Witty, slightly sassy critique of today's progress. Use playful sarcasm or high motivation." },
              planTomorrow: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Sequential bullet points of tomorrow's actionable plan."
              }
            },
            required: ["critique", "planTomorrow"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } else {
      res.json({
        critique: "Offline Mode: Today was... a day in time! Setup your Gemini API Key in the Secrets tab to get customized sassy roasts and stellar praise from the companion.",
        planTomorrow: [
          "Defeat procrastination early",
          "Tackle the highest priority item first thing in the morning",
          "Take regular 5-minute hydration breaks"
        ]
      });
    }
  } catch (error: any) {
    console.error("Review Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Mount Vite middleware or serve built app
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
