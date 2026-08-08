export function normalizePdfBase64(value: string) {
  const withoutDataUrl = value.trim().replace(/^data:[^,]+,\s*/i, "");
  const normalized = withoutDataUrl.replace(/\s/g, "");

  if (!normalized || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw new Error("The generated PDF has an invalid base64 payload.");
  }

  const content = Buffer.from(normalized, "base64");
  if (content.length < 5 || content.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("The generated PDF payload is not a valid PDF file.");
  }

  return content.toString("base64");
}
