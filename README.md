# FinFlex

**A Hyperlocal Financial & Tax Services Marketplace Platform**

FinFlex is a role-based web application that connects Customers with verified financial and tax-services professionals — Chartered Accountants, Tax Consultants, GST Advisors, Financial Planners, Auditors, Insurance agents, and Legal advisors. The platform includes a document-based provider verification (eKYC) workflow, in-app messaging, and an administrative governance console.

This project was developed as a final year project for the MS in Financial Technology (FinTech) program.

---

## Overview

Discovery of financial and tax professionals is often informal and unverified. FinFlex addresses this by requiring every Service Provider to submit identity and professional credentials, which are reviewed and approved or rejected by an Admin before the provider becomes publicly discoverable. Only verified, active providers appear in search results.

---

## User Roles

| Role | Description |
|---|---|
| Customer | Searches for providers by category, books services, messages providers, and tracks service history. |
| Service Provider | Manages a profile, submits documents for eKYC verification, and communicates with clients. |
| Admin | Reviews verification submissions, manages user/provider accounts, and monitors a system-wide audit log. |

---

## Features

- Role-based authentication with a unified login/sign-up flow
- Category-based service discovery
- Document-based provider verification (eKYC) with Admin approval/rejection
- Visibility rules restricting public discovery to verified, active providers
- In-app messaging with an automated provider-side reply engine
- Chronological service history with filtering
- Admin dashboard with account management and a system audit log
- Optional Enterprise/B2B account tier
- Responsive design across mobile, tablet, and desktop

---

## Tech Stack

- **Frontend:** React, TypeScript
- **Build Tool:** Vite
- **Styling:** Utility-first CSS
- **Data Layer:** Modular local data service (`dataService.ts`), designed to be swappable for a cloud backend such as Firebase

---

The application will be available at `https://nimble-cobbler-d17cc7.netlify.app/`.

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Customer | ariba@gmail.com | user123 |
| Service Provider | amit.sharma@finflex.com | provider123 |
| Admin | admin@finflex.com | admin123 |

Demo credentials are for evaluation purposes only.

---

## Project Structure

```
finflex/
├── src/
│   ├── components/
│   │   ├── AuthScreen.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── ProviderDashboard.tsx
│   │   ├── HistoryTab.tsx
│   │   └── MessagingTab.tsx
│   ├── services/
│   │   ├── dataService.ts
│   │   └── autoReplyEngine.ts
│   ├── types/
│   │   └── index.ts
│   ├── data.ts
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
└── vite.config.ts
```

---

## Future Scope

- Migration to a live cloud backend (e.g., Firebase)
- Real payment and payout processing
- LLM-based conversational auto-reply
- Push notifications
- Progressive Web App / native app packaging

---

## License

This project was developed for academic purposes as part of an MS in Financial Technology program.
