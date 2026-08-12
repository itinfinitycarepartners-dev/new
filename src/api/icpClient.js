// @ts-nocheck
// Type checking disabled for this file due to Vite-specific import.meta.env and dynamic error properties

const BASE_URL = (() => {
  // Handle import.meta.env safely for Vite
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return 'https://fictional-carnival-3inv.onrender.com';
})();

const TOKEN_KEY = 'icp_auth_token';

// ─── Token helpers with logging ──────────────────────────────────────────────
export const tokenStorage = {
  get: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    console.log('[TokenStorage] Getting token:', token ? `exists (length: ${token.length})` : 'none');
    if (token) {
      console.log('[TokenStorage] Token preview:', token.substring(0, 20) + '...');
    }
    return token;
  },
  set: (token) => {
    console.log('[TokenStorage] Setting token:', token ? `exists (length: ${token.length})` : 'none');
    if (token) {
      console.log('[TokenStorage] Token preview:', token.substring(0, 20) + '...');
    }
    localStorage.setItem(TOKEN_KEY, token);
    
    // Verify the token was stored
    const stored = localStorage.getItem(TOKEN_KEY);
    console.log('[TokenStorage] Token stored successfully:', !!stored);
  },
  clear: () => {
    console.log('[TokenStorage] Clearing token');
    localStorage.removeItem(TOKEN_KEY);
  },
  has: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    return !!token && token.length > 10;
  }
};

