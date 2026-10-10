import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import { VitePWA } from "vite-plugin-pwa";

// Vite（ビート）の設定ファイルです。開発サーバーの起動方法やビルドの仕方を決めます。
export default defineConfig({
    plugins: [
        solidPlugin(), // SolidJS を使うためのプラグイン
        // Progressive Web App (PWA) にするためのプラグイン設定
        VitePWA({
            registerType: "autoUpdate", // アプリが更新されたら自動で反映する
            injectRegister: "auto", // HTMLにサービスワーカー登録スクリプトを自動挿入
            workbox: {
                cleanupOutdatedCaches: true, // 古いキャッシュを削除
            },
            devOptions: {
                enabled: true, // 開発中も PWA として動かせるようにする
            },
            manifest: {
                name: "アニ作",
                short_name: "アニ作",
                description: "脚本・作画・声優・音楽を集めて作品を公開するカードゲーム",
                theme_color: "#f8f3e9",
                background_color: "#f8f3e9",
                display: "standalone",
                start_url: "/",
                icons: [
                    // アプリのアイコン設定
                    {
                        src: "/icon-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                        purpose: "any",
                    },
                    {
                        src: "/icon-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any",
                    },
                    {
                        src: "/icon-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable",
                    },
                ],
            },
        }),
    ],
    server: {
        port: 3000,
        host: "0.0.0.0",
        allowedHosts: true,
    },
    build: {
        target: "esnext", // 最新のJavaScript形式で書き出す
    },
    test: {
        environment: "jsdom",
        globals: true,
        include: ["src/**/*.test.ts"],
        exclude: ["node_modules/**", "tests/**"],
        setupFiles: ["./src/websocket.test.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            exclude: ["node_modules/", "src/types/"],
        },
    },
});
