import type { Card } from "./types";

export interface CardThemeData {
    motif: string;
    themeBadge: string;
    sublabel: string;
    bgGradient: string;
    accentColor: string;
    glowBorder: string;
    illustrationStyle: string;
}

export const ELEMENT_IMAGES: Record<Card["element"], string> = {
    脚本: "/src/assets/images/element_script_1791625783494.jpg",
    作画: "/src/assets/images/element_animation_1791625795146.jpg",
    声優: "/src/assets/images/element_voice_1791625816762.jpg",
    音楽: "/src/assets/images/element_music_1791625827015.jpg",
};

export const ELEMENT_META: Record<
    Card["element"],
    {
        en: string;
        mark: string;
        color: string;
        border: string;
        bg: string;
        text: string;
        badgeBg: string;
    }
> = {
    脚本: {
        en: "SCENARIO",
        mark: "文",
        color: "text-sky-600",
        border: "border-sky-500",
        bg: "bg-sky-50",
        text: "text-sky-900",
        badgeBg: "bg-sky-600 text-white",
    },
    作画: {
        en: "KEY ANIMATION",
        mark: "絵",
        color: "text-rose-600",
        border: "border-rose-500",
        bg: "bg-rose-50",
        text: "text-rose-900",
        badgeBg: "bg-rose-600 text-white",
    },
    声優: {
        en: "VOICE CAST",
        mark: "声",
        color: "text-emerald-600",
        border: "border-emerald-500",
        bg: "bg-emerald-50",
        text: "text-emerald-900",
        badgeBg: "bg-emerald-600 text-white",
    },
    音楽: {
        en: "SOUNDTRACK",
        mark: "音",
        color: "text-violet-600",
        border: "border-violet-500",
        bg: "bg-violet-50",
        text: "text-violet-900",
        badgeBg: "bg-violet-600 text-white",
    },
};

export const TAG_STYLES: Record<string, { icon: string; bg: string; text: string; border: string }> = {
    熱血: { icon: "🔥", bg: "bg-amber-100", text: "text-amber-900", border: "border-amber-400" },
    ギャグ: { icon: "😂", bg: "bg-yellow-100", text: "text-yellow-900", border: "border-yellow-400" },
    可愛い: { icon: "💖", bg: "bg-pink-100", text: "text-pink-900", border: "border-pink-300" },
    感動: { icon: "💧", bg: "bg-blue-100", text: "text-blue-900", border: "border-blue-300" },
};

/**
 * Returns tailored thematic styling based on the card's specific title & tags.
 */
