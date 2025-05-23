
import type { Room, Player, GameSettings, BackendPlayerInRoom, PrizeType, PrizeClaim, HousieTicketGrid } from '@/types';
import { PRIZE_TYPES } from '@/types';
import { generateImprovedHousieTicket } from '@/lib/housie';
import { NUMBERS_RANGE_MIN, NUMBERS_RANGE_MAX, DEFAULT_GAME_SETTINGS, MIN_LOBBY_SIZE, PRIZE_DEFINITIONS } from '@/lib/constants';

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
  // Initialize based on the default prize format or the room's specific format
  const defaultPrizeFormat = DEFAULT_GAME_SETTINGS.prizeFormat;
  const prizesForFormat = PRIZE_DEFINITIONS[defaultPrizeFormat] || Object.values(PRIZE_TYPES);

  (prizesForFormat as PrizeType[]).forEach(prize => {
    status[prize] = null; // No one has claimed initially
  });
  return status;
}

export function createRoomStore(host: Player, clientSettings?: Partial<GameSettings>): Room {
  const roomId = generateRoomId();
  const gameSettings: GameSettings = { ...DEFAULT_GAME_SETTINGS, ...clientSettings };

  const hostPlayerInRoom: BackendPlayerInRoom = {
    ...host,
    isHost: true,
    tickets: [], // Host gets tickets upon "joining" from lobby
  };

  const newRoom: Room = {
    id: roomId,
    host: { id: host.id, name: host.name, isHost: true },
    players: [hostPlayerInRoom],
    settings: gameSettings,
    createdAt: new Date(),
    isGameStarted: false,
    isGameOver: false,
    currentNumber: null,
    calledNumbers: [],
    numberPool: initializeNumberPool(),
    prizeStatus: initializePrizeStatus(), // Initialize with game-specific prizes if settings dictate
  };
  rooms.set(roomId, newRoom);
  console.log(`Room created: ${roomId} by host ${host.id}. Host needs to confirm tickets.`);
  return newRoom;
}

