import { Client } from "pg";
import { NextResponse, NextRequest } from "next/server";

// POST Route
export async function POST(request: NextRequest, { params }: { params: Promise<{id: number}> }): Promise<NextResponse> {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    const { id } = await params;

    try {
        const { user, code, diagnosis, treatment, observations, payment } = await request.json();

        const timestamp = new Date().toISOString();

        await client.connect();

        // -------------------------------------------------------------------------------------------

        const recordResult = await client.query(`SELECT id FROM historias WHERE codigo = $1`, [id]);

        if (recordResult.rowCount === 0) {
            return NextResponse.json({ error: "Record not found" }, { status: 404 });
        }

        const recordID = recordResult.rows[0].id;

        // -------------------------------------------------------------------------------------------

        const dentistResult = await client.query(`
            SELECT
                o.id
            FROM usuarios u
            LEFT JOIN odontologos o ON o.id = u.odontologo_id
            WHERE u.usuario = $1
        `, [user])

        if (dentistResult.rowCount === 0) {
            return NextResponse.json({ error: "Dentist not found" }, { status: 404 });
        }

        const dentistID = dentistResult.rows[0].id;

        // -------------------------------------------------------------------------------------------

        const consultationResult = await client.query(
            `INSERT INTO consultas (
                historia_id,
                odontologo_id,
                codigo,
                fecha,
                observaciones,
                monto_total,
                diagnostico,
                tratamiento
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id`,
            [recordID, dentistID, code, timestamp, observations, payment.totalAmount, diagnosis, treatment]
        );

        const consultationID = consultationResult.rows[0].id;

        // -------------------------------------------------------------------------------------------

        const patientResult = await client.query(`SELECT paciente_id AS id FROM historias WHERE id = $1`, [recordID])

        const patientID = patientResult.rows[0].id;

        // -------------------------------------------------------------------------------------------

        if (payment.paidAmount && payment.paidAmount > 0) {
            await client.query(`
                INSERT INTO pagos (
                    paciente_id,
                    consulta_id,
                    monto,
                    fecha,
                    metodo,
                    referencia
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id`,
                [patientID, consultationID, payment.paidAmount, timestamp, payment.method, payment.reference]
            );
        }

        // -------------------------------------------------------------------------------------------

        await client.query(`
            DELETE FROM 
                diagnostico_tratamiento 
            WHERE historia_id = $1
        `, [recordID]);

        // -------------------------------------------------------------------------------------------

        return NextResponse.json({ message: "OK" }, {status: 201 });
    } catch (error) {
        console.error("Error inserting consultation:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    } finally {
        await client.end();
    }
}