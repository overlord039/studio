
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
  if (room.isGameStarted && !room.players.find(p => p.id === playerInfo.id)) {
    // Allow re-joining if game started only if player was already in (e.g. refresh)
    // For now, simpler: no new players if game started.
    return { error: "Game has already started. Cannot join as a new player." };
  }
  
  const existingPlayer = room.players.find(p => p.id === playerInfo.id);

  if (existingPlayer) {
    // If player (e.g., host or existing player) is "joining" to get tickets
    // Only assign tickets if they don't have any yet.
    if (existingPlayer.tickets.length === 0) {
        existingPlayer.tickets = Array.from({ length: numberOfTickets }, () => generateImprovedHousieTicket());
    } else {
        // Player already has tickets, maybe just update their name if it changed
        // Or return an error if re-buying tickets isn't allowed.
        // For now, let's assume they cannot buy more if they already have some.
        // This part might need refinement based on exact desired behavior.
        console.log(`Player ${playerInfo.id} already has tickets in room ${roomId}. Not re-assigning.`);
    }
    existingPlayer.name = playerInfo.name; // Update name if it changed (e.g. guest name update)
    existingPlayer.isHost = playerInfo.id === room.host.id; // Ensure host status is correct
  } else {
    // New player joining
    if (room.players.length >= room.settings.lobbySize) {
      return { error: "Room is full." };
    }
    const newPlayer: BackendPlayerInRoom = {
      id: playerInfo.id,
      name: playerInfo.name,
      isHost: playerInfo.id === room.host.id, // Ensure host status is correct if host is "joining"
      tickets: Array.from({ length: numberOfTickets }, () => generateImprovedHousieTicket()),
    };
    room.players.push(newPlayer);
  }
  
  rooms.set(roomId, room);
  console.log(`Player ${playerInfo.name} (${playerInfo.id}) confirmed/joined room ${roomId} with ${numberOfTickets} tickets.`);
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
  if (room.players.length < minPlayersRequired) {
    return { error: `Need at least ${minPlayersRequired} player(s) to start.` };
  }
  // Ensure all players (especially host) have tickets
  const playersWithoutTickets = room.players.filter(p => p.tickets.length === 0);
  if (playersWithoutTickets.length > 0) {
    const playerNames = playersWithoutTickets.map(p => p.name).join(', ');
    return { error: `Player(s) ${playerNames} need to confirm their tickets before starting.`};
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
    return { error: "All numbers called.", number: room.currentNumber ?? undefined };
  }

  const nextNumber = room.numberPool.pop();
  if (nextNumber === undefined) { 
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
  ticketIndex: number 
): Room | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: "Room not found." };
  if (!room.isGameStarted) return { error: "Game not started." };
  if (room.isGameOver && prizeType !== PRIZE_TYPES.FULL_HOUSE) { // Allow FH claim if game just ended by it
     // Re-check if FH claim is valid if isGameOver was true due to all numbers called.
     if (room.isGameOver && prizeType === PRIZE_TYPES.FULL_HOUSE && room.numberPool.length === 0) {
         // Allow FH claim if game over due to all numbers called
     } else {
        return { error: "Game is over." };
     }
  }


  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: "Player not found in this room." };
  if (ticketIndex < 0 || ticketIndex >= player.tickets.length) return { error: "Invalid ticket index." };
  
  const ticket = player.tickets[ticketIndex];

  // Check if the prize has already been claimed by *this* player
  if (room.prizeStatus[prizeType]?.claimedBy.includes(playerId)) {
    return { error: `You have already claimed ${prizeType}.` };
  }
  
  // If Full House has been claimed by *anyone*, no more claims for *other* prizes
  const isFullHouseAlreadyClaimedByAnyone = room.prizeStatus[PRIZE_TYPES.FULL_HOUSE] && room.prizeStatus[PRIZE_TYPES.FULL_HOUSE]!.claimedBy.length > 0;
  if (isFullHouseAlreadyClaimedByAnyone && prizeType !== PRIZE_TYPES.FULL_HOUSE) {
     return { error: "Full House already claimed, no more claims for other prizes." };
  }

  // Dynamic checkWinningCondition import - ensure this file path is correct
  const housieLib = require('@/lib/housie'); 
  const isValidClaim = housieLib.checkWinningCondition(ticket, room.calledNumbers, prizeType);

  if (!isValidClaim) return { error: `Claim for ${prizeType} on ticket ${ticketIndex + 1} is not valid (Bogey!).` };

  // If prize object doesn't exist or claimedBy is not an array, initialize it
  if (!room.prizeStatus[prizeType] || !Array.isArray(room.prizeStatus[prizeType]?.claimedBy)) {
    room.prizeStatus[prizeType] = { claimedBy: [], timestamp: new Date() };
  }
  room.prizeStatus[prizeType]!.claimedBy.push(playerId);
  
  let autoAwardedPrizes: PrizeType[] = [];

  if (prizeType === PRIZE_TYPES.FULL_HOUSE) {
    room.isGameOver = true;
    const linePrizesToAutoCheck: PrizeType[] = [PRIZE_TYPES.TOP_LINE, PRIZE_TYPES.MIDDLE_LINE, PRIZE_TYPES.BOTTOM_LINE];
    for (const linePrize of linePrizesToAutoCheck) {
      // Ensure prizeStatus[linePrize] exists and claimedBy is an array before checking its length
      const linePrizeClaim = room.prizeStatus[linePrize];
      if (!linePrizeClaim || !Array.isArray(linePrizeClaim.claimedBy) || linePrizeClaim.claimedBy.length === 0) {
        if (housieLib.checkWinningCondition(ticket, room.calledNumbers, linePrize)) {
          if (!room.prizeStatus[linePrize] || !Array.isArray(room.prizeStatus[linePrize]?.claimedBy)) {
            room.prizeStatus[linePrize] = { claimedBy: [], timestamp: new Date() };
          }
          room.prizeStatus[linePrize]!.claimedBy.push(playerId);
          autoAwardedPrizes.push(linePrize);
        }
      }
    }
  }

  rooms.set(roomId, room);
  return room; 
}

export function getRoomStateForClient(roomId: string): Omit<Room, 'numberPool'> | undefined {
    const room = getRoomStore(roomId); // Use the updated getRoomStore which handles expiration
    if (!room) return undefined;

    // Deep clone the room object to avoid modifying the original store object, especially for nested arrays/objects
    const roomCopy = JSON.parse(JSON.stringify(room)) as Room;
    const { numberPool, ...restOfRoom } = roomCopy;
    
    // Ensure players tickets are only included if the player is the "current user" or if it's explicitly allowed.
    // For now, we assume tickets are needed by client to render if they exist.
    const playersForClient = restOfRoom.players.map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        tickets: p.tickets || [], // Send tickets if they exist
    }));

    const prizeStatusForClient = { ...restOfRoom.prizeStatus };
    // Timestamps are already stringified by JSON.parse(JSON.stringify(room))
    // if they were Date objects initially. If they were stored as strings, no change needed.
    
    return {
        ...restOfRoom,
        // createdAt is also stringified by JSON.parse(JSON.stringify(room))
        players: playersForClient,
        prizeStatus: prizeStatusForClient
    };
}

// TODO: Add function to remove player (leave room)
// TODO: Add function to reset room for new game
