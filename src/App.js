import React, { useState, useEffect, useCallback, useRef } from 'react';
import { init, logout } from '@thoughtspot/visual-embed-sdk';
import { LiveboardEmbed, BodylessConversationEmbed, useEmbedRef } from '@thoughtspot/visual-embed-sdk/react';
import { createConfiguration, ServerConfiguration, ThoughtSpotRestApi } from '@thoughtspot/rest-api-sdk';
import './App.css';

const getAuthToken = async () => {
  const tsHost = "ts-host";
  const config = createConfiguration({
    baseServer: new ServerConfiguration(tsHost, {}),
  });
  const tsRestApiClient = new ThoughtSpotRestApi(config);

  const data = await tsRestApiClient.getFullAccessToken({
    username: "username",
    secret_key: "secret_key",
    validity_time_in_sec: 30000,
    // org_id: "champagne-master-aws" || undefined,
  });
  return data.token;
}

init({
  thoughtSpotHost: "ts-host",
  authType: "AuthServer",
  getAuthToken: getAuthToken
})

const App = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [activeTab, setActiveTab] = useState('liveboard');
    
    const conversationRef = useEmbedRef();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
        const sessionCookie = getCookie('TS_SESSION');
        if (sessionCookie) {
            setIsLoggedIn(true);
        }
    }, []);

    const handleLogout = async () => {
      try {
        logout();
        setIsLoggedIn(false);
      } catch (error) {
        console.error("Logout error", error);
      }
    };

    const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
    };

    const sendMessage = async (text) => {
      if (!text.trim() || !conversationRef.current) return;
      
      setMessages(prev => [...prev, { text, isUser: true }]);
      setInputText('');
      setIsLoading(true);
      
      try {
        const { container, error } = await conversationRef.current.sendMessage(text);
        
        if (error) {
          console.error("Error:", error);
          setMessages(prev => [
            ...prev, 
            { text: `Error: ${error.message || 'Failed to get response'}`, isUser: false }
          ]);
          return;
        }
        
        setMessages(prev => [
          ...prev, 
          { text: '', isUser: false, responseContainer: container }
        ]);
      } catch (err) {
        console.error("Exception:", err);
        setMessages(prev => [
          ...prev, 
          { text: `Error: ${err.message || 'Something went wrong'}`, isUser: false }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="app-container">
        <BodylessConversationEmbed 
          ref={conversationRef}
          worksheetId="e0e6f5e3-bd1d-4919-89ed-e458d64dc5c4"
        />
        
        <div className="tabs">
          <button 
            className={activeTab === 'liveboard' ? 'active' : ''} 
            onClick={() => setActiveTab('liveboard')}
          >
            Liveboard
          </button>
          <button 
            className={activeTab === 'chat' ? 'active' : ''} 
            onClick={() => setActiveTab('chat')}
          >
            Chat Interface
          </button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
        
        {activeTab === 'liveboard' ? (
          <div className="liveboard-container">
            <LiveboardEmbed 
              frameProps={{
               width: "100%",
               height: "calc(100vh - 50px)",
              }} 
              liveboardId="46f1a485-31ed-46f8-990e-a41a101f6ff4"
            />
          </div>
        ) : (
          <div className="chat-container">
            <div className="messages-container">
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`message ${msg.isUser ? 'user-message' : 'ts-message'}`}
                >
                  {msg.isUser ? (
                    <div className="message-content">{msg.text}</div>
                  ) : msg.responseContainer ? (
                    <div 
                      className="message-content"
                      ref={el => {
                        if (el && msg.responseContainer && !el.contains(msg.responseContainer)) {
                          el.appendChild(msg.responseContainer);
                        }
                      }}
                    />
                  ) : (
                    <div className="message-content">{msg.text}</div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="message ts-message">
                  <div className="message-content loading">Thinking...</div>
                </div>
              )}
            </div>
            
            <form 
              className="input-container"
              onSubmit={e => {
                e.preventDefault();
                sendMessage(inputText);
              }}
            >
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Ask a question about your data..."
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading || !inputText.trim()}>
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    );
};

export default App;
