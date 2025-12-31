import { Client } from "pg";
import { NextResponse, NextRequest } from "next/server";

// GET Route
export async function GET(request: NextRequest, { params }: { params: Promise<{id: number}> }): Promise<NextResponse> {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    const { id } = await params;

    try {
        await client.connect();

        const query = `
            SELECT
                c.id,
                c.codigo,
                c.fecha,
                CONCAT(o.nombre, ' ', o.apellido) AS especialista,
                c.diagnostico,
                c.tratamiento,
                c.observaciones,
                c.monto_total,
                COALESCE(SUM(p.monto), 0) AS monto_pagado
            FROM historias h
            INNER JOIN consultas c ON c.historia_id = h.id
            LEFT JOIN odontologos o ON c.odontologo_id = o.id
            LEFT JOIN pagos p ON p.consulta_id = c.id
            WHERE h.codigo = $1
            GROUP BY
                c.id,
                c.codigo,
                c.fecha,
                o.nombre,
                o.apellido,
                c.diagnostico,
                c.tratamiento,
                c.observaciones,
                c.monto_total
            ORDER BY c.fecha DESC;
        `;

        const results = await client.query(query, [id]);

        return NextResponse.json(results.rows);
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: error }, { status: 500 });
    } finally {
        await client.end();
    }
}