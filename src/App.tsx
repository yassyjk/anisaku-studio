import { createSignal, createEffect, Show, For, onMount, onCleanup } from "solid-js";
import {
    store,
    setStore,
    connectWs,
    createRoom,
    sendWs,
    setNickname,
    getNickname,
    stopConnection,
    checkRoomExists,
} from "./websocket";
import QRCode from "qrcode";
import type { Card, PublishedWork } from "./types";
import {
    ELEMENT_META,
    ELEMENT_IMAGES,
    TAG_STYLES,
    getCardTheme,
} from "./cardThemes";

const TAG_ICONS: Record<string, string> = {
    熱血: "🔥",
    ギャグ: "😂",
    可愛い: "💖",
    感動: "💧",
};

const CARD_ELEMENT_STYLES: Record<Card["element"], { mark: string; color: string; label: string }> = {
    脚本: { mark: "文", color: "border-sky-500 bg-sky-50/90", label: "text-sky-800" },
    作画: { mark: "絵", color: "border-rose-500 bg-rose-50/90", label: "text-rose-800" },
    声優: { mark: "声", color: "border-emerald-500 bg-emerald-50/90", label: "text-emerald-800" },
    音楽: { mark: "音", color: "border-violet-500 bg-violet-50/90", label: "text-violet-800" },
};

