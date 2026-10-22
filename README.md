# ClearPath Debt Tracker

A mobile-friendly debt tracker and payoff planner.

## Features
- Track balances, APRs, due dates, usual payments, and minimums
- Estimate monthly interest and principal progress
- Rank debts by APR using the debt avalanche approach
- Record payments and review recent payment history
- Export JSON backups and payment CSVs; restore from a JSON backup
- Responsive layout and basic offline caching

## Publish with GitHub Pages
In the repository, open **Settings → Pages**. Under **Build and deployment**, select **Deploy from a branch**, choose **main** and **/(root)**, then save. Once published, open the HTTPS Pages URL in Safari on iPhone and choose **Share → Add to Home Screen**.

On GitHub Free, Pages for this project requires a public repository. The app's source code will therefore be public if you use this route.

## Data and privacy
Debt records are stored in local storage in the current browser on the current device. They are not uploaded to GitHub and are not automatically synced or encrypted. Export backups regularly and avoid shared devices. This app has no bank connection, account login, cloud sync, or automatic reminders.

## Interest estimate
Monthly interest is approximated as balance × APR ÷ 12. Actual lenders may calculate interest daily and apply fees or other rules. Compare estimates with statements; this is not financial advice.