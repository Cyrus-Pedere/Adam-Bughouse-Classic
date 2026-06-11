# Adam-Bughouse-Classic
Bughouse chess study tool - 2-board simultaneous chess with piece drops

# Bughouse Classic - Chess Study Tool

A complete, standalone web application for playing and studying Bughouse chess (also known as Double Chess or Tandem Chess). This tool supports two simultaneous boards where captured pieces from one board can be dropped on the partner board.

## Features

- **Two synchronized chess boards** (Board A and Board B) with proper piece dropping mechanics
- **Full chess rules** including castling, en passant, and pawn promotion
- **Local gameplay** with configurable computer opponents (random move bots)
- **Custom position setup** - Drag and drop pieces to create any position
- **Multiple time control options**:
  - Standard (minutes per player)
  - Increment (Fisher-style)
  - Delay (Bronstein-style)
- **Game notation** with CSV export/import
- **Undo/Redo** functionality for both setup mode and active games
- **Play/Pause** controls for game state management
- **Responsive design** with touch support for mobile devices

## How to Play

Bughouse is played on two boards with four players (or two players controlling both boards). Pieces captured on one board are added to the partner board's pool, where they can be dropped as reinforcements.

- **Board A**: White pieces at the bottom, Black at the top
- **Board B**: Black pieces at the bottom, White at the top (rotated orientation)
- Captured white pieces from Board A go to Board B's white pool
- Captured black pieces from Board B go to Board A's black pool
- Drops can be made on any empty square (pawns cannot be dropped on the first or last rank)

## Technical Details

- Pure HTML/CSS/JavaScript - no external dependencies for core gameplay
- Firebase is optional and not required for basic functionality
- SVG-based chess pieces using standard Unicode chess symbols
- Drag-and-drop interface with visual feedback
- Local storage for error logging and debugging

## Getting Started

1. Clone the repository
2. Open `index.html` in any modern web browser
3. Use the Setup panel to configure players and positions
4. Click "Play!" to start the game

## File Structure
bughouse-classic/
├── index.html # Main application page
├── style.css # Styling and responsive design
├── bughouse.js # Core game logic
├── pieces/ # Chess piece images
│ ├── whiteking.png
│ ├── blackking.png
│ └── ...
└── README.md # This file

text

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers with touch support

## License

MIT License - feel free to use, modify, and distribute.

## Acknowledgments

- Chess piece images from standard open-source sets
- Built as a study tool for Bughouse chess strategy
Longer Description (for GitHub README.md):
markdown
# ♜ Bughouse Classic

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A feature-rich web application for playing and analyzing **Bughouse chess** (also known as Double Chess, Tandem Chess, or Siamese Chess). This tool provides a complete offline experience for studying the unique dynamics of two-board chess where captured pieces become reinforcements.

## 🎯 What is Bughouse?

Bughouse is a chess variant played on two boards with four players in teams of two. When a player captures a piece on their board, that piece is passed to their teammate, who can then "drop" it on their board on any empty square. This creates a fast-paced, highly tactical game where piece coordination between teammates is crucial.

## ✨ Features

### Core Gameplay
- **Two synchronized boards** - Board A and Board B with proper piece transfer mechanics
- **Full chess rules** - All standard moves including castling, en passant, and promotion
- **Piece drops** - Captured pieces appear in partner's pool and can be dropped strategically
- **Legal move highlighting** - Visual indicators for valid moves and captures
- **Check/Checkmate/Stalemate detection** - Automatic game state management

### Game Modes
- **Human vs Human** - Play all four seats manually for study purposes
- **Human vs Computer** - Challenge the random-move bot
- **Computer vs Computer** - Watch bots play for entertainment or analysis

### Position Setup
- **Drag-and-drop interface** - Place any piece on any square
- **Delete pieces** - Remove pieces by dragging to trash bin
- **Preset positions** - Clear to kings only or reset to starting position
- **Setup undo/redo** - Full history tracking during position setup

