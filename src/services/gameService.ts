import {
  Debt,
  DebtPayment,
  Player,
  Property,
  Room,
  Transaction,
  UserSession,
} from '../types';
import { MONOPOLY_ISTANBUL_PROPERTIES, validateBuildingRule } from '../data/monopolyIstanbulData';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_SESSION_KEY = 'monopoly_session';
const STORAGE_DATA_PREFIX = 'monopoly_data_';

// Real-time synchronization channel for local multi-tab testing
const broadcast = typeof window !== 'undefined' ? new BroadcastChannel('monopoly_istanbul_sync') : null;

interface RoomState {
  room: Room;
  players: Player[];
  properties: Property[];
  transactions: Transaction[];
  debts: Debt[];
  debtPayments: DebtPayment[];
}

// Generate human-friendly 6-character room codes (e.g. IST-492)
export function generateRoomCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = '23456789';
  let code = 'IST-';
  for (let i = 0; i < 3; i++) {
    code += nums.charAt(Math.floor(Math.random() * nums.length));
  }
  return code;
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// LOCAL STORAGE ENGINE (High fidelity fallback for instant local testing)
// ============================================================================

export function getLocalRoomState(roomId: string): RoomState | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_DATA_PREFIX}${roomId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Failed to get local room state', e);
    return null;
  }
}

function saveLocalRoomState(state: RoomState): void {
  try {
    localStorage.setItem(`${STORAGE_DATA_PREFIX}${state.room.id}`, JSON.stringify(state));
    // Index by code as well
    localStorage.setItem(`monopoly_code_${state.room.code.toUpperCase()}`, state.room.id);
    if (broadcast) {
      broadcast.postMessage({ type: 'ROOM_UPDATED', roomId: state.room.id });
    }
  } catch (e) {
    console.error('Failed to save local room state', e);
  }
}

function initPropertiesForRoom(roomId: string): Property[] {
  return MONOPOLY_ISTANBUL_PROPERTIES.map((seed) => ({
    id: generateUUID(),
    room_id: roomId,
    property_key: seed.property_key,
    name: seed.name,
    group_key: seed.group_key,
    group_name: seed.group_name,
    group_color: seed.group_color,
    type: seed.type,
    price: seed.price,
    mortgage_value: seed.mortgage_value,
    unmortgage_price: Math.round(seed.mortgage_value * 1.1),
    owner_id: null,
    house_count: 0,
    hotel_count: 0,
    is_mortgaged: false,
    rent_base: seed.rent_base,
    rent_house_1: seed.rent_house_1,
    rent_house_2: seed.rent_house_2,
    rent_house_3: seed.rent_house_3,
    rent_house_4: seed.rent_house_4,
    rent_hotel: seed.rent_hotel,
    house_cost: seed.house_cost,
    position: seed.position,
  }));
}

// ============================================================================
// GAME SERVICE IMPLEMENTATION
// ============================================================================

export class GameService {
  /**
   * Save session to localStorage
   */
  static saveSession(session: UserSession): void {
    try {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.error('Session save error', e);
    }
  }

  /**
   * Retrieve active session from localStorage
   */
  static getSession(): UserSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /**
   * Clear active session (Leave room)
   */
  static clearSession(): void {
    try {
      localStorage.removeItem(STORAGE_SESSION_KEY);
    } catch (e) {
      console.error('Session clear error', e);
    }
  }

  /**
   * Create a new room with starting properties and the creator as owner/banker
   */
  static async createRoom(ownerName: string): Promise<{ session: UserSession; room: Room }> {
    const trimmedName = ownerName.trim();
    if (!trimmedName) throw new Error('Lütfen bir oyuncu adı girin');

    const roomId = generateUUID();
    const playerId = generateUUID();
    const sessionToken = generateUUID();
    const roomCode = generateRoomCode();
    const now = new Date().toISOString();

    const room: Room = {
      id: roomId,
      code: roomCode,
      name: `Monopoly İstanbul (${roomCode})`,
      status: 'active',
      created_at: now,
      owner_id: playerId,
    };

    const ownerPlayer: Player = {
      id: playerId,
      room_id: roomId,
      name: trimmedName,
      session_token: sessionToken,
      balance: 1500,
      is_banker: true,
      is_owner: true,
      is_active: true,
      created_at: now,
    };

    const properties = initPropertiesForRoom(roomId);

    const initialTx: Transaction = {
      id: generateUUID(),
      room_id: roomId,
      type: 'bank_deposit',
      from_player_id: null,
      to_player_id: playerId,
      amount: 1500,
      description: 'Başlangıç Bakiyesi',
      created_by_player_id: playerId,
      created_at: now,
    };

    // Always maintain local cache immediately for instant response (0ms)
    const roomState: RoomState = {
      room,
      players: [ownerPlayer],
      properties,
      transactions: [initialTx],
      debts: [],
      debtPayments: [],
    };
    saveLocalRoomState(roomState);

    const session: UserSession = {
      roomId,
      roomCode,
      playerId,
      playerName: trimmedName,
      sessionToken,
    };
    this.saveSession(session);

    // If Supabase is configured, sync to Supabase in the background without blocking UI
    if (isSupabaseConfigured && supabase) {
      (async () => {
        try {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('rpc_create_room', {
            p_room_id: roomId,
            p_code: roomCode,
            p_name: room.name,
            p_owner_id: playerId,
            p_owner_name: trimmedName,
            p_session_token: sessionToken,
            p_properties: properties,
          });

          if (rpcErr || (rpcRes && !rpcRes.success)) {
            // Direct table insert fallback
            await supabase.from('rooms').insert({
              id: roomId,
              code: roomCode,
              name: room.name,
              status: 'active',
            });
            await supabase.from('players').insert({
              id: playerId,
              room_id: roomId,
              name: trimmedName,
              session_token: sessionToken,
              balance: 1500,
              is_banker: true,
              is_owner: true,
            });
            await supabase.from('rooms').update({ owner_id: playerId }).eq('id', roomId);
            await supabase.from('properties').insert(properties);
            await supabase.from('transactions').insert(initialTx);
          }
        } catch (err: any) {
          console.warn('Supabase createRoom sync error:', err.message);
        }
      })();
    }

    return { session, room };
  }

