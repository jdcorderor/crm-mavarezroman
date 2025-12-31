import { Client } from "pg";
import { NextResponse } from "next/server";

// GET Route
export async function GET(): Promise<NextResponse> {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();

        const queryA = `
            SELECT
                SUM(p.monto) AS total_pagado
            FROM pagos p
            WHERE p.fecha >= CURRENT_DATE - INTERVAL '30 days';
        `;

        const resultA = await client.query(queryA, []);
        const statA = resultA.rows[0]?.total_pagado ?? 0;

        const queryB = `
            SELECT
                (SELECT SUM(c.monto_total) FROM consultas c) AS total_consultas,
                (SELECT SUM(p.monto) FROM pagos p) AS total_pagado;
        `;

        const resultB = await client.query(queryB, []);
        const statB = ((resultB.rows[0]?.total_consultas ?? 0) - (resultB.rows[0]?.total_pagado ?? 0));

        const queryC = `
            WITH consultas_por_historia AS (
                SELECT
                    historia_id,
                    SUM(monto_total) AS total_consultas
                FROM consultas
                GROUP BY historia_id
            ),

            pagos_por_historia AS (
                SELECT
                    c.historia_id,
                    SUM(p.monto) AS total_pagos
                FROM consultas c
                JOIN pagos p ON p.consulta_id = c.id
                GROUP BY c.historia_id
            ),

            totales_por_paciente AS (
                SELECT
                    h.id AS historia_id,
                    COALESCE(cph.total_consultas, 0) AS total_consultas,
                    COALESCE(pph.total_pagos, 0) AS total_pagos
                FROM historias h
                LEFT JOIN consultas_por_historia cph ON cph.historia_id = h.id
                LEFT JOIN pagos_por_historia pph ON pph.historia_id = h.id
            ),

            conteos AS (
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE total_pagos < total_consultas) AS con_deuda
                FROM totales_por_paciente
            )

            SELECT
                CASE
                    WHEN total = 0 THEN 0
                    ELSE con_deuda * 100.0 / total
                END AS porcentaje_con_deuda
            FROM conteos;
        `;

        const resultC = await client.query(queryC, []);
        const statC = resultC.rows[0]?.porcentaje_con_deuda ?? 0;
        return NextResponse.json({ totalIncome: statA, pendingToPay: statB, debtPercentage: statC });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: error }, { status: 500 });
    } finally {
        await client.end();
    }
}