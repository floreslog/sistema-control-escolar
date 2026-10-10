/* ============================================================
   Sistema de Control de Calificaciones - PostgreSQL 12+
   Escala de calificaciones: 0 a 100  |  Minima aprobatoria: 70

   Uso:
     CREATE DATABASE sistemacalificaciones;
     \c sistemacalificaciones
     \i estructura_completa_postgresql.sql

   Credenciales de prueba:
     Docente: EMP-0001  /  docente123
     Alumno:  22022096  /  alumno123
   (los demas alumnos no tienen contrasena)
   ============================================================ */

BEGIN;

/* ---------- ESTRUCTURA ---------- */

CREATE TABLE Parametro (
    ParametroID         INT NOT NULL PRIMARY KEY DEFAULT 1,
    CalificacionMinima  NUMERIC(5,2) NOT NULL DEFAULT 70.00,
    NumParciales        SMALLINT     NOT NULL DEFAULT 3,
    CONSTRAINT CK_Parametro_UnaFila CHECK (ParametroID = 1),
    CONSTRAINT CK_Parametro_NumParciales CHECK (NumParciales >= 1),
    CONSTRAINT CK_Parametro_CalifMinima CHECK (CalificacionMinima BETWEEN 0 AND 100)
);

INSERT INTO Parametro (ParametroID) VALUES (1);