  /**
   * Join an existing room with room code and player name
   */
  static async joinRoom(roomCode: string, playerName: string): Promise<UserSession> {
    const cleanRaw = roomCode.trim().toUpperCase();
    const unhyphenated = cleanRaw.replace(/[^A-Z0-9]/g, '');
    const hyphenated =
      unhyphenated.length === 6 && unhyphenated.startsWith('IST')
        ? `IST-${unhyphenated.slice(3)}`
        : cleanRaw;
    const cleanCode = hyphenated;
    const cleanName = playerName.trim();

    if (!cleanRaw) throw new Error('Lütfen oda kodunu girin');
    if (!cleanName) throw new Error('Lütfen bir oyuncu adı girin');

    // 1. Check existing session for matching room/name to prevent duplicate players
    const currentSession = this.getSession();
    if (
      currentSession &&
      (currentSession.roomCode.toUpperCase() === cleanRaw ||
        currentSession.roomCode.toUpperCase() === hyphenated ||
        currentSession.roomCode.toUpperCase() === unhyphenated) &&
      currentSession.playerName.toLowerCase() === cleanName.toLowerCase()
    ) {
      return currentSession;
    }

    const newPlayerId = generateUUID();
    const sessionToken = generateUUID();

    let roomId: string | null = null;
    let roomObj: Room | null = null;
    let existingPlayers: Player[] = [];

    if (isSupabaseConfigured && supabase) {
      try {
        // Try atomic RPC join first
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('rpc_join_room', {
          p_code: cleanRaw,
          p_player_name: cleanName,
          p_player_id: newPlayerId,
          p_session_token: sessionToken,
        });

        if (!rpcErr && rpcRes && rpcRes.success) {
          const session: UserSession = {
            roomId: rpcRes.room_id,
            roomCode: rpcRes.room_code,
            playerId: rpcRes.player_id,
            playerName: rpcRes.player_name,
            sessionToken: rpcRes.session_token,
          };
          this.saveSession(session);
          return session;
        }

        // Direct table query fallback with flexible code matching
        const { data: roomList } = await supabase
          .from('rooms')
          .select('*')
          .or(`code.ilike.${cleanRaw},code.ilike.${hyphenated},code.ilike.${unhyphenated}`)
          .limit(1);

        if (roomList && roomList.length > 0) {
          const roomData = roomList[0];
          roomId = roomData.id;
          roomObj = roomData as Room;

          const { data: pData } = await supabase
            .from('players')
            .select('*')
            .eq('room_id', roomId);
          existingPlayers = (pData as Player[]) || [];
        }
      } catch (err: any) {
        console.warn('Supabase join query error:', err.message);
      }
    }

    if (!roomId) {
      const mappedId =
        localStorage.getItem(`monopoly_code_${cleanRaw}`) ||
        localStorage.getItem(`monopoly_code_${hyphenated}`) ||
        localStorage.getItem(`monopoly_code_${unhyphenated}`);

      if (mappedId) {
        roomId = mappedId;
        const state = getLocalRoomState(roomId);
        if (state) {
          roomObj = state.room;
          existingPlayers = state.players;
        }
      }
    }

    if (!roomId) {
      throw new Error(`"${cleanRaw}" kodlu oyun odası bulunamadı. Lütfen oda kodunu doğru girdiğinizden emin olun.`);
    }

    // Check if player with identical name is already registered
    const existingPlayer = existingPlayers.find(
      (p) => p.name.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (existingPlayer) {
      // Reconnect as existing player
      const session: UserSession = {
        roomId,
        roomCode: cleanCode,
        playerId: existingPlayer.id,
        playerName: existingPlayer.name,
        sessionToken: existingPlayer.session_token,
      };
      this.saveSession(session);
      return session;
    }

    // New player joining: 1500 ₺ initial balance
    const now = new Date().toISOString();

    const newPlayer: Player = {
      id: newPlayerId,
      room_id: roomId,
      name: cleanName,
      session_token: sessionToken,
      balance: 1500,
      is_banker: false,
      is_owner: false,
      is_active: true,
      created_at: now,
    };

    const initialTx: Transaction = {
      id: generateUUID(),
      room_id: roomId,
      type: 'bank_deposit',
      from_player_id: null,
      to_player_id: newPlayerId,
      amount: 1500,
      description: 'Yeni Oyuncu Başlangıç Bakiyesi',
      created_by_player_id: newPlayerId,
      created_at: now,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('players').insert(newPlayer);
        await supabase.from('transactions').insert(initialTx);
      } catch (e: any) {
        console.warn('Supabase join insert failed:', e.message);
      }
    }

    // Update local state
    const state = getLocalRoomState(roomId);
    if (state) {
      state.players.push(newPlayer);
      state.transactions.unshift(initialTx);
      saveLocalRoomState(state);
    }

    const session: UserSession = {
      roomId,
      roomCode: cleanCode,
      playerId: newPlayerId,
      playerName: cleanName,
      sessionToken,
    };
    this.saveSession(session);
    return session;
  }

