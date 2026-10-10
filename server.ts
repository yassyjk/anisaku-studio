import express, { Request, Response } from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

export interface Card {
    id: string;
    element: "脚本" | "作画" | "声優" | "音楽";
    name: string;
    tags: string[];
}

export interface PublishedWork {
    title: string;
    cards: Card[];
    score: number;
    voteCount: number;
    bestAnimeBonus: number;
}

export interface WorkVote {
    voterId: string;
    playerId: string;
    workIndex: number;
}

export interface DiscardEntry {
    card: Card;
    playerId: string;
}

export interface Player {
    id: string;
    name: string;
    isHost: boolean;
    isReady: boolean;
    hand: Card[];
    coins: number;
    works: PublishedWork[];
    score: number;
}

export interface GameState {
    roomId: string;
    hostId: string;
    players: Player[];
    phase: "lobby" | "playing" | "voting" | "counting" | "result";
    turnIndex: number;
    winner: string;
    isInterrupted: boolean;
    updatedAt: string;
    discardCard: Card | null;
    discardBy: string;
    discardCards: DiscardEntry[];
    turnStep: "take" | "resolve";
    votes: WorkVote[];
}

interface RoomInternal {
    state: GameState;
    deck: Card[];
    discardPile: Card[];
    discardOwners: string[];
    connections: Map<string, WebSocket>;
}

const CARD_DEFINITIONS: Array<{
    names: Record<string, string>;
    tags: string[];
}> = [
    { names: { "脚本": "熱血バトル", "作画": "迫力エフェクト", "声優": "熱血演技", "音楽": "激ロック" }, tags: ["熱血"] },
    { names: { "脚本": "爆笑ギャグ", "作画": "激しい顔芸", "声優": "キレツッコミ", "音楽": "陽気BGM" }, tags: ["ギャグ"] },
    { names: { "脚本": "ほのぼの日常", "作画": "キラキラ", "声優": "キュート声", "音楽": "パステルポップ" }, tags: ["可愛い"] },
    { names: { "脚本": "青春ドラマ", "作画": "美しい夕景", "声優": "情感たっぷり", "音楽": "切ないピアノ" }, tags: ["感動"] },
    { names: { "脚本": "超能力ギャグ", "作画": "ギャグアクション", "声優": "勢いノリ", "音楽": "軽快BGM" }, tags: ["熱血", "ギャグ"] },
    { names: { "脚本": "変身ヒロイン", "作画": "可憐バトル", "声優": "強く可愛く", "音楽": "カッコ可愛い" }, tags: ["熱血", "可愛い"] },
    { names: { "脚本": "絆のライバル", "作画": "魂の劇画", "声優": "感情爆発", "音楽": "壮大オーケストラ" }, tags: ["熱血", "感動"] },
    { names: { "脚本": "異世界グルメ", "作画": "飯テロ", "声優": "脱力系", "音楽": "ピコピコ音" }, tags: ["ギャグ", "可愛い"] },
    { names: { "脚本": "人情コメディ", "作画": "温かい手描き", "声優": "味わい深い", "音楽": "しみるアコギ" }, tags: ["ギャグ", "感動"] },
    { names: { "脚本": "モフモフ冒険", "作画": "癒やし系", "声優": "癒やし声", "音楽": "優しい子守唄" }, tags: ["可愛い", "感動"] },
    { names: { "脚本": "学園バトル", "作画": "シャープ", "声優": "定番ボイス", "音楽": "王道アニソン" }, tags: [] },
    { names: { "脚本": "探偵ミステリー", "作画": "クール陰影", "声優": "低音イケメン", "音楽": "怪しいジャズ" }, tags: [] },
    { names: { "脚本": "街角日常", "作画": "普通の街並み", "声優": "自然体", "音楽": "爽やかBGM" }, tags: [] },
    { names: { "脚本": "商店街人情", "作画": "レトロ雰囲気", "声優": "ベテラン", "音楽": "昭和BGM" }, tags: [] },
    { names: { "脚本": "SFロボット", "作画": "精密", "声優": "渋い低音", "音楽": "重厚オーケストラ" }, tags: [] },
    { names: { "脚本": "スポーツ青春", "作画": "汗と土埃", "声優": "気合い満々", "音楽": "応援ブラス" }, tags: [] },
];

