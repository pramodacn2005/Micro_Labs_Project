import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
  PaperAirplaneIcon, 
  MapPinIcon, 
  TrashIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ChatBubbleLeftRightIcon,
  BeakerIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";

// Get API base URL - ensure it includes /api
function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL;
  if (envUrl) {
    // If env URL already ends with /api, use it as is
    return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/$/, '')}/api`;
  }
  // Default to port 4000 with /api
  return 'http://localhost:4000/api';
}

const API_BASE_URL = getApiBaseUrl();

// No initial message - chat starts empty
const INITIAL_MESSAGE = null;

const SUGGESTED_QUESTIONS = [
  "What should I do if I have a fever?",
  "How do I check my blood pressure?",
  "What are signs of dehydration?",
  "When should I see a doctor?",
  "How can I stay healthy?",
];

export default function AIAssistant() {
  const { userData, user } = useAuth();
  const feverAnalysis = userData?.feverAnalysis;
  const hasFeverAnalysis = useMemo(
    () => !!(feverAnalysis && Object.keys(feverAnalysis).length > 0),
    [feverAnalysis]
  );
  // Load chat history from localStorage
  const loadChatHistory = () => {
    try {
      const saved = localStorage.getItem('medibot_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        return parsed.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
    // Start with empty chat - no initial message
    return [];
  };

  const [messages, setMessages] = useState(loadChatHistory);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Request user location on mount
  useEffect(() => {
    requestLocation();
  }, []);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem('medibot_history', JSON.stringify(messages));
      } catch (error) {
        console.error('Error saving chat history:', error);
      }
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

      if (hasFeverAnalysis && user?.uid) {
        requestBody.feverAnalysis = {
          ...feverAnalysis,
          userId: user.uid,
        };
      } else if (user?.uid) {
        requestBody.feverAnalysis = { userId: user.uid };
      }

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

      console.log('[AIAssistant] Calling API:', `${API_BASE_URL}/assistant`);
      console.log('[AIAssistant] Sending request to backend API...');
      const response = await fetch(`${API_BASE_URL}/assistant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[AIAssistant] Response status:', response.status);

      if (!response.ok) {
        let errorText;
        try {
          const errorData = await response.json();
          errorText = errorData.reply || errorData.error || response.statusText;
          console.error('[AIAssistant] Response error:', errorData);
        } catch (e) {
          errorText = await response.text();
          console.error('[AIAssistant] Response error (text):', errorText);
        }
        throw new Error(errorText || `Failed to get response: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[AIAssistant] Received data from API:', { 
        hasReply: !!data.reply, 
        replyLength: data.reply?.length || 0,
        hasError: !!data.error
      });
      
      // If there's an error in the response, use the reply field if available, otherwise throw
      if (data.error && !data.reply) {
        throw new Error(data.error);
      }
      
      // Use reply field if available, otherwise use error message
      if (!data.reply) {
        if (data.error) {
          throw new Error(data.error);
        }
        throw new Error("No reply received from AI assistant");
      }
      
      const assistantMessage = {
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      };
      console.log('[AIAssistant] Adding assistant message to chat');
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        apiUrl: `${API_BASE_URL}/assistant`
      });
      
      let errorContent = "Sorry, I'm unable to process that right now. ";
      if (error.message === "Failed to fetch") {
        errorContent += "Please make sure the backend server is running on http://localhost:4000";
      } else {
        errorContent += error.message || "Please check your connection and try again later.";
      }
      
      const errorMessage = {
        role: "assistant",
        content: errorContent,
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

  const clearChat = () => {
    if (window.confirm("Are you sure you want to clear the chat history?")) {
      setMessages([]);
      localStorage.removeItem('medibot_history');
      inputRef.current?.focus();
    }
  };

  const copyToClipboard = async (text, messageId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleSuggestedQuestion = (question) => {
    setInput(question);
    inputRef.current?.focus();
    // Auto-submit after a short delay
    setTimeout(() => {
      const event = new Event('submit', { bubbles: true, cancelable: true });
      const form = inputRef.current?.closest('form');
      if (form) {
        form.dispatchEvent(event);
      }
    }, 100);
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
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
              <ChatBubbleLeftRightIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Medibot</h1>
              <p className="text-sm text-gray-500">Simple medical assistant</p>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Clear chat history"
          >
            <TrashIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        </div>
        <p className="text-gray-600 mb-3">
          Ask me any health question and I'll help you with simple, clear answers.
        </p>
        
        {/* Location Status */}
        <div className="flex items-center gap-2 text-sm flex-wrap">
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
          {hasFeverAnalysis && (
            <div className="flex items-center gap-2 text-indigo-600 text-xs font-medium bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              <BeakerIcon className="w-4 h-4" />
              <span>
                Fever analysis shared with Medibot
                {feverAnalysis.savedAt && (
                  <> ({new Date(feverAnalysis.savedAt).toLocaleString()})</>
                )}
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
          {messages.map((message, index) => {
            const messageId = `msg-${index}-${message.timestamp.getTime()}`;
            const isCopied = copiedMessageId === messageId;
            return (
            <div
                key={messageId}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} group`}
            >
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm relative ${
                  message.role === "user"
                    ? "bg-primary-600 text-white"
                    : "bg-white text-gray-900 border border-gray-200"
                }`}>
                <div 
                  className={`text-sm leading-relaxed whitespace-pre-wrap ${
                    message.role === "user" ? "text-white" : "text-gray-900"
                  }`}
                  dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
                />
                  <div className="flex items-center justify-between mt-2">
                <p
                      className={`text-xs ${
                    message.role === "user" ? "text-primary-100" : "text-gray-400"
                  }`}
                >
                  {formatTime(message.timestamp)}
                </p>
                    <button
                      onClick={() => copyToClipboard(message.content, messageId)}
                      className={`ml-3 opacity-0 group-hover:opacity-100 transition-opacity ${
                        message.role === "user" ? "text-primary-100 hover:text-white" : "text-gray-400 hover:text-gray-600"
                      }`}
                      title="Copy message"
                    >
                      {isCopied ? (
                        <CheckIcon className="w-4 h-4" />
                      ) : (
                        <ClipboardDocumentIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

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

        {/* Suggested Questions (show only when no user messages) */}
        {messages.filter(m => m.role === "user").length === 0 && (
          <div className="border-t border-gray-200 bg-gray-50 p-4">
            <p className="text-xs text-gray-500 mb-2 font-medium">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 text-gray-700 hover:text-primary-700 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <form onSubmit={handleSend} className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your health, symptoms, medications, vital signs..."
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
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
