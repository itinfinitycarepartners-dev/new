// src/pages/Messages.jsx
import React from 'react';
import ConversationList from '../components/messaging/ConversationList';

export default function Messages() {
  return (
    <div className="min-h-screen bg-slate-50">
      <ConversationList />
    </div>
  );
}