// ─── Core fetch wrapper with improved error handling ────────────────────────
async function apiFetch(path, options = {}) {
  const token = tokenStorage.get();
  
  const headers = {
    'Content-Type': 'application/json',
    'x-client-type': 'Web',
    'x-app-version': '1.0.0',
    ...options.headers,
  };
  
  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log(`[API] Request to ${path} with token: ${token.substring(0, 10)}...`);
  } else {
    console.warn(`[API] No token for request to ${path}`);
  }

  const fetchOptions = {
    ...options,
    headers,
  };

  // Stringify body if it exists
  if (options.body && !(options.body instanceof FormData)) {
    fetchOptions.body = JSON.stringify(options.body);
  } else if (options.body instanceof FormData) {
    // For FormData, remove Content-Type header so browser sets it with boundary
    delete fetchOptions.headers['Content-Type'];
    fetchOptions.body = options.body;
  }

  try {
    console.log(`[API] Fetching: ${BASE_URL}${path}`);
    const res = await fetch(`${BASE_URL}${path}`, fetchOptions);

    // Handle non-JSON responses
    const contentType = res.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await res.json().catch(() => ({}));
    } else {
      // For non-JSON responses (like file downloads)
      data = { success: res.ok, status: res.status };
    }

    console.log(`[API] Response from ${path}: ${res.status}`);

    if (!res.ok) {
      const err = new Error(data.message || data.error || `Request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      err.sessionExpired = data.sessionExpired || false;
      
      const explicitSessionExpiry =
        data.sessionExpired === true ||
        data.tokenExpired === true ||
        data.invalidToken === true ||
        data.code === 'TOKEN_EXPIRED' ||
        data.code === 'INVALID_TOKEN';

      if (explicitSessionExpiry) {
        console.warn('[API] Backend confirmed session expiry; clearing token');
        tokenStorage.clear();
        localStorage.removeItem('icp_user_email');
        localStorage.removeItem('icp_user_name');
      }
      
      throw err;
    }

    return data;
  } catch (error) {
    console.error(`[API] Request failed for ${path}:`, error.message);
    throw error;
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  /** Step 1: check if email exists, returns { requiresOTP, needsPasswordSetup } */
  checkEmail: (email) =>
    apiFetch('/api/auth/check-email', { method: 'POST', body: { email } }),

  /** Request OTP (legacy / standalone) */
  requestOTP: (email) =>
    apiFetch('/api/auth/request-otp', { method: 'POST', body: { email } }),

  /** Verify OTP */
  verifyOTP: (email, otp, isNewApp = true) =>
    apiFetch('/api/auth/verify-otp', { method: 'POST', body: { email, otp, isNewApp } }),

  /** Set password after first OTP */
  setupPassword: (email, password, confirmPassword) =>
    apiFetch('/api/auth/setup-password', { method: 'POST', body: { email, password, confirmPassword } }),

  /** Login with password */
  loginWithPassword: (email, password) =>
    apiFetch('/api/auth/login-with-password', { method: 'POST', body: { email, password } }),

  /** Request password reset OTP */
  forgotPassword: (email) =>
    apiFetch('/api/auth/forgot-password', { method: 'POST', body: { email } }),

  /** Reset password with OTP */
  resetPassword: (emailOrPayload, otp, newPassword, confirmPassword) => {
    const body =
      emailOrPayload && typeof emailOrPayload === 'object'
        ? emailOrPayload
        : { email: emailOrPayload, otp, newPassword, confirmPassword };

    return apiFetch('/api/auth/reset-password', {
      method: 'POST',
      body
    });
  },

  /** Resend OTP */
  resendOTP: (email) =>
    apiFetch('/api/auth/resend-otp', { method: 'POST', body: { email } }),

  /** Get session info */
  sessionInfo: () => apiFetch('/api/auth/session-info'),

  /** Refresh session */
  refreshSession: () => apiFetch('/api/auth/refresh-session', { method: 'POST' }),

  /** Logout */
  logout: () =>
    apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {}).finally(() => tokenStorage.clear()),

  /** Get full candidate data snapshot */
  snapshot: () => apiFetch('/api/auth/offline-snapshot'),

  /** Save token and resolve user from snapshot */
  setToken: (token) => {
    console.log('[Auth] Setting token via setToken');
    tokenStorage.set(token);
  },

  /** Is the user logged in? */
  isLoggedIn: () => {
    const has = tokenStorage.has();
    console.log('[Auth] isLoggedIn:', has);
    return has;
  },
  
  /** Verify token validity */
  verifyToken: () => apiFetch('/api/auth/verify-token'),
};

// ─── Zoho / Candidate data ────────────────────────────────────────────────────
export const candidate = {
  getDashboardSummary: () =>
    apiFetch("/api/candidate/dashboard-summary"),

  getBootstrap: () =>
    apiFetch("/api/candidate/bootstrap"),

  getUpdates: (limit = 100) =>
    apiFetch(`/api/updates?limit=${limit}`),

  markUpdatesRead: () =>
    apiFetch("/api/updates/mark-read", {
      method: "POST"
    }),

  getDocumentLibrary: () =>
    apiFetch("/api/documents/library"),

  getPrescreenStatus: () =>
    apiFetch("/api/recruit/prescreen-status"),

  getCredentialingStatus: () =>
    apiFetch("/api/recruit/credentialing-status"),


  /** Fetch all deals / placement info */
  getMyDeals: () => {
    console.log('[Candidate] Fetching my deals...');
    return apiFetch('/api/zoho/my-deals');
  },
  
  /** Get Current_Employer from Zoho Recruit */
  getCurrentEmployer: () => apiFetch('/api/recruit/current-employer'),
  
  /** Get full candidate details from Recruit */
  getCandidate: () => apiFetch('/api/recruit/candidate'),
  
  /** Get Scheduled_for_Interview from Recruit */
  getScheduledInterview: () => apiFetch('/api/recruit/scheduled-interview'),
};

// ─── Documents ────────────────────────────────────────────────────────────────
export const documents = {
  /** Get document metadata (returns a URL to fetch the actual file) */
  getMeta: (candidateId, documentType) =>
    apiFetch(`/api/documents/metadata/${candidateId}/${documentType}`),

  /** Get document download URL */
  getById: (documentId) => apiFetch(`/api/documents/${documentId}`),

  /** Download blob — returns { base64, mimeType, fileName } */
  download: (documentId) =>
    apiFetch(`/api/documents/download/${documentId}`),
  
  /** Upload document to Concierge Biography field */
  uploadToConcierge: (formData) => {
    const token = tokenStorage.get();
    console.log('[Documents] Uploading to concierge with token:', !!token);
    
    return fetch(`${BASE_URL}/api/documents/upload-to-concierge`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.message || data.error || `Upload failed (${res.status})`);
        err.status = res.status;
        err.data = data;
        if (
          data.sessionExpired === true ||
          data.tokenExpired === true ||
          data.invalidToken === true
        ) {
          tokenStorage.clear();
        }
        throw err;
      }
      return data;
    });
  },
  
  /** Get user's uploaded documents */
  getMyDocuments: () => apiFetch('/api/documents/my-documents'),
};

// ─── Recruit Documents ────────────────────────────────────────────────────────
export const recruit = {
  /** Upload document to Zoho Recruit */
  uploadDocument: (formData) => {
    const token = tokenStorage.get();
    console.log('[Recruit] Uploading document with token:', !!token);
    
    return fetch(`${BASE_URL}/api/recruit/upload-document`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.message || data.error || `Upload failed (${res.status})`);
        err.status = res.status;
        err.data = data;
        if (
          data.sessionExpired === true ||
          data.tokenExpired === true ||
          data.invalidToken === true
        ) {
          tokenStorage.clear();
        }
        throw err;
      }
      return data;
    });
  },
  
  /** Get user's recruit documents */
  getDocuments: () => apiFetch('/api/recruit/documents'),
  
  /** Download recruit document */
  download: (attachmentId) =>
    apiFetch(`/api/recruit/download/${attachmentId}`),
  
  /** Get valid categories for Recruit */
  getValidCategories: () => apiFetch('/api/recruit/valid-categories'),
  
  /** Discover categories from Recruit */
  discoverCategories: () => apiFetch('/api/recruit/discover-categories'),
};

// ─── Concierge image ─────────────────────────────────────────────────────────
export const concierge = {
  imageByEmail: () => apiFetch('/api/concierge-image-by-email'),
  imageByDealId: (dealId) => apiFetch(`/api/concierge-image/${dealId}`),
};

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const chat = {
  send: (message, userName, candidateData) =>
    apiFetch('/api/chat/local', { method: 'POST', body: { message, userName, candidateData } }),
};

// ─── Arrivals ─────────────────────────────────────────────────────────────────
export const flights = {
  confirmArrival: () =>
    apiFetch('/api/flights/confirm-arrival', { method: 'POST' }),
};

// ─── R&L (Relocation & Logistics) Forms ──────────────────────────────────────
export const rlForms = {
  /** Submit R&L form with files */
  submit: (formData) => {
    const token = tokenStorage.get();
    console.log('[RLForms] Submitting form with token:', !!token);
    
    return fetch(`${BASE_URL}/api/rl/submit`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.message || data.error || `Submission failed (${res.status})`);
        err.status = res.status;
        err.data = data;
        if (
          data.sessionExpired === true ||
          data.tokenExpired === true ||
          data.invalidToken === true
        ) {
          tokenStorage.clear();
        }
        throw err;
      }
      return data;
    });
  },
  
  /** Get R&L submission history */
  getHistory: () => apiFetch('/api/rl/history'),
};

// ─── Housing Forms ────────────────────────────────────────────────────────────
export const housing = {
  /** Submit housing details */
  submit: (formData) =>
    apiFetch('/api/housing/submit', { method: 'POST', body: formData }),
  
  /** Get housing submission history */
  getHistory: () => apiFetch('/api/housing/history'),
};

// ─── MESSAGING ────────────────────────────────────────────────────────────────
// WebSocket connection for real-time messaging
export const MESSAGING_WS_URL = (() => {
  // Convert http(s) to ws(s)
  const base = BASE_URL.replace(/^https?:\/\//, '');
  const protocol = BASE_URL.startsWith('https') ? 'wss' : 'ws';
  return `${protocol}://${base}/ws`;
})();