  static getLocalRoomState(roomId: string): RoomState | null {
    return getLocalRoomState(roomId);
  }

  /**
   * Fetch complete current state of the room
   */
  static async fetchRoomState(roomId: string): Promise<RoomState | null> {
    const local = getLocalRoomState(roomId);

    if (isSupabaseConfigured && supabase) {
      try {
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
        const fetchPromise = Promise.all([
          supabase.from('rooms').select('*').eq('id', roomId).single(),
          supabase.from('players').select('*').eq('room_id', roomId).order('created_at', { ascending: true }),
          supabase.from('properties').select('*').eq('room_id', roomId).order('position', { ascending: true }),
          supabase.from('transactions').select('*').eq('room_id', roomId).order('created_at', { ascending: false }).limit(200),
          supabase.from('debts').select('*').eq('room_id', roomId).order('created_at', { ascending: false }),
          supabase.from('debt_payments').select('*').eq('room_id', roomId),
        ]);

        const result: any = await Promise.race([fetchPromise, timeoutPromise]);
        if (result) {
          const [
            { data: room },
            { data: players },
            { data: properties },
            { data: transactions },
            { data: debts },
            { data: debtPayments },
          ] = result;

          if (room && players && properties && properties.length > 0) {
            const state: RoomState = {
              room: room as Room,
              players: (players as Player[]) || [],
              properties: (properties as Property[]) || [],
              transactions: (transactions as Transaction[]) || [],
              debts: (debts as Debt[]) || [],
              debtPayments: (debtPayments as DebtPayment[]) || [],
            };
            saveLocalRoomState(state);
            return state;
          }
        }
      } catch (err) {
        console.warn('Supabase fetch failed, using local cache:', err);
      }
    }

    return local;
  }

