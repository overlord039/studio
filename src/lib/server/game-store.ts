

import type { Room, Player, GameSettings, BackendPlayerInRoom, PrizeType, PrizeClaim, HousieTicketGrid, CallingMode, OnlineGameTier } from '@/types';
import { PRIZE_TYPES } from '@/types';
import { generateMultipleUniqueTickets } from '@/lib/housie';
import { db } from '@/lib/firebase/config';
import { doc, writeBatch, increment, getDoc, runTransaction } from 'firebase/firestore';
import { NUMBERS_RANGE_MIN, NUMBERS_RANGE_MAX, DEFAULT_GAME_SETTINGS, MIN_LOBBY_SIZE, PRIZE_DEFINITIONS, PRIZE_DISTRIBUTION_PERCENTAGES, DEFAULT_NUMBER_OF_TICKETS_PER_PLAYER, SERVER_CALL_INTERVAL } from '@/lib/constants';

declare global {
  // eslint-disable-next-line no-var
  var housieRooms: Map<string, Room>;
  // eslint-disable-next-line no-var
  var roomTimers: Map<string, NodeJS.Timeout>;
}

const rooms = global.housieRooms || (global.housieRooms = new Map<string, Room>());
const roomTimers = global.roomTimers || (global.roomTimers = new Map<string, NodeJS.Timeout>());

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
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
    status[prize] = { claimedBy: [] };
  });
  return status;
}

function stopRoomTimer(roomId: string, reason: string) {
  const timerId = roomTimers.get(roomId);
  if (timerId) {
    clearInterval(timerId);
    clearTimeout(timerId); // Also clear timeout for matchmaking
    roomTimers.delete(roomId);
    console.log(`Room ${roomId}: Timer stopped. Reason: ${reason}`);
  }
}

const scheduleNextCall = (roomId: string) => {
    // Set a consistent 1-second delay before the first number call.
    const initialDelay = 1000; 

    const timerId = setTimeout(() => {
        const room = getRoomStore(roomId);
        if (room && room.isGameStarted && !room.isGameOver) {
            callNextNumberStore(roomId); // This is the first call
            
            // Now set up the regular interval for all subsequent calls
            const intervalId = setInterval(() => {
                const currentRoom = getRoomStore(roomId);
                if (currentRoom && currentRoom.isGameStarted && !currentRoom.isGameOver) {
                    callNextNumberStore(roomId);
                } else {
                    stopRoomTimer(roomId, !currentRoom ? "Room no longer exists" : "Game not started or already over");
                }
            }, SERVER_CALL_INTERVAL);
            roomTimers.set(roomId, intervalId); // Store the interval timer
        } else {
            stopRoomTimer(roomId, !room ? "Room no longer exists" : "Game not started or already over before first call");
        }
    }, initialDelay);
    
    roomTimers.set(roomId, timerId); // Store the initial timeout
};

export function createRoomStore(host: Player, clientSettings?: Partial<GameSettings>): Room {
  const roomId = generateRoomId();
  const gameSettings: GameSettings = { ...DEFAULT_GAME_SETTINGS, ...clientSettings };
  
  const hostPlayer: BackendPlayerInRoom = {
    id: host.id,
    name: host.name,
    isHost: true,
    isBot: !!host.isBot,
    tickets: [],
    confirmedTicketCost: 0,
  };

  const newRoom: Room = {
    id: roomId,
    host: { id: host.id, name: host.name, isHost: true },
    players: [hostPlayer], // Add the host as the first player
    settings: gameSettings,
    createdAt: new Date(),
    isGameStarted: false,
    isGameOver: false,
    currentNumber: null,
    calledNumbers: [],
    numberPool: initializeNumberPool(),
    prizeStatus: initializePrizeStatus(gameSettings),
    lastNumberCalledTimestamp: undefined,
    totalPrizePool: 0,
  };
  rooms.set(roomId, newRoom);
  console.log(`Room created: ${roomId} by host ${host.id}. Mode: ${gameSettings.gameMode}`);
  return newRoom;
}