const ELEMENTS: Array<"脚本" | "作画" | "声優" | "音楽"> = ["脚本", "作画", "声優", "音楽"];

function shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function newDeck(): Card[] {
    const deck: Card[] = [];
    for (const element of ELEMENTS) {
        CARD_DEFINITIONS.forEach((def, i) => {
            deck.push({
                id: `${element}-${String(i + 1).padStart(2, "0")}`,
                element,
                name: def.names[element],
                tags: [...def.tags],
            });
        });
    }
    return shuffle(deck);
}

function drawCard(room: RoomInternal): Card | null {
    if (room.deck.length === 0 && room.discardPile.length > 0) {
        room.deck = [...room.discardPile];
        room.discardPile = [];
        room.discardOwners = [];
        refreshDiscardView(room);
        shuffle(room.deck);
    }
    if (room.deck.length === 0) {
        return null;
    }
    return room.deck.pop() || null;
}

function discardCard(room: RoomInternal, card: Card, playerId: string) {
    room.discardPile.push(card);
    room.discardOwners.push(playerId);
    refreshDiscardView(room);
}

function refreshDiscardView(room: RoomInternal) {
    const { discardPile, discardOwners, state } = room;
    state.discardCards = [];
    state.discardCard = null;
    state.discardBy = "";
    if (discardPile.length === 0) return;

    const firstVisible = Math.max(0, discardPile.length - 3);
    for (let i = firstVisible; i < discardPile.length; i++) {
        state.discardCards.push({
            card: discardPile[i],
            playerId: discardOwners[i],
        });
    }
    state.discardCard = discardPile[discardPile.length - 1];
    state.discardBy = discardOwners[discardOwners.length - 1];
}

function selectWorkCards(hand: Card[], indices: number[]): { cards: Card[]; ok: boolean } {
    if (!indices || indices.length !== 4) return { cards: [], ok: false };
    const seenIndices = new Set<number>();
    const seenElements = new Set<string>();
    const cards: Card[] = [];

    for (const idx of indices) {
        if (idx < 0 || idx >= hand.length || seenIndices.has(idx) || seenElements.has(hand[idx].element)) {
            return { cards: [], ok: false };
        }
        seenIndices.add(idx);
        seenElements.add(hand[idx].element);
        cards.push({ ...hand[idx], tags: [...hand[idx].tags] });
    }

    if (seenElements.size !== 4) return { cards: [], ok: false };
    return { cards, ok: true };
}

function scoreWork(cards: Card[]): number {
    const counts: Record<string, number> = {};
    for (const card of cards) {
        for (const tag of card.tags) {
            counts[tag] = (counts[tag] || 0) + 1;
        }
    }
    let score = 1;
    for (const count of Object.values(counts)) {
        if (count === 2) score += 2;
        else if (count === 3) score += 4;
        else if (count >= 4) score += 6;
    }
    return score;
}

function finishGame(room: RoomInternal) {
    const { state } = room;
    const voteCounts: Record<string, number> = {};
    for (const vote of state.votes) {
        const key = `${vote.playerId}:${vote.workIndex}`;
        voteCounts[key] = (voteCounts[key] || 0) + 1;
    }

    let mostVotes = 0;
    for (const player of state.players) {
        for (let workIndex = 0; workIndex < player.works.length; workIndex++) {
            const work = player.works[workIndex];
            const count = voteCounts[`${player.id}:${workIndex}`] || 0;
            work.voteCount = count;
            if (count > mostVotes) {
                mostVotes = count;
            }
        }
    }

    let winningScore = -1;
    const winners: string[] = [];

    for (const player of state.players) {
        player.score = player.coins;
        for (const work of player.works) {
            if (mostVotes > 0 && work.voteCount === mostVotes) {
                work.bestAnimeBonus = 3;
            } else {
                work.bestAnimeBonus = 0;
            }
            player.score += work.score;
            player.score += work.bestAnimeBonus;
        }

        if (player.score > winningScore) {
            winningScore = player.score;
            winners.length = 0;
            winners.push(player.name);
        } else if (player.score === winningScore) {
            winners.push(player.name);
        }
    }

    state.winner = winners.join("・");
    state.phase = "result";
}

