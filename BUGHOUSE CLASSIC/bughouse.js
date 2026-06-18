// ============================================================
// BUGHOUSE CLASSIC - Study Tool with Sound Effects
// Pure local gameplay with bots, no multiplayer, no pairs mode
// ============================================================

class BughouseStudyTool {
    constructor() {
        this.boards = {
            a: this.createBoardState('a'),
            b: this.createBoardState('b')
        };
        
        this.pools = {
            fromA: { white: [], black: [] },
            fromB: { white: [], black: [] }
        };
        
        this.reserves = {
            a: { white: [], black: [] },
            b: { white: [], black: [] }
        };
        
        this.promotedPieces = new Map();
        
        this.currentAction = {
            type: null,
            board: null,
            piece: null,
            source: null,
            color: null,
            poolIndex: null
        };
        
        this.moveHistory = [];
        this.setupHistory = [];
        this.setupMoveHistory = [];
        this.setupRedoStack = [];
        this.enPassantTarget = { a: null, b: null };
        this.castlingRights = {
            a: { white: { kingside: true, queenside: true }, black: { kingside: true, queenside: true } },
            b: { white: { kingside: true, queenside: true }, black: { kingside: true, queenside: true } }
        };
        
        this.boardOrientation = {
            a: 'white-on-top',
            b: 'white-on-bottom'
        };
        
        this.dragging = {
            isDragging: false,
            source: null,
            boardId: null,
            fromSquare: null,
            piece: null,
            pieceData: null,
            ghost: null,
            startX: 0,
            startY: 0,
            fromReserve: null,
            fromPalette: false
        };
        
        this.setupMode = {
            enabled: false,
            playerToStart: { a: 'white', b: 'white' }
        };
        
        this.pieceOrder = ['pawn', 'knight', 'bishop', 'rook', 'queen'];
        this.activePromotion = null;
        
        this.clockMode = 'none';
        this.clocks = {
            a: { white: 0, black: 0, active: null, lastUpdate: null, increment: 0, delay: 0, lastDelayTime: null, paused: false },
            b: { white: 0, black: 0, active: null, lastUpdate: null, increment: 0, delay: 0, lastDelayTime: null, paused: false }
        };
        this.clockInterval = null;
        this.gameActive = false;
        this.isPaused = false;
        this.firstMoveMade = { a: false, b: false };
        
        this.bots = {
            a: { white: null, black: null },
            b: { white: null, black: null }
        };
        this.botMoveInterval = null;
        this.botMoveDelay = 3000;
        this.botActive = false;
        this.lastBotMoveTime = 0;
        this.isProcessingBotMove = false;
        
        this.moveNotation = [];
        this.boardMoveCounters = { LW: 1, LB: 1, RW: 1, RB: 1 };
        this.redoStack = [];
        this.currentNotationIndex = -1;
        
        this.playerRoster = ['Computer'];
        this.seatAssignments = [null, null, null, null];
        
        // Sound effects
        this.sounds = {
            move: null,
            start: null,
            capture: null,
            castle: null,
            stalemate: null,
            check: null,
            checkmate: null,
            gameover: null
        };
        this.soundEnabled = true;
        this.soundVolume = 0.5;
        
        this.init();
        this.initSounds();
    }

    createBoardState(boardId) {
        return {
            id: boardId,
            position: new Map(),
            turn: 'white',
            selectedSquare: null,
            legalMoves: new Map(),
            captured: { white: [], black: [] },
            check: false,
            checkmate: false,
            stalemate: false
        };
    }

    init() {
        const styleId = 'bughouse-coord-fix';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = '.chess-board{overflow:visible!important;}.chess-board .coordinate{position:absolute;font-family:"Inter",sans-serif;font-weight:600;font-size:11px;color:#4a5568;pointer-events:none;user-select:none;z-index:1;line-height:1;}.sq-mate-hint{outline:3px solid #f6ad55!important;outline-offset:-3px;background-color:rgba(246,173,85,0.35)!important;}';
            document.head.appendChild(style);
        }

