# Accessibility Report

> Generated: 2026-11-02T03:11:54.779Z | axe-core 4.12.1 | Rules: wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice | Viewport: 1280x900
> Base URL: http://localhost:8081/rocket-meals

## Summary

Total violations (affected elements): **223** — 🟥 Critical: 5, 🟧 Serious: 10, 🟨 Moderate: 208, 🟦 Minor: 0

| Screen | 🟥 Critical | 🟧 Serious | 🟨 Moderate | 🟦 Minor | Total | Passes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| licenseInformation | 0 | 0 | 113 | 0 | 113 | 22 |
| course-timetable | 0 | 4 | 11 | 0 | 15 | 28 |
| foodPlanList | 0 | 0 | 7 | 0 | 7 | 28 |
| notification | 4 | 0 | 2 | 0 | 6 | 31 |
| login | 0 | 0 | 5 | 0 | 5 | 8 |
| price-group | 0 | 0 | 5 | 0 | 5 | 8 |
| form-submissions | 0 | 0 | 5 | 0 | 5 | 31 |
| leaflet-map | 0 | 0 | 5 | 0 | 5 | 8 |
| faq-food | 0 | 1 | 3 | 0 | 4 | 28 |
| faq-living | 0 | 1 | 3 | 0 | 4 | 28 |
| feedback-support | 1 | 0 | 2 | 0 | 3 | 28 |
| support-ticket | 0 | 1 | 2 | 0 | 3 | 26 |
| foodoffers | 0 | 0 | 2 | 0 | 2 | 27 |
| eating-habits | 0 | 0 | 2 | 0 | 2 | 17 |
| account-balance | 0 | 0 | 2 | 0 | 2 | 17 |
| campus | 0 | 0 | 2 | 0 | 2 | 22 |
| housing | 0 | 0 | 2 | 0 | 2 | 30 |
| news | 0 | 0 | 2 | 0 | 2 | 17 |
| settings | 0 | 0 | 2 | 0 | 2 | 30 |
| data-access | 0 | 0 | 2 | 0 | 2 | 17 |
| support-FAQ | 0 | 0 | 2 | 0 | 2 | 17 |
| management | 0 | 0 | 2 | 0 | 2 | 17 |
| events | 0 | 0 | 2 | 0 | 2 | 17 |
| experimentell | 0 | 0 | 2 | 0 | 2 | 17 |
| forms | 0 | 0 | 2 | 0 | 2 | 17 |
| form-categories | 0 | 0 | 2 | 0 | 2 | 29 |
| form-submission | 0 | 0 | 2 | 0 | 2 | 17 |
| delete-user | 0 | 1 | 1 | 0 | 2 | 11 |
| inventory-items | 0 | 0 | 2 | 0 | 2 | 18 |
| vertical-image-scroll | 0 | 0 | 2 | 0 | 2 | 17 |
| bigScreen | 0 | 1 | 1 | 0 | 2 | 14 |
| rss-feed | 0 | 1 | 1 | 0 | 2 | 21 |
| statistics | 0 | 0 | 1 | 0 | 1 | 16 |
| labels | 0 | 0 | 1 | 0 | 1 | 14 |
| wikis | 0 | 0 | 1 | 0 | 1 | 12 |
| foodPlanDay | 0 | 0 | 1 | 0 | 1 | 25 |
| foodPlanWeek | 0 | 0 | 1 | 0 | 1 | 25 |
| list-day-screen | 0 | 0 | 1 | 0 | 1 | 14 |
| list-week-screen | 0 | 0 | 1 | 0 | 1 | 13 |
| rss-feed-config | 0 | 0 | 1 | 0 | 1 | 27 |

## Most common rule violations

