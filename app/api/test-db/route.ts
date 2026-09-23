import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await pool.query('SELECT NOW()');
    return NextResponse.json({ 
      success: true, 
      timestamp: result.rows[0] 
    });
  } catch (error) {
    console.error('Error de conexión:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo conectar a la base de datos' },
      { status: 500 }
    );
  }
}