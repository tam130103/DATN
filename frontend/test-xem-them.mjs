import { chromium } from 'playwright';
import fs from 'fs';

async function verifyFeed() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  // Login
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', 'testuser1@example.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);

  await page.waitForTimeout(3000); // Wait for feed to load

  const posts = await page.$$eval('article', articles => {
    return articles.map(article => {
      const textObj = article.querySelector('.whitespace-pre-wrap');
      const text = textObj ? textObj.textContent : '';
      const button = article.querySelector('button');
      const allButtons = Array.from(article.querySelectorAll('button')).map(b => b.textContent);
      const hasXemThem = allButtons.includes('Xem thêm');
      const hasAnBot = allButtons.includes('Ẩn bớt');
      const textDivStyles = textObj ? window.getComputedStyle(textObj).maxHeight : null;
      return {
        textLength: text ? text.length : 0,
        textSample: text ? text.substring(0, 50) : '',
        hasXemThem,
        hasAnBot,
        allButtons,
        maxHeight: textDivStyles
      };
    });
  });

  fs.writeFileSync('feed-debug.json', JSON.stringify(posts, null, 2));
  await browser.close();
}

verifyFeed().catch(console.error);
