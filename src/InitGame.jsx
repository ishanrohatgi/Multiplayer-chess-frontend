import React, { useState } from 'react';
import socket from './socket';
import './InitGame.css';

function InitGame({ setRoom, setOrientation, setPlayers, showDialog }) {
  const [roomInput, setRoomInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const createRoom = async () => {
    setIsCreating(true);

    try {
      const response = await new Promise((resolve) => {
        socket.emit('createRoom', resolve);
      });

      if (response.error) {
        showDialog('Error', response.message);
      } else {
        setRoom(response);
        setOrientation('white'); // Room creator is white
        setPlayers([{ username: 'You' }]); // Initialize with current player
        showDialog('Room Created', `Room created successfully! Share this room ID with your opponent: ${response}`);
      }
    } catch (error) {
      showDialog('Error', 'Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const joinRoom = async () => {
    if (!roomInput.trim()) {
      showDialog('Error', 'Please enter a room ID');
      return;
    }

    setIsJoining(true);

    try {
      const response = await new Promise((resolve) => {
        socket.emit('joinRoom', { roomId: roomInput }, resolve);
      });

      if (response.error) {
        showDialog('Error', response.message);
      } else {
        setRoom(roomInput);
        setOrientation('black'); // Room joiner is black
        setPlayers(response.players || []); // Ensure players is always an array
        showDialog('Joined Room', `Successfully joined room ${roomInput}!`);
      }
    } catch (error) {
      showDialog('Error', 'Failed to join room. Please check the room ID and try again.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="init-game">
      <div className="init-container">
        <div className="welcome-section">
          <h2>Welcome to Chess!</h2>
          <p>Create a new game room or join an existing one to start playing.</p>
        </div>

        <div className="game-options">
          <div className="option-card">
            <div className="option-header">
              <h3>Create New Game</h3>
              <div className="option-icon">🆕</div>
            </div>
            <p>Start a new game and invite a friend to play with you.</p>
            <button
              onClick={createRoom}
              disabled={isCreating}
              className="option-btn create-btn"
            >
              {isCreating ? 'Creating...' : 'Create Room'}
            </button>
          </div>

          <div className="divider">
            <span>OR</span>
          </div>

          <div className="option-card">
            <div className="option-header">
              <h3>Join Existing Game</h3>
              <div className="option-icon">🔗</div>
            </div>
            <p>Enter a room ID to join a game created by another player.</p>

            <div className="join-form">
              <input
                type="text"
                placeholder="Enter Room ID"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    joinRoom();
                  }
                }}
                className="room-input"
              />
              <button
                onClick={joinRoom}
                disabled={isJoining || !roomInput.trim()}
                className="option-btn join-btn"
              >
                {isJoining ? 'Joining...' : 'Join Room'}
              </button>
            </div>
          </div>
        </div>

        <div className="instructions">
          <h4>How to Play:</h4>
          <ul>
            <li>One player creates a room and shares the Room ID</li>
            <li>The other player joins using the Room ID</li>
            <li>The room creator plays as White and moves first</li>
            <li>Drag and drop pieces to make your moves</li>
            <li>The game follows standard chess rules</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default InitGame;