


// @ts-nocheck
// src/components/messaging/ConversationList.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { messaging, websocket, tokenStorage } from '@/api/icpClient';
import { formatDistanceToNow } from 'date-fns';

export default function ConversationList({
  allowDirectMessaging = false,
  allowBroadcastMessaging = false,
  hideStartChat = true
}) {
  const navigate = useNavigate();
  const { conversationId: selectedId } = useParams();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [expandedThreads, setExpandedThreads] = useState(new Set());
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [activeConversationTab, setActiveConversationTab] = useState("all");
  const [showStartChat, setShowStartChat] = useState(false);
  const [newRecipientEmail, setNewRecipientEmail] = useState("");
  const [startingChat, setStartingChat] = useState(false);
  
  const isAtBottomRef = useRef(true); 
  const loadingMessagesRef = useRef(false);

  // Safely extract the actual email from the JWT token
  const getCurrentUserEmail = useCallback(() => {
    const token = tokenStorage.get();
    if (!token) return '';
    if (token.includes('@') && !token.includes('.')) return token;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        return payload.email || '';
      }
    } catch (e) {}
    
    // Fallback to localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try { return JSON.parse(storedUser).email || ''; } catch(e){}
    }
    return '';
  }, []);

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

  const getSenderDisplayName = useCallback((message) => {
    const currentUserEmail = getCurrentUserEmail();
    if (message.senderEmail === currentUserEmail) return 'You';
    if (message.senderName && message.senderName !== 'admin' && message.senderName !== 'Admin') return String(message.senderName).trim().split(/\s+/)[0];
    if (message.senderEmail) {
      if (message.senderEmail === 'admin' || message.senderEmail === 'admin@') return 'Admin';
      return message.senderEmail.split('@')[0];
    }
    return 'User';
  }, [getCurrentUserEmail]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
    }
  };

  const loadMessages = useCallback(async (conversationId, before = null) => {
    if (loadingMessagesRef.current) return;
    
    try {
      loadingMessagesRef.current = true;
      setLoadingMessages(true);
      
      const response = await messaging.getMessages(conversationId, { limit: 50, before: before });
      
      if (response.success) {
        const newMessages = response.messages || [];
        
        if (before) {
          const container = messagesContainerRef.current;
          const oldScrollHeight = container ? container.scrollHeight : 0;
          
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m._id));
            const uniqueNew = newMessages.filter(m => !existingIds.has(m._id));
            return [...uniqueNew, ...prev];
          });
          
          requestAnimationFrame(() => {
            setTimeout(() => {
              if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight - oldScrollHeight;
              }
            }, 0);
          });
        } else {
          setMessages(newMessages);
          setTimeout(scrollToBottom, 50);
        }
        
        setHasMoreMessages(response.hasMore || false);
        
        newMessages.forEach(msg => {
          if (msg.replies && msg.replies.length > 0) {
            setExpandedThreads(prev => new Set(prev).add(msg._id));
          }
        });
        
        messaging.markAsRead(conversationId).then((res) => {
          if (res.success) {
            setConversations(prev => prev.map(conv => conv._id === conversationId ? { ...conv, unreadCount: 0 } : conv));
          }
        }).catch(err => console.error('Mark read error:', err));
      }
    } catch (error) {
      console.error('Load messages error:', error);
    } finally {
      loadingMessagesRef.current = false;
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const response = await messaging.getConversations();
        if (isMounted && response.success) {
          const convs = response.conversations || [];
          setConversations(convs);
          const totalUnread = convs.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
          setUnreadCount(totalUnread);
          document.title = totalUnread > 0 ? `(${totalUnread}) Messages` : 'Messages';
        }
      } catch (error) {
        console.error('Load conversations error:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchConversations();
    return () => { isMounted = false; };
  }, []);


  useEffect(() => {
    const handleMessagingUpdated = async (event) => {
      try {
        const response = await messaging.getConversations();
        if (response.success) {
          const convs = response.conversations || [];
          setConversations(convs);
          setUnreadCount(convs.reduce((sum, item) => sum + (item.unreadCount || 0), 0));
          // Keep the full conversation list visible after a broadcast.
          if (event?.detail?.type === "broadcast") {
            setActiveConversationTab("all");
          }
        }
      } catch (error) {
        console.error("Refresh conversations error:", error);
      }
    };
    window.addEventListener("messaging-updated", handleMessagingUpdated);
    return () => window.removeEventListener("messaging-updated", handleMessagingUpdated);
  }, []);

  useEffect(() => {
    if (selectedId) {
      setMessages([]);
      isAtBottomRef.current = true;
      loadMessages(selectedId);
    }
  }, [selectedId, loadMessages]);

  useEffect(() => {
    if (selectedId && conversations.length > 0) {
      const selected = conversations.find(c => c._id === selectedId);
      if (selected) setSelectedConversation(selected);
    }
  }, [selectedId, conversations]);

  const loadMoreMessages = useCallback(async () => {
    if (messages.length === 0 || isLoadingMore) return;
    setIsLoadingMore(true);
    await loadMessages(selectedId, messages[0]._id);
    setIsLoadingMore(false);
  }, [messages, isLoadingMore, selectedId, loadMessages]);

  const sendReply = useCallback(async (parentMessageId, content) => {
    if (!content.trim() || !parentMessageId || !selectedId) return;
    setSendingReply(true);
    try {
      const response = await messaging.sendReply(selectedId, parentMessageId, content);
      if (response.success) {
        const newMessage = response.message;
        const userName = response.message?.senderName || getUserName();
        setMessages(prev => prev.map(msg => {
          if (msg._id === parentMessageId) {
            return {
              ...msg,
              replies: [...(msg.replies || []), { ...newMessage, replies: [], senderName: userName }]
            };
          }
          return msg;
        }));
        setReplyTo(null);
        setReplyContent('');
        setExpandedThreads(prev => new Set(prev).add(parentMessageId));
        setTimeout(scrollToBottom, 50); 
      }
    } catch (error) {
      console.error('Send reply error:', error);
    } finally {
      setSendingReply(false);
    }
  }, [selectedId, getUserName]);
