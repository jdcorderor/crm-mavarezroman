import { Client } from "pg";
import { NextResponse, NextRequest } from "next/server";

// POST Route
export async function POST(request: NextRequest, { params }: { params: Promise<{id: number}> }): Promise<NextResponse> {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    const { id } = await params;

    try {
        const { consultation, payment } = await request.json();

        const timestamp = new Date().toISOString();

        await client.connect();

        // -------------------------------------------------------------------------------------------

        const patientResult = await client.query(`SELECT paciente_id AS id FROM historias WHERE codigo = $1`, [id]);

        if (patientResult.rowCount === 0) {
            return NextResponse.json({ error: "Patient not found" }, { status: 404 });
        }

        const patientID = patientResult.rows[0].id;

        // -------------------------------------------------------------------------------------------

        await client.query(
            "INSERT INTO pagos (paciente_id, consulta_id, monto, fecha, metodo, referencia) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *", 
            [patientID, consultation, payment.amount, timestamp, payment.method, payment.reference]
        )

        return NextResponse.json({ message: "OK" }, {status: 201 });
    } catch (error) {
        console.error("Error inserting consultation:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    } finally {
        await client.end();
    }
}