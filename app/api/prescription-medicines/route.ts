import { NextRequest, NextResponse } from "next/server";

type InventoryItem = {
  id?: unknown;
  _id?: unknown;
  name?: unknown;
  dosage?: unknown;
  quantity?: unknown;
  price?: unknown;
  expiry?: unknown;
  status?: unknown;
};

const normalizeMedicine = (item: InventoryItem) => ({
  id: String(item.id || item._id || "").trim(),
  name: String(item.name || "").trim(),
  dosage: String(item.dosage || "").trim(),
  quantity: Number(item.quantity || 0),
  price: Number(item.price || 0),
  expiry: item.expiry ? String(item.expiry) : "",
  status: String(item.status || "").trim(),
});

export async function GET(request: NextRequest) {
  const inventoryUrl = process.env.PRESCRIPTION_API_URL;
  const inventoryApiKey = process.env.PRESCRIPTION_API_KEY;
  const inventoryBearerToken = process.env.PRESCRIPTION_API_BEARER_TOKEN;

  if (!inventoryUrl) {
    return NextResponse.json(
      { message: "Prescription inventory URL is not configured." },
      { status: 500 }
    );
  }

  try {
    const upstreamHeaders: HeadersInit = { Accept: "application/json" };
    const incomingAuthorization = request.headers.get("authorization")?.trim();

    if (incomingAuthorization) {
      upstreamHeaders["Authorization"] = incomingAuthorization;
    } else if (inventoryBearerToken) {
      upstreamHeaders["Authorization"] = `Bearer ${inventoryBearerToken}`;
    } else if (inventoryApiKey) {
      upstreamHeaders["x-api-key"] = inventoryApiKey;
    }

    const response = await fetch(inventoryUrl, {
      headers: upstreamHeaders,
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return NextResponse.json(
        {
          message: `Failed to load prescription inventory: ${response.status}`,
          detail: body,
        },
        { status: 502 }
      );
    }

    const payload = await response.json().catch(() => null);
    const rawItems: unknown[] = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

    const medicines = rawItems
      .filter((item: unknown): item is InventoryItem => !!item && typeof item === "object")
      .map(normalizeMedicine)
      .filter((item) => item.id && item.name && item.dosage && item.price >= 0);

    return NextResponse.json({ data: medicines });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to connect to prescription inventory.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}