  /**
   * Peer to peer money transfer with validation
   */
  static async transferMoney(
    roomId: string,
    sessionToken: string,
    fromPlayerId: string,
    toPlayerId: string,
    amount: number,
    description?: string
  ): Promise<void> {
    if (amount <= 0) throw new Error('Transfer tutarı 0 ₺ den büyük olmalıdır');
    if (fromPlayerId === toPlayerId) throw new Error('Kendinize para transfer edemezsiniz');

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('atomic_transfer', {
          p_room_id: roomId,
          p_session_token: sessionToken,
          p_from_player_id: fromPlayerId,
          p_to_player_id: toPlayerId,
          p_amount: amount,
          p_description: description || 'Para Transferi',
        });
        if (error) throw error;
        if (data && !data.success) throw new Error(data.error || 'Transfer başarısız');
      } catch (e: any) {
        if (!e.message?.includes('not found') && !e.message?.includes('fetch')) {
          throw e;
        }
      }
    }

    // Update local state atomically
    const state = getLocalRoomState(roomId);
    if (!state) throw new Error('Oda bulunamadı');

    const sender = state.players.find((p) => p.id === fromPlayerId);
    const receiver = state.players.find((p) => p.id === toPlayerId);

    if (!sender) throw new Error('Gönderen oyuncu bulunamadı');
    if (!receiver) throw new Error('Alıcı oyuncu bulunamadı');
    if (sender.balance < amount) throw new Error('Yetersiz bakiye!');

    sender.balance -= amount;
    receiver.balance += amount;

    const tx: Transaction = {
      id: generateUUID(),
      room_id: roomId,
      type: 'transfer',
      from_player_id: sender.id,
      to_player_id: receiver.id,
      amount,
      description: description || 'Para Transferi',
      created_by_player_id: sender.id,
      created_at: new Date().toISOString(),
    };

    state.transactions.unshift(tx);
    saveLocalRoomState(state);
  }

  /**
   * Pay Rent with single-transaction agreed amount
   */
  static async payRent(
    roomId: string,
    sessionToken: string,
    payerId: string,
    propertyId: string,
    amount: number,
    note?: string
  ): Promise<void> {
    if (amount < 0) throw new Error('Kira bedeli negatif olamaz');

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('atomic_pay_rent', {
          p_room_id: roomId,
          p_session_token: sessionToken,
          p_payer_id: payerId,
          p_property_id: propertyId,
          p_amount: amount,
          p_description: note || 'Kira Ödemesi',
        });
        if (error) throw error;
        if (data && !data.success) throw new Error(data.error);
      } catch (e: any) {
        if (!e.message?.includes('not found') && !e.message?.includes('fetch')) throw e;
      }
    }

    const state = getLocalRoomState(roomId);
    if (!state) throw new Error('Oda bulunamadı');

    const prop = state.properties.find((p) => p.id === propertyId);
    if (!prop) throw new Error('Mülk bulunamadı');
    if (!prop.owner_id) throw new Error('Mülkün sahibi yok');
    if (prop.owner_id === payerId) throw new Error('Kendi mülkünüze kira ödeyemezsiniz');
    if (prop.is_mortgaged) throw new Error('İpotekli mülkten kira alınamaz');

    const payer = state.players.find((p) => p.id === payerId);
    const owner = state.players.find((p) => p.id === prop.owner_id);

    if (!payer || !owner) throw new Error('Oyuncular bulunamadı');
    if (payer.balance < amount) throw new Error('Yetersiz bakiye!');

    payer.balance -= amount;
    owner.balance += amount;

    const tx: Transaction = {
      id: generateUUID(),
      room_id: roomId,
      type: 'rent',
      from_player_id: payer.id,
      to_player_id: owner.id,
      amount,
      description: note || `${prop.name} kira ödemesi`,
      metadata: { property_id: prop.id, property_name: prop.name },
      created_by_player_id: payer.id,
      created_at: new Date().toISOString(),
    };

    state.transactions.unshift(tx);
    saveLocalRoomState(state);
  }

  /**
   * Bank transaction (Salary/Pass GO, Taxes, Fines, Bank Payout)
   */
  static async bankTransaction(
    roomId: string,
    sessionToken: string,
    playerId: string,
    amount: number,
    direction: 'bank_to_player' | 'player_to_bank',
    description: string
  ): Promise<void> {
    if (amount <= 0) throw new Error('Tutar 0 ₺ den büyük olmalıdır');

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('atomic_bank_transaction', {
          p_room_id: roomId,
          p_session_token: sessionToken,
          p_player_id: playerId,
          p_amount: amount,
          p_direction: direction,
          p_description: description,
        });
        if (error) throw error;
        if (data && !data.success) throw new Error(data.error);
      } catch (e: any) {
        if (!e.message?.includes('not found') && !e.message?.includes('fetch')) throw e;
      }
    }

    const state = getLocalRoomState(roomId);
    if (!state) throw new Error('Oda bulunamadı');

    const player = state.players.find((p) => p.id === playerId);
    if (!player) throw new Error('Oyuncu bulunamadı');

    if (direction === 'bank_to_player') {
      player.balance += amount;
    } else {
      if (player.balance < amount) throw new Error('Yetersiz bakiye!');
      player.balance -= amount;
    }

    const tx: Transaction = {
      id: generateUUID(),
      room_id: roomId,
      type: direction === 'bank_to_player' ? 'bank_deposit' : 'bank_withdraw',
      from_player_id: direction === 'player_to_bank' ? player.id : null,
      to_player_id: direction === 'bank_to_player' ? player.id : null,
      amount,
      description,
      created_by_player_id: player.id,
      created_at: new Date().toISOString(),
    };

    state.transactions.unshift(tx);
    saveLocalRoomState(state);
  }

  /**
   * Peer to peer Debt creation
   * A gives loan to B: A balance - amount, B balance + amount, Debt created
   */
  static async createDebt(
    roomId: string,
    sessionToken: string,
    creditorId: string,
    debtorId: string,
    amount: number,
    reason: string
  ): Promise<void> {
    if (amount <= 0) throw new Error('Borç tutarı 0 ₺ den büyük olmalıdır');
    if (creditorId === debtorId) throw new Error('Kendinize borç veremezsiniz');

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('atomic_create_debt', {
          p_room_id: roomId,
          p_session_token: sessionToken,
          p_creditor_id: creditorId,
          p_debtor_id: debtorId,
          p_amount: amount,
          p_reason: reason,
        });
        if (error) throw error;
        if (data && !data.success) throw new Error(data.error);
      } catch (e: any) {
        if (!e.message?.includes('not found') && !e.message?.includes('fetch')) throw e;
      }
    }

    const state = getLocalRoomState(roomId);
    if (!state) throw new Error('Oda bulunamadı');

    const creditor = state.players.find((p) => p.id === creditorId);
    const debtor = state.players.find((p) => p.id === debtorId);

    if (!creditor || !debtor) throw new Error('Oyuncular bulunamadı');
    if (creditor.balance < amount) throw new Error('Borç verecek yeterli nakit bakiye yok!');

    creditor.balance -= amount;
    debtor.balance += amount;

    const debtId = generateUUID();
    const now = new Date().toISOString();

    const newDebt: Debt = {
      id: debtId,
      room_id: roomId,
      creditor_id: creditor.id,
      debtor_id: debtor.id,
      original_amount: amount,
      current_amount: amount,
      status: 'open',
      reason: reason || 'Borç Verme',
      created_at: now,
      settled_at: null,
    };

    const tx: Transaction = {
      id: generateUUID(),
      room_id: roomId,
      type: 'debt_create',
      from_player_id: creditor.id,
      to_player_id: debtor.id,
      amount,
      description: `Borç verildi: ${reason || 'Borç'}`,
      metadata: { debt_id: debtId },
      created_by_player_id: creditor.id,
      created_at: now,
    };

    state.debts.unshift(newDebt);
    state.transactions.unshift(tx);
    saveLocalRoomState(state);
  }

  /**
   * Pay Debt / Settle Debt with mutual agreement
   * E.g. 300 ₺ debt -> 100 ₺ paid -> 200 ₺ remains
   * E.g. 300 ₺ debt -> 200 ₺ paid + 100 ₺ forgiven -> 0 ₺ remains (Settled!)
   */
  static async payDebt(
    roomId: string,
    sessionToken: string,
    debtId: string,
    payerId: string,
    paymentAmount: number,
    forgivenAmount: number = 0
  ): Promise<void> {
    if (paymentAmount < 0 || forgivenAmount < 0) throw new Error('Tutarlar negatif olamaz');
    const totalReduction = paymentAmount + forgivenAmount;
    if (totalReduction <= 0) throw new Error('Ödeme veya feragat tutarı girilmelidir');

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('atomic_pay_debt', {
          p_room_id: roomId,
          p_session_token: sessionToken,
          p_debt_id: debtId,
          p_payer_id: payerId,
          p_payment_amount: paymentAmount,
          p_forgive_amount: forgivenAmount,
        });
        if (error) throw error;
        if (data && !data.success) throw new Error(data.error);
      } catch (e: any) {
        if (!e.message?.includes('not found') && !e.message?.includes('fetch')) throw e;
      }
    }

    const state = getLocalRoomState(roomId);
    if (!state) throw new Error('Oda bulunamadı');

    const debt = state.debts.find((d) => d.id === debtId);
    if (!debt || debt.status !== 'open') throw new Error('Açık borç bulunamadı');

    if (totalReduction > debt.current_amount) {
      throw new Error('Toplam ödeme ve feragat tutarı borç bakiyesinden fazla olamaz');
    }

    const debtor = state.players.find((p) => p.id === debt.debtor_id);
    const creditor = state.players.find((p) => p.id === debt.creditor_id);

    if (!debtor || !creditor) throw new Error('Oyuncular bulunamadı');
    if (paymentAmount > 0 && debtor.balance < paymentAmount) {
      throw new Error('Borçlunun nakit bakiyesi yetersiz!');
    }

    if (paymentAmount > 0) {
      debtor.balance -= paymentAmount;
      creditor.balance += paymentAmount;
    }

    debt.current_amount -= totalReduction;
    const isFullySettled = debt.current_amount <= 0;
    if (isFullySettled) {
      debt.status = 'settled';
      debt.settled_at = new Date().toISOString();
    }

    const paymentRecord: DebtPayment = {
      id: generateUUID(),
      debt_id: debt.id,
      room_id: roomId,
      amount: paymentAmount,
      forgiven_amount: forgivenAmount,
      payment_type: isFullySettled ? 'settled' : 'partial',
      created_at: new Date().toISOString(),
    };
    state.debtPayments.unshift(paymentRecord);

    const tx: Transaction = {
      id: generateUUID(),
      room_id: roomId,
      type: forgivenAmount > 0 ? 'debt_settle' : 'debt_payment',
      from_player_id: debtor.id,
      to_player_id: creditor.id,
      amount: paymentAmount,
      description:
        forgivenAmount > 0
          ? `Anlaşmalı borç kapatma: ${paymentAmount} ₺ ödendi, ${forgivenAmount} ₺ feragat edildi`
          : `Borç ödemesi: ${paymentAmount} ₺ ödendi`,
      metadata: {
        debt_id: debt.id,
        forgiven: forgivenAmount,
        remaining: debt.current_amount,
      },
      created_by_player_id: debtor.id,
      created_at: new Date().toISOString(),
    };

    state.transactions.unshift(tx);
    saveLocalRoomState(state);
  }

  /**
   * Buy unowned property from Bank
   */
  static async buyPropertyFromBank(
    roomId: string,
    sessionToken: string,
    playerId: string,
    propertyId: string
  ): Promise<void> {
    const state = getLocalRoomState(roomId);
    if (!state) throw new Error('Oda bulunamadı');

    const prop = state.properties.find((p) => p.id === propertyId);
    const player = state.players.find((p) => p.id === playerId);

    if (!prop) throw new Error('Mülk bulunamadı');
    if (!player) throw new Error('Oyuncu bulunamadı');
    if (prop.owner_id) throw new Error('Bu mülkün zaten bir sahibi var');
    if (player.balance < prop.price) throw new Error('Mülkü satın almak için nakit bakiyeniz yetersiz');

    player.balance -= prop.price;
    prop.owner_id = player.id;
    prop.is_mortgaged = false;

    const tx: Transaction = {
      id: generateUUID(),
      room_id: roomId,
      type: 'property_buy',
      from_player_id: player.id,
      to_player_id: null,
      amount: prop.price,
      description: `${prop.name} tapusu bankadan satın alındı`,
      metadata: { property_id: prop.id, property_name: prop.name },
      created_by_player_id: player.id,
      created_at: new Date().toISOString(),
    };

    state.transactions.unshift(tx);
    saveLocalRoomState(state);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('players').update({ balance: player.balance }).eq('id', player.id);
        await supabase.from('properties').update({ owner_id: player.id, is_mortgaged: false }).eq('id', prop.id);
        await supabase.from('transactions').insert(tx);
      } catch (e) {
        console.warn('Supabase property buy sync:', e);
      }
    }
  }

  /**
   * Trade/Transfer property between players with agreed price
   */
  static async tradeProperty(
    roomId: string,
    sessionToken: string,
    sellerId: string,
    buyerId: string,
    propertyId: string,
    price: number
  ): Promise<void> {
    if (price < 0) throw new Error('Fiyat negatif olamaz');
    if (sellerId === buyerId) throw new Error('Alıcı ve satıcı aynı kişi olamaz');

    const state = getLocalRoomState(roomId);
    if (!state) throw new Error('Oda bulunamadı');

    const prop = state.properties.find((p) => p.id === propertyId);
    const seller = state.players.find((p) => p.id === sellerId);
    const buyer = state.players.find((p) => p.id === buyerId);

    if (!prop || !seller || !buyer) throw new Error('Mülk veya oyuncular bulunamadı');
    if (prop.owner_id !== seller.id) throw new Error('Satıcı bu mülkün sahibi değil');
    if (prop.house_count > 0 || prop.hotel_count > 0) {
      throw new Error('Üzerinde ev veya otel olan mülkler doğrudan devredilemez. Önce binaları satın.');
    }
    if (price > 0 && buyer.balance < price) {
      throw new Error('Alıcının bakiyesi yetersiz!');
    }

    if (price > 0) {
      buyer.balance -= price;
      seller.balance += price;
    }
    prop.owner_id = buyer.id;

    const tx: Transaction = {
      id: generateUUID(),
      room_id: roomId,
      type: 'property_trade',
      from_player_id: buyer.id,
      to_player_id: seller.id,
      amount: price,
      description: `${prop.name} mülkü ${seller.name}'dan ${buyer.name}'a devredildi (${price} ₺)`,
      metadata: { property_id: prop.id, property_name: prop.name, seller_id: seller.id, buyer_id: buyer.id },
      created_by_player_id: buyer.id,
      created_at: new Date().toISOString(),
    };

    state.transactions.unshift(tx);
    saveLocalRoomState(state);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('players').update({ balance: buyer.balance }).eq('id', buyer.id);
        await supabase.from('players').update({ balance: seller.balance }).eq('id', seller.id);
        await supabase.from('properties').update({ owner_id: buyer.id }).eq('id', prop.id);
        await supabase.from('transactions').insert(tx);
      } catch (e) {
        console.warn('Supabase trade sync:', e);
      }
    }
  }

  /**
   * Build house or hotel on a street
   */
  static async buildHouse(
    roomId: string,
    sessionToken: string,
    playerId: string,
    propertyId: string
  ): Promise<void> {
    const state = getLocalRoomState(roomId);
    if (!state) throw new Error('Oda bulunamadı');

    const prop = state.properties.find((p) => p.id === propertyId);
    const player = state.players.find((p) => p.id === playerId);

    if (!prop || !player) throw new Error('Mülk veya oyuncu bulunamadı');
    if (prop.owner_id !== player.id) throw new Error('Yalnızca sahip olduğunuz mülke bina yapabilirsiniz');

    const groupProps = state.properties.filter((p) => p.group_key === prop.group_key);
    const validation = validateBuildingRule(prop, groupProps);

    if (!validation.canBuild) {
      throw new Error(validation.error || 'Bina yapılamaz');
    }

    if (player.balance < validation.cost) {
      throw new Error(`Yetersiz bakiye! Bina maliyeti: ${validation.cost} ₺, mevcut bakiyeniz: ${player.balance} ₺`);
    }

    player.balance -= validation.cost;
    let desc = '';

    if (validation.action === 'hotel') {
      prop.house_count = 0;
      prop.hotel_count = 1;
      desc = `${prop.name} mülküne otel dikildi (-${validation.cost} ₺)`;
    } else {
      prop.house_count += 1;
      desc = `${prop.name} mülküne ${prop.house_count}. ev inşa edildi (-${validation.cost} ₺)`;
    }

    const tx: Transaction = {
      id: generateUUID(),
      room_id: roomId,
      type: 'property_build',
      from_player_id: player.id,
      to_player_id: null,
      amount: validation.cost,
      description: desc,
      metadata: { property_id: prop.id, property_name: prop.name, houses: prop.house_count, hotels: prop.hotel_count },
      created_by_player_id: player.id,
      created_at: new Date().toISOString(),
    };

    state.transactions.unshift(tx);
    saveLocalRoomState(state);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('players').update({ balance: player.balance }).eq('id', player.id);
        await supabase
          .from('properties')
          .update({ house_count: prop.house_count, hotel_count: prop.hotel_count })
          .eq('id', prop.id);
        await supabase.from('transactions').insert(tx);
      } catch (e) {
        console.warn('Supabase buildHouse sync:', e);
      }
    }
  }

  /**
   * Mortgage or Unmortgage a property
   */
  static async toggleMortgage(
    roomId: string,
    sessionToken: string,
    playerId: string,
    propertyId: string
  ): Promise<void> {
    const state = getLocalRoomState(roomId);
    if (!state) throw new Error('Oda bulunamadı');

    const prop = state.properties.find((p) => p.id === propertyId);
    const player = state.players.find((p) => p.id === playerId);

    if (!prop || !player) throw new Error('Mülk veya oyuncu bulunamadı');
    if (prop.owner_id !== player.id) throw new Error('Bu mülk size ait değil');

    if (prop.house_count > 0 || prop.hotel_count > 0) {
      throw new Error('İpotek etmeden önce mülk üzerindeki ev/otelleri satmalısınız');
    }

    let tx: Transaction;

    if (!prop.is_mortgaged) {
      // İpotek et: Oyuncuya ipotek bedeli ödenir
      prop.is_mortgaged = true;
      player.balance += prop.mortgage_value;

      tx = {
        id: generateUUID(),
        room_id: roomId,
        type: 'mortgage',
        from_player_id: null,
        to_player_id: player.id,
        amount: prop.mortgage_value,
        description: `${prop.name} ipotek edildi (+${prop.mortgage_value} ₺)`,
        metadata: { property_id: prop.id, property_name: prop.name },
        created_by_player_id: player.id,
        created_at: new Date().toISOString(),
      };
    } else {
      // İpotekten çıkar: İpotek bedeli + %10 faiz ödenir
      const unmortgageCost = prop.unmortgage_price;
      if (player.balance < unmortgageCost) {
        throw new Error(`İpotekten çıkarmak için ${unmortgageCost} ₺ gerekli. Bakiyeniz yetersiz.`);
      }

      player.balance -= unmortgageCost;
      prop.is_mortgaged = false;

      tx = {
        id: generateUUID(),
        room_id: roomId,
        type: 'unmortgage',
        from_player_id: player.id,
        to_player_id: null,
        amount: unmortgageCost,
        description: `${prop.name} ipoteği kaldırıldı (-${unmortgageCost} ₺)`,
        metadata: { property_id: prop.id, property_name: prop.name },
        created_by_player_id: player.id,
        created_at: new Date().toISOString(),
      };
    }

    state.transactions.unshift(tx);
    saveLocalRoomState(state);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('players').update({ balance: player.balance }).eq('id', player.id);
        await supabase.from('properties').update({ is_mortgaged: prop.is_mortgaged }).eq('id', prop.id);
        await supabase.from('transactions').insert(tx);
      } catch (e) {
        console.warn('Supabase toggleMortgage sync:', e);
      }
    }
  }

  // ============================================================================
  // BANKER SPECIFIC POWERS (Secured by room owner / banker verification)
  // ============================================================================

  /**
   * Banker balance adjustment with mandatory audit note
   */
  static async bankerAdjustBalance(
    roomId: string,
    bankerSessionToken: string,
    targetPlayerId: string,
    amountDiff: number,
    reason: string
  ): Promise<void> {
    if (!reason.trim()) throw new Error('Bankacı düzeltmesi için açıklama zorunludur');

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('atomic_banker_adjust_balance', {
          p_room_id: roomId,
          p_banker_session: bankerSessionToken,
          p_player_id: targetPlayerId,
          p_amount_diff: amountDiff,
          p_reason: reason,
        });
        if (error) throw error;
        if (data && !data.success) throw new Error(data.error);
      } catch (e: any) {
        if (!e.message?.includes('not found') && !e.message?.includes('fetch')) throw e;
      }
    }

    const state = getLocalRoomState(roomId);
    if (!state) throw new Error('Oda bulunamadı');

    const banker = state.players.find((p) => p.session_token === bankerSessionToken && (p.is_banker || p.is_owner));
    if (!banker) throw new Error('Bankacı yetkisi bulunamadı');

    const target = state.players.find((p) => p.id === targetPlayerId);
    if (!target) throw new Error('Hedef oyuncu bulunamadı');

    const oldBal = target.balance;
    target.balance += amountDiff;

    const tx: Transaction = {
      id: generateUUID(),
      room_id: roomId,
      type: 'banker_adjustment',
      from_player_id: amountDiff < 0 ? target.id : null,
      to_player_id: amountDiff >= 0 ? target.id : null,
      amount: Math.abs(amountDiff),
      description: `Bankacı Düzeltmesi: ${reason} (Önceki: ${oldBal} ₺, Yeni: ${target.balance} ₺)`,
      metadata: {
        previous_balance: oldBal,
        new_balance: target.balance,
        banker_id: banker.id,
        banker_name: banker.name,
      },
      created_by_player_id: banker.id,
      created_at: new Date().toISOString(),
    };

    state.transactions.unshift(tx);
    saveLocalRoomState(state);
  }

  /**
   * Banker property override (owner, house/hotel counts, mortgage) with audit note
   */
  static async bankerOverrideProperty(
    roomId: string,
    bankerSessionToken: string,
    propertyId: string,
    newOwnerId: string | null,
    houseCount: number,
    hotelCount: number,
    isMortgaged: boolean,
    reason: string
  ): Promise<void> {
    if (!reason.trim()) throw new Error('Bankacı müdahalesi için gerekçe zorunludur');

    const state = getLocalRoomState(roomId);
    if (!state) throw new Error('Oda bulunamadı');

    const banker = state.players.find((p) => p.session_token === bankerSessionToken && (p.is_banker || p.is_owner));
    if (!banker) throw new Error('Bankacı yetkisi bulunamadı');

    const prop = state.properties.find((p) => p.id === propertyId);
    if (!prop) throw new Error('Mülk bulunamadı');

    const oldOwner = state.players.find((p) => p.id === prop.owner_id);
    const newOwner = state.players.find((p) => p.id === newOwnerId);

    prop.owner_id = newOwnerId;
    prop.house_count = houseCount;
    prop.hotel_count = hotelCount;
    prop.is_mortgaged = isMortgaged;

    const tx: Transaction = {
      id: generateUUID(),
      room_id: roomId,
      type: 'banker_property_override',
      from_player_id: oldOwner?.id || null,
      to_player_id: newOwner?.id || null,
      amount: 0,
      description: `Bankacı Mülk Müdahalesi (${prop.name}): ${reason} [Sahip: ${newOwner?.name || 'Banka'}, Ev: ${houseCount}, Otel: ${hotelCount}, İpotek: ${isMortgaged ? 'Evet' : 'Hayır'}]`,
      metadata: {
        property_id: prop.id,
        property_name: prop.name,
        banker_id: banker.id,
      },
      created_by_player_id: banker.id,
      created_at: new Date().toISOString(),
    };

    state.transactions.unshift(tx);
    saveLocalRoomState(state);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('properties')
          .update({
            owner_id: newOwnerId,
            house_count: houseCount,
            hotel_count: hotelCount,
            is_mortgaged: isMortgaged,
          })
          .eq('id', prop.id);
        await supabase.from('transactions').insert(tx);
      } catch (e) {
        console.warn('Supabase banker override sync:', e);
      }
    }
  }

  /**
   * Revert a faulty transaction (creates compensating reverse transaction with audit trail)
   */
  static async bankerRevertTransaction(
    roomId: string,
    bankerSessionToken: string,
    transactionId: string,
    reason: string
  ): Promise<void> {
    if (!reason.trim()) throw new Error('Ters işlem oluşturmak için gerekçe zorunludur');

    const state = getLocalRoomState(roomId);
    if (!state) throw new Error('Oda bulunamadı');

    const banker = state.players.find((p) => p.session_token === bankerSessionToken && (p.is_banker || p.is_owner));
    if (!banker) throw new Error('Bankacı yetkisi bulunamadı');

    const originalTx = state.transactions.find((t) => t.id === transactionId);
    if (!originalTx) throw new Error('İşlem kaydı bulunamadı');

    // Compensate balances if it was a money transfer
    if (originalTx.from_player_id && originalTx.to_player_id && originalTx.amount > 0) {
      const fromP = state.players.find((p) => p.id === originalTx.from_player_id);
      const toP = state.players.find((p) => p.id === originalTx.to_player_id);
      if (fromP && toP) {
        fromP.balance += originalTx.amount;
        toP.balance -= originalTx.amount;
      }
    }

    const revertTx: Transaction = {
      id: generateUUID(),
      room_id: roomId,
      type: 'banker_adjustment',
      from_player_id: originalTx.to_player_id,
      to_player_id: originalTx.from_player_id,
      amount: originalTx.amount,
      description: `Hatalı İşlem Düzeltmesi (İptal/Ters İşlem): #${originalTx.id.slice(0, 6)} - ${reason}`,
      metadata: { original_tx_id: originalTx.id, banker_id: banker.id },
      created_by_player_id: banker.id,
      created_at: new Date().toISOString(),
    };

    state.transactions.unshift(revertTx);
    saveLocalRoomState(state);
  }

  /**
   * Subscribe to real-time updates for a room
   */
  static subscribeToRoom(roomId: string, onUpdate: () => void): () => void {
    let supabaseChannel: any = null;

    if (isSupabaseConfigured && supabase) {
      supabaseChannel = supabase
        .channel(`room_${roomId}`)
        .on('postgres_changes', { event: '*', schema: 'public', filter: `room_id=eq.${roomId}` }, () => {
          onUpdate();
        })
        .subscribe();
    }

    const broadcastHandler = (e: MessageEvent) => {
      if (e.data && e.data.roomId === roomId) {
        onUpdate();
      }
    };

    if (broadcast) {
      broadcast.addEventListener('message', broadcastHandler);
    }

    return () => {
      if (supabaseChannel && supabase) {
        supabase.removeChannel(supabaseChannel);
      }
      if (broadcast) {
        broadcast.removeEventListener('message', broadcastHandler);
      }
    };
  }
}
