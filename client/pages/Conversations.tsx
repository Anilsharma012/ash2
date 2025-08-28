import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  MessageSquare,
  Search,
  MoreVertical,
  Phone,
  User,
  MapPin,
  Image as ImageIcon,
} from "lucide-react";
import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { useAuth } from "../hooks/useAuth";
import { createApiUrl } from "../lib/api";

interface ConversationMessage {
  _id: string;
  senderId: string;
  senderName: string;
  senderType: "buyer" | "seller" | "agent" | "admin";
  message: string;
  imageUrl?: string;
  messageType: "text" | "image";
  createdAt: string;
}

interface Conversation {
  _id: string;
  propertyId: string;
  participants: string[];
  createdAt: string;
  lastMessageAt: string;
  property: {
    _id: string;
    title: string;
    price: number;
    location: { address: string };
    images: string[];
  };
  participantDetails: Array<{
    _id: string;
    name: string;
    userType: string;
  }>;
  lastMessage: ConversationMessage;
  unreadCount: number;
}

export default function Conversations() {
  const [searchParams] = useSearchParams();
  const { user, token, isAuthenticated } = useAuth();
  const conversationId = searchParams.get("id");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find((c) => c._id === conversationId);
      if (conv) {
        setSelectedConversation(conv);
      }
    }
  }, [conversationId, conversations]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation._id);
      // Start polling for new messages every 5 seconds
      const interval = setInterval(
        () => fetchMessages(selectedConversation._id),
        5000,
      );
      setPollInterval(interval);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await fetch(createApiUrl("conversations/my"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConversations(data.data);
        } else {
          setError(data.error || "Failed to load conversations");
        }
      } else {
        setError("Failed to load conversations");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    if (!token) return;

    try {
      const response = await fetch(
        createApiUrl(`conversations/${convId}/messages`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessages(data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending || !token)
      return;

    try {
      setSending(true);
      const response = await fetch(
        createApiUrl(`conversations/${selectedConversation._id}/messages`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: newMessage }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessages((prev) => [...prev, data.data]);
          setNewMessage("");
          // Refresh conversations to update last message
          fetchConversations();
        } else {
          setError(data.error || "Failed to send message");
        }
      } else {
        setError("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    window.history.pushState({}, "", `/conversations?id=${conversation._id}`);
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    window.history.pushState({}, "", "/conversations");
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const filteredConversations = conversations.filter((conversation) => {
    const property = conversation.property;
    const otherParticipants = conversation.participantDetails.filter(
      (p) => p._id !== user?.id,
    );

    return (
      property?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      otherParticipants.some((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ) ||
      conversation.lastMessage?.message
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              Please login to access your conversations
            </p>
            <Button
              onClick={() => (window.location.href = "/login")}
              className="bg-[#C70000] hover:bg-[#A60000]"
            >
              Login
            </Button>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[#C70000] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading conversations...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  // Individual conversation view
  if (selectedConversation) {
    const otherParticipants = selectedConversation.participantDetails.filter(
      (p) => p._id !== user?.id,
    );
    const property = selectedConversation.property;

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Conversation Header */}
        <header className="bg-white border-b px-4 py-3 flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToList}
            className="p-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">
              {otherParticipants.map((p) => p.name).join(", ")}
            </h1>
            <p className="text-sm text-gray-600 truncate">{property?.title}</p>
          </div>
        </header>

        {/* Property Card */}
        {property && (
          <div className="bg-white border-b p-4">
            <div className="flex items-start space-x-3">
              {property.images?.[0] && (
                <img
                  src={property.images[0]}
                  alt={property.title}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {property.title}
                </h3>
                <p className="text-lg font-semibold text-[#C70000]">
                  ₹{property.price?.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {property.location?.address}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No messages yet</p>
              <p className="text-sm text-gray-500">Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message._id}
                className={`flex ${
                  message.senderId === user?.id
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.senderId === user?.id
                      ? "bg-[#C70000] text-white"
                      : message.senderType === "admin"
                        ? "bg-blue-100 text-blue-900"
                        : "bg-white border border-gray-200"
                  }`}
                >
                  {message.senderId !== user?.id && (
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">
                        {message.senderName}
                      </span>
                      {message.senderType === "admin" && (
                        <Badge variant="secondary" className="text-xs">
                          Support
                        </Badge>
                      )}
                    </div>
                  )}
                  {message.imageUrl ? (
                    <img
                      src={message.imageUrl}
                      alt="Sent image"
                      className="max-w-full h-auto rounded"
                    />
                  ) : (
                    <p className="text-sm">{message.message}</p>
                  )}
                  <p className="text-xs opacity-75 mt-1">
                    {formatMessageTime(message.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
          <div className="flex space-x-2 max-w-full">
            <Textarea
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 resize-none"
              rows={2}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="bg-[#C70000] hover:bg-[#A60000] px-4"
            >
              {sending ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Conversations list view
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="bg-white border-b p-4">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Messages</h1>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 pb-20">
        {error && (
          <div className="p-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {filteredConversations.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No conversations yet
            </h3>
            <p className="text-gray-600 mb-4">
              Start chatting with property owners by visiting property listings.
            </p>
            <Button
              onClick={() => (window.location.href = "/")}
              className="bg-[#C70000] hover:bg-[#A60000]"
            >
              Browse Properties
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredConversations.map((conversation) => {
              const otherParticipants = conversation.participantDetails.filter(
                (p) => p._id !== user?.id,
              );
              const property = conversation.property;

              return (
                <div
                  key={conversation._id}
                  onClick={() => handleConversationSelect(conversation)}
                  className="bg-white border-b p-4 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-start space-x-3">
                    <div className="relative">
                      {property?.images?.[0] ? (
                        <img
                          src={property.images[0]}
                          alt={property.title}
                          className="w-12 h-12 object-cover rounded-full"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      {conversation.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#C70000] rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {conversation.unreadCount > 9
                              ? "9+"
                              : conversation.unreadCount}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">
                          {otherParticipants.map((p) => p.name).join(", ")}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {formatTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {property?.title}
                      </p>
                      <p
                        className={`text-sm truncate ${
                          conversation.unreadCount > 0
                            ? "text-gray-900 font-medium"
                            : "text-gray-500"
                        }`}
                      >
                        {conversation.lastMessage?.message || "No messages yet"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