| Rule | Impact | Elements | Screens | Help |
| --- | --- | ---: | ---: | --- |
| `region` | 🟨 moderate | 205 | 40 | [All page content should be contained by landmarks](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer) |
| `color-contrast` | 🟧 serious | 4 | 1 | [Elements must meet minimum color contrast ratio thresholds](https://dequeuniversity.com/rules/axe/4.12/color-contrast?application=axe-puppeteer) |
| `document-title` | 🟧 serious | 4 | 4 | [Documents must have <title> element to aid in navigation](https://dequeuniversity.com/rules/axe/4.12/document-title?application=axe-puppeteer) |
| `aria-required-parent` | 🟥 critical | 4 | 1 | [Certain ARIA roles must be contained by particular parents](https://dequeuniversity.com/rules/axe/4.12/aria-required-parent?application=axe-puppeteer) |
| `landmark-one-main` | 🟨 moderate | 3 | 3 | [Document should have one main landmark](https://dequeuniversity.com/rules/axe/4.12/landmark-one-main?application=axe-puppeteer) |
| `label` | 🟥 critical | 1 | 1 | [Form elements must have labels](https://dequeuniversity.com/rules/axe/4.12/label?application=axe-puppeteer) |
| `aria-progressbar-name` | 🟧 serious | 1 | 1 | [ARIA progressbar nodes must have an accessible name](https://dequeuniversity.com/rules/axe/4.12/aria-progressbar-name?application=axe-puppeteer) |
| `scrollable-region-focusable` | 🟧 serious | 1 | 1 | [Scrollable region must have keyboard access](https://dequeuniversity.com/rules/axe/4.12/scrollable-region-focusable?application=axe-puppeteer) |

## Details per screen

### licenseInformation

URL: `http://localhost:8081/rocket-meals/licenseInformation?kioskMode=true`

- 🟨 **region** (moderate) — 113 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-1p0dtai.r-ipm5af.r-dnmrzs`
  - `.r-12vffkv`
  - `.r-rs99b7.r-1dzdj1l.r-1udh08x:nth-child(1) > .r-1w2pmg.r-633pao.r-1udh08x`
  - … and 110 more (see JSON report)

### course-timetable

URL: `http://localhost:8081/rocket-meals/course-timetable?kioskMode=true`

- 🟧 **color-contrast** (serious) — 4 element(s)
  - Elements must meet minimum color contrast ratio thresholds ([docs](https://dequeuniversity.com/rules/axe/4.12/color-contrast?application=axe-puppeteer))
  - `.r-1b43r93.r-xwgrit.css-146c3p1`
  - `.r-bnwqim.r-1dzdj1l.r-13awgt0:nth-child(1) > .r-eg6o18.r-1rf8fdq.r-144uupt > .r-8akbws.r-krxsd3.r-1qsk4np`
  - `.r-n6v787.r-1wvlp2r.css-146c3p1`
  - … and 1 more (see JSON report)

- 🟨 **region** (moderate) — 11 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-1p0dtai.r-ipm5af.r-dnmrzs`
  - `.r-16pcm1t.r-1awozwy.css-g5y9jx`
  - `.r-1i10wst`
  - … and 8 more (see JSON report)

### foodPlanList

URL: `http://localhost:8081/rocket-meals/foodPlanList?kioskMode=true`

- 🟨 **region** (moderate) — 7 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-184en5c`
  - `.r-150rngu.r-eqz5dr.r-16y2uox > .css-g5y9jx > .r-1loqt21.r-1otgn73.r-1i6wzkk:nth-child(1)`
  - `.r-150rngu.r-eqz5dr.r-16y2uox > .css-g5y9jx > .r-1loqt21.r-1otgn73.r-1i6wzkk:nth-child(2)`
  - … and 4 more (see JSON report)

### notification

URL: `http://localhost:8081/rocket-meals/notification?kioskMode=true`

- 🟥 **aria-required-parent** (critical) — 4 element(s)
  - Certain ARIA roles must be contained by particular parents ([docs](https://dequeuniversity.com/rules/axe/4.12/aria-required-parent?application=axe-puppeteer))
  - `.r-y47klf.r-ojf8lh.r-11f147o:nth-child(1)`
  - `.r-y47klf.r-ojf8lh.r-11f147o:nth-child(2)`
  - `.r-y47klf.r-ojf8lh.r-11f147o:nth-child(3)`
  - … and 1 more (see JSON report)

- 🟨 **region** (moderate) — 2 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-dnmrzs`
  - `.r-18u37iz.r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx`

### login

URL: `http://localhost:8081/rocket-meals/login?kioskMode=true`

- 🟨 **landmark-one-main** (moderate) — 1 element(s)
  - Document should have one main landmark ([docs](https://dequeuniversity.com/rules/axe/4.12/landmark-one-main?application=axe-puppeteer))
  - `html`

- 🟨 **region** (moderate) — 4 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `h1`
  - `p:nth-child(2)`
  - `p:nth-child(3)`
  - … and 1 more (see JSON report)

### price-group

URL: `http://localhost:8081/rocket-meals/price-group?kioskMode=true`

- 🟨 **landmark-one-main** (moderate) — 1 element(s)
  - Document should have one main landmark ([docs](https://dequeuniversity.com/rules/axe/4.12/landmark-one-main?application=axe-puppeteer))
  - `html`

- 🟨 **region** (moderate) — 4 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `h1`
  - `p:nth-child(2)`
  - `p:nth-child(3)`
  - … and 1 more (see JSON report)

### form-submissions

URL: `http://localhost:8081/rocket-meals/form-submissions?kioskMode=true`

- 🟨 **region** (moderate) — 5 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-dnmrzs`
  - `.r-1udh08x.r-1d2f490.r-u8s1d > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx > .css-g5y9jx > .css-g5y9jx:nth-child(1)`
  - `.r-dd0y9b > .r-u9wvl5.r-13qz1uu.r-1awozwy`
  - … and 2 more (see JSON report)

### leaflet-map

URL: `http://localhost:8081/rocket-meals/leaflet-map?kioskMode=true`

- 🟨 **landmark-one-main** (moderate) — 1 element(s)
  - Document should have one main landmark ([docs](https://dequeuniversity.com/rules/axe/4.12/landmark-one-main?application=axe-puppeteer))
  - `html`

- 🟨 **region** (moderate) — 4 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `h1`
  - `p:nth-child(2)`
  - `p:nth-child(3)`
  - … and 1 more (see JSON report)

### faq-food

URL: `http://localhost:8081/rocket-meals/faq-food?kioskMode=true`

- 🟧 **document-title** (serious) — 1 element(s)
  - Documents must have <title> element to aid in navigation ([docs](https://dequeuniversity.com/rules/axe/4.12/document-title?application=axe-puppeteer))
  - `html`

- 🟨 **region** (moderate) — 3 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-dnmrzs.r-1p0dtai.r-ipm5af`
  - `.r-12vffkv.r-1777fci.css-g5y9jx`
  - `.r-1udh08x.r-1d2f490.r-u8s1d > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx`

### faq-living

URL: `http://localhost:8081/rocket-meals/faq-living?kioskMode=true`

- 🟧 **document-title** (serious) — 1 element(s)
  - Documents must have <title> element to aid in navigation ([docs](https://dequeuniversity.com/rules/axe/4.12/document-title?application=axe-puppeteer))
  - `html`

- 🟨 **region** (moderate) — 3 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-dnmrzs.r-1p0dtai.r-ipm5af`
  - `.r-12vffkv.r-1777fci.css-g5y9jx`
  - `.r-1udh08x.r-1d2f490.r-u8s1d > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx`

### feedback-support

URL: `http://localhost:8081/rocket-meals/feedback-support?kioskMode=true`

- 🟥 **label** (critical) — 1 element(s)
  - Form elements must have labels ([docs](https://dequeuniversity.com/rules/axe/4.12/label?application=axe-puppeteer))
  - `input`

- 🟨 **region** (moderate) — 2 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-dnmrzs`
  - `.r-13awgt0.r-18u37iz.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx`

### support-ticket

URL: `http://localhost:8081/rocket-meals/support-ticket?kioskMode=true`

- 🟧 **aria-progressbar-name** (serious) — 1 element(s)
  - ARIA progressbar nodes must have an accessible name ([docs](https://dequeuniversity.com/rules/axe/4.12/aria-progressbar-name?application=axe-puppeteer))
  - `div[role="progressbar"]`

- 🟨 **region** (moderate) — 2 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-dnmrzs`
  - `.r-1udh08x.r-1d2f490.r-u8s1d > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx`

### foodoffers

URL: `http://localhost:8081/rocket-meals/foodoffers?kioskMode=true`

- 🟨 **region** (moderate) — 2 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-1p0dtai.r-ipm5af.r-dnmrzs`
  - `.r-13awgt0.r-18u37iz.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-1d2f490.r-zchlnj.r-1p0dtai > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx`

### eating-habits

URL: `http://localhost:8081/rocket-meals/eating-habits?kioskMode=true`

- 🟨 **region** (moderate) — 2 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-dnmrzs`
  - `.r-13awgt0.r-18u37iz.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx`

### account-balance

URL: `http://localhost:8081/rocket-meals/account-balance?kioskMode=true`

- 🟨 **region** (moderate) — 2 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-dnmrzs.r-1p0dtai.r-ipm5af`
  - `.r-18u37iz.r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx`

### campus

URL: `http://localhost:8081/rocket-meals/campus?kioskMode=true`

- 🟨 **region** (moderate) — 2 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-dnmrzs`
  - `.r-1d2f490.r-zchlnj.r-ipm5af > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx`

### housing

URL: `http://localhost:8081/rocket-meals/housing?kioskMode=true`

- 🟨 **region** (moderate) — 2 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-dnmrzs`
  - `.r-13awgt0.r-18u37iz.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-1d2f490.r-zchlnj.r-1p0dtai > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx`

### news

URL: `http://localhost:8081/rocket-meals/news?kioskMode=true`

- 🟨 **region** (moderate) — 2 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-dnmrzs.r-1p0dtai.r-ipm5af`
  - `.r-18u37iz.r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx`

### settings

URL: `http://localhost:8081/rocket-meals/settings?kioskMode=true`

- 🟨 **region** (moderate) — 2 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-dnmrzs.r-1p0dtai.r-ipm5af`
  - `.r-13awgt0.r-18u37iz.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx`

### data-access

URL: `http://localhost:8081/rocket-meals/data-access?kioskMode=true`

- 🟨 **region** (moderate) — 2 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-dnmrzs`
  - `.r-13awgt0.r-18u37iz.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx`

### support-FAQ

URL: `http://localhost:8081/rocket-meals/support-FAQ?kioskMode=true`

- 🟨 **region** (moderate) — 2 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-dnmrzs`
  - `.r-13awgt0.r-18u37iz.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx`

### management

URL: `http://localhost:8081/rocket-meals/management?kioskMode=true`

- 🟨 **region** (moderate) — 2 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-dnmrzs.r-1p0dtai.r-ipm5af`
  - `.r-13awgt0.r-18u37iz.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx`

### events

URL: `http://localhost:8081/rocket-meals/events?kioskMode=true`

- 🟨 **region** (moderate) — 2 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-dnmrzs`
  - `.r-18u37iz.r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx`

### experimentell

URL: `http://localhost:8081/rocket-meals/experimentell?kioskMode=true`

- 🟨 **region** (moderate) — 2 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-dnmrzs.r-1p0dtai.r-ipm5af`
  - `.r-13awgt0.r-18u37iz.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx`

### forms

URL: `http://localhost:8081/rocket-meals/forms?kioskMode=true`

- 🟨 **region** (moderate) — 2 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-dnmrzs`
  - `.r-18u37iz.r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx`

### form-categories

URL: `http://localhost:8081/rocket-meals/form-categories?kioskMode=true`

- 🟨 **region** (moderate) — 2 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-dnmrzs`
  - `.r-18u37iz.r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx`

### form-submission

URL: `http://localhost:8081/rocket-meals/form-submission?kioskMode=true`

- 🟨 **region** (moderate) — 2 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-dnmrzs`
  - `.r-18u37iz.r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx`

### delete-user

URL: `http://localhost:8081/rocket-meals/delete-user?kioskMode=true`

- 🟧 **document-title** (serious) — 1 element(s)
  - Documents must have <title> element to aid in navigation ([docs](https://dequeuniversity.com/rules/axe/4.12/document-title?application=axe-puppeteer))
  - `html`

- 🟨 **region** (moderate) — 1 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-13awgt0.css-g5y9jx > .css-g5y9jx > .css-g5y9jx > .css-g5y9jx > .r-13awgt0.css-g5y9jx`

### inventory-items

URL: `http://localhost:8081/rocket-meals/inventory-items?kioskMode=true`

- 🟨 **region** (moderate) — 2 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-dnmrzs.r-1p0dtai.r-ipm5af`
  - `.r-1udh08x.r-1d2f490.r-u8s1d:nth-child(1)`

### vertical-image-scroll

URL: `http://localhost:8081/rocket-meals/vertical-image-scroll?kioskMode=true`

- 🟨 **region** (moderate) — 2 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-dnmrzs`
  - `.r-18u37iz.r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx`

### bigScreen

URL: `http://localhost:8081/rocket-meals/bigScreen?kioskMode=true`

- 🟧 **scrollable-region-focusable** (serious) — 1 element(s)
  - Scrollable region must have keyboard access ([docs](https://dequeuniversity.com/rules/axe/4.12/scrollable-region-focusable?application=axe-puppeteer))
  - `.r-150rngu`

- 🟨 **region** (moderate) — 1 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `#root > .r-13awgt0.css-g5y9jx > .css-g5y9jx > .css-g5y9jx > .css-g5y9jx > .r-13awgt0.css-g5y9jx`

### rss-feed

URL: `http://localhost:8081/rocket-meals/rss-feed?kioskMode=true`

- 🟧 **document-title** (serious) — 1 element(s)
  - Documents must have <title> element to aid in navigation ([docs](https://dequeuniversity.com/rules/axe/4.12/document-title?application=axe-puppeteer))
  - `html`

- 🟨 **region** (moderate) — 1 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `#root > .r-13awgt0.css-g5y9jx > .css-g5y9jx > .css-g5y9jx > .css-g5y9jx > .r-13awgt0.css-g5y9jx`

### statistics

URL: `http://localhost:8081/rocket-meals/statistics?kioskMode=true`

- 🟨 **region** (moderate) — 1 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-13awgt0.css-g5y9jx > .css-g5y9jx > .css-g5y9jx > .css-g5y9jx > .r-13awgt0.css-g5y9jx`

### labels

URL: `http://localhost:8081/rocket-meals/labels?kioskMode=true`

- 🟨 **region** (moderate) — 1 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-13awgt0.css-g5y9jx > .css-g5y9jx > .css-g5y9jx > .css-g5y9jx > .r-13awgt0.css-g5y9jx`

### wikis

URL: `http://localhost:8081/rocket-meals/wikis?kioskMode=true`

- 🟨 **region** (moderate) — 1 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-13awgt0.css-g5y9jx > .css-g5y9jx > .css-g5y9jx > .css-g5y9jx > .r-13awgt0.css-g5y9jx`

### foodPlanDay

URL: `http://localhost:8081/rocket-meals/foodPlanDay?kioskMode=true`

- 🟨 **region** (moderate) — 1 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-13awgt0.css-g5y9jx > .css-g5y9jx > .css-g5y9jx > .css-g5y9jx > .r-13awgt0.css-g5y9jx`

### foodPlanWeek

URL: `http://localhost:8081/rocket-meals/foodPlanWeek?kioskMode=true`

- 🟨 **region** (moderate) — 1 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `.r-13awgt0.css-g5y9jx > .css-g5y9jx > .css-g5y9jx > .css-g5y9jx > .r-13awgt0.css-g5y9jx`

### list-day-screen

URL: `http://localhost:8081/rocket-meals/list-day-screen?kioskMode=true`

- 🟨 **region** (moderate) — 1 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `#root > .r-13awgt0.css-g5y9jx > .css-g5y9jx > .css-g5y9jx > .css-g5y9jx > .r-13awgt0.css-g5y9jx`

### list-week-screen

URL: `http://localhost:8081/rocket-meals/list-week-screen?kioskMode=true`

- 🟨 **region** (moderate) — 1 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `#root > .r-13awgt0.css-g5y9jx > .css-g5y9jx > .css-g5y9jx > .css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-1p0dtai.r-1d2f490.r-u8s1d > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx > .r-13awgt0.css-g5y9jx`

### rss-feed-config

URL: `http://localhost:8081/rocket-meals/rss-feed-config?kioskMode=true`

- 🟨 **region** (moderate) — 1 element(s)
  - All page content should be contained by landmarks ([docs](https://dequeuniversity.com/rules/axe/4.12/region?application=axe-puppeteer))
  - `#root > .r-13awgt0.css-g5y9jx > .css-g5y9jx > .css-g5y9jx > .css-g5y9jx > .r-13awgt0.css-g5y9jx`
