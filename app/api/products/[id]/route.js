import { NextResponse } from 'next/server';
import { ensureSchema, getPool } from '@/lib/db';

// GET /api/products/:id -> get one product
export async function GET(request, { params }) {
  try {
    await ensureSchema();
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT p.*, COALESCE(s.quantity, 0) AS quantity
       FROM products p
       LEFT JOIN stocks s ON s.product_id = p.id
       WHERE p.id = ?`,
      [params.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/products/:id -> update a product
export async function PUT(request, { params }) {
  try {
    const body = await request.json();
    const { name, description, price, quantity } = body;

    if (!name || price === undefined || price === '') {
      return NextResponse.json(
        { error: 'Field "name" dan "price" wajib diisi' },
        { status: 400 }
      );
    }

    if (
      quantity !== undefined &&
      (quantity === null ||
        quantity === '' ||
        !Number.isInteger(Number(quantity)) ||
        Number(quantity) < 0)
    ) {
      return NextResponse.json(
        { error: 'Stok harus berupa bilangan bulat lebih dari atau sama dengan 0' },
        { status: 400 }
      );
    }

    await ensureSchema();
    const pool = getPool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [products] = await connection.query(
        'SELECT id FROM products WHERE id = ? FOR UPDATE',
        [params.id]
      );

      if (products.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'Produk tidak ditemukan' },
          { status: 404 }
        );
      }

      await connection.query(
        'UPDATE products SET name = ?, description = ?, price = ? WHERE id = ?',
        [name, description || null, price, params.id]
      );

      if (quantity !== undefined) {
        await connection.query(
          `INSERT INTO stocks (product_id, quantity) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`,
          [params.id, Number(quantity)]
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return NextResponse.json({
      id: Number(params.id),
      name,
      description,
      price,
      ...(quantity !== undefined && { quantity: Number(quantity) }),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/products/:id -> delete a product
export async function DELETE(request, { params }) {
  try {
    await ensureSchema();
    const pool = getPool();
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [
      params.id,
    ]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
