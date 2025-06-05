import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { init, logout, AuthType } from '@thoughtspot/visual-embed-sdk';
import {
  LiveboardEmbed,
  SpotterAgentEmbed,
  useEmbedRef,
  HostEvent,
} from '@thoughtspot/visual-embed-sdk/react';
import {
  createConfiguration,
  ServerConfiguration,
  ThoughtSpotRestApi,
} from '@thoughtspot/rest-api-sdk';
import './App.css';

const isProduction = true;

// Configuration for online deployment (public values)
const ONLINE_CONFIG = {
  thoughtSpotHost: process.env.REACT_APP_THOUGHTSPOT_HOST,
  username: process.env.REACT_APP_USERNAME,
  tokenServer: process.env.REACT_APP_TOKEN_SERVER,
  authType: AuthType.TrustedAuthTokenCookieless,
  worksheetId: process.env.REACT_APP_WORKSHEET_ID,
  liveboardId: process.env.REACT_APP_LIVEBOARD_ID,
};

// Configuration for local development (private values)
const LOCAL_CONFIG = {
  thoughtSpotHost: process.env.REACT_APP_LOCAL_THOUGHTSPOT_HOST,
  username: process.env.REACT_APP_LOCAL_USERNAME,
  secretKey: process.env.REACT_APP_LOCAL_SECRET_KEY,
  authType: 'AuthServer',
  worksheetId: process.env.REACT_APP_LOCAL_WORKSHEET_ID,
  liveboardId: process.env.REACT_APP_LOCAL_LIVEBOARD_ID,
};

const CONFIG = isProduction ? ONLINE_CONFIG : LOCAL_CONFIG;
const TOKEN_ENDPOINT = `${CONFIG.tokenServer}/api/gettoken/${CONFIG.username}`;

const getAuthToken = async () => {
  if (isProduction) {
    const response = await fetch(TOKEN_ENDPOINT);
    return response.text();
  } else {
    const config = createConfiguration({
      baseServer: new ServerConfiguration(CONFIG.thoughtSpotHost, {}),
    });
    const tsRestApiClient = new ThoughtSpotRestApi(config);
    
    const data = await tsRestApiClient.getFullAccessToken({
      username: CONFIG.username,
      secret_key: CONFIG.secretKey,
      validity_time_in_sec: 30000,
    });
    return data.token;
  }
};

init({
  thoughtSpotHost: CONFIG.thoughtSpotHost,
  authType: CONFIG.authType,
  getAuthToken: getAuthToken
});

