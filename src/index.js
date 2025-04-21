import React, { Component, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";

import "./styles/index.css";

// Lazy load components for better performance
// Using dynamic imports for code splitting
const Modal = lazy(() => import("./components/Modal/Modal"));
const Loading = lazy(() => import("./components/Loading/Loading"));

// Fallback loading component for Suspense
const LoadingFallback = () => (
  <div className="loading">
    <div className="loading-spinner"></div>
  </div>
);


// Optimized Square component using React.memo
const Square = React.memo(function Square({ squares, handleChange, onCellFocus }) {
  const { id, value, prefilled, incorrect } = squares;
  
  const doChange = React.useCallback((e) => {
    handleChange(e.target.value, e.target.id);
  }, [handleChange]);

  const onFocusHandler = React.useCallback(() => {
    if (onCellFocus) {
      onCellFocus(id);
    }
  }, [onCellFocus, id]);

  const className = incorrect
    ? "square square-red"
    : prefilled
    ? "square square-grey"
    : "square square-white";

  return (
    <td>
      <div className={className}>
        <input
          inputMode="numeric"
          size="2"
          maxLength="1"
          type="text"
          autoComplete="off"
          onChange={doChange}
          onFocus={onFocusHandler}
          value={value || ""}
          id={id}
          disabled={prefilled}
        />
      </div>
    </td>
  );
}, (prevProps, nextProps) => {
  const prev = prevProps.squares;
  const next = nextProps.squares;
  return (
    prev.value === next.value &&
    prev.incorrect === next.incorrect &&
    prev.prefilled === next.prefilled
  );
});

// Optimized Neighbors component using React.memo
const Neighbors = React.memo(function Neighbors({ squares, onChange: handleChange, onCellFocus }) {
  return (
    <table>
      <tbody>
        {[0, 3, 6].map(rowStart => (
          <tr key={rowStart}>
            {[0, 1, 2].map(colOffset => {
              const index = rowStart + colOffset;
              return (
                <Square
                  key={index}
                  squares={squares[index]}
                  handleChange={handleChange}
                  onCellFocus={onCellFocus}
                />
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}, (prevProps, nextProps) => {
  const prevSquares = prevProps.squares;
  const nextSquares = nextProps.squares;
  
  // Fast reference equality check first
  if (prevSquares === nextSquares) return true;
  
  // Deep comparison for value and incorrect properties
  for (let i = 0; i < prevSquares.length; i++) {
    if (
      prevSquares[i].value !== nextSquares[i].value ||
      prevSquares[i].incorrect !== nextSquares[i].incorrect
    ) {
      return false;
    }
  }
  return true;
});

// Optimized Column component using React.memo and useMemo
const Column = React.memo(function Column({ squares, handleChange, onCellFocus }) {
  // Memoize the sliced squares arrays to prevent unnecessary re-renders
  const neighborSquares = React.useMemo(() => [
    squares.slice(0, 9),
    squares.slice(9, 18),
    squares.slice(18, 27)
  ], [squares]);

  return (
    <div className="column">
      {neighborSquares.map((squareGroup, index) => (
        <Neighbors
          key={index}
          squares={squareGroup}
          onChange={handleChange}
          onCellFocus={onCellFocus}
        />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  const prevSquares = prevProps.squares;
  const nextSquares = nextProps.squares;
  
  // Fast reference equality check first
  if (prevSquares === nextSquares) return true;
  
  // Deep comparison for value and incorrect properties
  for (let i = 0; i < prevSquares.length; i++) {
    if (
      prevSquares[i].value !== nextSquares[i].value ||
      prevSquares[i].incorrect !== nextSquares[i].incorrect
    ) {
      return false;
    }
  }
  return true;
});

// Cell class for managing individual Sudoku cells
class Cell {
  constructor(id, value, prefilled) {
    this.id = id;
    this.value = value;
    this.prefilled = prefilled;
    this.incorrect = false;
  }
}

// Pre-generated board templates to avoid expensive computation on load
// Removed unused BOARD_TEMPLATES constant

class Board extends Component {
  constructor(props) {
    super(props);
    this.filledSquares = 81;
    
    // Create a fast-loading initial board
    const initialBoard = this.createFastInitialBoard('medium');
    
    this.state = {
      incorrectValues: [],
      correctBoard: [],
      history: [
        {
          squares: initialBoard,
        },
      ],
      stepNumber: 0,
      filledSquares: 41, // For medium difficulty
      wrongAttempts: 0,
      showModal: false,
      showLoseModal: false,
      timer: 0,
      isActive: false,
      difficulty: 'medium',
      selectedCell: null,
      loading: false, // Start with false since we have a fast initial board
      streak: 0, // Track winning streak
      bestTime: localStorage.getItem('sudoku_best_time') || Infinity,
      highlightedCells: new Set() // Track highlighted cells efficiently
    };
    
    // Initialize timers
    this.timerInterval = null;
    this.highlightDebounceTimeout = null;
    
    // Bind all methods in constructor
    this.handleCellFocus = this.handleCellFocus.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleNumberPadClick = this.handleNumberPadClick.bind(this);
    this.resetGame = this.resetGame.bind(this);
    this.undo = this.undo.bind(this);
    this.checkSolution = this.checkSolution.bind(this);
    this.solveSolution = this.solveSolution.bind(this);
    this.startTimer = this.startTimer.bind(this);
    this.stopTimer = this.stopTimer.bind(this);
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    this.createFastInitialBoard = this.createFastInitialBoard.bind(this);
    this.generateProperBoard = this.generateProperBoard.bind(this);
    this.formatTime = this.formatTime.bind(this);
  }

  // Create a fast initial board to display immediately
  createFastInitialBoard(difficulty) {
    // Create basic 9x9 grid with some predefined values
    const board = [];
    for (let i = 0; i < 81; i++) {
      // Sample initial Sudoku pattern
      const patterns = {
        'easy': [1, 2, 3, 4, 5, 6, 7, 8, 9, 7, 8, 9, 1, 2, 3, 4, 5, 6, 4, 5, 6, 7, 8, 9, 1, 2, 3], 
        'medium': [5, 3, null, null, 7, null, null, null, null, 6, null, null, 1, 9, 5, null, null, null, null, 9, 8, null, null, null, null, 6, null],
        'hard': [null, null, null, 2, 6, null, 7, null, 1, 6, 8, null, null, 7, null, null, 9, null, 1, 9, null, null, null, 4, 5, null, null]
      };
      
      const pattern = patterns[difficulty] || patterns.medium;
      const patternIndex = i % pattern.length;
      
      board.push(new Cell(
        i, 
        pattern[patternIndex],
        pattern[patternIndex] !== null
      ));
    }
    return board;
  }

  componentDidMount() {
    // Start timer immediately
    this.startTimer();
    
    // Use requestIdleCallback for non-critical tasks if available
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        this.generateProperBoard(this.state.difficulty);
      }, { timeout: 1000 });
    } else {
      // Fallback to requestAnimationFrame
      requestAnimationFrame(() => {
        this.generateProperBoard(this.state.difficulty);
      });
    }
    
    // Add event listener for beforeunload to warn about leaving during game
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  // Generate proper board without blocking UI
  generateProperBoard(difficulty) {
    const board = this.generateBoard([]);
    let edgeBoard = JSON.parse(JSON.stringify(board));
    
    let removedCells;
    switch(difficulty) {
      case 'easy':
        removedCells = 30;
        break;
      case 'hard':
        removedCells = 50;
        break;
      default: // medium
        removedCells = 40;
    }
    
    this.setState({
      correctBoard: board,
      history: [
        {
          squares: this.removeSquares(edgeBoard, removedCells),
        },
      ],
      filledSquares: this.filledSquares - removedCells,
      loading: false
    });
  }

  componentDidUpdate(prevProps, prevState) {
    // Only check for completion if relevant state has changed
    if (
      prevState.filledSquares !== this.state.filledSquares ||
      prevState.stepNumber !== this.state.stepNumber
    ) {
      const current = this.state.history[this.state.stepNumber];
      
      if (
        this.state.filledSquares >= 81 && 
        current && current.squares && 
        !this.incorrectBoardCheck(current.squares) && 
        this.state.isActive
      ) {
        this.stopTimer();
        if (!this.state.showModal) {
          this.setState({ showModal: true });
        }
      }
    }
  }

  componentWillUnmount() {
    this.stopTimer();
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }
  
  // Warn user before leaving if game is in progress
  handleBeforeUnload = (e) => {
    if (this.state.isActive && !this.state.showModal && this.state.filledSquares > 0) {
      e.preventDefault();
      e.returnValue = 'You have an unfinished game. Are you sure you want to leave?';
      return e.returnValue;
    }
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      this.setState(prevState => ({
        timer: prevState.timer + 1
      }));
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.setState({ isActive: false });
    }
  }

  resetGame(difficulty) {
    this.setState({ loading: true });
    
    // First display a fast initial board
    const initialBoard = this.createFastInitialBoard(difficulty);
    let filledCount = 0;
    initialBoard.forEach(cell => {
      if (cell.value !== null) filledCount++;
    });
    
    this.stopTimer();
    
    this.setState({
      history: [{ squares: initialBoard }],
      stepNumber: 0,
      filledSquares: filledCount,
      wrongAttempts: 0,
      showModal: false,
      showLoseModal: false,
      timer: 0,
      isActive: true,
      difficulty: difficulty,
      selectedCell: null,
      loading: false,
    }, () => {
      this.startTimer();
      // Generate proper board in background with better performance
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          this.generateProperBoard(difficulty);
        }, { timeout: 1000 });
      } else {
        requestAnimationFrame(() => {
          this.generateProperBoard(difficulty);
        });
      }
    });
  }

  formatTime(time) {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  undo() {
    const step = this.state.stepNumber;
    if (step > 0) {
      const newHistory = [...this.state.history.slice(0, step)];
      this.setState({
        stepNumber: step - 1,
        filledSquares: this.state.filledSquares - 1,
        history: newHistory,
      });
    }
  }

  render() {
    const { loading, history, stepNumber, difficulty, timer, showModal, showLoseModal, wrongAttempts, streak, bestTime } = this.state;
    
    if (loading) {
      return <Loading />;
    }
    
    const current = history[stepNumber];
    const bestTimeDisplay = bestTime !== Infinity ? this.formatTime(bestTime) : '--:--';
    
    return (
      <div className="sudoku-container">
        <h1>Sudoku</h1>
        
        <div className="difficulty-selector">
          <select 
            value={difficulty} 
            onChange={(e) => this.resetGame(e.target.value)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        
        <div className="stats-container">
          <div className="timer">
            Time: {this.formatTime(timer)}
          </div>
          <div className="timer">
            Best: {bestTimeDisplay}
          </div>
          {streak > 0 && (
            <div className="timer">
              Streak: {streak}
            </div>
          )}
        </div>
        
        <div className="attempts-indicator">
          {Array(3).fill(0).map((_, i) => (
            <span 
              key={i} 
              className={`attempt-dot ${i < wrongAttempts ? 'attempt-used' : ''}`}
            ></span>
          ))}
        </div>
        
        <div className="sudoku-board">
          <Column
            squares={current.squares.slice(0, 27)}
            handleChange={this.handleChange}
            onCellFocus={this.handleCellFocus}
          />
          <Column
            squares={current.squares.slice(27, 54)}
            handleChange={this.handleChange}
            onCellFocus={this.handleCellFocus}
          />
          <Column
            squares={current.squares.slice(54, 81)}
            handleChange={this.handleChange}
            onCellFocus={this.handleCellFocus}
          />
        </div>
        
        <div className="game-controls">
          <button onClick={this.undo}>Undo</button>
          <button onClick={this.solveSolution}>Solve</button>
          <button onClick={() => this.resetGame(difficulty)}>New Game</button>
          <button onClick={this.checkSolution}>Check Solution</button>
        </div>
        
        <div className="number-pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button 
              key={num} 
              className="number-btn"
              onClick={() => this.handleNumberPadClick(num)}
            >
              {num}
            </button>
          ))}
          <button 
            className="number-btn" 
            onClick={() => this.handleNumberPadClick(null)}
          >
            Clear
          </button>
        </div>
        
        {/* Use Suspense for lazy-loaded Modal component */}
        <Suspense fallback={<LoadingFallback />}>
          {showModal && (
            <Modal 
              title="Congratulations!" 
              message={`You completed the ${difficulty} puzzle in ${this.formatTime(timer)}!${bestTime === timer ? ' That\'s a new best time!' : ''}`}
              onClose={() => this.setState({ showModal: false })}
              onNewGame={() => this.resetGame(difficulty)}
            />
          )}
          
          {showLoseModal && (
            <Modal 
              title="Game Over" 
              message={`You've made 3 wrong attempts. Try again with a new game!`}
              onClose={() => this.setState({ showLoseModal: false })}
              onNewGame={() => this.resetGame(difficulty)}
            />
          )}
        </Suspense>
      </div>
    );
  }



  handleCellFocus(id) {
    if (id === undefined || id === null) return;
    
    this.setState({ selectedCell: id });
    
    if (this.highlightDebounceTimeout) {
      clearTimeout(this.highlightDebounceTimeout);
    }
    
    this.highlightDebounceTimeout = setTimeout(() => {
      const current = this.state.history[this.state.stepNumber];
      const selectedCell = current?.squares?.[id];
      if (!selectedCell?.value) return;
      
      const selectedValue = selectedCell.value;
      const newHighlightedCells = new Set();
      
      // Optimize cell highlighting by using array methods
      current.squares.forEach((square, index) => {
        if (square.value === selectedValue) {
          newHighlightedCells.add(index);
        }
      });
      
      this.setState({ highlightedCells: newHighlightedCells }, () => {
        requestAnimationFrame(() => {
          const oldHighlights = document.querySelectorAll('.highlight-same');
          const newHighlights = new Set();
          
          // Batch DOM operations
          oldHighlights.forEach(cell => {
            const inputId = parseInt(cell.querySelector('input')?.id);
            if (!newHighlightedCells.has(inputId)) {
              cell.classList.remove('highlight-same');
            } else {
              newHighlights.add(inputId);
            }
          });
          
          // Only add new highlights that don't already exist
          newHighlightedCells.forEach(cellId => {
            if (!newHighlights.has(cellId)) {
              const cell = document.getElementById(cellId)?.parentNode;
              cell?.classList.add('highlight-same');
            }
          });
        });
      });
    }, 150);
  }

  handleNumberPadClick(value) {
    if (this.state.selectedCell !== null) {
      this.handleChange(value, this.state.selectedCell);
    }
  }

  handleChange(value, id) {
    // Avoid state updates when input is invalid
    if (value !== null && (isNaN(Number(value)) || value === "0" || Number(value) >= 10)) {
      return;
    }
    
    const history = this.state.history.slice(0, this.state.stepNumber + 1);
    const current = history[history.length - 1];
    // Avoid deep copy if possible, mutate carefully or use shallow copy + update
    const squares = current.squares.map(cell => ({ ...cell })); // Shallow copy cells
    
    const previousValue = squares[id].value;
    const numValue = Number(value) || null;
    squares[id].value = numValue;
    
    // Calculate filled squares delta
    let filledSquaresDelta = 0;
    if (numValue !== null && previousValue === null) {
      filledSquaresDelta = 1;
    } else if (numValue === null && previousValue !== null) {
      filledSquaresDelta = -1;
    }

    let isIncorrect = false;
    if (numValue !== null) {
      // Check only immediate conflicts, not full board solvability
      if (!this.validSpace(squares, id, numValue)) {
        squares[id].incorrect = true;
        isIncorrect = true;
        
        // Handle wrong attempts
        this.setState((prevState) => {
          const wrongAttempts = prevState.wrongAttempts + 1;
          if (wrongAttempts >= 3) {
            this.stopTimer();
            // Use functional update to avoid race conditions
            return {
              wrongAttempts,
              showLoseModal: true,
              isActive: false
            };
          }
          return { wrongAttempts };
        });
      } else {
        squares[id].incorrect = false; // Mark as correct if valid
      }
    } else {
      squares[id].incorrect = false; // Clear incorrect flag if cell is cleared
    }
    
    // Make a single state update
    this.setState(prevState => ({
      history: history.concat([{ squares }]),
      stepNumber: history.length,
      filledSquares: prevState.filledSquares + filledSquaresDelta,
      solved: false,
    }));
    
    // Highlight matching numbers after change or clear highlights if cell cleared
    this.handleCellFocus(id);
  }

  usedInCol(squares, index, target) {
    let baseIndex = Math.floor(index / 27) * 27 + (index % 3);
    for (let i = baseIndex; i < baseIndex + 27; i += 3) {
      if (
        index !== i &&
        squares[i] &&
        squares[i].value === target &&
        target &&
        i !== index
      ) {
        return true;
      }
    }
    return false;
  }

  usedInSquare(squares, index, target) {
    let baseIndex = Math.floor(index / 9) * 9;
    for (let i = baseIndex; i < baseIndex + 9; i++) {
      if (
        index !== i &&
        squares[i] &&
        squares[i].value === target &&
        target // Ensure target is not null
      ) {
        return true;
      }
    }
    return false;
  }

  incorrectBoardCheck(squares) {
    for (let i = 0; i < 81; i++) {
      if (squares[i].incorrect) {
        return true;
      }
    }
    return false;
  }

  solveSolution() {
    const history = this.state.history;
    const current = history[this.state.stepNumber];
    const squares = JSON.parse(JSON.stringify(current.squares));
    
    // Show loading indicator during solve
    this.setState({ loading: true });
    
    // Use requestAnimationFrame to avoid blocking UI
    requestAnimationFrame(() => {
      try {
        const solved = this.backTracking(squares);
        if (solved) {
          this.setState({
            history: history.concat([{ squares }]),
            stepNumber: history.length,
            filledSquares: 81,
            loading: false,
            solved: true
          });
        } else {
          this.setState({
            loading: false,
            showModal: true,
            modalMessage: "No solution exists for this puzzle."
          });
        }
      } catch (error) {
        console.error("Error solving puzzle:", error);
        this.setState({
          loading: false,
          showModal: true,
          modalMessage: "An error occurred while solving the puzzle."
        });
      }
    });
  }

  usedInRow(squares, index, target) {
    try {
      const baseIndex = 3 * Math.floor(index / 3) - 27 * Math.floor(index / 27);
      
      for (let i = 0; i < 9; i++) {
        const adjustedIndex = baseIndex + (i % 3) + Math.floor(i / 3) * 27;
        // Make sure the adjusted index is valid and not the same as original index
        if (
          adjustedIndex >= 0 && 
          adjustedIndex < 81 && 
          adjustedIndex !== index &&
          squares[adjustedIndex] &&
          squares[adjustedIndex].value === target &&
          target // Ensure target is not null
        ) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error in usedInRow:", error, "Index:", index, "Target:", target);
      return false; // Return false on error to avoid blocking game
    }
  }

  // Removed usedInCompletedRow function as it was redundant

  initializeEmptylist(squares) {
    for (let i = 0; i < 81; i++) {
      squares[i] = new Cell(i, null);
    }
  }

  // Optimize backtracking algorithm
  backTracking(squares) {
    const index = this.findUnassignedLocation(squares);
    if (index < 0) {
      return true;
    }
    
    // Create a shuffled array of numbers 1-9 for better performance
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    
    for (let i = 0; i < 9; i++) {
      const num = numbers[i];
      if (this.isSafeCell(squares, index, num)) {
        squares[index].value = num;

        if (this.backTracking(squares)) {
          return true;
        }

        squares[index].value = null;
      }
    }
    return false;
  }

  findUnassignedLocation(squares) {
    for (let i = 0; i < 81; i++) {
      if (squares[i].value === null) {
        return i;
      }
    }
    return -1;
  }

  isSafeCell(squares, index, target) {
    if (
      this.usedInCol(squares, index, target) ||
      this.usedInSquare(squares, index, target) ||
      this.usedInRow(squares, index, target)
    ) {
      return false;
    }
    return true;
  }

  checkSolution() {
    const current = this.state.history[this.state.stepNumber].squares;
    
    // Check if all cells are filled
    if (current.some(cell => cell.value === null)) {
      this.showToast("Please fill all cells first!");
      return false;
    }
    
    // Check for any cells marked as incorrect during input
    if (this.incorrectBoardCheck(current)) {
      this.showToast("There are incorrect values in your solution. Check the red cells.");
      return false;
    }
    
    this.setState({ loading: true });
    
    // Use setTimeout to avoid UI blocking during validation
    setTimeout(() => {
      let isValid = true;
      // Validate rows, columns, and 3x3 squares
      for (let i = 0; i < 9; i++) {
        if (!this.isSetValid(this.getRow(current, i)) || 
            !this.isSetValid(this.getCol(current, i)) || 
            !this.isSetValid(this.getSquare(current, i))) {
          isValid = false;
          break;
        }
      }
      
      this.setState({ loading: false });
      
      if (isValid) {
        const currentTime = this.state.timer;
        let newBestTime = this.state.bestTime;
        
        if (currentTime < this.state.bestTime) {
          newBestTime = currentTime;
          localStorage.setItem('sudoku_best_time', currentTime);
        }
        
        const newStreak = this.state.streak + 1;
        
        this.setState({ 
          showModal: true,
          isActive: false,
          streak: newStreak,
          bestTime: newBestTime
        });
        this.stopTimer();
        return true;
      } else {
        this.showToast("There's a conflict in your solution. Please check again.");
        return false;
      }
    }, 50);
  }

  // Helper function to get a row
  getRow(squares, rowIndex) {
    const row = [];
    const start = rowIndex * 9;
    for (let i = 0; i < 9; i++) {
      row.push(squares[start + i].value);
    }
    return row;
  }

  // Helper function to get a column
  getCol(squares, colIndex) {
    const col = [];
    for (let i = 0; i < 9; i++) {
      col.push(squares[colIndex + i * 9].value);
    }
    return col;
  }

  // Helper function to get a 3x3 square
  getSquare(squares, squareIndex) {
    const square = [];
    const rowStart = Math.floor(squareIndex / 3) * 3;
    const colStart = (squareIndex % 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        square.push(squares[(rowStart + i) * 9 + (colStart + j)].value);
      }
    }
    return square;
  }

  // Helper function to check if a set (row, col, square) is valid
  isSetValid(set) {
    const filteredSet = set.filter(num => num !== null);
    return new Set(filteredSet).size === filteredSet.length;
  }
  
  // Show toast notification instead of alert
  showToast(message) {
    // Create toast element if it doesn't exist
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      document.body.appendChild(toast);
    }
    
    // Set message and show toast
    toast.className = 'toast show';
    toast.textContent = message;
    
    // Hide toast after 3 seconds
    setTimeout(() => {
      toast.className = toast.className.replace('show', '');
    }, 3000);
  }

  generateBoard(squares) {
    this.initializeEmptylist(squares);
    this.fillSquare(squares, 0);
    this.fillSquare(squares, 36);
    this.fillSquare(squares, 72);
    this.backTracking(squares);
    return squares;
  }

  removeSquares(squares, difficulty = 40) {
    let i = 0;
    while (i < difficulty) {
      let val = Math.floor(Math.random() * 81);
      if (squares[val].value !== null) {
        squares[val].value = null;
        squares[val].prefilled = false;
        i++;
      }
    }
    return squares;
  }

  fillSquare(squares, index) {
    for (let i = 0; i < 9; i++) {
      let random;
      do {
        random = Math.floor(Math.random() * 9 + 1);
      } while (!this.isSafeCell(squares, index, random));
      squares[index + i].value = random;
    }
  }

  validSpace(squares, index, random) {
    // Use usedInRow instead of the removed usedInCompletedRow
    if (
      this.usedInRow(squares, index, random) ||
      this.usedInCol(squares, index, random) ||
      this.usedInSquare(squares, index, random)
    ) {
      return false;
    }
    return true;
  }
}

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Suspense fallback={<LoadingFallback />}>
      <Board />
    </Suspense>
  </React.StrictMode>
);

