import { test, expect } from "@playwright/test";

test.beforeEach(async ({ context }) => {
    // 全てのページに「テスト環境である」ことを示すフラグを注入する
    await context.addInitScript(() => {
        (window as any).__IS_PLAYWRIGHT__ = true;
    });
});

test("完全なゲームフローの検証", async ({ browser }) => {
    // 1. ホスト用のコンテキストとページを作成
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    await hostPage.goto("/?test=true");

    await hostPage.click('button:has-text("新規ルーム作成")');

    // ロビーに遷移したら名前を入力
    await hostPage.fill('input[placeholder="名前を入力"]', "HostUser");

    // ルームIDを取得
    await expect(hostPage).toHaveURL(/room=\d{6}/);
    const url = hostPage.url();
    const roomId = new URL(url).searchParams.get("room");

    // 2. プレイヤー2用の別コンテキストとページを作成
    const player2Context = await browser.newContext();
    const player2Page = await player2Context.newPage();
    await player2Page.goto(`/?room=${roomId}&test=true`);

    // 「名前を入力」フィールドが出るまで待機
    const nicknameInput2 = player2Page.locator(
        'input[placeholder="名前を入力"]'
    );
    await expect(nicknameInput2).toBeVisible({ timeout: 10000 });
    await nicknameInput2.fill("Player2");

    // 3. ゲーム開始（ホスト操作）
    // ホストの画面で、Player2がリストに表示されるのを待つ
    await expect(hostPage.locator("text=Player2")).toBeVisible({
        timeout: 10000,
    });
    await expect(hostPage.locator("text=HostUser")).toBeVisible();
    await hostPage.click('button:has-text("ゲームスタート")');

    // 4. ゲーム進行の確認
    await expect(hostPage.locator("text=手番")).toBeVisible();

    // 5. ターンの進捗を確認
    const turnInfo = hostPage.locator("p.text-lg.font-black.text-slate-800");
    await expect(turnInfo).toBeVisible();

    // ランダムに選ばれた先手の画面でカードを引いて捨てる
    const activePlayer = (await hostPage.locator("main header p.text-lg").textContent())?.trim();
    const activePage = activePlayer === "HostUser" ? hostPage : player2Page;
    const waitingPage = activePlayer === "HostUser" ? player2Page : hostPage;
    await activePage.getByRole("button", { name: "山札から1枚引く" }).click();
    await activePage.getByRole("button", { name: "捨てる" }).first().click();

    // ターンが変わったことを確認
    await expect(waitingPage.locator("text=相手の手番です。作品の公開を待っています。" )).toBeVisible({
        timeout: 10000,
    });

    // 6. ロビーに戻る（中断）
    await hostPage.click('button:has-text("中断")');
    await expect(hostPage.locator("text=Room ID:")).toBeVisible();

    // クリーンアップ
    await hostContext.close();
    await player2Context.close();
});
