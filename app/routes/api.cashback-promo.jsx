import { data } from "react-router";
import prisma from "../db.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://microperfumes.com",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

export function headers() {
  return corsHeaders;
}

// GET /api/cashback-promo?kx=XXXX
export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const kx = url.searchParams.get("kx")?.trim();

    if (!kx) {
      return data(
        { ok: false, purchased: false, error: "Missing kx" },
        { status: 400, headers: corsHeaders }
      );
    }

    const purchase = await prisma.cashbackPromoPurchase.findFirst({
      where: {
        kx,
        status: "PURCHASED",
      },
      select: {
        cashbackPromo: true,
        status: true,
      },
    });

    return data(
      {
        ok: true,
        purchased: Boolean(purchase),
      },
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error("cashback promo verification error", error);

    return data(
      { ok: false, purchased: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}