export function getRoomStore(roomId: string): Room | undefined {
  const room = rooms.get(roomId);
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
  const ticketsToGenerate = Math.max(1, numberOfTickets); // Ensure at least 1 ticket

  if (existingPlayerIndex !== -1) {
    // Player exists, update their tickets if they don't have any yet and game hasn't started
    if (room.players[existingPlayerIndex].tickets.length === 0 && ticketsToGenerate > 0 && !room.isGameStarted) {
        room.players[existingPlayerIndex].tickets = Array.from({ length: ticketsToGenerate }, () => generateImprovedHousieTicket());
        console.log(`Player ${playerInfo.id} (existing) confirmed ${ticketsToGenerate} tickets in room ${roomId}.`);
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
      tickets: Array.from({ length: ticketsToGenerate }, () => generateImprovedHousieTicket()),
    };
    room.players.push(newPlayer);
    console.log(`New player ${playerInfo.name} (${playerInfo.id}) joined room ${roomId} with ${ticketsToGenerate} tickets.`);
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
  room.isGameOver = false;
  room.numberPool = initializeNumberPool(); 
  room.calledNumbers = [];
  room.currentNumber = null;
  room.prizeStatus = initializePrizeStatus(); // Re-initialize prizes for a new game

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

  if (room.isGameOver && prizeType !== PRIZE_TYPES.FULL_HOUSE) { 
     return { error: "Game is over. No more claims." };
  }
  
  if (room.prizeStatus[prizeType]?.claimedBy.includes(playerId)) {
    return { error: `You have already claimed ${prizeType}.` };
  }
  
  const isFullHouseAlreadyClaimedByAnyone = room.prizeStatus[PRIZE_TYPES.FULL_HOUSE] && room.prizeStatus[PRIZE_TYPES.FULL_HOUSE]!.claimedBy.length > 0;
  if (isFullHouseAlreadyClaimedByAnyone && prizeType !== PRIZE_TYPES.FULL_HOUSE) {
     return { error: "Full House already claimed, no more claims for other prizes." };
  }

  const housieLib = require('@/lib/housie'); 
  if (typeof housieLib.checkWinningCondition !== 'function') {
      console.error("housie.checkWinningCondition is not a function. Check lib/housie.ts exports.");
      return { error: "Internal server error: Prize validation unavailable." };
  }
  const isValidClaim = housieLib.checkWinningCondition(ticket, room.calledNumbers, prizeType);

  if (!isValidClaim) return { error: `Claim for ${prizeType} on ticket ${ticketIndex + 1} is not valid (Bogey!).` };

  if (!room.prizeStatus[prizeType] || !Array.isArray(room.prizeStatus[prizeType]?.claimedBy)) {
    room.prizeStatus[prizeType] = { claimedBy: [], timestamp: new Date() };
  } else if (!room.prizeStatus[prizeType]!.timestamp) { // Ensure timestamp is set if claim object exists
    room.prizeStatus[prizeType]!.timestamp = new Date();
  }
  room.prizeStatus[prizeType]!.claimedBy.push(playerId);
  
  if (prizeType === PRIZE_TYPES.FULL_HOUSE) {
    room.isGameOver = true;
    const linePrizesToAutoCheck: PrizeType[] = [PRIZE_TYPES.TOP_LINE, PRIZE_TYPES.MIDDLE_LINE, PRIZE_TYPES.BOTTOM_LINE];
    for (const linePrize of linePrizesToAutoCheck) {
      const linePrizeClaim = room.prizeStatus[linePrize];
      if (!linePrizeClaim || linePrizeClaim.claimedBy.length === 0 || !linePrizeClaim.claimedBy.includes(playerId)) {
        if (housieLib.checkWinningCondition(ticket, room.calledNumbers, linePrize)) {
          if (!room.prizeStatus[linePrize] || !Array.isArray(room.prizeStatus[linePrize]?.claimedBy)) {
            room.prizeStatus[linePrize] = { claimedBy: [], timestamp: new Date() };
          }
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

export function getRoomStateForClient(roomId: string): Omit<Room, 'numberPool'> | undefined {
    const room = getRoomStore(roomId);
    if (!room) {
        console.warn(`getRoomStateForClient: Room ${roomId} not found in store.`);
        return undefined;
    }

    try {
        const playersForClient = room.players.map(p => ({
            id: p.id,
            name: p.name,
            isHost: p.isHost,
            // Ensure tickets are an array, even if empty. Assuming HousieTicketGrid is serializable.
            tickets: Array.isArray(p.tickets) ? p.tickets : [], 
        }));

        const prizeStatusForClient: Record<PrizeType, PrizeClaim | null> = {} as any;
        // Use the room's settings to determine relevant prizes, or fallback to default PRIZE_TYPES
        const currentPrizeFormat = room.settings?.prizeFormat || DEFAULT_GAME_SETTINGS.prizeFormat;
        const prizesToConsider = PRIZE_DEFINITIONS[currentPrizeFormat] || Object.values(PRIZE_TYPES);

        prizesToConsider.forEach(prizeKey => {
            const prize = prizeKey as PrizeType;
            const claim = room.prizeStatus[prize];
            if (claim) {
                prizeStatusForClient[prize] = {
                    claimedBy: claim.claimedBy,
                    // Ensure timestamp is ISO string if it exists
                    timestamp: claim.timestamp ? new Date(claim.timestamp).toISOString() : undefined,
                };
            } else {
                prizeStatusForClient[prize] = null;
            }
        });
        
        // Construct the client-facing room object
        const clientRoomData = {
            id: room.id,
            host: room.host, // Player type should be serializable
            players: playersForClient,
            settings: room.settings, // GameSettings should be serializable
            createdAt: new Date(room.createdAt).toISOString(), // Ensure createdAt is ISO string
            isGameStarted: room.isGameStarted,
            isGameOver: room.isGameOver,
            currentNumber: room.currentNumber,
            calledNumbers: room.calledNumbers,
            prizeStatus: prizeStatusForClient,
            // numberPool is intentionally omitted
        };
        return clientRoomData;

    } catch (e) {
        console.error(`Error preparing room data for client for room ${roomId}:`, e);
        // If any error occurs during preparation, return undefined to signal an issue.
        // The API route will then typically return a 404 or 500.
        return undefined; 
    }
}
