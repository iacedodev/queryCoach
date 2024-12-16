export const dbContext = `
Contexto de la Base de Datos Educativa:

La base de datos contiene las siguientes tablas y relaciones:

1. CENTROS:
- Almacena información de centros educativos
- Campos: id, nombre, direccion, codigo_postal, ciudad, telefono, email, director, tipo (Público/Concertado/Privado)

2. DEPARTAMENTOS:
- Organización interna de cada centro
- Campos: id, centro_id, nombre, jefe_departamento, presupuesto_anual
- Relación: Pertenece a un centro

3. PROFESORES:
- Personal docente
- Campos: id, departamento_id, nombre, apellidos, dni, fecha_nacimiento, email, telefono, especialidad, fecha_incorporacion, tutor_de_clase
- Relación: Pertenece a un departamento

4. CURSOS:
- Grupos académicos
- Campos: id, centro_id, nombre, nivel (ESO/Bachillerato/FP), curso, año_academico, tutor_id, aula
- Relaciones: Pertenece a un centro, Tiene un profesor tutor

5. ASIGNATURAS:
- Materias impartidas
- Campos: id, departamento_id, nombre, codigo, horas_semanales, tipo (Troncal/Específica/Libre Configuración)
- Relación: Pertenece a un departamento

6. ESTUDIANTES:
- Alumnos matriculados
- Campos: id, curso_id, nombre, apellidos, edad, becado (booleano)
- Relación: Pertenece a un curso

7. CALIFICACIONES:
- Notas de los estudiantes
- Campos: id, estudiante_id, asignatura_id, profesor_id, trimestre (1/2/3), nota (0-10), fecha_evaluacion, observaciones
- Relaciones: Vincula estudiante, asignatura y profesor

8. ASISTENCIAS:
- Registro de asistencia
- Campos: id, estudiante_id, asignatura_id, fecha, estado (Presente/Ausente/Retraso/Justificado), observaciones
- Relaciones: Vincula estudiante y asignatura

Puedes usar estas tablas para consultas SQL que ayuden a responder preguntas sobre el centro educativo.`; 