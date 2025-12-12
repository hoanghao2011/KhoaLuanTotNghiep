import React, { useState, useRef } from "react";
import axios from "axios";
import "./MessageInput.css";

const API_URL = "https://khoaluantotnghiep-5ff3.onrender.com/api";

const MessageInput = ({ onSendMessage, onTyping, onStopTyping }) => {
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const handleMessageChange = (e) => {
    setMessage(e.target.value);

    // Typing indicator
    if (onTyping) {
      onTyping();

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        if (onStopTyping) {
          onStopTyping();
        }
      }, 2000);
    }
  };

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage({
        messageType: "text",
        content: message.trim(),
      });
      setMessage("");

      if (onStopTyping) {
        onStopTyping();
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file ảnh!");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Kích thước ảnh không được vượt quá 5MB!");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("image", file);

      const response = await axios.post(`${API_URL}/chat/upload-image`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      onSendMessage({
        messageType: "image",
        image: response.data.filename,
      });

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Không thể tải ảnh lên. Vui lòng thử lại!");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="message-input-container">
      <button
        className="image-button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        title="Gửi ảnh"
      >
        {uploading ? "⏳" : "📷"}
      </button>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageSelect}
        accept="image/*"
        style={{ display: "none" }}
      />

      <input
        type="text"
        className="message-input"
        placeholder="Nhập tin nhắn..."
        value={message}
        onChange={handleMessageChange}
        onKeyPress={handleKeyPress}
        disabled={uploading}
      />

      <button
        className="send-button"
        onClick={handleSend}
        disabled={!message.trim() || uploading}
      >
        Gửi
      </button>
    </div>
  );
};

export default MessageInput;
