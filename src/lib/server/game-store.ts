
import type { Room, Player, GameSettings } from '@/types';

// Ensure this type is compatible with what the client expects for Room
// StoredRoom might have more server-specific details in the future
interface StoredRoomData extends Omit<Room, 'createdAt'> {
  createdAt: Date; // Store as Date object
}

declare global {
  // eslint-disable-next-line no-var
  var housieRooms: Map<string, StoredRoomData>;
}

// Initialize the global store only once
const rooms = global.housieRooms || (global.housieRooms = new Map<string, StoredRoomData>());

export function createRoomStore(host: Player, settings: GameSettings): StoredRoomData {
  const roomId = `room-${Math.random().toString(36).substring(2, 9)}`;
  const newRoom: StoredRoomData = {
    id: roomId,
    host,
    players: [{ id: host.id, name: host.name, isHost: true }], // Host is the first player
    settings,
    createdAt: new Date(),
    isGameStarted: false,
  };
  rooms.set(roomId, newRoom);
  console.log(`Room created: ${roomId}`, newRoom);
  return newRoom;
}

export function getRoomStore(roomId: string): StoredRoomData | undefined {
  const room = rooms.get(roomId);
  console.log(`Getting room: ${roomId}`, room);
  return room;
}

export function addPlayerToRoomStore(roomId: string, player: Player): StoredRoomData | { error: string } {
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
  if (room.players.find(p => p.id === player.id)) {
    // Player already in room, perhaps just return current room state or specific error
    return { error: "Player already in room."};
  }
  room.players.push({ id: player.id, name: player.name, isHost: false });
  rooms.set(roomId, room);
  console.log(`Player ${player.name} added to room: ${roomId}`, room);
  return room;
}

export function startGameInRoomStore(roomId: string, hostId: string): StoredRoomData | { error: string } {
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
  // Add more validation for starting game if needed (e.g. min players)
  room.isGameStarted = true;
  rooms.set(roomId, room);
  console.log(`Game started in room: ${roomId}`, room);
  return room;
}
