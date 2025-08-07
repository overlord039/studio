

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
    id: host.id,
    name: host.name,
    isHost: true,
    tickets: [], 
    isBot: false,
    confirmedTicketCost: 0,
  };
  
  if (gameSettings.gameMode === 'rush') {
      const numTickets = 1 + Math.floor(Math.random() * 4);
      hostPlayerInRoom.tickets = generateMultipleUniqueTickets(numTickets);
      hostPlayerInRoom.confirmedTicketCost = 0; // Rush mode is free
  }


  const newRoom: Room = {
    id: roomId,
    host: { id: host.id, name: host.name, isHost: true },
    players: [], // Start with an empty player list, host will be added via addPlayerToRoomStore
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
  // Room expiration logic (e.g., 24 hours for inactive rooms)
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
    if (!room) {
        return { error: "Room not found." };
    }
    if (room.isGameStarted && !room.isGameOver) {
        const existingPlayer = room.players.find(p => p.id === playerInfo.id);
        if (existingPlayer) {
            console.log(`Player ${playerInfo.name} (${playerInfo.id}) reconnected to active game ${roomId}. No changes allowed.`);
            return room;
        }
        return { error: "Game is currently in progress. Cannot join now." };
    }
    
    const normalizedPlayerName = playerInfo.name.trim().toLowerCase();
    const existingPlayerIndex = room.players.findIndex(p => p.id === playerInfo.id);
    
    // This now directly uses the provided `numberOfTickets`. For initial join in classic, this will be 0.
    const numTicketsToBuy = Math.max(0, numberOfTickets);

    const newCost = room.settings.ticketPrice * numTicketsToBuy;

    if (existingPlayerIndex !== -1) {
        // Player is already in the room, just updating their info/tickets
        const existingPlayer = room.players[existingPlayerIndex];
        const isUsernameTaken = room.players.some(p => p.id !== playerInfo.id && p.name.toLowerCase() === normalizedPlayerName);
        if (isUsernameTaken) return { error: `Display name "${playerInfo.name}" is already taken in this room.` };
        
        existingPlayer.name = playerInfo.name;
        existingPlayer.isHost = playerInfo.id === room.host.id;
        existingPlayer.isBot = !!playerInfo.isBot;
        existingPlayer.tickets = generateMultipleUniqueTickets(numTicketsToBuy);
        existingPlayer.confirmedTicketCost = newCost;
    } else {
        // New player joining
        const isUsernameTaken = room.players.some(p => p.name.toLowerCase() === normalizedPlayerName);
        if (isUsernameTaken) return { error: `Display name "${playerInfo.name}" is already taken. Please choose another.` };
        if (room.players.length >= room.settings.lobbySize) return { error: "Room is full." };

        const newPlayer: BackendPlayerInRoom = {
            id: playerInfo.id,
            name: playerInfo.name,
            isHost: playerInfo.id === room.host.id,
            isBot: !!playerInfo.isBot,
            tickets: generateMultipleUniqueTickets(numTicketsToBuy),
            confirmedTicketCost: newCost
        };
        room.players.push(newPlayer);
    }

    // Recalculate total prize pool based on confirmed tickets
    room.totalPrizePool = room.players.reduce((sum, player) => sum + (player.confirmedTicketCost || 0), 0);
    
    if (room.settings.isPublic && room.players.length === room.settings.lobbySize) {
        const host = room.players.find(p => !p.isBot) || room.host;
        console.log(`Room ${roomId} is full with real players. Starting game immediately.`);
        fillRoomWithBotsAndStart(roomId, host.id, room.settings.lobbySize);
    }
    
    rooms.set(roomId, room);
    return room;
}

