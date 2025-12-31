import { Client } from "pg";
import { NextResponse } from "next/server";

// GET Route
export async function GET() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();

        const query = `
            WITH consultas_agrupadas AS (
                SELECT historia_id, SUM(monto_total) AS monto_total
                FROM consultas
                GROUP BY historia_id
            )

            SELECT 
                h.codigo,
                pte.cedula,
                CONCAT(pte.nombre, ' ', pte.apellido) AS paciente,
                pte.fecha_nacimiento,
                pte.email,
                pte.telefono,
                COALESCE(ca.monto_total, 0) AS monto_total,
                COALESCE(SUM(pg.monto), 0) AS monto_pagado
            FROM pacientes pte
            LEFT JOIN historias h ON h.paciente_id = pte.id
            LEFT JOIN consultas_agrupadas ca ON ca.historia_id = h.id
            LEFT JOIN consultas c ON c.historia_id = h.id
            LEFT JOIN pagos pg ON pg.consulta_id = c.id
            GROUP BY 
                h.codigo,
                pte.cedula,
                pte.nombre,
                pte.apellido,
                pte.fecha_nacimiento,
                pte.email,
                pte.telefono,
                ca.monto_total;
        `;

        const results = await client.query(query);

        return NextResponse.json(results.rows);
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: error }, { status: 500 });
    } finally {
        await client.end();
    }
}