### Time Controls
- **No clock** - Untimed practice mode
- **Standard** - Fixed minutes per player
- **Increment (Fisher)** - Bonus seconds added after each move
- **Delay (Bronstein)** - Grace period before clock starts counting

### Notation & Analysis
- **Move notation** - Automatic recording in standard bughouse format (e.g., "1LW e2-e4")
- **CSV Export/Import** - Save and load games for later analysis
- **Jump to move** - Click any notation entry to navigate game history
- **Undo/Redo** - Full move history navigation

### Visual Design
- **Side clocks** - Displays near each board for easy reference
- **Pool visualization** - Shows available pieces with quantity counters
- **Promoted piece indicators** - Visual distinction for promoted pawns
- **Responsive layout** - Adapts to different screen sizes
- **Touch support** - Works on mobile devices

## 🚀 Quick Start

1. **Open the application** - Simply open `index.html` in your browser
2. **Configure players** - In the Setup panel, check boxes to assign players to seats
3. **Set time controls** - Choose clock mode and time limits
4. **Adjust position** - Drag pieces to set up custom positions (optional)
5. **Start playing** - Click "Play!" and begin moving pieces

## 🎮 How to Play

### Piece Movement
- Click a piece to select it (legal moves will highlight)
- Click a highlighted square to move
- Drag pieces for more intuitive control

### Captured Pieces
- Captured pieces appear in the partner board's pool area
- Click a piece in the pool to select it, then click a square to drop it
- Dropped pawns cannot be placed on the first or last rank

### Bughouse Notation Format
The notation follows standard bughouse format:
- `LW` = Board A White move
- `LB` = Board A Black move  
- `RW` = Board B White move
- `RB` = Board B Black move

Example: `6LW Nf3-g5` means move number 6, Board A White, knight from f3 to g5

## 🛠️ Technical Implementation

- **Pure JavaScript** - No frameworks, minimal dependencies
- **Canvas-less rendering** - Uses HTML/CSS for better touch interaction
- **Modular architecture** - Separated concerns between UI and game logic
- **Local storage** - King capture errors logged for debugging
- **Firebase optional** - Core gameplay works completely offline

## 📁 Project Structure
bughouse-classic/
│
├── index.html # Main application HTML
├── style.css # All styling and animations
├── bughouse.js # Complete game logic (8000+ lines)
│
├── pieces/ # Chess piece images (SVG/PNG)
│ ├── whiteking.png
│ ├── whitequeen.png
│ ├── whiterook.png
│ ├── whitebishop.png
│ ├── whiteknight.png
│ ├── whitepawn.png
│ ├── blackking.png
│ ├── blackqueen.png
│ ├── blackrook.png
│ ├── blackbishop.png
│ ├── blackknight.png
│ └── blackpawn.png
│
└── README.md # Documentation

text

## 🔧 Customization

### Adding New Time Controls
Modify the `setupClockModeListeners()` method in `bughouse.js` to add new clock modes.

### Changing Bot Difficulty
The current bot makes random legal moves. Implement `getBestMove()` in place of `getRandomMove()` for stronger AI.

### Modifying Piece Images
Replace images in the `/pieces` directory with your own (keep same filenames and dimensions).

## 🐛 Known Issues

- King capture attempts trigger error logging (by design - captures king should never be possible)
- Some checkmate positions may be detected as stalemate (rare edge cases)
- Touch devices may experience minor drag latency

## 🤝 Contributing

While this project is currently in maintenance mode, contributions for bug fixes are welcome.

1. Fork the repository
2. Create a feature branch
3. Submit a pull request with clear description of changes

## 📄 License

MIT License - See LICENSE file for details

## 👤 Author

Adam Scarchilli - Bughouse Study Tool

## 🙏 Acknowledgments

- Chess piece icons from standard open-source sets
- Inspired by the need for a dedicated bughouse analysis tool
- Built for chess players who love the tactical chaos of bughouse