export const messaging = {
  /** Get or create a conversation */
  getOrCreateConversation: (participantEmail, type = 'direct', groupName = null, participantEmails = []) =>
    apiFetch('/api/messaging/conversation', { 
      method: 'POST', 
      body: { participantEmail, type, groupName, participantEmails } 
    }),

  /** Get user's conversations */
  getConversations: (limit = 50, offset = 0) =>
    apiFetch(`/api/messaging/conversations?limit=${limit}&offset=${offset}`),

  /** Get messages for a conversation */
  getMessages: (
    conversationId,
    limitOrOptions = 30,
    before = null
  ) => {
    const options =
      typeof limitOrOptions === "object"
        ? limitOrOptions
        : {
            limit:
              limitOrOptions,
            before
          };

    const limit =
      Number(
        options.limit ||
        30
      );

    let url =
      `/api/messaging/messages/${conversationId}?limit=${limit}`;

    if (options.before) {
      url +=
        `&before=${encodeURIComponent(options.before)}`;
    }

    return apiFetch(url);
  },

  /** Send a message */
  sendMessage: (conversationId, content, messageType = 'text', fileData = null) => {
    const body = { conversationId, content, messageType };
    if (fileData) {
      body.fileUrl = fileData.url;
      body.fileName = fileData.name;
    }
    return apiFetch('/api/messaging/send', { method: 'POST', body });
  },

  /** Send a threaded reply */
  sendReply: (
    conversationId,
    parentMessageId,
    content
  ) =>
    apiFetch(
      "/api/messaging/reply",
      {
        method: "POST",
        body: {
          conversationId,
          parentMessageId,
          content
        }
      }
    ),

  /** Mark messages as read */
  markAsRead: (conversationId) =>
    apiFetch(`/api/messaging/read/${conversationId}`, { method: 'POST' }),

  /** Get unread count */
  getUnreadCount: () =>
    apiFetch('/api/messaging/unread-count'),

  /** Candidate/user broadcast to all candidate users - REMOVED TITLE */
  sendUserBroadcast: (content) =>
    apiFetch("/api/messaging/user-broadcast", {
      method: "POST",
      body: {
        content
      }
    }),

  /** Admin broadcast to all or specific users */
  sendAdminBroadcast: (content, targetUsers = 'all', recipientEmails = null) =>
    apiFetch("/api/admin/broadcast", {
      method: "POST",
      body: {
        message: content,
        targetUsers,
        recipientEmails
      }
    }),

  /** Delete a message */
  deleteMessage: (messageId) =>
    apiFetch(`/api/messaging/message/${messageId}`, { method: 'DELETE' }),

  /** Send typing indicator */
  sendTyping: (conversationId, isTyping) =>
    apiFetch('/api/messaging/typing', { 
      method: 'POST', 
      body: { conversationId, isTyping } 
    }),

  /** Add user to group */
  addToGroup: (conversationId, emailToAdd) =>
    apiFetch('/api/messaging/group/add', { 
      method: 'POST', 
      body: { conversationId, emailToAdd } 
    }),

  /** Register push notification token */
  registerPushToken: (deviceToken, deviceType = 'web') =>
    apiFetch('/api/messaging/register-push', { 
      method: 'POST', 
      body: { deviceToken, deviceType } 
    }),
};

