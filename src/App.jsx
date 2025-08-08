import React, { useState, useEffect } from 'react';
import Game from './Game';
import InitGame from './InitGame';
import CustomDialog from './Components/CustomDialog';
import socket from './socket';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [usernameSubmitted, setUsernameSubmitted] = useState(false);
  const [room, setRoom] = useState('');
  const [orientation, setOrientation] = useState('');
  const [players, setPlayers] = useState([]); // Initialize as empty array

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogContent, setDialogContent] = useState('');

  useEffect(() => {
    // Listen for room updates
    socket.on('opponentJoined', (roomData) => {
      console.log('Opponent joined', roomData);
      // Ensure we always have an array
      setPlayers(roomData.players || []);
    });

    socket.on('playerDisconnected', () => {
      setDialogTitle('Player Disconnected');
      setDialogContent('Your opponent has disconnected. You can wait for them to reconnect or start a new game.');
      setIsDialogOpen(true);
    });

    return () => {
      socket.off('opponentJoined');
      socket.off('playerDisconnected');
    };
  }, []);

  const showDialog = (title, content) => {
    setDialogTitle(title);
    setDialogContent(content);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
  };

  return (
    <div className="app">
      <div className="app-header">
        <h1 className='game-title'>Chess Legends 👑</h1>
        {username && (
          <div className="user-info">
            <span>Welcome, {username}!</span>
          </div>
        )}
      </div>

      {!usernameSubmitted ? (
        <div className="username-form">
          <div className="form-container">
            <h2>Enter Your Name</h2>
            <input
              type="text"
              placeholder="Your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && username.trim()) {
                  setUsernameSubmitted(true);
                  socket.emit('username', username);
                }
              }}
            />
            <button
              onClick={() => {
                if (username.trim()) {
                  setUsernameSubmitted(true);
                  socket.emit('username', username);
                }
              }}
              disabled={!username.trim()}
            >
              Continue
            </button>
          </div>
        </div>
      ) : !room ? (
        <InitGame
          setRoom={setRoom}
          setOrientation={setOrientation}
          setPlayers={setPlayers}
          showDialog={showDialog}
        />
      ) : (
        <Game
          room={room}
          orientation={orientation}
          username={username}
          players={players} // This will now always be an array
          showDialog={showDialog}
        />
      )}

      <CustomDialog
        open={isDialogOpen}
        title={dialogTitle}
        contentText={dialogContent}
        handleClose={closeDialog}
      />
    </div>
  );
}

export default App;