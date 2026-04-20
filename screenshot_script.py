from playwright.sync_api import sync_playwright
import base64

with sync_playwright() as p:
    browser = p.firefox.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page.goto("http://127.0.0.1:4173/rocket-meals", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path="screenshot_foodoffers.png", full_page=False)
    browser.close()
    print("Screenshot saved to screenshot_foodoffers.png")
