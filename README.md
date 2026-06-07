# PlanForge Business Plan Maker

PlanForge is a complete Express MVC web application for creating editable, bank-ready
business plans. It uses Passport Local accounts, MongoDB Atlas persistence, EJS,
Bootstrap, vanilla JavaScript, the official `openai` Node SDK, structured `gpt-4o`
responses, and native editable `.docx` downloads.

## Start the application

1. Copy `.env.example` to `.env`.
2. Set `OPENAI_API_KEY`, `MONGODB_URI`, and a long random `SESSION_SECRET`.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000`.

Users create accounts with a phone number, email address, and password. Login accepts
either email or phone. Forgot-password infrastructure is included; connect an email or
SMS delivery provider before production use.

## Freemium workflow

1. Complete the guided multi-step business-plan form and save progress at any time.
2. Compile and download a free editable Word draft from the user's own content.
3. Submit the dummy MTN Mobile Money or Airtel Money payment form.
4. Run the premium Zambia-focused AI enhancement for a lender-facing plan.
5. Preview, manually edit, save, refine sections, and download the enhanced plan.

## Architecture

- `backend/`: server configuration, routes, controllers, MongoDB models, middleware,
  and services.
- `frontend/`: EJS views, static styles, and vanilla browser JavaScript.

Users, plans, payment audit records, and persistent portal sessions are stored in
MongoDB Atlas. The user model includes an admin-ready role field.
