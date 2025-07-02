
import type { Room, Player, GameSettings, BackendPlayerInRoom, PrizeType, PrizeClaim, HousieTicketGrid, CallingMode } from '@/types';
import { PRIZE_TYPES } from '@/types';
import { generateImprovedHousieTicket } from '@/lib/housie';
import { NUMBERS_RANGE_MIN, NUMBERS_RANGE_MAX, DEFAULT_GAME_SETTINGS, MIN_LOBBY_SIZE, PRIZE_DEFINITIONS, DEFAULT_NUMBER_OF_TICKETS_PER_PLAYER, SERVER_CALL_INTERVAL } from '@/lib/constants';

declare global {
  // eslint-disable-next-line no-var
  var housieRooms: Map<string, Room>;
  // eslint-disable-next-line no-var
  var roomTimers: Map<string, NodeJS.Timeout>;
}

const rooms = global.housieRooms || (global.housieRooms = new Map<string, Room>());
const roomTimers = global.roomTimers || (global.roomTimers = new Map<string, NodeJS.Timeout>());

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase(); // 6-char alphanumeric
}

function initializeNumberPool(): number[] {
  const pool = Array.from({ length: NUMBERS_RANGE_MAX - NUMBERS_RANGE_MIN + 1 }, (_, i) => NUMBERS_RANGE_MIN + i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function initializePrizeStatus(roomSettings: GameSettings): Record<PrizeType, PrizeClaim | null> {
  const status: Record<PrizeType, PrizeClaim | null> = {} as Record<PrizeType, PrizeClaim | null>;
  const prizeFormat = roomSettings.prizeFormat || DEFAULT_GAME_SETTINGS.prizeFormat;
  const prizesForFormat = PRIZE_DEFINITIONS[prizeFormat] || Object.values(PRIZE_TYPES);

  (prizesForFormat as PrizeType[]).forEach(prize => {
    status[prize] = null;
  });
  return status;
}

function stopRoomTimer(roomId: string, reason: string) {
  const timerId = roomTimers.get(roomId);
  if (timerId) {
    clearInterval(timerId);
    roomTimers.delete(roomId);
    console.log(`Room ${roomId}: Server-side auto-calling stopped. Reason: ${reason}`);
  }
}

export function createRoomStore(host: Player, clientSettings?: Partial<GameSettings>): Room {
  const roomId = generateRoomId();
  const gameSettings: GameSettings = { ...DEFAULT_GAME_SETTINGS, ...clientSettings };

  const hostPlayerInRoom: BackendPlayerInRoom = {
    ...host,
    isHost: true,
    tickets: [], 
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
    prizeStatus: initializePrizeStatus(gameSettings),
    lastNumberCalledTimestamp: undefined,
  };
  rooms.set(roomId, newRoom);
  console.log(`Room created: ${roomId} by host ${host.id}.`);
  return newRoom;
}

export function getRoomStore(roomId: string): Room | undefined {
  const room = rooms.get(roomId);
  // Room expiration logic (e.g., 24 hours for inactive rooms)
  if (room && !room.isGameStarted && (new Date().getTime() - new Date(room.createdAt).getTime()) > 24 * 60 * 60 * 1000) {
    stopRoomTimer(roomId, "Room expired due to inactivity");
    rooms.delete(roomId);
    console.log(`Room ${roomId} expired and deleted.`);
    return undefined;
  }
  return room;
}

export function addPlayerToRoomStore(roomId: string, playerInfo: { id: string; name: string }, numberOfTickets?: number): Room | { error: string } {
  const room = rooms.get(roomId);
  if (!room) {
    return { error: "Room not found." };
  }

  // Allow joining/updating tickets only if the game is not actively in progress.
  // A game is active if it has started but is not over.
  if (room.isGameStarted && !room.isGameOver) {
      const existingPlayer = room.players.find(p => p.id === playerInfo.id);
      // Allow re-connection for existing players, but no changes.
      if (existingPlayer) {
           console.log(`Player ${playerInfo.id} reconnected to active game ${roomId}. No changes allowed.`);
           return room;
      }
      return { error: "Game is currently in progress. Cannot join now." };
  }


  const numTicketsToGenerate = Math.max(1, numberOfTickets === undefined ? (room.settings.numberOfTicketsPerPlayer || DEFAULT_NUMBER_OF_TICKETS_PER_PLAYER) : numberOfTickets);

  const existingPlayerIndex = room.players.findIndex(p => p.id === playerInfo.id);

  if (existingPlayerIndex !== -1) {
    const existingPlayer = room.players[existingPlayerIndex];
    existingPlayer.name = playerInfo.name;
    existingPlayer.isHost = playerInfo.id === room.host.id;

    // Regenerate tickets only if the requested count is different.
    if (existingPlayer.tickets.length !== numTicketsToGenerate) {
        existingPlayer.tickets = Array.from({ length: numTicketsToGenerate }, () => generateImprovedHousieTicket());
        console.log(`Player ${playerInfo.id} in room ${roomId} updated tickets to ${numTicketsToGenerate}.`);
    } else {
        console.log(`Player ${playerInfo.id} re-confirmed ${numTicketsToGenerate} tickets in room ${roomId}. No changes.`);
    }
  } else {
    // New player joining
    if (room.players.length >= room.settings.lobbySize) {
      return { error: "Room is full." };
    }
    const newPlayer: BackendPlayerInRoom = {
      id: playerInfo.id,
      name: playerInfo.name,
      isHost: playerInfo.id === room.host.id,
      tickets: Array.from({ length: numTicketsToGenerate }, () => generateImprovedHousieTicket()),
    };
    room.players.push(newPlayer);
    console.log(`New player ${playerInfo.name} (${playerInfo.id}) joined room ${roomId} with ${numTicketsToGenerate} tickets.`);
  }

  rooms.set(roomId, room);
  return room;
}

export function startGameInRoomStore(roomId: string, hostId: string): Room | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: "Room not found." };
  if (room.host.id !== hostId) return { error: "Only the host can start the game." };
  if (room.isGameStarted) return { error: "Game has already started." };
  if (room.isGameOver) return { error: "Game is over. Reset the room to start a new game." };


  const hostPlayer = room.players.find(p => p.id === hostId && p.isHost);
  if (!hostPlayer || hostPlayer.tickets.length === 0) {
    return { error: `Host must have tickets before starting.` };
  }

  const minPlayersRequired = process.env.NODE_ENV === 'development' ? 1 : MIN_LOBBY_SIZE;
  const playersWithTickets = room.players.filter(p => p.tickets.length > 0).length;

  if (playersWithTickets < minPlayersRequired) {
    return { error: `Need at least ${minPlayersRequired} player(s) with tickets to start. Currently: ${playersWithTickets}` };
  }

  room.isGameStarted = true;
  room.isGameOver = false;
  room.numberPool = initializeNumberPool();
  room.calledNumbers = [];
  room.currentNumber = null;
  room.prizeStatus = initializePrizeStatus(room.settings);
  room.lastNumberCalledTimestamp = undefined;
  
  // Start server-side timer for number calling ONLY if mode is 'auto'
  if (room.settings.callingMode === 'auto' && !roomTimers.has(roomId)) {
    console.log(`Room ${roomId}: Attempting to start server-side auto-calling.`);
    const intervalId = setInterval(() => {
      const currentRoomState = getRoomStore(roomId); // Get fresh state
      if (!currentRoomState || !currentRoomState.isGameStarted || currentRoomState.isGameOver) {
        stopRoomTimer(roomId, !currentRoomState ? "Room no longer exists" : "Game not started or already over");
        return;
      }
       if (currentRoomState.settings.callingMode !== 'auto') {
        stopRoomTimer(roomId, "Mode switched away from auto.");
        return;
      }
      
      const result = callNextNumberStore(roomId); 
      
      if (result && 'error' in result) {
        if (result.error === "All numbers called.") {
            // Game over state is set within callNextNumberStore
        } else {
            console.error(`Error auto-calling number for room ${roomId}: ${result.error}`);
        }
      } else if (result && !('error' in result)) {
         console.log(`Room ${roomId}: Server auto-called number. New current is ${result.currentNumber}`);
      }

    }, SERVER_CALL_INTERVAL); 
    roomTimers.set(roomId, intervalId);
    console.log(`Room ${roomId}: Server-side auto-calling started with interval ID ${intervalId}. Interval: ${SERVER_CALL_INTERVAL}ms`);
  }

  rooms.set(roomId, room);
  console.log(`Game started in room: ${roomId}.`);
  return room;
}

