import Database from 'better-sqlite3';

const db = new Database('educacion.db');

db.exec(`
  DROP TABLE IF EXISTS asistencias;
  DROP TABLE IF EXISTS calificaciones;
  DROP TABLE IF EXISTS estudiantes;
  DROP TABLE IF EXISTS asignaturas;
  DROP TABLE IF EXISTS cursos;
  DROP TABLE IF EXISTS profesores;
  DROP TABLE IF EXISTS departamentos;
  DROP TABLE IF EXISTS centros;
`);
// Inicializar la base de datos con un esquema más completo
db.exec(`
  -- Tabla de Centros Educativos
  CREATE TABLE IF NOT EXISTS centros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    direccion TEXT NOT NULL,
    codigo_postal TEXT NOT NULL,
    ciudad TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    director TEXT NOT NULL,
    tipo TEXT CHECK(tipo IN ('Público', 'Concertado', 'Privado')) NOT NULL
  );

  -- Tabla de Departamentos
  CREATE TABLE IF NOT EXISTS departamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    centro_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    jefe_departamento TEXT NOT NULL,
    presupuesto_anual DECIMAL(10,2),
    FOREIGN KEY (centro_id) REFERENCES centros(id)
  );

  -- Tabla de Profesores
  CREATE TABLE IF NOT EXISTS profesores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    departamento_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    dni TEXT UNIQUE NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    email TEXT UNIQUE,
    telefono TEXT,
    especialidad TEXT NOT NULL,
    fecha_incorporacion DATE NOT NULL,
    tutor_de_clase INTEGER,
    FOREIGN KEY (departamento_id) REFERENCES departamentos(id)
  );

  -- Tabla de Cursos
  CREATE TABLE IF NOT EXISTS cursos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    centro_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    nivel TEXT CHECK(nivel IN ('ESO', 'Bachillerato', 'FP')) NOT NULL,
    curso TEXT NOT NULL,
    año_academico TEXT NOT NULL,
    tutor_id INTEGER,
    aula TEXT NOT NULL,
    FOREIGN KEY (centro_id) REFERENCES centros(id),
    FOREIGN KEY (tutor_id) REFERENCES profesores(id)
  );

  -- Tabla de Asignaturas
  CREATE TABLE IF NOT EXISTS asignaturas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    departamento_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    codigo TEXT UNIQUE NOT NULL,
    horas_semanales INTEGER NOT NULL,
    tipo TEXT CHECK(tipo IN ('Troncal', 'Específica', 'Libre Configuración')) NOT NULL,
    FOREIGN KEY (departamento_id) REFERENCES departamentos(id)
  );

  -- Tabla de Estudiantes
  CREATE TABLE IF NOT EXISTS estudiantes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    curso_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    edad DATE NOT NULL,
    becado BOOLEAN DEFAULT 0,
    FOREIGN KEY (curso_id) REFERENCES cursos(id)
  );

  -- Tabla de Calificaciones
  CREATE TABLE IF NOT EXISTS calificaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    estudiante_id INTEGER NOT NULL,
    asignatura_id INTEGER NOT NULL,
    profesor_id INTEGER NOT NULL,
    trimestre INTEGER CHECK(trimestre IN (1,2,3)) NOT NULL,
    nota DECIMAL(4,2) CHECK(nota >= 0 AND nota <= 10) NOT NULL,
    fecha_evaluacion DATE NOT NULL,
    observaciones TEXT,
    FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id),
    FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id),
    FOREIGN KEY (profesor_id) REFERENCES profesores(id)
  );

  -- Tabla de Asistencias
  CREATE TABLE IF NOT EXISTS asistencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    estudiante_id INTEGER NOT NULL,
    asignatura_id INTEGER NOT NULL,
    fecha DATE NOT NULL,
    estado TEXT CHECK(estado IN ('Presente', 'Ausente', 'Retraso', 'Justificado')) NOT NULL,
    observaciones TEXT,
    FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id),
    FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id)
  );
`);

