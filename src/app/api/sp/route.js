/**
 * Stored Procedure Route
 * Calls MySQL stored procedure for DBAPI requests
 */

import mysql from 'mysql2/promise';

export async function POST(request) {
    let connection;
    try {
        const body = await request.json();
        const { jHeader, jMetaData, jData } = body;

        if (!jData) {
            return new Response(
                JSON.stringify({
                    status: "Error",
                    text: "jData parameter is required",
                    success: false,
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Create MySQL connection
        connection = await mysql.createConnection({
            host: 'localhost',
            port: 3307,
            user: 'root',
            password: 'azs1234',
            database: 'testdb',
        });

        // Prepare the stored procedure call
        // Adjust the SP name and parameters based on your actual SP structure
        const SPName = 'sp_ProcessRequest'; // Change this to your actual SP name
        const jsonPayload = JSON.stringify({ jHeader, jMetaData, jData });

        console.log("Calling SP:", SPName);
        console.log("Payload:", jsonPayload.substring(0, 200));

        // Call stored procedure
        // This assumes your SP accepts a JSON parameter
        // Adjust the call syntax based on your SP definition
        const [results] = await connection.execute(
            `CALL ${SPName}(?)`,
            [jsonPayload]
        );

        console.log("SP Results:", results);

        return new Response(
            JSON.stringify({
                status: "Success",
                data: results[0] || results,
                success: true,
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        console.error("SP Error:", error);

        return new Response(
            JSON.stringify({
                status: "Error",
                text: error.message || "Stored procedure execution failed",
                details: {
                    name: error.name,
                    code: error.code,
                    message: error.message,
                },
                success: false,
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}