CREATE TABLE CicloEscolar (
    CicloID      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    NombreCiclo  VARCHAR(20) NOT NULL UNIQUE,
    FechaInicio  DATE NULL,
    FechaFin     DATE NULL,
    Activo       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE Oportunidad (
    OportunidadID      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    NombreOportunidad  VARCHAR(50) NOT NULL UNIQUE,
    Orden              INT NOT NULL UNIQUE
);

INSERT INTO Oportunidad (NombreOportunidad, Orden) VALUES
    ('Ordinario', 1),
    ('Primera Extraordinaria', 2),
    ('Segunda Extraordinaria', 3);

CREATE TABLE Docente (
    DocenteID              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    NumeroEmpleado         VARCHAR(20)  NOT NULL UNIQUE,
    PasswordHash           VARCHAR(255) NOT NULL,
    Nombre                 VARCHAR(100) NOT NULL,
    ApellidoPaterno        VARCHAR(100) NOT NULL,
    ApellidoMaterno        VARCHAR(100) NULL,
    Correo                 VARCHAR(150) NULL UNIQUE,
    Telefono               VARCHAR(20)  NULL,
    Activo                 BOOLEAN NOT NULL DEFAULT TRUE,
    FechaRegistro          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    IntentosFallidos       INT NOT NULL DEFAULT 0,
    BloqueadoHasta         TIMESTAMP NULL,
    PreguntaSeguridad      VARCHAR(150) NULL,
    RespuestaSeguridadHash VARCHAR(255) NULL
);

CREATE TABLE Alumno (
    AlumnoID               INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    Matricula              VARCHAR(20)  NOT NULL UNIQUE,
    PasswordHash           VARCHAR(255) NULL,
    Nombre                 VARCHAR(100) NOT NULL,
    ApellidoPaterno        VARCHAR(100) NOT NULL,
    ApellidoMaterno        VARCHAR(100) NULL,
    Correo                 VARCHAR(150) NULL UNIQUE,
    FechaNacimiento        DATE NULL,
    Activo                 BOOLEAN NOT NULL DEFAULT TRUE,
    FechaRegistro          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    IntentosFallidos       INT NOT NULL DEFAULT 0,
    BloqueadoHasta         TIMESTAMP NULL,
    PreguntaSeguridad      VARCHAR(150) NULL,
    RespuestaSeguridadHash VARCHAR(255) NULL
);

CREATE TABLE Asignatura (
    AsignaturaID      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    Clave             VARCHAR(20)  NOT NULL UNIQUE,
    NombreAsignatura  VARCHAR(150) NOT NULL,
    Creditos          INT NULL,
    HorasSemana       INT NULL,
    Activo            BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE Grupo (
    GrupoID        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    DocenteID      INT NOT NULL,
    NombreGrupo    VARCHAR(50) NOT NULL,
    Semestre       INT NULL,
    Turno          VARCHAR(20) NULL,
    CicloID        INT NOT NULL,
    Activo         BOOLEAN NOT NULL DEFAULT TRUE,
    FechaRegistro  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_Grupo_Docente FOREIGN KEY (DocenteID) REFERENCES Docente(DocenteID),
    CONSTRAINT FK_Grupo_Ciclo   FOREIGN KEY (CicloID)   REFERENCES CicloEscolar(CicloID),
    CONSTRAINT UQ_Grupo UNIQUE (DocenteID, NombreGrupo, CicloID)
);

CREATE TABLE Grupo_Asignatura (
    GrupoAsignaturaID INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    GrupoID           INT NOT NULL,
    AsignaturaID      INT NOT NULL,
    DocenteID         INT NOT NULL,
    CONSTRAINT FK_GA_Grupo      FOREIGN KEY (GrupoID)      REFERENCES Grupo(GrupoID),
    CONSTRAINT FK_GA_Asignatura FOREIGN KEY (AsignaturaID) REFERENCES Asignatura(AsignaturaID),
    CONSTRAINT FK_GA_Docente    FOREIGN KEY (DocenteID)    REFERENCES Docente(DocenteID),
    CONSTRAINT UQ_GA UNIQUE (GrupoID, AsignaturaID)
);

CREATE TABLE Grupo_Alumno (
    GrupoAlumnoID  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    GrupoID        INT NOT NULL,
    AlumnoID       INT NOT NULL,
    FechaRegistro  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_GrupoAlumno_Grupo  FOREIGN KEY (GrupoID)  REFERENCES Grupo(GrupoID),
    CONSTRAINT FK_GrupoAlumno_Alumno FOREIGN KEY (AlumnoID) REFERENCES Alumno(AlumnoID),
    CONSTRAINT UQ_GrupoAlumno UNIQUE (GrupoID, AlumnoID)
);

CREATE TABLE Inscripcion (
    InscripcionID      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    AlumnoID           INT NOT NULL,
    GrupoAsignaturaID  INT NOT NULL,
    FechaRegistro      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_Insc_Alumno FOREIGN KEY (AlumnoID)          REFERENCES Alumno(AlumnoID),
    CONSTRAINT FK_Insc_GA     FOREIGN KEY (GrupoAsignaturaID) REFERENCES Grupo_Asignatura(GrupoAsignaturaID),
    CONSTRAINT UQ_Insc UNIQUE (AlumnoID, GrupoAsignaturaID)
);

CREATE TABLE CalificacionParcial (
    CalificacionParcialID INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    InscripcionID         INT NOT NULL,
    NumeroParcial         SMALLINT NOT NULL,
    Calificacion          NUMERIC(5,2) NULL,
    FechaRegistro         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_CP_Insc FOREIGN KEY (InscripcionID) REFERENCES Inscripcion(InscripcionID),
    CONSTRAINT UQ_CP UNIQUE (InscripcionID, NumeroParcial),
    CONSTRAINT CK_CP_Numero CHECK (NumeroParcial >= 1),
    CONSTRAINT CK_CP_Calif  CHECK (Calificacion IS NULL OR Calificacion BETWEEN 0 AND 100)
);

CREATE TABLE Extraordinario (
    ExtraordinarioID  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    InscripcionID     INT NOT NULL,
    OportunidadID     INT NOT NULL,
    Calificacion      NUMERIC(5,2) NULL,
    FechaExamen       DATE NULL,
    FechaRegistro     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_Ext_Insc FOREIGN KEY (InscripcionID) REFERENCES Inscripcion(InscripcionID),
    CONSTRAINT FK_Ext_Opor FOREIGN KEY (OportunidadID) REFERENCES Oportunidad(OportunidadID),
    CONSTRAINT UQ_Ext UNIQUE (InscripcionID, OportunidadID),
    CONSTRAINT CK_Ext_Calif CHECK (Calificacion IS NULL OR Calificacion BETWEEN 0 AND 100)
);

CREATE INDEX IX_Grupo_Docente      ON Grupo(DocenteID);
CREATE INDEX IX_Grupo_Ciclo        ON Grupo(CicloID);
CREATE INDEX IX_GA_Docente         ON Grupo_Asignatura(DocenteID);
CREATE INDEX IX_GA_Asignatura      ON Grupo_Asignatura(AsignaturaID);
CREATE INDEX IX_GrupoAlumno_Alumno ON Grupo_Alumno(AlumnoID);
CREATE INDEX IX_Insc_GA            ON Inscripcion(GrupoAsignaturaID);
CREATE INDEX IX_Ext_Oportunidad    ON Extraordinario(OportunidadID);

/* ---------- VISTAS ---------- */

CREATE VIEW vw_ResultadoAsignatura AS
WITH base AS (
    SELECT
        i.InscripcionID, i.AlumnoID,
        ga.GrupoAsignaturaID, ga.GrupoID, ga.AsignaturaID, ga.DocenteID,
        g.CicloID,
        prm.CalificacionMinima, prm.NumParciales,
        p.Capturados, p.Promedio,
        ap.Orden AS OrdenAprobEx, ap.Calificacion AS CalAprobEx,
        ul.Orden AS OrdenUltEx,   ul.Calificacion AS CalUltEx,
        (SELECT MAX(Orden) FROM Oportunidad) AS MaxOrden
    FROM Inscripcion i
    JOIN Grupo_Asignatura ga ON ga.GrupoAsignaturaID = i.GrupoAsignaturaID
    JOIN Grupo g ON g.GrupoID = ga.GrupoID
    CROSS JOIN Parametro prm
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS Capturados,
               CAST(AVG(cp.Calificacion) AS NUMERIC(5,2)) AS Promedio
        FROM CalificacionParcial cp
        WHERE cp.InscripcionID = i.InscripcionID
          AND cp.Calificacion IS NOT NULL
    ) p ON TRUE
    LEFT JOIN LATERAL (
        SELECT o.Orden, e.Calificacion
        FROM Extraordinario e
        JOIN Oportunidad o ON o.OportunidadID = e.OportunidadID
        WHERE e.InscripcionID = i.InscripcionID
          AND e.Calificacion >= prm.CalificacionMinima
        ORDER BY o.Orden ASC
        LIMIT 1
    ) ap ON TRUE
    LEFT JOIN LATERAL (
        SELECT o.Orden, e.Calificacion
        FROM Extraordinario e
        JOIN Oportunidad o ON o.OportunidadID = e.OportunidadID
        WHERE e.InscripcionID = i.InscripcionID
        ORDER BY o.Orden DESC
        LIMIT 1
    ) ul ON TRUE
),
calc AS (
    SELECT b.*,
        CASE WHEN b.Capturados = b.NumParciales
              AND b.Promedio >= b.CalificacionMinima THEN 1 ELSE 0 END AS AproboOrdinario
    FROM base b
)
SELECT
    c.InscripcionID, c.AlumnoID, c.GrupoAsignaturaID, c.GrupoID,
    c.AsignaturaID, c.DocenteID, c.CicloID,
    c.Capturados AS ParcialesCapturados,
    c.Promedio,
    CASE WHEN c.AproboOrdinario = 1 THEN 1
         WHEN c.OrdenAprobEx IS NOT NULL THEN c.OrdenAprobEx
         ELSE COALESCE(c.OrdenUltEx, 1) END AS OportunidadActual,
    CASE WHEN c.AproboOrdinario = 1 THEN c.Promedio
         WHEN c.OrdenAprobEx IS NOT NULL THEN c.CalAprobEx
         ELSE COALESCE(c.CalUltEx, c.Promedio) END AS CalificacionFinal,
    CASE WHEN c.AproboOrdinario = 1 OR c.OrdenAprobEx IS NOT NULL THEN 'Aprobado'
         WHEN c.OrdenUltEx IS NOT NULL AND c.CalUltEx IS NULL THEN 'En extraordinario'
         WHEN c.OrdenUltEx IS NOT NULL AND c.OrdenUltEx >= c.MaxOrden THEN 'Reprobado'
         WHEN c.OrdenUltEx IS NOT NULL THEN 'Pendiente siguiente extraordinario'
         WHEN c.Capturados = c.NumParciales THEN 'Pendiente de extraordinario'
         ELSE 'En curso' END AS Estado
FROM calc c;

CREATE VIEW vw_Kardex AS
SELECT
    a.AlumnoID,
    a.Matricula,
    a.Nombre || ' ' || a.ApellidoPaterno || COALESCE(' ' || a.ApellidoMaterno, '') AS Alumno,
    ci.NombreCiclo,
    g.NombreGrupo,
    s.Clave,
    s.NombreAsignatura,
    s.Creditos,
    r.ParcialesCapturados,
    r.Promedio,
    r.CalificacionFinal,
    o.NombreOportunidad AS OportunidadAprobacion,
    r.OportunidadActual,
    r.Estado,
    r.InscripcionID
FROM vw_ResultadoAsignatura r
JOIN Alumno a        ON a.AlumnoID = r.AlumnoID
JOIN Asignatura s    ON s.AsignaturaID = r.AsignaturaID
JOIN Grupo g         ON g.GrupoID = r.GrupoID
JOIN CicloEscolar ci ON ci.CicloID = r.CicloID
JOIN Oportunidad o   ON o.Orden = r.OportunidadActual;

/* ---------- USUARIOS INICIALES ---------- */

INSERT INTO Docente (NumeroEmpleado, PasswordHash, Nombre, ApellidoPaterno, ApellidoMaterno, Correo,
                     PreguntaSeguridad, RespuestaSeguridadHash)
VALUES (
    'EMP-0001',
    '$2b$12$/J3OIQYEmgbvKmzuzpocnuDhbwyo3.Fo6yHYxUqWu6Kr0yzR1WjZG',
    'Jesus Roberto',
    'de la Garza',
    'de Luna',
    'garza.jesus@uadec.edu.mx',
    '¿En qué ciudad naciste?',
    '$2b$10$YB4e/w.Y59c74YfQk8Bp6.4t86V0ySWGCtCOXAvz.qOCQif7jFmKW'
);

INSERT INTO Alumno (Matricula, PasswordHash, Nombre, ApellidoPaterno, ApellidoMaterno, Correo, FechaNacimiento,
                    PreguntaSeguridad, RespuestaSeguridadHash)
VALUES (
    '22022096',
    '$2b$12$7ksJFtiIb8GLgAfNfnd2e.nhmHLfOx2uB7jnLXLFEakbQY.QHNOl2',
    'Luis Fernando',
    'Flores',
    'Sánchez',
    'fernandosan@uadec.edu.mx',
    '2004-12-12',
    '¿Nombre de tu primera mascota?',
    '$2b$10$EBp81c77J.iO4JerI9pSW.PlRY0gKrzQhl6lJEnWhmasUdU6tt9Ha'
);

/* ============================================================
   DATOS DE PRUEBA (escala 0-100, minima 70)

   Casos incluidos (ciclo 2026-2 salvo que se indique):
     3A · Taller de Investigacion  -> todos con parciales 1 y 2, falta el 3
     3B · Base de Datos            -> todos con parciales 1 y 2, falta el 3
     5A · Redes de Computadoras    -> solo 4 alumnos con parcial 3, 4 sin el
     3A · Programacion             -> Ricardo con 70/70/70 (justo en el minimo)
     3B · Programacion             -> Hector: reprobo y esta "En extraordinario"
                                   -> Oscar: reprobo 1ra extra, "Pendiente siguiente"
     5A · Redes                    -> Karla: reprobo, "Pendiente de extraordinario"
     2026-1 · 2A                   -> Luis aprobo en 1ra extraordinaria
                                   -> Jose quedo "Reprobado" (2 extras reprobadas)

   Las calificaciones "normales" son aleatorias pero reproducibles
   (setseed) y siempre aprueban (cada parcial >= 70).
   ============================================================ */

SELECT setseed(0.42);

INSERT INTO CicloEscolar (NombreCiclo, FechaInicio, FechaFin, Activo) VALUES
    ('2026-1', '2026-01-19', '2026-06-12', FALSE),
    ('2026-2', '2026-08-17', '2026-12-11', TRUE);

INSERT INTO Asignatura (Clave, NombreAsignatura, Creditos, HorasSemana) VALUES
    ('AED-1286', 'Programación',                5, 5),
    ('SCD-1008', 'Fundamentos de Programación', 5, 5),
    ('ACA-0909', 'Taller de Investigación',     4, 4),
    ('BDD-1004', 'Base de Datos',               5, 5),
    ('ING-1020', 'Ingeniería de Software',      5, 5),
    ('RED-1015', 'Redes de Computadoras',       5, 5),
    ('MAT-1010', 'Matemáticas Discretas',       5, 5);

INSERT INTO Alumno (Matricula, Nombre, ApellidoPaterno, ApellidoMaterno, Correo, FechaNacimiento) VALUES
    ('22021014', 'Ana Sofía',         'Martínez',   'Guerra',     'ana.martinez@uadec.edu.mx',     '2004-03-18'),
    ('22021027', 'Carlos Eduardo',    'Ramírez',    'Torres',     'carlos.ramirez@uadec.edu.mx',   '2004-07-02'),
    ('22021033', 'María Fernanda',    'López',      'Hernández',  'maria.lopez@uadec.edu.mx',      '2004-11-25'),
    ('22021045', 'José Ángel',        'Gutiérrez',  'Salazar',    'jose.gutierrez@uadec.edu.mx',   '2003-09-09'),
    ('22021052', 'Valeria Guadalupe', 'Cantú',      'Rodríguez',  'valeria.cantu@uadec.edu.mx',    '2004-01-30'),
    ('22021068', 'Diego Alejandro',   'Treviño',    'Ibarra',     'diego.trevino@uadec.edu.mx',    '2004-05-14'),
    ('22021071', 'Paola Estefanía',   'Villarreal', 'Núñez',      'paola.villarreal@uadec.edu.mx', '2004-08-21'),
    ('22021089', 'Ricardo Iván',      'Zapata',     'Montemayor', 'ricardo.zapata@uadec.edu.mx',   '2003-12-05'),
    ('22021093', 'Daniela Yamileth',  'Rangel',     'Cortés',     'daniela.rangel@uadec.edu.mx',   '2004-06-11'),
    ('22021102', 'Emilio Sebastián',  'Garza',      'Leal',       'emilio.garza@uadec.edu.mx',     '2004-02-27'),
    ('22021115', 'Camila Renata',     'Ochoa',      'Benavides',  'camila.ochoa@uadec.edu.mx',     '2004-10-08'),
    ('22021128', 'Héctor Manuel',     'Domínguez',  'Vela',       'hector.dominguez@uadec.edu.mx', '2003-11-19'),
    ('22021136', 'Regina Itzel',      'Sepúlveda',  'Cavazos',    'regina.sepulveda@uadec.edu.mx', '2004-04-03'),
    ('22021149', 'Andrés Nicolás',    'Peña',       'Lozano',     'andres.pena@uadec.edu.mx',      '2004-09-16'),
    ('22021157', 'Mariana Abigail',   'Soto',       'Escobedo',   'mariana.soto@uadec.edu.mx',     '2004-12-29'),
    ('22021163', 'Óscar Jesús',       'Delgado',    'Ponce',      'oscar.delgado@uadec.edu.mx',    '2003-08-07'),
    ('22021178', 'Fátima Alejandra',  'Reyna',      'Camacho',    'fatima.reyna@uadec.edu.mx',     '2004-01-12'),
    ('22020201', 'Sergio Iván',       'Cisneros',   'Arreola',    'sergio.cisneros@uadec.edu.mx',  '2003-03-24'),
    ('22020214', 'Karla Vanessa',     'Mendoza',    'Ruiz',       'karla.mendoza@uadec.edu.mx',    '2003-06-30'),
    ('22020226', 'Julián Agustín',    'Barrera',    'Cepeda',     'julian.barrera@uadec.edu.mx',   '2003-10-15'),
    ('22020239', 'Lucía Monserrat',   'Aguirre',    'Tamez',      'lucia.aguirre@uadec.edu.mx',    '2003-02-08'),
    ('22020243', 'Brayan Uriel',      'Castillo',   'Franco',     'brayan.castillo@uadec.edu.mx',  '2003-07-22'),
    ('22020258', 'Jimena Alexa',      'Flores',     'Guajardo',   'jimena.flores@uadec.edu.mx',    '2003-11-03'),
    ('22020264', 'Iván Alberto',      'Salinas',    'Robles',     'ivan.salinas@uadec.edu.mx',     '2003-05-19'),
    ('22020277', 'Andrea Nicole',     'Vázquez',    'Herrera',    'andrea.vazquez@uadec.edu.mx',   '2003-09-27');

INSERT INTO Grupo (DocenteID, NombreGrupo, Semestre, Turno, CicloID)
SELECT d.DocenteID, v.nombre, v.semestre, v.turno, ci.CicloID
FROM (VALUES
    ('2A', 2, 'Matutino',   '2026-1'),
    ('3A', 3, 'Matutino',   '2026-2'),
    ('3B', 3, 'Vespertino', '2026-2'),
    ('5A', 5, 'Matutino',   '2026-2')
) AS v(nombre, semestre, turno, ciclo)
JOIN Docente d       ON d.NumeroEmpleado = 'EMP-0001'
JOIN CicloEscolar ci ON ci.NombreCiclo   = v.ciclo;

INSERT INTO Grupo_Asignatura (GrupoID, AsignaturaID, DocenteID)
SELECT g.GrupoID, s.AsignaturaID, d.DocenteID
FROM (VALUES
    ('2026-1', '2A', 'SCD-1008'),
    ('2026-1', '2A', 'MAT-1010'),
    ('2026-2', '3A', 'AED-1286'),
    ('2026-2', '3A', 'BDD-1004'),
    ('2026-2', '3A', 'ACA-0909'),
    ('2026-2', '3B', 'AED-1286'),
    ('2026-2', '3B', 'BDD-1004'),
    ('2026-2', '5A', 'ING-1020'),
    ('2026-2', '5A', 'RED-1015')
) AS v(ciclo, grupo, clave)
JOIN Docente d       ON d.NumeroEmpleado = 'EMP-0001'
JOIN CicloEscolar ci ON ci.NombreCiclo   = v.ciclo
JOIN Grupo g         ON g.DocenteID = d.DocenteID
                    AND g.CicloID   = ci.CicloID
                    AND g.NombreGrupo = v.grupo
JOIN Asignatura s    ON s.Clave = v.clave;

INSERT INTO Inscripcion (AlumnoID, GrupoAsignaturaID)
SELECT a.AlumnoID, ga.GrupoAsignaturaID
FROM (VALUES
    ('22022096','2026-1','2A'), ('22021014','2026-1','2A'), ('22021027','2026-1','2A'),
    ('22021033','2026-1','2A'), ('22021045','2026-1','2A'),
    ('22022096','2026-2','3A'), ('22021014','2026-2','3A'), ('22021027','2026-2','3A'),
    ('22021033','2026-2','3A'), ('22021045','2026-2','3A'), ('22021052','2026-2','3A'),
    ('22021068','2026-2','3A'), ('22021071','2026-2','3A'), ('22021089','2026-2','3A'),
    ('22021093','2026-2','3A'),
    ('22021102','2026-2','3B'), ('22021115','2026-2','3B'), ('22021128','2026-2','3B'),
    ('22021136','2026-2','3B'), ('22021149','2026-2','3B'), ('22021157','2026-2','3B'),
    ('22021163','2026-2','3B'), ('22021178','2026-2','3B'),
    ('22020201','2026-2','5A'), ('22020214','2026-2','5A'), ('22020226','2026-2','5A'),
    ('22020239','2026-2','5A'), ('22020243','2026-2','5A'), ('22020258','2026-2','5A'),
    ('22020264','2026-2','5A'), ('22020277','2026-2','5A')
) AS m(matricula, ciclo, grupo)
JOIN Alumno a            ON a.Matricula   = m.matricula
JOIN Docente d           ON d.NumeroEmpleado = 'EMP-0001'
JOIN CicloEscolar ci     ON ci.NombreCiclo = m.ciclo
JOIN Grupo g             ON g.DocenteID = d.DocenteID
                        AND g.CicloID   = ci.CicloID
                        AND g.NombreGrupo = m.grupo
JOIN Grupo_Asignatura ga ON ga.GrupoID = g.GrupoID;

INSERT INTO Grupo_Alumno (GrupoID, AlumnoID)
SELECT DISTINCT ga.GrupoID, i.AlumnoID
FROM Inscripcion i
JOIN Grupo_Asignatura ga ON ga.GrupoAsignaturaID = i.GrupoAsignaturaID;

CREATE TEMP TABLE tmp_insc ON COMMIT DROP AS
SELECT i.InscripcionID, a.Matricula, ci.NombreCiclo, g.NombreGrupo, s.Clave
FROM Inscripcion i
JOIN Alumno a            ON a.AlumnoID = i.AlumnoID
JOIN Grupo_Asignatura ga ON ga.GrupoAsignaturaID = i.GrupoAsignaturaID
JOIN Grupo g             ON g.GrupoID = ga.GrupoID
JOIN CicloEscolar ci     ON ci.CicloID = g.CicloID
JOIN Asignatura s        ON s.AsignaturaID = ga.AsignaturaID;

-- Parciales aleatorios: "habilidad" base 77-98, cada parcial varia +-7
-- (minimo 70, maximo 100), asi todos aprueban por defecto.
WITH base AS MATERIALIZED (
    SELECT InscripcionID, 77.0 + random() * 21.0 AS habilidad
    FROM tmp_insc
)
INSERT INTO CalificacionParcial (InscripcionID, NumeroParcial, Calificacion)
SELECT b.InscripcionID,
       p.n,
       ROUND(LEAST(100, GREATEST(0, b.habilidad + (random() - 0.5) * 14))::numeric, 0)
FROM base b
CROSS JOIN generate_series(1, 3) AS p(n);

-- Casos especificos
UPDATE CalificacionParcial cp
SET Calificacion = v.cal
FROM (VALUES
    -- Luis · 2026-2 · Programacion: promedio 90
    ('22022096','2026-2','3A','AED-1286',1, 90), ('22022096','2026-2','3A','AED-1286',2, 85), ('22022096','2026-2','3A','AED-1286',3, 95),
    -- Luis · 2026-2 · Base de Datos: promedio 80
    ('22022096','2026-2','3A','BDD-1004',1, 80), ('22022096','2026-2','3A','BDD-1004',2, 75), ('22022096','2026-2','3A','BDD-1004',3, 85),
    -- Luis · 2026-2 · Taller de Investigacion: solo parciales 1 y 2 (el 3 se borra abajo)
    ('22022096','2026-2','3A','ACA-0909',1, 90), ('22022096','2026-2','3A','ACA-0909',2, 95),
    -- Luis · 2026-1 · Fundamentos de Programacion: reprobo ordinario (prom 50) -> aprobo extra
    ('22022096','2026-1','2A','SCD-1008',1, 50), ('22022096','2026-1','2A','SCD-1008',2, 45), ('22022096','2026-1','2A','SCD-1008',3, 55),
    -- Luis · 2026-1 · Matematicas Discretas: promedio 85
    ('22022096','2026-1','2A','MAT-1010',1, 80), ('22022096','2026-1','2A','MAT-1010',2, 90), ('22022096','2026-1','2A','MAT-1010',3, 85),
    -- Jose · 2026-1 · Matematicas Discretas: reprobo todo (quedara "Reprobado")
    ('22021045','2026-1','2A','MAT-1010',1, 40), ('22021045','2026-1','2A','MAT-1010',2, 45), ('22021045','2026-1','2A','MAT-1010',3, 50),
    -- Hector · 3B · Programacion: reprobo (prom 48.33) -> "En extraordinario"
    ('22021128','2026-2','3B','AED-1286',1, 40), ('22021128','2026-2','3B','AED-1286',2, 55), ('22021128','2026-2','3B','AED-1286',3, 50),
    -- Oscar · 3B · Programacion: reprobo (prom 50) -> reprobo 1ra extra
    ('22021163','2026-2','3B','AED-1286',1, 50), ('22021163','2026-2','3B','AED-1286',2, 45), ('22021163','2026-2','3B','AED-1286',3, 55),
    -- Karla · 5A · Redes: reprobo (prom 50) -> "Pendiente de extraordinario"
    ('22020214','2026-2','5A','RED-1015',1, 50), ('22020214','2026-2','5A','RED-1015',2, 55), ('22020214','2026-2','5A','RED-1015',3, 45),
    -- Ricardo · 3A · Programacion: justo en el minimo (70 aprueba)
    ('22021089','2026-2','3A','AED-1286',1, 70), ('22021089','2026-2','3A','AED-1286',2, 70), ('22021089','2026-2','3A','AED-1286',3, 70)
) AS v(matricula, ciclo, grupo, clave, parcial, cal)
JOIN tmp_insc t ON t.Matricula   = v.matricula
               AND t.NombreCiclo = v.ciclo
               AND t.NombreGrupo = v.grupo
               AND t.Clave       = v.clave
WHERE cp.InscripcionID = t.InscripcionID
  AND cp.NumeroParcial = v.parcial;

-- Parciales pendientes: borrar el parcial 3 donde "aun no se captura"
DELETE FROM CalificacionParcial cp
USING tmp_insc t
WHERE cp.InscripcionID = t.InscripcionID
  AND cp.NumeroParcial = 3
  AND t.NombreCiclo = '2026-2'
  AND (
        (t.NombreGrupo = '3A' AND t.Clave = 'ACA-0909')
     OR (t.NombreGrupo = '3B' AND t.Clave = 'BDD-1004')
     OR (t.NombreGrupo = '5A' AND t.Clave = 'RED-1015'
         AND t.Matricula NOT IN ('22020201', '22020214', '22020226', '22020239'))
  );

-- Extraordinarios (orden 2 = 1ra extra, 3 = 2da extra)
INSERT INTO Extraordinario (InscripcionID, OportunidadID, Calificacion, FechaExamen)
SELECT t.InscripcionID, o.OportunidadID, v.cal, v.fecha::date
FROM (VALUES
    ('22022096','2026-1','2A','SCD-1008', 2, 75,   '2026-06-22'),
    ('22021045','2026-1','2A','MAT-1010', 2, 50,   '2026-06-22'),
    ('22021045','2026-1','2A','MAT-1010', 3, 55,   '2026-06-29'),
    ('22021128','2026-2','3B','AED-1286', 2, NULL, NULL),
    ('22021163','2026-2','3B','AED-1286', 2, 50,   '2026-09-14')
) AS v(matricula, ciclo, grupo, clave, orden, cal, fecha)
JOIN tmp_insc t   ON t.Matricula   = v.matricula
                 AND t.NombreCiclo = v.ciclo
                 AND t.NombreGrupo = v.grupo
                 AND t.Clave       = v.clave
JOIN Oportunidad o ON o.Orden = v.orden;

COMMIT;
