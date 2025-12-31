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
                p.id,
                p.consulta_id,
                CONCAT(pac.nombre, ' ', pac.apellido) AS paciente,
                c.codigo,
                p.monto,
                p.metodo,
                p.referencia,
                p.fecha
            FROM historias h
            LEFT JOIN pacientes pac ON pac.id = h.paciente_id
            LEFT JOIN consultas c ON c.historia_id = h.id
            JOIN pagos p ON p.consulta_id = c.id
            WHERE h.codigo = $1;
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

// DELETE Route
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: number }> }): Promise<NextResponse> {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    const { id } = await params;

    try {
        await client.connect();

        const paymentQuery = `DELETE FROM pagos WHERE id = $1;`;

        const result = await client.query(paymentQuery, [id]);

        if (result.rowCount === 0) {
        return NextResponse.json({ message: "Payment not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Payment deleted succesfully" });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error al eliminar consulta:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    } finally {
        await client.end();
    }
}