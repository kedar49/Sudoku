import React, { Component, lazy, Suspense } from "react";
import ReactDOM from "react-dom";
import Cell from "./components/Cell/cell";
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


// Memoized Square component to prevent unnecessary renders
class Square extends Component {
  constructor(props) {
    super(props);
    this.state = {
      id: props.squares.id,
      value: props.squares.value,
      prefilled: props.squares.prefilled,
    };
    
    // Bind methods once in constructor
    this.doChange = this.doChange.bind(this);
    this.onFocus = this.onFocus.bind(this);
  }
  
  // Only update if props changed
  shouldComponentUpdate(nextProps) {
    const current = this.props.squares;
    const next = nextProps.squares;
    
    return (
      current.value !== next.value ||
      current.incorrect !== next.incorrect ||
      current.prefilled !== next.prefilled
    );
  }

  doChange(e) {
    this.setState({
      value: e.target.value,
    });
    this.props.handleChange(e.target.value, e.target.id);
  }

  onFocus() {
    if (this.props.onCellFocus) {
      this.props.onCellFocus(this.state.id);
    }
  }

  render() {
    let className = this.state.prefilled
      ? "square square-grey"
      : "square square-white";
    if (this.props.squares.incorrect) {
      className = "square square-red";
    }

    return (
      <td>
        <div className={className}>
          <input
            inputMode="numeric"
            size="2"
            maxLength="1"
            type="text"
            autoComplete="off"
            onChange={this.doChange}
            onFocus={this.onFocus}
            value={this.props.squares.value || ""}
            id={this.state.id}
            disabled={this.state.prefilled}
          />
        </div>
      </td>
    );
  }
}

// Optimize Neighbors with shouldComponentUpdate
class Neighbors extends Component {
  shouldComponentUpdate(nextProps) {
    const currentSquares = this.props.squares;
    const nextSquares = nextProps.squares;
    
    // Check if any square has changed before re-rendering
    for (let i = 0; i < currentSquares.length; i++) {
      if (
        currentSquares[i].value !== nextSquares[i].value ||
        currentSquares[i].incorrect !== nextSquares[i].incorrect
      ) {
        return true;
      }
    }
    return false;
  }
  
  render() {
    return (
      <table>
        <tbody>
          <tr>
            <Square
              squares={this.props.squares[0]}
              handleChange={this.props.onChange}
              onCellFocus={this.props.onCellFocus}
            />
            <Square
              squares={this.props.squares[1]}
              handleChange={this.props.onChange}
              onCellFocus={this.props.onCellFocus}
            />
            <Square
              squares={this.props.squares[2]}
              handleChange={this.props.onChange}
              onCellFocus={this.props.onCellFocus}
            />
          </tr>
          <tr>
            <Square
              squares={this.props.squares[3]}
              handleChange={this.props.onChange}
              onCellFocus={this.props.onCellFocus}
            />
            <Square
              squares={this.props.squares[4]}
              handleChange={this.props.onChange}
              onCellFocus={this.props.onCellFocus}
            />
            <Square
              squares={this.props.squares[5]}
              handleChange={this.props.onChange}
              onCellFocus={this.props.onCellFocus}
            />
          </tr>
          <tr>
            <Square
              squares={this.props.squares[6]}
              handleChange={this.props.onChange}
              onCellFocus={this.props.onCellFocus}
            />
            <Square
              squares={this.props.squares[7]}
              handleChange={this.props.onChange}
              onCellFocus={this.props.onCellFocus}
            />
            <Square
              squares={this.props.squares[8]}
              handleChange={this.props.onChange}
              onCellFocus={this.props.onCellFocus}
            />
          </tr>
        </tbody>
      </table>
    );
  }
}

// Optimize Column component
class Column extends Component {
  shouldComponentUpdate(nextProps) {
    // More efficient comparison without JSON.stringify
    const currentSquares = this.props.squares;
    const nextSquares = nextProps.squares;
    
    for (let i = 0; i < currentSquares.length; i++) {
      if (
        currentSquares[i].value !== nextSquares[i].value ||
        currentSquares[i].incorrect !== nextSquares[i].incorrect
      ) {
        return true;
      }
    }
    return false;
  }
  
  render() {
    return (
      <div className="column">
        <Neighbors
          squares={this.props.squares.slice(0, 9)}
          onChange={this.props.handleChange}
          onCellFocus={this.props.onCellFocus}
        />
        <Neighbors
          squares={this.props.squares.slice(9, 18)}
          onChange={this.props.handleChange}
          onCellFocus={this.props.onCellFocus}
        />
        <Neighbors
          squares={this.props.squares.slice(18, 27)}
          onChange={this.props.handleChange}
          onCellFocus={this.props.onCellFocus}
        />
      </div>
    );
  }
}

