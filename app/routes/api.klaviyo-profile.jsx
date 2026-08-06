import {data} from "react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const KLAVIYO_API_REVISION = "2026-07-15";

export function headers() {
  return corsHeaders;
}

export async function loader() {
  return data(
    {ok: true},
    {headers: corsHeaders},
  );
}

export async function action({request}) {
  try {
    const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY;

    if (!apiKey) {
      console.error("KLAVIYO_PRIVATE_API_KEY is not configured");

      return data(
        {
          ok: false,
          validProfile: false,
          isSubscribed: false,
          error: "Klaviyo is not configured",
        },
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }

    const body = await request.json();
    const kx = String(body.kx ?? "").trim();

    if (!kx) {
      return data(
        {
          ok: false,
          validProfile: false,
          isSubscribed: false,
          error: "Missing kx",
        },
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    if (kx.length > 500) {
      return data(
        {
          ok: false,
          validProfile: false,
          isSubscribed: false,
          error: "Invalid kx",
        },
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    const url = new URL("https://a.klaviyo.com/api/profiles");

    url.searchParams.set(
      "filter",
      `equals(_kx,"${escapeFilterValue(kx)}")`,
    );

    url.searchParams.set(
      "additional-fields[profile]",
      "subscriptions",
    );

    url.searchParams.set("page[size]", "1");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        Revision: KLAVIYO_API_REVISION,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();

      console.error("Klaviyo profiles request failed", {
        status: response.status,
        response: errorText,
      });

      return data(
        {
          ok: false,
          validProfile: false,
          isSubscribed: false,
          error: "Klaviyo request failed",
        },
        {
          status: 502,
          headers: corsHeaders,
        },
      );
    }

    const result = await response.json();
    const profile = result?.data?.[0] ?? null;

    if (!profile) {
      return data(
        {
          ok: true,
          validProfile: false,
          isSubscribed: false,
        },
        {
          headers: corsHeaders,
        },
      );
    }

    const marketing =
      profile?.attributes?.subscriptions?.email?.marketing;

    const consent = marketing?.consent ?? null;
    const suppression = marketing?.suppression ?? null;

    const listSuppressions = Array.isArray(
      marketing?.list_suppressions,
    )
      ? marketing.list_suppressions
      : [];

    const isGloballySuppressed = Boolean(
      suppression?.timestamp ||
      suppression?.reason,
    );

    const isSubscribed =
      consent === "SUBSCRIBED" &&
      !isGloballySuppressed;

    const email = profile?.attributes?.email ?? null;
    const profileId = profile?.id ?? null;

    console.log("Klaviyo profile verification", {
      profileFound: true,
      consent,
      isGloballySuppressed,
      listSuppressionCount: listSuppressions.length,
      isSubscribed,
    });

    return data(
      {
        ok: true,
        validProfile: true,
        isSubscribed,
        profileId,
        email,
      },
      {
        headers: corsHeaders,
      },
    );
  } catch (error) {
    console.error("Klaviyo profile verification error", error);

    return data(
      {
        ok: false,
        validProfile: false,
        isSubscribed: false,
        error: String(error),
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
}

function escapeFilterValue(value) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"');
}