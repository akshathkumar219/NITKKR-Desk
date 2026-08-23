import { createServer } from 'vite'
import { chromium } from 'playwright'

async function run() {
  const server = await createServer({
    server: { port: 5180 },
  })
  await server.listen()
  const url = 'http://localhost:5180'

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }) // iPhone 14/15 size
  const page = await context.newPage()

  console.log('Testing Mobile header theme toggle on /home...')
  await page.goto(url)

  await page.evaluate(() => {
    localStorage.setItem('kkr.welcomed', 'true')
    localStorage.setItem('kkr.profile', JSON.stringify({
      name: 'Mobile Spider-Punk',
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

  // Mobile toggle is in the header at top right
  const mobileBtn = page.locator('header button[aria-label="Toggle theme"]')
  const mobileBox = await mobileBtn.boundingBox()
  console.log('Mobile button box:', mobileBox)

  await mobileBtn.click()
  await page.waitForTimeout(100)

  const mobileBurst = await page.evaluate(() => {
    const burstSvg = document.querySelector('.punk-burst-svg g')
    const transform = burstSvg ? burstSvg.getAttribute('transform') : null
    const rootX = document.documentElement.style.getPropertyValue('--burst-x')
    const rootY = document.documentElement.style.getPropertyValue('--burst-y')
    return { transform, rootX, rootY }
  })
  console.log('Mobile burst rendered with:', mobileBurst)

  const expectedMobileX = Math.round(mobileBox.x + mobileBox.width / 2)
  const expectedMobileY = Math.round(mobileBox.y + mobileBox.height / 2)
  console.log(`Expected center: (${expectedMobileX}, ${expectedMobileY}) vs Actual: (${mobileBurst.rootX}, ${mobileBurst.rootY})`)

  await page.screenshot({ path: 'scripts/mobile_burst_test.png' })

  await browser.close()
  await server.close()

  if (mobileBurst.transform === `translate(${expectedMobileX}, ${expectedMobileY})`) {
    console.log('SUCCESS: Mobile coordinates match 100% perfectly with button center!')
  } else {
    console.error('MISMATCH detected on mobile!')
    process.exit(1)
  }
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
