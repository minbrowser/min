const chokidar = require('chokidar');
const { exec } = require('child_process');
const path = require('path');

// Directorio a observar
const watchDir = path.resolve(__dirname, '../css');

// Función para reconstruir los estilos
function rebuildStyles() {
  console.log('🔄 Reconstruyendo estilos...');
  exec('npm run buildBrowserStyles', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error al reconstruir estilos:', error);
      return;
    }
    if (stderr) {
      console.error('⚠️ Advertencias:', stderr);
    }
    console.log('✅ Estilos reconstruidos exitosamente');
  });
}

// Configurar el observador
const watcher = chokidar.watch(watchDir, {
  ignored: /(^|[\/\\])\../, // ignorar archivos ocultos
  persistent: true
});

// Eventos del observador
watcher
  .on('add', path => {
    console.log(`📝 Archivo ${path} ha sido añadido`);
    rebuildStyles();
  })
  .on('change', path => {
    console.log(`📝 Archivo ${path} ha sido modificado`);
    rebuildStyles();
  })
  .on('unlink', path => {
    console.log(`🗑️ Archivo ${path} ha sido eliminado`);
    rebuildStyles();
  });

console.log('👀 Observando cambios en archivos CSS...'); 