export function getCardTheme(card: Card): CardThemeData {
    const name = card.name;

    if (name.includes("熱血") || name.includes("迫力") || name.includes("激ロック")) {
        return {
            motif: "🔥⚔️",
            themeBadge: "バトル激闘",
            sublabel: card.element === "脚本" ? "王道バトルシナリオ" : card.element === "作画" ? "激突・爆発エフェクト" : card.element === "声優" ? "叫びの気迫シャウト" : "爆音ディストーション",
            bgGradient: "from-amber-500/15 via-orange-500/10 to-red-500/15",
            accentColor: "text-amber-700",
            glowBorder: "border-amber-500",
            illustrationStyle: "bg-gradient-to-br from-amber-100 to-orange-200 text-amber-900",
        };
    }

    if (name.includes("ギャグ") || name.includes("顔芸") || name.includes("キレツッコミ") || name.includes("陽気")) {
        return {
            motif: "😂⚡",
            themeBadge: "ハイテンション",
            sublabel: card.element === "脚本" ? "爆笑ドタバタ劇本" : card.element === "作画" ? "崩壊・変顔作画" : card.element === "声優" ? "電光石火ツッコミ" : "ご機嫌アッパーチューン",
            bgGradient: "from-yellow-400/20 via-amber-300/10 to-yellow-500/15",
            accentColor: "text-yellow-800",
            glowBorder: "border-yellow-500",
            illustrationStyle: "bg-gradient-to-br from-yellow-100 to-amber-200 text-yellow-900",
        };
    }

    if (name.includes("日常") || name.includes("ほのぼの") || name.includes("キラキラ") || name.includes("キュート") || name.includes("パステル")) {
        return {
            motif: "✨💖",
            themeBadge: "日常きらめき",
            sublabel: card.element === "脚本" ? "心あたたまる日常録" : card.element === "作画" ? "華やぐ少女フィルター" : card.element === "声優" ? "癒やしの甘声ボイス" : "ポップで軽快な旋律",
            bgGradient: "from-pink-400/15 via-rose-300/10 to-pink-500/15",
            accentColor: "text-pink-700",
            glowBorder: "border-pink-400",
            illustrationStyle: "bg-gradient-to-br from-pink-100 to-rose-200 text-pink-900",
        };
    }

    if (name.includes("青春") || name.includes("ドラマ") || name.includes("美しい夕景") || name.includes("情感") || name.includes("切ないピアノ")) {
        return {
            motif: "🌅💧",
            themeBadge: "青春叙情詩",
            sublabel: card.element === "脚本" ? "葛藤と成長の物語" : card.element === "作画" ? "夕陽と情緒の光彩" : card.element === "声優" ? "胸迫る繊細な演技" : "涙を誘う名旋律",
            bgGradient: "from-sky-400/15 via-indigo-300/10 to-blue-500/15",
            accentColor: "text-sky-800",
            glowBorder: "border-sky-500",
            illustrationStyle: "bg-gradient-to-br from-sky-100 to-indigo-200 text-sky-900",
        };
    }

    if (name.includes("超能力") || name.includes("勢いノリ") || name.includes("軽快")) {
        return {
            motif: "🔮⚡",
            themeBadge: "異能ギャグ",
            sublabel: card.element === "脚本" ? "ハチャメチャ異能劇" : card.element === "作画" ? "超能力コミック作画" : card.element === "声優" ? "テンポ抜群アフレコ" : "軽快シンセビート",
            bgGradient: "from-purple-400/15 via-amber-300/10 to-indigo-500/15",
            accentColor: "text-purple-800",
            glowBorder: "border-purple-400",
            illustrationStyle: "bg-gradient-to-br from-purple-100 to-amber-100 text-purple-900",
        };
    }

    if (name.includes("変身ヒロイン") || name.includes("可憐") || name.includes("カッコ可愛い")) {
        return {
            motif: "🎀🪄",
            themeBadge: "魔法ヒロイン",
            sublabel: card.element === "脚本" ? "少女覚醒ストーリー" : card.element === "作画" ? "華麗な変身バンク" : card.element === "声優" ? "凛々しく可憐な名演" : "疾走キュートロック",
            bgGradient: "from-rose-400/20 via-pink-300/10 to-fuchsia-500/15",
            accentColor: "text-rose-700",
            glowBorder: "border-rose-400",
            illustrationStyle: "bg-gradient-to-br from-rose-100 to-pink-200 text-rose-900",
        };
    }

    if (name.includes("絆のライバル") || name.includes("魂の劇画") || name.includes("感情爆発") || name.includes("壮大オーケストラ")) {
        return {
            motif: "🤜💥🤛",
            themeBadge: "宿命の対決",
            sublabel: card.element === "脚本" ? "男たちの魂の誓い" : card.element === "作画" ? "重厚な影と筆致" : card.element === "声優" ? "全身全霊の咆哮" : "重厚ブラス＆ストリングス",
            bgGradient: "from-red-500/20 via-orange-400/10 to-amber-500/20",
            accentColor: "text-red-800",
            glowBorder: "border-red-600",
            illustrationStyle: "bg-gradient-to-br from-red-100 to-amber-200 text-red-900",
        };
    }

    if (name.includes("異世界グルメ") || name.includes("飯テロ") || name.includes("脱力") || name.includes("ピコピコ")) {
        return {
            motif: "🍖🍲",
            themeBadge: "飯テロ探訪",
            sublabel: card.element === "脚本" ? "魔物料理の珍道中" : card.element === "作画" ? "湯気立つ超絶料理作画" : card.element === "声優" ? "ほっこり脱力ボイス" : "レトロ8bitサウンド",
            bgGradient: "from-amber-400/20 via-yellow-300/15 to-orange-400/15",
            accentColor: "text-amber-800",
            glowBorder: "border-amber-500",
            illustrationStyle: "bg-gradient-to-br from-amber-100 to-yellow-200 text-amber-900",
        };
    }

    if (name.includes("人情") || name.includes("手描き") || name.includes("味わい") || name.includes("アコギ")) {
        return {
            motif: "🏮🍂",
            themeBadge: "人情ドラマ",
            sublabel: card.element === "脚本" ? "下町の温かな物語" : card.element === "作画" ? "温もりある鉛筆タッチ" : card.element === "声優" ? "滋味あふれる名演" : "素朴なアコースティック",
            bgGradient: "from-amber-600/15 via-orange-300/10 to-yellow-600/15",
            accentColor: "text-amber-900",
            glowBorder: "border-amber-700",
            illustrationStyle: "bg-gradient-to-br from-orange-100 to-amber-200 text-amber-900",
        };
    }

    if (name.includes("モフモフ") || name.includes("癒やし") || name.includes("子守唄")) {
        return {
            motif: "🐾🏕️",
            themeBadge: "癒やし冒険",
            sublabel: card.element === "脚本" ? "もふもふ旅日記" : card.element === "作画" ? "柔らかい毛並み作画" : card.element === "声優" ? "極上のウィスパー声" : "安らぎのハープ旋律",
            bgGradient: "from-emerald-400/15 via-teal-300/10 to-green-500/15",
            accentColor: "text-emerald-800",
            glowBorder: "border-emerald-400",
            illustrationStyle: "bg-gradient-to-br from-emerald-100 to-teal-200 text-emerald-900",
        };
    }

    if (name.includes("探偵") || name.includes("ミステリー") || name.includes("クール陰影") || name.includes("イケメン") || name.includes("ジャズ")) {
        return {
            motif: "🕵️‍♂️🎷",
            themeBadge: "ノワール推理",
            sublabel: card.element === "脚本" ? "事件の裏に潜む罠" : card.element === "作画" ? "ハイコントラスト陰影" : card.element === "声優" ? "色気ある低音ボイス" : "煙る夜のサックスジャズ",
            bgGradient: "from-slate-600/20 via-indigo-900/15 to-slate-800/20",
            accentColor: "text-slate-800",
            glowBorder: "border-slate-600",
            illustrationStyle: "bg-gradient-to-br from-slate-200 to-indigo-200 text-slate-900",
        };
    }

    if (name.includes("ロボット") || name.includes("SF") || name.includes("精密") || name.includes("重厚")) {
        return {
            motif: "🤖🚀",
            themeBadge: "SFメカニクス",
            sublabel: card.element === "脚本" ? "銀河を駆けるハードSF" : card.element === "作画" ? "超精密メカ・板野サーカス" : card.element === "声優" ? "百戦錬磨のベテラン声" : "重厚ブラス組曲",
            bgGradient: "from-cyan-500/20 via-blue-500/15 to-indigo-600/20",
            accentColor: "text-cyan-900",
            glowBorder: "border-cyan-600",
            illustrationStyle: "bg-gradient-to-br from-cyan-100 to-blue-200 text-cyan-900",
        };
    }

    if (name.includes("スポーツ") || name.includes("汗と土埃") || name.includes("気合い") || name.includes("ブラス")) {
        return {
            motif: "⚽🎺",
            themeBadge: "白球青春",
            sublabel: card.element === "脚本" ? "汗と涙の甲子園" : card.element === "作画" ? "躍動するダイナミック作画" : card.element === "声優" ? "グラウンドを轟かす咆哮" : "魂の応援ブラスバンド",
            bgGradient: "from-lime-500/20 via-amber-400/15 to-emerald-500/20",
            accentColor: "text-lime-900",
            glowBorder: "border-lime-600",
            illustrationStyle: "bg-gradient-to-br from-lime-100 to-amber-200 text-lime-900",
        };
    }

    // Default / Standard
    return {
        motif: "🎬🎨",
        themeBadge: "スタジオ素材",
        sublabel: card.element === "脚本" ? "決定稿シナリオ" : card.element === "作画" ? "タイムシート＆原画" : card.element === "声優" ? "アフレコ収録カット" : "劇伴マスター音源",
        bgGradient: "from-slate-400/10 via-slate-300/10 to-slate-500/10",
        accentColor: "text-slate-800",
        glowBorder: "border-slate-400",
        illustrationStyle: "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-800",
    };
}
