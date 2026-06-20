function safeJsonParse(value) {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function findFlightsDeep(obj) {
  if (!obj) return [];

  if (typeof obj === "string") {
    const parsed = safeJsonParse(obj);
    if (parsed !== obj) return findFlightsDeep(parsed);
    return [];
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findFlightsDeep(item);
      if (found.length) return found;
    }
    return [];
  }

  if (typeof obj === "object") {
    if (obj.Flight) {
      return Array.isArray(obj.Flight) ? obj.Flight : [obj.Flight];
    }

    if (obj.FlightViewResults?.Flight) {
      const flight = obj.FlightViewResults.Flight;
      return Array.isArray(flight) ? flight : [flight];
    }

    for (const key of Object.keys(obj)) {
      const found = findFlightsDeep(obj[key]);
      if (found.length) return found;
    }
  }

  return [];
}

export async function POST(request) {
  try {
    const body = await request.json();

    const {
      flightViewUrl = process.env.NEXT_PUBLIC_API_FLIGHTVIEW_URL_DEVP,
      JsonReq,
    } = body || {};

    let jsonReqObj = typeof JsonReq === "string" ? JSON.parse(JsonReq) : JsonReq;
    const jData = jsonReqObj?.JData || {};

    const params = new URLSearchParams({
      "1": "1",
      RESP: "JSON",
    });

    if (jData.FlightID) params.append("ACID", String(jData.FlightID));
    if (jData.DepartureAirport) params.append("DEPAP", String(jData.DepartureAirport));
    if (jData.DepartureDate) params.append("DEPDATE", String(jData.DepartureDate));
    if (jData.DepartureHour) params.append("DEPHR", String(jData.DepartureHour));
    if (jData.ArrivalAirport) params.append("ARRAP", String(jData.ArrivalAirport));
    if (jData.ArrivalDate) params.append("ARRDATE", String(jData.ArrivalDate));
    if (jData.ArrivalHour) params.append("ARRHR", String(jData.ArrivalHour));
    if (jData.Airline) params.append("AL", String(jData.Airline));
    if (jData.SimpleStatus) params.append("SIMPLESTATUS", String(jData.SimpleStatus));

    const url = flightViewUrl.trim();
    const requestUrl = `${url}${url.includes("?") ? "&" : "?"}${params.toString()}`;

    const response = await fetch(requestUrl);
    const responseText = await response.text();
    const parsedResponse = safeJsonParse(responseText);

    const flights = findFlightsDeep(parsedResponse);

    const jDataRows = flights.map((flight) => ({
      AirlineCode: flight?.FlightId?.CommercialAirline?.AirlineId?.AirlineCode || "",
      AirlineName: flight?.FlightId?.CommercialAirline?.AirlineName || "",
      FlightNum: flight?.FlightId?.FlightNumber || "",
      GoingToCity: flight?.Arrival?.Airport?.AirportLocation?.CityName || "",
      ArrivingFromCity: flight?.Departure?.Airport?.AirportLocation?.CityName || "",
    }));

    return Response.json({
      status: `${response.status} ${response.statusText}`,
      success: response.ok,
      text: {
        JHeader: {
          ActionCode: response.ok ? "000" : "999",
          Message: `Success - Flights Found: ${jDataRows.length}`,
          SysVersion: "1.0.0",
        },
        JMetaData: {
          Headings: [
            ["AirlineCode", "Airline Code"],
            ["AirlineName", "Airline Name"],
            ["FlightNum", "Flight Num"],
            ["GoingToCity", "Going To City"],
            ["ArrivingFromCity", "Arriving From City"],
          ],
        },
        JData: jDataRows,
      },
    });
  } catch (error) {
    return Response.json(
      {
        status: "Error",
        success: false,
        text: {
          JHeader: {
            ActionCode: "999",
            Message: error?.message || "Unknown error",
            SysVersion: "1.0.0",
          },
          JMetaData: {},
          JData: [],
        },
      },
      { status: 500 }
    );
  }
}