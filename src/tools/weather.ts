import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * The "external API" pattern: call a third-party service, shape the result
 * into something an LLM reads well, and fail with a useful message.
 * Open-Meteo needs no API key, so this example runs with zero setup.
 */

interface GeoHit {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

interface ForecastResponse {
  current?: {
    temperature_2m?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max?: number[];
  };
}

export function registerWeatherTool(server: McpServer): void {
  server.registerTool(
    "get_weather",
    {
      title: "Get weather forecast",
      description:
        "Current conditions and up to a 7-day forecast for any location. Uses Open-Meteo — no API key required.",
      inputSchema: {
        location: z.string().min(1).describe("Place name, e.g. 'Austin, TX' or 'Paris, France'"),
        days: z.number().int().min(1).max(7).default(1).describe("Number of forecast days (1-7)"),
      },
    },
    async ({ location, days = 1 }) => {
      // 1. Geocode the place name to coordinates.
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
      const geo = (await fetch(geoUrl).then((r) => r.json())) as { results?: GeoHit[] };

      const hit = geo.results?.[0];
      if (!hit) {
        throw new Error(`No location found for "${location}". Try a plain city name.`);
      }

      const label = [hit.name, hit.admin1, hit.country].filter(Boolean).join(", ");

      // 2. Fetch the forecast for those coordinates.
      const forecastUrl =
        `https://api.open-meteo.com/v1/forecast?latitude=${hit.latitude}&longitude=${hit.longitude}` +
        `&current=temperature_2m,wind_speed_10m` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
        `&timezone=auto&forecast_days=${days}`;
      const forecast = (await fetch(forecastUrl).then((r) => r.json())) as ForecastResponse;

      // 3. Compose text an LLM (and a human) can read at a glance.
      const lines: string[] = [];
      const c = forecast.current;
      if (c?.temperature_2m !== undefined) {
        lines.push(
          `Now in ${label}: ${Math.round(c.temperature_2m)}°C, wind ${Math.round(c.wind_speed_10m ?? 0)} km/h`,
        );
      }
      const d = forecast.daily;
      if (d?.time) {
        for (let i = 0; i < d.time.length; i++) {
          const rain = d.precipitation_probability_max?.[i] ?? 0;
          lines.push(
            `${d.time[i]}: ${Math.round(d.temperature_2m_min[i])}–${Math.round(d.temperature_2m_max[i])}°C, ${rain}% chance of rain`,
          );
        }
      }

      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    },
  );
}