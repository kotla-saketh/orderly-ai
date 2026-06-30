import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Sparkles, Send, Keyboard, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Task } from "../types";

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface NLUInputProps {
  onTasksParsed: (parsedTasks: Array<{ name: string; deadline: string; exactTime: string; alarmTime: string | null }>) => void;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
}

export default function NLUInput({ onTasksParsed, isProcessing, setIsProcessing }: NLUInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const retryCountRef = useRef(0);
  const activeRecognitionRef = useRef<any>(null);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Your browser does not support voice input.");
      setIsListening(false);
      return;
    }

    setError(null);
    setIsListening(true);

    try {
      // Clean up previous instance if any
      if (activeRecognitionRef.current) {
        try {
          activeRecognitionRef.current.onstart = null;
          activeRecognitionRef.current.onresult = null;
          activeRecognitionRef.current.onerror = null;
          activeRecognitionRef.current.onend = null;
          activeRecognitionRef.current.stop();
        } catch (e) {}
      }

      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      rec.onresult = (event: any) => {
        if (event.results && event.results[0] && event.results[0][0]) {
          const transcript = event.results[0][0].transcript;
          setInputValue((prev) => (prev ? prev + " " + transcript : transcript));
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech Recognition Error:", e);
        const errorType = e.error;
        let errorMessage = "";

        if (errorType === "not-allowed" || errorType === "permission-denied") {
          errorMessage = "Microphone permission denied. Please allow microphone access.";
        } else if (errorType === "no-speech") {
          errorMessage = "No voice detected. Please try again.";
        } else if (errorType === "network") {
          errorMessage = "Network error occurred during speech recognition.";
        } else if (errorType === "aborted") {
          errorMessage = "Listening was canceled.";
        } else {
          errorMessage = `Speech recognition failed: ${errorType || "unknown error"}.`;
        }

        setError(errorMessage);
        setIsListening(false);

        // Auto retry once if it's not a permission or abort error and we haven't retried yet
        if (
          errorType !== "not-allowed" &&
          errorType !== "permission-denied" &&
          errorType !== "aborted" &&
          retryCountRef.current < 1
        ) {
          retryCountRef.current += 1;
          console.log("Speech recognition failed, retrying automatically (attempt 1)...");
          setTimeout(() => {
            startListening();
          }, 300);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      activeRecognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      console.error("Failed to start SpeechRecognition:", err);
      setError(`Your browser does not support voice input. Error: ${err.message || err}`);
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Your browser does not support voice input.");
      return;
    }

    if (isListening) {
      if (activeRecognitionRef.current) {
        try {
          activeRecognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
    } else {
      retryCountRef.current = 0; // reset retry counter on fresh click
      startListening();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeRecognitionRef.current) {
        try {
          activeRecognitionRef.current.onstart = null;
          activeRecognitionRef.current.onresult = null;
          activeRecognitionRef.current.onerror = null;
          activeRecognitionRef.current.onend = null;
          activeRecognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const handleParseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/tasks/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputValue,
          currentTime: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error("Failed to parse task.");
      }

      const data = await response.json();
      if (data.tasks && data.tasks.length > 0) {
        onTasksParsed(data.tasks);
        setInputValue("");
        setShowExamples(false);
      } else {
        throw new Error("Could not detect any actionable tasks. Try adding details like deadline or time.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  const applyExample = (ex: string) => {
    setInputValue(ex);
    setShowExamples(false);
  };

  const examples = [
    "Prepare slide deck tomorrow 10 PM and set reminder 2 hours before",
    "Go to the dentist Friday morning at 10:30 AM",
    "Submit physics project next Monday 8 PM, set reminder Sunday evening at 6 PM",
    "Call client today at 4:30 PM and review contract today 6 PM"
  ];

  return (
    <div id="nlu-input-container" className="bg-white border border-slate-200 rounded-3xl p-5 relative shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
          <h2 className="font-sans font-bold text-sm text-slate-800">Add Task with AI</h2>
        </div>
        <button
          onClick={() => setShowExamples(!showExamples)}
          className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors font-sans"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          {showExamples ? "Hide examples" : "Show help"}
        </button>
      </div>

      <form onSubmit={handleParseSubmit} className="space-y-3">
        {isListening && (
          <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100 self-start animate-pulse w-fit font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
            <span>Listening...</span>
          </div>
        )}
        <div className="relative flex items-center bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-slate-450 focus-within:ring-2 focus-within:ring-slate-100 transition-all duration-300">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type or speak a task (e.g., 'Submit project tomorrow 8 PM with reminder today 6 PM')"
            rows={2}
            className="flex-1 bg-transparent border-0 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none pr-24 leading-relaxed font-sans"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleParseSubmit(e);
              }
            }}
          />

          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            {/* Microphone trigger */}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-xl transition-all relative ${
                isListening
                  ? "bg-rose-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.7)] border-transparent animate-pulse"
                  : "bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200"
              }`}
              title={isListening ? "Listening... Click to stop" : "Use Voice Input"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Submit */}
            <button
              type="submit"
              disabled={!inputValue.trim() || isProcessing}
              className="p-2 bg-black hover:bg-slate-800 disabled:bg-slate-100 text-white rounded-xl transition-all border border-transparent shadow-sm disabled:text-slate-400 disabled:border-transparent flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="text-xs text-rose-600 font-sans bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
            {error}
          </div>
        )}

        <AnimatePresence>
          {showExamples && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden space-y-2 pt-2 border-t border-slate-100"
            >
              <p className="text-xs text-slate-500 font-medium">Click an example to try it out:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {examples.map((ex, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => applyExample(ex)}
                    className="text-left text-xs bg-slate-50 hover:bg-slate-100 hover:text-indigo-600 text-slate-600 p-2.5 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all font-sans line-clamp-2"
                  >
                    "{ex}"
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
