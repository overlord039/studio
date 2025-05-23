
import type { Room, Player, GameSettings, BackendPlayerInRoom, PrizeType } from '@/types';
import { PRIZE_TYPES } from '@/types';
import { generateImprovedHousieTicket } from '@/lib/housie';
import { NUMBERS_RANGE_MIN, NUMBERS_RANGE_MAX, DEFAULT_GAME_SETTINGS } from '@/lib/constants';

declare global {
  // eslint-disable-next-line no-var
  var housieRooms: Map<string, Room>;
}

const rooms = global.housieRooms || (global.housieRooms = new Map<string, Room>());

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase(); // 6-char alphanumeric
}

function initializeNumberPool(): number[] {
  const pool = Array.from({ length: NUMBERS_RANGE_MAX - NUMBERS_RANGE_MIN + 1 }, (_, i) => NUMBERS_RANGE_MIN + i);
  // Shuffle the pool
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function initializePrizeStatus(): Record<PrizeType, PrizeClaim | null> {
  const status: Record<PrizeType, PrizeClaim | null> = {} as Record<PrizeType, PrizeClaim | null>;
  (Object.values(PRIZE_TYPES) as PrizeType[]).forEach(prize => {
    status[prize] = null; // No one has claimed initially
  });
  return status;
}

export function createRoomStore(host: Player, clientSettings?: Partial<GameSettings>): Room {
  const roomId = generateRoomId();
  const gameSettings: GameSettings = { ...DEFAULT_GAME_SETTINGS, ...clientSettings };

  const hostWithTickets: BackendPlayerInRoom = {
    ...host,
    isHost: true,
    tickets: Array.from({ length: gameSettings.numberOfTicketsPerPlayer }, () => generateImprovedHousieTicket()),
  };

  const newRoom: Room = {
    id: roomId,
    host: { id: host.id, name: host.name, isHost: true },
    players: [hostWithTickets],
    settings: gameSettings,
    createdAt: new Date(),
    isGameStarted: false,
    isGameOver: false,
    currentNumber: null,
    calledNumbers: [],
    numberPool: initializeNumberPool(),
    prizeStatus: initializePrizeStatus(),
  };
  rooms.set(roomId, newRoom);
  console.log(`Room created: ${roomId}`, newRoom.id);
  return newRoom;
}

export function getRoomStore(roomId: string): Room | undefined {
  const room = rooms.get(roomId);
  return room;
}

export function addPlayerToRoomStore(roomId: string, playerInfo: { id: string; name: string }, numberOfTickets: number): Room | { error: string } {
  const room = rooms.get(roomId);
  if (!room) {
    return { error: "Room not found." };
  }
  if (room.isGameStarted) {
    return { error: "Game has already started." };
  }
  if (room.players.length >= room.settings.lobbySize) {
    return { error: "Room is full." };
  }
  if (room.players.find(p => p.id === playerInfo.id)) {
    return { error: "Player already in room."};
  }

  const newPlayer: BackendPlayerInRoom = {
    id: playerInfo.id,
    name: playerInfo.name,
    isHost: false,
    tickets: Array.from({ length: numberOfTickets }, () => generateImprovedHousieTicket()),
  };

  room.players.push(newPlayer);
  rooms.set(roomId, room);
  console.log(`Player ${newPlayer.name} added to room: ${roomId}`);
  return room;
}

export function startGameInRoomStore(roomId: string, hostId: string): Room | { error: string } {
  const room = rooms.get(roomId);
  if (!room) {
    return { error: "Room not found." };
  }
  if (room.host.id !== hostId) {
    return { error: "Only the host can start the game." };
  }
  if (room.isGameStarted) {
    return { error: "Game has already started." };
  }
  
  // Ensure minimum number of players to start (e.g., 2, or 1 for development)
  const minPlayersRequired = process.env.NODE_ENV === 'development' ? 1 : 2;
  if (room.players.length < minPlayersRequired) {
    return { error: `Need at least ${minPlayersRequired} players to start.` };
  }

  room.isGameStarted = true;
  room.numberPool = initializeNumberPool(); // Re-shuffle pool on game start
  room.calledNumbers = [];
  room.currentNumber = null;
  room.prizeStatus = initializePrizeStatus();
  room.isGameOver = false;

  rooms.set(roomId, room);
  console.log(`Game started in room: ${roomId}`);
  return room;
}

export function callNextNumberStore(roomId: string): Room | { error: string; number?: number } {
  const room = rooms.get(roomId);
  if (!room) return { error: "Room not found." };
  if (!room.isGameStarted) return { error: "Game not started." };
  if (room.isGameOver) return { error: "Game is over." };
  if (room.numberPool.length === 0) {
    room.isGameOver = true; // Should be caught by Full House claim typically
    rooms.set(roomId, room);
    return { error: "All numbers called.", number: room.currentNumber ?? undefined };
  }

  const nextNumber = room.numberPool.pop();
  if (nextNumber === undefined) { // Should not happen if length check passes
     room.isGameOver = true;
     rooms.set(roomId, room);
     return { error: "Error getting next number.", number: room.currentNumber ?? undefined };
  }
  
  room.currentNumber = nextNumber;
  room.calledNumbers.push(nextNumber);
  rooms.set(roomId, room);
  return room;
}

export function claimPrizeStore(
  roomId: string,
  playerId: string,
  prizeType: PrizeType,
  ticketIndex: number // Assuming claim is per ticket for simplicity in validation
): Room | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: "Room not found." };
  if (!room.isGameStarted) return { error: "Game not started." };
  if (room.isGameOver) return { error: "Game is over." };

  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: "Player not found in this room." };
  if (ticketIndex < 0 || ticketIndex >= player.tickets.length) return { error: "Invalid ticket index." };
  
  const ticket = player.tickets[ticketIndex];

  // Check if this player already claimed this prize
  if (room.prizeStatus[prizeType]?.claimedBy.includes(playerId)) {
    return { error: `You have already claimed ${prizeType}.` };
  }
  
  // If Full House is already claimed by anyone, only allow Full House claims (or no claims)
  if (room.prizeStatus[PRIZE_TYPES.FULL_HOUSE] && prizeType !== PRIZE_TYPES.FULL_HOUSE) {
     return { error: "Full House already claimed, no more claims for other prizes." };
  }


  // Dynamic checkWinningCondition import
  const housieLib = require('@/lib/housie'); // Use require for dynamic import in .ts file if needed, or ensure it's compiled correctly
  const isValidClaim = housieLib.checkWinningCondition(ticket, room.calledNumbers, prizeType);

  if (!isValidClaim) return { error: `Claim for ${prizeType} on ticket ${ticketIndex + 1} is not valid (Bogey!).` };

  if (!room.prizeStatus[prizeType]) {
    room.prizeStatus[prizeType] = { claimedBy: [], timestamp: new Date() };
  }
  room.prizeStatus[prizeType]!.claimedBy.push(playerId);
  
  let autoAwardedPrizes: PrizeType[] = [];

  if (prizeType === PRIZE_TYPES.FULL_HOUSE) {
    room.isGameOver = true;
    // Auto-award line prizes if unclaimed on the same ticket
    const linePrizesToAutoCheck: PrizeType[] = [PRIZE_TYPES.TOP_LINE, PRIZE_TYPES.MIDDLE_LINE, PRIZE_TYPES.BOTTOM_LINE];
    for (const linePrize of linePrizesToAutoCheck) {
      if (!room.prizeStatus[linePrize]?.claimedBy || room.prizeStatus[linePrize]!.claimedBy.length === 0) {
        if (housieLib.checkWinningCondition(ticket, room.calledNumbers, linePrize)) {
          if (!room.prizeStatus[linePrize]) {
            room.prizeStatus[linePrize] = { claimedBy: [], timestamp: new Date() };
          }
          room.prizeStatus[linePrize]!.claimedBy.push(playerId);
          autoAwardedPrizes.push(linePrize);
        }
      }
    }
  }

  rooms.set(roomId, room);
  // The 'autoAwardedPrizes' info needs to be part of the response if we want the client to know about them immediately
  // For now, returning the full room state is simplest. The client can deduce.
  return room; 
}

export function getRoomStateForClient(roomId: string): Omit<Room, 'numberPool'> | undefined {
    const room = rooms.get(roomId);
    if (!room) return undefined;

    // Exclude sensitive or large data not needed by all clients all the time
    const { numberPool, ...restOfRoom } = room;
    
    // Convert Date to string for JSON serialization
    const playersForClient = restOfRoom.players.map(p => ({
        ...p,
        // tickets are needed by the player themselves, maybe not by others until game over.
        // For now, include them.
    }));

    const prizeStatusForClient = { ...restOfRoom.prizeStatus };
    for (const prize in prizeStatusForClient) {
        const claim = prizeStatusForClient[prize as PrizeType];
        if (claim && claim.timestamp instanceof Date) {
            claim.timestamp = claim.timestamp.toISOString();
        }
    }
    
    return {
        ...restOfRoom,
        createdAt: restOfRoom.createdAt instanceof Date ? restOfRoom.createdAt.toISOString() : restOfRoom.createdAt,
        players: playersForClient,
        prizeStatus: prizeStatusForClient
    };
}
