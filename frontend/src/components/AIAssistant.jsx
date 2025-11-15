import React, { useState, useRef, useEffect } from "react";
import { PaperAirplaneIcon, MapPinIcon } from "@heroicons/react/24/outline";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I'm your Fever Assistant. I can help you understand fever symptoms, medication awareness, vital signs, precautions, and when to see a doctor. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Request user location on mount
  useEffect(() => {
    requestLocation();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationError(null);
        },
        (error) => {
          console.log("Location access denied or unavailable:", error);
          setLocationError("Location access denied. You can still ask for hospitals by providing your city name.");
        }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser.");
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    // Add user message
    const userMessage = {
      role: "user",
      content: trimmedInput,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Prepare request body with full conversation history
      const requestBody = {
        messages: [...messages, userMessage].map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      };

      // Add location if available and user is asking for hospitals
      const isHospitalQuery = 
        trimmedInput.toLowerCase().includes("hospital") || 
        trimmedInput.toLowerCase().includes("nearest") || 
        trimmedInput.toLowerCase().includes("near me") ||
        trimmedInput.toLowerCase().includes("caregiver") ||
        trimmedInput.toLowerCase().includes("emergency room");

      if (isHospitalQuery && userLocation) {
        requestBody.location = userLocation;
      }

      const response = await fetch(`${API_BASE_URL}/api/assistant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      const assistantMessage = {
        role: "assistant",
        content: data.reply || "Sorry, I'm unable to process that right now.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = {
        role: "assistant",
        content: "Sorry, I'm unable to process that right now. Please try again later.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format message content with markdown-like formatting
  const formatMessageContent = (content) => {
    // Convert **bold** to <strong>
    let formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Convert [link text](url) to <a> tags
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary-600 underline hover:text-primary-700">$1</a>');
    // Convert numbered lists
    formatted = formatted.replace(/^(\d+)\.\s+(.+)$/gm, '<div class="ml-4"><span class="font-semibold">$1.</span> $2</div>');
    // Convert bullet points
    formatted = formatted.replace(/^[-•]\s+(.+)$/gm, '<div class="ml-4">• $1</div>');
    return formatted;
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Fever Assistant</h1>
        <p className="text-gray-600 mb-3">
          Ask questions about fever symptoms, medications, vital signs, precautions, and when to seek medical care.
        </p>
        
        {/* Location Status */}
        <div className="flex items-center gap-2 text-sm">
          {userLocation ? (
            <div className="flex items-center gap-2 text-green-600">
              <MapPinIcon className="w-4 h-4" />
              <span>Location enabled - I can find hospitals near you</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-500">
              <MapPinIcon className="w-4 h-4" />
              <span>
                {locationError || "Location not available. You can still ask for hospitals by providing your city name."}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex flex-col" style={{ height: "calc(100vh - 300px)", minHeight: "600px" }}>
        {/* Messages Area */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white"
          style={{ scrollBehavior: "smooth" }}
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                  message.role === "user"
                    ? "bg-primary-600 text-white"
                    : "bg-white text-gray-900 border border-gray-200"
                }`}
              >
                <div 
                  className={`text-sm leading-relaxed whitespace-pre-wrap ${
                    message.role === "user" ? "text-white" : "text-gray-900"
                  }`}
                  dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
                />
                <p
                  className={`text-xs mt-1.5 ${
                    message.role === "user" ? "text-primary-100" : "text-gray-400"
                  }`}
                >
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">AI is thinking...</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <form onSubmit={handleSend} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your fever symptoms, medications, vital signs..."
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2 text-center">
            This assistant provides educational information only. Consult a healthcare professional for medical advice.
          </p>
        </div>
      </div>
    </div>
  );
}
