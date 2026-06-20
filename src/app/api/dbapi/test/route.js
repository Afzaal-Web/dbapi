/**
 * DBAPI Connectivity Test Endpoint
 * Use this to diagnose connection issues to DBAPI
 */

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const dbapiUrl = searchParams.get('url') || process.env.NEXT_PUBLIC_DBAPI_URL || "http://192.168.0.155/Web/DBAPI/ProcessRequest";

        console.log(`Testing connectivity to: ${dbapiUrl}`);

        const startTime = Date.now();
        const response = await fetch(dbapiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "ActionCode=TEST&PageName=TEST&ClientIP=::1&JsonReq={}&Notes=1",
        });
        const endTime = Date.now();
        const responseText = await response.text();

        return new Response(
            JSON.stringify({
                success: true,
                url: dbapiUrl,
                status: response.status,
                statusText: response.statusText,
                responseTime: `${endTime - startTime}ms`,
                responsePreview: responseText.substring(0, 500),
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    } catch (error) {
        console.error("Connectivity Test Error:", error);

        let diagnosis = "Connection failed - ";
        if (error.message.includes("fetch failed") || error.code === "ECONNREFUSED") {
            diagnosis += "Server is refusing the connection. Check if DBAPI is running.";
        } else if (error.message.includes("getaddrinfo")) {
            diagnosis += "Cannot resolve the hostname/IP. Check the URL.";
        } else if (error.message.includes("ETIMEDOUT")) {
            diagnosis += "Connection timed out. Server may be unresponsive.";
        } else if (error.message.includes("ENOTFOUND")) {
            diagnosis += "Host not found. Check the IP address or hostname.";
        }

        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
                code: error.code,
                diagnosis: diagnosis,
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
