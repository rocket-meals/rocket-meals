import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMyScrollViewModal, useTheme } from 'repo-depkit-common-ui';
import { useDispatch, useSelector } from 'react-redux';
import {
	placeCathedral,
	placeBuilding,
	resetGame,
} from '../store/gameSlice';
import {
	BOARD_SIZE,
	LIGHT_BUILDINGS,
	DARK_BUILDINGS,
	CATHEDRAL_PIECE,
	rotateShape,
	BuildingPiece,
	Player,
} from '../helpers/GameStorage';
import type { AppDispatch, RootState } from '../store/store';

const PRIMARY_COLOR = '#7c3aed';
const LIGHT_COLOR = '#f5e6c8';
const DARK_COLOR = '#5c3317';
const CATHEDRAL_COLOR = '#6b7280';
const BOARD_BG = '#d4a574';
const CELL_BORDER = '#b8956a';
const CLAIMED_LIGHT = 'rgba(245, 230, 200, 0.4)';
const CLAIMED_DARK = 'rgba(92, 51, 23, 0.3)';

export default function GameScreen() {
	const { theme } = useTheme();
	const insets = useSafeAreaInsets();
	const dispatch = useDispatch<AppDispatch>();
	const gameState = useSelector((state: RootState) => state.game);
	const { show: showModal, close: closeModal } = useMyScrollViewModal();
	const { width: windowWidth, height: windowHeight } = useWindowDimensions();

	const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
	const [rotation, setRotation] = useState(0);

	// Calculate cell size to fit the board on screen
	const cellSize = useMemo(() => {
		const availableWidth = windowWidth - insets.left - insets.right - 32;
		const availableHeight = windowHeight * 0.55;
		return Math.floor(Math.min(availableWidth / BOARD_SIZE, availableHeight / BOARD_SIZE));
	}, [windowWidth, windowHeight, insets.left, insets.right]);

	const currentPlayerPieces = useMemo(() => {
		if (!gameState.cathedralPlaced) {
			return [CATHEDRAL_PIECE];
		}
		const remainingIds = gameState.currentPlayer === 'light'
			? gameState.lightRemainingPieces
			: gameState.darkRemainingPieces;
		const allBuildings = gameState.currentPlayer === 'light' ? LIGHT_BUILDINGS : DARK_BUILDINGS;
		return remainingIds.map((id) => allBuildings.find((b) => b.id === id)).filter(Boolean) as BuildingPiece[];
	}, [gameState.cathedralPlaced, gameState.currentPlayer, gameState.lightRemainingPieces, gameState.darkRemainingPieces]);

	// Preview squares for selected piece
	const getPreviewSquares = useCallback((row: number, col: number): [number, number][] | null => {
		if (!selectedPiece) return null;
		const building = [...LIGHT_BUILDINGS, ...DARK_BUILDINGS, CATHEDRAL_PIECE].find((b) => b.id === selectedPiece);
		if (!building) return null;

		const rotatedShape = rotateShape(building.shape, rotation);
		const squares: [number, number][] = rotatedShape.map(([r, c]) => [row + r, col + c]);

		// Check bounds
		for (const [r, c] of squares) {
			if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return null;
		}

		return squares;
	}, [selectedPiece, rotation]);

	const handleCellPress = useCallback((row: number, col: number) => {
		if (gameState.gameOver) return;
		if (!selectedPiece) return;

		if (selectedPiece === 'cathedral') {
			dispatch(placeCathedral({ position: [row, col], rotation }));
		} else {
			dispatch(placeBuilding({ pieceId: selectedPiece, position: [row, col], rotation }));
		}
		setSelectedPiece(null);
		setRotation(0);
	}, [gameState.gameOver, selectedPiece, rotation, dispatch]);

	const handleRotate = useCallback(() => {
		setRotation((prev) => (prev + 90) % 360);
	}, []);

	const handleNewGame = useCallback(() => {
		showModal({
			title: 'New Game',
			children: (
				<View style={styles.modalContent}>
					<Text style={[styles.modalText, { color: theme.screen.text }]}>
						Are you sure you want to start a new game? Current progress will be lost.
					</Text>
					<TouchableOpacity
						style={[styles.modalButton, { backgroundColor: PRIMARY_COLOR }]}
						onPress={() => {
							dispatch(resetGame());
							setSelectedPiece(null);
							setRotation(0);
							closeModal();
						}}
					>
						<Text style={styles.modalButtonText}>Start New Game</Text>
					</TouchableOpacity>
				</View>
			),
		});
	}, [showModal, closeModal, dispatch, theme.screen.text]);

	const getCellColor = useCallback((row: number, col: number): string | null => {
		const cell = gameState.board[row][col];
		if (cell.occupiedBy === 'cathedral') return CATHEDRAL_COLOR;
		if (cell.occupiedBy !== null) {
			const placed = gameState.placedBuildings.find(
				(pb) => pb.squares.some(([r, c]) => r === row && c === col)
			);
			if (placed) {
				return placed.player === 'light' ? LIGHT_COLOR : placed.player === 'dark' ? DARK_COLOR : CATHEDRAL_COLOR;
			}
		}
		if (cell.claimedBy === 'light') return CLAIMED_LIGHT;
		if (cell.claimedBy === 'dark') return CLAIMED_DARK;
		return null;
	}, [gameState.board, gameState.placedBuildings]);

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<View style={[styles.container, { backgroundColor: theme.screen.background }]}>
			<ScrollView
				contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
				showsVerticalScrollIndicator={false}
			>
				{/* Status bar */}
				<View style={styles.statusBar}>
					{gameState.gameOver ? (
						<Text style={[styles.statusText, { color: theme.screen.text }]}>
							{gameState.winner === 'draw'
								? 'Game Over - Draw!'
								: `Game Over - ${gameState.winner === 'light' ? 'Light' : 'Dark'} wins!`}
						</Text>
					) : (
						<Text style={[styles.statusText, { color: theme.screen.text }]}>
							{!gameState.cathedralPlaced
								? 'Light: Place the Cathedral'
								: `${gameState.currentPlayer === 'light' ? 'Light' : 'Dark'}'s turn`}
						</Text>
					)}
					<View style={styles.statusActions}>
						<TouchableOpacity onPress={handleRotate} style={styles.actionButton}>
							<MaterialCommunityIcons name="rotate-right" size={24} color={PRIMARY_COLOR} />
						</TouchableOpacity>
						<TouchableOpacity onPress={handleNewGame} style={styles.actionButton}>
							<Ionicons name="refresh" size={24} color={PRIMARY_COLOR} />
						</TouchableOpacity>
					</View>
				</View>

				{/* Score display */}
				<View style={styles.scoreRow}>
					<View style={[styles.scoreBox, { backgroundColor: LIGHT_COLOR }]}>
						<Text style={styles.scoreLabel}>Light</Text>
						<Text style={styles.scoreValue}>{gameState.lightRemainingPieces.length} pcs left</Text>
					</View>
					<View style={[styles.scoreBox, { backgroundColor: DARK_COLOR }]}>
						<Text style={[styles.scoreLabel, { color: '#fff' }]}>Dark</Text>
						<Text style={[styles.scoreValue, { color: '#fff' }]}>{gameState.darkRemainingPieces.length} pcs left</Text>
					</View>
				</View>

				{/* Board */}
				<View style={[styles.boardContainer, { width: cellSize * BOARD_SIZE + 2 }]}>
					{Array.from({ length: BOARD_SIZE }).map((_, row) => (
						<View key={row} style={styles.boardRow}>
							{Array.from({ length: BOARD_SIZE }).map((_, col) => {
								const cellColor = getCellColor(row, col);
								return (
									<TouchableOpacity
										key={col}
										style={[
											styles.cell,
											{
												width: cellSize,
												height: cellSize,
												backgroundColor: cellColor || BOARD_BG,
												borderColor: CELL_BORDER,
											},
										]}
										onPress={() => handleCellPress(row, col)}
										activeOpacity={0.7}
									/>
								);
							})}
						</View>
					))}
				</View>

				{/* Piece selection */}
				<Text style={[styles.sectionTitle, { color: theme.screen.text }]}>
					{gameState.gameOver ? 'Game Over' : 'Select a piece to place:'}
				</Text>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pieceSelector}>
					{currentPlayerPieces.map((piece) => {
						const isSelected = selectedPiece === piece.id;
						const pieceColor = piece.id === 'cathedral'
							? CATHEDRAL_COLOR
							: piece.player === 'light' ? LIGHT_COLOR : DARK_COLOR;
						const rotatedShape = rotateShape(piece.shape, isSelected ? rotation : 0);
						const maxR = Math.max(...rotatedShape.map(([r]) => r)) + 1;
						const maxC = Math.max(...rotatedShape.map(([, c]) => c)) + 1;
						const miniCellSize = 12;

						return (
							<TouchableOpacity
								key={piece.id}
								style={[
									styles.pieceCard,
									{
										borderColor: isSelected ? PRIMARY_COLOR : theme.screen.border,
										backgroundColor: isSelected ? PRIMARY_COLOR + '20' : theme.screen.background,
									},
								]}
								onPress={() => setSelectedPiece(isSelected ? null : piece.id)}
							>
								<View style={{ width: maxC * miniCellSize, height: maxR * miniCellSize }}>
									{rotatedShape.map(([r, c], idx) => (
										<View
											key={idx}
											style={{
												position: 'absolute',
												top: r * miniCellSize,
												left: c * miniCellSize,
												width: miniCellSize - 1,
												height: miniCellSize - 1,
												backgroundColor: pieceColor,
												borderWidth: 0.5,
												borderColor: '#00000030',
											}}
										/>
									))}
								</View>
								<Text style={[styles.pieceName, { color: theme.screen.text }]} numberOfLines={1}>
									{piece.name}
								</Text>
							</TouchableOpacity>
						);
					})}
				</ScrollView>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scrollContent: {
		alignItems: 'center',
		padding: 16,
	},
	statusBar: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		width: '100%',
		marginBottom: 12,
	},
	statusText: {
		fontSize: 16,
		fontWeight: '600',
		flex: 1,
	},
	statusActions: {
		flexDirection: 'row',
		gap: 12,
	},
	actionButton: {
		padding: 8,
	},
	scoreRow: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 12,
		width: '100%',
	},
	scoreBox: {
		flex: 1,
		padding: 10,
		borderRadius: 8,
		alignItems: 'center',
	},
	scoreLabel: {
		fontSize: 14,
		fontWeight: '700',
		color: '#333',
	},
	scoreValue: {
		fontSize: 12,
		color: '#555',
		marginTop: 2,
	},
	boardContainer: {
		borderWidth: 1,
		borderColor: CELL_BORDER,
		alignSelf: 'center',
	},
	boardRow: {
		flexDirection: 'row',
	},
	cell: {
		borderWidth: 0.5,
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: '600',
		marginTop: 16,
		marginBottom: 8,
		alignSelf: 'flex-start',
	},
	pieceSelector: {
		width: '100%',
	},
	pieceCard: {
		borderWidth: 2,
		borderRadius: 8,
		padding: 8,
		marginRight: 8,
		alignItems: 'center',
		justifyContent: 'center',
		minWidth: 60,
	},
	pieceName: {
		fontSize: 10,
		marginTop: 4,
		textAlign: 'center',
	},
	modalContent: {
		padding: 16,
		gap: 16,
	},
	modalText: {
		fontSize: 16,
		textAlign: 'center',
	},
	modalButton: {
		height: 48,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalButtonText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '600',
	},
});