        this.setupInitialPositions();
        this.renderBoards();
        this.setupEventListeners();
        this.setupSetupModeUI();
        this.updatePools();
        this.updateClockDisplay('a');
        this.updateClockDisplay('b');
        this.updateNotationDisplay();
        this.updateStatus('Welcome! Configure your game in Setup.');
        setTimeout(() => this.toggleSetupMode(true), 100);
    }

    initSounds() {
        // Check if Audio is supported
        if (typeof Audio === 'undefined') {
            console.warn('Audio not supported in this browser');
            this.soundEnabled = false;
            return;
        }
        
        // Load sound files
        const soundFiles = ['move', 'start', 'capture', 'castle', 'stalemate', 'check', 'checkmate', 'gameover'];
        
        soundFiles.forEach(soundName => {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.src = `sounds/${soundName}.mp3`;
            audio.volume = this.soundVolume;
            
            // Handle load errors gracefully
            audio.addEventListener('error', (e) => {
                console.warn(`Could not load sound: sounds/${soundName}.mp3`);
            });
            
            this.sounds[soundName] = audio;
        });
        
        // Setup sound toggle button in header
        this.setupSoundToggle();
    }
    
    setupSoundToggle() {
        const soundBtn = document.getElementById('sound-toggle-btn');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => this.toggleSound());
            soundBtn.innerHTML = this.soundEnabled ? '🔊' : '🔇';
            soundBtn.title = this.soundEnabled ? 'Sound On' : 'Sound Off';
        }
    }
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const soundBtn = document.getElementById('sound-toggle-btn');
        if (soundBtn) {
            soundBtn.innerHTML = this.soundEnabled ? '🔊' : '🔇';
            soundBtn.title = this.soundEnabled ? 'Sound On' : 'Sound Off';
        }
        this.updateStatus(`Sound ${this.soundEnabled ? 'enabled' : 'disabled'}`);
    }
    
    playSound(soundName) {
        if (!this.soundEnabled) return;
        
        const sound = this.sounds[soundName];
        if (sound) {
            // Clone the audio to allow overlapping sounds
            const soundClone = sound.cloneNode();
            soundClone.volume = this.soundVolume;
            soundClone.play().catch(e => console.debug('Sound play failed:', e));
        }
    }
    
    playStartSound() {
        this.playSound('start');
    }
    
    playMoveSound(isCapture = false, isCastle = false) {
        if (isCastle) {
            this.playSound('castle');
        } else if (isCapture) {
            this.playSound('capture');
        } else {
            this.playSound('move');
        }
    }
    
    playCheckSound() {
        this.playSound('check');
    }
    
    playCheckmateSound() {
        this.playSound('checkmate');
    }
    
    playStalemateSound() {
        this.playSound('stalemate');
    }
    
    playGameOverSound() {
        this.playSound('gameover');
    }

    setupInitialPositions() {
        const boardA = this.boards['a'];
        boardA.position.clear();
        
        boardA.position.set('0,0', { type: 'rook', color: 'white', hasMoved: false });
        boardA.position.set('1,0', { type: 'knight', color: 'white', hasMoved: false });
        boardA.position.set('2,0', { type: 'bishop', color: 'white', hasMoved: false });
        boardA.position.set('3,0', { type: 'king', color: 'white', hasMoved: false });
        boardA.position.set('4,0', { type: 'queen', color: 'white', hasMoved: false });
        boardA.position.set('5,0', { type: 'bishop', color: 'white', hasMoved: false });
        boardA.position.set('6,0', { type: 'knight', color: 'white', hasMoved: false });
        boardA.position.set('7,0', { type: 'rook', color: 'white', hasMoved: false });
        
        for (let i = 0; i < 8; i++) {
            boardA.position.set(`${i},1`, { type: 'pawn', color: 'white', hasMoved: false });
        }
        
        boardA.position.set('0,7', { type: 'rook', color: 'black', hasMoved: false });
        boardA.position.set('1,7', { type: 'knight', color: 'black', hasMoved: false });
        boardA.position.set('2,7', { type: 'bishop', color: 'black', hasMoved: false });
        boardA.position.set('3,7', { type: 'king', color: 'black', hasMoved: false });
        boardA.position.set('4,7', { type: 'queen', color: 'black', hasMoved: false });
        boardA.position.set('5,7', { type: 'bishop', color: 'black', hasMoved: false });
        boardA.position.set('6,7', { type: 'knight', color: 'black', hasMoved: false });
        boardA.position.set('7,7', { type: 'rook', color: 'black', hasMoved: false });
        
        for (let i = 0; i < 8; i++) {
            boardA.position.set(`${i},6`, { type: 'pawn', color: 'black', hasMoved: false });
        }
        
        const boardB = this.boards['b'];
        boardB.position.clear();

        boardB.position.set('0,0', { type: 'rook', color: 'black', hasMoved: false });
        boardB.position.set('1,0', { type: 'knight', color: 'black', hasMoved: false });
        boardB.position.set('2,0', { type: 'bishop', color: 'black', hasMoved: false });
        boardB.position.set('3,0', { type: 'queen', color: 'black', hasMoved: false });
        boardB.position.set('4,0', { type: 'king', color: 'black', hasMoved: false });
        boardB.position.set('5,0', { type: 'bishop', color: 'black', hasMoved: false });
        boardB.position.set('6,0', { type: 'knight', color: 'black', hasMoved: false });
        boardB.position.set('7,0', { type: 'rook', color: 'black', hasMoved: false });

        for (let i = 0; i < 8; i++) {
            boardB.position.set(`${i},1`, { type: 'pawn', color: 'black', hasMoved: false });
        }

        boardB.position.set('0,7', { type: 'rook', color: 'white', hasMoved: false });
        boardB.position.set('1,7', { type: 'knight', color: 'white', hasMoved: false });
        boardB.position.set('2,7', { type: 'bishop', color: 'white', hasMoved: false });
        boardB.position.set('3,7', { type: 'queen', color: 'white', hasMoved: false });
        boardB.position.set('4,7', { type: 'king', color: 'white', hasMoved: false });
        boardB.position.set('5,7', { type: 'bishop', color: 'white', hasMoved: false });
        boardB.position.set('6,7', { type: 'knight', color: 'white', hasMoved: false });
        boardB.position.set('7,7', { type: 'rook', color: 'white', hasMoved: false });

        for (let i = 0; i < 8; i++) {
            boardB.position.set(`${i},6`, { type: 'pawn', color: 'white', hasMoved: false });
        }
    }

    renderBoards() {
        ['a', 'b'].forEach(boardId => {
            const board = this.boards[boardId];
            const container = document.getElementById(`board-${boardId}`);
            const overlay = document.getElementById(`overlay-${boardId}`);
            
            if (!container || !overlay) return;
            
            container.innerHTML = '';
            overlay.innerHTML = '';
            
            for (let visualRank = 0; visualRank < 8; visualRank++) {
                for (let file = 0; file < 8; file++) {
                    let actualRank = visualRank;
                    
                    const square = `${file},${actualRank}`;
                    const squareDiv = document.createElement('div');
                    squareDiv.className = `square ${(file + visualRank) % 2 === 0 ? 'light' : 'dark'}`;
                    squareDiv.dataset.square = square;
                    squareDiv.dataset.board = boardId;
                    squareDiv.dataset.file = file;
                    squareDiv.dataset.visualRank = visualRank;
                    
                    const kingSquare = this.findKingSquare(boardId, board.turn);
                    if (kingSquare === square && board.check) {
                        squareDiv.classList.add('check');
                    }
                    
                    container.appendChild(squareDiv);
                }
            }
            
            for (const [square, piece] of board.position.entries()) {
                const [file, actualRank] = square.split(',').map(Number);
                let visualRank = actualRank;
                
                const squareDiv = container.querySelector(`.square[data-square="${square}"]`);
                if (squareDiv) {
                    const pieceDiv = document.createElement('div');
                    
                    const promotedKey = `${boardId}-${square}`;
                    const isPromoted = this.promotedPieces.has(promotedKey);
                    
                    pieceDiv.className = `piece ${piece.color} ${piece.type} ${isPromoted ? 'promoted' : ''}`;
                    if (isPromoted) {
                        pieceDiv.dataset.promoted = 'true';
                        pieceDiv.dataset.originalType = 'pawn';
                    }
                    
                    pieceDiv.dataset.piece = piece.type;
                    pieceDiv.dataset.color = piece.color;
                    pieceDiv.dataset.square = square;
                    pieceDiv.dataset.board = boardId;
                    
                    squareDiv.appendChild(pieceDiv);
                }
            }
            
            if (!this.setupMode.enabled && board.selectedSquare) {
                const piece = board.position.get(board.selectedSquare);
                if (piece) {
                    board.legalMoves.forEach((moveType, targetSquare) => {
                        const squareEl = container.querySelector(`.square[data-square="${targetSquare}"]`);
                        if (squareEl) {
                            squareEl.classList.add(
                                moveType === 'capture' ? 'sq-highlight-capture' : 'sq-highlight-move'
                            );
                            squareEl.addEventListener('click', (e) => {
                                e.stopPropagation();
                                this.movePiece(boardId, board.selectedSquare, targetSquare);
                            }, { once: true });
                        }
                    });
                }
            }
            
            this.updateTurnIndicator(boardId);
        });
        
        ['a', 'b'].forEach(boardId => this.addCoordinates(boardId));
        
        this.updatePools();
    }

    addCoordinates(boardId) {
        const boardElement = document.getElementById(`board-${boardId}`);
        if (!boardElement) return;

        boardElement.querySelectorAll('.coordinate').forEach(c => c.remove());

        const isLeftBoard = boardId === 'a';
        const isMobile = window.innerWidth <= 520;
        const fontSize = isMobile ? '10px' : '11px';
        const squarePct = 100 / 8;

        for (let col = 0; col < 8; col++) {
            const fileLetter = isLeftBoard
                ? String.fromCharCode(104 - col)
                : String.fromCharCode(97 + col);

            const el = document.createElement('div');
            el.className = 'coordinate file';
            el.textContent = fileLetter;
            el.style.position = 'absolute';
            el.style.fontSize = fontSize;
            el.style.fontWeight = '600';
            el.style.color = '#4a5568';
            el.style.pointerEvents = 'none';
            el.style.userSelect = 'none';
            el.style.zIndex = '1';
            el.style.lineHeight = '1';
            el.style.left = `${col * squarePct + squarePct / 2}%`;
            el.style.transform = 'translate(-50%, 50%)';
            el.style.bottom = '-17px';

            boardElement.appendChild(el);
        }

        for (let row = 0; row < 8; row++) {
            const rankNumber = isLeftBoard ? row + 1 : 8 - row;

            const el = document.createElement('div');
            el.className = 'coordinate rank';
            el.textContent = rankNumber;
            el.style.position = 'absolute';
            el.style.fontSize = fontSize;
            el.style.fontWeight = '600';
            el.style.color = '#4a5568';
            el.style.pointerEvents = 'none';
            el.style.userSelect = 'none';
            el.style.zIndex = '1';
            el.style.lineHeight = '1';
            el.style.top = `${row * squarePct + squarePct / 2}%`;
            el.style.transform = 'translateY(-50%)';
            el.style.right = '100%';
            el.style.left = 'auto';
            el.style.width = '31px';
            el.style.textAlign = 'center';

            boardElement.appendChild(el);
        }
    }

    updateTurnIndicator(boardId) {
        const board = this.boards[boardId];
        const turnElement = document.getElementById(`turn-${boardId}`);
        if (!turnElement) return;
        
        let status = `${board.turn.charAt(0).toUpperCase() + board.turn.slice(1)} to move`;
        
        const isBotTurn = this.bots[boardId][board.turn] === 'random' && this.botActive;
        if (isBotTurn) {
            status = `🤖 ${status}`;
        }
        
        if (board.checkmate) {
            status = `Checkmate! ${board.turn === 'white' ? 'Black' : 'White'} wins!`;
            turnElement.className = 'turn-indicator checkmate';
        } else if (board.stalemate) {
            status = `Checkmate! ${board.turn === 'white' ? 'Black' : 'White'} wins!`;
            turnElement.className = 'turn-indicator checkmate';
        } else if (board.check) {
            status = `${board.turn.charAt(0).toUpperCase() + board.turn.slice(1)} is in check!`;
            turnElement.className = 'turn-indicator check';
        } else {
            turnElement.className = `turn-indicator ${board.turn === 'black' ? 'black-turn' : ''}`;
        }
        
        turnElement.textContent = status;
    }

    recordMove(boardId, from, to, piece, capturedPiece, isDrop, isCheck, isCheckmate, promotedPiece) {
        const boardLetter = boardId === 'a' ? 'L' : 'R';
        const colorLetter = piece.color === 'white' ? 'W' : 'B';
        
        const counterKey = boardLetter + colorLetter;
        const moveNumber = this.boardMoveCounters[counterKey];
        this.boardMoveCounters[counterKey]++;
        
        let pieceLetter = '';
        switch(piece.type) {
            case 'king': pieceLetter = 'K'; break;
            case 'queen': pieceLetter = 'Q'; break;
            case 'rook': pieceLetter = 'R'; break;
            case 'bishop': pieceLetter = 'B'; break;
            case 'knight': pieceLetter = 'N'; break;
            case 'pawn': pieceLetter = ''; break;
        }
        
        let endNotation = '';
        let checkStr = '';

        if (isCheckmate) {
            checkStr = '#';
        } else if (isCheck) {
            checkStr = '+';
        }

        if (promotedPiece) {
            let promoLetter = '';
            switch(promotedPiece) {
                case 'queen': promoLetter = 'Q'; break;
                case 'rook': promoLetter = 'R'; break;
                case 'bishop': promoLetter = 'B'; break;
                case 'knight': promoLetter = 'N'; break;
            }
            endNotation = this.coordToNotation(to, boardId) + `=${promoLetter}`;
        } else {
            endNotation = this.coordToNotation(to, boardId);
        }

        let notation = '';
        if (isDrop) {
            notation = `${moveNumber}${boardLetter}${colorLetter} ${pieceLetter}@${endNotation}${checkStr}`;
        } else {
            const startNotation = this.coordToNotation(from, boardId);
            if (capturedPiece) {
                notation = `${moveNumber}${boardLetter}${colorLetter} ${pieceLetter}${startNotation}x${endNotation}${checkStr}`;
            } else {
                notation = `${moveNumber}${boardLetter}${colorLetter} ${pieceLetter}${startNotation}-${endNotation}${checkStr}`;
            }
        }

        const specialNotation = (capturedPiece ? 'x' : '') + checkStr;
        const fromNotation = isDrop ? null : this.coordToNotation(from, boardId);
        
        this.moveNotation.push({
            moveNumber: moveNumber,
            board: boardLetter,
            color: colorLetter,
            piece: pieceLetter,
            from: fromNotation,
            to: endNotation,
            isDrop: isDrop,
            special: specialNotation,
            notation: notation
        });
        
        this.updateNotationDisplay();
        
        return notation;
    }
    
    updateNotationDisplay() {
        let centerNotationPanel = document.getElementById('center-notation-panel');

        if (!centerNotationPanel) {
            centerNotationPanel = document.createElement('div');
            centerNotationPanel.id = 'center-notation-panel';
            centerNotationPanel.className = 'center-notation-panel';

            const controlPanel = document.querySelector('.control-panel');
            if (controlPanel && controlPanel.parentNode) {
                controlPanel.parentNode.insertBefore(centerNotationPanel, controlPanel.nextSibling);
            }

            centerNotationPanel.innerHTML = `
                <div class="notation-header">
                    <h4>Notation</h4>
                    <div class="notation-buttons">
                        <button class="btn-small" id="clear-all-notation">Clear All</button>
                        <button class="btn-small" id="export-csv">Export CSV</button>
                        <button class="btn-small" id="import-btn">Import CSV</button>
                        <input type="file" id="import-csv" accept=".csv" style="display:none;">
                    </div>
                </div>
                <div class="notation-columns">
                    <div class="notation-column" style="width:100%">
                        <div class="notation-moves" id="combined-notation-moves"></div>
                    </div>
                </div>
                <div class="notation-nav-buttons" style="display:flex;gap:8px;justify-content:center;margin-top:6px;">
                    <button class="btn-small" id="go-back-btn">&#8592; Go Back</button>
                    <button class="btn-small" id="go-forward-btn">Go Forward &#8594;</button>
                </div>
            `;
        }

        const exportBtn = document.getElementById('export-csv');
        if (exportBtn && !exportBtn._wired) { exportBtn._wired = true; exportBtn.addEventListener('click', () => this.exportCSV()); }
        const importBtnEl = document.getElementById('import-btn');
        if (importBtnEl && !importBtnEl._wired) { importBtnEl._wired = true; importBtnEl.addEventListener('click', () => document.getElementById('import-csv').click()); }
        const importCsvEl = document.getElementById('import-csv');
        if (importCsvEl && !importCsvEl._wired) { importCsvEl._wired = true; importCsvEl.addEventListener('change', (e) => { if (e.target.files[0]) this.importCSV(e.target.files[0]); }); }
        const goBackBtn = document.getElementById('go-back-btn');
        if (goBackBtn && !goBackBtn._wired) { goBackBtn._wired = true; goBackBtn.addEventListener('click', () => this.undoMaster()); }
        const goFwdBtn = document.getElementById('go-forward-btn');
        if (goFwdBtn && !goFwdBtn._wired) { goFwdBtn._wired = true; goFwdBtn.addEventListener('click', () => this.redoMaster()); }
        const clearBtn = document.getElementById('clear-all-notation');
        if (clearBtn && !clearBtn._wired) { clearBtn._wired = true; clearBtn.addEventListener('click', () => this.clearAllNotation()); }

        const container = document.getElementById('combined-notation-moves');
        if (container) {
            container.innerHTML = '';
            const currentIdx = this.currentNotationIndex !== undefined ? this.currentNotationIndex : this.moveNotation.length - 1;

            this.moveNotation.forEach((move, idx) => {
                const moveDiv = document.createElement('div');
                moveDiv.className = `notation-move ${move.special.includes('#') ? 'checkmate' : ''}`;
                if (idx === currentIdx) moveDiv.classList.add('notation-move-current');
                moveDiv.textContent = move.notation;
                moveDiv.style.cursor = 'pointer';
                moveDiv.title = 'Click to jump to this move';
                moveDiv.addEventListener('click', () => this.jumpToMove(idx));
                container.appendChild(moveDiv);
            });

            const currentEl = container.querySelector('.notation-move-current');
            if (currentEl) currentEl.scrollIntoView({ block: 'nearest' });
            else container.scrollTop = container.scrollHeight;
        }
    }

    clearAllNotation() {
        this.moveNotation = [];
        this.boardMoveCounters = { LW: 1, LB: 1, RW: 1, RB: 1 };
        this.currentNotationIndex = -1;
        this.updateNotationDisplay();
        this.updateStatus('All notation cleared');
    }

    startClocks() {
        if (this.clockInterval) clearInterval(this.clockInterval);
        
        if (this.clockMode === 'none') {
            this.gameActive = true;
            return;
        }
        
        this.gameActive = true;
        this.firstMoveMade = { a: false, b: false };
        
        ['a', 'b'].forEach(boardId => {
            const clock = this.clocks[boardId];
            clock.lastUpdate = Date.now();
            clock.paused = true;
            
            if (this.clockMode === 'delay' && clock.delay > 0) {
                clock.lastDelayTime = Date.now();
            }
        });
        
        this.clockInterval = setInterval(() => {
            this.updateClocks();
        }, 100);
    }

    stopClocks() {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }
        this.gameActive = false;
        this.clocks.a.active = null;
        this.clocks.b.active = null;
    }

    updateClocks() {
        const now = Date.now();
        
        ['a', 'b'].forEach(boardId => {
            const clock = this.clocks[boardId];
            const currentTurn = this.boards[boardId].turn;
            
            if (!this.gameActive) return;
            
            if (clock.paused) {
                clock.lastUpdate = now;
                return;
            }
            
            if (!clock.lastUpdate) {
                clock.lastUpdate = now;
                return;
            }
            
            let elapsed = (now - clock.lastUpdate) / 1000;
            
            if (this.clockMode === 'delay' && clock.delay > 0 && clock.lastDelayTime) {
                const delayElapsed = (now - clock.lastDelayTime) / 1000;
                if (delayElapsed < clock.delay) {
                    return;
                } else {
                    clock.lastDelayTime = null;
                    clock.lastUpdate = now;
                    return;
                }
            }
            
            if (clock[currentTurn] > 0) {
                clock[currentTurn] = Math.max(0, clock[currentTurn] - elapsed);
                clock.lastUpdate = now;
                
                if (clock[currentTurn] <= 0) {
                    clock[currentTurn] = 0;
                    this.handleTimeout(boardId, currentTurn);
                }
                
                this.updateClockWarningClass(boardId, currentTurn);
            } else {
                clock.lastUpdate = now;
            }
            
            this.updateClockDisplay(boardId);
        });
    }

    handleTimeout(boardId, color) {
        this.stopClocks();
        this.stopBotMoves();
        const winner = color === 'white' ? 'Black' : 'White';
        this.updateStatus(`⏰ Time's up! ${winner} wins on Board ${boardId.toUpperCase()}! ⏰`);
        this.highlightBoard(boardId, 'error');
        this.playGameOverSound();
    }

    updateClockDisplay(boardId) {
        const clock = this.clocks[boardId];
        
        let whiteClockId, blackClockId;
        if (boardId === 'a') {
            whiteClockId = 'clock-a-white';
            blackClockId = 'clock-a-black';
        } else {
            whiteClockId = 'clock-b-white';
            blackClockId = 'clock-b-black';
        }
        
        const whiteDisplay = document.getElementById(whiteClockId);
        const blackDisplay = document.getElementById(blackClockId);
        
        const formatTime = (seconds) => {
            if (seconds === 0 && this.clockMode === 'none') return '--:--';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };
        
        if (whiteDisplay) {
            whiteDisplay.textContent = formatTime(clock.white);
            if (this.boards[boardId].turn === 'white') {
                whiteDisplay.classList.add('active');
            } else {
                whiteDisplay.classList.remove('active');
            }
            if (clock.white < 30 && this.clockMode !== 'none') {
                whiteDisplay.classList.add('warning');
            } else {
                whiteDisplay.classList.remove('warning');
            }
        }
        
        if (blackDisplay) {
            blackDisplay.textContent = formatTime(clock.black);
            if (this.boards[boardId].turn === 'black') {
                blackDisplay.classList.add('active');
            } else {
                blackDisplay.classList.remove('active');
            }
            if (clock.black < 30 && this.clockMode !== 'none') {
                blackDisplay.classList.add('warning');
            } else {
                blackDisplay.classList.remove('warning');
            }
        }
    }
        
    updateClockWarningClass(boardId, color) {
        const clock = this.clocks[boardId];
        const clockId = boardId === 'a' ? 
            (color === 'white' ? 'clock-a-white' : 'clock-a-black') :
            (color === 'white' ? 'clock-b-white' : 'clock-b-black');
        const clockElement = document.getElementById(clockId);
        if (clockElement) {
            if (clock[color] < 30) {
                clockElement.classList.add('warning');
            } else {
                clockElement.classList.remove('warning');
            }
        }
    }

    switchClock(boardId) {
        const clock = this.clocks[boardId];
        const previousPlayer = this.boards[boardId].turn === 'white' ? 'black' : 'white';
        
        if (clock.paused && previousPlayer === 'white') {
            clock.paused = false;
            this.firstMoveMade[boardId] = true;
        }
        
        if (this.clockMode === 'fisher' && clock.increment) {
            clock[previousPlayer] += clock.increment;
        }
        
        if (this.clockMode === 'delay' && clock.delay > 0) {
            clock.lastDelayTime = Date.now();
        }
        
        clock.lastUpdate = Date.now();
        this.updateClockDisplay(boardId);
    }

    togglePlayPause() {
        if (!this.gameActive && !this.isPaused) {
            this.playStartSound();
            this.playGame();
            return;
        }
        
        if (this.isPaused) {
            this.isPaused = false;
            this.gameActive = true;
            if (this.clockMode !== 'none') {
                this.startClocks();
            }
            this.startBotMoves();
            this.updateStatus('▶️ Game resumed');
            
            const playBtn = document.getElementById('play-pause-btn');
            if (playBtn) playBtn.textContent = '⏸ Pause';
        } else {
            this.isPaused = true;
            this.gameActive = false;
            this.stopClocks();
            this.stopBotMoves();
            this.updateStatus('⏸️ Game paused');
            
            const playBtn = document.getElementById('play-pause-btn');
            if (playBtn) playBtn.textContent = '▶ Play';
        }
    }

    getRandomMove(boardId, color) {
        const board = this.boards[boardId];
        const legalMoves = [];
        
        for (const [square, piece] of board.position) {
            if (piece.color === color) {
                const moves = this.calculateLegalMoves(boardId, square, piece);
                for (const [targetSquare, moveType] of moves) {
                    legalMoves.push({ from: square, to: targetSquare, moveType });
                }
            }
        }
        
        if (legalMoves.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * legalMoves.length);
        return legalMoves[randomIndex];
    }
    
    startBotMoves() {
        if (this.botMoveInterval) {
            clearInterval(this.botMoveInterval);
        }
        
        this.botActive = true;
        if (!this.botMoveDelay || this.botMoveDelay <= 0) {
            this.botMoveDelay = 3000;
        }
        
        this.botMoveInterval = setInterval(() => {
            this.processBotMoves();
        }, 500);
        
        this.updateBotIndicators();
    }
    
    stopBotMoves() {
        if (this.botMoveInterval) {
            clearInterval(this.botMoveInterval);
            this.botMoveInterval = null;
        }
        this.botActive = false;
        this.updateBotIndicators();
    }
    
    processBotMoves() {
        if (this.isProcessingBotMove) return;
        if (this.setupMode.enabled) return;
        if (!this.gameActive) return;
        if (!this.botActive) return;
        
        this.isProcessingBotMove = true;
        
        try {
            const now = Date.now();
            
            for (const boardId of ['a', 'b']) {
                const board = this.boards[boardId];
                if (board.checkmate || board.stalemate) continue;
                
                const currentTurn = board.turn;
                const isBotOnThisBoard = (this.bots[boardId]?.[currentTurn] === 'random');
                
                if (isBotOnThisBoard && (now - this.lastBotMoveTime) >= this.botMoveDelay) {
                    const randomMove = this.getRandomMove(boardId, currentTurn);
                    if (randomMove) {
                        console.log(`🤖 Bot moving on Board ${boardId} (${currentTurn}): ${randomMove.from} -> ${randomMove.to}`);
                        this.lastBotMoveTime = now;
                        this.movePiece(boardId, randomMove.from, randomMove.to);
                        return;
                    } else {
                        this.lastBotMoveTime = now;
                    }
                }
            }
        } finally {
            setTimeout(() => { this.isProcessingBotMove = false; }, 200);
        }
    }
    
    updateBotIndicators() {
        const boardATurn = document.getElementById('turn-a');
        const boardBTurn = document.getElementById('turn-b');
        
        if (boardATurn) {
            boardATurn.classList.toggle('has-white-bot', this.bots.a.white === 'random' && this.botActive);
            boardATurn.classList.toggle('has-black-bot', this.bots.a.black === 'random' && this.botActive);
        }
        
        if (boardBTurn) {
            boardBTurn.classList.toggle('has-white-bot', this.bots.b.white === 'random' && this.botActive);
            boardBTurn.classList.toggle('has-black-bot', this.bots.b.black === 'random' && this.botActive);
        }
    }

    isKingCapture(from, to, piece, capturedPiece) {
        if (piece && piece.type === 'king') return false;
        return capturedPiece && capturedPiece.type === 'king';
    }

    setupSetupModeUI() {
        const centerControls = document.querySelector('.center-controls');
        if (!centerControls) return;

        const existing = document.getElementById('setup-center-container');
        if (existing) return;

        const setupContainer = document.createElement('div');
        setupContainer.id = 'setup-center-container';
        setupContainer.className = 'setup-center-container';
        setupContainer.innerHTML = `
            <div class="scc-header">
                <span class="scc-title">🔧 Position Setup</span>
                <button class="scc-toggle-btn" id="scc-toggle">▲ Hide</button>
            </div>
            <div class="scc-body" id="scc-body">

                <div class="scc-section">
                    <div class="scc-label">SIDE TO MOVE</div>
                    <div class="scc-two-col">
                        <div class="scc-board-row">
                            <span class="sp-board-tag sp-tag-a">A</span>
                            <select id="player-to-start-a" class="sp-select">
                                <option value="white" selected>White</option>
                                <option value="black">Black</option>
                            </select>
                        </div>
                        <div class="scc-board-row">
                            <span class="sp-board-tag sp-tag-b">B</span>
                            <select id="player-to-start-b" class="sp-select">
                                <option value="white" selected>White</option>
                                <option value="black">Black</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="scc-section">
                    <div class="scc-label">CLOCK</div>
                    <div class="sp-chip-row">
                        <button class="sp-chip active" data-mode="none">Off</button>
                        <button class="sp-chip" data-mode="standard">Standard</button>
                        <button class="sp-chip" data-mode="delay">Delay</button>
                        <button class="sp-chip" data-mode="fisher">Increment</button>
                    </div>
                    <div class="scc-clock-inputs">
                        <div class="sp-clock-input standard-settings" style="display:none;">
                            <label class="sp-input-label">Minutes <input type="number" id="standard-minutes" value="10" min="1" max="180" class="sp-num-input"></label>
                        </div>
                        <div class="sp-clock-input delay-settings" style="display:none;">
                            <label class="sp-input-label">Minutes <input type="number" id="delay-minutes" value="10" min="1" max="180" class="sp-num-input"></label>
                            <label class="sp-input-label">Delay (s) <input type="number" id="delay-seconds" value="3" min="0" max="60" class="sp-num-input"></label>
                        </div>
                        <div class="sp-clock-input fisher-settings" style="display:none;">
                            <label class="sp-input-label">Minutes <input type="number" id="fisher-minutes" value="5" min="1" max="180" class="sp-num-input"></label>
                            <label class="sp-input-label">Bonus (s) <input type="number" id="fisher-bonus" value="3" min="0" max="60" class="sp-num-input"></label>
                        </div>
                    </div>
                </div>

                <div class="scc-section">
                    <div class="scc-label">PLAYERS</div>
                    <div class="scc-players-grid">
                        <div class="scc-players-header">
                            <div class="scc-ph-corner"></div>
                            <div class="scc-ph-cell">Board A – White</div>
                            <div class="scc-ph-cell">Board A – Black</div>
                            <div class="scc-ph-cell">Board B – White</div>
                            <div class="scc-ph-cell">Board B – Black</div>
                        </div>
                        <div id="players-rows"></div>
                    </div>
                    <div class="scc-player-mgmt">
                        <input type="text" id="new-player-name" class="scc-player-input" placeholder="Add player name…">
                        <button class="scc-add-player-btn" id="add-player-btn">+ Add</button>
                    </div>
                    <div class="scc-bot-delay-row">
                        <span class="scc-label" style="margin:0;">BOT DELAY</span>
                        <select id="bot-delay" class="sp-select">
                            <option value="1000">1s</option>
                            <option value="2000">2s</option>
                            <option value="3000" selected>3s</option>
                            <option value="5000">5s</option>
                            <option value="0">Instant</option>
                        </select>
                    </div>
                </div>

                <div class="scc-section">
                    <div class="scc-label">BOARD POSITIONS</div>
                    <div class="scc-two-col">
                        <div class="scc-pos-group">
                            <span class="scc-pos-label">
                                <span class="sp-board-tag sp-tag-a">A</span>
                            </span>
                            <button class="sp-pos-btn" id="clear-board-a">Kings only</button>
                            <button class="sp-pos-btn" id="start-board-a">Starting pos</button>
                        </div>
                        <div class="scc-pos-group">
                            <span class="scc-pos-label">
                                <span class="sp-board-tag sp-tag-b">B</span>
                            </span>
                            <button class="sp-pos-btn" id="clear-board-b">Kings only</button>
                            <button class="sp-pos-btn" id="start-board-b">Starting pos</button>
                        </div>
                    </div>
                </div>

                <div class="scc-section">
                    <div class="scc-label">PIECES (DRAG TO BOARD)</div>
                    <div class="scc-palette">
                        <div class="scc-palette-row">
                            <span class="scc-palette-side">W</span>
                            <div class="palette-piece white king"   data-piece="king"   data-color="white"></div>
                            <div class="palette-piece white queen"  data-piece="queen"  data-color="white"></div>
                            <div class="palette-piece white rook"   data-piece="rook"   data-color="white"></div>
                            <div class="palette-piece white bishop" data-piece="bishop" data-color="white"></div>
                            <div class="palette-piece white knight" data-piece="knight" data-color="white"></div>
                            <div class="palette-piece white pawn"   data-piece="pawn"   data-color="white"></div>
                        </div>
                        <div class="scc-palette-row">
                            <span class="scc-palette-side">B</span>
                            <div class="palette-piece black king"   data-piece="king"   data-color="black"></div>
                            <div class="palette-piece black queen"  data-piece="queen"  data-color="black"></div>
                            <div class="palette-piece black rook"   data-piece="rook"   data-color="black"></div>
                            <div class="palette-piece black bishop" data-piece="bishop" data-color="black"></div>
                            <div class="palette-piece black knight" data-piece="knight" data-color="black"></div>
                            <div class="palette-piece black pawn"   data-piece="pawn"   data-color="black"></div>
                        </div>
                        <button class="scc-delete-btn" id="trash-central">🗑 Delete piece</button>
                    </div>
                </div>

                <div class="scc-actions">
                    <button class="scc-undo-btn" id="undo-setup">↩ Undo</button>
                    <button class="scc-redo-btn" id="redo-setup">↪ Redo</button>
                    <button class="scc-play-btn" id="play-game">▶ Play!</button>
                </div>

            </div>
        `;

        centerControls.appendChild(setupContainer);

        const toggleBtn = document.getElementById('scc-toggle');
        const sccBody = document.getElementById('scc-body');
        if (toggleBtn && sccBody) {
            toggleBtn.addEventListener('click', () => {
                const isOpen = sccBody.style.display !== 'none';
                sccBody.style.display = isOpen ? 'none' : 'block';
                toggleBtn.textContent = isOpen ? '▼ Show Setup' : '▲ Hide';
                if (!isOpen) this.toggleSetupMode(true);
                else this.toggleSetupMode(false);
            });
        }

        const openBtn = document.getElementById('open-setup-panel');
        if (openBtn) {
            openBtn.addEventListener('click', () => {
                const isOpen = sccBody.style.display !== 'none';
                sccBody.style.display = isOpen ? 'none' : 'block';
                toggleBtn.textContent = isOpen ? '▼ Show Setup' : '▲ Hide';
                if (!isOpen) this.toggleSetupMode(true);
                else this.toggleSetupMode(false);
            });
        }

        document.getElementById('player-to-start-a')?.addEventListener('change', (e) => {
            this.setupMode.playerToStart.a = e.target.value;
        });
        document.getElementById('player-to-start-b')?.addEventListener('change', (e) => {
            this.setupMode.playerToStart.b = e.target.value;
        });

        this.setupClockModeListeners();

        document.querySelectorAll('.sp-clock-input input').forEach(input => {
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                if (e.target.value === '') e.target.value = '0';
                const min = parseInt(e.target.min) || 0;
                const max = parseInt(e.target.max) || 999;
                let val = parseInt(e.target.value);
                if (val < min) e.target.value = min;
                if (val > max) e.target.value = max;
            });
        });

        this.initPlayerSystem();

        document.getElementById('bot-delay')?.addEventListener('change', (e) => {
            this.botMoveDelay = parseInt(e.target.value);
        });

        document.getElementById('clear-board-a')?.addEventListener('click', () => this.clearBoardToKings('a'));
        document.getElementById('start-board-a')?.addEventListener('click', () => this.setBoardStartingPosition('a'));
        document.getElementById('clear-board-b')?.addEventListener('click', () => this.clearBoardToKings('b'));
        document.getElementById('start-board-b')?.addEventListener('click', () => this.setBoardStartingPosition('b'));

        document.getElementById('undo-setup')?.addEventListener('click', () => this.undoSetup());
        document.getElementById('redo-setup')?.addEventListener('click', () => this.redoSetup());
        document.getElementById('play-game')?.addEventListener('click', () => {
            this.playGame();
        });

        document.querySelectorAll('.palette-piece').forEach(piece => {
            piece.addEventListener('mousedown', (e) => this.handlePaletteDragStart(e));
            piece.addEventListener('touchstart', (e) => this.handlePaletteDragStart(e), { passive: false });
        });

        document.getElementById('trash-central')?.addEventListener('mousedown', (e) => e.preventDefault());
    }

    initPlayerSystem() {
        if (!this.playerRoster) {
            this.playerRoster = ['Computer'];
        }
        if (!this.seatAssignments) {
            this.seatAssignments = [null, null, null, null];
        }

        this.renderPlayerGrid();

        document.getElementById('add-player-btn')?.addEventListener('click', () => {
            const input = document.getElementById('new-player-name');
            const name = input?.value?.trim();
            if (name && !this.playerRoster.includes(name)) {
                this.playerRoster.push(name);
                if (input) input.value = '';
                this.renderPlayerGrid();
            } else if (name && this.playerRoster.includes(name)) {
                if (input) {
                    input.value = '';
                    input.placeholder = 'Name already exists';
                    setTimeout(() => input.placeholder = 'Add player name…', 2000);
                }
            }
        });

        document.getElementById('new-player-name')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('add-player-btn')?.click();
        });
    }

    renderPlayerGrid() {
        const container = document.getElementById('players-rows');
        if (!container) return;

        const seatKeys = ['a-white', 'a-black', 'b-white', 'b-black'];

        container.innerHTML = '';

        this.playerRoster.forEach((playerName, playerIdx) => {
            const isComputer = playerIdx === 0;
            const row = document.createElement('div');
            row.className = 'scc-player-row' + (isComputer ? ' scc-player-row-computer' : '');

            const nameCell = document.createElement('div');
            nameCell.className = 'scc-player-name';
            if (isComputer) {
                nameCell.innerHTML = `<span class="scc-computer-badge">🤖 Computer</span>`;
            } else {
                nameCell.innerHTML = `
                    <span class="scc-human-name">${playerName}</span>
                    <button class="scc-remove-player" data-idx="${playerIdx}" title="Remove player">✕</button>
                `;
            }
            row.appendChild(nameCell);

            seatKeys.forEach((seatKey, seatIdx) => {
                const cell = document.createElement('div');
                cell.className = 'scc-seat-cell';

                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.className = 'scc-seat-checkbox';
                cb.checked = (this.seatAssignments[seatIdx] === playerName);
                cb.dataset.seat = seatIdx;
                cb.dataset.player = playerName;
                
                cb.addEventListener('change', (e) => {
                    const checked = e.target.checked;
                    const seat = parseInt(e.target.dataset.seat);
                    const player = e.target.dataset.player;
                    
                    if (checked) {
                        this.seatAssignments[seat] = player;
                    } else {
                        if (this.seatAssignments[seat] === player) {
                            this.seatAssignments[seat] = null;
                        }
                    }
                    
                    this.renderPlayerGrid();
                    this.syncBotsFromSeats();
                });
                
                cell.appendChild(cb);
                row.appendChild(cell);
            });

            container.appendChild(row);
        });

        container.querySelectorAll('.scc-remove-player').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                const name = this.playerRoster[idx];
                for (let i = 0; i < this.seatAssignments.length; i++) {
                    if (this.seatAssignments[i] === name) {
                        this.seatAssignments[i] = null;
                    }
                }
                this.playerRoster.splice(idx, 1);
                this.renderPlayerGrid();
                this.syncBotsFromSeats();
            });
        });

        this.syncBotsFromSeats();
    }

    syncBotsFromSeats() {
        const computerName = this.playerRoster[0];
        
        this.bots.a.white = (this.seatAssignments[0] === computerName) ? 'random' : null;
        this.bots.a.black = (this.seatAssignments[1] === computerName) ? 'random' : null;
        this.bots.b.white = (this.seatAssignments[2] === computerName) ? 'random' : null;
        this.bots.b.black = (this.seatAssignments[3] === computerName) ? 'random' : null;
    }

    setupClockModeListeners() {
        const modeButtons = document.querySelectorAll('.sp-chip[data-mode]');
        const standardSettings = document.querySelector('.standard-settings');
        const delaySettings = document.querySelector('.delay-settings');
        const fisherSettings = document.querySelector('.fisher-settings');

        if (!modeButtons.length) return;

        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                modeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const mode = btn.dataset.mode;
                this.clockMode = mode;

                if (standardSettings) standardSettings.style.display = 'none';
                if (delaySettings) delaySettings.style.display = 'none';
                if (fisherSettings) fisherSettings.style.display = 'none';

                if (mode === 'standard' && standardSettings) {
                    standardSettings.style.display = 'flex';
                } else if (mode === 'delay' && delaySettings) {
                    delaySettings.style.display = 'flex';
                } else if (mode === 'fisher' && fisherSettings) {
                    fisherSettings.style.display = 'flex';
                }
            });
        });
    }

    toggleSetupMode(enabled) {
        this.setupMode.enabled = enabled;

        if (enabled) {
            document.body.classList.add('setup-mode');
            this.updateStatus('SETUP MODE: Drag pieces freely. Drop 🗑 Delete piece to remove.');
            this.stopBotMoves();
            this.stopClocks();
            ['a', 'b'].forEach(boardId => {
                this.boards[boardId].selectedSquare = null;
                this.boards[boardId].legalMoves.clear();
            });
        } else {
            document.body.classList.remove('setup-mode');
            this.updateStatus('Setup mode off. Click Play! to start the game.');
        }

        document.querySelectorAll('.chess-board .square').forEach(sq => {
            sq.classList.toggle('setup-mode', enabled);
        });

        this.renderBoards();
    }

    handlePaletteDragStart(e) {
        if (!this.setupMode.enabled) {
            this.updateStatus('Enable Setup Mode first');
            return;
        }
        
        e.preventDefault();
        const isTouch = e.type === 'touchstart';
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;
        
        const piece = e.target.closest('.palette-piece');
        if (!piece) return;
        
        const pieceType = piece.dataset.piece;
        const pieceColor = piece.dataset.color;
        
        const pieceData = {
            type: pieceType,
            color: pieceColor,
            fromPalette: true
        };
        
        const ghost = piece.cloneNode(true);
        ghost.classList.add('drag-ghost');
        ghost.style.position = 'fixed';
        ghost.style.left = `${clientX - 20}px`;
        ghost.style.top = `${clientY - 20}px`;
        ghost.style.zIndex = '10000';
        ghost.style.pointerEvents = 'none';
        ghost.style.opacity = '0.8';
        document.body.appendChild(ghost);
        
        this.dragging = {
            isDragging: true,
            source: 'palette',
            boardId: null,
            fromSquare: null,
            piece: piece,
            pieceData: pieceData,
            ghost: ghost,
            startX: clientX,
            startY: clientY,
            fromReserve: null,
            fromPalette: true
        };
        
        piece.style.opacity = '0.4';
        piece.classList.add('dragging');
    }

    handleDragStart(e) {
        e.preventDefault();
        
        let clientX, clientY;
        if (e.type === 'touchstart') {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        let target = e.target;
        while (target && !target.classList.contains('piece')) {
            target = target.parentElement;
        }
        
        if (!target || !target.classList.contains('piece')) return;
        
        const square = target.closest('.square');
        if (!square) return;
        
        const boardId = square.dataset.board;
        const squareCoord = square.dataset.square;
        const board = this.boards[boardId];
        const piece = board.position.get(squareCoord);
        
        if (this.setupMode.enabled) {
            if (!piece) return;
            this.handleSetupDragStart(e, clientX, clientY, target, square, boardId, squareCoord, piece);
            return;
        }
        
        if (!piece || piece.color !== board.turn || board.checkmate || board.stalemate) return;
        
        this.selectPiece(boardId, squareCoord, piece);
        
        const ghost = target.cloneNode(true);
        ghost.classList.add('drag-ghost');
        ghost.style.position = 'fixed';
        ghost.style.left = `${clientX - 22}px`;
        ghost.style.top = `${clientY - 22}px`;
        ghost.style.zIndex = '10000';
        ghost.style.pointerEvents = 'none';
        ghost.style.opacity = '0.8';
        document.body.appendChild(ghost);
        
        this.dragging = {
            isDragging: true,
            source: 'board',
            boardId: boardId,
            fromSquare: squareCoord,
            piece: target,
            pieceData: piece,
            ghost: ghost,
            startX: clientX,
            startY: clientY
        };
        
        target.style.opacity = '0.4';
        target.classList.add('dragging');
    }

    handleSetupDragStart(e, clientX, clientY, target, square, boardId, squareCoord, piece) {
        const ghost = target.cloneNode(true);
        ghost.classList.add('drag-ghost');
        ghost.style.position = 'fixed';
        ghost.style.left = `${clientX - 20}px`;
        ghost.style.top = `${clientY - 20}px`;
        ghost.style.zIndex = '10000';
        ghost.style.pointerEvents = 'none';
        ghost.style.opacity = '0.8';
        document.body.appendChild(ghost);
        
        this.dragging = {
            isDragging: true,
            source: 'setup-board',
            boardId: boardId,
            fromSquare: squareCoord,
            piece: target,
            pieceData: piece,
            ghost: ghost,
            startX: clientX,
            startY: clientY,
            fromReserve: null,
            fromPalette: false
        };
        
        target.style.opacity = '0.4';
        target.classList.add('dragging');
    }

    handleCapturedDragStart(e) {
        e.preventDefault();
        
        let clientX, clientY;
        if (e.type === 'touchstart') {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        const target = e.target.closest('.captured-piece');
        if (!target) return;
        
        const poolKey = target.dataset.pool;
        const pieceColor = target.classList.contains('white') ? 'white' : 'black';
        const pieceType = target.classList.contains('king') ? 'king' :
                          target.classList.contains('queen') ? 'queen' :
                          target.classList.contains('rook') ? 'rook' :
                          target.classList.contains('bishop') ? 'bishop' :
                          target.classList.contains('knight') ? 'knight' : 'pawn';
        
        let piece;
        let sourcePool;
        let targetBoard;
        
        if (poolKey.includes('fromA')) {
            sourcePool = 'fromA';
            targetBoard = 'b';
            piece = this.pools.fromA[pieceColor].find(p => p.type === pieceType);
        } else {
            sourcePool = 'fromB';
            targetBoard = 'a';
            piece = this.pools.fromB[pieceColor].find(p => p.type === pieceType);
        }
        
        if (!piece) return;
        
        const board = this.boards[targetBoard];
        
        if (piece.color !== board.turn) {
            this.updateStatus(`It's ${board.turn}'s turn. Cannot drop ${piece.color} piece now.`);
            return;
        }
        
        const ghost = document.createElement('div');
        ghost.className = `piece ${piece.color} ${piece.type} drag-ghost`;
        ghost.style.position = 'fixed';
        ghost.style.left = `${clientX - 22}px`;
        ghost.style.top = `${clientY - 22}px`;
        ghost.style.width = '44px';
        ghost.style.height = '44px';
        ghost.style.zIndex = '10000';
        ghost.style.pointerEvents = 'none';
        ghost.style.opacity = '0.9';
        
        const bgImage = window.getComputedStyle(target).backgroundImage;
        ghost.style.backgroundImage = bgImage;
        ghost.style.backgroundSize = 'contain';
        ghost.style.backgroundRepeat = 'no-repeat';
        ghost.style.backgroundPosition = 'center';
        
        document.body.appendChild(ghost);
        
        this.dragging = {
            isDragging: true,
            source: 'captured',
            boardId: targetBoard,
            fromSquare: null,
            piece: target,
            pieceData: piece,
            ghost: ghost,
            startX: clientX,
            startY: clientY,
            sourcePool: sourcePool,
            pieceColor: pieceColor,
            pieceType: pieceType
        };
        
        this.currentAction = {
            type: 'drop',
            piece: piece,
            source: sourcePool,
            color: pieceColor,
            board: targetBoard,
            pieceType: pieceType
        };
        
        target.style.opacity = '0.4';
        target.classList.add('dragging');
    }

    handleDragMove(e) {
        if (!this.dragging.isDragging) return;
        
        e.preventDefault();
        
        let clientX, clientY;
        if (e.type === 'touchmove') {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        if (this.dragging.ghost) {
            this.dragging.ghost.style.left = `${clientX - 22}px`;
            this.dragging.ghost.style.top = `${clientY - 22}px`;
        }
        
        this.updateDropFeedback(clientX, clientY);
    }

    updateDropFeedback(clientX, clientY) {
        document.querySelectorAll('.square.drop-valid, .square.drop-invalid, .captured-pieces.drop-target, .sp-delete-btn.drop-target, .scc-delete-btn.drop-target').forEach(el => {
            el.classList.remove('drop-valid', 'drop-invalid', 'drop-target');
        });
        
        const elements = document.elementsFromPoint(clientX, clientY);
        let hoverSquare = null;
        let hoverBoard = null;
        let hoverCaptured = null;
        let hoverTrash = null;
        
        for (const el of elements) {
            if (el.classList.contains('square')) {
                hoverSquare = el.dataset.square;
                hoverBoard = el.dataset.board;
                break;
            }
            if (this.setupMode.enabled && el.classList.contains('captured-pieces')) {
                hoverCaptured = el;
                hoverBoard = el.dataset.board;
                break;
            }
            if (this.setupMode.enabled && (el.id === 'trash-central' || el.classList.contains('sp-delete-btn') || el.classList.contains('scc-delete-btn'))) {
                hoverTrash = el;
                break;
            }
        }
        
        if (this.setupMode.enabled && hoverTrash) {
            hoverTrash.classList.add('drop-target');
            return;
        }
        
        if (this.setupMode.enabled && hoverCaptured) {
            const piece = this.dragging.pieceData;
            
            if (piece.type === 'king') {
                return;
            }
            
            const isOpponent = hoverCaptured.classList.contains('captured-partner');
            const isMyTeam = hoverCaptured.classList.contains('captured-by-partner');
            
            let expectedColor = null;
            if (hoverBoard === 'a') {
                if (isOpponent) expectedColor = 'white';
                else if (isMyTeam) expectedColor = 'black';
            } else if (hoverBoard === 'b') {
                if (isOpponent) expectedColor = 'black';
                else if (isMyTeam) expectedColor = 'white';
            }
            
            if (expectedColor && piece.color === expectedColor) {
                hoverCaptured.classList.add('drop-target');
            }
            return;
        }
        
        if (!hoverSquare || !hoverBoard) return;
        
        if (this.setupMode.enabled) {
            const squareEl = document.querySelector(`#board-${hoverBoard} .square[data-square="${hoverSquare}"]`);
            if (squareEl) {
                squareEl.classList.add('drop-valid');
            }
        } else if (this.dragging.source === 'board') {
            if (hoverBoard === this.dragging.boardId) {
                const board = this.boards[this.dragging.boardId];
                const isLegalMove = board.legalMoves.has(hoverSquare);
                
                const squareEl = document.querySelector(`#board-${hoverBoard} .square[data-square="${hoverSquare}"]`);
                if (squareEl) {
                    squareEl.classList.add(isLegalMove ? 'drop-valid' : 'drop-invalid');
                }
            }
        } else if (this.dragging.source === 'captured') {
            if (hoverBoard === this.dragging.boardId) {
                const board = this.boards[hoverBoard];
                const piece = this.dragging.pieceData;
                let isValidDrop = !board.position.has(hoverSquare);
                
                if (isValidDrop && piece.type === 'pawn') {
                    const rank = parseInt(hoverSquare.split(',')[1]);
                    if (rank === 0 || rank === 7) {
                        isValidDrop = false;
                    }
                }
                
                const squareEl = document.querySelector(`#board-${hoverBoard} .square[data-square="${hoverSquare}"]`);
                if (squareEl) {
                    squareEl.classList.add(isValidDrop ? 'drop-valid' : 'drop-invalid');
                }
            }
        }
    }

    handleDragEnd(e) {
        if (!this.dragging.isDragging) return;
        
        e.preventDefault();
        
        let clientX, clientY;
        if (e.type === 'touchend') {
            if (e.changedTouches && e.changedTouches[0]) {
                clientX = e.changedTouches[0].clientX;
                clientY = e.changedTouches[0].clientY;
            } else {
                clientX = this.dragging.startX;
                clientY = this.dragging.startY;
            }
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        const elements = document.elementsFromPoint(clientX, clientY);
        let targetSquare = null;
        let targetBoard = null;
        let targetCaptured = null;
        let targetTrash = null;
        
        for (const el of elements) {
            if (el.classList.contains('square')) {
                targetSquare = el.dataset.square;
                targetBoard = el.dataset.board;
                break;
            }
            if (this.setupMode.enabled && el.classList.contains('captured-pieces')) {
                targetCaptured = el;
                targetBoard = el.dataset.board;
                break;
            }
            if (this.setupMode.enabled && (el.id === 'trash-central' || el.classList.contains('sp-delete-btn') || el.classList.contains('scc-delete-btn'))) {
                targetTrash = el;
                break;
            }
        }
        
        if (this.setupMode.enabled) {
            this.saveSetupState();
            
            if (targetTrash) {
                this.handleTrashDrop();
            } else {
                this.handleSetupDrop(targetSquare, targetBoard, targetCaptured);
            }
        } else {
            this.handleNormalDrop(targetSquare, targetBoard, targetCaptured);
        }
        
        this.cleanupDrag();
    }

    handleTrashDrop() {
        if (this.dragging.source === 'setup-board') {
            const board = this.boards[this.dragging.boardId];
            const promotedKey = `${this.dragging.boardId}-${this.dragging.fromSquare}`;
            if (this.promotedPieces.has(promotedKey)) {
                this.promotedPieces.delete(promotedKey);
            }
            board.position.delete(this.dragging.fromSquare);
        }
        
        this.renderBoards();
        this.updatePools();
    }

    handleSetupDrop(targetSquare, targetBoard, targetCaptured) {
        if (targetCaptured) {
            const piece = this.dragging.pieceData;
            
            if (piece.type === 'king') return;
            
            const isOpponent = targetCaptured.classList.contains('captured-partner');
            const isMyTeam = targetCaptured.classList.contains('captured-by-partner');
            
            let targetPool;
            let targetColor;
            
            if (targetBoard === 'a') {
                if (isOpponent) {
                    targetPool = 'fromB';
                    targetColor = 'white';
                } else if (isMyTeam) {
                    targetPool = 'fromB';
                    targetColor = 'black';
                } else {
                    return;
                }
            } else if (targetBoard === 'b') {
                if (isOpponent) {
                    targetPool = 'fromA';
                    targetColor = 'black';
                } else if (isMyTeam) {
                    targetPool = 'fromA';
                    targetColor = 'white';
                } else {
                    return;
                }
            }
            
            if (piece.color !== targetColor) return;
            
            const action = {
                type: 'setup-add-to-pool',
                targetPool: targetPool,
                targetColor: targetColor,
                piece: { ...piece },
                source: this.dragging.source,
                sourceBoardId: this.dragging.boardId,
                sourceSquare: this.dragging.fromSquare,
                wasPromoted: this.dragging.fromSquare ? this.promotedPieces.has(`${this.dragging.boardId}-${this.dragging.fromSquare}`) : false
            };
            
            this.saveSetupMove(action);
            
            if (this.dragging.source === 'setup-board') {
                const board = this.boards[this.dragging.boardId];
                const promotedKey = `${this.dragging.boardId}-${this.dragging.fromSquare}`;
                if (this.promotedPieces.has(promotedKey)) {
                    this.promotedPieces.delete(promotedKey);
                }
                board.position.delete(this.dragging.fromSquare);
                this.addToPool(targetPool, piece, targetColor);
            } else if (this.dragging.source === 'palette') {
                this.addToPool(targetPool, piece, targetColor);
            }
            
            this.renderBoards();
            this.updatePools();
            
        } else if (targetSquare && targetBoard) {
            const piece = this.dragging.pieceData;
            const board = this.boards[targetBoard];
            
            const targetPiece = board.position.get(targetSquare);
            if (targetPiece && targetPiece.type === 'king' && piece.type !== 'king') {
                this.updateStatus("❌ Cannot place a piece on top of a king! ❌");
                return;
            }
            
            if (piece.type === 'pawn') {
                const rank = parseInt(targetSquare.split(',')[1]);
                if (rank === 0 || rank === 7) return;
            }
            
            const action = {
                type: 'setup-place-piece',
                boardId: targetBoard,
                square: targetSquare,
                piece: { ...piece },
                source: this.dragging.source,
                sourceBoardId: this.dragging.boardId,
                sourceSquare: this.dragging.fromSquare,
                removedPiece: targetPiece ? { ...targetPiece } : null,
                wasPromoted: this.dragging.fromSquare ? this.promotedPieces.has(`${this.dragging.boardId}-${this.dragging.fromSquare}`) : false
            };
            
            this.saveSetupMove(action);
            
            if (this.dragging.source === 'setup-board') {
                board.position.delete(this.dragging.fromSquare);
            }
            
            board.position.set(targetSquare, { type: piece.type, color: piece.color, hasMoved: false });
            
            this.renderBoards();
            this.updatePools();
        }
    }

    handleNormalDrop(targetSquare, targetBoard, targetCaptured) {
        if (targetCaptured) return;
        
        if (this.dragging.source === 'board') {
            if (targetSquare && targetBoard === this.dragging.boardId) {
                const board = this.boards[this.dragging.boardId];
                if (board.selectedSquare && board.legalMoves.has(targetSquare)) {
                    this.movePiece(this.dragging.boardId, board.selectedSquare, targetSquare);
                }
            }
            
            if (!targetSquare) {
                this.clearBoardSelection(this.dragging.boardId);
            }
        } else if (this.dragging.source === 'captured') {
            if (targetSquare && targetBoard === this.dragging.boardId) {
                const board = this.boards[targetBoard];
                const piece = this.dragging.pieceData;
                
                if (piece.color !== board.turn) {
                    this.updateStatus(`It's ${board.turn}'s turn. Cannot drop ${piece.color} piece now.`);
                } else {
                    let isValidDrop = !board.position.has(targetSquare);
                    
                    if (isValidDrop && piece.type === 'pawn') {
                        const rank = parseInt(targetSquare.split(',')[1]);
                        if (rank === 0 || rank === 7) {
                            isValidDrop = false;
                        }
                    }
                    
                    if (isValidDrop) {
                        this.dropPiece(targetBoard, targetSquare);
                    }
                }
            }
            
            this.currentAction = { type: null, piece: null };
        }
    }

    cleanupDrag() {
        document.querySelectorAll('.drag-ghost').forEach(ghost => {
            if (ghost.parentNode) ghost.remove();
        });
        
        if (this.dragging.ghost && this.dragging.ghost.parentNode) {
            this.dragging.ghost.remove();
        }
        
        if (this.dragging.piece) {
            this.dragging.piece.style.opacity = '';
            this.dragging.piece.classList.remove('dragging');
        }
        
        document.querySelectorAll('.piece.dragging').forEach(p => {
            p.style.opacity = '';
            p.classList.remove('dragging');
        });
        
        document.querySelectorAll('.square.drop-valid, .square.drop-invalid, .captured-pieces.drop-target, .sp-delete-btn.drop-target, .scc-delete-btn.drop-target').forEach(el => {
            el.classList.remove('drop-valid', 'drop-invalid', 'drop-target');
        });
        
        document.querySelectorAll('.captured-piece.selected').forEach(p => {
            p.classList.remove('selected');
        });
        
        this.dragging = {
            isDragging: false,
            source: null,
            boardId: null,
            fromSquare: null,
            piece: null,
            pieceData: null,
            ghost: null,
            startX: 0,
            startY: 0,
            fromReserve: null,
            fromPalette: false
        };
    }

    addToPool(poolName, piece, targetColor) {
        const targetPool = poolName === 'fromA' ? this.pools.fromA : this.pools.fromB;
        targetPool[targetColor].push({ type: piece.type, color: piece.color });
        this.sortPool(targetPool[targetColor]);
    }

    sortPool(pool) {
        pool.sort((a, b) => {
            return this.pieceOrder.indexOf(a.type) - this.pieceOrder.indexOf(b.type);
        });
    }

    saveSetupState() {
        const state = {
            boards: {
                a: { position: new Map(this.boards.a.position) },
                b: { position: new Map(this.boards.b.position) }
            },
            pools: JSON.parse(JSON.stringify(this.pools)),
            promotedPieces: Array.from(this.promotedPieces.entries())
        };
        this.setupHistory.push(state);
    }

    saveSetupMove(action) {
        if (!this.setupMode.enabled) return;
        
        this.setupRedoStack = [];
        this.setupMoveHistory.push(action);
        this.updateStatus(`Setup: ${this.getSetupActionDescription(action)}`);
    }

    getSetupActionDescription(action) {
        if (action.type === 'setup-place-piece') {
            const coord = this.coordToNotation(action.square, action.boardId);
            return `Placed ${action.piece.color} ${action.piece.type} at ${coord}`;
        } else if (action.type === 'setup-add-to-pool') {
            return `Added ${action.piece.color} ${action.piece.type} to pool`;
        }
        return 'Setup action';
    }

    undoSetup() {
        if (!this.setupMode.enabled) {
            this.updateStatus('Setup mode must be enabled to undo');
            return;
        }
        
        if (this.setupMoveHistory.length === 0 && this.setupHistory.length === 0) {
            this.updateStatus('Nothing to undo');
            return;
        }
        
        if (this.setupMoveHistory.length > 0) {
            const action = this.setupMoveHistory.pop();
            this.setupRedoStack.push(action);
            this.performSetupUndo(action);
            this.updateStatus(`Undid: ${this.getSetupActionDescription(action)}`);
        } else {
            const lastState = this.setupHistory.pop();
            if (lastState) {
                this.boards.a.position = new Map(lastState.boards.a.position);
                this.boards.b.position = new Map(lastState.boards.b.position);
                this.pools = JSON.parse(JSON.stringify(lastState.pools));
                this.promotedPieces = new Map(lastState.promotedPieces || []);
                this.updateStatus('Undid last setup action');
            }
        }
        
        this.renderBoards();
        this.updatePools();
    }

    redoSetup() {
        if (!this.setupMode.enabled) {
            this.updateStatus('Setup mode must be enabled to redo');
            return;
        }
        
        if (this.setupRedoStack.length === 0) {
            this.updateStatus('Nothing to redo');
            return;
        }
        
        const action = this.setupRedoStack.pop();
        this.setupMoveHistory.push(action);
        this.performSetupRedo(action);
        this.updateStatus(`Redid: ${this.getSetupActionDescription(action)}`);
        this.renderBoards();
        this.updatePools();
    }

    performSetupUndo(action) {
        if (action.type === 'setup-place-piece') {
            this.boards[action.boardId].position.delete(action.square);
            
            if (action.removedPiece) {
                this.boards[action.boardId].position.set(action.square, action.removedPiece);
            }
            
            if (action.source === 'setup-board' && action.sourceSquare) {
                this.boards[action.sourceBoardId].position.set(action.sourceSquare, action.piece);
                if (action.wasPromoted) {
                    this.promotedPieces.set(`${action.sourceBoardId}-${action.sourceSquare}`, { originalType: 'pawn', promotedTo: action.piece.type, color: action.piece.color });
                }
            }
        } else if (action.type === 'setup-add-to-pool') {
            const pool = this.pools[action.targetPool][action.targetColor];
            const idx = pool.findIndex(p => p.type === action.piece.type);
            if (idx >= 0) pool.splice(idx, 1);
            
            if (action.source === 'setup-board' && action.sourceSquare) {
                this.boards[action.sourceBoardId].position.set(action.sourceSquare, action.piece);
                if (action.wasPromoted) {
                    this.promotedPieces.set(`${action.sourceBoardId}-${action.sourceSquare}`, { originalType: 'pawn', promotedTo: action.piece.type, color: action.piece.color });
                }
            }
        }
    }

    performSetupRedo(action) {
        if (action.type === 'setup-place-piece') {
            if (action.source === 'setup-board' && action.sourceSquare) {
                this.boards[action.sourceBoardId].position.delete(action.sourceSquare);
            }
            this.boards[action.boardId].position.set(action.square, action.piece);
        } else if (action.type === 'setup-add-to-pool') {
            if (action.source === 'setup-board' && action.sourceSquare) {
                this.boards[action.sourceBoardId].position.delete(action.sourceSquare);
            }
            this.addToPool(action.targetPool, action.piece, action.targetColor);
        }
    }

    clearBoardToKings(boardId) {
        if (!this.setupMode.enabled) {
            this.updateStatus('Enable Setup Mode first');
            return;
        }
        
        this.saveSetupState();
        this.boards[boardId].position.clear();
        
        if (boardId === 'a') {
            this.boards.a.position.set('3,0', { type: 'king', color: 'white', hasMoved: false });
            this.boards.a.position.set('3,7', { type: 'king', color: 'black', hasMoved: false });
        } else {
            this.boards.b.position.set('4,7', { type: 'king', color: 'white', hasMoved: false });
            this.boards.b.position.set('4,0', { type: 'king', color: 'black', hasMoved: false });
        }
        
        this.renderBoards();
        this.updateStatus(`Board ${boardId.toUpperCase()} cleared to kings only`);
    }

    setBoardStartingPosition(boardId) {
        if (!this.setupMode.enabled) {
            this.updateStatus('Enable Setup Mode first');
            return;
        }
        
        this.saveSetupState();
        this.boards[boardId].position.clear();
        
        if (boardId === 'a') {
            for (let i = 0; i < 8; i++) {
                this.boards.a.position.set(`${i},1`, { type: 'pawn', color: 'white', hasMoved: false });
                this.boards.a.position.set(`${i},6`, { type: 'pawn', color: 'black', hasMoved: false });
            }
            
            this.boards.a.position.set('0,0', { type: 'rook', color: 'white', hasMoved: false });
            this.boards.a.position.set('1,0', { type: 'knight', color: 'white', hasMoved: false });
            this.boards.a.position.set('2,0', { type: 'bishop', color: 'white', hasMoved: false });
            this.boards.a.position.set('3,0', { type: 'king', color: 'white', hasMoved: false });
            this.boards.a.position.set('4,0', { type: 'queen', color: 'white', hasMoved: false });
            this.boards.a.position.set('5,0', { type: 'bishop', color: 'white', hasMoved: false });
            this.boards.a.position.set('6,0', { type: 'knight', color: 'white', hasMoved: false });
            this.boards.a.position.set('7,0', { type: 'rook', color: 'white', hasMoved: false });
            
            this.boards.a.position.set('0,7', { type: 'rook', color: 'black', hasMoved: false });
            this.boards.a.position.set('1,7', { type: 'knight', color: 'black', hasMoved: false });
            this.boards.a.position.set('2,7', { type: 'bishop', color: 'black', hasMoved: false });
            this.boards.a.position.set('3,7', { type: 'king', color: 'black', hasMoved: false });
            this.boards.a.position.set('4,7', { type: 'queen', color: 'black', hasMoved: false });
            this.boards.a.position.set('5,7', { type: 'bishop', color: 'black', hasMoved: false });
            this.boards.a.position.set('6,7', { type: 'knight', color: 'black', hasMoved: false });
            this.boards.a.position.set('7,7', { type: 'rook', color: 'black', hasMoved: false });
        } else {
            for (let i = 0; i < 8; i++) {
                this.boards.b.position.set(`${i},6`, { type: 'pawn', color: 'white', hasMoved: false });
                this.boards.b.position.set(`${i},1`, { type: 'pawn', color: 'black', hasMoved: false });
            }
            
            this.boards.b.position.set('0,7', { type: 'rook', color: 'white', hasMoved: false });
            this.boards.b.position.set('1,7', { type: 'knight', color: 'white', hasMoved: false });
            this.boards.b.position.set('2,7', { type: 'bishop', color: 'white', hasMoved: false });
            this.boards.b.position.set('3,7', { type: 'queen', color: 'white', hasMoved: false });
            this.boards.b.position.set('4,7', { type: 'king', color: 'white', hasMoved: false });
            this.boards.b.position.set('5,7', { type: 'bishop', color: 'white', hasMoved: false });
            this.boards.b.position.set('6,7', { type: 'knight', color: 'white', hasMoved: false });
            this.boards.b.position.set('7,7', { type: 'rook', color: 'white', hasMoved: false });
            
            this.boards.b.position.set('0,0', { type: 'rook', color: 'black', hasMoved: false });
            this.boards.b.position.set('1,0', { type: 'knight', color: 'black', hasMoved: false });
            this.boards.b.position.set('2,0', { type: 'bishop', color: 'black', hasMoved: false });
            this.boards.b.position.set('3,0', { type: 'queen', color: 'black', hasMoved: false });
            this.boards.b.position.set('4,0', { type: 'king', color: 'black', hasMoved: false });
            this.boards.b.position.set('5,0', { type: 'bishop', color: 'black', hasMoved: false });
            this.boards.b.position.set('6,0', { type: 'knight', color: 'black', hasMoved: false });
            this.boards.b.position.set('7,0', { type: 'rook', color: 'black', hasMoved: false });
        }
        
        this.renderBoards();
        this.updateStatus(`Board ${boardId.toUpperCase()} set to starting position`);
    }

    playGame() {
        let allValid = true;
        let errorMessages = [];
        
        ['a', 'b'].forEach(boardId => {
            const board = this.boards[boardId];
            const playerToMove = this.setupMode.playerToStart[boardId];
            
            const whiteKings = this.countPieces(boardId, 'king', 'white');
            const blackKings = this.countPieces(boardId, 'king', 'black');
            
            if (whiteKings !== 1) {
                errorMessages.push(`Board ${boardId.toUpperCase()}: Must have exactly 1 white king (found ${whiteKings})`);
                allValid = false;
            }
            
            if (blackKings !== 1) {
                errorMessages.push(`Board ${boardId.toUpperCase()}: Must have exactly 1 black king (found ${blackKings})`);
                allValid = false;
            }
            
            for (const [square, piece] of board.position) {
                if (piece.type === 'pawn') {
                    const rank = parseInt(square.split(',')[1]);
                    if (rank === 0 || rank === 7) {
                        errorMessages.push(`Board ${boardId.toUpperCase()}: Pawn on ${this.coordToNotation(square, boardId)} cannot be on first/last rank`);
                        allValid = false;
                    }
                }
            }
            
            if (this.isKingInCheck(boardId, playerToMove)) {
                errorMessages.push(`Board ${boardId.toUpperCase()}: ${playerToMove} is in check`);
                allValid = false;
            }
        });
        
        if (!allValid) {
            this.updateStatus(errorMessages[0] || 'Invalid position');
            return;
        }
        
        this.boards.a.turn = this.setupMode.playerToStart.a;
        this.boards.b.turn = this.setupMode.playerToStart.b;
        
        let mainTime = 0;
        let increment = 0;
        let delay = 0;
        
        if (this.clockMode === 'standard') {
            mainTime = (parseInt(document.getElementById('standard-minutes')?.value) || 10) * 60;
        } else if (this.clockMode === 'delay') {
            mainTime = (parseInt(document.getElementById('delay-minutes')?.value) || 10) * 60;
            delay = parseInt(document.getElementById('delay-seconds')?.value) || 3;
        } else if (this.clockMode === 'fisher') {
            mainTime = (parseInt(document.getElementById('fisher-minutes')?.value) || 5) * 60;
            increment = parseInt(document.getElementById('fisher-bonus')?.value) || 3;
        }
        
        this.clocks = {
            a: { white: mainTime, black: mainTime, active: this.boards.a.turn, lastUpdate: Date.now(), increment, delay, lastDelayTime: null, paused: true },
            b: { white: mainTime, black: mainTime, active: this.boards.b.turn, lastUpdate: Date.now(), increment, delay, lastDelayTime: null, paused: true }
        };
        
        this.updateClockDisplay('a');
        this.updateClockDisplay('b');
        this.startClocks();
        this.startBotMoves();
        
        this.isPaused = false;
        this.gameActive = true;
        
        const playBtn = document.getElementById('play-pause-btn');
        if (playBtn) playBtn.textContent = '⏸ Pause';
        
        const sccBody = document.getElementById('scc-body');
        const sccToggle = document.getElementById('scc-toggle');
        if (sccBody) sccBody.style.display = 'none';
        if (sccToggle) sccToggle.textContent = '▼ Show Setup';
        this.toggleSetupMode(false);
        
        ['a', 'b'].forEach(boardId => {
            this.updateGameState(boardId);
        });
        
        this.renderBoards();
        this.updatePools();
        
        this.playStartSound();
        
        let statusMessage = 'Game on! ';
        if (this.clockMode !== 'none') {
            statusMessage += `${Math.floor(mainTime/60)} min. `;
        }
        statusMessage += `Board A: ${this.boards.a.turn}, Board B: ${this.boards.b.turn}`;
        if (this.botActive) statusMessage += ' Bots active.';
        
        this.updateStatus(statusMessage);
        
        this.currentNotationIndex = -1;
        this.updateNotationDisplay();
    }

    countPieces(boardId, type, color) {
        let count = 0;
        for (const [_, piece] of this.boards[boardId].position) {
            if (piece.type === type && piece.color === color) count++;
        }
        return count;
    }

    handleSquareClick(boardId, squareCoord) {
        if (this.setupMode.enabled) return;
        
        const board = this.boards[boardId];
        
        if (board.checkmate || board.stalemate) return;
        
        if (this.currentAction.type === 'drop' && this.currentAction.piece) {
            if (boardId === this.currentAction.board && this.currentAction.piece.color === board.turn) {
                this.dropPiece(boardId, squareCoord);
            } else {
                this.updateStatus(`Wrong board or not your turn`);
                this.currentAction = { type: null, piece: null };
                document.querySelectorAll('.captured-piece.selected').forEach(p => p.classList.remove('selected'));
            }
            return;
        }
        
        const piece = board.position.get(squareCoord);
        
        if (piece && piece.color === board.turn) {
            this.selectPiece(boardId, squareCoord, piece);
        } else if (board.selectedSquare) {
            this.movePiece(boardId, board.selectedSquare, squareCoord);
        } else {
            this.clearBoardSelection(boardId);
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.chess-board').forEach(board => {
            board.addEventListener('click', (e) => {
                if (this.dragging.isDragging) return;
                
                let target = e.target;
                while (target && !target.classList.contains('square') && !target.classList.contains('piece')) {
                    target = target.parentElement;
                }
                
                if (target.classList.contains('piece')) {
                    const square = target.closest('.square');
                    if (square) this.handleSquareClick(square.dataset.board, square.dataset.square);
                } else if (target.classList.contains('square')) {
                    this.handleSquareClick(target.dataset.board, target.dataset.square);
                }
            });
            
            board.addEventListener('mousedown', (e) => this.handleDragStart(e));
            board.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleDragStart(e);
            }, { passive: false });
        });
        
        document.querySelectorAll('.captured-pieces').forEach(section => {
            section.addEventListener('click', (e) => {
                if (this.dragging.isDragging) return;
                const piece = e.target.closest('.captured-piece');
                if (piece) { e.stopPropagation(); this.handleCapturedPieceClick(piece); }
            });
            section.addEventListener('mousedown', (e) => {
                const piece = e.target.closest('.captured-piece');
                if (piece) this.handleCapturedDragStart(e);
            });
            section.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const piece = e.target.closest('.captured-piece');
                if (piece) this.handleCapturedDragStart(e);
            }, { passive: false });
        });
        
        document.addEventListener('touchmove', (e) => {
            if (this.dragging.isDragging) { e.preventDefault(); this.handleDragMove(e); }
        }, { passive: false });
        document.addEventListener('touchend', (e) => {
            if (this.dragging.isDragging) { e.preventDefault(); this.handleDragEnd(e); }
        }, { passive: false });
        document.addEventListener('touchcancel', (e) => {
            if (this.dragging.isDragging) { e.preventDefault(); this.cleanupDrag(); }
        }, { passive: false });
        document.addEventListener('mousemove', (e) => this.handleDragMove(e));
        document.addEventListener('mouseup', (e) => this.handleDragEnd(e));
        
        document.getElementById('reset')?.addEventListener('click', () => this.resetBoards());
        
        document.querySelectorAll('.btn-undo-compact').forEach(btn => {
            btn.addEventListener('click', (e) => this.undoBoard(e.target.dataset.board));
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); this.undoBoard(e.target.dataset.board); }, { passive: false });
        });
        
        const undoMasterBtn = document.getElementById('undo-master');
        if (undoMasterBtn && !undoMasterBtn._wired) {
            undoMasterBtn._wired = true;
            undoMasterBtn.addEventListener('click', () => this.undoMaster());
            undoMasterBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.undoMaster(); }, { passive: false });
        }
        const redoMasterBtn = document.getElementById('redo-master');
        if (redoMasterBtn && !redoMasterBtn._wired) {
            redoMasterBtn._wired = true;
            redoMasterBtn.addEventListener('click', () => this.redoMaster());
            redoMasterBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.redoMaster(); }, { passive: false });
        }
        
        const playPauseBtn = document.getElementById('play-pause-btn');
        if (playPauseBtn && !playPauseBtn._wired) {
            playPauseBtn._wired = true;
            playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }
    }

    handleCapturedPieceClick(pieceElement) {
        const poolKey = pieceElement.dataset.pool;
        const pieceColor = pieceElement.classList.contains('white') ? 'white' : 'black';
        const pieceType = pieceElement.classList.contains('king') ? 'king' :
                          pieceElement.classList.contains('queen') ? 'queen' :
                          pieceElement.classList.contains('rook') ? 'rook' :
                          pieceElement.classList.contains('bishop') ? 'bishop' :
                          pieceElement.classList.contains('knight') ? 'knight' : 'pawn';
        
        const sourcePool = poolKey.includes('fromA') ? 'fromA' : 'fromB';
        const targetBoard = poolKey.includes('fromA') ? 'b' : 'a';
        const piece = this.pools[sourcePool][pieceColor].find(p => p.type === pieceType);
        
        if (!piece) { this.updateStatus("Piece not found"); return; }
        
        if (piece.color !== this.boards[targetBoard].turn) {
            this.updateStatus(`It's ${this.boards[targetBoard].turn}'s turn.`);
            return;
        }
        
        this.currentAction = {
            type: 'drop', piece, source: sourcePool, color: pieceColor, board: targetBoard, pieceType
        };
        
        document.querySelectorAll('.captured-piece.selected').forEach(p => p.classList.remove('selected'));
        pieceElement.classList.add('selected');
        this.updateStatus(`Selected ${piece.color} ${piece.type}. Click on Board ${targetBoard.toUpperCase()} to drop.`);
    }

    selectPiece(boardId, squareCoord, piece) {
        const board = this.boards[boardId];
        this.clearBoardSelection(boardId);
        board.selectedSquare = squareCoord;
        board.legalMoves = this.calculateLegalMoves(boardId, squareCoord, piece);
        this.renderBoards();
        this.updateStatus(`Selected ${piece.color} ${piece.type} at ${this.coordToNotation(squareCoord, boardId)}`);
    }

    movePiece(boardId, from, to) {
        const board = this.boards[boardId];
        const piece = board.position.get(from);
        
        if (!piece) return false;
        
        const targetPiece = board.position.get(to);
        if (targetPiece && targetPiece.type === 'king') {
            this.updateStatus("❌ King can't be taken! Recording error for debugging.");
            this.logKingCaptureError(boardId, from, to, piece);
            this.clearBoardSelection(boardId);
            return false;
        }
        
        const legalMoves = this.calculateLegalMoves(boardId, from, piece);
        if (!legalMoves.has(to)) {
            this.updateStatus("❌ Illegal move - would put your king in check!");
            this.clearBoardSelection(boardId);
            return false;
        }
        
        const moveType = legalMoves.get(to);
        const [fromFile, fromRank] = from.split(',').map(Number);
        const [toFile, toRank] = to.split(',').map(Number);
        
        let isPromotion = false;
        if (piece.type === 'pawn') {
            if (boardId === 'a') isPromotion = (piece.color === 'white' && toRank === 7) || (piece.color === 'black' && toRank === 0);
            else isPromotion = (piece.color === 'white' && toRank === 0) || (piece.color === 'black' && toRank === 7);
        }
        if (isPromotion) { this.showPromotionDialog(boardId, from, to, piece); return true; }
        
        const capturedPiece = board.position.get(to);
        const isCapture = !!capturedPiece;
        const isCastle = moveType === 'castle-kingside' || moveType === 'castle-queenside';
        
        // Play sound based on move type
        this.playMoveSound(isCapture, isCastle);
        
        const promotedPiecesBefore = new Map(this.promotedPieces);
        const poolsBeforeMove = {
            fromA: { white: [...this.pools.fromA.white], black: [...this.pools.fromA.black] },
            fromB: { white: [...this.pools.fromB.white], black: [...this.pools.fromB.black] }
        };
        
        const moveDetails = {
            type: 'move', board: boardId, from, to,
            piece: { ...piece },
            captured: capturedPiece ? { ...capturedPiece } : null,
            enPassantCapture: moveType === 'en-passant' ? this.getEnPassantCapturedPawn(boardId, from, to) : null,
            moveType,
            enPassantTarget: this.enPassantTarget[boardId],
            castlingRights: JSON.parse(JSON.stringify(this.castlingRights[boardId])),
            pools: poolsBeforeMove,
            promotedPieces: Array.from(promotedPiecesBefore.entries()),
            turn: board.turn,
            check: board.check, checkmate: board.checkmate, stalemate: board.stalemate,
            clockTimes: {
                a_white: this.clocks.a.white,
                a_black: this.clocks.a.black,
                b_white: this.clocks.b.white,
                b_black: this.clocks.b.black
            }
        };
        
        this.executeMove(boardId, from, to, piece, moveType, promotedPiecesBefore);
        piece.hasMoved = true;
        this.enPassantTarget[boardId] = (piece.type === 'pawn' && Math.abs(toRank - fromRank) === 2) ? `${fromFile},${(fromRank + toRank) / 2}` : null;
        this.updateCastlingRights(boardId, piece, from);
        board.turn = board.turn === 'white' ? 'black' : 'white';
        if (this.gameActive && !this.isPaused) this.switchClock(boardId);
        board.selectedSquare = null;
        board.legalMoves.clear();
        this.updateGameState(boardId);
        
        // Play check sound if applicable
        if (board.check && !board.checkmate) {
            this.playCheckSound();
        }
        
        this.redoStack = [];
        this.currentNotationIndex = this.moveNotation.length;
        this.moveHistory.push(moveDetails);
        this.recordMove(boardId, from, to, piece, capturedPiece, false, board.check, board.checkmate, null);
        this.updatePools();
        this.renderBoards();
        return true;
    }

    logKingCaptureError(boardId, from, to, piece) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            error: 'KING_CAPTURE_ATTEMPTED',
            boardId: boardId,
            from: from,
            to: to,
            piece: piece,
            gameState: {
                turn: this.boards[boardId].turn,
                check: this.boards[boardId].check,
                checkmate: this.boards[boardId].checkmate,
                fen: this.getBoardFEN(boardId)
            },
            moveHistory: this.moveNotation.slice(-10)
        };
        
        console.error('KING CAPTURE ERROR:', errorLog);
        
        if (!window.kingCaptureErrors) window.kingCaptureErrors = [];
        window.kingCaptureErrors.push(errorLog);
        
        try {
            const existing = localStorage.getItem('kingCaptureErrors');
            const errors = existing ? JSON.parse(existing) : [];
            errors.push(errorLog);
            while (errors.length > 20) errors.shift();
            localStorage.setItem('kingCaptureErrors', JSON.stringify(errors));
        } catch (e) {
            console.warn('Could not save to localStorage:', e);
        }
    }

    getBoardFEN(boardId) {
        const board = this.boards[boardId];
        let fen = '';
        for (let r = 7; r >= 0; r--) {
            let empty = 0;
            for (let f = 0; f < 8; f++) {
                const piece = board.position.get(`${f},${r}`);
                if (!piece) {
                    empty++;
                } else {
                    if (empty > 0) {
                        fen += empty;
                        empty = 0;
                    }
                    let pieceChar = '';
                    switch(piece.type) {
                        case 'king': pieceChar = 'k'; break;
                        case 'queen': pieceChar = 'q'; break;
                        case 'rook': pieceChar = 'r'; break;
                        case 'bishop': pieceChar = 'b'; break;
                        case 'knight': pieceChar = 'n'; break;
                        case 'pawn': pieceChar = 'p'; break;
                    }
                    fen += piece.color === 'white' ? pieceChar.toUpperCase() : pieceChar;
                }
            }
            if (empty > 0) fen += empty;
            if (r > 0) fen += '/';
        }
        return fen;
    }

    checkAllGamesEnded() {
        const bothBoardsEnded = (this.boards.a.checkmate || this.boards.a.stalemate) && 
                                (this.boards.b.checkmate || this.boards.b.stalemate);
        if (bothBoardsEnded) {
            this.updateStatus('🏁 GAME OVER - Both boards have finished! 🏁');
            this.stopClocks();
            this.stopBotMoves();
            this.gameActive = false;
            this.playGameOverSound();
        }
    }

    showPromotionDialog(boardId, from, to, piece) {
        if (this.activePromotion) this.activePromotion.remove();
        const dialog = document.createElement('div');
        dialog.className = 'promotion-dialog';
        dialog.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#f8fafc;border:3px solid #f6ad55;border-radius:8px;padding:15px;z-index:2000;';
        dialog.innerHTML = `<div style="text-align:center;margin-bottom:10px;font-weight:bold;">Promote pawn to:</div><div style="display:flex;gap:10px;justify-content:center;"><div class="promotion-piece queen ${piece.color}" data-piece="queen"></div><div class="promotion-piece rook ${piece.color}" data-piece="rook"></div><div class="promotion-piece bishop ${piece.color}" data-piece="bishop"></div><div class="promotion-piece knight ${piece.color}" data-piece="knight"></div></div>`;
        document.body.appendChild(dialog);
        this.activePromotion = dialog;
        dialog.querySelectorAll('.promotion-piece').forEach(choice => {
            choice.addEventListener('click', (e) => {
                this.completePromotion(boardId, from, to, piece, e.target.dataset.piece);
                dialog.remove();
                this.activePromotion = null;
            });
        });
    }

    completePromotion(boardId, from, to, piece, promotedType) {
        const board = this.boards[boardId];
        const capturedPiece = board.position.get(to);
        const promotedPiecesBefore = new Map(this.promotedPieces);
        const poolsBeforeMove = {
            fromA: { white: [...this.pools.fromA.white], black: [...this.pools.fromA.black] },
            fromB: { white: [...this.pools.fromB.white], black: [...this.pools.fromB.black] }
        };
        
        if (capturedPiece) {
            const tp = boardId === 'a' ? 'fromA' : 'fromB';
            this.pools[tp][capturedPiece.color].push({ type: capturedPiece.type, color: capturedPiece.color });
            this.sortPool(this.pools[tp][capturedPiece.color]);
        }
        
        board.position.delete(from);
        board.position.set(to, { type: promotedType, color: piece.color, hasMoved: true, isPromoted: true });
        this.promotedPieces.set(`${boardId}-${to}`, { originalType: 'pawn', promotedTo: promotedType, color: piece.color });
        this.enPassantTarget[boardId] = null;
        board.turn = board.turn === 'white' ? 'black' : 'white';
        if (this.gameActive && !this.isPaused) this.switchClock(boardId);
        board.selectedSquare = null;
        board.legalMoves.clear();
        this.updateGameState(boardId);
        
        const moveDetails = {
            type: 'move', board: boardId, from, to,
            piece: { type: 'pawn', color: piece.color, hasMoved: true },
            promotedTo: promotedType,
            captured: capturedPiece ? { ...capturedPiece } : null,
            moveType: 'promotion',
            enPassantTarget: null,
            castlingRights: JSON.parse(JSON.stringify(this.castlingRights[boardId])),
            pools: poolsBeforeMove,
            promotedPieces: Array.from(promotedPiecesBefore.entries()),
            turn: board.turn === 'white' ? 'black' : 'white',
            check: board.check, checkmate: board.checkmate, stalemate: board.stalemate,
            clockTimes: {
                a_white: this.clocks.a.white,
                a_black: this.clocks.a.black,
                b_white: this.clocks.b.white,
                b_black: this.clocks.b.black
            }
        };
        this.redoStack = [];
        this.currentNotationIndex = this.moveNotation.length;
        this.moveHistory.push(moveDetails);
        this.recordMove(boardId, from, to, piece, capturedPiece, false, board.check, board.checkmate, promotedType);
        this.updatePools();
        this.renderBoards();
    }

    executeMove(boardId, from, to, piece, moveType, promotedPiecesBefore) {
        const board = this.boards[boardId];
        switch(moveType) {
            case 'normal': case 'capture':
                const cp = board.position.get(to);
                if (cp) {
                    const tp = boardId === 'a' ? 'fromA' : 'fromB';
                    this.pools[tp][cp.color].push({ type: cp.type, color: cp.color });
                    this.sortPool(this.pools[tp][cp.color]);
                }
                board.position.delete(from);
                board.position.set(to, piece);
                break;
            case 'en-passant':
                const [ff, fr] = from.split(',').map(Number);
                const [tf, tr] = to.split(',').map(Number);
                const cps = `${tf},${fr}`;
                const cpa = board.position.get(cps);
                if (cpa) {
                    const tp = boardId === 'a' ? 'fromA' : 'fromB';
                    this.pools[tp][cpa.color].push({ type: cpa.type, color: cpa.color });
                    this.sortPool(this.pools[tp][cpa.color]);
                    board.position.delete(cps);
                }
                board.position.delete(from);
                board.position.set(to, piece);
                break;
            case 'castle-kingside': case 'castle-queenside':
                board.position.delete(from);
                board.position.set(to, piece);
                let rk;
                if (boardId === 'a') rk = piece.color === 'white' ? 0 : 7;
                else rk = piece.color === 'white' ? 7 : 0;
                if (moveType === 'castle-kingside') {
                    // Board A: king 3->5, rook 7->4; Board B: king 4->6, rook 7->5
                    if (boardId === 'a') { board.position.delete(`7,${rk}`); board.position.set(`4,${rk}`, { type: 'rook', color: piece.color, hasMoved: true }); }
                    else { board.position.delete(`7,${rk}`); board.position.set(`5,${rk}`, { type: 'rook', color: piece.color, hasMoved: true }); }
                } else {
                    // Board A: king 3->1, rook 0->2; Board B: king 4->2, rook 0->3
                    if (boardId === 'a') { board.position.delete(`0,${rk}`); board.position.set(`2,${rk}`, { type: 'rook', color: piece.color, hasMoved: true }); }
                    else { board.position.delete(`0,${rk}`); board.position.set(`3,${rk}`, { type: 'rook', color: piece.color, hasMoved: true }); }
                }
                break;
        }
    }

    getEnPassantCapturedPawn(boardId, from, to) {
        const [ff, fr] = from.split(',').map(Number);
        const [tf, tr] = to.split(',').map(Number);
        return this.boards[boardId].position.get(`${tf},${fr}`);
    }

    updateCastlingRights(boardId, piece, fromSquare) {
        const [f] = fromSquare.split(',').map(Number);
        if (piece.type === 'king') {
            this.castlingRights[boardId][piece.color].kingside = false;
            this.castlingRights[boardId][piece.color].queenside = false;
        }
        if (piece.type === 'rook') {
            if (f === 0) this.castlingRights[boardId][piece.color].queenside = false;
            else if (f === 7) this.castlingRights[boardId][piece.color].kingside = false;
        }
    }

    updateGameState(boardId) {
        const board = this.boards[boardId];
        const color = board.turn;
        
        // Don't re-evaluate a board that has already ended
        if (board.checkmate || board.stalemate) {
            this.updateTurnIndicator(boardId);
            return;
        }
        
        board.check = this.isKingInCheck(boardId, color);
        
        const hasMoves = this.hasAnyLegalMoves(boardId, color);
        
        if (!hasMoves) {
            if (board.check) {
                board.checkmate = true;
                board.stalemate = false;
                const winner = color === 'white' ? 'Black' : 'White';
                this.updateStatus(`🏆 CHECKMATE! ${winner} wins on Board ${boardId.toUpperCase()}! 🏆`);
                this.highlightBoard(boardId, 'checkmate');
                this.renderBoards();
                this.playCheckmateSound();
            } else {
                board.stalemate = true;
                board.checkmate = false;
                this.updateStatus(`🏆 CHECKMATE! ${color === 'white' ? 'Black' : 'White'} wins on Board ${boardId.toUpperCase()}! 🏆`);
                this.highlightBoard(boardId, 'stalemate');
                this.renderBoards();
                this.playCheckmateSound();
            }
        } else {
            board.checkmate = false;
            board.stalemate = false;
            if (board.check) {
                this.updateStatus(`⚠️ ${color.charAt(0).toUpperCase() + color.slice(1)} is in CHECK on Board ${boardId.toUpperCase()}!`);
            }
        }
        
        this.updateTurnIndicator(boardId);
        
        if (board.checkmate || board.stalemate) {
            this.checkAllGamesEnded();
        }
    }

    calculateLegalMoves(boardId, squareCoord, piece) {
        const rawMoves = this.calculateRawMoves(boardId, squareCoord, piece);
        const legalMoves = new Map();
        
        for (const [ts, mt] of rawMoves) {
            const simBoard = this.simulateMove(boardId, squareCoord, ts, piece, mt);
            
            if (!this.isKingInCheckAfterMove(simBoard, piece.color, boardId)) {
                legalMoves.set(ts, mt);
            }
        }
        
        return legalMoves;
    }

    calculateRawMoves(boardId, squareCoord, piece) {
        const moves = new Map();
        const [file, rank] = squareCoord.split(',').map(Number);
        const board = this.boards[boardId];
        const iv = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
        
        switch(piece.type) {
            case 'pawn': {
                let dir, sr;
                if (boardId === 'a') { dir = piece.color === 'white' ? 1 : -1; sr = piece.color === 'white' ? 1 : 6; }
                else { dir = piece.color === 'white' ? -1 : 1; sr = piece.color === 'white' ? 6 : 1; }
                const f1 = [file, rank + dir];
                if (iv(...f1) && !board.position.has(f1.join(','))) {
                    const tr = rank + dir;
                    const ip = (boardId === 'a') ? (piece.color === 'white' ? tr === 7 : tr === 0) : (piece.color === 'white' ? tr === 0 : tr === 7);
                    moves.set(f1.join(','), ip ? 'promotion' : 'normal');
                    if (rank === sr && iv(file, rank + 2 * dir) && !board.position.has(`${file},${rank + 2 * dir}`)) {
                        moves.set(`${file},${rank + 2 * dir}`, 'normal');
                    }
                }
                for (const [ff, rr] of [[file - 1, rank + dir], [file + 1, rank + dir]]) {
                    if (iv(ff, rr)) {
                        const ts = `${ff},${rr}`;
                        const t = board.position.get(ts);
                        if (t && t.type === 'king') continue;
                        if (t && t.color !== piece.color) {
                            const ip = (boardId === 'a') ? (piece.color === 'white' ? rr === 7 : rr === 0) : (piece.color === 'white' ? rr === 0 : rr === 7);
                            moves.set(ts, ip ? 'promotion' : 'capture');
                        }
                        if (this.enPassantTarget[boardId] === ts) moves.set(ts, 'en-passant');
                    }
                }
                break;
            }
            case 'knight':
                for (const [df, dr] of [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]) {
                    const f = file + df, r = rank + dr;
                    if (iv(f, r)) { 
                        const ts = `${f},${r}`;
                        const t = board.position.get(ts);
                        if (t && t.type === 'king') continue;
                        moves.set(ts, t && t.color !== piece.color ? 'capture' : 'normal'); 
                        if (t && t.color === piece.color) moves.delete(ts); 
                    }
                }
                break;
            case 'king':
                for (let dr = -1; dr <= 1; dr++) for (let df = -1; df <= 1; df++) {
                    if (dr === 0 && df === 0) continue;
                    const f = file + df, r = rank + dr;
                    if (iv(f, r)) { 
                        const ts = `${f},${r}`;
                        const t = board.position.get(ts);
                        if (t && t.type === 'king') continue;
                        if (!t || t.color !== piece.color) {
                            moves.set(ts, t ? 'capture' : 'normal');
                        }
                    }
                }
                if (!piece.hasMoved && !board.check) {
                    const cr = this.castlingRights[boardId][piece.color];
                    const sr2 = boardId === 'a' ? (piece.color === 'white' ? 0 : 7) : (piece.color === 'white' ? 7 : 0);
                    const opp = piece.color === 'white' ? 'black' : 'white';
                    if (boardId === 'a') {
                        // Board A: king starts at file 3; rooks at 0 (queenside) and 7 (kingside)
                        // Kingside: king -> file 5, rook(7) -> file 4; empty: 4,5,6
                        // Queenside: king -> file 1, rook(0) -> file 2; empty: 1,2
                        if (file === 3 && rank === sr2) {
                            if (cr.kingside &&
                                !board.position.has(`4,${sr2}`) && !board.position.has(`5,${sr2}`) && !board.position.has(`6,${sr2}`) &&
                                !this.isSquareAttacked(boardId, `3,${sr2}`, opp) &&
                                !this.isSquareAttacked(boardId, `4,${sr2}`, opp) &&
                                !this.isSquareAttacked(boardId, `5,${sr2}`, opp) &&
                                board.position.get(`7,${sr2}`)?.type === 'rook' && !board.position.get(`7,${sr2}`)?.hasMoved)
                                moves.set(`5,${sr2}`, 'castle-kingside');
                            if (cr.queenside &&
                                !board.position.has(`1,${sr2}`) && !board.position.has(`2,${sr2}`) &&
                                !this.isSquareAttacked(boardId, `3,${sr2}`, opp) &&
                                !this.isSquareAttacked(boardId, `2,${sr2}`, opp) &&
                                !this.isSquareAttacked(boardId, `1,${sr2}`, opp) &&
                                board.position.get(`0,${sr2}`)?.type === 'rook' && !board.position.get(`0,${sr2}`)?.hasMoved)
                                moves.set(`1,${sr2}`, 'castle-queenside');
                        }
                    } else {
                        // Board B: king starts at file 4; rooks at 0 (queenside) and 7 (kingside)
                        if (file === 4 && rank === sr2) {
                            if (cr.kingside && !board.position.has(`5,${sr2}`) && !board.position.has(`6,${sr2}`) &&
                                !this.isSquareAttacked(boardId, `4,${sr2}`, opp) &&
                                !this.isSquareAttacked(boardId, `5,${sr2}`, opp) &&
                                !this.isSquareAttacked(boardId, `6,${sr2}`, opp) &&
                                board.position.get(`7,${sr2}`)?.type === 'rook' && !board.position.get(`7,${sr2}`)?.hasMoved)
                                moves.set(`6,${sr2}`, 'castle-kingside');
                            if (cr.queenside && !board.position.has(`1,${sr2}`) && !board.position.has(`2,${sr2}`) && !board.position.has(`3,${sr2}`) &&
                                !this.isSquareAttacked(boardId, `4,${sr2}`, opp) &&
                                !this.isSquareAttacked(boardId, `3,${sr2}`, opp) &&
                                !this.isSquareAttacked(boardId, `2,${sr2}`, opp) &&
                                board.position.get(`0,${sr2}`)?.type === 'rook' && !board.position.get(`0,${sr2}`)?.hasMoved)
                                moves.set(`2,${sr2}`, 'castle-queenside');
                        }
                    }
                }
                break;
            case 'rook': case 'bishop': case 'queen': {
                const dirs = [];
                if (piece.type === 'rook' || piece.type === 'queen') dirs.push([1,0],[-1,0],[0,1],[0,-1]);
                if (piece.type === 'bishop' || piece.type === 'queen') dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);
                for (const [df, dr] of dirs) {
                    let f = file + df, r = rank + dr;
                    while (iv(f, r)) {
                        const ts = `${f},${r}`;
                        const t = board.position.get(ts);
                        if (t && t.type === 'king') {
                            break;
                        }
                        if (!t) {
                            moves.set(ts, 'normal');
                        } else {
                            if (t.color !== piece.color) {
                                moves.set(ts, 'capture');
                            }
                            break;
                        }
                        f += df; r += dr;
                    }
                }
                break;
            }
        }
        return moves;
    }

    isSquareAttacked(boardId, square, byColor) {
        const board = this.boards[boardId];
        const [tf, tr] = square.split(',').map(Number);
        for (const [fs, piece] of board.position) {
            if (piece.color !== byColor) continue;
            const [ff, fr] = fs.split(',').map(Number);
            if (piece.type === 'pawn') {
                const ad = boardId === 'a' ? (piece.color === 'white' ? 1 : -1) : (piece.color === 'white' ? -1 : 1);
                if (Math.abs(tf - ff) === 1 && (tr - fr) === ad) return true;
            }
            if (piece.type === 'knight' && ((Math.abs(tf - ff) === 2 && Math.abs(tr - fr) === 1) || (Math.abs(tf - ff) === 1 && Math.abs(tr - fr) === 2))) return true;
            if (piece.type === 'king' && Math.abs(tf - ff) <= 1 && Math.abs(tr - fr) <= 1 && !(tf === ff && tr === fr)) return true;
            if (piece.type === 'rook' || piece.type === 'bishop' || piece.type === 'queen') {
                const dx = tf - ff, dy = tr - fr;
                const isS = dx === 0 || dy === 0, isD = Math.abs(dx) === Math.abs(dy);
                if ((isS && (piece.type === 'rook' || piece.type === 'queen')) || (isD && (piece.type === 'bishop' || piece.type === 'queen'))) {
                    const sx = dx === 0 ? 0 : dx > 0 ? 1 : -1, sy = dy === 0 ? 0 : dy > 0 ? 1 : -1;
                    let cx = ff + sx, cy = fr + sy; let clear = true;
                    while (cx !== tf || cy !== tr) { if (board.position.has(`${cx},${cy}`)) { clear = false; break; } cx += sx; cy += sy; }
                    if (clear) return true;
                }
            }
        }
        return false;
    }

    simulateMove(boardId, from, to, piece, moveType) {
        const sim = new Map();
        for (const [sq, p] of this.boards[boardId].position) sim.set(sq, { ...p });
        sim.delete(from);
        if (moveType === 'en-passant') { const [ff, fr] = from.split(',').map(Number); const [tf, tr] = to.split(',').map(Number); sim.delete(`${tf},${fr}`); }
        else if (moveType.includes('castle')) {
            const rk = boardId === 'a' ? (piece.color === 'white' ? 0 : 7) : (piece.color === 'white' ? 7 : 0);
            if (moveType === 'castle-kingside') {
                if (boardId === 'a') { sim.delete(`7,${rk}`); sim.set(`4,${rk}`, { type: 'rook', color: piece.color, hasMoved: true }); }
                else { sim.delete(`7,${rk}`); sim.set(`5,${rk}`, { type: 'rook', color: piece.color, hasMoved: true }); }
            } else {
                if (boardId === 'a') { sim.delete(`0,${rk}`); sim.set(`2,${rk}`, { type: 'rook', color: piece.color, hasMoved: true }); }
                else { sim.delete(`0,${rk}`); sim.set(`3,${rk}`, { type: 'rook', color: piece.color, hasMoved: true }); }
            }
        }
        sim.set(to, moveType === 'promotion' ? { type: 'queen', color: piece.color, hasMoved: true } : { ...piece, hasMoved: true });
        return sim;
    }

    isKingInCheckAfterMove(simBoard, color, boardId) {
        let kingSq = null;
        for (const [sq, p] of simBoard) {
            if (p.type === 'king' && p.color === color) {
                kingSq = sq;
                break;
            }
        }
        if (!kingSq) {
            console.error(`KING MISSING for ${color} in simulated board!`);
            return true;
        }
        
        const [kx, ky] = kingSq.split(',').map(Number);
        
        for (const [sq, p] of simBoard) {
            if (p.color === color) continue;
            
            const [fx, fy] = sq.split(',').map(Number);
            
            if (p.type === 'king') {
                if (Math.abs(fx - kx) <= 1 && Math.abs(fy - ky) <= 1 && !(fx === kx && fy === ky)) {
                    return true;
                }
            }
            
            if (p.type === 'pawn') {
                const pawnDir = boardId === 'a' ? (p.color === 'white' ? 1 : -1) : (p.color === 'white' ? -1 : 1);
                if (Math.abs(fx - kx) === 1 && (ky - fy) === pawnDir) {
                    return true;
                }
            }
            
            if (p.type === 'knight') {
                if ((Math.abs(fx - kx) === 2 && Math.abs(fy - ky) === 1) || 
                    (Math.abs(fx - kx) === 1 && Math.abs(fy - ky) === 2)) {
                    return true;
                }
            }
            
            if (p.type === 'rook' || p.type === 'bishop' || p.type === 'queen') {
                const dx = kx - fx;
                const dy = ky - fy;
                const isHorizontal = dx === 0;
                const isVertical = dy === 0;
                const isDiagonal = Math.abs(dx) === Math.abs(dy);
                
                const canAttack = (p.type === 'rook' && (isHorizontal || isVertical)) ||
                                  (p.type === 'bishop' && isDiagonal) ||
                                  (p.type === 'queen' && (isHorizontal || isVertical || isDiagonal));
                
                if (canAttack) {
                    const stepX = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
                    const stepY = dy === 0 ? 0 : (dy > 0 ? 1 : -1);
                    
                    let x = fx + stepX;
                    let y = fy + stepY;
                    let blocked = false;
                    
                    while (x !== kx || y !== ky) {
                        if (simBoard.has(`${x},${y}`)) {
                            blocked = true;
                            break;
                        }
                        x += stepX;
                        y += stepY;
                    }
                    
                    if (!blocked) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    isKingInCheck(boardId, color) {
        const ks = this.findKingSquare(boardId, color);
        if (!ks) return false;
        for (const [sq, p] of this.boards[boardId].position) {
            if (p.color !== color && this.calculateRawMoves(boardId, sq, p).has(ks)) return true;
        }
        return false;
    }

    findKingSquare(boardId, color) {
        for (const [sq, p] of this.boards[boardId].position) { if (p.type === 'king' && p.color === color) return sq; }
        return null;
    }

    hasAnyLegalMoves(boardId, color) {
        const board = this.boards[boardId];
        
        for (const [sq, piece] of board.position) {
            if (piece.color === color) {
                const legalMoves = this.calculateLegalMoves(boardId, sq, piece);
                if (legalMoves.size > 0) {
                    return true;
                }
            }
        }
        
        const poolKey = boardId === 'a' ? 'fromB' : 'fromA';
        const pool = this.pools[poolKey][color];
        
        if (pool.length > 0) {
            for (let f = 0; f < 8; f++) {
                for (let r = 0; r < 8; r++) {
                    const sq = `${f},${r}`;
                    if (board.position.has(sq)) continue;
                    
                    for (const piece of pool) {
                        if (piece.type === 'king') continue;
                        if (piece.type === 'pawn' && (r === 0 || r === 7)) continue;
                        
                        const simBoard = new Map(board.position);
                        simBoard.set(sq, { ...piece, hasMoved: false });
                        if (!this.isKingInCheckAfterMove(simBoard, color, boardId)) {
                            return true;
                        }
                        break;
                    }
                }
            }
        }
        
        return false;
    }

    dropPiece(boardId, squareCoord) {
        const board = this.boards[boardId];
        if (!this.currentAction.piece || boardId !== this.currentAction.board || this.currentAction.piece.color !== board.turn || board.position.has(squareCoord)) return;
        const piece = this.currentAction.piece;
        if (piece.type === 'pawn' && (parseInt(squareCoord.split(',')[1]) === 0 || parseInt(squareCoord.split(',')[1]) === 7)) return;
        
        const poolArr = this.pools[this.currentAction.source][this.currentAction.color];
        const idx = poolArr.findIndex(p => p.type === this.currentAction.pieceType);
        if (idx < 0) return;
        
        const dp = { ...poolArr[idx] };
        poolArr.splice(idx, 1);
        board.position.set(squareCoord, { ...dp, hasMoved: false });
        
        // Play drop sound (similar to move)
        this.playMoveSound(false, false);
        
        const moveDetails = {
            type: 'drop', board: boardId, square: squareCoord, piece: dp,
            source: this.currentAction.source, color: this.currentAction.color, pieceType: this.currentAction.pieceType,
            pools: { fromA: { white: [...this.pools.fromA.white], black: [...this.pools.fromA.black] }, fromB: { white: [...this.pools.fromB.white], black: [...this.pools.fromB.black] } },
            turn: board.turn,
            check: board.check, checkmate: board.checkmate, stalemate: board.stalemate,
            enPassantTarget: this.enPassantTarget[boardId],
            castlingRights: JSON.parse(JSON.stringify(this.castlingRights[boardId])),
            promotedPieces: Array.from(this.promotedPieces.entries()),
            clockTimes: { a_white: this.clocks.a.white, a_black: this.clocks.a.black, b_white: this.clocks.b.white, b_black: this.clocks.b.black }
        };
        this.redoStack = [];
        this.currentNotationIndex = this.moveNotation.length;
        this.moveHistory.push(moveDetails);
        board.turn = board.turn === 'white' ? 'black' : 'white';
        if (this.gameActive && !this.isPaused) this.switchClock(boardId);
        this.updateGameState(boardId);
        this.currentAction = { type: null, piece: null };
        this.recordMove(boardId, null, squareCoord, dp, null, true, this.isKingInCheck(boardId, board.turn), board.checkmate, null);
        this.updatePools();
        this.renderBoards();
        this.updateStatus(`${dp.color} ${dp.type} dropped at ${this.coordToNotation(squareCoord, boardId)}`);
    }

    updatePools() {
        document.querySelectorAll('.captured-content').forEach(c => c.innerHTML = '');
        for (const pool of [this.pools.fromB.white, this.pools.fromB.black, this.pools.fromA.black, this.pools.fromA.white]) this.sortPool(pool);
        
        const ol = document.querySelector('.captured-pieces.captured-partner[data-board="a"] .captured-content');
        if (ol) this.displayPoolSection(ol, this.pools.fromB.white, 'fromB-white');
        const ml = document.querySelector('.captured-pieces.captured-by-partner[data-board="a"] .captured-content');
        if (ml) this.displayPoolSection(ml, this.pools.fromB.black, 'fromB-black');
        const or = document.querySelector('.captured-pieces.captured-partner[data-board="b"] .captured-content');
        if (or) this.displayPoolSection(or, this.pools.fromA.black, 'fromA-black');
        const mr = document.querySelector('.captured-pieces.captured-by-partner[data-board="b"] .captured-content');
        if (mr) this.displayPoolSection(mr, this.pools.fromA.white, 'fromA-white');
    }

    displayPoolSection(container, pool, poolKey) {
        container.innerHTML = '';
        const g = {};
        pool.forEach(p => { if (!g[p.type]) g[p.type] = { piece: p, count: 1 }; else g[p.type].count++; });
        for (const pt of ['pawn','knight','bishop','rook','queen']) {
            const sd = document.createElement('div'); sd.className = `reserve-slot ${pt}`;
            if (g[pt]) {
                const pd = document.createElement('div'); pd.className = `captured-piece ${g[pt].piece.color} ${pt}`; pd.dataset.pool = poolKey;
                if (g[pt].count > 1) { const ctr = document.createElement('span'); ctr.className = 'piece-counter'; ctr.textContent = g[pt].count; pd.appendChild(ctr); }
                sd.appendChild(pd);
            } else { const sil = document.createElement('div'); sil.className = `piece-silhouette ${pt}`; sd.appendChild(sil); }
            container.appendChild(sd);
        }
    }

    clearBoardSelection(boardId) { this.boards[boardId].selectedSquare = null; this.boards[boardId].legalMoves.clear(); this.renderBoards(); }

    resetBoards() {
        this.stopClocks(); this.stopBotMoves();
        this.boards.a = this.createBoardState('a'); this.boards.b = this.createBoardState('b');
        this.pools = { fromA: { white: [], black: [] }, fromB: { white: [], black: [] } };
        this.moveHistory = []; 
        this.setupHistory = []; 
        this.setupMoveHistory = [];
        this.setupRedoStack = [];
        this.promotedPieces.clear();
        this.currentAction = { type: null, piece: null };
        this.enPassantTarget = { a: null, b: null };
        this.castlingRights = { a: { white: { kingside: true, queenside: true }, black: { kingside: true, queenside: true } }, b: { white: { kingside: true, queenside: true }, black: { kingside: true, queenside: true } } };
        this.moveNotation = []; 
        this.boardMoveCounters = { LW: 1, LB: 1, RW: 1, RB: 1 };
        this.currentNotationIndex = -1;
        this.updateNotationDisplay();
        this.clocks = { a: { white: 600, black: 600, active: null, lastUpdate: null, increment: 0, delay: 0, lastDelayTime: null, paused: false }, b: { white: 600, black: 600, active: null, lastUpdate: null, increment: 0, delay: 0, lastDelayTime: null, paused: false } };
        this.firstMoveMade = { a: false, b: false };
        this.setupInitialPositions();
        this.renderBoards(); 
        this.updateClockDisplay('a'); 
        this.updateClockDisplay('b');
        this.updatePools(); 
        this.updateStatus('Both boards reset');
        
        this.isPaused = false;
        this.gameActive = false;
        const playBtn = document.getElementById('play-pause-btn');
        if (playBtn) playBtn.textContent = '▶ Play';
    }

    undoBoard(boardId) {
        for (let i = this.moveHistory.length - 1; i >= 0; i--) {
            if (this.moveHistory[i].board === boardId) {
                this.performUndo(this.moveHistory.splice(i, 1)[0]);
                this.renderBoards(); this.updateClockDisplay('a'); this.updateClockDisplay('b'); this.updatePools();
                if (this.gameActive && this.clockMode !== 'none' && !this.isPaused) this.switchClock(boardId);
                return;
            }
        }
    }
    
    undoMaster() {
        if (this.setupMode.enabled) {
            this.undoSetup();
            return;
        }
        
        if (this.moveHistory.length === 0) {
            this.updateStatus('No moves to undo');
            return;
        }
        
        if (this.gameActive && !this.isPaused) {
            this.isPaused = true;
            this.gameActive = false;
            this.stopClocks();
            this.stopBotMoves();
            
            const playBtn = document.getElementById('play-pause-btn');
            if (playBtn) playBtn.textContent = '▶ Play';
        }
        
        const action = this.moveHistory.pop();
        const notation = this.moveNotation.pop();
        this.redoStack.push({ action, notation });
        this.performUndo(action);
        this.rebuildMoveCounters();
        this.currentNotationIndex = this.moveNotation.length - 1;
        this.renderBoards();
        this.updateClockDisplay('a');
        this.updateClockDisplay('b');
        this.updatePools();
        this.updateNotationDisplay();
        this.updateStatus(`Undid: ${notation?.notation || 'move'} (game paused)`);
    }
    
    redoMaster() {
        if (this.setupMode.enabled) {
            this.redoSetup();
            return;
        }
        
        if (this.redoStack.length === 0) {
            this.updateStatus('Nothing to redo');
            return;
        }
        
        if (this.gameActive && !this.isPaused) {
            this.isPaused = true;
            this.gameActive = false;
            this.stopClocks();
            this.stopBotMoves();
            
            const playBtn = document.getElementById('play-pause-btn');
            if (playBtn) playBtn.textContent = '▶ Play';
        }
        
        const { action, notation } = this.redoStack.pop();
        this.performRedo(action);
        this.moveHistory.push(action);
        this.moveNotation.push(notation);
        this.currentNotationIndex = this.moveNotation.length - 1;
        this.renderBoards();
        this.updateClockDisplay('a');
        this.updateClockDisplay('b');
        this.updatePools();
        this.updateNotationDisplay();
        this.updateStatus(`Redid: ${notation?.notation || 'move'} (game paused)`);
    }
    
    jumpToMove(targetIdx) {
        const currentIdx = this.moveNotation.length - 1;
        if (targetIdx === currentIdx) return;

        if (targetIdx < currentIdx) {
            const stepsBack = currentIdx - targetIdx;
            for (let i = 0; i < stepsBack; i++) {
                if (this.moveHistory.length === 0) break;
                const action = this.moveHistory.pop();
                const notation = this.moveNotation.pop();
                this.redoStack.push({ action, notation });
                this.performUndo(action);
            }
        } else {
            const stepsForward = targetIdx - currentIdx;
            for (let i = 0; i < stepsForward; i++) {
                if (this.redoStack.length === 0) break;
                const { action, notation } = this.redoStack.pop();
                this.performRedo(action);
                this.moveHistory.push(action);
                this.moveNotation.push(notation);
            }
        }

        this.rebuildMoveCounters();
        this.currentNotationIndex = this.moveNotation.length - 1;
        this.renderBoards();
        this.updateClockDisplay('a');
        this.updateClockDisplay('b');
        this.updatePools();
        this.updateNotationDisplay();
    }

    performRedo(action) {
        const board = this.boards[action.board];
        if (action.type === 'move') {
            const piece = action.piece;
            if (action.moveType === 'en-passant') {
                const [ff, fr] = action.from.split(',').map(Number);
                const [tf, tr] = action.to.split(',').map(Number);
                board.position.delete(action.from);
                board.position.delete(`${tf},${fr}`);
                board.position.set(action.to, { ...piece, hasMoved: true });
                const tp = action.board === 'a' ? 'fromA' : 'fromB';
                if (action.enPassantCapture) { this.pools[tp][action.enPassantCapture.color].push({ type: action.enPassantCapture.type, color: action.enPassantCapture.color }); this.sortPool(this.pools[tp][action.enPassantCapture.color]); }
            } else if (action.moveType === 'castle-kingside' || action.moveType === 'castle-queenside') {
                const rk = action.board === 'a' ? (piece.color === 'white' ? 0 : 7) : (piece.color === 'white' ? 7 : 0);
                board.position.delete(action.from);
                board.position.set(action.to, { ...piece, hasMoved: true });
                if (action.moveType === 'castle-kingside') {
                    if (action.board === 'a') { board.position.delete(`7,${rk}`); board.position.set(`4,${rk}`, { type: 'rook', color: piece.color, hasMoved: true }); }
                    else { board.position.delete(`7,${rk}`); board.position.set(`5,${rk}`, { type: 'rook', color: piece.color, hasMoved: true }); }
                } else {
                    if (action.board === 'a') { board.position.delete(`0,${rk}`); board.position.set(`2,${rk}`, { type: 'rook', color: piece.color, hasMoved: true }); }
                    else { board.position.delete(`0,${rk}`); board.position.set(`3,${rk}`, { type: 'rook', color: piece.color, hasMoved: true }); }
                }
            } else if (action.moveType === 'promotion') {
                const tp = action.board === 'a' ? 'fromA' : 'fromB';
                if (action.captured) { this.pools[tp][action.captured.color].push({ type: action.captured.type, color: action.captured.color }); this.sortPool(this.pools[tp][action.captured.color]); }
                board.position.delete(action.from);
                board.position.set(action.to, { type: action.promotedTo, color: piece.color, hasMoved: true, isPromoted: true });
                this.promotedPieces.set(`${action.board}-${action.to}`, { originalType: 'pawn', promotedTo: action.promotedTo, color: piece.color });
            } else {
                const cp = board.position.get(action.to);
                if (cp) { const tp = action.board === 'a' ? 'fromA' : 'fromB'; this.pools[tp][cp.color].push({ type: cp.type, color: cp.color }); this.sortPool(this.pools[tp][cp.color]); }
                board.position.delete(action.from);
                board.position.set(action.to, { ...piece, hasMoved: true });
            }
        } else if (action.type === 'drop') {
            const poolArr = this.pools[action.source][action.color];
            const idx = poolArr.findIndex(p => p.type === action.pieceType);
            if (idx >= 0) poolArr.splice(idx, 1);
            board.position.set(action.square, { ...action.piece, hasMoved: false });
        }
        board.turn = board.turn === 'white' ? 'black' : 'white';
        this.updateGameState(action.board);
        board.selectedSquare = null; board.legalMoves.clear();
    }
    
    rebuildMoveCounters() {
        const counters = { LW: 1, LB: 1, RW: 1, RB: 1 };
        this.moveNotation.forEach(m => { const key = m.board + m.color; counters[key]++; });
        this.boardMoveCounters = counters;
    }

    performUndo(action) {
        const board = this.boards[action.board];
        if (action.promotedPieces) this.promotedPieces = new Map(action.promotedPieces);
        if (action.type === 'move') {
            board.position.delete(action.to);
            board.position.set(action.from, action.piece);
            if (action.captured) board.position.set(action.to, action.captured);
            if (action.enPassantCapture) { const [tf] = action.to.split(',').map(Number); const [ff, fr] = action.from.split(',').map(Number); board.position.set(`${tf},${fr}`, action.enPassantCapture); }
            if (action.moveType?.includes('castle')) {
                let rk;
                if (action.board === 'a') rk = action.piece.color === 'white' ? 0 : 7;
                else rk = action.piece.color === 'white' ? 7 : 0;
                if (action.moveType === 'castle-kingside') {
                    // Undo: put rook back to file 7; Board A rook was at 4, Board B at 5
                    if (action.board === 'a') { board.position.delete(`4,${rk}`); board.position.set(`7,${rk}`, { type: 'rook', color: action.piece.color, hasMoved: false }); }
                    else { board.position.delete(`5,${rk}`); board.position.set(`7,${rk}`, { type: 'rook', color: action.piece.color, hasMoved: false }); }
                } else {
                    // Undo: put rook back to file 0; Board A rook was at 2, Board B at 3
                    if (action.board === 'a') { board.position.delete(`2,${rk}`); board.position.set(`0,${rk}`, { type: 'rook', color: action.piece.color, hasMoved: false }); }
                    else { board.position.delete(`3,${rk}`); board.position.set(`0,${rk}`, { type: 'rook', color: action.piece.color, hasMoved: false }); }
                }
            }
        } else if (action.type === 'drop') { board.position.delete(action.square); }
        board.turn = action.turn;
        board.check = action.check || false; board.checkmate = action.checkmate || false; board.stalemate = action.stalemate || false;
        if (action.enPassantTarget !== undefined) this.enPassantTarget[action.board] = action.enPassantTarget;
        if (action.castlingRights) this.castlingRights[action.board] = action.castlingRights;
        if (action.pools) this.pools = { fromA: { white: [...(action.pools.fromA?.white || [])], black: [...(action.pools.fromA?.black || [])] }, fromB: { white: [...(action.pools.fromB?.white || [])], black: [...(action.pools.fromB?.black || [])] } };
        this.currentAction = { type: null, piece: null };
        board.selectedSquare = null; board.legalMoves.clear();
    }

    coordToNotation(coord, boardId) {
        const [file, rank] = coord.split(',').map(Number);
        const fl = boardId === 'a' ? String.fromCharCode(104 - file) : String.fromCharCode(97 + file);
        const rn = boardId === 'a' ? rank + 1 : 8 - rank;
        return `${fl}${rn}`;
    }

    updateStatus(message) {
        const el = document.getElementById('selected-piece');
        if (el) el.textContent = message;
    }

    highlightBoard(boardId, type) {
        const board = document.querySelector(`.board-container[data-board="${boardId}"]`);
        if (board) { board.classList.add(`validation-${type}`); setTimeout(() => board.classList.remove(`validation-${type}`), 2000); }
    }

    highlightSquare(boardId, square, type) {
        const squareEl = document.querySelector(`#board-${boardId} .square[data-square="${square}"]`);
        if (squareEl) { squareEl.classList.add(`validation-${type}`); setTimeout(() => squareEl.classList.remove(`validation-${type}`), 2000); }
    }

    // =============== CSV EXPORT/IMPORT ===============
    
    exportCSV() {
        let csv = "Move#,Board,Color,Piece,Start,End,Special,Clock A White,Clock A Black,Clock B White,Clock B Black\n";
        for (let i = 0; i < this.moveHistory.length; i++) {
            const m = this.moveHistory[i];
            if (!m.piece) continue;
            const boardLetter = m.board === 'a' ? 'L' : 'R';
            const colorLetter = m.piece.color === 'white' ? 'W' : 'B';
            const pieceLetter = m.piece.type === 'pawn' ? '' : m.piece.type.charAt(0).toUpperCase();
            const startSq = m.type === 'drop' ? '@' : this.coordToNotation(m.from, m.board);
            const destCoord = m.type === 'drop' ? m.square : m.to;
            if (!destCoord) continue;
            const endSq = this.coordToNotation(destCoord, m.board);
            let special = '';
            if (m.captured || m.moveType === 'capture' || m.moveType === 'en-passant') special += 'x';
            if (m.check) special += '+';
            if (m.checkmate) special += '#';
            const ct = m.clockTimes || {};
            const fmt = (s) => s !== undefined ? `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}` : '';
            csv += `${i+1},${boardLetter},${colorLetter},${pieceLetter},${startSq},${endSq},${special},${fmt(ct.a_white)},${fmt(ct.a_black)},${fmt(ct.b_white)},${fmt(ct.b_black)}\n`;
        }
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'bughouse_game.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.updateStatus('Game exported to CSV!');
    }

    importCSV(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const lines = e.target.result.split('\n').filter(l => l.trim());
            if (lines.length < 2) { 
                this.updateStatus('CSV file is empty'); 
                return; 
            }
            
            this.stopClocks();
            this.stopBotMoves();
            
            if (this.setupMode.enabled) {
                this.toggleSetupMode(false);
            }
            
            this.resetBoards();
            this.gameActive = true;
            
            let success = 0, fail = 0;
            
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',');
                if (cols.length < 7) continue;
                
                const boardLetter = cols[1]?.trim(), colorLetter = cols[2]?.trim(), pieceLetter = cols[3]?.trim(),
                      startSq = cols[4]?.trim(), endSq = cols[5]?.trim();
                      
                if (!boardLetter || !colorLetter || !endSq) continue;
                
                const boardId = boardLetter === 'R' ? 'b' : 'a';
                const color = colorLetter === 'W' ? 'white' : 'black';
                const pieceMap = { '': 'pawn', 'K': 'king', 'Q': 'queen', 'R': 'rook', 'B': 'bishop', 'N': 'knight' };
                const pieceType = pieceMap[pieceLetter] || 'pawn';
                const targetCoord = this.notationToCoord(endSq, boardId);
                
                if (!targetCoord) { 
                    fail++; 
                    continue; 
                }
                
                try {
                    if (startSq === '@') {
                        const sp = boardId === 'a' ? 'fromB' : 'fromA';
                        const pool = this.pools[sp][color];
                        const idx = pool.findIndex(p => p.type === pieceType);
                        if (idx >= 0) {
                            this.boards[boardId].turn = color;
                            this.currentAction = { 
                                type: 'drop', 
                                piece: pool[idx], 
                                source: sp, 
                                color: color, 
                                board: boardId, 
                                pieceType: pieceType 
                            };
                            this.dropPiece(boardId, targetCoord);
                            success++;
                        } else {
                            fail++;
                        }
                    } else {
                        const fromCoord = this.notationToCoord(startSq, boardId);
                        if (!fromCoord) { 
                            fail++; 
                            continue; 
                        }
                        
                        this.boards[boardId].turn = color;
                        const piece = this.boards[boardId].position.get(fromCoord);
                        
                        if (piece) {
                            const wasBotActive = this.botActive;
                            this.botActive = false;
                            
                            this.selectPiece(boardId, fromCoord, piece);
                            this.movePiece(boardId, fromCoord, targetCoord);
                            
                            this.botActive = wasBotActive;
                            success++;
                        } else {
                            fail++;
                        }
                    }
                } catch (err) {
                    console.warn('Import move failed:', err);
                    fail++;
                }
            }
            
            this.renderBoards();
            this.updatePools();
            this.updateClockDisplay('a');
            this.updateClockDisplay('b');
            this.updateStatus(`CSV imported: ${success} moves succeeded, ${fail} failed`);
        };
        reader.readAsText(file);
    }

    notationToCoord(notation, boardId) {
        if (!notation || notation.length < 2) return null;
        const fl = notation[0].toLowerCase(), rn = parseInt(notation[1]);
        if (isNaN(rn) || rn < 1 || rn > 8) return null;
        let file, rank;
        if (boardId === 'a') { file = 104 - fl.charCodeAt(0); rank = rn - 1; }
        else { file = fl.charCodeAt(0) - 97; rank = 8 - rn; }
        return (file >= 0 && file < 8 && rank >= 0 && rank < 8) ? `${file},${rank}` : null;
    }

    parseClockCSV(str) {
        if (!str || !str.trim()) return null;
        const parts = str.trim().split(':');
        if (parts.length === 2) { const m = parseInt(parts[0]), s = parseInt(parts[1]); if (!isNaN(m) && !isNaN(s)) return m * 60 + s; }
        return null;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.bughouseTool = new BughouseStudyTool();
});