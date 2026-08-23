import { createServer } from 'vite'
import { chromium } from 'playwright'

async function run() {
  const server = await createServer({
    server: { port: 5181 },
  })
  await server.listen()
  const url = 'http://localhost:5181'

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  await page.goto(url)
  await page.evaluate(() => {
    localStorage.setItem('kkr.welcomed', 'true')
    localStorage.setItem('kkr.profile', JSON.stringify({
      name: 'Spider-Punk',
      rollNo: '12345',
      branch: 'COE',
      hostel: 'H1',
      branchPicked: true,
      hostelPicked: true,
      yearByBranch: { COE: '2' },
    }))
    sessionStorage.setItem('kkr.intro.plays', '10')
  })

  await page.goto(`${url}/home`)
  await page.waitForTimeout(300)

  // Click theme toggle
  const toggleBtn = page.locator('button:has-text("LIGHT"), button:has-text("DARK")')
  await toggleBtn.click()

  // Wait 100ms into the animation to capture the tear strips slicing across the screen
  await page.waitForTimeout(100)
  await page.screenshot({ path: '/Users/akshathkumar/.gemini/antigravity/brain/afc9d375-babc-4b05-a977-a60c10830319/zine_tear_action.png' })

  console.log('Screenshot saved to zine_tear_action.png')
  await browser.close()
  await server.close()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
