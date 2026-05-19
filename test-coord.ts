import { chromium } from "playwright-chromium";

(async () => {
    const browser = await chromium.launch({ args: ['--use-gl=egl'] }); // enable WebGL
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('LOG:', msg.text()));

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
        await page.waitForTimeout(10000);

        try {
            const result = await page.evaluate(async () => {
                const api = (window as any).fooApi;
                if (!api) return "NO API";
                return new Promise((resolve) => {
                    if (api.getWorldToScreenCoordinates) {
                        api.getWorldToScreenCoordinates([-0.25, -0.25, -0.25], function(err: any, coord: any) {
                            resolve(err ? `Err: ${err}` : coord);
                        });
                    } else {
                        resolve("NO getWorldToScreenCoordinates");
                    }
                });
            });
            console.log("RESULT:", result);
        } catch(e) {
            console.log("Error evaluating", e);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
