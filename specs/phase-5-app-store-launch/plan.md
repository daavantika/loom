# Phase 5 Plan — Technical Approach

## Sequencing
This phase is mostly account setup, asset production, and store-console work, not code — but it gates on one code/config change from Phase 4: shipping at least one Guideline-4.2 mitigation feature (recommend push notifications via Median's OneSignal integration, since it's the most broadly useful for a marketplace app — order-status and new-kitchen-nearby alerts are natural fits for LOOM's domain).

## Steps
1. Enroll in Apple Developer Program and create a Google Play Developer account (one-time, ~1-2 business days for Apple's review of the enrollment itself).
2. Write and publish the privacy policy as a static page (can live at `/privacy` on the same Phase 2 site — zero extra hosting needed) stating clearly that all app state is stored locally on-device (`localStorage`) and nothing is transmitted to a server in this version.
3. Implement the chosen 4.2 mitigation in Median (push notifications: connect OneSignal, define at least one real notification trigger — even a manual "new kitchen near you" broadcast is enough to demonstrate genuine native value).
4. Produce store listing copy and screenshots; use Median's built-in device-framed screenshot generation if available, otherwise capture manually from the Phase 4 test builds on real devices/simulators at each required size.
5. Play Console: fill Data Safety form ("no data collected/shared" given current localStorage-only state), upload AAB, submit to internal testing → production.
6. App Store Connect: fill App Privacy labels ("data not collected"), upload build via Median/Xcode Cloud pipeline, submit for review referencing the push-notification feature in the review notes to preempt a 4.2 rejection.

## Verification steps
1. Privacy policy URL loads publicly and is linked correctly in both store consoles.
2. A test push notification is received on both a real Android and real iOS device before submission.
3. Play Store internal test track install works end-to-end from the Play Store app itself (not sideloaded) before promoting to production.
4. Track Apple review status in App Store Connect; if rejected, record the exact guideline cited in this file's "Rejection log" (add a running log section here as needed) along with the fix applied, then resubmit.
5. Once both listings are live, install fresh from each public store on a clean device and re-walk the full flow list from Phase 2/4 as a final smoke test.