// Pre-generated board templates to avoid expensive computation on load
const BOARD_TEMPLATES = {
  easy: [
    /* Simple pre-filled board template with ~30 cells removed */
    { id: 0, value: 5, prefilled: true, incorrect: false },
    /* ... more cells ... */
  ],
  medium: [
    /* Medium pre-filled board template with ~40 cells removed */
    { id: 0, value: 9, prefilled: true, incorrect: false },
    /* ... more cells ... */
  ],
  hard: [
    /* Hard pre-filled board template with ~50 cells removed */
    { id: 0, value: 2, prefilled: true, incorrect: false },
    /* ... more cells ... */
  ]
};

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
      bestTime: localStorage.getItem('sudoku_best_time') || Infinity
    };
    this.timerInterval = null;
    
    // Bind methods in constructor
    this.handleCellFocus = this.handleCellFocus.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleNumberPadClick = this.handleNumberPadClick.bind(this);
    this.resetGame = this.resetGame.bind(this);
    this.undo = this.undo.bind(this);
    this.checkSolution = this.checkSolution.bind(this);
    this.solveSolution = this.solveSolution.bind(this);
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
    // Only proceed if id is valid
    if (id === undefined || id === null) return;
    
    this.setState({ selectedCell: id });
    
    // Use more efficient DOM operations with batch updates
    requestAnimationFrame(() => {
      try {
        // Remove all highlights first
        document.querySelectorAll('.highlight-same').forEach(cell => {
          cell.classList.remove('highlight-same');
        });
        
        // Then add highlights where needed
        const current = this.state.history[this.state.stepNumber];
        if (!current || !current.squares || !current.squares[id]) return;
        
        const selectedValue = current.squares[id].value;
        if (!selectedValue) return;
        
        // Batch DOM operations by getting references first
        const cellsToHighlight = [];
        for (let i = 0; i < 81; i++) {
          if (current.squares[i] && current.squares[i].value === selectedValue) {
            const cell = document.getElementById(i);
            if (cell && cell.parentNode) {
              cellsToHighlight.push(cell.parentNode);
            }
          }
        }
        
        // Apply highlights in a single animation frame
        if (cellsToHighlight.length > 0) {
          requestAnimationFrame(() => {
            cellsToHighlight.forEach(cell => {
              cell.classList.add('highlight-same');
            });
          });
        }
      } catch (error) {
        console.error("Error in handleCellFocus:", error);
      }
    });
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
    const squares = JSON.parse(JSON.stringify(current.squares));
    
    // Convert to number or null
    const numValue = Number(value) || null;
    squares[id].value = numValue;
    
    // Calculate filled squares delta more efficiently
    const filledSquaresDelta = numValue !== null ? 1 : -1;
    let isIncorrect = false;
    
    if (numValue !== null) {
      const backTrackTest = JSON.parse(JSON.stringify(squares));
      
      // Check if the move is valid
      if (!this.validSpace(backTrackTest, id, numValue) || !this.backTracking(backTrackTest)) {
        squares[id].incorrect = true;
        isIncorrect = true;
        
        // Handle wrong attempts
        this.setState((prevState) => {
          const wrongAttempts = prevState.wrongAttempts + 1;
          if (wrongAttempts >= 3) {
            // Show lose modal instead of alert
            this.stopTimer();
            this.setState({ 
              showLoseModal: true,
              isActive: false
            });
          }
          return { wrongAttempts };
        });
      }
    } else {
      squares[id].incorrect = false;
    }
    
    // Make a single state update
    this.setState({
      history: history.concat([{ squares }]),
      stepNumber: history.length,
      filledSquares: this.state.filledSquares + filledSquaresDelta,
      solved: false,
    });
    
    // Highlight matching numbers after change
    if (!isIncorrect && numValue !== null) {
      this.handleCellFocus(id);
    }
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
        target &&
        index !== i
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
    
    // Use setTimeout to prevent UI blocking
    setTimeout(() => {
      if (this.backTracking(squares) && !this.incorrectBoardCheck(squares)) {
        this.setState({
          history: history.concat([{ squares }]),
          stepNumber: history.length,
          filledSquares: 81,
          solved: true,
          loading: false
        });
      } else {
        this.setState({ loading: false });
        alert("This board cannot be solved. Try a new game.");
      }
    }, 100);
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
          target
        ) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error in usedInRow:", error);
      return false;
    }
  }

  usedInCompletedRow(squares, index, target) {
    let baseIndex = 3 * Math.floor(index / 3) - 27 * Math.floor(index / 27);
    for (let i = 0; i < 9; i++) {
      let adjustedIndex = baseIndex + (i % 3) + Math.floor(i / 3) * 27;
      if (
        index !== adjustedIndex &&
        squares[adjustedIndex] &&
        squares[adjustedIndex].value === target &&
        target
      ) {
        return true;
      }
    }
    return false;
  }

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
    
    // First check that all cells are filled
    for (let i = 0; i < 81; i++) {
      if (current[i].value === null) {
        // Use toast notification instead of alert
        this.showToast("Please fill all cells first!");
        return false;
      }
    }
    
    // Check for incorrect values
    if (this.incorrectBoardCheck(current)) {
      this.showToast("There are incorrect values in your solution. Check the red cells.");
      return false;
    }
    
    // Show loading during solution check
    this.setState({ loading: true });
    
    // Use setTimeout to avoid UI blocking
    setTimeout(() => {
      // Check all rows, columns, and squares
      let isValid = true;
      for (let i = 0; i < 81; i++) {
        if (!this.validSpace(current, i, current[i].value)) {
          isValid = false;
          break;
        }
      }
      
      this.setState({ loading: false });
      
      if (isValid) {
        // Update best time if current time is better
        const currentTime = this.state.timer;
        let newBestTime = this.state.bestTime;
        
        if (currentTime < this.state.bestTime) {
          newBestTime = currentTime;
          localStorage.setItem('sudoku_best_time', currentTime);
        }
        
        // Update streak
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
    if (
      this.usedInCompletedRow(squares, index, random) ||
      this.usedInCol(squares, index, random) ||
      this.usedInSquare(squares, index, random)
    ) {
      return false;
    }
    return true;
  }
}

ReactDOM.render(
  <React.StrictMode>
    <Suspense fallback={<LoadingFallback />}>
      <Board />
    </Suspense>
  </React.StrictMode>,
  document.getElementById("root")
);

