
import type { Room, Player, GameSettings, BackendPlayerInRoom, PrizeType, PrizeClaim } from '@/types';
import { PRIZE_TYPES } from '@/types';
import { generateImprovedHousieTicket } from '@/lib/housie';
import { NUMBERS_RANGE_MIN, NUMBERS_RANGE_MAX, DEFAULT_GAME_SETTINGS, MIN_LOBBY_SIZE } from '@/lib/constants';

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

  // Host is added with NO tickets initially. They will "join" from the lobby to get tickets.
  const hostPlayerInRoom: BackendPlayerInRoom = {
    ...host,
    isHost: true,
    tickets: [], 
  };

  const newRoom: Room = {
    id: roomId,
    host: { id: host.id, name: host.name, isHost: true }, // Keep simple host info here
    players: [hostPlayerInRoom], // Host is in players list, but needs to "buy" tickets
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
  console.log(`Room created: ${roomId} by host ${host.id}. Host needs to confirm tickets.`);
  return newRoom;
}

export function getRoomStore(roomId: string): Room | undefined {
  const room = rooms.get(roomId);
  // Simple way to expire rooms: delete if older than X hours and not started
  if (room && !room.isGameStarted && (new Date().getTime() - new Date(room.createdAt).getTime()) > 24 * 60 * 60 * 1000) { // 24 hours
    rooms.delete(roomId);
    console.log(`Room ${roomId} expired and deleted.`);
    return undefined;
  }
  return room;
}

