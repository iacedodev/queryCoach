import fs from 'fs';
import OpenAI from 'openai';



export async function uploadFilesToVectorStore(files, apiKey) {
  const openai = new OpenAI({ apiKey });
  const vectorStoreId = "vs_ihIxLW4X8xuzFwcMHbUElagJ";
  
  try {
    // Primero subir los archivos a OpenAI y obtener sus IDs
    const fileUploads = await Promise.all(files.map(async (file) => {
      const fileStream = fs.createReadStream(file.path);
      const uploadedFile = await openai.files.create({
        file: fileStream,
        purpose: 'assistants'
      });
      return uploadedFile.id;
    }));

    console.log('Files uploaded to OpenAI:', fileUploads);

    // Crear el batch con los IDs de archivo
    const fileBatch = await openai.beta.vectorStores.fileBatches.create(
      vectorStoreId,
      {
        file_ids: fileUploads
      }
    );

    // Esperar a que el procesamiento se complete
    await openai.beta.vectorStores.fileBatches.poll(
      vectorStoreId,
      fileBatch.id
    );

    // Limpiar solo los archivos temporales locales
    files.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
        console.log(`Archivo local eliminado: ${file.path}`);
      }
    });

    return true;
  } catch (error) {
    // Asegurar limpieza de archivos locales en caso de error
    files.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
        console.log(`Archivo local eliminado (error): ${file.path}`);
      }
    });
    console.error('Error uploading files to vector store:', error);
    throw error;
  }
} 