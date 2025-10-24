import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [backendStatus, setBackendStatus] = useState('Checking...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Function to check backend connection
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/health');
        const data = await response.json();
        if (data.status === 'ok') {
          setBackendStatus('✅ Connected to Backend!');
        } else {
          setBackendStatus('⚠️ Backend is not responding correctly');
        }
      } catch (error) {
        setBackendStatus('❌ Could not connect to Backend');
        console.error('Error connecting to backend:', error);
      } finally {
        setLoading(false);
      }
    };

    checkBackend();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>React + FastAPI Full Stack App</h1>
        <div className="connection-status">
          <h3>Backend Status: {backendStatus}</h3>
          {loading && <p>Testing connection to backend...</p>}
        </div>
        <p className="instructions">
          Frontend is running on port 3000
          <br />
          Backend API is running on port 8000
        </p>
      </header>
    </div>
  );
}

export default App;