function App() {
    // --- 画面の状態を管理する変数（シグナル） ---
    const [view, setView] = createSignal<"top" | "lobby" | "game">("top");
    const [tempName, setTempName] = createSignal(getNickname());
    const [tempRoomId, setTempRoomId] = createSignal("");
    const [qrCodeUrl, setQrCodeUrl] = createSignal("");
    const [showRules, setShowRules] = createSignal(false);
    const [nameError, setNameError] = createSignal("");
    const [isComposing, setIsComposing] = createSignal(false);
    const [selectedIndices, setSelectedIndices] = createSignal<number[]>([]);
    const [workTitle, setWorkTitle] = createSignal("");
    const [draggingIndex, setDraggingIndex] = createSignal<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = createSignal<number | null>(null);
    const [deferredPrompt, setDeferredPrompt] = createSignal<any>(null);
    const [canInstallPwa, setCanInstallPwa] = createSignal(false);
    const [copiedRoom, setCopiedRoom] = createSignal(false);

    // アプリが起動したときに一度だけ実行される処理
    onMount(async () => {
        // PWA インストールプロンプトの検出
        window.addEventListener("beforeinstallprompt", (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setCanInstallPwa(true);
        });
        window.addEventListener("appinstalled", () => {
            setCanInstallPwa(false);
            setDeferredPrompt(null);
        });

        // URLに「?room=123456」のようなパラメータがあれば優先的に使用します。
        const params = new URLSearchParams(window.location.search);
        let rid = params.get("room");

        // URLになければ、前回参加していた部屋（localStorage）を確認します。
        if (!rid) {
            rid = localStorage.getItem("last_room_id");
        }

        if (rid) {
            setTempRoomId(rid);
            await handleJoin();
        }
    });

    const handleInstallPwa = async () => {
        const promptEvent = deferredPrompt();
        if (promptEvent) {
            promptEvent.prompt();
            const { outcome } = await promptEvent.userChoice;
            if (outcome === "accepted") {
                setCanInstallPwa(false);
            }
        } else {
            alert("ブラウザのメニューから「ホーム画面に追加」または「アプリをインストール」を選択すると、いつでもアプリとして起動できます。");
        }
    };

    const copyRoomLink = () => {
        const url = `${window.location.origin}?room=${store.roomId}`;
        navigator.clipboard?.writeText(url).then(() => {
            setCopiedRoom(true);
            setTimeout(() => setCopiedRoom(false), 2000);
        });
    };

    // 「新規ルーム作成」ボタンが押されたときの処理
    const handleCreate = async () => {
        const rid = await createRoom();
        if (rid) {
            setTempRoomId(rid);
            connectWs(rid);
            setView("lobby");
        }
    };

    // 「参加」ボタンが押されたときの処理
    const handleJoin = async () => {
        if (tempRoomId()) {
            if (sessionStorage.getItem(`kicked_room_${tempRoomId()}`)) {
                alert("この部屋から退出させられたため、現在のセッションでは再入室できません。");
                return;
            }

            const roomState = await checkRoomExists(tempRoomId());
            if (!roomState) {
                alert("指定された部屋が見つかりませんでした。");
                return;
            }

            const isAlreadyJoined = roomState.players.some(
                (p: any) => p.id === store.playerId,
            );
            if (!isAlreadyJoined && roomState.players.length >= 8) {
                alert("満室で入れません");
                return;
            }

            connectWs(tempRoomId());
            setView("lobby");
        }
    };

    // 「ゲームスタート」ボタンが押されたときの処理
    const handleStart = () => {
        sendWs("start", {});
    };

    // 「ゲーム再開」ボタンが押されたときの処理
    const handleResume = () => {
        sendWs("resume", {});
    };

    // 山札または購入可能な捨て札からカードを取得します。
    const handleTakeCard = (source: "deck" | "discard", cardId?: string) => {
        setSelectedIndices([]);
        sendWs("take_card", { source, cardId });
    };

    // 選択した4種類のカードを作品として公開します。
    const handlePublish = () => {
        sendWs("resolve_turn", {
            publish: true,
            workIndices: selectedIndices(),
            title: workTitle(),
        });
        setSelectedIndices([]);
        setWorkTitle("");
    };

    // 選んだカードを捨てて手番を終えます。
    const handleDiscard = (discardIndex: number) => {
        sendWs("resolve_turn", { publish: false, discardIndex });
        setSelectedIndices([]);
    };

    // 公開候補を選択・解除し、同じ制作要素の重複選択を防ぎます。
    const toggleWorkCard = (index: number) => {
        const hand = store.gameState?.players.find(
            (player) => player.id === store.playerId,
        )?.hand ?? [];
        const selected = selectedIndices();
        if (selected.includes(index)) {
            setSelectedIndices(selected.filter((selectedIndex) => selectedIndex !== index));
            return;
        }
        if (selected.length >= 4 || selected.some((selectedIndex) => hand[selectedIndex]?.element === hand[index]?.element)) {
            return;
        }
        setSelectedIndices([...selected, index]);
    };

    // 選択カードに脚本・作画・声優・音楽が1枚ずつ揃っているか確認します。
    const canPublish = () => {
        const hand = store.gameState?.players.find(
            (player) => player.id === store.playerId,
        )?.hand ?? [];
        const elements = new Set(selectedIndices().map((index) => hand[index]?.element));
        return selectedIndices().length === 4 && elements.size === 4;
    };

    // 選択中の4枚から基本点とタグボーナス込みの予想点を計算します。
    const previewWorkScore = () => {
        if (!canPublish()) return null;
        const hand = store.gameState?.players.find(
            (player) => player.id === store.playerId,
        )?.hand ?? [];
        const tagCounts = new Map<string, number>();
        for (const index of selectedIndices()) {
            for (const tag of hand[index].tags) {
                tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
            }
        }
        let bonus = 0;
        for (const count of tagCounts.values()) {
            if (count === 2) bonus += 2;
            else if (count === 3) bonus += 4;
            else if (count >= 4) bonus += 6;
        }
        return { bonus, total: 1 + bonus };
    };

    // 「トップへ戻る」ボタンが押されたときの処理（リセット）
    const handleReset = () => {
        stopConnection();
        localStorage.removeItem("last_room_id");
        setStore("roomId", null);
        setStore("gameState", null);
        setView("top");
        setTempRoomId("");
        setSelectedIndices([]);
        setWorkTitle("");
        window.history.pushState({}, "", window.location.pathname);
    };

    // ゲームを一時中断してロビーに戻る処理
    const handleInterrupt = () => {
        sendWs("back_to_lobby", {});
        setView("lobby");
    };

    // プレイヤーを追放する処理（ホスト専用）
    const handleKick = (targetId: string) => {
        if (confirm("本当にこのプレイヤーを退出させますか？")) {
            sendWs("kick_player", { targetId });
        }
    };

    // プレイヤーの並び順を変更する処理（ホスト専用）
    const handleReorder = (fromIndex: number, toIndex: number) => {
        const currentPlayers = store.gameState?.players;
        if (!currentPlayers) return;

        const newPlayers = [...currentPlayers];
        const [moved] = newPlayers.splice(fromIndex, 1);
        newPlayers.splice(toIndex, 0, moved);

        sendWs("reorder_players", {
            playerIds: newPlayers.map((p) => p.id),
        });
    };

    // ドラッグ＆ドロップ用ハンドラー
    const onDragStart = (e: DragEvent, index: number) => {
        if (!store.gameState?.players.find((p: any) => p.id === store.playerId)?.isHost) return;
        setDraggingIndex(index);
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", index.toString());
        }
    };

    const onDragOver = (e: DragEvent, index: number) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        setDragOverIndex(index);
    };

    const onDrop = (e: DragEvent, index: number) => {
        e.preventDefault();
        const from = draggingIndex();
        if (from !== null && from !== index) {
            handleReorder(from, index);
        }
        setDraggingIndex(null);
        setDragOverIndex(null);
    };

    const onDragEnd = () => {
        setDraggingIndex(null);
        setDragOverIndex(null);
    };

    // タッチ操作（スマホ）対応
    const onTouchStart = (_e: TouchEvent, index: number) => {
        if (!store.gameState?.players.find((p: any) => p.id === store.playerId)?.isHost) return;
        setDraggingIndex(index);
    };

    const onTouchMove = (e: TouchEvent) => {
        if (draggingIndex() === null) return;
        e.preventDefault();
        const touchY = e.touches[0].clientY;
        const target = document.elementFromPoint(e.touches[0].clientX, touchY);
        const listItem = target?.closest("li[data-index]");
        if (listItem) {
            const index = parseInt(listItem.getAttribute("data-index") || "-1");
            if (index !== -1 && index !== draggingIndex()) {
                setDragOverIndex(index);
            }
        }
    };

    const onTouchEnd = (_e: TouchEvent) => {
        const from = draggingIndex();
        const to = dragOverIndex();
        if (from !== null && to !== null && from !== to) {
            handleReorder(from, to);
        }
        setDraggingIndex(null);
        setDragOverIndex(null);
    };

    // ゲームフェーズの自動追従
    createEffect(() => {
        const state = store.gameState;
        if (state) {
            if (state.phase === "playing") setView("game");
            else if (state.phase === "voting" || state.phase === "counting" || state.phase === "result") setView("game");
            else if (state.phase === "lobby") setView("lobby");
        }
    });

    // キック状態の監視
    createEffect(() => {
        const state = store.gameState;
        const currentView = view();
        if (state && currentView !== "top") {
            const isMeInRoom = state.players.some((p: any) => p.id === store.playerId);
            if (!isMeInRoom) {
                handleReset();
            }
        }
    });

    // ルームIDのURL同期
    createEffect(() => {
        const rid = store.roomId;
        if (rid) {
            const url = new URL(window.location.href);
            if (url.searchParams.get("room") !== rid) {
                url.searchParams.set("room", rid);
                window.history.pushState({}, "", url.toString());
            }
        }
    });

    // エラー監視
    createEffect(() => {
        const error = store.error;
        if (error) {
            alert(error);
            setStore("error", null);
            handleReset();
        }
    });

    // QRコード生成
    createEffect(() => {
        if (view() === "lobby" && store.roomId) {
            const url = `${window.location.origin}?room=${store.roomId}`;
            QRCode.toDataURL(url).then(setQrCodeUrl);
        }
    });

    const isMyTurn = () => {
        const state = store.gameState;
        if (!state || state.phase !== "playing") return false;
        return state.players[state.turnIndex]?.id === store.playerId;
    };

    const canTakeFromDeck = () => isMyTurn() && store.gameState?.turnStep === "take";

    const canBuyDiscard = (discardBy: string) => {
        const state = store.gameState;
        const coins = state?.players.find((player) => player.id === store.playerId)?.coins ?? 0;
        return canTakeFromDeck() && discardBy !== store.playerId && coins >= 1;
    };

    const visibleDiscards = () =>
        Array.from({ length: 3 }, (_, index) => store.gameState?.discardCards?.[index] ?? null);

    const availableWorks = () =>
        (store.gameState?.players ?? []).flatMap((player) =>
            player.id === store.playerId
                ? []
                : (player.works ?? []).map((work, workIndex) => ({ player, work, workIndex })),
        );

    const hasVoted = () =>
        (store.gameState?.votes ?? []).some((vote) => vote.voterId === store.playerId);

    createEffect(() => {
        if (store.gameState?.phase !== "counting") return;
        const timer = window.setTimeout(() => sendWs("show_results", {}), 1400);
        onCleanup(() => window.clearTimeout(timer));
    });

    const getCardTitle = (card: Card | null | undefined) => {
        if (!card) return "";
        const suffix = `の${card.element}`;
        let title = card.name.endsWith(suffix) ? card.name.slice(0, -suffix.length) : card.name;
        if (card.element === "脚本" && title.endsWith("の物語")) title = title.slice(0, -3);
        else if (card.element === "脚本" && title.endsWith("物語")) title = title.slice(0, -2);
        else if (card.element === "脚本" && title.endsWith("の脚本")) title = title.slice(0, -3);
        else if (card.element === "脚本" && title.endsWith("脚本")) title = title.slice(0, -2);
        else if (card.element === "声優" && title.endsWith("な声")) title = title.slice(0, -2);
        else if (card.element === "声優" && title.endsWith("声")) title = title.slice(0, -1);
        else if (card.element === "音楽" && title.endsWith("な音楽")) title = title.slice(0, -3);
        else if (card.element === "音楽" && title.endsWith("音楽")) title = title.slice(0, -2);
        return title.endsWith("風") ? title.slice(0, -1) : title;
    };

    /**
     * 各カードの内容・テーマに合わせたリッチなカードデザインを描画
     */
    const renderCardFace = (card: Card) => {
        const meta = ELEMENT_META[card.element];
        const theme = getCardTheme(card);
        const title = getCardTitle(card);

        return (
            <div class="flex h-full w-full min-w-0 flex-col justify-between overflow-hidden rounded-md text-left select-none relative bg-white">
                {/* 部門ヘッダーバー */}
                <div class={`flex items-center justify-between px-1 py-0.5 border-b ${meta.border} bg-stone-50/90`}>
                    <span class="inline-flex items-center gap-1 font-black text-[9px]">
                        <span class={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-black ${meta.badgeBg}`}>
                            {meta.mark}
                        </span>
                        <span class={`tracking-tight font-black ${meta.color}`}>{card.element}</span>
                    </span>
                    <span class="text-[7.5px] font-mono font-bold text-stone-400">
                        {card.id}
                    </span>
                </div>

                {/* カードコンテンツ（テーマ背景・タイトル・サブタイトル） */}
                <div class={`relative flex flex-1 flex-col justify-center px-1.5 py-1 bg-gradient-to-br ${theme.bgGradient} overflow-hidden`}>
                    <div class="flex items-center gap-1">
                        <span class="text-xs shrink-0 drop-shadow-sm" role="img" aria-label={theme.themeBadge}>
                            {theme.motif.split(" ")[0]}
                        </span>
                        <span class="font-black text-[10.5px] leading-tight text-stone-900 line-clamp-2">
                            {title}
                        </span>
                    </div>
                    <span class="mt-0.5 text-[7.5px] text-stone-600 line-clamp-1 font-medium tracking-tight">
                        {theme.sublabel}
                    </span>
                </div>

                {/* タグと属性フッター */}
                <div class="flex items-center justify-between gap-0.5 px-1 py-0.5 bg-white/95 border-t border-stone-200">
                    <div class="flex min-w-0 flex-wrap gap-0.5 overflow-hidden">
                        {(card.tags ?? []).map((tag) => (
                            <span
                                class={`inline-flex max-w-full min-w-0 shrink-0 items-center gap-0.5 rounded px-1 py-px text-[7.5px] font-black border ${
                                    TAG_STYLES[tag]?.border ?? "border-stone-300"
                                } ${TAG_STYLES[tag]?.bg ?? "bg-stone-100"} ${TAG_STYLES[tag]?.text ?? "text-stone-700"}`}
                                title={tag}
                            >
                                <span aria-hidden="true">{TAG_ICONS[tag] ?? "🏷️"}</span>
                                <span class="whitespace-nowrap">{tag}</span>
                            </span>
                        ))}
                        {(card.tags ?? []).length === 0 && (
                            <span class="text-[7px] font-bold text-stone-400">ノーマル</span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderWorkComposition = (work: PublishedWork) =>
        work.cards.map((card) => `${CARD_ELEMENT_STYLES[card.element].mark}：${getCardTitle(card)}`).join("、");

    return (
        <div class="min-h-screen flex flex-col items-center p-3 sm:p-5 selection:bg-amber-200">
            {/* アニメ制作スタジオ ヘッダー */}
            <header class="w-full max-w-md flex justify-between items-center mb-6 pt-2">
                <div class="flex items-center gap-2.5">
                    <img
                        src="/icon-512x512.png"
                        alt="アニ作 ロゴ"
                        class="w-9 h-9 rounded-xl shadow-md border border-stone-300/80 object-cover"
                    />
                    <div>
                        <div class="flex items-center gap-1.5">
                            <h1 class="text-xl font-black text-stone-900 tracking-tight leading-none">
                                アニ作
                            </h1>
                            <span class="text-[9px] font-extrabold uppercase tracking-wider bg-stone-900 text-amber-400 px-1.5 py-0.5 rounded">
                                Studio Desk
                            </span>
                        </div>
                        <p class="text-[10px] text-stone-500 font-bold tracking-tight">
                            アニメ制作カードゲーム
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <Show when={canInstallPwa()}>
                        <button
                            onClick={handleInstallPwa}
                            class="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors shadow-sm"
                            title="PWAアプリをインストール"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            <span>PWA追加</span>
                        </button>
                    </Show>

                    <Show when={view() !== "top"}>
                        <button
                            onClick={handleReset}
                            class="text-xs font-bold text-stone-500 hover:text-stone-900 bg-white border border-stone-200 px-2.5 py-1 rounded-lg shadow-sm"
                        >
                            トップへ戻る
                        </button>
                    </Show>
                </div>
            </header>

            <main class="w-full max-w-md">
                {/* --- トップ画面 --- */}
                <Show when={view() === "top"}>
                    <div class="space-y-5">
                        {/* スタジオコンセプト ヒーローパネル */}
                        <div class="card p-5 border-stone-300/80 bg-gradient-to-b from-white to-stone-50 space-y-4">
                            <div class="flex items-center gap-2 pb-2 border-b border-stone-200">
                                <span class="text-lg">🎬</span>
                                <div>
                                    <h2 class="text-sm font-black text-stone-900 tracking-tight">
                                        企画・制作進行デスクへようこそ
                                    </h2>
                                    <p class="text-[11px] text-stone-500">
                                        脚本・作画・声優・音楽を集めて覇権アニメを制作せよ！
                                    </p>
                                </div>
                            </div>

                            {/* 4要素のプレビュー */}
                            <div class="grid grid-cols-4 gap-1.5 text-center">
                                <div class="rounded-xl p-2 border border-sky-200 bg-sky-50/70">
                                    <img src={ELEMENT_IMAGES.脚本} alt="脚本" class="w-8 h-8 mx-auto rounded-md object-cover mb-1 shadow-sm" />
                                    <span class="block text-[10px] font-black text-sky-900">脚本</span>
                                    <span class="text-[8px] text-sky-700">ストーリー</span>
                                </div>
                                <div class="rounded-xl p-2 border border-rose-200 bg-rose-50/70">
                                    <img src={ELEMENT_IMAGES.作画} alt="作画" class="w-8 h-8 mx-auto rounded-md object-cover mb-1 shadow-sm" />
                                    <span class="block text-[10px] font-black text-rose-900">作画</span>
                                    <span class="text-[8px] text-rose-700">原画・演出</span>
                                </div>
                                <div class="rounded-xl p-2 border border-emerald-200 bg-emerald-50/70">
                                    <img src={ELEMENT_IMAGES.声優} alt="声優" class="w-8 h-8 mx-auto rounded-md object-cover mb-1 shadow-sm" />
                                    <span class="block text-[10px] font-black text-emerald-900">声優</span>
                                    <span class="text-[8px] text-emerald-700">アフレコ</span>
                                </div>
                                <div class="rounded-xl p-2 border border-violet-200 bg-violet-50/70">
                                    <img src={ELEMENT_IMAGES.音楽} alt="音楽" class="w-8 h-8 mx-auto rounded-md object-cover mb-1 shadow-sm" />
                                    <span class="block text-[10px] font-black text-violet-900">音楽</span>
                                    <span class="text-[8px] text-violet-700">主題歌・BGM</span>
                                </div>
                            </div>
                        </div>

                        {/* 新規ルーム作成 */}
                        <div class="card space-y-3">
                            <h2 class="text-base font-black text-stone-900 flex items-center gap-1.5">
                                <span>📋</span>
                                <span>新しい企画室を立ち上げる</span>
                            </h2>
                            <button
                                onClick={handleCreate}
                                class="btn btn-primary w-full py-3.5 text-base"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19"/>
                                    <line x1="5" y1="12" x2="19" y2="12"/>
                                </svg>
                                <span>新規ルーム作成</span>
                            </button>
                        </div>

                        {/* 既存の部屋に入る */}
                        <div class="card space-y-3">
                            <h2 class="text-base font-black text-stone-900 flex items-center gap-1.5">
                                <span>🚪</span>
                                <span>既存の企画室に入る（2〜8人）</span>
                            </h2>
                            <div class="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="部屋IDを入力"
                                    class="flex-1 p-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-mono tracking-widest text-center text-lg font-bold"
                                    value={tempRoomId()}
                                    onInput={(
                                        e: InputEvent & {
                                            currentTarget: HTMLInputElement;
                                        },
                                    ) =>
                                        setTempRoomId(
                                            e.currentTarget.value.toUpperCase(),
                                        )
                                    }
                                />
                                <button
                                    onClick={handleJoin}
                                    class="btn btn-secondary px-6"
                                >
                                    参加
                                </button>
                            </div>
                        </div>

                        <div class="flex justify-center items-center gap-4 py-2">
                            <button
                                onClick={() => setShowRules(true)}
                                class="text-stone-600 hover:text-stone-900 font-bold text-xs underline underline-offset-4"
                            >
                                制作ルールを見る
                            </button>
                            <span class="text-stone-300">|</span>
                            <button
                                onClick={handleInstallPwa}
                                class="text-stone-600 hover:text-stone-900 font-bold text-xs underline underline-offset-4"
                            >
                                PWAインストール案内
                            </button>
                        </div>
                    </div>
                </Show>

                {/* --- ロビー画面 --- */}
                <Show when={view() === "lobby"}>
                    <div class="space-y-4">
                        {/* ルームID & QRコード */}
                        <div class="card text-center space-y-3 border-amber-300/80 bg-gradient-to-b from-white to-amber-50/30">
                            <div class="flex items-center justify-center gap-2">
                                <span class="text-xs font-black bg-stone-900 text-amber-400 px-2 py-0.5 rounded font-mono">
                                    PRODUCTION ROOM
                                </span>
                                <h2 class="text-xl font-black tracking-widest text-stone-800 font-mono">
                                    Room ID: {store.roomId}
                                </h2>
                            </div>

                            <Show when={qrCodeUrl()}>
                                <div class="bg-white p-2.5 inline-block rounded-2xl shadow-sm border border-stone-200">
                                    <img
                                        src={qrCodeUrl()}
                                        alt="QR Code"
                                        class="w-44 h-44 mx-auto"
                                    />
                                </div>
                                <div class="flex justify-center gap-2">
                                    <button
                                        onClick={copyRoomLink}
                                        class="text-xs font-bold text-stone-600 hover:text-stone-900 bg-white border border-stone-300 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                        </svg>
                                        <span>{copiedRoom() ? "URLをコピーしました！" : "参加URLをコピー"}</span>
                                    </button>
                                </div>
                            </Show>
                        </div>

                        {/* 名前入力 */}
                        <div class="card space-y-2.5">
                            <h3 class="font-black text-sm text-stone-800 flex items-center gap-1.5 border-b border-stone-200 pb-2">
                                <span>✍️</span>
                                <span>クリエイター名（プレイヤー名）</span>
                            </h3>
                            <div class="space-y-1">
                                <input
                                    type="text"
                                    placeholder="名前を入力"
                                    class="w-full p-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-bold"
                                    classList={{
                                        "border-red-500": !!nameError(),
                                    }}
                                    value={tempName()}
                                    onCompositionStart={() => setIsComposing(true)}
                                    onCompositionEnd={(e) => {
                                        setIsComposing(false);
                                        const val = e.currentTarget.value.trim();
                                        const chars = Array.from(val);
                                        if (chars.length > 10) {
                                            setNameError("10文字までです");
                                        } else {
                                            setNameError("");
                                            setNickname(val);
                                            sendWs("join", { name: val, id: store.playerId });
                                        }
                                    }}
                                    onInput={(
                                        e: InputEvent & { currentTarget: HTMLInputElement },
                                    ) => {
                                        const val = e.currentTarget.value;
                                        setTempName(val);
                                        const chars = Array.from(val);
                                        if (chars.length > 10) {
                                            setNameError("10文字までです");
                                        } else {
                                            setNameError("");
                                            if (!isComposing()) {
                                                setNickname(val);
                                                sendWs("join", { name: val, id: store.playerId });
                                            }
                                        }
                                    }}
                                />
                                <Show when={nameError()}>
                                    <p class="text-xs text-red-600 font-bold">
                                        {nameError()}
                                    </p>
                                </Show>
                            </div>
                        </div>

                        {/* スタッフリスト */}
                        <div class="card space-y-2.5">
                            <h3 class="font-black text-sm text-stone-800 flex items-center justify-between border-b border-stone-200 pb-2">
                                <span class="flex items-center gap-1.5">
                                    <span>👥</span>
                                    <span>制作参加スタッフ ({store.gameState?.players.length || 0}/8)</span>
                                </span>
                                <span class="text-[11px] text-stone-400 font-normal">
                                    ホストは並替可能
                                </span>
                            </h3>
                            <ul class="space-y-1.5">
                                <For each={store.gameState?.players}>
                                    {(player, index: () => number) => {
                                        const isHost = () =>
                                            store.gameState?.players.find(
                                                (p: any) => p.id === store.playerId,
                                            )?.isHost;

                                        return (
                                            <li
                                                data-index={index()}
                                                class="flex justify-between items-center p-2.5 bg-stone-50 border border-stone-200 rounded-xl transition-all duration-200 touch-none"
                                                classList={{
                                                    "opacity-40 scale-95 border-2 border-dashed border-amber-400":
                                                        draggingIndex() === index(),
                                                    "border-t-4 border-t-amber-500 pt-3":
                                                        dragOverIndex() === index() &&
                                                        draggingIndex() !== null &&
                                                        draggingIndex()! > index(),
                                                    "border-b-4 border-b-amber-500 pb-3":
                                                        dragOverIndex() === index() &&
                                                        draggingIndex() !== null &&
                                                        draggingIndex()! < index(),
                                                }}
                                                draggable={isHost()}
                                                onDragStart={(e: DragEvent) => onDragStart(e, index())}
                                                onDragOver={(e: DragEvent) => onDragOver(e, index())}
                                                onDrop={(e: DragEvent) => onDrop(e, index())}
                                                onDragEnd={onDragEnd}
                                                onTouchStart={(e: TouchEvent) => onTouchStart(e, index())}
                                                onTouchMove={onTouchMove}
                                                onTouchEnd={onTouchEnd}
                                            >
                                                <div class="flex items-center gap-2">
                                                    <Show when={isHost()}>
                                                        <div class="flex items-center gap-1">
                                                            <div class="text-stone-400 cursor-grab active:cursor-grabbing px-1 hover:text-amber-600">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                                    <circle cx="9" cy="5" r="1"/>
                                                                    <circle cx="9" cy="12" r="1"/>
                                                                    <circle cx="9" cy="19" r="1"/>
                                                                    <circle cx="15" cy="5" r="1"/>
                                                                    <circle cx="15" cy="12" r="1"/>
                                                                    <circle cx="15" cy="19" r="1"/>
                                                                </svg>
                                                            </div>
                                                            <div class="hidden flex-col gap-0.5 sm:flex">
                                                                <button
                                                                    onClick={() => handleReorder(index(), index() - 1)}
                                                                    disabled={index() === 0}
                                                                    class="text-stone-400 hover:text-stone-800 disabled:opacity-20 flex items-center justify-center h-4 w-4 bg-white border border-stone-200 rounded text-[9px]"
                                                                >
                                                                    ▲
                                                                </button>
                                                                <button
                                                                    onClick={() => handleReorder(index(), index() + 1)}
                                                                    disabled={index() === (store.gameState?.players.length || 0) - 1}
                                                                    class="text-stone-400 hover:text-stone-800 disabled:opacity-20 flex items-center justify-center h-4 w-4 bg-white border border-stone-200 rounded text-[9px]"
                                                                >
                                                                    ▼
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </Show>
                                                    <span class="font-bold text-stone-800 text-sm">
                                                        {player.name}{" "}
                                                        {player.id === store.playerId ? "(あなた)" : ""}
                                                    </span>
                                                </div>

                                                <div class="flex items-center gap-2">
                                                    <Show when={isHost() && player.id !== store.playerId}>
                                                        <button
                                                            onClick={() => handleKick(player.id)}
                                                            class="flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                                                            title="スタッフを退出させる"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                                <line x1="18" y1="6" x2="6" y2="18"/>
                                                                <line x1="6" y1="6" x2="18" y2="18"/>
                                                            </svg>
                                                        </button>
                                                    </Show>
                                                    {player.isHost && (
                                                        <span class="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-black uppercase">
                                                            監督 (Host)
                                                        </span>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    }}
                                </For>
                            </ul>
                        </div>

                        {/* ホスト操作ボタン */}
                        <Show
                            when={
                                store.gameState?.players.find(
                                    (p: any) => p.id === store.playerId,
                                )?.isHost
                            }
                        >
                            <div class="flex flex-col gap-2.5 w-full pt-2">
                                <Show when={store.gameState?.isInterrupted}>
                                    <button
                                        onClick={handleResume}
                                        class="btn w-full py-4 text-lg bg-emerald-600 text-white hover:bg-emerald-500 shadow-md border border-emerald-500"
                                    >
                                        🎬 制作再開
                                    </button>
                                </Show>
                                <button
                                    onClick={handleStart}
                                    disabled={(store.gameState?.players.length || 0) < 2}
                                    class="btn btn-primary w-full py-4 text-lg"
                                >
                                    {(store.gameState?.players.length || 0) < 2
                                        ? "2人以上で開始できます"
                                        : store.gameState?.isInterrupted
                                        ? "最初からやり直す"
                                        : "🎬 ゲームスタート"}
                                </button>
                            </div>
                        </Show>

                        <Show
                            when={
                                !store.gameState?.players.find(
                                    (p: any) => p.id === store.playerId,
                                )?.isHost
                            }
                        >
                            <div class="text-center py-4 text-stone-500 font-bold animate-pulse text-xs">
                                監督（ホスト）の制作クランクイン開始を待っています...
                            </div>
                        </Show>
                    </div>
                </Show>

                {/* --- ゲーム画面 --- */}
                <Show when={view() === "game"}>
                    <Show when={store.gameState?.phase === "result"} fallback={<Show when={store.gameState?.phase === "playing"}>
                        <div class="space-y-4">
                            {/* 手番ヘッダー */}
                            <header class="flex items-center justify-between bg-white p-3.5 rounded-2xl shadow-sm border border-stone-200">
                                <div>
                                    <p class="text-[11px] font-bold text-stone-400 uppercase tracking-wider">手番</p>
                                    <p class="text-lg font-black text-slate-800 flex items-center gap-1.5">
                                        <span>{store.gameState?.players[store.gameState.turnIndex]?.name}</span>
                                        <Show when={isMyTurn()}>
                                            <span class="text-xs bg-amber-400 text-stone-900 font-extrabold px-1.5 py-0.5 rounded">
                                                あなた
                                            </span>
                                        </Show>
                                    </p>
                                </div>
                                <button onClick={handleInterrupt} class="btn btn-outline text-xs py-1.5 px-3">
                                    中断
                                </button>
                            </header>

                            {/* 全員共通の場（山札・捨て札） */}
                            <section class="card p-3.5 space-y-2 border-stone-300" aria-label="全員共通の場">
                                <div class="flex items-center justify-between border-b border-stone-200 pb-1.5">
                                    <h2 class="font-black text-xs text-stone-800 flex items-center gap-1">
                                        <span>📦</span>
                                        <span>企画・素材プール (全員共通)</span>
                                    </h2>
                                    <span class="text-[10px] text-stone-400">引く or コインで購入</span>
                                </div>

                                <div class="grid grid-cols-4 items-start gap-2">
                                    {/* 山札 */}
                                    <button
                                        type="button"
                                        onClick={() => handleTakeCard("deck")}
                                        disabled={!canTakeFromDeck()}
                                        aria-label="山札から1枚引く"
                                        class="flex min-w-0 flex-col items-stretch gap-1 text-center disabled:cursor-not-allowed group transition-transform active:scale-95"
                                    >
                                        <span class="flex h-5 items-center justify-center text-[10px] font-extrabold text-stone-700">
                                            企画山札
                                        </span>
                                        <span class="flex aspect-[2/3] w-full flex-col items-center justify-center rounded-xl border-2 border-stone-800 bg-stone-900 text-amber-400 shadow-md p-1 group-hover:border-amber-400 transition-colors">
                                            <span class="text-xl">🎬</span>
                                            <span class="text-[9px] font-black tracking-tight text-white mt-1">ANISAKU</span>
                                            <span class="text-[8px] font-mono text-amber-400">山札</span>
                                        </span>
                                        <span class="flex h-6 items-center justify-center text-[9px] font-bold text-amber-800 bg-amber-100 rounded">
                                            引く（無料）
                                        </span>
                                    </button>

                                    {/* 捨て札 3枠 */}
                                    <For each={visibleDiscards()}>{(entry) => {
                                        const card = () => entry?.card;
                                        const elementStyle = () => card() ? CARD_ELEMENT_STYLES[card()!.element] : null;
                                        const isPurchasable = () => entry && canBuyDiscard(entry.playerId);

                                        return (
                                            <button
                                                type="button"
                                                onClick={() => entry && handleTakeCard("discard", entry.card.id)}
                                                disabled={!entry || !canBuyDiscard(entry.playerId)}
                                                aria-label={entry ? `${entry.card.name}を1コインで購入` : "捨て札なし"}
                                                title={entry ? `放出者: ${store.gameState?.players.find((player) => player.id === entry.playerId)?.name ?? "不明"}` : "捨て札なし"}
                                                class="flex min-w-0 flex-col items-stretch gap-1 text-center disabled:cursor-not-allowed transition-transform active:scale-95"
                                            >
                                                <span class="flex h-5 items-center justify-center text-[10px] font-extrabold text-stone-700">
                                                    放出素材
                                                </span>
                                                <Show when={card()} fallback={
                                                    <span class="flex aspect-[2/3] w-full items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50 text-[10px] text-stone-400">
                                                        空枠
                                                    </span>
                                                }>
                                                    {(visibleCard) => (
                                                        <span class={`flex aspect-[2/3] w-full flex-col overflow-hidden rounded-xl border-2 p-0.5 text-left shadow-sm ${elementStyle()?.color} ${isPurchasable() ? "ring-2 ring-amber-400" : ""}`}>
                                                            {renderCardFace(visibleCard())}
                                                        </span>
                                                    )}
                                                </Show>
                                                <span class={`flex h-6 items-center justify-center text-[9px] font-bold rounded ${
                                                    isPurchasable()
                                                        ? "bg-amber-500 text-stone-950 font-black shadow-sm"
                                                        : "text-stone-400 bg-stone-100"
                                                }`}>
                                                    1コイン購入
                                                </span>
                                            </button>
                                        );
                                    }}</For>
                                </div>
                            </section>

                            {/* あなたの手札 */}
                            <section class="card p-3.5 space-y-2.5 border-stone-300 bg-white" aria-label="あなたの手札">
                                <div class="sr-only" aria-live="polite">手札は{store.gameState?.players.find((player) => player.id === store.playerId)?.hand?.length ?? 0}枚です</div>
                                <div class="flex items-center justify-between border-b border-stone-200 pb-2">
                                    <div class="flex items-center gap-2">
                                        <h2 class="font-black text-stone-900 text-sm flex items-center gap-1">
                                            <span>🎴</span>
                                            <span>手持ち素材 (あなたの手札)</span>
                                        </h2>
                                        <span class="text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                                            🪙 {store.gameState?.players.find((player) => player.id === store.playerId)?.coins ?? 0} コイン
                                        </span>
                                    </div>
                                    <span class="text-xs font-bold text-stone-500">
                                        {store.gameState?.players.find((player) => player.id === store.playerId)?.hand?.length ?? 0} 枚
                                    </span>
                                </div>

                                <div class="grid w-full grid-cols-5 items-start gap-1 sm:gap-1.5">
                                    <For each={store.gameState?.players.find((player) => player.id === store.playerId)?.hand ?? []}>
                                        {(card, index) => {
                                            const selected = () => selectedIndices().includes(index());
                                            const duplicateElement = () => selectedIndices().some((selectedIndex) => selectedIndex !== index() && store.gameState?.players.find((player) => player.id === store.playerId)?.hand[selectedIndex]?.element === card.element);
                                            const elementStyle = CARD_ELEMENT_STYLES[card.element];

                                            return (
                                                <article class={`relative aspect-[2/3] w-full min-w-0 overflow-hidden rounded-xl border-2 p-0.5 shadow-sm transition-all ${
                                                    selected()
                                                        ? "border-amber-500 ring-2 ring-amber-400 -translate-y-1 shadow-md bg-amber-50"
                                                        : elementStyle.color
                                                }`}>
                                                    <Show when={isMyTurn() && store.gameState?.turnStep === "resolve"} fallback={
                                                        <div class="h-full w-full">
                                                            {renderCardFace(card)}
                                                        </div>
                                                    }>
                                                        <button
                                                            onClick={() => toggleWorkCard(index())}
                                                            disabled={duplicateElement() || (!selected() && selectedIndices().length >= 4)}
                                                            aria-pressed={selected()}
                                                            class="h-full w-full disabled:opacity-40 text-left block"
                                                        >
                                                            {renderCardFace(card)}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDiscard(index())}
                                                            class="absolute inset-x-1 bottom-1 rounded bg-stone-900/90 hover:bg-red-600 text-white px-0.5 py-1 text-[9px] font-black leading-tight shadow-sm transition-colors text-center"
                                                        >
                                                            捨てる
                                                        </button>
                                                    </Show>
                                                </article>
                                            );
                                        }}
                                    </For>
                                </div>
                            </section>

                            {/* 作品公開コントロール（4枚揃ったときの作品タイトル＆公開） */}
                            <Show when={isMyTurn() && store.gameState?.turnStep === "resolve"}>
                                <section class="card p-4 space-y-3 border-amber-400 bg-amber-50/50">
                                    <div class="flex items-center justify-between">
                                        <h3 class="text-xs font-black text-amber-950 flex items-center gap-1">
                                            <span>✨</span>
                                            <span>4枚揃えてアニメを公開</span>
                                        </h3>
                                        <Show when={previewWorkScore()}>
                                            {(score) => (
                                                <p class="text-xs font-black text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full" aria-live="polite">
                                                    予想スコア: {score().total} 点 (基本1点 + ボーナス{score().bonus}点)
                                                </p>
                                            )}
                                        </Show>
                                    </div>
                                    <div class="flex flex-col gap-2 sm:flex-row">
                                        <input
                                            value={workTitle()}
                                            onInput={(event) => setWorkTitle(event.currentTarget.value)}
                                            maxLength={24}
                                            placeholder="作品タイトル（例: 『星屑のシンフォニア』）"
                                            class="min-w-0 flex-1 rounded-xl border border-stone-300 p-2.5 text-sm font-bold bg-white"
                                        />
                                        <button
                                            onClick={handlePublish}
                                            disabled={!canPublish()}
                                            class="btn btn-primary whitespace-nowrap"
                                        >
                                            🎬 4枚を公開
                                        </button>
                                    </div>
                                </section>
                            </Show>

                            <Show when={!isMyTurn()}>
                                <div class="rounded-xl bg-stone-100 p-4 text-center font-bold text-stone-600 text-xs border border-stone-200">
                                    相手の手番です。作品の公開を待っています。
                                </div>
                            </Show>

                            {/* 参加者の公開作品と資金 */}
                            <section class="space-y-2.5">
                                <h2 class="font-black text-stone-800 text-xs flex items-center gap-1">
                                    <span>📺</span>
                                    <span>参加スタジオの公開作品と資金</span>
                                </h2>
                                <For each={store.gameState?.players ?? []}>{(player) => (
                                    <article class="rounded-xl border border-stone-200 bg-white p-3.5 shadow-sm space-y-2">
                                        <div class="flex items-center justify-between">
                                            <h3 class="font-bold text-sm text-stone-800">
                                                {player.name}{player.id === store.playerId ? "（あなた）" : ""}
                                            </h3>
                                            <span class="text-xs font-black text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                                                🪙 {player.coins} コイン
                                            </span>
                                        </div>
                                        <p class="text-[11px] text-stone-400">
                                            公開作品: {player.works?.length ?? 0} / 2 本
                                        </p>
                                        <For each={player.works ?? []}>{(work) => (
                                            <article class="rounded-lg bg-stone-50 border border-stone-200 p-2.5 text-xs space-y-1">
                                                <div class="flex items-center justify-between">
                                                    <p class="font-black text-stone-900">
                                                        『{work.title}』
                                                    </p>
                                                    <strong class="text-emerald-700 font-black bg-emerald-100 px-1.5 py-0.5 rounded text-[11px]">
                                                        {work.score} 点
                                                    </strong>
                                                </div>
                                                <p class="text-[10px] text-stone-600">
                                                    {renderWorkComposition(work)}
                                                </p>
                                            </article>
                                        )}</For>
                                    </article>
                                )}</For>
                            </section>
                        </div>
                    </Show>}>
                        {/* 最終結果・表彰式 */}
                        <section class="space-y-5 rounded-2xl border border-amber-300 bg-gradient-to-b from-white to-amber-50/40 p-5 shadow-md text-stone-900">
                            <div class="text-center space-y-1">
                                <span class="text-2xl">🏆</span>
                                <p class="text-xs font-black uppercase tracking-wider text-amber-700">
                                    日本アニメグランプリ・最終結果
                                </p>
                                <h2 class="text-2xl font-black text-stone-900">
                                    {store.gameState?.winner} の勝利！
                                </h2>
                                <p class="text-xs text-stone-500">
                                    ベストアニメ投票賞を反映しました
                                </p>
                            </div>

                            <ul class="space-y-2.5">
                                <For each={[...(store.gameState?.players ?? [])].sort((a, b) => b.score - a.score)}>{(player) => {
                                    const ranking = (store.gameState?.players ?? [])
                                        .filter((candidate) => candidate.score > player.score).length + 1;
                                    const workPoints = player.works?.reduce((total, work) => total + work.score, 0) ?? 0;
                                    const awardPoints = player.works?.reduce((total, work) => total + (work.bestAnimeBonus ?? 0), 0) ?? 0;
                                    return (
                                        <li class="rounded-xl bg-white border border-stone-200 p-3.5 shadow-sm space-y-2">
                                            <div class="flex items-center justify-between gap-2">
                                                <span class="font-black text-sm flex items-center gap-1.5">
                                                    <span class="text-base">{ranking === 1 ? "🥇" : ranking === 2 ? "🥈" : ranking === 3 ? "🥉" : "🎖️"}</span>
                                                    <span>{ranking}位. {player.name}</span>
                                                </span>
                                                <div class="text-right">
                                                    <strong class="text-lg font-black text-amber-700">{player.score}点</strong>
                                                    <span class="block text-[10px] text-stone-400">
                                                        作品{workPoints} + 資金{player.coins} + 賞{awardPoints}
                                                    </span>
                                                </div>
                                            </div>
                                            <For each={player.works ?? []}>{(work) => (
                                                <article class="border-t border-stone-100 pt-1.5 text-xs">
                                                    <div class="flex items-center justify-between">
                                                        <span class="font-bold text-stone-800">『{work.title}』</span>
                                                        <span class="text-emerald-700 font-bold">{work.score}点</span>
                                                    </div>
                                                    <p class="text-[10px] text-stone-500 mt-0.5">{renderWorkComposition(work)}</p>
                                                    <p class="text-[10px] text-stone-400">
                                                        投票 {work.voteCount ?? 0}票
                                                        {(work.bestAnimeBonus ?? 0) > 0 ? ` ・ベストアニメ賞 +${work.bestAnimeBonus}点` : ""}
                                                    </p>
                                                </article>
                                            )}</For>
                                        </li>
                                    );
                                }}</For>
                            </ul>

                            <div class="grid grid-cols-2 gap-3 pt-2">
                                <button onClick={handleReset} class="btn btn-secondary">
                                    トップに戻る
                                </button>
                                <button onClick={handleInterrupt} class="btn btn-primary">
                                    ロビーに戻る
                                </button>
                            </div>
                        </section>
                    </Show>

                    {/* ベストアニメ投票 */}
                    <Show when={store.gameState?.phase === "voting"}>
                        <section class="card space-y-4 border-amber-300">
                            <header class="text-center space-y-1">
                                <span class="text-xl">🗳️</span>
                                <p class="text-xs font-black text-amber-700 uppercase tracking-wide">
                                    ベストアニメ投票
                                </p>
                                <h2 class="text-lg font-black text-stone-900">
                                    一番観たいアニメ作品を選んでください
                                </h2>
                                <p class="text-xs text-stone-500">
                                    自分以外の制作作品に1票投票できます（最多得票に+3点）
                                </p>
                            </header>

                            <Show when={availableWorks().length > 0} fallback={
                                <p class="rounded-xl bg-stone-100 p-4 text-center text-xs text-stone-500">
                                    投票できる他プレイヤーの作品がないため、自動集計に進みます。
                                </p>
                            }>
                                <div class="space-y-2.5">
                                    <For each={availableWorks()}>{({ player, work, workIndex }) => (
                                        <article class="rounded-xl border border-stone-200 bg-stone-50 p-3.5 space-y-1.5 shadow-sm">
                                            <div class="flex items-center justify-between text-xs">
                                                <span class="font-bold text-stone-500">{player.name} の作品</span>
                                                <span class="font-black text-emerald-700">{work.score} 点</span>
                                            </div>
                                            <h3 class="font-black text-stone-900 text-sm">『{work.title}』</h3>
                                            <p class="text-[11px] text-stone-600">{renderWorkComposition(work)}</p>
                                            <button
                                                onClick={() => sendWs("vote", { playerId: player.id, workIndex })}
                                                disabled={hasVoted()}
                                                class="btn btn-primary mt-2 w-full text-xs py-2 disabled:pointer-events-none"
                                            >
                                                {hasVoted() ? "投票完了" : "この作品に投票する"}
                                            </button>
                                        </article>
                                    )}</For>
                                </div>
                            </Show>

                            <Show when={hasVoted()}>
                                <p class="text-center text-xs font-bold text-emerald-700" aria-live="polite">
                                    投票を受け付けました。全クリエイターの投票完了を待っています…
                                </p>
                            </Show>
                        </section>
                    </Show>

                    {/* 集計中 */}
                    <Show when={store.gameState?.phase === "counting"}>
                        <section class="py-16 text-center space-y-3 card border-amber-300" aria-live="polite">
                            <span class="text-3xl animate-bounce inline-block">🏆</span>
                            <p class="text-xs font-bold text-amber-700">ベストアニメ投票</p>
                            <h2 class="animate-pulse text-xl font-black text-stone-900">
                                投票を集計中…
                            </h2>
                        </section>
                    </Show>
                </Show>
            </main>

            {/* ルールモーダル */}
            <Show when={showRules()}>
                <div class="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div class="bg-white max-w-sm w-full p-6 rounded-2xl shadow-2xl relative border border-stone-200">
                        <button
                            onClick={() => setShowRules(false)}
                            class="absolute top-4 right-4 text-stone-400 hover:text-stone-700 font-bold"
                        >
                            ✕
                        </button>
                        <div class="flex items-center gap-2 mb-3">
                            <span class="text-xl">📖</span>
                            <h2 class="text-lg font-black text-stone-900">
                                『アニ作』制作ルール
                            </h2>
                        </div>
                        <div class="max-h-[60vh] space-y-3 overflow-y-auto text-xs text-stone-600 leading-relaxed pr-1">
                            <div class="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                                <h3 class="font-black text-stone-800 mb-1">1. ゲーム概要</h3>
                                <p>2〜8人で遊びます。各プレイヤーは初期資金3コインと手札4枚で開始します。</p>
                            </div>
                            <div class="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                                <h3 class="font-black text-stone-800 mb-1">2. 制作手番の流れ</h3>
                                <p>手番では「山札から1枚引く（無料）」か、「他の人が直前に捨てた素材を1コインで購入」します。購入代金は捨てたプレイヤーに渡ります。</p>
                            </div>
                            <div class="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                                <h3 class="font-black text-stone-800 mb-1">3. 作品の公開</h3>
                                <p>「脚本」「作画」「声優」「音楽」の4要素が1枚ずつ揃ったらアニメ作品として公開できます。作品の基本点は1点で、揃った属性タグに応じてボーナス（同タグ2枚で+2点、3枚で+4点、4枚で+6点）が加算されます。</p>
                            </div>
                            <div class="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                                <h3 class="font-black text-stone-800 mb-1">4. 勝利条件とベストアニメ賞</h3>
                                <p>誰かが2作品目を公開すると投票フェーズへ進み、自分以外の作品に1票投票します。最多得票作品には「ベストアニメ賞 +3点」が加算され、作品点＋残り資金（1コイン1点）＋投票賞の合計点で覇権スタジオを決定します！</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowRules(false)}
                            class="btn btn-primary w-full mt-4"
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            </Show>
        </div>
    );
}

export default App;