function hasEligibleWork(state: GameState, playerId: string): boolean {
    for (const player of state.players) {
        if (player.id !== playerId && player.works.length > 0) {
            return true;
        }
    }
    return false;
}

function allVotesSubmitted(state: GameState): boolean {
    for (const player of state.players) {
        if (!hasEligibleWork(state, player.id)) continue;
        const voted = state.votes.some((v) => v.voterId === player.id);
        if (!voted) return false;
    }
    return true;
}

function isHost(playerId: string, state: GameState): boolean {
    return state.players.some((p) => p.id === playerId && p.isHost);
}

function maskState(state: GameState, playerId: string): any {
    return {
        ...state,
        players: state.players.map((p) => {
            if (p.id !== playerId) {
                const { hand, ...rest } = p;
                return rest;
            }
            return p;
        }),
    };
}

function broadcast(room: RoomInternal) {
    for (const player of room.state.players) {
        const ws = room.connections.get(player.id);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: "state",
                payload: maskState(room.state, player.id),
            }));
        }
    }
}

const rooms = new Map<string, RoomInternal>();
const socketToRoomAndPlayer = new Map<WebSocket, { roomId: string; playerId?: string }>();

function processLogic(room: RoomInternal, playerId: string, msg: { type: string; payload: any }, socket: WebSocket | null) {
    const { state } = room;
    state.updatedAt = new Date().toISOString();

    switch (msg.type) {
        case "join": {
            const p = msg.payload || {};
            let name = (typeof p.name === "string" ? p.name : "Guest").trim();
            const runes = Array.from(name);
            if (runes.length > 10) {
                name = runes.slice(0, 10).join("");
            }
            if (!name) name = "Guest";
            const id = p.id;
            if (!id) return;

            const isPlayerHost = (id === state.hostId) || (state.players.length === 0 && !state.hostId);
            if (isPlayerHost && !state.hostId) {
                state.hostId = id;
            }

            if (socket) {
                room.connections.set(id, socket);
                socketToRoomAndPlayer.set(socket, { roomId: state.roomId, playerId: id });
            }

            const existingIndex = state.players.findIndex((player) => player.id === id);
            if (existingIndex !== -1) {
                state.players[existingIndex].name = name;
            } else {
                if (state.phase !== "lobby") {
                    if (socket && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            type: "error",
                            payload: { message: "ゲームが進行中のため参加できません" },
                        }));
                    }
                    return;
                }
                if (state.players.length >= 8) {
                    if (socket && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            type: "error",
                            payload: { message: "満室で入れません" },
                        }));
                    }
                    return;
                }
                state.players.push({
                    id,
                    name,
                    isHost: isPlayerHost,
                    isReady: false,
                    hand: [],
                    coins: 0,
                    works: [],
                    score: 0,
                });
            }
            broadcast(room);
            break;
        }

        case "start": {
            if (isHost(playerId, state) && state.players.length >= 2 && state.players.length <= 8) {
                state.phase = "playing";
                state.turnIndex = Math.floor(Math.random() * state.players.length);
                state.isInterrupted = false;
                state.turnStep = "take";
                state.discardCard = null;
                state.discardBy = "";
                state.discardCards = [];
                room.deck = newDeck();
                room.discardPile = [];
                room.discardOwners = [];
                state.votes = [];
                for (const player of state.players) {
                    player.coins = 3;
                    player.works = [];
                    player.score = 0;
                    player.hand = [];
                    for (let i = 0; i < 4; i++) {
                        const card = drawCard(room);
                        if (card) player.hand.push(card);
                    }
                }
                broadcast(room);
            }
            break;
        }

        case "take_card": {
            const isCurrent = state.phase === "playing" && state.players.length > 0 && state.players[state.turnIndex]?.id === playerId;
            if (!isCurrent || state.turnStep !== "take") return;

            const player = state.players[state.turnIndex];
            const payload = msg.payload || {};
            let card: Card | null = null;

            if (payload.source === "deck") {
                card = drawCard(room);
                if (!card) return;
            } else if (payload.source === "discard") {
                if (player.coins < 1 || room.discardPile.length === 0) return;
                const firstVisible = Math.max(0, room.discardPile.length - 3);
                let discardIndex = -1;
                if (!payload.cardId) {
                    discardIndex = room.discardPile.length - 1;
                } else {
                    for (let i = firstVisible; i < room.discardPile.length; i++) {
                        if (room.discardPile[i].id === payload.cardId) {
                            discardIndex = i;
                            break;
                        }
                    }
                }
                if (discardIndex < firstVisible || discardIndex < 0 || room.discardOwners[discardIndex] === playerId) {
                    return;
                }
                const ownerId = room.discardOwners[discardIndex];
                const owner = state.players.find((p) => p.id === ownerId);
                if (!owner) return;

                card = room.discardPile[discardIndex];
                owner.coins++;
                player.coins--;
                room.discardPile.splice(discardIndex, 1);
                room.discardOwners.splice(discardIndex, 1);
                refreshDiscardView(room);
            } else {
                return;
            }

            player.hand.push(card);
            state.turnStep = "resolve";
            broadcast(room);
            break;
        }

        case "resolve_turn": {
            const isCurrent = state.phase === "playing" && state.players.length > 0 && state.players[state.turnIndex]?.id === playerId;
            if (!isCurrent || state.turnStep !== "resolve") return;

            const player = state.players[state.turnIndex];
            if (player.hand.length !== 5) return;
            const payload = msg.payload || {};

            if (payload.publish) {
                const { cards, ok } = selectWorkCards(player.hand, payload.workIndices);
                if (!ok) return;

                let title = (typeof payload.title === "string" ? payload.title : "").trim();
                if (!title) title = "無題";
                const runes = Array.from(title);
                if (runes.length > 24) {
                    title = runes.slice(0, 24).join("");
                }

                player.works.push({
                    title,
                    cards,
                    score: scoreWork(cards),
                    voteCount: 0,
                    bestAnimeBonus: 0,
                });

                const selectedIndices = new Set(payload.workIndices);
                const remaining: Card[] = [];
                for (let i = 0; i < player.hand.length; i++) {
                    if (!selectedIndices.has(i)) {
                        remaining.push(player.hand[i]);
                    }
                }
                if (remaining.length !== 1) return;

                discardCard(room, remaining[0], playerId);
                player.hand = [];

                if (player.works.length >= 2) {
                    state.phase = "voting";
                    state.votes = [];
                    if (allVotesSubmitted(state)) {
                        state.phase = "counting";
                    }
                    broadcast(room);
                    return;
                }

                for (let i = 0; i < 4; i++) {
                    const c = drawCard(room);
                    if (c) player.hand.push(c);
                }
            } else {
                const idx = payload.discardIndex;
                if (typeof idx !== "number" || idx < 0 || idx >= player.hand.length) return;
                discardCard(room, player.hand[idx], playerId);
                player.hand.splice(idx, 1);
            }

            state.turnStep = "take";
            state.turnIndex = (state.turnIndex + 1) % state.players.length;
            broadcast(room);
            break;
        }

        case "vote": {
            if (state.phase !== "voting" || !hasEligibleWork(state, playerId)) return;
            const voterExists = state.players.some((p) => p.id === playerId);
            if (!voterExists) return;

            const payload = msg.payload || {};
            if (payload.playerId === playerId) return;

            const targetPlayer = state.players.find((p) => p.id === payload.playerId);
            if (!targetPlayer || payload.workIndex < 0 || payload.workIndex >= targetPlayer.works.length) return;

            const alreadyVoted = state.votes.some((v) => v.voterId === playerId);
            if (alreadyVoted) return;

            state.votes.push({
                voterId: playerId,
                playerId: payload.playerId,
                workIndex: payload.workIndex,
            });

            if (allVotesSubmitted(state)) {
                state.phase = "counting";
            }
            broadcast(room);
            break;
        }

        case "show_results": {
            if (state.phase !== "counting" || !allVotesSubmitted(state)) return;
            finishGame(room);
            broadcast(room);
            break;
        }

        case "back_to_lobby": {
            state.phase = "lobby";
            state.isInterrupted = true;
            broadcast(room);
            break;
        }

        case "resume": {
            if (isHost(playerId, state) && state.isInterrupted) {
                state.phase = "playing";
                state.isInterrupted = false;
                broadcast(room);
            }
            break;
        }

        case "reorder_players": {
            if (isHost(playerId, state) && state.phase === "lobby") {
                const payload = msg.payload || {};
                const playerIds: string[] = payload.playerIds || [];
                const playerMap = new Map<string, Player>();
                for (const p of state.players) {
                    playerMap.set(p.id, p);
                }

                const newPlayers: Player[] = [];
                for (const id of playerIds) {
                    const p = playerMap.get(id);
                    if (p) {
                        newPlayers.push(p);
                        playerMap.delete(id);
                    }
                }
                for (const p of playerMap.values()) {
                    newPlayers.push(p);
                }
                state.players = newPlayers;
                broadcast(room);
            }
            break;
        }

        case "kick_player": {
            if (isHost(playerId, state) && state.phase === "lobby") {
                const payload = msg.payload || {};
                const targetId = payload.targetId;
                if (!targetId || targetId === playerId) return;

                const targetIdx = state.players.findIndex((p) => p.id === targetId);
                if (targetIdx !== -1) {
                    const kickedWs = room.connections.get(targetId);
                    if (kickedWs && kickedWs.readyState === WebSocket.OPEN) {
                        kickedWs.send(JSON.stringify({
                            type: "kicked",
                            payload: { message: "ホストによってルームから退出させられました" },
                        }));
                    }
                    room.connections.delete(targetId);
                    state.players.splice(targetIdx, 1);
                    broadcast(room);
                }
            }
            break;
        }

        default:
            break;
    }
}

