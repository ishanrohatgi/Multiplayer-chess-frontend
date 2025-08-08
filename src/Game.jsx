import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import socket from './socket';
import './Game.css';

function Game({ room, orientation, username, players = [], showDialog }) {
  const chess = useMemo(() => new Chess(), []);
  const [fen, setFen] = useState(chess.fen());
  const [over, setOver] = useState('');
  const [moveHistory, setMoveHistory] = useState([]);

  // Click-to-move state
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [squareStyles, setSquareStyles] = useState({});

  // Captured pieces state
  const [capturedPieces, setCapturedPieces] = useState({
    white: [],
    black: []
  });

  // Game state validation
  const [gameReady, setGameReady] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(true);

  // Piece symbols for display
  const pieceSymbols = {
    'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚',
    'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔'
  };

  // Check if game is ready to start
  useEffect(() => {
    console.log('🔍 Checking game readiness. Players:', players);
    console.log('🔍 Players length:', players?.length);

    const bothPlayersPresent = players && players.length >= 2;
    setGameReady(bothPlayersPresent);
    setWaitingForOpponent(!bothPlayersPresent);

    console.log('🎮 Game ready:', bothPlayersPresent);
    console.log('⏳ Waiting for opponent:', !bothPlayersPresent);

    if (bothPlayersPresent) {
      console.log('✅ Both players present - game can start!');
    } else {
      console.log('⏳ Waiting for second player to join...');
    }
  }, [players]);

  // Listen for moves from opponent
  useEffect(() => {
    socket.on('move', (move) => {
      console.log('🔄 Received move from opponent:', move);

      try {
        const result = chess.move(move);

        if (result) {
          // Handle captured pieces
          if (result.captured) {
            const capturedPiece = result.captured;
            const capturedBy = result.color === 'w' ? 'white' : 'black';

            setCapturedPieces(prev => ({
              ...prev,
              [capturedBy]: [...prev[capturedBy], capturedPiece]
            }));
          }

          setFen(chess.fen());
          clearSelection();

          setMoveHistory(prev => [...prev, {
            move: result.san,
            player: result.color === 'w' ? 'White' : 'Black',
            time: new Date().toLocaleTimeString(),
            captured: result.captured || null
          }]);

          checkGameStatus();
        }
      } catch (error) {
        console.error('❌ Error processing opponent move:', error);
      }
    });

    socket.on('gameReset', () => {
      chess.reset();
      setFen(chess.fen());
      setOver('');
      setMoveHistory([]);
      setCapturedPieces({ white: [], black: [] });
      clearSelection();
      showDialog('Game Reset', 'Your opponent has reset the game.');
    });

    return () => {
      socket.off('move');
      socket.off('gameReset');
    };
  }, [chess, showDialog]);

  // Clear all selections and highlights
  const clearSelection = useCallback(() => {
    setSelectedSquare(null);
    setPossibleMoves([]);
    setSquareStyles({});
  }, []);

  // Check game status
  const checkGameStatus = useCallback(() => {
    if (chess.isGameOver()) {
      if (chess.isCheckmate()) {
        const winner = chess.turn() === 'w' ? 'Black' : 'White';
        setOver(`Checkmate! ${winner} wins!`);
        showDialog('Game Over', `Checkmate! ${winner} wins!`);
      } else if (chess.isDraw()) {
        setOver('Draw');
        showDialog('Game Over', 'The game ended in a draw.');
      }
    } else if (chess.isCheck()) {
      const checkedKing = chess.turn() === 'w' ? 'White' : 'Black';
      showDialog('Check!', `${checkedKing} king is in check!`);
    }
  }, [chess, showDialog]);

  // Get possible moves for a piece
  const getPossibleMoves = useCallback((square) => {
    const moves = chess.moves({
      square: square,
      verbose: true
    });

    return moves.map(move => move.to);
  }, [chess]);

  // Highlight squares
  const highlightSquares = useCallback((square, moves) => {
    const styles = {};

    styles[square] = {
      backgroundColor: 'rgba(255, 255, 0, 0.8)'
    };

    moves.forEach(moveSquare => {
      const piece = chess.get(moveSquare);

      if (piece) {
        styles[moveSquare] = {
          backgroundColor: 'rgba(255, 0, 0, 0.7)',
          borderRadius: '50%'
        };
      } else {
        styles[moveSquare] = {
          backgroundColor: 'rgba(0, 255, 0, 0.6)',
          borderRadius: '50%'
        };
      }
    });

    setSquareStyles(styles);
  }, [chess]);

  // Make a move with game state validation
  const makeAMove = useCallback((move) => {
    console.log('🎯 Attempting to make move:', move);

    // CRITICAL: Check if game is ready before allowing moves
    if (!gameReady) {
      console.log('❌ Game not ready - both players must join first');
      showDialog('Game Not Ready', 'Please wait for your opponent to join the game before making moves.');
      return null;
    }

    if (waitingForOpponent) {
      console.log('❌ Still waiting for opponent');
      showDialog('Waiting for Opponent', 'Your opponent must join before you can start playing.');
      return null;
    }

    try {
      const currentTurn = chess.turn();
      const ourColor = orientation === 'white' ? 'w' : 'b';

      if (currentTurn !== ourColor) {
        showDialog('Invalid Move', 'It is not your turn!');
        return null;
      }

      const result = chess.move(move);

      if (result) {
        console.log('✅ Move successful:', result.san);

        // Handle captured pieces
        if (result.captured) {
          const capturedPiece = result.captured;
          const capturedBy = result.color === 'w' ? 'white' : 'black';

          setCapturedPieces(prev => ({
            ...prev,
            [capturedBy]: [...prev[capturedBy], capturedPiece]
          }));
        }

        setFen(chess.fen());
        clearSelection();

        setMoveHistory(prev => [...prev, {
          move: result.san,
          player: result.color === 'w' ? 'White' : 'Black',
          time: new Date().toLocaleTimeString(),
          captured: result.captured || null
        }]);

        socket.emit('move', {
          move: move,
          room: room
        });

        checkGameStatus();
        return result;
      } else {
        showDialog('Invalid Move', 'That move is not legal!');
        return null;
      }
    } catch (error) {
      console.error('❌ Error making move:', error);
      return null;
    }
  }, [chess, orientation, room, showDialog, checkGameStatus, clearSelection, gameReady, waitingForOpponent]);

  // Handle square clicks with game state validation
  const onSquareClick = useCallback((square) => {
    console.log(`🖱️ Square clicked: ${square}`);

    // CRITICAL: Don't allow clicks if game not ready
    if (!gameReady) {
      console.log('❌ Game not ready - ignoring click');
      showDialog('Game Not Ready', 'Please wait for your opponent to join before making moves.');
      return;
    }

    if (waitingForOpponent) {
      console.log('❌ Still waiting for opponent - ignoring click');
      showDialog('Waiting for Opponent', 'Your opponent must join before you can start playing.');
      return;
    }

    const currentTurn = chess.turn();
    const ourColor = orientation === 'white' ? 'w' : 'b';

    if (currentTurn !== ourColor) {
      showDialog('Not Your Turn', 'Please wait for your opponent to move.');
      return;
    }

    if (selectedSquare && possibleMoves.includes(square)) {
      const moveData = {
        from: selectedSquare,
        to: square,
        promotion: 'q'
      };

      makeAMove(moveData);
      return;
    }

    const piece = chess.get(square);

    if (!piece || piece.color !== ourColor) {
      clearSelection();
      return;
    }

    if (selectedSquare === square) {
      clearSelection();
      return;
    }

    const moves = getPossibleMoves(square);

    if (moves.length === 0) {
      showDialog('No Moves', 'This piece has no legal moves available.');
      clearSelection();
      return;
    }

    setSelectedSquare(square);
    setPossibleMoves(moves);
    highlightSquares(square, moves);
  }, [chess, orientation, selectedSquare, possibleMoves, makeAMove, getPossibleMoves, highlightSquares, clearSelection, showDialog, gameReady, waitingForOpponent]);

  // Reset game
  const resetGame = () => {
    chess.reset();
    setFen(chess.fen());
    setOver('');
    setMoveHistory([]);
    setCapturedPieces({ white: [], black: [] });
    clearSelection();

    socket.emit('gameReset', { room });
  };

  // Helper functions
  const getPlayerInfo = (color) => {
    if (!players || players.length < 2) {
      return waitingForOpponent ? 'Waiting for player...' : 'Unknown';
    }

    const playerIndex = orientation === color ? 0 : 1;
    return players[playerIndex]?.username || 'Anonymous';
  };

  const getCurrentTurn = () => {
    return chess.turn() === 'w' ? 'white' : 'black';
  };

  const isMyTurn = () => {
    const currentTurn = getCurrentTurn();
    return currentTurn === orientation;
  };

  // Calculate scores
  const pieceValues = { p: 1, r: 5, n: 3, b: 3, q: 9, k: 0 };
  const getScore = (pieces) => {
    return pieces.reduce((total, piece) => {
      const value = pieceValues[piece.toLowerCase()] || 0;
      return total + value;
    }, 0);
  };

  return (
    <div className="game-container">
      {/* Header */}
      <div className="game-header">
        <div className="game-title">
          <h1>Chess Game</h1>
          <div className="room-badge">Room: {room}</div>
        </div>

        {/* Game Status Indicator */}
        {waitingForOpponent && (
          <div style={{
            background: 'rgba(255, 193, 7, 0.9)',
            color: '#856404',
            padding: '10px 20px',
            borderRadius: '20px',
            marginTop: '10px',
            fontWeight: '600',
            fontSize: '14px'
          }}>
            ⏳ Waiting for opponent to join... ({players?.length || 0}/2 players)
          </div>
        )}

        {gameReady && (
          <div style={{
            background: 'rgba(40, 167, 69, 0.9)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '20px',
            marginTop: '10px',
            fontWeight: '600',
            fontSize: '14px'
          }}>
            ✅ Game Ready - Both players joined!
          </div>
        )}
      </div>

      {/* Main Game */}
      <div className="game-main">
        {/* Black Player */}
        <div className="left-sidebar">
          <div className="player-section">
            <div className="player-header">
              <div className="player-avatar black">♛</div>
              <div className="player-info">
                <div className="player-name">{getPlayerInfo('black')}</div>
                <div className="player-color">Black</div>
              </div>
              <div className="player-score">{getScore(capturedPieces.black)}</div>
            </div>

            <div className="captured-pieces">
              <h4>Captured ({capturedPieces.black.length})</h4>
              <div className="pieces-container">
                {capturedPieces.black.length === 0 ? (
                  <span className="no-captures">None</span>
                ) : (
                  capturedPieces.black.map((piece, index) => (
                    <span key={index} className="captured-piece">
                      {pieceSymbols[piece]}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Game Status */}
          <div className="game-status-card">
            <div className="turn-indicator">
              <div className={`turn-badge ${getCurrentTurn()}`}>
                {getCurrentTurn() === 'white' ? '♔' : '♛'} 
                <span>{getCurrentTurn() === 'white' ? 'White' : 'Black'} to move</span>
              </div>

              {!gameReady ? (
                <div style={{ color: '#ffc107', fontWeight: '600', fontSize: '12px' }}>
                  ⏳ Waiting for opponent to join
                </div>
              ) : isMyTurn() ? (
                <div className="my-turn-indicator">🟢 Your Turn</div>
              ) : (
                <div className="opponent-turn-indicator">⏳ Opponent's Turn</div>
              )}
            </div>

            {selectedSquare && gameReady && (
              <div className="selection-info">
                <div className="selected-piece">
                  Selected: <strong>{selectedSquare.toUpperCase()}</strong>
                </div>
                <div className="possible-moves">
                  {possibleMoves.length} possible moves
                </div>
              </div>
            )}

            {over && (
              <div className="game-over-card">
                <div className="game-over-text">{over}</div>
              </div>
            )}
          </div>
        </div>

        {/* Chessboard */}
        <div className="board-container">
          <Chessboard
            position={fen}
            onSquareClick={onSquareClick}
            boardOrientation={orientation}
            customSquareStyles={squareStyles}
            arePiecesDraggable={false}
            areSquaresClickable={gameReady && !over}
            animationDuration={200}
          />

          <div className="game-instructions">
            <div className="instruction-card">
              <h4>How to Play</h4>
              {!gameReady ? (
                <div style={{ textAlign: 'center', color: '#666' }}>
                  <p>⏳ Waiting for your opponent to join...</p>
                  <p style={{ fontSize: '12px', marginTop: '5px' }}>
                    Share the room code: <strong>{room}</strong>
                  </p>
                </div>
              ) : (
                <div className="steps">
                  <div className="step">
                    <span className="step-number">1</span>
                    <span>Click your piece</span>
                  </div>
                  <div className="step">
                    <span className="step-number">2</span>
                    <span>See highlighted moves</span>
                  </div>
                  <div className="step">
                    <span className="step-number">3</span>
                    <span>Click destination</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* White Player & Controls */}
        <div className="right-sidebar">
          <div className="player-section">
            <div className="player-header">
              <div className="player-avatar white">♔</div>
              <div className="player-info">
                <div className="player-name">{getPlayerInfo('white')}</div>
                <div className="player-color">White</div>
              </div>
              <div className="player-score">{getScore(capturedPieces.white)}</div>
            </div>

            <div className="captured-pieces">
              <h4>Captured ({capturedPieces.white.length})</h4>
              <div className="pieces-container">
                {capturedPieces.white.length === 0 ? (
                  <span className="no-captures">None</span>
                ) : (
                  capturedPieces.white.map((piece, index) => (
                    <span key={index} className="captured-piece">
                      {pieceSymbols[piece]}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Move History */}
          <div className="move-history-card">
            <div className="card-header">
              <h3>Moves</h3>
              <span className="move-count">{moveHistory.length}</span>
            </div>

            <div className="moves-container">
              {moveHistory.length === 0 ? (
                <div className="no-moves">
                  <span>Ready to start!</span>
                  <small>{gameReady ? 'Make your first move' : 'Waiting for opponent...'}</small>
                </div>
              ) : (
                moveHistory.map((move, index) => (
                  <div key={index} className="move-entry">
                    <div className="move-info">
                      <span className="move-number">{Math.floor(index / 2) + 1}</span>
                      <span className="move-notation">{move.move}</span>
                      {move.captured && (
                        <span className="captured-indicator">
                          ⚔️ {pieceSymbols[move.captured]}
                        </span>
                      )}
                    </div>
                    <div className="move-meta">
                      <span className="move-player">{move.player}</span>
                      <span className="move-time">{move.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="controls-card">
            <button 
              onClick={resetGame} 
              className="reset-button"
              disabled={!gameReady}
              style={{
                opacity: gameReady ? 1 : 0.6,
                cursor: gameReady ? 'pointer' : 'not-allowed'
              }}
            >
              🔄 New Game
            </button>

            <div className="game-stats">
              <div className="stat-item">
                <span className="stat-label">Players</span>
                <span className="stat-value">{players?.length || 0}/2 joined</span>
              </div>

              <div className="stat-item">
                <span className="stat-label">Material Balance</span>
                <div className="material-balance">
                  <span className="white-score">W: {getScore(capturedPieces.white)}</span>
                  <span className="black-score">B: {getScore(capturedPieces.black)}</span>
                </div>
              </div>

              <div className="stat-item">
                <span className="stat-label">Status</span>
                <span className="stat-value">
                  {over || (gameReady ? 'Active' : 'Waiting')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Game;