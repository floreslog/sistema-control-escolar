"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type DashboardData = {
  kpis: {
    total_grupos: number;
    total_alumnos: number;
    promedio_general: number;
    porcentaje_aprobacion: number;
  };
  estados: { estado: string; total: number }[];
  materias: {
    materia: string;
    total_inscritos: number;
    reprobados: number;
    pct_reprobacion: number;
  }[];
};

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b"];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/login";
          return null;
        }
        const json = await res.json();
        if (!json.success) {
          setError(json.error ?? "Error desconocido");
          return null;
        }
        return json;
      })
      .then((json) => {
        if (json) setData(json);
      })
      .catch(() => setError("No se pudo conectar con el servidor"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-6">Cargando dashboard...</p>;
  if (error) return <p className="p-6 text-red-500">Error: {error}</p>;
  if (!data) return <p className="p-6 text-red-500">No se pudo cargar el dashboard.</p>;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Grupos activos" value={data.kpis.total_grupos} />
        <KpiCard label="Alumnos totales" value={data.kpis.total_alumnos} />
        <KpiCard label="Promedio general" value={data.kpis.promedio_general} />
        <KpiCard label="% Aprobación" value={`${data.kpis.porcentaje_aprobacion}%`} />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Gráfica de pastel: distribución por estado */}
        <div>
          <h2 className="font-semibold mb-2">Distribución por estado</h2>
          {data.estados.length === 0 ? (
            <p className="text-sm text-gray-500">Sin datos todavía.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.estados}
                  dataKey="total"
                  nameKey="estado"
                  outerRadius={90}
                  label
                >
                  {data.estados.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Gráfica de barras: reprobación por materia */}
        <div>
          <h2 className="font-semibold mb-2">% No aprobacion por materia</h2>
          {data.materias.length === 0 ? (
            <p className="text-sm text-gray-500">Sin datos todavía.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.materias}>
                <XAxis dataKey="materia" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="pct_no_aprobacion" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white shadow rounded-lg p-4 text-center">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}