export function addPlayerToRoomStore(roomId: string, playerInfo: { id: string; name: string }, numberOfTickets: number): Room | { error: string } {
  const room = rooms.get(roomId);
  if (!room) {
    return { error: "Room not found." };
  }
  
  const existingPlayerIndex = room.players.findIndex(p => p.id === playerInfo.id);

  if (existingPlayerIndex !== -1) {
    // Player exists, update their tickets if they don't have any yet and game hasn't started
    if (room.players[existingPlayerIndex].tickets.length === 0 && numberOfTickets > 0 && !room.isGameStarted) {
        room.players[existingPlayerIndex].tickets = Array.from({ length: numberOfTickets }, () => generateImprovedHousieTicket());
        console.log(`Player ${playerInfo.id} (existing) confirmed ${numberOfTickets} tickets in room ${roomId}.`);
    } else if (room.players[existingPlayerIndex].tickets.length > 0) {
        console.log(`Player ${playerInfo.id} already has tickets. No change.`);
    } else if (room.isGameStarted) {
        return { error: "Game has already started. Cannot add/modify tickets."}
    }
    room.players[existingPlayerIndex].name = playerInfo.name; 
    room.players[existingPlayerIndex].isHost = playerInfo.id === room.host.id; 
  } else {
    // New player joining
    if (room.isGameStarted) {
         return { error: "Game has already started. Cannot join as a new player." };
    }
    if (room.players.length >= room.settings.lobbySize) {
      return { error: "Room is full." };
    }
    const newPlayer: BackendPlayerInRoom = {
      id: playerInfo.id,
      name: playerInfo.name,
      isHost: playerInfo.id === room.host.id, 
      tickets: Array.from({ length: numberOfTickets }, () => generateImprovedHousieTicket()),
    };
    room.players.push(newPlayer);
    console.log(`New player ${playerInfo.name} (${playerInfo.id}) joined room ${roomId} with ${numberOfTickets} tickets.`);
  }
  
  rooms.set(roomId, room);
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
  
  const minPlayersRequired = process.env.NODE_ENV === 'development' ? 1 : MIN_LOBBY_SIZE; 
  const playersWithTickets = room.players.filter(p => p.tickets.length > 0).length;

  if (playersWithTickets < minPlayersRequired) {
    return { error: `Need at least ${minPlayersRequired} player(s) with tickets to start. Currently: ${playersWithTickets}` };
  }
  
  const hostPlayer = room.players.find(p => p.id === hostId && p.isHost);
  if (!hostPlayer || hostPlayer.tickets.length === 0) {
    return { error: `Host must confirm their tickets before starting.`};
  }


  room.isGameStarted = true;
  room.numberPool = initializeNumberPool(); 
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
    room.isGameOver = true; 
    rooms.set(roomId, room);
    // Set current number to something to indicate all numbers called, e.g., the last called number or specific flag
    return { error: "All numbers called.", number: room.currentNumber ?? undefined };
  }

  const nextNumber = room.numberPool.pop(); // Assumes pool is shuffled and we take from end
  if (nextNumber === undefined) { // Should not happen if length check passed, but good for safety
     room.isGameOver = true;
     rooms.set(roomId, room);
     return { error: "Error getting next number from pool (pool might be unexpectedly empty).", number: room.currentNumber ?? undefined };
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
  ticketIndex: number 
): Room | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: "Room not found." };
  if (!room.isGameStarted) return { error: "Game not started." };
  
  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: "Player not found in this room." };
  if (ticketIndex < 0 || ticketIndex >= player.tickets.length) return { error: "Invalid ticket index." };
  
  const ticket = player.tickets[ticketIndex];

  // Check if game is over BEFORE checking if the specific prize has been claimed by this player
  // This allows a player who won FH to still have that claim processed even if it was the last action.
  if (room.isGameOver && prizeType !== PRIZE_TYPES.FULL_HOUSE) { 
     // If game is over, only FH can be processed (or auto-awarded lines during FH claim)
     return { error: "Game is over. No more claims." };
  }
  // Check if this specific prize was already claimed by THIS player
  if (room.prizeStatus[prizeType]?.claimedBy.includes(playerId)) {
    return { error: `You have already claimed ${prizeType}.` };
  }
  
  const isFullHouseAlreadyClaimedByAnyone = room.prizeStatus[PRIZE_TYPES.FULL_HOUSE] && room.prizeStatus[PRIZE_TYPES.FULL_HOUSE]!.claimedBy.length > 0;
  if (isFullHouseAlreadyClaimedByAnyone && prizeType !== PRIZE_TYPES.FULL_HOUSE) {
     return { error: "Full House already claimed, no more claims for other prizes." };
  }

  // Dynamic import for checkWinningCondition - ensure it's available
  const housieLib = require('@/lib/housie'); 
  if (typeof housieLib.checkWinningCondition !== 'function') {
      console.error("housie.checkWinningCondition is not a function. Check lib/housie.ts exports.");
      return { error: "Internal server error: Prize validation unavailable." };
  }
  const isValidClaim = housieLib.checkWinningCondition(ticket, room.calledNumbers, prizeType);

  if (!isValidClaim) return { error: `Claim for ${prizeType} on ticket ${ticketIndex + 1} is not valid (Bogey!).` };

  if (!room.prizeStatus[prizeType] || !Array.isArray(room.prizeStatus[prizeType]?.claimedBy)) {
    room.prizeStatus[prizeType] = { claimedBy: [], timestamp: new Date() };
  }
  room.prizeStatus[prizeType]!.claimedBy.push(playerId);
  
  if (prizeType === PRIZE_TYPES.FULL_HOUSE) {
    room.isGameOver = true;
    // Auto-award unclaimed lines for the FH winner on the winning ticket
    const linePrizesToAutoCheck: PrizeType[] = [PRIZE_TYPES.TOP_LINE, PRIZE_TYPES.MIDDLE_LINE, PRIZE_TYPES.BOTTOM_LINE];
    for (const linePrize of linePrizesToAutoCheck) {
      const linePrizeClaim = room.prizeStatus[linePrize];
      // Check if this line prize is still available (not claimed by anyone OR claimed by someone else but not this FH winner yet)
      if (!linePrizeClaim || linePrizeClaim.claimedBy.length === 0 || !linePrizeClaim.claimedBy.includes(playerId)) {
        if (housieLib.checkWinningCondition(ticket, room.calledNumbers, linePrize)) {
          if (!room.prizeStatus[linePrize] || !Array.isArray(room.prizeStatus[linePrize]?.claimedBy)) {
            room.prizeStatus[linePrize] = { claimedBy: [], timestamp: new Date() };
          }
          // Only add if not already there for this prize (for safety, though logic above should cover it)
          if (!room.prizeStatus[linePrize]!.claimedBy.includes(playerId)) {
            room.prizeStatus[linePrize]!.claimedBy.push(playerId);
            console.log(`Auto-awarded ${linePrize} to ${playerId} during Full House claim on room ${roomId}`);
          }
        }
      }
    }
  }

  rooms.set(roomId, room);
  return room; 
}

// Prepares room data for client-side consumption.
// Omits sensitive or large data like the full numberPool.
export function getRoomStateForClient(roomId: string): Omit<Room, 'numberPool'> | undefined {
    const room = getRoomStore(roomId); 
    if (!room) return undefined;

    // Deep copy to avoid modifying the original store object
    const roomCopy = JSON.parse(JSON.stringify(room)) as Room;
    const { numberPool, ...restOfRoom } = roomCopy;
    
    // Ensure player tickets are included for the client
    const playersForClient = restOfRoom.players.map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        tickets: p.tickets || [], // Ensure tickets array is present, even if empty
    }));

    // Ensure prizeStatus has all prize types initialized for client display
    const prizeStatusForClient = { ...initializePrizeStatus(), ...restOfRoom.prizeStatus };
    
    return {
        ...restOfRoom,
        players: playersForClient,
        prizeStatus: prizeStatusForClient
    };
}

// TODO: Add function to remove player (leave room)
// TODO: Add function to reset room for new game
