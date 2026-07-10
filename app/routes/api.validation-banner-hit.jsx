import {data} from "react-router";
import prisma from "../db.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function headers() {
  return corsHeaders;
}

export async function loader() {
  return data({ok: true,route: "api.validation-banner-hit"}, {headers: corsHeaders});
}

export async function action({request}) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const body = await request.json();

    const shop = String(body.shop || "").trim();
    const variant = String(body.variant || "").trim();
    const countryCode = String(body.countryCode || "").trim();
    const reason = String(body.reason || "address_warning").trim();

    if (!shop) {
      return data(
        {
          ok: false,
          error: "Missing shop",
        },
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    await prisma.orderFixEvent.create({
      data: {
        shop,
        type: "ADDRESS_WARNING_SHOWN"
      },
    });

    return data(
      {
        ok: true,
        tracked: true,
        event: "ADDRESS_WARNING_SHOWN",
        variant,
        countryCode,
        reason,
      },
      {headers: corsHeaders},
    );
  } catch (error) {
    console.error("Validation banner tracking error:", error);

    return data(
      {
        ok: false,
        error: "Unable to track validation banner",
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
}