export function resetRoomStore(roomId: string, hostId: string): Room | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: "Room not found." };
  if (room.host.id !== hostId) return { error: "Only the host can reset the game." };
  if (!room.isGameOver && room.isGameStarted) {
    return { error: "Game is not over yet. Cannot reset." };
  }


  // Reset game state
  room.isGameStarted = false;
  room.isGameOver = false;
  room.currentNumber = null;
  room.calledNumbers = [];
  room.numberPool = initializeNumberPool();
  room.prizeStatus = initializePrizeStatus(room.settings);
  room.lastNumberCalledTimestamp = undefined;

  // Clear tickets for all players so they have to re-confirm
  room.players.forEach(player => {
    player.tickets = [];
  });
  
  stopRoomTimer(roomId, "Room was reset by the host for a new game.");

  rooms.set(roomId, room);
  console.log(`Room ${roomId} was reset by host ${hostId}. Ready for a new game.`);
  return room;
}

export function removePlayerFromRoomStore(roomId: string, playerId: string): { success: boolean; error?: string } {
  const room = rooms.get(roomId);
  if (!room) {
    return { success: false, error: "Room not found." };
  }

  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    return { success: false, error: "Player not found in room." };
  }

  const leavingPlayer = room.players[playerIndex];
  room.players.splice(playerIndex, 1);
  console.log(`Player ${playerId} has left room ${roomId}.`);

  if (room.players.length === 0) {
    stopRoomTimer(roomId, "Room is empty.");
    rooms.delete(roomId);
    console.log(`Room ${roomId} is empty and has been deleted.`);
  } else if (leavingPlayer.isHost) {
    // Host migration
    const newHost = room.players[0];
    newHost.isHost = true;
    room.host = { id: newHost.id, name: newHost.name, isHost: true };
    console.log(`Host migration in room ${roomId}: ${newHost.id} is the new host.`);
  }
  
  rooms.set(roomId, room);
  return { success: true };
}