// Función para insertar datos de ejemplo
function insertarDatosEjemplo() {
  // Centros Educativos
  db.exec(`
    INSERT OR IGNORE INTO centros (nombre, direccion, codigo_postal, ciudad, telefono, email, director, tipo) VALUES
    ('IES Miguel de Cervantes', 'Calle Mayor 123', '28001', 'Madrid', '915555555', 'info@iescervantes.es', 'Ana Martínez López', 'Público'),
    ('Colegio San José', 'Avenida Libertad 45', '28002', 'Madrid', '914444444', 'contacto@colegiosanjose.es', 'Carlos Ruiz García', 'Concertado'),
    ('Instituto Tecnológico', 'Plaza España 67', '08001', 'Barcelona', '933333333', 'info@institutotec.es', 'María Sánchez Pérez', 'Público'),
    ('Colegio Internacional', 'Calle Nueva 89', '41001', 'Sevilla', '955555555', 'info@colegioint.es', 'José García Martín', 'Privado'),
    ('IES Ramón y Cajal', 'Avenida Principal 34', '50001', 'Zaragoza', '976666666', 'contacto@iesramonycajal.es', 'Laura López Ruiz', 'Público');

    -- Departamentos
    INSERT OR IGNORE INTO departamentos (centro_id, nombre, jefe_departamento, presupuesto_anual) VALUES
    (1, 'Matemáticas', 'Pedro Sánchez Gómez', 15000.00),
    (1, 'Lengua', 'María José López', 12000.00),
    (1, 'Ciencias', 'Juan Carlos Martín', 18000.00),
    (2, 'Matemáticas', 'Ana Belén Ruiz', 14000.00),
    (2, 'Idiomas', 'Francisco Pérez', 16000.00),
    (3, 'Tecnología', 'Carmen García', 20000.00),
    (3, 'Física', 'Roberto Martínez', 19000.00),
    (4, 'Arte', 'Isabel Sánchez', 13000.00),
    (4, 'Música', 'Diego López', 11000.00),
    (5, 'Educación Física', 'Patricia Gómez', 15000.00);

    -- Profesores
    INSERT OR IGNORE INTO profesores (departamento_id, nombre, apellidos, dni, fecha_nacimiento, email, telefono, especialidad, fecha_incorporacion) VALUES
    (1, 'Antonio', 'García López', '12345678A', '1980-05-15', 'antonio.garcia@iescervantes.es', '666111222', 'Matemáticas', '2015-09-01'),
    (1, 'Laura', 'Martínez Ruiz', '23456789B', '1985-03-20', 'laura.martinez@iescervantes.es', '666222333', 'Matemáticas', '2016-09-01'),
    (2, 'Carlos', 'Sánchez Pérez', '34567890C', '1975-08-10', 'carlos.sanchez@iescervantes.es', '666333444', 'Lengua', '2010-09-01'),
    (3, 'María', 'López García', '45678901D', '1982-11-25', 'maria.lopez@iescervantes.es', '666444555', 'Biología', '2014-09-01'),
    (4, 'José', 'Ruiz Martín', '56789012E', '1978-04-30', 'jose.ruiz@colegiosanjose.es', '666555666', 'Matemáticas', '2012-09-01'),
    (5, 'Ana', 'Pérez Sánchez', '67890123F', '1983-07-05', 'ana.perez@colegiosanjose.es', '666666777', 'Inglés', '2017-09-01'),
    (6, 'David', 'Martín López', '78901234G', '1979-01-12', 'david.martin@institutotec.es', '666777888', 'Informática', '2013-09-01'),
    (7, 'Elena', 'García Ruiz', '89012345H', '1984-09-18', 'elena.garcia@institutotec.es', '666888999', 'Física', '2018-09-01'),
    (8, 'Pablo', 'Sánchez Martínez', '90123456I', '1976-06-22', 'pablo.sanchez@colegioint.es', '666999000', 'Arte', '2011-09-01'),
    (9, 'Carmen', 'López Pérez', '01234567J', '1981-12-08', 'carmen.lopez@colegioint.es', '666000111', 'Música', '2019-09-01');

    -- Cursos
    INSERT OR IGNORE INTO cursos (centro_id, nombre, nivel, curso, año_academico, tutor_id, aula) VALUES
    (1, '1º ESO A', 'ESO', '1º', '2023-2024', 1, 'Aula 101'),
    (1, '2º ESO A', 'ESO', '2º', '2023-2024', 2, 'Aula 102'),
    (2, '3º ESO A', 'ESO', '3º', '2023-2024', 5, 'Aula 201'),
    (2, '4º ESO A', 'ESO', '4º', '2023-2024', 6, 'Aula 202'),
    (3, '1º Bachillerato A', 'Bachillerato', '1º', '2023-2024', 7, 'Aula 301'),
    (3, '2º Bachillerato A', 'Bachillerato', '2º', '2023-2024', 8, 'Aula 302'),
    (4, '1º FP Informática', 'FP', '1º', '2023-2024', 9, 'Aula 401'),
    (5, '2º FP Informática', 'FP', '2º', '2023-2024', 10, 'Aula 501');

    -- Asignaturas
    INSERT OR IGNORE INTO asignaturas (departamento_id, nombre, codigo, horas_semanales, tipo) VALUES
    (1, 'Matemáticas I', 'MAT1', 4, 'Troncal'),
    (1, 'Matemáticas II', 'MAT2', 4, 'Troncal'),
    (2, 'Lengua Castellana', 'LEN1', 4, 'Troncal'),
    (2, 'Literatura Universal', 'LIT1', 3, 'Específica'),
    (3, 'Biología', 'BIO1', 3, 'Troncal'),
    (3, 'Química', 'QUI1', 3, 'Troncal'),
    (4, 'Matemáticas Aplicadas', 'MATA', 4, 'Troncal'),
    (5, 'Inglés Avanzado', 'ING2', 4, 'Troncal'),
    (6, 'Programación', 'PRG1', 6, 'Troncal'),
    (7, 'Física', 'FIS1', 4, 'Troncal');

    -- Estudiantes (50 estudiantes de ejemplo)
    INSERT OR IGNORE INTO estudiantes (curso_id, nombre, apellidos, edad, becado) VALUES
    ${generarEstudiantes()}
  `);
}

