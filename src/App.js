import React, { useState, useEffect, useCallback } from 'react';
import { init, logout, AuthType } from '@thoughtspot/visual-embed-sdk';
import {
  LiveboardEmbed,
  useEmbedRef,
  HostEvent,
} from '@thoughtspot/visual-embed-sdk/react';
import {
  createConfiguration,
  ServerConfiguration,
  ThoughtSpotRestApi,
} from '@thoughtspot/rest-api-sdk';
import './App.css';

// Configuration for local development (private values)
const LOCAL_CONFIG = {
  thoughtSpotHost: process.env.REACT_APP_LOCAL_THOUGHTSPOT_HOST,
  username: process.env.REACT_APP_LOCAL_USERNAME,
  secretKey: process.env.REACT_APP_LOCAL_SECRET_KEY,
  authType: 'None',
  liveboardId: process.env.REACT_APP_LOCAL_LIVEBOARD_ID,
};

const CONFIG = LOCAL_CONFIG;

const getAuthToken = async () => {
    const config = createConfiguration({
      baseServer: new ServerConfiguration(CONFIG.thoughtSpotHost, {}),
    });
    const tsRestApiClient = new ThoughtSpotRestApi(config);
    
    const data = await tsRestApiClient.getFullAccessToken({
      username: CONFIG.username,
      password: CONFIG.secretKey,
      validity_time_in_sec: 30000,
    });
    return data.token;
  };

init({
  thoughtSpotHost: CONFIG.thoughtSpotHost,
  authType: CONFIG.authType,
  getAuthToken: getAuthToken
});

const App = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    
    const liveboardRef = useEmbedRef();
    
    useEffect(() => {
      const sessionCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('TS_SESSION='));
      if (sessionCookie) setIsLoggedIn(true);
    }, []);
  
    const handleLogout = () => {
      logout();
      setIsLoggedIn(false);
    };

    const handleFullScreenModeToggle = useCallback(() => {
      // const iframe = document.querySelector('iframe');
    
      // if (!iframe) {
      //   console.warn('No iframe found on the page');
      //   return;
      // }
    
      // if (iframe.requestFullscreen) {
      //   iframe.requestFullscreen();
      // } else if (iframe.webkitRequestFullscreen) {
      //   iframe.webkitRequestFullscreen();
      // } else if (iframe.mozRequestFullScreen) {
      //   iframe.mozRequestFullScreen();
      // } else if (iframe.msRequestFullscreen) {
      //   iframe.msRequestFullscreen();
      // } else {
      //   console.error('Fullscreen API is not supported by this browser.');
      // }
      liveboardRef.current.trigger(HostEvent.Present);
    }, []);

    return (
      <div className="app-container">
        <div className="tabs">
          <button 
            className="active"
          >
            Liveboard
          </button>
          <button
            onClick={() => handleFullScreenModeToggle()}
          >
            FullScreen Mode Toggle
          </button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
        
        <div className="liveboard-container">
          <LiveboardEmbed
            className="liveboard-div"
            preRenderId="h-i-i"
            ref={liveboardRef}
            liveboardId={CONFIG.liveboardId}
            fullScreen={true}
            onExitPresentMode={() => {
              console.log('onExitPresentMode called bro');
            }}
          />
        </div>
      </div>
    );
};

export default App;