export function startGameInRoomStore(roomId: string, hostId: string): Room | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: "Room not found." };
  
  const actualHostId = room.players.find(p => !p.isBot)?.id || hostId;
  
  if (room.isGameStarted) return { error: "Game has already started." };
  if (room.isGameOver) return { error: "Game is over. Reset the room to start a new game." };

  const hostPlayer = room.players.find(p => p.id === actualHostId);
  if (!hostPlayer || hostPlayer.tickets.length === 0) {
    return { error: `Host must have tickets before starting.` };
  }

  const minPlayersRequired = room.settings.gameMode === 'multiplayer' ? MIN_LOBBY_SIZE : 1;
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
  room.totalPrizePool = 0;

  // Clear tickets for all players so they have to re-confirm
  room.players.forEach(player => {
    player.tickets = [];
    player.confirmedTicketCost = 0; // Reset confirmed cost
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

    // REFUND COINS if player leaves before game starts (using a transaction)
    if (db && !leavingPlayer.isBot && !room.isGameStarted && leavingPlayer.confirmedTicketCost && leavingPlayer.confirmedTicketCost > 0) {
        try {
            runTransaction(db, async (transaction) => {
                const playerDocRef = doc(db, "users", leavingPlayer.id);
                // No need to get the doc first if we're just incrementing
                transaction.update(playerDocRef, { 'stats.coins': increment(leavingPlayer.confirmedTicketCost!) });
            }).then(() => {
                console.log(`Refunded ${leavingPlayer.confirmedTicketCost} coins to ${leavingPlayer.name} from room ${roomId}.`);
            }).catch(err => {
                 console.error(`Failed to refund coins to ${leavingPlayer.name}: ${err}`);
                 // Decide if you want to prevent the player from leaving if refund fails.
                 // For now, we'll log the error and let them leave anyway.
            });
        } catch (err) {
            console.error(`Error initiating refund transaction for ${leavingPlayer.name}:`, err);
        }
    }

    room.players.splice(playerIndex, 1);
    console.log(`Player ${playerId} has left room ${roomId}.`);

    if (room.players.length === 0) {
        stopRoomTimer(roomId, "Room is empty.");
        rooms.delete(roomId);
        console.log(`Room ${roomId} is empty and has been deleted.`);
    } else if (leavingPlayer.isHost) {
        const newHost = room.players.find(p => !p.isBot) || room.players[0];
        newHost.isHost = true;
        room.host = { id: newHost.id, name: newHost.name, isHost: true };
        console.log(`Host migration in room ${roomId}: ${newHost.id} is the new host.`);
    }
    
    if (room.players.length > 0) {
        room.totalPrizePool = room.players.reduce((sum, player) => sum + (player.confirmedTicketCost || 0), 0);
        rooms.set(roomId, room);
    }

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
  if (newHost.isBot) return { error: "Cannot make a bot the host." };

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
  
  const playerToKickIndex = room.players.findIndex(p => p.id === playerIdToKick);
  if (playerToKickIndex === -1) {
    return { error: "Player to kick not found in room." };
  }
  const playerToKick = room.players[playerToKickIndex];
  if(playerToKick.isBot) return { error: "Cannot kick a bot player." };
  
  // REFUND COINS for kicked player
  if (db && !playerToKick.isBot && playerToKick.confirmedTicketCost && playerToKick.confirmedTicketCost > 0) {
      const playerDocRef = doc(db, "users", playerToKick.id);
      runTransaction(db, async (transaction) => {
        transaction.update(playerDocRef, { 'stats.coins': increment(playerToKick.confirmedTicketCost!) });
      }).then(() => console.log(`Refunded ${playerToKick.confirmedTicketCost} coins to kicked player ${playerToKick.name}.`))
        .catch(err => console.error(`Failed to refund coins to kicked player ${playerToKick.name}: ${err}`));
  }
  
  const kickedPlayerName = playerToKick.name;
  room.players.splice(playerToKickIndex, 1);
  
  // Recalculate prize pool after kicking
  room.totalPrizePool = room.players.reduce((sum, player) => sum + (player.confirmedTicketCost || 0), 0);
  
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
  room.calledNumbers.unshift(nextNumber);
  room.lastNumberCalledTimestamp = new Date();
  rooms.set(roomId, room);

  // Bot logic
  const isBotGameMode = room.settings.gameMode === 'easy' || room.settings.gameMode === 'medium' || room.settings.gameMode === 'hard' || room.settings.gameMode === 'online';
  if (isBotGameMode && !room.isGameOver) {
    const bots = room.players.filter(p => p.isBot);
    const prizes = PRIZE_DEFINITIONS[room.settings.prizeFormat || 'Format 1'];
    
    let delay = 0;
    let botMissChance = 0;

    switch (room.settings.gameMode) {
        case 'easy':
            delay = 3000; // Slower reaction for easy bots
            botMissChance = 0.6; // 60% chance to miss a claim
            break;
        case 'medium':
            delay = 1500; // Medium reaction time
            botMissChance = 0.3; // 30% chance to miss
            break;
        case 'hard':
            delay = 500; // Very fast reaction for hard bots
            botMissChance = 0.05; // 5% chance to miss
            break;
        case 'online':
            delay = 2500; // A bit slower than medium to feel more human
            botMissChance = 0.4; // 40% chance to miss
            break;
    }

    setTimeout(() => {
        const currentRoomState = getRoomStore(roomId);
        if (!currentRoomState || currentRoomState.isGameOver) return; // Game ended while waiting

        for (const bot of bots) {
            for (const prizeType of prizes) {
                // Check if prize is already claimed by anyone. In online/bot games, usually first claim wins.
                if ((currentRoomState.prizeStatus[prizeType]?.claimedBy.length ?? 0) > 0) {
                    continue; 
                }
                
                // Bot has a chance to "miss" the claim
                if (Math.random() < botMissChance) {
                    console.log(`Bot ${bot.name} "missed" a potential claim for ${prizeType}.`);
                    continue; // Skip to the next prize or bot
                }

                // Check if this bot has a valid claim
                for (let i = 0; i < bot.tickets.length; i++) {
                    const ticket = bot.tickets[i];
                    const housieLib = require('@/lib/housie'); 
                    if (housieLib.checkWinningCondition(ticket, currentRoomState.calledNumbers, prizeType)) {
                        console.log(`Bot ${bot.name} is claiming ${prizeType} in room ${roomId}.`);
                        claimPrizeStore(roomId, bot.id, prizeType, i);
                        // Break from checking this bot's tickets for this prize, move to next prize for this bot
                        break; 
                    }
                }
            }
        }
    }, delay);
  }

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
  room.prizeStatus[prizeType]!.claimedBy.push({ id: player.id, name: player.name });

  if (prizeType === PRIZE_TYPES.FULL_HOUSE && winningTicket) {
    room.isGameOver = true;
    console.log(`Room ${roomId}: Full House claimed by ${playerId}. Game Over.`);
    stopRoomTimer(roomId, "Full House claimed");
    
    // Distribute winnings for online and friends games
    const isPaidGame = room.settings.ticketPrice > 0 && (room.settings.gameMode === 'online' || room.settings.gameMode === 'multiplayer');
    if (isPaidGame && db) {
        const batch = writeBatch(db);
        const prizeDistribution = PRIZE_DISTRIBUTION_PERCENTAGES[room.settings.prizeFormat];
        const totalPrizePool = room.totalPrizePool || 0;
        const allPrizes = PRIZE_DEFINITIONS[room.settings.prizeFormat];
        
        // Update matches played stats for all human players
        room.players.forEach(p => {
          if (!p.isBot) {
            const playerDocRef = doc(db, "users", p.id);
            batch.update(playerDocRef, { 'stats.matchesPlayed': increment(1) });
          }
        });

        // Distribute winnings and update prizesWon stats
        allPrizes.forEach(prize => {
            const claimInfo = room.prizeStatus[prize];
            if (claimInfo && claimInfo.claimedBy.length > 0) {
                const prizePercentage = prizeDistribution[prize];
                const prizeAmount = (totalPrizePool * prizePercentage) / 100;
                const prizePerWinner = prizeAmount / claimInfo.claimedBy.length;
                
                claimInfo.claimedBy.forEach(winner => {
                    if (!room.players.find(p => p.id === winner.id)?.isBot) {
                        const playerDocRef = doc(db, "users", winner.id);
                        batch.update(playerDocRef, { 
                            'stats.coins': increment(prizePerWinner),
                            [`stats.prizesWon.${prize}`]: increment(1)
                        });
                    }
                });
            }
        });
        batch.commit().catch(err => console.error(`Error writing online winnings for room ${roomId}:`, err));
    }


    const linePrizesToAutoCheck: PrizeType[] = [PRIZE_TYPES.FIRST_LINE, PRIZE_TYPES.SECOND_LINE, PRIZE_TYPES.THIRD_LINE];
    for (const linePrize of linePrizesToAutoCheck) {
      const isLinePrizeClaimed = room.prizeStatus[linePrize]?.claimedBy?.length > 0;
      
      if (!isLinePrizeClaimed) {
        if (housieLib.checkWinningCondition(winningTicket, room.calledNumbers, linePrize)) {
          if (!room.prizeStatus[linePrize]) { 
            room.prizeStatus[linePrize] = { claimedBy: [], timestamp: new Date() };
          }
          
          room.prizeStatus[linePrize]!.claimedBy.push({ id: player.id, name: player.name });
          
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
      isBot: p.isBot,
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
      host: { id: room.host.id, name: room.host.name, isHost: room.host.isHost },
      players: playersForClient,
      settings: room.settings,
      createdAt: typeof room.createdAt === 'string' ? room.createdAt : new Date(room.createdAt).toISOString(),
      isGameStarted: room.isGameStarted,
      isGameOver: room.isGameOver,
      currentNumber: room.currentNumber,
      calledNumbers: room.calledNumbers,
      prizeStatus: prizeStatusForClient,
      lastNumberCalledTimestamp: room.lastNumberCalledTimestamp ? (typeof room.lastNumberCalledTimestamp === 'string' ? room.lastNumberCalledTimestamp : new Date(room.lastNumberCalledTimestamp).toISOString()) : undefined,
      totalPrizePool: room.totalPrizePool,
    };
    return clientRoomData as Omit<Room, 'numberPool'>;

  } catch (e) {
    console.error(`Error preparing room data for client for room ${roomId}:`, e);
    return undefined;
  }
}

// Online Matchmaking Specific Functions
const ONLINE_BOT_NAMES = ["Alex", "Sam", "Jordan", "Taylor", "Casey", "Riley", "Jessie", "Morgan", "Skyler", "Drew"];

function generateGuestBotName(): string {
  const guestId = Math.floor(1000 + Math.random() * 9000);
  return `Guest#${guestId}`;
}

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function findPublicRoom(tier: OnlineGameTier): Room | undefined {
    for (const room of rooms.values()) {
        if (
            room.settings.isPublic &&
            room.settings.tier === tier &&
            !room.isGameStarted &&
            room.players.length < room.settings.lobbySize
        ) {
            return room;
        }
    }
    return undefined;
}

export function fillRoomWithBotsAndStart(roomId: string, hostId: string, roomSize: number) {
    const matchmakingTimer = roomTimers.get(roomId);
    if (matchmakingTimer) {
        clearTimeout(matchmakingTimer);
        roomTimers.delete(roomId);
    }

    const room = getRoomStore(roomId);
    if (!room || room.isGameStarted) return;

    const botsToAdd = roomSize - room.players.length;
    if (botsToAdd > 0) {
      const guestBotNames = Array.from({ length: 5 }, () => generateGuestBotName());
      const onlineNamePool = shuffleArray([...ONLINE_BOT_NAMES, ...guestBotNames]);
      
      for (let i = 0; i < botsToAdd; i++) {
          const botId = `bot-${i+1}-${Date.now()}`;
          const botName = onlineNamePool[i % onlineNamePool.length];
          const botPlayer: Player = { id: botId, name: botName, isBot: true };
          const botTickets = 1 + Math.floor(Math.random() * 4);
          addPlayerToRoomStore(roomId, botPlayer, botTickets);
      }
    }
    
    // The hostId here should be the ID of the first real player who initiated the matchmaking
    startGameInRoomStore(roomId, hostId);
}
