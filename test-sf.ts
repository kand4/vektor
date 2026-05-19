import { chromium } from "playwright-chromium";

(async () => {
    const browser = await chromium.launch({ args: ['--use-gl=egl'] }); // enable WebGL
    const page = await browser.newPage();
    
    page.on('console', msg => {
        console.log('LOG:', msg.text());
        if (msg.text().includes('SKETCHFAB_METHODS:')) {
            console.log(msg.text().substring(0, 10000));
        }
    });

    try {
        await page.goto("http://localhost:3000", { timeout: 10000 });
        
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const b = btns.find(b => b.textContent?.includes('Adult') || b.textContent?.includes('ADULT') || b.textContent?.includes('Nyamuk'));
            if (b) b.click();
        });
        await page.waitForTimeout(1000);
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const b = btns.find(b => b.textContent?.includes('3D') || b.textContent?.includes('Scanner'));
            if (b) b.click();
        });
        await page.waitForTimeout(15000);

        try {
            const keys = await page.evaluate(() => Object.keys((window as any).fooApi).join(', '));
            console.log('API_METHODS:', keys);
        } catch {
            console.log("No fooApi found");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