// Función auxiliar para generar 50 estudiantes
function generarEstudiantes() {
  const nombres = ['Juan', 'María', 'Pedro', 'Ana', 'Luis', 'Carmen', 'José', 'Laura', 'Antonio', 'Isabel'];
  const apellidos = ['García', 'Martínez', 'López', 'Sánchez', 'Rodríguez', 'Pérez', 'González', 'Fernández', 'Ruiz', 'Díaz'];
  const estudiantes = [];

  for (let i = 1; i <= 20; i++) {
    const nombre = nombres[Math.floor(Math.random() * nombres.length)];
    const apellido1 = apellidos[Math.floor(Math.random() * apellidos.length)];
    const apellido2 = apellidos[Math.floor(Math.random() * apellidos.length)];
    const curso_id = Math.floor(Math.random() * 8) + 1;
    const edad = 2024 - (2008 - Math.floor(Math.random() * 4));
    const becado = Math.random() < 0.3 ? 1 : 0; // 30% de probabilidad de tener beca
    estudiantes.push(`(${curso_id}, '${nombre}', '${apellido1} ${apellido2}', '${edad}', ${becado})`);
  }

  return estudiantes.join(',\n');
}

// Ejecutar la inserción de datos
insertarDatosEjemplo();

export function executeQuery(query) {
  try {
    const stmt = db.prepare(query);
    const isSelect = query.trim().toLowerCase().startsWith('select');
    
    if (isSelect) {
      const results = stmt.all();
      return {
        success: true,
        data: results,
        message: `Consulta ejecutada exitosamente. Se encontraron ${results.length} registros.`
      };
    } else {
      const result = stmt.run();
      return {
        success: true,
        data: result,
        message: `Consulta ejecutada exitosamente. Se afectaron ${result.changes} filas.`
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Error al ejecutar la consulta'
    };
  }
} 