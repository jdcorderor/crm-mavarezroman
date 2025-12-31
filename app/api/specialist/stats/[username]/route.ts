import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

// GET Route
export async function GET(request: NextRequest, { params }: { params: Promise<{username: number}> }): Promise<NextResponse> {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();

        const { username } = await params;

        const result = await client.query("SELECT odontologo_id FROM usuarios WHERE usuario = $1", [username]);

        const id = result.rows[0]?.odontologo_id;

        if (!id) {
            return NextResponse.json({ error: 'Dentist not found' }, { status: 404 });
        }

        // -----------------------------------------------------------------

        const queryA = `
            SELECT 
                COALESCE(SUM(p.monto), 0) AS ingresos_totales_mes
            FROM odontologos o
            JOIN consultas c ON c.odontologo_id = o.id
            INNER JOIN pagos p ON p.consulta_id = c.id
            WHERE p.fecha >= CURRENT_DATE - INTERVAL '30 days' AND o.id = $1
        `;

        const resultA = await client.query(queryA, [id]);
        const statA = resultA.rows[0]?.ingresos_totales_mes ?? 0;

        // -----------------------------------------------------------------

        const queryB = `
            SELECT
                (SELECT SUM(c.monto_total)
                FROM consultas c
                WHERE c.odontologo_id = $1) AS total_consultas,

                (SELECT SUM(p.monto)
                FROM pagos p
                JOIN consultas c ON c.id = p.consulta_id
                WHERE c.odontologo_id = $1) AS total_pagado;
        `;

        const resultB = await client.query(queryB, [id]);
        const statB = (resultB.rows[0]?.total_consultas ?? 0) - (resultB.rows[0]?.total_pagado ?? 0);

        // -----------------------------------------------------------------

        const queryC = `
            SELECT COUNT(*) AS total_citas_agendadas_hoy
            FROM citas
            WHERE odontologo_id = $1 AND estado = 'confirmada' AND DATE(fecha) = CURRENT_DATE
        `;

        const resultC = await client.query(queryC, [id]);
        const statC = resultC.rows[0]?.total_citas_agendadas_hoy ?? 0;

        // -----------------------------------------------------------------

        const queryD = `
            SELECT COUNT(*) AS total_citas_agendadas_semana
            FROM citas
            WHERE odontologo_id = $1 AND estado = 'confirmada' 
            AND DATE(fecha) >= date_trunc('week', CURRENT_DATE) 
            AND DATE(fecha) < date_trunc('week', CURRENT_DATE) + interval '7 days'
        `;

        const resultD = await client.query(queryD, [id]);
        const statD = resultD.rows[0]?.total_citas_agendadas_semana ?? 0;

        // -----------------------------------------------------------------

        const queryE = `
            SELECT COUNT(*) AS citas_solicitadas
            FROM citas
            WHERE odontologo_id = $1 AND estado = 'pendiente por confirmación'
        `;

        const resultE = await client.query(queryE, [id]);
        const statE = resultE.rows[0]?.citas_solicitadas ?? 0;

        // -----------------------------------------------------------------

        const queryF = `
            SELECT COUNT(*) AS total_consultas_hoy
            FROM consultas
            WHERE odontologo_id = $1 AND DATE(fecha) = CURRENT_DATE
        `;

        const resultF = await client.query(queryF, [id]);
        const statF = resultF.rows[0]?.total_consultas_hoy ?? 0;

        // -----------------------------------------------------------------

        const queryG = `
            SELECT COUNT(*) AS total_consultas_semana
            FROM consultas
            WHERE odontologo_id = $1 
            AND DATE(fecha) >= date_trunc('week', CURRENT_DATE) 
            AND DATE(fecha) < date_trunc('week', CURRENT_DATE) + interval '7 days'
        `;

        const resultG = await client.query(queryG, [id]);
        const statG = resultG.rows[0]?.total_consultas_semana ?? 0;

        // -----------------------------------------------------------------

        const queryH = `SELECT COUNT(*) AS pacientes FROM pacientes`;

        const resultH = await client.query(queryH, []);
        const statH = resultH.rows[0]?.pacientes ?? 0;

        // -----------------------------------------------------------------

        const queryI = `
            SELECT COUNT(DISTINCT p.id) AS pacientes_atendidos 
            FROM pacientes p
            JOIN historias h ON h.paciente_id = p.id
            JOIN consultas c ON c.historia_id = h.id AND c.odontologo_id = $1
        `;

        const resultI = await client.query(queryI, [id]);
        const statI = resultI.rows[0]?.pacientes_atendidos ?? 0;

        // -----------------------------------------------------------------

        const queryJ = "SELECT nombre, apellido FROM odontologos WHERE id = $1";

        const resultJ = await client.query(queryJ, [id]);
        const statJ = resultJ.rows[0];

        return NextResponse.json({ firstName: statJ?.nombre, lastName: statJ?.apellido, totalIncomeLast30Days: statA, outstandingDebt: statB, 
            confirmedAppointmentsToday: statC, confirmedAppointmentsThisWeek: statD, pendingAppointments: statE, consultationsToday: statF, 
            consultationsThisWeek: statG, totalRegisteredPatients: statH, patientsWithConsultations: statI });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: error }, { status: 500 });
    } finally {
        await client.end();
    }
}