function checkBasicAuth(req: Request): boolean {
    const accounts: Record<string, string> = {};
    if (process.env.BASIC_AUTH_ADMIN_USER && process.env.BASIC_AUTH_ADMIN_PASS) {
        accounts[process.env.BASIC_AUTH_ADMIN_USER] = process.env.BASIC_AUTH_ADMIN_PASS;
    }
    if (process.env.BASIC_AUTH_TEST1_USER && process.env.BASIC_AUTH_TEST1_PASS) {
        accounts[process.env.BASIC_AUTH_TEST1_USER] = process.env.BASIC_AUTH_TEST1_PASS;
    }
    if (process.env.BASIC_AUTH_TEST2_USER && process.env.BASIC_AUTH_TEST2_PASS) {
        accounts[process.env.BASIC_AUTH_TEST2_USER] = process.env.BASIC_AUTH_TEST2_PASS;
    }

    if (Object.keys(accounts).length === 0) return true;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Basic ")) return false;
    const credentials = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
    const [user, pass] = credentials.split(":");
    return accounts[user] === pass;
}

// Inactive rooms cleanup every 1 hour
setInterval(() => {
    const now = Date.now();
    for (const [id, room] of rooms.entries()) {
        const updatedTime = new Date(room.state.updatedAt).getTime();
        if (now - updatedTime > 6 * 3600 * 1000) {
            console.log(`Cleaning up inactive room: ${id}`);
            rooms.delete(id);
        }
    }
}, 3600 * 1000);

