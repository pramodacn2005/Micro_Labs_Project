import React, { useState } from "react";
import PropTypes from "prop-types";
import { sendAssistantMessage } from "../services/feverCheckService";

const disclaimer =
  "This service provides AI-driven symptom checking and is not a substitute for professional medical advice. In emergencies call local emergency services.";

export default function AssistantChatModal({ isOpen, onClose, sessionId, context }) {
  const [messages, setMessages] = useState(() => [
    {
      role: "assistant",
      content: "Hi! I can share precautions, tablets (example ranges), diet tips, or nearby hospitals.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!input.trim()) return;
    setError("");
    const userMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);
    try {
      const response = await sendAssistantMessage(sessionId, userMessage.content);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.reply,
        },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const onKeyPress = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/70 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl flex flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
            <p className="text-sm text-gray-500">
              Severity: {context?.prediction?.severity || "Unknown"} | Probability:{" "}
              {Math.round((context?.prediction?.probability || 0) * 100)}%
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600 hover:bg-gray-200"
          >
            Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {messages.map((message, idx) => (
            <div
              key={`${message.role}-${idx}`}
              className={`rounded-2xl px-4 py-2 text-sm ${
                message.role === "assistant"
                  ? "bg-primary-50 text-primary-900 self-start"
                  : "bg-gray-100 text-gray-900 self-end"
              }`}
            >
              {message.content}
            </div>
          ))}
        </div>

        {error && <div className="px-6 text-sm text-red-600">{error}</div>}

        <footer className="border-t border-gray-200 px-6 py-4 space-y-2">
          <textarea
            rows={2}
            placeholder="Ask for precautions, tablets, diet, or hospitals..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyPress}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 max-w-sm">{disclaimer}</p>
            <button
              onClick={handleSend}
              disabled={isSending}
              className="rounded-full bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 disabled:opacity-50"
            >
              {isSending ? "Sending..." : "Send"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

AssistantChatModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  sessionId: PropTypes.string,
  context: PropTypes.shape({
    prediction: PropTypes.shape({
      severity: PropTypes.string,
      probability: PropTypes.number,
    }),
  }),
};









