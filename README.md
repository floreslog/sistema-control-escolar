<div align="center">

# Sistema de Control Escolar

**Plataforma web para gestionar grupos, inscripciones y calificaciones.**
Los docentes capturan; los alumnos consultan. Con SQL puro, hashes y autenticación propia.

![Next.js](https://img.shields.io/badge/Next.js-16.3-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

![Licencia MIT](https://img.shields.io/badge/Licencia-MIT-green?style=flat-square)
![Estado](https://img.shields.io/badge/Estado-Estable-green?style=flat-square)

</div>

---

## Descripción

Sistema web de **control escolar** donde los **docentes** crean grupos, inscriben alumnos a materias y capturan calificaciones parciales y extraordinarias, mientras que los **alumnos** consultan su avance, promedios y kardex en tiempo real.

Es un monolito construido con **Next.js** y **PostgreSQL**, con consultas en **SQL crudo** (driver `pg`), para tener control total de las consultas SQL.

---

## Características

### Panel del docente
- **Inicio:** KPIs, alertas, barra de estados y tabla por materia (solo ciclos activos).
- **Mis grupos:** crear grupos, agregar alumnos (con búsqueda, filtros y paginación) y decidir qué alumnos cursan cada materia.
- **Calificaciones:** captura tipo tabla por materia, con celdas vacías = pendiente (nunca 0).
- **Extraordinarios:** enviar alumnos a extraordinario y capturar calificación y fecha de examen.
- **Alumnos:** lista con búsqueda y filtro por grupo, kardex individual y restablecimiento de contraseña.

### Panel del alumno
- Consulta de materias, parciales, promedio y estado.
- Kardex completo.
- Primer acceso: el alumno crea su propia contraseña.

### Autenticación y seguridad
- Login por **número de empleado** (docente) o **matrícula** (alumno).
- Sesión con **JWT** en cookie `httpOnly`.
- **Contraseñas y respuestas de seguridad almacenadas únicamente como hash** (bcrypt); nunca se guarda texto plano.
- Recuperación de contraseña mediante pregunta de seguridad.
- **Rate limiting** por IP y bloqueo temporal de cuenta tras intentos fallidos.
- Indicador de fortaleza de contraseña.

---

## Capturas de pantalla

> Guarda las imágenes en `docs/capturas/` y reemplaza cada marcador por `![Descripción](docs/capturas/nombre.png)`.

### Inicio de sesión

AQUI VA CAPTURA DE LOGIN

### Recuperación de contraseña

AQUI VA CAPTURA DE RECUPERACION DE CONTRASEÑA

### Panel del docente: inicio

AQUI VA CAPTURA DE INICIO DEL DOCENTE (KPIs, alertas y barra de estados)

### Panel del docente: mis grupos

AQUI VA CAPTURA DE LISTA DE GRUPOS Y DETALLE DE UN GRUPO

### Panel del docente: agregar alumnos al grupo

AQUI VA CAPTURA DE BUSQUEDA Y AGREGADO DE ALUMNOS

### Panel del docente: captura de calificaciones

AQUI VA CAPTURA DE LA TABLA DE CAPTURA DE CALIFICACIONES

### Panel del docente: extraordinarios

AQUI VA CAPTURA DE EXTRAORDINARIOS

### Panel del docente: kardex de un alumno

AQUI VA CAPTURA DE KARDEX VISTO POR EL DOCENTE

### Panel del alumno: inicio

AQUI VA CAPTURA DE INICIO DEL ALUMNO

### Panel del alumno: kardex

AQUI VA CAPTURA DE KARDEX DEL ALUMNO

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|------|------------|---------|
| Framework | [Next.js](https://nextjs.org/) (App Router, monolito) | 16.3.6 |
| UI | [React](https://react.dev/) | 19.2.8 |
| Lenguaje | [TypeScript](https://www.typescriptlang.org/) | 5 |
| Base de datos | [PostgreSQL](https://www.postgresql.org/) con [`pg`](https://node-postgres.com/) (SQL crudo, sin ORM) | 12+ / pg 8.23 |
| Estilos | [Tailwind CSS](https://tailwindcss.com/) | 4 |
| Sesiones (JWT) | [`jose`](https://github.com/panva/jose) | 6.2 |
| Hash de contraseñas | [`bcryptjs`](https://github.com/dcodeIO/bcrypt.js) | 3.0 |
| Validación | [Zod](https://zod.dev/) | 4.6 |

---

## Arquitectura

```
Cliente  ->  Middleware (rol)  ->  Server Component / Server Action
                                        |
                              requireDocente() / requireAlumno()
                                        |
                              queries.ts / mutations.ts
                                        |
                                  PostgreSQL (pg)
```

**Principios de diseño**

- **Server components** para lectura; **Server Actions** con `useActionState` para escritura.
- **Capa de datos separada:** `queries.ts` (lecturas) y `mutations.ts` (escrituras, con transacciones `BEGIN/COMMIT` cuando hay varios pasos).
- **Doble barrera de rol:** el `middleware.ts` protege `/docente/*` y `/alumno/*`; además cada página y Server Action vuelve a verificar la sesión.
- **Consultas siempre parametrizadas** (`$1`, `$2`...). Nunca se concatenan valores del usuario.
- El `DocenteID` **siempre** sale de la sesión, nunca del cliente. La propiedad se comprueba dentro de la propia query y un id ajeno responde `404`, sin revelar si existe.

---

## Reglas de negocio

- Escala de **0 a 10**; la calificación mínima aprobatoria y el número de parciales son configurables.
- Un parcial vacío es **pendiente** (`NULL`), no 0.
- Si hay extraordinario registrado, el ordinario queda cerrado.
- Calificaciones y extraordinarios **solo se editan en ciclos activos**, y solo la última oportunidad extraordinaria.
- No se puede quitar a un alumno con calificaciones, ni una materia con inscritos, ni a un alumno del grupo si sigue inscrito en materias.

**Autorización**

| Acción | Quién puede |
|--------|-------------|
| Ver/gestionar un grupo, agregar o quitar alumnos y materias | Titular del grupo |
| Inscribir y calificar | Docente que imparte la materia |
| Ver a un alumno | Docente con el alumno en un grupo suyo o inscrito en una materia suya |
| Kardex (vista docente) | Solo las materias que ese docente imparte |

---

## Seguridad

- **Datos sensibles cifrados con hash:** las contraseñas (bcrypt, 12 rondas) y las respuestas de seguridad (bcrypt, 10 rondas, normalizadas a minúsculas y sin espacios sobrantes) se guardan solo como hash. No es posible recuperarlas desde la base de datos.
- Sesión en cookie `httpOnly`, `sameSite=lax` y `secure` en producción.
- Doble capa de *rate limiting*: por IP (en memoria) y por cuenta (bloqueo de 15 minutos tras 5 intentos fallidos).
- Validación de entradas con Zod en cada Server Action.
- Consultas parametrizadas contra inyección SQL.

---

## Instalación

### Requisitos

- Node.js 20 o superior
- PostgreSQL 12 o superior
- npm, pnpm o yarn

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/<tu-usuario>/<tu-repositorio>.git
cd <tu-repositorio>

# 2. Instalar dependencias
npm install

# 3. Crear la base de datos
psql -U postgres -c "CREATE DATABASE controlcalificaciones;"

# 4. Cargar el esquema
psql -U postgres -d controlcalificaciones -f estructura_completa_postgresql.sql

# 5. Configurar variables de entorno (ver abajo)

# 6. Ejecutar en desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación para producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | Análisis con ESLint |

### Variables de entorno

Crea un archivo `.env.local` en la raíz:

```env
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/controlcalificaciones
JWT_SECRET=una-cadena-larga-aleatoria-y-secreta
```

> Genera un secreto robusto, por ejemplo con `openssl rand -base64 48`.

### Datos de ejemplo

El script SQL incluye un docente y un alumno de prueba para desarrollo. **Elimínalos o cambia sus credenciales antes de cualquier despliegue.**

---

## Estructura del proyecto

```
├── app/
│   ├── alumno/              # Panel del alumno
│   ├── docente/             # Panel del docente
│   │   ├── grupos/          # Grupos, alumnos y materias
│   │   ├── calificaciones/  # Captura de parciales
│   │   ├── extraordinarios/ # Gestión de extraordinarios
│   │   └── alumnos/         # Lista, kardex y restablecer contraseña
│   └── ...                  # Login y recuperación de contraseña
├── components/              # AppShell, PageHeader, EstadoBadge, estilos.ts, ...
├── docs/
│   └── capturas/            # Imágenes del README
├── lib/
│   ├── db.ts                # Pool de conexiones pg
│   ├── auth.ts              # JWT, bcrypt, cookies de sesión
│   ├── rateLimit.ts         # Límite por IP y bloqueo de cuenta
│   ├── passwordStrength.ts  # Fortaleza de contraseña
│   ├── alumno/              # Capa de datos del alumno
│   └── docente/             # Capa de datos del docente
├── middleware.ts            # Protección de rutas por rol
└── estructura_completa_postgresql.sql
```

---

## Licencia

Distribuido bajo la licencia **MIT**. Consulta el archivo [`LICENSE`](./LICENSE) para más información.

---
