import { createServer } from 'vite'
import { chromium } from 'playwright'

async function run() {
  const server = await createServer({
    server: { port: 5179 },
  })
  await server.listen()
  const url = 'http://localhost:5179'

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  console.log('Testing Landing page theme toggle...')
  await page.goto(url)
  await page.waitForLoadState('networkidle')

  // Set welcomed in localStorage
  await page.evaluate(() => {
    localStorage.setItem('kkr.welcomed', 'true')
    localStorage.setItem('kkr.profile', JSON.stringify({
      name: 'Spider-Punk Tester',
      rollNo: '12345',
      branch: 'COE',
      hostel: 'H1',
      branchPicked: true,
      hostelPicked: true,
      yearByBranch: { COE: '2' },
    }))
    sessionStorage.setItem('kkr.intro.plays', '10') // skip intro overlay
  })

  await page.goto(url)
  await page.waitForTimeout(300)

  // Find theme toggle button bounding rect on Landing page
  const landingBtn = page.locator('button[aria-label*="Switch to"]')
  const landingBox = await landingBtn.boundingBox()
  console.log('Landing page button box:', landingBox)

  // Click the theme button and take a screenshot at 100ms
  await landingBtn.click()
  await page.waitForTimeout(100)

  // Check burst coordinates
  const burstData = await page.evaluate(() => {
    const burstSvg = document.querySelector('.punk-burst-svg g')
    const transform = burstSvg ? burstSvg.getAttribute('transform') : null
    const rootX = document.documentElement.style.getPropertyValue('--burst-x')
    const rootY = document.documentElement.style.getPropertyValue('--burst-y')
    return { transform, rootX, rootY }
  })
  console.log('Burst rendered with:', burstData)

  const expectedX = Math.round(landingBox.x + landingBox.width / 2)
  const expectedY = Math.round(landingBox.y + landingBox.height / 2)
  console.log(`Expected center: (${expectedX}, ${expectedY}) vs Actual: (${burstData.rootX}, ${burstData.rootY})`)

  await page.screenshot({ path: 'scripts/landing_burst_test.png' })

  // Now test /home (Dashboard with sidebar button)
  console.log('Testing Dashboard /home sidebar theme toggle...')
  await page.goto(`${url}/home`)
  await page.waitForTimeout(300)

  const sidebarBtn = page.locator('aside button:has-text("LIGHT"), aside button:has-text("DARK")')
  const sidebarBox = await sidebarBtn.boundingBox()
  console.log('Sidebar button box:', sidebarBox)

  await sidebarBtn.click()
  await page.waitForTimeout(100)

  const sidebarBurst = await page.evaluate(() => {
    const burstSvg = document.querySelector('.punk-burst-svg g')
    const transform = burstSvg ? burstSvg.getAttribute('transform') : null
    const rootX = document.documentElement.style.getPropertyValue('--burst-x')
    const rootY = document.documentElement.style.getPropertyValue('--burst-y')
    return { transform, rootX, rootY }
  })
  console.log('Sidebar burst rendered with:', sidebarBurst)

  const expectedSidebarX = Math.round(sidebarBox.x + sidebarBox.width / 2)
  const expectedSidebarY = Math.round(sidebarBox.y + sidebarBox.height / 2)
  console.log(`Expected center: (${expectedSidebarX}, ${expectedSidebarY}) vs Actual: (${sidebarBurst.rootX}, ${sidebarBurst.rootY})`)

  await page.screenshot({ path: 'scripts/sidebar_burst_test.png' })

  await browser.close()
  await server.close()

  if (
    burstData.transform === `translate(${expectedX}, ${expectedY})` &&
    sidebarBurst.transform === `translate(${expectedSidebarX}, ${expectedSidebarY})`
  ) {
    console.log('SUCCESS: All coordinates match 100% perfectly with button centers on both pages!')
  } else {
    console.error('MISMATCH detected!')
    process.exit(1)
  }
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
