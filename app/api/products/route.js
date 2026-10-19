import { NextResponse } from 'next/server';
import { ensureSchema, getPool } from '@/lib/db';

// GET /api/products -> list all products
export async function GET() {
  try {
    await ensureSchema();
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.description, p.price, p.created_at,
              COALESCE(s.quantity, 0) AS quantity
       FROM products p
       LEFT JOIN stocks s ON s.product_id = p.id
       ORDER BY p.id DESC`
    );
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/products -> create a new product
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, description, price, quantity = 0 } = body;

    if (!name || price === undefined || price === '') {
      return NextResponse.json(
        { error: 'Field "name" and "price" wajib diisi' },
        { status: 400 }
      );
    }

    if (
      quantity === null ||
      quantity === '' ||
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) < 0
    ) {
      return NextResponse.json(
        { error: 'Stok harus berupa bilangan bulat lebih dari atau sama dengan 0' },
        { status: 400 }
      );
    }

    await ensureSchema();
    const pool = getPool();
    const connection = await pool.getConnection();
    let result;
    try {
      await connection.beginTransaction();
      const [productResult] = await connection.query(
        'INSERT INTO products (name, description, price) VALUES (?, ?, ?)',
        [name, description || null, price]
      );
      result = productResult;
      await connection.query(
        'INSERT INTO stocks (product_id, quantity) VALUES (?, ?)',
        [result.insertId, Number(quantity)]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return NextResponse.json(
      { id: result.insertId, name, description, price, quantity: Number(quantity) },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