export function transferHostStore(
  roomId: string,
  currentHostId: string,
  newHostId: string
): Room | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: "Room not found." };
  if (room.host.id !== currentHostId) return { error: "Only the current host can transfer ownership." };
  if (room.isGameStarted) return { error: "Cannot transfer host once the game has started." };

  const currentHost = room.players.find(p => p.id === currentHostId);
  const newHost = room.players.find(p => p.id === newHostId);

  if (!currentHost) return { error: "Current host not found in players list." };
  if (!newHost) return { error: "Target player to become host not found." };

  // Swap host status
  currentHost.isHost = false;
  newHost.isHost = true;
  room.host = { id: newHost.id, name: newHost.name, isHost: true };

  rooms.set(roomId, room);
  console.log(`Host for room ${roomId} transferred from ${currentHostId} to ${newHostId}.`);
  return room;
}

export function kickPlayerStore(
  roomId: string,
  hostId: string,
  playerIdToKick: string
): Room | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: "Room not found." };
  if (room.host.id !== hostId) return { error: "Only the host can kick players." };
  if (hostId === playerIdToKick) return { error: "Host cannot kick themselves." };
  if (room.isGameStarted) return { error: "Cannot kick players once the game has started." };

  const playerIndex = room.players.findIndex(p => p.id === playerIdToKick);
  if (playerIndex === -1) {
    return { error: "Player to kick not found in room." };
  }

  const kickedPlayerName = room.players[playerIndex].name;
  room.players.splice(playerIndex, 1);
  
  rooms.set(roomId, room);
  console.log(`Player ${kickedPlayerName} (${playerIdToKick}) was kicked from room ${roomId} by host ${hostId}.`);
  return room;
}


