/**
 * DBAPI Proxy Route
 * Backend endpoint that forwards requests to DBAPI to avoid CORS issues
 */

export async function POST(request) {
    try {
        const body = await request.json();

        // Extract DBAPI fields from request - per developer spec
        const {
            ActionCode,
            ViewName,
            ClientIP = "::1",
            JsonReq,
            Notes = "",
            dbapiUrl = process.env.NEXT_PUBLIC_DBAPI_DEV_URL,
        } = body;

        // Validate required parameters - DBAPI doesn't accept null values
        if (!ActionCode || String(ActionCode).trim() === "") {
            throw new Error("ActionCode is required and cannot be empty");
        }
        if (!ViewName || String(ViewName).trim() === "") {
            throw new Error("ViewName is required and cannot be empty");
        }
        if (!ClientIP || String(ClientIP).trim() === "") {
            throw new Error("ClientIP is required and cannot be empty");
        }
        if (!JsonReq) {
            throw new Error("JsonReq is required - provide a valid JSON payload with JHeader, JMetaData, and JData");
        }

        // Ensure all string values are trimmed
        const actionCode = String(ActionCode).trim();
        const viewName = String(ViewName).trim();
        const clientIP = String(ClientIP).trim();
        const notes = String(Notes).trim();

        // Validate all required fields are non-empty strings
        if (!actionCode) throw new Error("ActionCode resulted in empty string");
        if (!viewName) throw new Error("ViewName resulted in empty string");
        if (!clientIP) throw new Error("ClientIP resulted in empty string");

        // Build the JSON payload for DBAPI
        const jsonPayload = {
            ActionCode: actionCode,
            ViewName: viewName,
            ClientIP: clientIP,
            JsonReq: JsonReq, // Should be an object with JHeader, JMetaData, JData
            Notes: notes,
        };

        const jsonBody = `'${JSON.stringify(jsonPayload)}'`;

        console.log("DBAPI JSON Request:", {
            url: dbapiUrl,
            ActionCode: actionCode,
            ViewName: viewName,
            ClientIP: clientIP,
            bodyPreview: jsonBody.substring(0, 200),
        });

        // Make request to DBAPI with JSON body wrapped in single quotes as string
        const response = await fetch(dbapiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
            body: jsonBody,
        });

        const responseText = await response.text();

        console.log("DBAPI Response Status:", response.status, response.statusText);

        return new Response(
            JSON.stringify({
                status: `${response.status} ${response.statusText}`,
                text: responseText,
                success: response.ok,
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    } catch (error) {
        console.error("DBAPI Proxy Error:", error);

        let errorMessage = error.message || "Unknown error";
        let errorDetails = {
            name: error.name,
            code: error.code,
            message: errorMessage,
        };

        // Provide more specific error information
        if (errorMessage.includes("fetch failed") || errorMessage.includes("ECONNREFUSED")) {
            errorMessage = `Cannot connect to DBAPI endpoint. Check if the server is running at the specified URL and is accessible from this network.`;
        } else if (errorMessage.includes("getaddrinfo")) {
            errorMessage = `DNS resolution failed. Check if the IP address/hostname is correct.`;
        } else if (errorMessage.includes("ETIMEDOUT")) {
            errorMessage = `Connection timeout. The endpoint may be slow or unreachable.`;
        }

        return new Response(
            JSON.stringify({
                status: "Error",
                text: errorMessage,
                details: errorDetails,
                success: false,
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    }
}