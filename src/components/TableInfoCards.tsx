import React, { useState } from 'react';
import './TableInfoCards.scss';

interface TableInfo {
  name: string;
  description: string;
  fields: string[];
  icon: string;
  suggestions?: string[];
}

const tables: TableInfo[] = [
  {
    name: 'CENTROS',
    description: 'Información de centros educativos',
    fields: ['id', 'nombre', 'direccion', 'tipo'],
    icon: '🏫',
    suggestions: [
      'Muéstrame todos los centros públicos',
      'Cuántos centros hay en cada ciudad',
      'Lista los centros ordenados por número de departamentos',
      'Encuentra los centros con más de 5 departamentos',
      'Muestra los centros y sus directores',
      'Centros que tienen departamentos con presupuesto mayor a 50000',
      'Número de profesores por centro',
      'Centros con más estudiantes becados'
    ]
  },
  {
    name: 'DEPARTAMENTOS',
    description: 'Organización interna de cada centro',
    fields: ['id', 'centro_id', 'nombre', 'jefe_departamento'],
    icon: '👥',
    suggestions: [
      'Lista los departamentos con mayor presupuesto',
      'Departamentos y número de profesores',
      'Presupuesto promedio por departamento',
      'Departamentos sin profesores asignados',
      'Top 5 departamentos por número de asignaturas',
      'Jefes de departamento que también son tutores',
      'Departamentos y sus asignaturas troncales',
      'Comparativa de presupuestos entre departamentos'
    ]
  },
  {
    name: 'PROFESORES',
    description: 'Personal docente del centro',
    fields: ['id', 'nombre', 'especialidad', 'departamento_id'],
    icon: '👨‍🏫',
    suggestions: [
      'Qué profesores son tutores de clase',
      'Profesores por especialidad',
      'Antigüedad promedio de los profesores',
      'Profesores que imparten más asignaturas',
      'Lista de tutores y sus cursos asignados',
      'Profesores que no son tutores',
      'Distribución de especialidades por departamento',
      'Profesores incorporados en el último año'
    ]
  },
  {
    name: 'ESTUDIANTES',
    description: 'Alumnos matriculados',
    fields: ['id', 'nombre', 'edad', 'curso_id'],
    icon: '👨‍🎓',
    suggestions: [
      'Muéstrame los estudiantes mayores de 15 años',
      'Cuántos estudiantes becados hay por curso',
      'Promedio de edad por curso',
      'Estudiantes con mejor rendimiento académico',
      'Distribución de estudiantes por nivel educativo',
      'Tasa de asistencia por estudiante',
      'Estudiantes con más de 3 asignaturas suspendidas',
      'Ranking de notas por asignatura'
    ]
  }
];

export const TableInfoCards: React.FC = () => {
  // Función para obtener 8 sugerencias aleatorias
  const getRandomSuggestions = () => {
    const allSuggestions = tables.flatMap(table => 
      table.suggestions?.map(suggestion => ({
        tableName: table.name,
        suggestion,
        icon: table.icon
      })) || []
    );
    
    return allSuggestions
      .sort(() => Math.random() - 0.5)
      .slice(0, 8);
  };

  const [randomSuggestions] = useState(getRandomSuggestions());

  return (
    <>
      <div className="table-info-cards">
        {tables.map((table) => (
          <div key={table.name} className="info-card">
            <div className="card-header">
              <span className="card-icon">{table.icon}</span>
              <h3>{table.name}</h3>
            </div>
            <p>{table.description}</p>
            <div className="card-fields">
              <small>Campos principales:</small>
              <div className="fields-list">
                {table.fields.map(field => (
                  <span key={field} className="field-tag">{field}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="suggestion-cards">
        {randomSuggestions.map((item, index) => (
          <div key={index} className="suggestion-card">
            <span className="suggestion-icon">💡</span>
            <p>{item.suggestion}</p>
          </div>
        ))}
      </div>
    </>
  );
}; 