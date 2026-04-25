# Proposal Maker Quick Start

This app includes a proposal creation workflow with Google Sheets export support.

## 🚀 Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Start the development server

```bash
npm run dev
```

### 3. Open the app

Visit:

```bash
http://localhost:3000
```

### 4. Set up Google Sheets export (optional)

1. Create a Google Sheets API key in Google Cloud Console
2. Create a `.env.local` file
3. Add:
   ```env
   GOOGLE_SHEETS_API_KEY=your_key_here
   GOOGLE_SHEETS_ID=your_sheet_id_here
   ```

### 5. Use the app

- `/admin/proposals` — admin proposal editor
- `/admin/companies` — company branding management
- `/admin/services` — service item management

---

## Notes

- Proposal and company data are stored locally in the browser using `localStorage`
- Google Sheets export requires a configured API key and sheet ID

## Resources

- [Google Sheets API](https://developers.google.com/sheets/api)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Docs](https://react.dev)

---

Happy building! 🎉
