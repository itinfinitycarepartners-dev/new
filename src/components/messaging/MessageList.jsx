


// @ts-nocheck
// src/components/messaging/MessageList.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { messaging, websocket, tokenStorage } from '@/api/icpClient';

// Helper to convert File to Base64
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = error => reject(error);
});

export default function MessageList() {
  const { conversationId } = useParams();
  const isCommunityConversation =
    conversationId ===
    "community";
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [conversation, setConversation] = useState(null);
  
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [sendingNewMessage, setSendingNewMessage] = useState(false);
  const [postError, setPostError] = useState("");

  // Image Upload State
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);


  const getCurrentUserEmail = useCallback(() => {
    const stored = localStorage.getItem("user");
    if (stored) { try { const parsed = JSON.parse(stored); if (parsed?.email) return String(parsed.email).toLowerCase(); } catch {} }
    const direct = localStorage.getItem("userEmail");
    if (direct) return String(direct).toLowerCase();
    return "";
  }, []);

  // Get user name from localStorage or use email
  const getUserName = useCallback(() => {
    const storedName = localStorage.getItem('userName');
    if (storedName) return String(storedName).trim().split(/\s+/)[0];
    
    const token = tokenStorage.get();
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length > 1) {
          const payload = JSON.parse(atob(parts[1]));
          return String(payload.firstName || payload.First_Name || payload.name || payload.email?.split('@')[0] || 'User').trim().split(/\s+/)[0];
        }
      } catch (e) {
        return token.split('@')[0] || 'User';
      }
    }
    return 'User';
  }, []);

  // Safe and smart scroll logic that won't move the entire page
  const scrollToBottom = useCallback((force = false) => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      
      // Check if user is near the bottom (within 200px)
      const isNearBottom = 
        container.scrollHeight - container.scrollTop - container.clientHeight < 200;
      
      if (force || isNearBottom) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, []);

  const loadMessages = useCallback(async (loadMore = false) => {
    if (!conversationId) return;
    
    try {
      setLoading(true);
      const params = { limit: 50 };
      if (loadMore && messages.length > 0) {
        params.before = messages[0]?.createdAt;
      }

      const response = await messaging.getMessages(
        conversationId,
        params.limit,
        params.before
      );
      
      if (response.success) {
        let newMessages = response.messages || [];
        
        if (loadMore) {
          // If loading more, preserve the scroll position relative to the top
          const container = messagesContainerRef.current;
          const previousScrollHeight = container?.scrollHeight || 0;
          
          setMessages(prev => [...newMessages, ...prev]);
          
          // Adjust scroll after render so we don't jump to the top
          setTimeout(() => {
            if (container) {
              const newScrollHeight = container.scrollHeight;
              container.scrollTop = newScrollHeight - previousScrollHeight;
            }
          }, 0);
        } else {
          setMessages(newMessages);
          // Force scroll to bottom on initial load
          setTimeout(() => scrollToBottom(true), 100);
        }
        setHasMore(response.hasMore || false);
      }
    } catch (error) {
      console.error('Load messages error:', error);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [conversationId, messages, scrollToBottom]);

  const loadConversation = useCallback(async () => {
    if (!conversationId) return;
    
    try {
      const response = await messaging.getConversations(1);
      if (response.success) {
        const found = response.conversations?.find((c) => c._id === conversationId);
        if (found) {
          setConversation(found);
        }
      }
    } catch (error) {
      console.error('Load conversation error:', error);
    }
  }, [conversationId]);

  const markConversationAsRead = useCallback(async () => {
    if (!conversationId) return;
    
    try {
      const response = await messaging.markAsRead(conversationId);
      if (response.success) {
        setConversation(prev => prev ? { ...prev, unreadCount: 0 } : prev);
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [conversationId]);

  // Handle Image Selection
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }
      
      // Limit to 5MB
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }

      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setTimeout(() => scrollToBottom(true), 100); // Scroll down to see the preview
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  // Send a new top-level message (handles image & text)
  const handleSendNewMessage = async () => {
    const text =
      newMessageContent.trim();

    if (
      !text &&
      !selectedImage
    ) {
      return;
    }

    if (!conversationId) {
      return;
    }

    if (sendingNewMessage) {
      return;
    }

    setSendingNewMessage(true);
    setPostError("");

    try {
      const userName =
        getUserName();

      if (isCommunityConversation) {
        if (!text) {
          throw new Error(
            "Enter a message before posting to Community."
          );
        }

        const response =
          await messaging.sendUserBroadcast(
            text
          );

        if (
          !response ||
          response.success !== true
        ) {
          throw new Error(
            response?.error ||
            response?.message ||
            "The community post could not be sent."
          );
        }

        const posted =
          response.message || {
            _id:
              Date.now().toString(),
            conversationId:
              "community",
            senderEmail:
              getCurrentUserEmail(),
            senderName:
              userName,
            content:
              text,
            messageType:
              "text",
            broadcast:
              true,
            createdAt:
              new Date().toISOString()
          };

        setMessages(previous => {
          const id =
            String(
              posted._id ||
              ""
            );

          if (
            id &&
            previous.some(
              item =>
                String(item._id) ===
                id
            )
          ) {
            return previous;
          }

          return [
            ...previous,
            {
              ...posted,
              conversationId:
                "community",
              broadcast:
                true
            }
          ];
        });

        setNewMessageContent("");
        clearSelectedImage();

        window.dispatchEvent(
          new CustomEvent(
            "messaging-updated",
            {
              detail: {
                conversationId:
                  "community",
                type:
                  "broadcast"
              }
            }
          )
        );

        setTimeout(
          () =>
            scrollToBottom(true),
          100
        );

        return;
      }

      const finalReplyTo =
        replyingTo
          ? replyingTo._id
          : null;

      if (selectedImage) {
        const base64Image =
          await fileToBase64(
            selectedImage
          );

        const imageResponse =
          await messaging.sendMessage(
            conversationId,
            base64Image,
            "image",
            finalReplyTo
          );

        if (
          !imageResponse?.success
        ) {
          throw new Error(
            imageResponse?.error ||
            imageResponse?.message ||
            "The image could not be sent."
          );
        }

        setMessages(previous => [
          ...previous,
          {
            ...imageResponse.message,
            _id:
              imageResponse.message?._id ||
              `${Date.now()}_img`,
            createdAt:
              imageResponse.message?.createdAt ||
              new Date().toISOString(),
            senderEmail:
              getCurrentUserEmail(),
            senderName:
              userName,
            content:
              base64Image,
            messageType:
              "image",
            replyTo:
              finalReplyTo,
            replies: []
          }
        ]);
      }

      if (text) {
        const textResponse =
          await messaging.sendMessage(
            conversationId,
            text,
            "text",
            finalReplyTo
          );

        if (
          !textResponse?.success
        ) {
          throw new Error(
            textResponse?.error ||
            textResponse?.message ||
            "The message could not be sent."
          );
        }

        setMessages(previous => [
          ...previous,
          {
            ...textResponse.message,
            _id:
              textResponse.message?._id ||
              `${Date.now()}_txt`,
            createdAt:
              textResponse.message?.createdAt ||
              new Date().toISOString(),
            senderEmail:
              getCurrentUserEmail(),
            senderName:
              userName,
            content:
              text,
            messageType:
              "text",
            replyTo:
              finalReplyTo,
            replies: []
          }
        ]);
      }

      setNewMessageContent("");
      clearSelectedImage();

      if (replyingTo) {
        setReplyingTo(null);
      }

      setTimeout(
        () =>
          scrollToBottom(true),
        100
      );
    } catch (error) {
      console.error(
        "Error sending message:",
        error
      );

      setPostError(
        error?.message ||
        "The message could not be sent."
      );
    } finally {
      setSendingNewMessage(false);
    }
  };

  // Send a reply to a specific message (inline mode)
  const handleSendReply = async () => {
    if ((!replyContent.trim() && !selectedImage) || !conversationId || !replyingTo) return;
    
    setSendingReply(true);
    try {
      const userName = getUserName();

      // 1. Send image reply if attached
      if (selectedImage) {
        const base64Image = await fileToBase64(selectedImage);
        const imageResponse = await messaging.sendMessage(
          conversationId,
          base64Image,
          'image',
          replyingTo._id
        );
        
        if (imageResponse.success) {
          const newImageMsg = {
             ...imageResponse.message,
             _id: imageResponse.message._id || Date.now().toString() + '_img',
             createdAt: new Date().toISOString(),
             senderEmail: tokenStorage.get(),
             senderName: userName,
             content: base64Image,
             messageType: 'image',
             replyTo: replyingTo._id,
             replies: []
          };
          setMessages(prev => [...prev, newImageMsg]);
        }
     }

      // 2. Send text reply if attached
      if (replyContent.trim()) {
        const textResponse = await messaging.sendMessage(
          conversationId,
          replyContent.trim(),
          'text',
          replyingTo._id
        );
        
        if (textResponse.success) {
          const newTextMsg = {
            ...textResponse.message,
            _id: textResponse.message._id || Date.now().toString() + '_txt',
            createdAt: new Date().toISOString(),
            senderEmail: tokenStorage.get(),
            senderName: userName,
            content: replyContent.trim(),
            messageType: 'text',
            replyTo: replyingTo._id,
            replies: []
          };
          setMessages(prev => [...prev, newTextMsg]);
        }
      }
      
      setReplyContent('');
      clearSelectedImage();
      setReplyingTo(null);
      setTimeout(() => scrollToBottom(true), 100);
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setSendingReply(false);
    }
  };

  useEffect(() => {
    if (!conversationId) {
      navigate('/messages');
      return;
    }
    
    loadMessages();
    loadConversation();
    markConversationAsRead();

    const onNewMessage = (message) => {
      if (message.conversationId === conversationId) {
        setMessages(prev => {
          const exists = prev.some(m => m._id === message._id);
          if (exists) return prev;
          return [...prev, message];
        });
        // Smart scroll: false means it only scrolls if user is already near bottom
        setTimeout(() => scrollToBottom(false), 100);
      }
    };

    const onMessageRead = ({ conversationId: readConvId }) => {
      if (readConvId === conversationId) {
        setConversation(prev => prev ? { ...prev, unreadCount: 0 } : prev);
      }
    };

    websocket.on('new_message', onNewMessage);
    websocket.on('messages_read', onMessageRead);

    return () => {
      websocket.off('new_message', onNewMessage);
      websocket.off('messages_read', onMessageRead);
    };
  }, [conversationId, loadMessages, loadConversation, navigate, markConversationAsRead, scrollToBottom]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && conversationId) {
        markConversationAsRead();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [conversationId, markConversationAsRead]);

  const getMessageReplies = (messageId) => {
    return messages.filter(m => m.replyTo === messageId);
  };

  const formatMessageTime = (date) => {
    if (!date) return '';
    try {
      const d = new Date(date);
      const now = new Date();
      const diff = now - d;
      
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
      if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
      
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyContent('');
  };

  const getSenderDisplayName = (message) => {
    const currentUserEmail = getCurrentUserEmail();
    if (message.senderEmail === currentUserEmail) {
      return 'You';
    }
    
    if (message.senderName && message.senderName !== 'admin' && message.senderName !== 'Admin') {
      return String(message.senderName).trim().split(/\s+/)[0];
    }
    
    if (message.senderEmail) {
      if (
        message.senderEmail === "admin" ||
        message.senderEmail === "admin@" ||
        message.senderEmail ===
          "admin@infinitycarepartners.com"
      ) {
        return 'Admin';
      }
      return message.senderEmail.split('@')[0];
    }
    
    return 'User';
  };

  const renderMessageWithReplies = (message) => {
    const currentUserEmail = getCurrentUserEmail();
    const isOwn = message.senderEmail === currentUserEmail;
    const isBroadcast =
      message.messageType === "broadcast" ||
      message.broadcast === true ||
      conversation?.type === "broadcast";
    const isAdminDirect =
      !isBroadcast &&
      ["admin", "admin@", "admin@infinitycarepartners.com"].includes(
        String(message.senderEmail || "").toLowerCase()
      );
    const isSystem = message.messageType === 'system';
    const replies = getMessageReplies(message._id);
    const isReplying = replyingTo?._id === message._id;
    const displayName = isAdminDirect ? "Admin" : getSenderDisplayName(message);

    if (isSystem) {
      return (
        <div key={message._id} className="flex justify-center my-3">
          <div className="bg-slate-100 text-slate-500 text-xs px-4 py-1.5 rounded-full">
            {message.content}
          </div>
        </div>
      );
    }

    if (isBroadcast) {
      return (
        <div key={message._id} className="my-4">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold">
                  📢
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-purple-700">
                    {message.senderEmail === "admin"
                      ? "Admin Announcement"
                      : (
                          message.senderName ||
                          "User"
                        )}
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-400">{formatMessageTime(message.createdAt)}</span>
                </div>
                {message.messageType === 'image' ? (
                  <img 
                    src={message.content} 
                    alt="Broadcast image" 
                    className="max-w-[250px] sm:max-w-xs rounded-xl cursor-pointer border border-purple-200 mt-2 hover:opacity-90 object-cover"
                    onClick={() => window.open(message.content, '_blank')}
                    onLoad={() => scrollToBottom(false)}
                  />
                ) : (
                  <p className="text-slate-800 mt-1 whitespace-pre-wrap break-words">{message.content}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={message._id} className="my-3">
        <div className={`flex items-start gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <div className="flex-shrink-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${
              isOwn ? 'bg-purple-600' : 'bg-slate-400'
            }`}>
              {displayName.charAt(0).toUpperCase() || '?'}
            </div>
          </div>

          <div className={`flex-1 min-w-0 ${isOwn ? 'items-end' : ''}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-semibold text-sm ${isOwn ? 'text-purple-700' : 'text-slate-800'}`}>
                {displayName}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-400">{formatMessageTime(message.createdAt)}</span>
            </div>
            
            <div className={`mt-1 ${isOwn ? 'text-right' : ''}`}>
              <div className={`inline-block rounded-2xl ${
                message.messageType === 'image'
                  ? 'bg-transparent p-0'
                  : (isOwn ? 'bg-purple-600 text-white px-4 py-2' : 'bg-slate-100 text-slate-800 px-4 py-2')
              }`}>
                {message.messageType === 'image' ? (
                  <img 
                    src={message.content} 
                    alt="Shared image" 
                    className="max-w-[250px] sm:max-w-xs rounded-2xl cursor-pointer border border-slate-200 hover:opacity-90 transition-opacity object-cover"
                    onClick={() => window.open(message.content, '_blank')}
                    onLoad={() => scrollToBottom(false)}
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                )}
              </div>
            </div>

            <div className={`flex items-center gap-4 mt-1 text-xs text-slate-400 ${isOwn ? 'justify-end' : ''}`}>
              <button 
                onClick={() => {
                  setReplyingTo(message);
                  setTimeout(() => scrollToBottom(true), 50);
                }}
                className="hover:text-purple-600 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Reply {replies.length > 0 && `(${replies.length})`}
              </button>
            </div>
          </div>
        </div>

        {/* Inline Reply Input */}
        {isReplying && (
          <div className="ml-12 mt-2 bg-slate-50 rounded-xl p-3 border border-slate-200">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  {getUserName().charAt(0).toUpperCase() || 'Y'}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500 mb-2">
                  Replying to @{displayName}
                  <button 
                    onClick={cancelReply}
                    className="ml-2 text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
                
                {imagePreview && (
                  <div className="mb-2 relative inline-block">
                    <img src={imagePreview} alt="Preview" className="h-20 w-auto rounded-lg border border-slate-200 object-cover shadow-sm" />
                    <button 
                      onClick={clearSelectedImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}

                <div className="flex gap-2 items-center">
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 text-slate-400 hover:text-purple-600 rounded-full transition-colors"
                    disabled={sendingReply}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </button>
                  <input
                    type="text"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    placeholder="Write your reply..."
                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    disabled={sendingReply}
                    // REMOVED autoFocus to prevent unwanted page scrolling jump
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={(!replyContent.trim() && !selectedImage) || sendingReply}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      (!replyContent.trim() && !selectedImage) || sendingReply
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    {sendingReply ? 'Sending...' : 'Reply'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nested Replies */}
        {replies.length > 0 && (
          <div className="ml-12 mt-2 space-y-2 border-l-2 border-slate-200 pl-4">
            {replies.map(reply => {
              const isReplyOwn = reply.senderEmail === currentUserEmail;
              const replyDisplayName = getSenderDisplayName(reply);
              return (
                <div key={reply._id} className="flex items-start gap-2">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                      isReplyOwn ? 'bg-purple-500' : 'bg-slate-400'
                    }`}>
                      {replyDisplayName.charAt(0).toUpperCase() || '?'}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold ${isReplyOwn ? 'text-purple-700' : 'text-slate-700'}`}>
                        {replyDisplayName}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-400">{formatMessageTime(reply.createdAt)}</span>
                    </div>
                    <div className={`inline-block rounded-xl mt-0.5 ${
                      reply.messageType === 'image'
                        ? 'bg-transparent p-0'
                        : (isReplyOwn ? 'bg-purple-100 text-purple-800 px-3 py-1.5' : 'bg-slate-100 text-slate-700 px-3 py-1.5')
                    }`}>
                      {reply.messageType === 'image' ? (
                        <img 
                          src={reply.content} 
                          alt="Shared image" 
                          className="max-w-[150px] sm:max-w-[200px] rounded-xl cursor-pointer border border-slate-200 hover:opacity-90 transition-opacity object-cover"
                          onClick={() => window.open(reply.content, '_blank')}
                          onLoad={() => scrollToBottom(false)}
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap break-words">{reply.content}</p>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => {
                        setReplyingTo(reply);
                        setTimeout(() => scrollToBottom(true), 50);
                      }}
                      className="block text-xs text-slate-400 hover:text-purple-600 mt-0.5 transition-colors"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (isInitialLoad && loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!conversationId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">No conversation selected</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto">
      {/* Hidden File Input */}
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleImageSelect} 
      />

      <div className="bg-white border-b border-slate-200 p-4 flex items-center sticky top-0 z-10 shrink-0">
        <button
          onClick={() => navigate('/messages')}
          className="mr-3 p-1 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h2 className="font-bold text-lg text-slate-800">Messages</h2>
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 bg-slate-50"
        ref={messagesContainerRef}
      >
        {hasMore && (
          <button
            onClick={() => loadMessages(true)}
            className="w-full text-center text-sm text-purple-600 hover:text-purple-800 py-3 transition-colors"
          >
            Load more messages
          </button>
        )}
        
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="text-5xl mb-4">💬</div>
            <p className="font-medium text-slate-600">No messages yet</p>
            <p className="text-sm">Be the first to start the conversation!</p>
          </div>
        ) : (
          <div>
            {messages
              .filter(m => !m.replyTo)
              .map(renderMessageWithReplies)}
          </div>
        )}
      </div>

      {/* New Message Input (Main bottom area) */}
      <div className="bg-white border-t border-slate-200 p-4 shrink-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {postError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {postError}
          </div>
        )}
        <div className="flex items-start gap-3 max-w-4xl mx-auto">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold mt-auto mb-1">
              {getUserName().charAt(0).toUpperCase() || 'Y'}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            
            {/* Main Preview Block (hides if doing inline reply so it doesn't double render) */}
            {imagePreview && !replyingTo && (
              <div className="mb-3 relative inline-block">
                <img src={imagePreview} alt="Preview" className="h-24 w-auto rounded-lg border border-slate-200 object-cover shadow-sm" />
                <button 
                  onClick={clearSelectedImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}

            <div className="flex gap-2 items-center">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors shrink-0"
                disabled={sendingNewMessage || isCommunityConversation}
                title={
                  isCommunityConversation
                    ? "Community posts are text messages."
                    : "Attach image"
                }
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>
              
              <input
                type="text"
                value={newMessageContent}
                onChange={(e) => {
                  setNewMessageContent(e.target.value);
                  if (postError) setPostError("");
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendNewMessage();
                  }
                }}
                placeholder={replyingTo ? `Replying to ${getSenderDisplayName(replyingTo)}...` : "Write a new message..."}
                className={`flex-1 px-4 py-2.5 border rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm ${
                  replyingTo ? 'border-purple-300 bg-purple-50' : 'border-slate-200'
                }`}
                disabled={sendingNewMessage}
              />
              
              <button
                onClick={handleSendNewMessage}
                disabled={(!newMessageContent.trim() && !selectedImage) || sendingNewMessage}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-colors shrink-0 ${
                  (!newMessageContent.trim() && !selectedImage) || sendingNewMessage
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {sendingNewMessage ? 'Sending...' : 'Post'}
              </button>
            </div>

            {replyingTo && (
              <div className="mt-2 text-xs text-purple-600">
                Replying to @{getSenderDisplayName(replyingTo)}
                <button 
                  onClick={cancelReply}
                  className="ml-2 text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}