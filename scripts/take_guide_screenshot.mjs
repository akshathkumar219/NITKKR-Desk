import { chromium } from 'playwright'

async function run() {
  const browser = await chromium.launch()
  
  // 1. Mobile Screenshot (iPhone 14 / 390x844)
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await mobilePage.goto('http://localhost:5173/guide', { waitUntil: 'networkidle' })
  await mobilePage.evaluate(() => {
    localStorage.setItem('kkr.welcomed', 'true')
    localStorage.setItem('kkr.theme', '"dark"')
    sessionStorage.setItem('kkr.intro.plays', '99')
    document.documentElement.classList.add('dark')
  })
  await mobilePage.goto('http://localhost:5173/guide', { waitUntil: 'networkidle' })
  await mobilePage.waitForTimeout(500)
  await mobilePage.screenshot({ path: '/Users/akshathkumar/.gemini/antigravity/brain/cc63893d-7ec5-4eae-9f96-174ddc717758/mobile_card1.png' })

  // Click next to screenshot card 2
  const nextBtn = await mobilePage.$('button:has-text("NEXT")')
  if (nextBtn) {
    await nextBtn.click()
    await mobilePage.waitForTimeout(350)
    await mobilePage.screenshot({ path: '/Users/akshathkumar/.gemini/antigravity/brain/cc63893d-7ec5-4eae-9f96-174ddc717758/mobile_card2.png' })
  }

  // 2. Desktop Screenshot (1440x900)
  const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await desktopPage.goto('http://localhost:5173/guide', { waitUntil: 'networkidle' })
  await desktopPage.evaluate(() => {
    localStorage.setItem('kkr.welcomed', 'true')
    localStorage.setItem('kkr.theme', '"dark"')
    sessionStorage.setItem('kkr.intro.plays', '99')
    document.documentElement.classList.add('dark')
  })
  await desktopPage.goto('http://localhost:5173/guide', { waitUntil: 'networkidle' })
  await desktopPage.waitForTimeout(500)
  await desktopPage.screenshot({ path: '/Users/akshathkumar/.gemini/antigravity/brain/cc63893d-7ec5-4eae-9f96-174ddc717758/desktop_view.png' })

  await browser.close()
  console.log('Screenshots captured successfully!')
}

run().catch(console.error)
