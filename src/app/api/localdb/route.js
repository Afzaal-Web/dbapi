/**
 * Local Database Route
 * Connects to local MySQL database for testing
 */

import mysql from 'mysql2/promise';

export async function POST(request) {
    let connection;
    try {
        const body = await request.json();
        const { query, params = [] } = body;

        if (!query) {
            return new Response(
                JSON.stringify({
                    status: "Error",
                    text: "Query parameter is required",
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

        console.log("Local DB Query:", query);

        // Execute query
        const [results] = await connection.execute(query, params);

        console.log("Local DB Results:", results);

        return new Response(
            JSON.stringify({
                status: "Success",
                data: results,
                success: true,
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        console.error("Local DB Error:", error);

        return new Response(
            JSON.stringify({
                status: "Error",
                text: error.message || "Database connection failed",
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
