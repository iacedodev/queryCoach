import React, { useEffect, useState } from 'react';

interface SQLResultTableProps {
  data: any[];
}

export const SQLResultTable: React.FC<SQLResultTableProps> = ({ data }) => {
  if (!data || data.length === 0) return null;

  const columns = Object.keys(data[0]);
  const [columnWidths, setColumnWidths] = useState<{[key: string]: number}>({});

  useEffect(() => {
    // Calcular el ancho óptimo para cada columna basado en su contenido
    const widths: {[key: string]: number} = {};
    columns.forEach(column => {
      const maxContentLength = Math.max(
        column.length,
        ...data.map(row => String(row[column]).length)
      );
      // Asignar un ancho proporcional al contenido más largo
      widths[column] = Math.min(Math.max(maxContentLength * 8, 120), 200);
    });
    setColumnWidths(widths);
  }, [data]);

  return (
    <div className="sql-result-table">
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th 
                  key={column}
                  style={{ width: `${columnWidths[column]}px` }}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td 
                    key={`${index}-${column}`}
                    style={{ width: `${columnWidths[column]}px` }}
                    title={String(row[column])} // Añadir tooltip para ver el contenido completo
                  >
                    {row[column]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 