export function getRoomStore(roomId: string): Room | undefined {
  const room = rooms.get(roomId);
  if (room && !room.isGameStarted && (new Date().getTime() - new Date(room.createdAt).getTime()) > 24 * 60 * 60 * 1000) {
    stopRoomTimer(roomId, "Room expired due to inactivity");
    rooms.delete(roomId);
    console.log(`Room ${roomId} expired and deleted.`);
    return undefined;
  }
  return room;
}

export function addPlayerToRoomStore(roomId: string, playerInfo: Player, numberOfTickets: number): Room | { error: string } {
    const room = rooms.get(roomId);
    if (!room) return { error: "Room not found." };
    if (room.isGameStarted && !room.isGameOver) return { error: "Game is currently in progress. Cannot join now." };
    
    const existingPlayerIndex = room.players.findIndex(p => p.id === playerInfo.id);
    let player: BackendPlayerInRoom;

    if (existingPlayerIndex !== -1) {
        // Player exists, update their tickets if a positive number is passed.
        player = room.players[existingPlayerIndex];
        if (numberOfTickets > 0) {
            player.tickets = generateMultipleUniqueTickets(numberOfTickets);
            player.confirmedTicketCost = room.settings.ticketPrice * numberOfTickets;
        }
    } else {
        // New player
        if (room.players.length >= room.settings.lobbySize) return { error: "Room is full." };

        player = {
          id: playerInfo.id,
          name: playerInfo.name,
          isHost: room.players.length === 0, // First player is the host
          isBot: !!playerInfo.isBot,
          tickets: numberOfTickets > 0 ? generateMultipleUniqueTickets(numberOfTickets) : [],
          confirmedTicketCost: room.settings.ticketPrice * numberOfTickets,
        };
        room.players.push(player);
    }
    
    room.totalPrizePool = room.players.reduce((sum, p) => sum + (p.confirmedTicketCost || 0), 0);
    rooms.set(roomId, room);
    return room;
}

export function startGameInRoomStore(roomId: string, hostId: string): Room | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: "Room not found." };
  
  if (room.isGameStarted) return { error: "Game has already started." };
  if (room.isGameOver) return { error: "Game is over. Reset the room to start a new game." };
  
  const isBotGame = room.settings.gameMode && ['easy', 'medium', 'hard'].includes(room.settings.gameMode);

  // For public/bot games, any server trigger can start it. For private, only host.
  if (!room.settings.isPublic && !isBotGame && room.host.id !== hostId) {
    return { error: `Only the host can start the game. Current host: ${room.host.name}, trying to start: ${hostId}` };
  }

  const playersWithTickets = room.players.filter(p => p.tickets.length > 0).length;
  // For online games that are being auto-started, we might not have a ticketed player yet, so we allow it to proceed.
  const minPlayersToStart = room.settings.gameMode === 'online' ? 0 : (room.settings.gameMode === 'multiplayer' ? MIN_LOBBY_SIZE : 1);

  if (playersWithTickets < minPlayersToStart) {
     return { error: `Need at least ${minPlayersToStart} player(s) with tickets. Currently: ${playersWithTickets}` };
  }
  
  room.isGameStarted = true;
  room.numberPool = initializeNumberPool();
  
  if (room.settings.callingMode === 'auto') {
    // Start the recursive calling loop
    scheduleNextCall(roomId);
  }


  rooms.set(roomId, room);
  console.log(`Game started in room: ${roomId}.`);
  return room;
}