const Message = memo(({ msg }) => {
  const messageContentRef = useRef(null);
  
  useEffect(() => {
    if (msg.container && messageContentRef.current) {
      if (messageContentRef.current.childElementCount === 0) {
        messageContentRef.current.innerHTML = '';
        messageContentRef.current.appendChild(msg.container);
      }
    }
  }, [msg.container]);
  
  return (
    <div className={`message ${msg.isUser ? 'user-message' : 'ts-message'}`}>
      {msg.isUser ? (
        <div className="message-content">{msg.text}</div>
      ) : msg.container ? (
        <div 
          className="message-content ts-response" 
          ref={messageContentRef}
        />
      ) : (
        <div className="message-content">{msg.text}</div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.msg.id === nextProps.msg.id;
});

const MessagesContainer = memo(({ messages, isLoading, messagesEndRef, messagesContainerRef }) => {
  return (
    <div className="messages-container" ref={messagesContainerRef}>
      {messages.map((msg, index) => (
        <Message key={msg.id || index} msg={msg} />
      ))}
      
      {isLoading && (
        <div className="message ts-message">
          <div className="message-content loading">Thinking...</div>
        </div>
      )}
      
      <div ref={messagesEndRef} style={{ float: 'left', clear: 'both' }} />
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.messages.length === nextProps.messages.length && 
         prevProps.isLoading === nextProps.isLoading;
});

const App = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [activeTab, setActiveTab] = useState('liveboard');
    
    const liveboardRef = useEmbedRef();
    const conversationRef = useEmbedRef();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [displayText, setDisplayText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    
    const scrollToBottom = useCallback(() => {
      if (messagesEndRef.current && messagesContainerRef.current) {
        setTimeout(() => {
          messagesEndRef.current.scrollIntoView({ 
            behavior: 'smooth',
            block: 'end'
          });
        }, 100);
      }
    }, []);
    
    useEffect(() => {
      scrollToBottom();
    }, [messages, scrollToBottom]);
    
    useEffect(() => {
      const sessionCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('TS_SESSION='));
      if (sessionCookie) setIsLoggedIn(true);
    }, []);
    
    useEffect(() => {
      if (activeTab === 'chat' && inputRef.current && !isLoading) {
        setTimeout(() => {
          inputRef.current.focus();
        }, 100);
      }
    }, [activeTab, isLoading]);
  
    const handleLogout = () => {
      logout();
      setIsLoggedIn(false);
    };
  
    const handleInputChange = useCallback((e) => {
      setDisplayText(e.target.value);
    }, []);
    
    const sendMessage = async text => {
      if (!text.trim() || !conversationRef.current) return;
  
      setInputText('');
      setDisplayText('');
      
      setMessages(prev => [...prev, { text, isUser: true, id: `user-${Date.now()}` }]);
      
      setIsLoading(true);
      
      try {
        scrollToBottom();
        
        const response = await conversationRef.current.sendMessage(text);
        console.log('Response:', response);
        const { container, error } = response;
        
        if (error) {
          console.error('Error:', error);
          setMessages(prev => [
            ...prev,
            { text: `Error: ${error.message || 'Failed to get response'}`, isUser: false, id: `error-${Date.now()}` },
          ]);
          return;
        }

        setMessages(prev => [
          ...prev,
          { text: '', isUser: false, container, id: `ts-${Date.now()}` },
        ]);
        
        setTimeout(scrollToBottom, 200);
      } catch (err) {
        console.error('Exception:', err);
        setMessages(prev => [
          ...prev,
          { text: `Error: ${err.message || 'Something went wrong'}`, isUser: false, id: `error-${Date.now()}` },
        ]);
      } finally {
        setIsLoading(false);
        setTimeout(() => {
          if (inputRef.current) inputRef.current.focus();
        }, 200);
      }
    };

    // const handleFullScreenModeToggle = useCallback(() => {
    //   liveboardRef.current.trigger(HostEvent.Present);
    // }, []);
    const handleFullScreenModeToggle = useCallback(() => {
      const iframe = document.querySelector('iframe');
    
      if (!iframe) {
        console.warn('No iframe found on the page');
        return;
      }
    
      if (iframe.requestFullscreen) {
        iframe.requestFullscreen();
      } else if (iframe.webkitRequestFullscreen) {
        iframe.webkitRequestFullscreen();
      } else if (iframe.mozRequestFullScreen) {
        iframe.mozRequestFullScreen();
      } else if (iframe.msRequestFullscreen) {
        iframe.msRequestFullscreen();
      } else {
        console.error('Fullscreen API is not supported by this browser.');
      }
    }, []);
    
    

    const setTab = useCallback((tab) => {
      setActiveTab(tab);
    }, []);

    const handleSubmit = useCallback((e) => {
      e.preventDefault();
      sendMessage(displayText);
    }, [displayText]);

    return (
      <div className="app-container">
        <SpotterAgentEmbed 
          ref={conversationRef}
          worksheetId={CONFIG.worksheetId}
          className="bodyless-embed"
        />
        
        <div className="tabs">
          <button 
            className={activeTab === 'liveboard' ? 'active' : ''} 
            onClick={() => setTab('liveboard')}
          >
            Liveboard
          </button>
          <button 
            className={activeTab === 'chat' ? 'active' : ''} 
            onClick={() => setTab('chat')}
          >
            Chat Interface
          </button>
          <button
            className={activeTab === 'chat' ? 'active' : ''} 
            onClick={() => handleFullScreenModeToggle()}
          >
            FullScreen Mode Toggle
          </button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
        
        {activeTab === 'liveboard' ? (
          <div className="liveboard-container">
            <LiveboardEmbed
              className="liveboard-div"
              preRenderId="h-i-i"
              ref={liveboardRef}
              liveboardId={CONFIG.liveboardId}
            />
          </div>
        ) : (
          <div className="chat-container">
            <MessagesContainer 
              messages={messages}
              isLoading={isLoading}
              messagesEndRef={messagesEndRef}
              messagesContainerRef={messagesContainerRef}
            />
            
            <form 
              className="input-container"
              onSubmit={handleSubmit}
            >
              <input
                type="text"
                ref={inputRef}
                value={displayText}
                onChange={handleInputChange}
                placeholder="Ask a question about your data..."
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading || !(displayText.trim())}>
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    );
};

export default App;
