# Strong and Steady Schedule Dashboard

Practitioner-facing schedule dashboard built from the IFB398 Figma prototype.

## Current scope

- Weekly schedule layout
- Previous, today and next week controls
- Functional activity filters
- Colour-coded classes, recurring classes, event series, appointments and blocked time
- Create activity menu
- Responsive desktop and mobile layout
- Sample data ready to be replaced by an API later

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite.

## Production build

```bash
npm run build
npm start
```

The generated files are placed in `dist`. The Express server serves both the
React application and the `/api` routes from one public URL.

## Deploy to Railway

1. Create a Railway project and choose **Deploy from GitHub repo**.
2. Select `NPJ0722/IFB398-code` and deploy the `main` branch.
3. Add a Railway Volume to the service and mount it at `/data`.
4. Add the service variable `DATA_DIR=/data`.
5. Generate a public domain from the service **Networking** settings.
6. Confirm that `/api/health` returns a JSON response with `"status":"ok"`.

Railway detects `npm run build` and uses `npm start` for the production server.
The service listens on Railway's injected `PORT` value automatically.

To add reusable demonstration records to the mounted database, run this once
inside the deployed service environment:

```bash
npm run seed:demo
```

This prototype does not yet include authentication or role-based access.
Deploy it with demonstration data only; do not enter real client or health
information into a public deployment.