export function resetRoomStore(roomId: string, hostId: string): Room | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: "Room not found." };
  if (room.host.id !== hostId) return { error: "Only the host can reset the game." };

  room.isGameStarted = false;
  room.isGameOver = false;
  room.currentNumber = null;
  room.calledNumbers = [];
  room.numberPool = initializeNumberPool();
  room.prizeStatus = initializePrizeStatus(room.settings);
  room.lastNumberCalledTimestamp = undefined;
  room.totalPrizePool = 0;

  room.players.forEach(player => {
    player.tickets = [];
    player.confirmedTicketCost = 0;
  });
  
  stopRoomTimer(roomId, "Room was reset by the host.");
  rooms.set(roomId, room);
  return room;
}

export function removePlayerFromRoomStore(roomId: string, playerId: string): { success: boolean; error?: string } {
    const room = rooms.get(roomId);
    if (!room) return { success: false, error: "Room not found." };

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return { success: false, error: "Player not found in room." };

    const leavingPlayer = room.players[playerIndex];

    if (db && !leavingPlayer.isBot && !room.isGameStarted && leavingPlayer.confirmedTicketCost > 0) {
        runTransaction(db, async (t) => t.update(doc(db, "users", leavingPlayer.id), { 'stats.coins': increment(leavingPlayer.confirmedTicketCost!) }))
          .then(() => console.log(`Refunded ${leavingPlayer.confirmedTicketCost} coins to ${leavingPlayer.name}.`))
          .catch(err => console.error(`Failed to refund coins to ${leavingPlayer.name}: ${err}`));
    }

    room.players.splice(playerIndex, 1);
    
    // If the room becomes empty, delete it
    if (room.players.length === 0) {
        stopRoomTimer(roomId, "Room is empty.");
        rooms.delete(roomId);
        console.log(`Room ${roomId} is empty and has been deleted.`);
        return { success: true };
    }

    // If the host leaves, assign a new one
    if (leavingPlayer.isHost) {
        const newHost = room.players.find(p => !p.isBot) || room.players[0];
        if (newHost) {
          newHost.isHost = true;
          room.host = { id: newHost.id, name: newHost.name, isHost: true };
        }
    }
    
    room.totalPrizePool = room.players.reduce((sum, player) => sum + (player.confirmedTicketCost || 0), 0);
    rooms.set(roomId, room);
    return { success: true };
}

export function callNextNumberStore(roomId: string): Room | { error: string; number?: number } {
  const room = rooms.get(roomId);
  if (!room) return { error: "Room not found." };
  if (!room.isGameStarted || room.isGameOver) return { error: "Game not active." };
  if (room.numberPool.length === 0) {
    room.isGameOver = true;
    stopRoomTimer(roomId, "All numbers called.");
    rooms.set(roomId, room);
    return { error: "All numbers called." };
  }

  const nextNumber = room.numberPool.pop()!;
  room.currentNumber = nextNumber;
  room.calledNumbers.unshift(nextNumber);
  room.lastNumberCalledTimestamp = new Date();
  
  // --- Bot Prize Claiming Logic ---
  const prizeOrder = [PRIZE_TYPES.EARLY_5, PRIZE_TYPES.FIRST_LINE, PRIZE_TYPES.SECOND_LINE, PRIZE_TYPES.THIRD_LINE, PRIZE_TYPES.FULL_HOUSE];
  
  for (const prize of prizeOrder) {
    if (room.prizeStatus[prize] && room.prizeStatus[prize]!.claimedBy.length > 0) {
      continue; // Prize already claimed, skip to next.
    }
    
    // Check all bots to see if any can claim this prize
    for (const player of room.players) {
        if (player.isBot) {
            // Check each of the bot's tickets for the current prize
            for (let i = 0; i < player.tickets.length; i++) {
                const ticket = player.tickets[i];
                const housieLib = require('@/lib/housie');
                if (housieLib.checkWinningCondition(ticket, room.calledNumbers, prize)) {
                    // Bot can claim!
                    claimPrizeStore(roomId, player.id, prize, i);
                    console.log(`Bot ${player.name} claimed ${prize}.`);
                    break; // Bot has claimed, move to next prize check
                }
            }
        }
        // If prize was claimed by a bot, break the inner player loop and check the next prize.
        if (room.prizeStatus[prize]!.claimedBy.length > 0) {
            break;
        }
    }
  }

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
  
  if (room.prizeStatus[prizeType]?.claimedBy.some(c => c.id === playerId)) {
    return { error: `You have already claimed ${prizeType}.` };
  }

  const isFullHouseAlreadyClaimedByAnyone = room.prizeStatus[PRIZE_TYPES.FULL_HOUSE] && room.prizeStatus[PRIZE_TYPES.FULL_HOUSE]!.claimedBy.length > 0;
  if (isFullHouseAlreadyClaimedByAnyone && prizeType !== PRIZE_TYPES.FULL_HOUSE) {
    return { error: "Full House already claimed, no more claims for other prizes." };
  }

  const housieLib = require('@/lib/housie');
  let isValidClaim = false;
  
  for (const ticket of player.tickets) {
    if (housieLib.checkWinningCondition(ticket, room.calledNumbers, prizeType)) {
      isValidClaim = true;
      break; 
    }
  }

  if (!isValidClaim) return { error: `Claim for ${prizeType} is not valid (Bogey!).` };

  if (!room.prizeStatus[prizeType]) {
    room.prizeStatus[prizeType] = { claimedBy: [], timestamp: new Date() };
  }
  room.prizeStatus[prizeType]!.claimedBy.push({ id: player.id, name: player.name });

  if (prizeType === PRIZE_TYPES.FULL_HOUSE) {
    room.isGameOver = true;
    stopRoomTimer(roomId, "Full House claimed");
  }

  rooms.set(roomId, room);
  return room;
}