// ─── Document Library ─────────────────────────────────────────────────────────
export const documentLibrary = {
  getAll: () =>
    apiFetch("/api/documents/library"),

  upload: ({
    file,
    category,
    destination = "crm",
    documentType = "",
    pipelineSection = "",
    requirementKey = "",
    crmFieldApiName = ""
  }) => {
    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );

    formData.append(
      "document_category",
      category
    );

    formData.append(
      "destination",
      destination
    );

    formData.append(
      "document_type",
      documentType ||
      category
    );

    if (pipelineSection) {
      formData.append(
        "pipeline_section",
        pipelineSection
      );
    }

    if (requirementKey) {
      formData.append(
        "requirement_key",
        requirementKey
      );
    }

    if (crmFieldApiName) {
      formData.append(
        "crm_field_api_name",
        crmFieldApiName
      );
    }

    return apiFetch(
      "/api/documents/upload",
      {
        method: "POST",
        body: formData,
        isFormData: true
      }
    );
  }
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const admin = {
  /** Send broadcast message to users */
  broadcast: (message, targetUsers = 'all', recipientEmails = null) =>
    apiFetch('/api/admin/broadcast', { 
      method: 'POST', 
      body: { message, targetUsers, recipientEmails } 
    }),
};

// ─── WebSocket Manager (for real-time messaging) ─────────────────────────────
class WebSocketManager {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.messageHandlers = new Map();
    this.isConnecting = false;
    this.isConnected = false;
    this.heartbeatInterval = null;
    this.token = null;
  }

  connect(token) {
    if (this.isConnected || this.isConnecting) {
      console.log('[WebSocket] Already connected or connecting');
      return;
    }
    
    this.token = token;
    this.isConnecting = true;
    console.log('[WebSocket] Connecting...');
    
    try {
      const wsUrl = `${MESSAGING_WS_URL}?token=${token}`;
      console.log('[WebSocket] Connecting to:', wsUrl.replace(token, '****'));
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.triggerHandler('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('[WebSocket] Parse error:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('[WebSocket] Closed:', event.code, event.reason);
        this.isConnected = false;
        this.isConnecting = false;
        this.stopHeartbeat();
        if (event.code !== 1000) {
          this.reconnect();
        }
        this.triggerHandler('disconnected');
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.isConnected = false;
        this.isConnecting = false;
        this.triggerHandler('error', error);
      };

    } catch (error) {
      console.error('[WebSocket] Connect error:', error);
      this.isConnecting = false;
      this.reconnect();
    }
  }

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WebSocket] Max reconnection attempts reached');
      this.triggerHandler('error', new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (this.token) {
        this.connect(this.token);
      }
    }, delay);
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  send(data) {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    console.warn('[WebSocket] Cannot send, not connected');
    return false;
  }

  handleMessage(data) {
    switch (data.type) {
      case 'new_message':
        this.triggerHandler('new_message', data.message);
        break;

      case 'typing':
        this.triggerHandler('typing', {
          conversationId: data.conversationId,
          senderEmail: data.senderEmail,
          isTyping: data.isTyping,
        });
        break;

      case 'connection':
        this.triggerHandler('connection_status', data);
        break;

      case 'pong':
        // Heartbeat response - ignore
        break;

      default:
        console.log('[WebSocket] Unknown message type:', data.type);
    }
  }

  on(event, handler) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, new Set());
    }
    this.messageHandlers.get(event).add(handler);
  }

  off(event, handler) {
    if (this.messageHandlers.has(event)) {
      this.messageHandlers.get(event).delete(handler);
    }
  }

  triggerHandler(event, data) {
    if (this.messageHandlers.has(event)) {
      for (const handler of this.messageHandlers.get(event)) {
        try {
          handler(data);
        } catch (error) {
          console.error(`[WebSocket] Handler error for ${event}:`, error);
        }
      }
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.token = null;
    console.log('[WebSocket] Disconnected');
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
    };
  }
}

// ─── Export WebSocket singleton ──────────────────────────────────────────────
export const websocket = new WebSocketManager();

// ─── Utility to initialize WebSocket after login ─────────────────────────────
export const initMessaging = (token) => {
  console.log('[Messaging] Initializing with token:', !!token);
  if (token) {
    // Only connect if not already connected
    if (!websocket.isConnected && !websocket.isConnecting) {
      websocket.connect(token);
    } else {
      console.log('[Messaging] Already connected or connecting');
    }
  }
  return websocket;
};

// ─── Default export ──────────────────────────────────────────────────────────
export default {
  auth,
  candidate,
  documents,
  recruit,
  concierge,
  chat,
  flights,
  rlForms,
  housing,
  messaging,
  admin,
  websocket,
  tokenStorage,
  initMessaging,
  MESSAGING_WS_URL,
  BASE_URL,
  TOKEN_KEY,
};