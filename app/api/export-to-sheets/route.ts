/**
 * API Route to export proposal to Google Sheets
 * POST /api/export-to-sheets
 */

type ExportItem = {
  id: string;
  name: string;
  price: number;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      clientName,
      projectTitle,
      selectedItems,
      items,
      notes,
      validUntil,
      total,
    } = body;

    // Get API key from environment
    const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
    const SHEET_ID = process.env.GOOGLE_SHEETS_ID;

    if (!API_KEY || !SHEET_ID) {
      return Response.json(
        { error: "Google Sheets configuration not found" },
        { status: 400 }
      );
    }

    // Prepare the data for Google Sheets
    const selectedItemsList = (items as ExportItem[]).filter((item) =>
      selectedItems.includes(item.id)
    );

    const itemsText = selectedItemsList
      .map((item) => `${item.name} - $${item.price.toFixed(2)}`)
      .join(" | ");

    // Create rows to append
    const rows = [
      [
        new Date().toLocaleDateString(),
        clientName,
        projectTitle,
        itemsText,
        total.toFixed(2),
        notes || "",
        validUntil || "",
      ],
    ];

    // Use Google Sheets API to append data
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Proposals!A:G:append?valueInputOption=USER_ENTERED&key=${API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: rows,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to append to Google Sheets");
    }

    const result = await response.json();

    return Response.json({
      success: true,
      message: "Proposal saved to Google Sheets",
      result,
    });
  } catch (error) {
    console.error("Sheets export error:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to export to Google Sheets",
      },
      { status: 500 }
    );
  }
}