export function getRoomStateForClient(roomId: string): Omit<Room, 'numberPool'> | undefined {
  const room = getRoomStore(roomId);
  if (!room) return undefined;

  const { numberPool, ...clientRoom } = room;
  return clientRoom;
}


export function kickPlayerStore(roomId: string, hostId: string, playerIdToKick: string): Room | { error: string } {
    const room = getRoomStore(roomId);
    if (!room) return { error: "Room not found." };
    if (room.host.id !== hostId) return { error: "Only the host can kick players." };
    if (hostId === playerIdToKick) return { error: "Host cannot kick themselves." };

    const removeResult = removePlayerFromRoomStore(roomId, playerIdToKick);
    if (!removeResult.success) {
        return { error: removeResult.error || "Failed to kick player." };
    }
    return room;
}

export function transferHostStore(roomId: string, currentHostId: string, newHostId: string): Room | { error: string } {
    const room = getRoomStore(roomId);
    if (!room) return { error: "Room not found." };
    if (room.host.id !== currentHostId) return { error: "Only the current host can transfer ownership." };

    const currentHostPlayer = room.players.find(p => p.id === currentHostId);
    const newHostPlayer = room.players.find(p => p.id === newHostId);

    if (!newHostPlayer) return { error: "New host not found in the room." };
    if (newHostPlayer.isBot) return { error: "Cannot make a bot the host."};

    if (currentHostPlayer) {
        currentHostPlayer.isHost = false;
    }
    newHostPlayer.isHost = true;
    room.host = { id: newHostPlayer.id, name: newHostPlayer.name, isHost: true };
    
    rooms.set(roomId, room);
    return room;
}

export function updateCallingModeStore(roomId: string, hostId: string, newMode: CallingMode): Room | { error: string } {
    const room = getRoomStore(roomId);
    if (!room) return { error: "Room not found." };
    if (room.host.id !== hostId) return { error: "Only the host can change the calling mode." };

    room.settings.callingMode = newMode;
    rooms.set(roomId, room);

    if (newMode === 'auto' && room.isGameStarted && !roomTimers.has(roomId)) {
        scheduleNextCall(roomId);
    } else if (newMode === 'manual') {
        stopRoomTimer(roomId, "Switched to manual calling mode.");
    }
    
    return room;
}
