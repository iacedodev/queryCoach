# Asistente SQL Educativo

Esta aplicación es un asistente educativo interactivo diseñado para ayudar a estudiantes a aprender SQL mediante un profesor virtual especializado.

## Requisitos Previos

- Node.js (v14 o superior)
- npm (v6 o superior)

## Instalación

1. Clona el repositorio:
   ```
   git clone https://github.com/tu-usuario/sql-assistant.git
   cd sql-assistant
   ```

2. Instala las dependencias:
   ```
   npm install
   ```

3. Crea un archivo `.env` en el directorio raíz y añade tu clave API de OpenAI y el puerto para el servidor de desarrollo:
   ```
   REACT_APP_OPENAI_API_KEY=tu_clave_api_aqui
   REACT_APP_LOCAL_RELAY_SERVER_URL=http://localhost:8081
   
   ```

## Ejecutar la Aplicación

1. Inicia los servidores:
   ```
   # Inicia el servidor relay en una terminal:
   npm run relay

   # Inicia el servidor de desarrollo en otra terminal:
   npm start
   ```

2. Abre tu navegador y ve a `http://localhost:3000`

## Interactuando con el Asistente

El asistente está diseñado para funcionar como un profesor de bases de datos que:

1. Ejecuta consultas SQL y explica los resultados
2. Proporciona explicaciones detalladas de conceptos SQL
3. Sugiere mejoras y alternativas para las consultas
4. Permite exportar resultados en formato CSV
5. Visualiza datos en tablas interactivas

### Características Principales

- **Ejecución de Consultas**: Permite ejecutar consultas SQL en tiempo real
- **Explicaciones Detalladas**: Genera explicaciones pedagógicas de cada consulta
- **Exportación de Datos**: Permite exportar resultados en formato CSV
- **Visualización de Esquemas**: Muestra la estructura de la base de datos
- **Sugerencias Interactivas**: Proporciona ejemplos y mejores prácticas

## Base de Datos Educativa

La aplicación incluye una base de datos de ejemplo con tablas relacionadas al ámbito educativo:

- Centros
- Departamentos
- Profesores
- Cursos
- Asignaturas
- Estudiantes
- Calificaciones
- Asistencias

## Desarrollo

Los componentes principales de la aplicación son:

- `src/pages/ConsolePage.tsx`: Componente principal
- `src/utils/dbContext.ts`: Contexto de la base de datos
- `src/utils/conversation_config.js`: Configuración del asistente
- `src/components/SQLResultTable.tsx`: Visualización de resultados
- `src/components/TableInfoCards.tsx`: Información de tablas

## Solución de Problemas

Si encuentras algún problema:

1. Verifica que tienes las versiones correctas de Node.js y npm instaladas
2. Asegúrate de que tu archivo `.env` contiene una clave API válida de OpenAI
3. Revisa la consola del navegador para mensajes de error
4. Verifica que ambos servidores (relay y desarrollo) estén ejecutándose

Si los problemas persisten, por favor abre un issue en el repositorio de GitHub.

## Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del repositorio
2. Crea una rama para tu característica (`git checkout -b feature/nueva-caracteristica`)
3. Haz commit de tus cambios (`git commit -am 'Añade nueva característica'`)
4. Haz push a la rama (`git push origin feature/nueva-caracteristica`)
5. Abre un Pull Request

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo LICENSE para más detalles.
