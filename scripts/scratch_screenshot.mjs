import { createServer } from 'vite'
import { chromium } from 'playwright'

async function capture() {
  const server = await createServer({
    server: { port: 5188 },
  })
  await server.listen()
  const url = 'http://localhost:5188'

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.setItem('kkr.welcomed', 'true')
    localStorage.setItem('kkr.theme', '"dark"')
    sessionStorage.setItem('kkr.intro.plays', '99')
    document.documentElement.classList.add('dark')
    localStorage.setItem('kkr.profile', JSON.stringify({
      name: 'AKSHATH',
      branch: 'CSE',
      hostel: 'H10',
      yearByBranch: { CSE: '1' },
      branchPicked: true,
      hostelPicked: true,
    }))
  })
  
  // Dashboard Dark screenshot
  await page.goto(`${url}/home`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: '/Users/akshathkumar/.gemini/antigravity/brain/6c67eae2-2e41-4c01-a9c5-541062db2a0f/dashboard_dark.png' })
  
  // Dashboard Light screenshot
  await page.evaluate(() => {
    localStorage.setItem('kkr.theme', '"light"')
    document.documentElement.classList.remove('dark')
  })
  await page.goto(`${url}/home`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: '/Users/akshathkumar/.gemini/antigravity/brain/6c67eae2-2e41-4c01-a9c5-541062db2a0f/dashboard_light.png' })

  await browser.close()
  await server.close()
  console.log('Screenshots saved successfully!')
}

capture().catch((e) => console.error(e))