async function startServer() {
    const app = express();
    const server = http.createServer(app);
    const wss = new WebSocketServer({ noServer: true });

    app.use(express.json());

    // CORS handler
    app.use((req, res, next) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS;
        const origin = req.headers.origin as string;
        let isAllowed = false;

        if (!allowedOrigins || allowedOrigins === "*") {
            isAllowed = true;
        } else {
            for (const o of allowedOrigins.split(",")) {
                if (o.trim() === origin) {
                    isAllowed = true;
                    break;
                }
            }
        }

        if (!isAllowed && origin && (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1"))) {
            isAllowed = true;
        }

        if (isAllowed && origin) {
            res.setHeader("Access-Control-Allow-Origin", origin);
        }
        res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization");

        if (req.method === "OPTIONS") {
            res.status(204).end();
            return;
        }
        next();
    });

    // Health check endpoint
    app.get("/api/health", (_req: Request, res: Response) => {
        res.json({ status: "ok" });
    });

    // Create room endpoint
    app.post("/create", (req: Request, res: Response) => {
        if (!checkBasicAuth(req)) {
            res.setHeader("WWW-Authenticate", 'Basic realm="Authorization Required"');
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        if (rooms.size >= 100) {
            res.status(503).json({ error: "サーバーが混み合っています。しばらく時間をおいてからやり直してください。" });
            return;
        }

        let roomId = "";
        do {
            roomId = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
        } while (rooms.has(roomId));

        const hostId = (req.body && req.body.hostId) ? String(req.body.hostId) : "";
        const internal: RoomInternal = {
            state: {
                roomId,
                hostId,
                phase: "lobby",
                players: [],
                turnIndex: 0,
                winner: "",
                isInterrupted: false,
                updatedAt: new Date().toISOString(),
                discardCard: null,
                discardBy: "",
                discardCards: [],
                turnStep: "take",
                votes: [],
            },
            deck: [],
            discardPile: [],
            discardOwners: [],
            connections: new Map(),
        };

        rooms.set(roomId, internal);
        res.status(200).json({ roomId });
    });

    // Polling state endpoint
    app.get("/state", (req: Request, res: Response) => {
        const roomId = req.query.roomId as string;
        const playerId = (req.query.playerId as string) || "";

        const room = rooms.get(roomId);
        if (!room) {
            res.status(404).json({ error: "Room not found" });
            return;
        }

        room.state.updatedAt = new Date().toISOString();
        res.status(200).json(maskState(room.state, playerId));
    });

    // Polling action endpoint
    app.post("/action", (req: Request, res: Response) => {
        const roomId = req.query.roomId as string;
        const room = rooms.get(roomId);
        if (!room) {
            res.status(404).json({ error: "Room not found" });
            return;
        }

        const { playerId, type, payload } = req.body || {};
        processLogic(room, playerId, { type, payload }, null);
        res.status(200).json(maskState(room.state, playerId));
    });

    // WebSocket upgrade handler
    server.on("upgrade", (request, socket, head) => {
        const hostHeader = request.headers.host || "localhost";
        const urlObj = new URL(request.url || "", `http://${hostHeader}`);

        if (urlObj.pathname === "/ws") {
            const roomId = urlObj.searchParams.get("roomId");
            if (!roomId || !rooms.has(roomId)) {
                socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
                socket.destroy();
                return;
            }

            wss.handleUpgrade(request, socket, head, (ws) => {
                socketToRoomAndPlayer.set(ws as WebSocket, { roomId });
                wss.emit("connection", ws, request);
            });
        }
    });

    wss.on("connection", (ws: WebSocket) => {
        ws.on("message", (data) => {
            try {
                const info = socketToRoomAndPlayer.get(ws);
                if (!info) return;
                const room = rooms.get(info.roomId);
                if (!room) return;

                const msg = JSON.parse(data.toString());
                const playerId = info.playerId || "";
                processLogic(room, playerId, msg, ws);
            } catch (err) {
                console.error("Error processing websocket message:", err);
            }
        });

        ws.on("close", () => {
            const info = socketToRoomAndPlayer.get(ws);
            if (info) {
                socketToRoomAndPlayer.delete(ws);
                const room = rooms.get(info.roomId);
                if (room && info.playerId) {
                    if (room.connections.get(info.playerId) === ws) {
                        room.connections.delete(info.playerId);
                    }
                }
            }
        });
    });

    const isProd = process.env.NODE_ENV === "production";
    if (!isProd) {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    } else {
        const distPath = path.resolve("dist");
        app.use(express.static(distPath));
        app.get("*", (_req, res) => {
            res.sendFile(path.join(distPath, "index.html"));
        });
    }

    const port = parseInt(process.env.PORT || "3000", 10);
    server.listen(port, "0.0.0.0", () => {
        console.log(`Server listening on http://0.0.0.0:${port}`);
    });
}

startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});