export function callNextNumberStore(roomId: string): Room | { error: string; number?: number } {
  const room = rooms.get(roomId);
  if (!room) return { error: "Room not found." };
  if (!room.isGameStarted) return { error: "Game not started." };
  if (room.isGameOver) { 
    stopRoomTimer(roomId, "Game is already over (checked in callNextNumberStore).");
    return { error: "Game is over." };
  }

  if (room.numberPool.length === 0) {
    room.isGameOver = true;
    room.lastNumberCalledTimestamp = new Date(); 
    if (!room.prizeStatus[PRIZE_TYPES.FULL_HOUSE] || room.prizeStatus[PRIZE_TYPES.FULL_HOUSE]!.claimedBy.length === 0) {
      console.log(`Room ${roomId}: All numbers called. No Full House winner.`);
    }
    rooms.set(roomId, room); 
    stopRoomTimer(roomId, "All numbers called (detected in callNextNumberStore).");
    return { error: "All numbers called.", number: room.currentNumber ?? undefined };
  }

  const nextNumber = room.numberPool.pop();
  if (nextNumber === undefined) { 
    room.isGameOver = true;
    room.lastNumberCalledTimestamp = new Date();
    rooms.set(roomId, room);
    stopRoomTimer(roomId, "Number pool unexpectedly empty (callNextNumberStore).");
    return { error: "Error getting next number from pool (pool might be unexpectedly empty).", number: room.currentNumber ?? undefined };
  }

  room.currentNumber = nextNumber;
  room.calledNumbers.push(nextNumber);
  room.lastNumberCalledTimestamp = new Date();
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
  
  if (room.isGameOver && prizeType !== PRIZE_TYPES.FULL_HOUSE) {
    return { error: "Game is over. No more claims except potentially Full House if it's the last one." };
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
  
  let isValidClaim = false;
  let winningTicket: HousieTicketGrid | null = null;
  
  for (const ticket of player.tickets) {
    if (housieLib.checkWinningCondition(ticket, room.calledNumbers, prizeType)) {
      isValidClaim = true;
      winningTicket = ticket; 
      break; 
    }
  }

  if (!isValidClaim) return { error: `Claim for ${prizeType} is not valid (Bogey!).` };

  if (!room.prizeStatus[prizeType] || !Array.isArray(room.prizeStatus[prizeType]?.claimedBy)) {
    room.prizeStatus[prizeType] = { claimedBy: [], timestamp: new Date() };
  } else if (!room.prizeStatus[prizeType]!.timestamp) { 
    room.prizeStatus[prizeType]!.timestamp = new Date();
  }
  room.prizeStatus[prizeType]!.claimedBy.push(playerId);

  if (prizeType === PRIZE_TYPES.FULL_HOUSE && winningTicket) {
    room.isGameOver = true;
    console.log(`Room ${roomId}: Full House claimed by ${playerId}. Game Over.`);
    stopRoomTimer(roomId, "Full House claimed");

    const linePrizesToAutoCheck: PrizeType[] = [PRIZE_TYPES.TOP_LINE, PRIZE_TYPES.MIDDLE_LINE, PRIZE_TYPES.BOTTOM_LINE];
    for (const linePrize of linePrizesToAutoCheck) {
      const isLinePrizeClaimed = room.prizeStatus[linePrize]?.claimedBy?.length > 0;
      
      if (!isLinePrizeClaimed) {
        if (housieLib.checkWinningCondition(winningTicket, room.calledNumbers, linePrize)) {
          if (!room.prizeStatus[linePrize]) { 
            room.prizeStatus[linePrize] = { claimedBy: [], timestamp: new Date() };
          }
          
          room.prizeStatus[linePrize]!.claimedBy.push(playerId);
          
          if (room.prizeStatus[prizeType]?.timestamp) {
             room.prizeStatus[linePrize]!.timestamp = room.prizeStatus[prizeType]!.timestamp;
          }
          console.log(`Auto-awarded ${linePrize} to ${playerId} during Full House claim in room ${roomId}`);
        }
      }
    }
  }

  rooms.set(roomId, room);
  return room;
}

export function updateCallingModeStore(roomId: string, hostId: string, newMode: CallingMode): Room | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: "Room not found." };
  if (room.host.id !== hostId) return { error: "Only the host can change the calling mode." };
  if (!room.isGameStarted || room.isGameOver) return { error: "Calling mode can only be changed during an active game." };

  // Update the setting
  room.settings.callingMode = newMode;
  console.log(`Room ${roomId}: Calling mode changed to ${newMode} by host.`);

  // Manage the timer
  if (newMode === 'auto') {
    if (!roomTimers.has(roomId)) {
      console.log(`Room ${roomId}: Starting server-side auto-calling due to mode change.`);
      const intervalId = setInterval(() => {
        const currentRoomState = getRoomStore(roomId);
        if (!currentRoomState || !currentRoomState.isGameStarted || currentRoomState.isGameOver) {
          stopRoomTimer(roomId, !currentRoomState ? "Room no longer exists" : "Game not started or already over");
          return;
        }
        if (currentRoomState.settings.callingMode !== 'auto') {
            stopRoomTimer(roomId, "Mode switched away from auto.");
            return;
        }
        
        const result = callNextNumberStore(roomId); 
        
        if (result && 'error' in result) {
          if (result.error === "All numbers called.") {
            // State is handled inside callNextNumberStore
          } else {
              console.error(`Error auto-calling number for room ${roomId}: ${result.error}`);
          }
        }
      }, SERVER_CALL_INTERVAL); 
      roomTimers.set(roomId, intervalId);
    }
  } else { // newMode is 'manual'
    stopRoomTimer(roomId, "Mode switched to manual by host.");
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
      tickets: Array.isArray(p.tickets) ? p.tickets : [], 
    }));

    const prizeStatusForClient: Record<PrizeType, PrizeClaim | null> = {} as any;
    const currentPrizeFormat = room.settings?.prizeFormat || DEFAULT_GAME_SETTINGS.prizeFormat;
    const prizesToConsider = PRIZE_DEFINITIONS[currentPrizeFormat] || Object.values(PRIZE_TYPES);

    prizesToConsider.forEach(prizeKey => {
      const prize = prizeKey as PrizeType;
      const claim = room.prizeStatus[prize];
      if (claim) {
        prizeStatusForClient[prize] = {
          claimedBy: claim.claimedBy,
          timestamp: claim.timestamp ? (typeof claim.timestamp === 'string' ? claim.timestamp : new Date(claim.timestamp).toISOString()) : undefined,
        };
      } else {
        prizeStatusForClient[prize] = null;
      }
    });

    const clientRoomData = {
      id: room.id,
      host: room.host,
      players: playersForClient,
      settings: room.settings,
      createdAt: typeof room.createdAt === 'string' ? room.createdAt : new Date(room.createdAt).toISOString(),
      isGameStarted: room.isGameStarted,
      isGameOver: room.isGameOver,
      currentNumber: room.currentNumber,
      calledNumbers: room.calledNumbers,
      prizeStatus: prizeStatusForClient,
      lastNumberCalledTimestamp: room.lastNumberCalledTimestamp ? (typeof room.lastNumberCalledTimestamp === 'string' ? room.lastNumberCalledTimestamp : new Date(room.lastNumberCalledTimestamp).toISOString()) : undefined,
    };
    return clientRoomData;

  } catch (e) {
    console.error(`Error preparing room data for client for room ${roomId}:`, e);
    return undefined;
  }
}