// In ConversationList.jsx - Update the sendMessage function:
const sendMessage = useCallback(async () => {
  if (!newMessageContent.trim() || !selectedId) return;
  setSendingMessage(true);
  try {
    // Check if this is a direct message to admin or another user
    const conversation = conversations.find(c => c._id === selectedId);
    const isAdminConversation =
      conversation?.participants?.some(
        participant =>
          participant ===
            "admin" ||
          participant.includes(
            "admin@"
          )
      );

    // For direct admin messages, use the admin send endpoint
    const response = await messaging.sendMessage(selectedId, newMessageContent, isAdminConversation ? 'direct' : 'text');
    
    if (response.success) {
      const userName = response.message?.senderName || getUserName();
      const newMessage = { ...response.message, replies: [], senderName: userName };
      setMessages(prev => [...prev, newMessage]);
      setNewMessageContent('');
      
      setConversations(prev => {
        const updated = prev.map(conv => 
          conv._id === selectedId 
            ? { ...conv, lastMessage: newMessage, lastMessageAt: newMessage.createdAt } 
            : conv
        );
        return updated.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      });
      setTimeout(scrollToBottom, 50);
    }
  } catch (error) {
    console.error('Send message error:', error);
  } finally {
    setSendingMessage(false);
  }
}, [newMessageContent, selectedId, getUserName]);;


  const startChat = async () => {
    if (!newRecipientEmail.trim()) return;
    setStartingChat(true);
    try {
      const token = tokenStorage.get();
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "https://fictional-carnival-3inv.onrender.com"}/api/messaging/start-conversation`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ recipientEmail: newRecipientEmail.trim() })
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to start chat");
      setShowStartChat(false);
      setNewRecipientEmail("");
      navigate(`/messages/${data.conversation._id}`);
      const refreshed = await messaging.getConversations();
      if (refreshed.success) setConversations(refreshed.conversations || []);
    } catch (error) {
      alert(error.message);
    } finally {
      setStartingChat(false);
    }
  };

  const isBroadcastConversation = (conversation) =>
    conversation?.type === "broadcast" || conversation?.broadcast === true ||
    conversation?.groupName?.toLowerCase().includes("broadcast") ||
    conversation?.groupName?.toLowerCase().includes("announcement");

  const messageDepartments = [
    { id: "admin", label: "Admin" },
    { id: "public", label: "Public" },
    { id: "it", label: "IT" },
    { id: "recruitment", label: "Recruitment" },
    { id: "immigration", label: "Immigration" },
    { id: "deployment", label: "Deployment" },
    { id: "aftercare", label: "Aftercare" }
  ];

  const getConversationDepartment = conversation => {
    if (
      conversation?._id === "community" ||
      conversation?.type === "community" ||
      isBroadcastConversation(conversation)
    ) {
      return "public";
    }
    return String(conversation?.department || "admin").toLowerCase();
  };

  // Candidates must be able to see:
  // - broadcasts they sent,
  // - admin broadcasts they received,
  // - individual admin messages.
  // The previous code defaulted to an "admin" tab but rendered no tab controls,
  // which silently hid every broadcast conversation.
  const visibleConversations =
    [...conversations].sort((a, b) => {
      const departmentOrder = Object.fromEntries(
        messageDepartments.map((department, index) => [department.id, index])
      );
      const getOrder = conversation => {
        return departmentOrder[getConversationDepartment(conversation)] ?? 99;
      };
      return getOrder(a) - getOrder(b);
    });

  const toggleThread = (messageId) => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) newSet.delete(messageId);
      else newSet.add(messageId);
      return newSet;
    });
  };

  const handleReplyClick = (messageId) => {
    setReplyTo(prev => prev === messageId ? null : messageId);
    setReplyContent('');
    setTimeout(() => {
      const input = document.getElementById(`reply-input-${messageId}`);
      if (input) input.focus();
    }, 100);
  };

  const handleScroll = useCallback((e) => {
    const target = e.target;
    isAtBottomRef.current = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
  }, []);

  const handleConversationClick = (conversationId) => {
    if (selectedId === conversationId) return;
    navigate(`/messages/${conversationId}`);
  };

  // Upgraded WebSocket Event Handlers
  useEffect(() => {
    const handleNewMessage = (message) => {
      const currentUserEmail = getCurrentUserEmail();
      const isOwn = message.senderEmail === currentUserEmail;
      const incomingConversationId =
        message.broadcast === true
          ? "community"
          : message.conversationId;

      const isCurrentlyViewed =
        selectedId &&
        incomingConversationId ===
          selectedId;

      setConversations(prev => {
        const conversationExists =
          prev.some(
            conv =>
              conv._id ===
              incomingConversationId
          );
        
        // If Admin initiates a BRAND NEW conversation, dynamically fetch it
        if (!conversationExists) {
          messaging.getConversations().then(res => {
            if (res.success) {
              setConversations(res.conversations);
              const totalUnread = res.conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
              setUnreadCount(totalUnread);
            }
          });
          return prev;
        }

        const updated = prev.map((conv) => {
          if (
            conv._id ===
            incomingConversationId
          ) {
            return {
              ...conv,
              lastMessage: message,
              lastMessageAt: message.createdAt,
              unreadCount: (isCurrentlyViewed || isOwn) ? 0 : (conv.unreadCount || 0) + 1,
            };
          }
          return conv;
        });
        return updated.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      });

      if (!isCurrentlyViewed && !isOwn) {
        setUnreadCount(prev => prev + 1);
      }
      
      if (isCurrentlyViewed) {
        if (!isOwn) messaging.markAsRead(selectedId);
        
        const wasAtBottom = isAtBottomRef.current;
        setMessages(prev => {
          if (prev.some(m => m._id === message._id)) return prev;
          if (message.parentMessageId) {
            return prev.map(msg => {
              if (msg._id === message.parentMessageId) {
                return { ...msg, replies: [...(msg.replies || []), { ...message, replies: [] }] };
              }
              return msg;
            });
          } else {
            return [...prev, { ...message, replies: [] }];
          }
        });
        
        if (message.parentMessageId) {
          setExpandedThreads(prev => new Set(prev).add(message.parentMessageId));
        }
        
        if (wasAtBottom) {
          setTimeout(scrollToBottom, 50);
        }
      }
    };

    const handleConversationRead = ({ conversationId }) => {
      setConversations(prev => prev.map(conv => {
        if (conv._id === conversationId) return { ...conv, unreadCount: 0 };
        return conv;
      }));
    };

    websocket.on('new_message', handleNewMessage);
    websocket.on('conversation_read', handleConversationRead);

    return () => {
      websocket.off('new_message', handleNewMessage);
      websocket.off('conversation_read', handleConversationRead);
    };
  }, [selectedId, getCurrentUserEmail]); 

  const getConversationName = (conversation) => {
    if (
      conversation._id ===
        "community" ||
      conversation.type ===
        "community"
    ) {
      return "Public Messages";
    }

    if (
      conversation._id ===
      "admin-direct"
    ) {
      return "Admin Messages";
    }

    if (conversation.department) {
      const departmentLabels = {
        admin: "Admin Messages",
        public: "Public Messages",
        community: "Public Messages",
        it: "IT Messages",
        recruitment: "Recruitment Messages",
        immigration: "Immigration Messages",
        deployment: "Deployment Messages",
        aftercare: "Aftercare Messages"
      };
      return departmentLabels[String(conversation.department).toLowerCase()] || `${conversation.department[0].toUpperCase()}${conversation.department.slice(1)} Messages`;
    }

    if (conversation.type === 'broadcast') return "Public Messages";
    if (conversation.type === 'group') return conversation.groupName || 'Group Chat';
    const currentUserEmail = getCurrentUserEmail();
    const otherUser =
      conversation.participants?.find(
        email =>
          email !==
            currentUserEmail &&
          email !==
            "admin"
      );
    return conversation.participantNames?.[otherUser || ''] || otherUser?.split('@')[0] || 'Unknown';
  };

  const getLastMessagePreview = (conversation) => {
    if (!conversation.lastMessage) return 'No messages yet';
    const content = conversation.lastMessage.content || '';
    const senderName = getSenderDisplayName(conversation.lastMessage);
    
    if (conversation.type === 'broadcast' || conversation.groupName?.includes('Announcements')) {
      return `${senderName}: ${content.length > 40 ? content.substring(0, 40) + '...' : content}`;
    }
    return content.length > 50 ? content.substring(0, 50) + '...' : content;
  };

  const getTimeAgo = (date) => {
    if (!date) return '';
    try { return formatDistanceToNow(new Date(date), { addSuffix: true }); } 
    catch { return ''; }
  };

  const renderMessageWithReplies = (message, isReply = false, depth = 0) => {
    const currentUserEmail = getCurrentUserEmail();
    const isOwn = message.senderEmail === currentUserEmail;
    const isSender = ['admin', 'admin@', 'admin@infinitycarepartners.com'].includes(
      String(message.senderEmail || '').toLowerCase()
    );
    const hasReplies = message.replies && message.replies.length > 0;
    const isExpanded = expandedThreads.has(message._id);
    const isReplying = replyTo === message._id;
    const maxDepth = 3;
    const displayName = getSenderDisplayName(message);

    const isBroadcast = message.messageType === 'broadcast' || message.broadcast === true ||
                        message.senderEmail === 'admin' || 
                        message.senderEmail === 'system';

    if (
      isBroadcast ||
      selectedConversation?._id ===
        "community"
    ) {
      const senderName =
        message.senderEmail ===
          "admin"
          ? "Admin"
          : (
              message.senderName ||
              getSenderDisplayName(
                message
              ) ||
              "User"
            );

      const initials =
        String(
          senderName ||
          "U"
        )
          .trim()
          .split(/\s+/)
          .map(part =>
            part[0]
          )
          .join("")
          .slice(0, 2)
          .toUpperCase();

      return (
        <article
          key={message._id}
          className="border-b border-slate-200 bg-white px-4 py-4 transition-colors hover:bg-slate-50/70"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-600 text-sm font-bold text-white">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-slate-900">
                  {senderName}
                </span>
                <span className="text-slate-400">
                  ·
                </span>
                <span className="text-sm text-slate-500">
                  {getTimeAgo(
                    message.createdAt
                  )}
                </span>
              </div>

              <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-6 text-slate-800">
                {message.content}
              </p>
              <button
                type="button"
                aria-label="Reply to this message"
                title="Reply to this message"
                onClick={() => handleReplyClick(message._id)}
                className="mt-1 text-slate-400 transition-colors hover:text-emerald-700"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
            </div>
          </div>
        </article>
      );
    }

    return (
      <div key={message._id} className="space-y-1">
        <div 
          className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${isSender ? 'bg-white text-slate-800 shadow-sm' : 'flex-row-reverse bg-[#d9fdd3] text-slate-800'} ${isReply ? 'border-l-2 border-emerald-400' : ''}`}
          style={{ marginLeft: isReply ? `${Math.min(depth * 20, 60)}px` : '0', marginRight: '0' }}
        >
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${isOwn ? 'bg-purple-700' : 'bg-slate-400'}`}>
            {displayName.charAt(0).toUpperCase() || '?'}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <div className="flex items-center gap-2">
                {isSender && <span className="font-medium text-sm text-slate-700">{displayName}</span>}
                <span className="text-xs text-slate-400">{getTimeAgo(message.createdAt)}</span>
              </div>
            </div>
            
            <div className="mt-1 flex items-end gap-2">
              <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{message.content}</p>
              <button
                type="button"
                aria-label="Reply to this message"
                title="Reply to this message"
                onClick={() => handleReplyClick(message._id)}
                className="shrink-0 text-slate-400 transition-colors hover:text-emerald-700"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
            </div>
            
            {hasReplies && (
              <button
                onClick={() => toggleThread(message._id)}
                className={`text-xs mt-2 font-medium flex items-center gap-1 ${isOwn ? 'text-purple-300 hover:text-white' : 'text-purple-600 hover:text-purple-800'}`}
              >
                {isExpanded ? '▼' : '▶'} {message.replies.length} {message.replies.length === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>
        </div>

        {isReplying && (
          <div className={`mt-2 ${isReply ? `ml-${Math.min(depth * 20 + 40, 80)}px` : 'ml-8'}`}>
            <div className="flex items-center gap-2 bg-white rounded-lg border border-purple-200 p-2 shadow-sm">
              <input
                id={`reply-input-${message._id}`} type="text" value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)} placeholder={`Reply to ${displayName}...`}
                className="flex-1 bg-transparent outline-none text-sm px-2 py-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(message._id, replyContent); }
                  if (e.key === 'Escape') { setReplyTo(null); setReplyContent(''); }
                }}
                disabled={sendingReply}
              />
              <button
                onClick={() => sendReply(message._id, replyContent)} disabled={!replyContent.trim() || sendingReply}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${!replyContent.trim() || sendingReply ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
              >{sendingReply ? 'Sending...' : 'Reply'}</button>
              <button onClick={() => { setReplyTo(null); setReplyContent(''); }} className="text-slate-400 hover:text-slate-600 text-sm">Cancel</button>
            </div>
          </div>
        )}

        {hasReplies && isExpanded && depth < maxDepth && (
          <div className="mt-1 space-y-1">
            {message.replies.map((reply) => renderMessageWithReplies(reply, true, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] max-w-6xl mx-auto bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="flex h-full">
        <div className="w-1/3 border-r border-slate-200 overflow-y-auto flex-shrink-0 h-full">
          <div className="p-4 border-b border-slate-200 sticky top-0 bg-white z-10">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <h1 className="text-xl font-semibold text-slate-800">Departments</h1>
                {unreadCount > 0 && <span className="text-sm text-purple-600 ml-2">{unreadCount} unread</span>}
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {messageDepartments.map(department => {
              const departmentConversations = visibleConversations.filter(
                conversation => getConversationDepartment(conversation) === department.id
              );

              return (
                <section key={department.id}>
                  <div className="flex items-center justify-between bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <span>{department.label}</span>
                    <span>{departmentConversations.length}</span>
                  </div>
                  {departmentConversations.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-400">No messages yet</div>
                  ) : departmentConversations.map((conversation) => {
                const name = getConversationName(conversation);
                const preview = getLastMessagePreview(conversation);
                const timeAgo = getTimeAgo(conversation.lastMessageAt);
                const isUnread = (conversation.unreadCount || 0) > 0;
                const isBroadcast = isBroadcastConversation(conversation);
                const isSelected = selectedId === conversation._id;

                return (
                  <button
                    key={conversation._id}
                    onClick={() => handleConversationClick(conversation._id)}
                    className={`w-full p-4 hover:bg-slate-50 transition-colors text-left flex items-center gap-3 ${isBroadcast ? 'border-l-4 border-purple-400' : ''} ${isSelected ? 'bg-purple-50' : ''}`}
                  >
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg ${isBroadcast ? 'bg-purple-600' : 'bg-purple-100 text-purple-700'}`}>
                        {isBroadcast ? '📢' : name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${isUnread ? 'text-slate-900' : 'text-slate-600'}`}>
                          {isBroadcast ? "Public Messages" : name}
                        </span>
                        <span className="text-xs text-slate-400">{timeAgo}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm truncate ${isUnread ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>{preview}</span>
                        {isUnread && <span className="flex-shrink-0 w-2 h-2 bg-purple-600 rounded-full"></span>}
                      </div>
                    </div>
                  </button>
                );
              })}
                </section>
              );
            })}
          </div>
        </div>

        <div className="w-2/3 flex flex-col bg-[#efeae2] flex-1 min-w-0 h-full">
          {selectedId ? (
            <>
              <div className="p-4 border-b border-slate-200 bg-white flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold text-lg">
                    {selectedConversation?._id === "community"
                      ? "🌐"
                      : "A"}
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-800">
                      {selectedConversation?._id === "community"
                        ? "Public Messages"
                        : "Admin Messages"}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {selectedConversation?._id === "community"
                        ? "Shared candidate community"
                        : "Direct messages from Admin"}
                    </p>
                  </div>
                </div>
              </div>

              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-2" onScroll={handleScroll}>
                {hasMoreMessages && (
                  <button onClick={loadMoreMessages} disabled={isLoadingMore} className="w-full text-center text-sm text-purple-600 hover:text-purple-800 py-2">
                    {isLoadingMore ? 'Loading...' : 'Load earlier messages'}
                  </button>
                )}
                {loadingMessages && !isLoadingMore && <div className="text-center text-slate-400 text-sm">Loading messages...</div>}
                {messages.length === 0 && !loadingMessages ? (
                  <div className="text-center py-16 text-slate-400"><p>No messages yet</p><p className="text-sm">Be the first to send a message</p></div>
                ) : (
                  messages.map((msg) => renderMessageWithReplies(msg))
                )}
                <div ref={messagesEndRef} className="h-1" />
              </div>

              {false ? (
                <div className="p-4 border-t border-slate-200 bg-white flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={newMessageContent}
                      onChange={(e) =>
                        setNewMessageContent(e.target.value)
                      }
                      className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          !e.shiftKey
                        ) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      disabled={sendingMessage}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={
                        !newMessageContent.trim() ||
                        sendingMessage
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        !newMessageContent.trim() ||
                        sendingMessage
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-purple-600 hover:bg-purple-700 text-white"
                      }`}
                    >
                      {sendingMessage
                        ? "Sending..."
                        : "Send"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
                  {selectedConversation?._id === "community"
                    ? "Use New Public Message above to post to the public thread."
                    : "Admin Messages are read-only for candidate accounts."}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Choose a conversation from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}