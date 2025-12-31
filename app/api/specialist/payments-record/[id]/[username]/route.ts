import { Client } from "pg";
import { NextResponse, NextRequest } from "next/server";

// GET Route
export async function GET(request: NextRequest, { params }: { params: Promise<{id: number, username: string}> }): Promise<NextResponse> {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    const { id, username } = await params;

    try {
        await client.connect();

        const dentistResult = await client.query("SELECT odontologo_id FROM usuarios WHERE usuario = $1", [username]);

        const dentistID = dentistResult.rows[0].odontologo_id;

        const query = `
            SELECT
                c.id,
                c.codigo,
                c.fecha,
                CONCAT(o.nombre, ' ', o.apellido) AS especialista,
                c.monto_total,
                (
                    SELECT array_agg(json_build_object('monto', p.monto, 'metodo', p.metodo, 'referencia', p.referencia, 'fecha', p.fecha))
                    FROM pagos p
                    WHERE p.consulta_id = c.id
                ) AS pagos
            FROM historias h
            INNER JOIN consultas c ON c.historia_id = h.id
            LEFT JOIN odontologos o ON c.odontologo_id = o.id
            WHERE h.codigo = $1 AND c.odontologo_id = $2
            ORDER BY c.fecha DESC;
        `;

        const results = await client.query(query, [id, dentistID]);

        return NextResponse.json(results.rows);
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: error }, { status: 500 });
    } finally {
        await client.end();
    }
}