const chokidar = require('chokidar')
const path = require('path')
const { exec } = require('child_process')

// Observar todos los archivos .css en el directorio css
const cssDirectoryToWatch = path.join(__dirname, '../css')

const buildCommand = 'node scripts/buildBrowserStyles.js'

// Inicializar el observador
const watcher = chokidar.watch(`${cssDirectoryToWatch}/**/*.css`, {
  persistent: true,
  ignoreInitial: true, // No ejecutar al inicio
  awaitWriteFinish: { // Ayuda con escrituras atómicas
    stabilityThreshold: 200,
    pollInterval: 100
  }
})

console.log(`[watchStyles] Observando cambios de estilos en ${cssDirectoryToWatch} ...`)

function rebuildStyles(filePath, event) {
  console.log(`[watchStyles] Archivo ${filePath} ha sido ${event === 'add' ? 'añadido' : event === 'unlink' ? 'eliminado' : 'modificado'}, reconstruyendo estilos...`)
  exec(buildCommand, (err, stdout, stderr) => {
    if (err) {
      console.error(`[watchStyles] Error reconstruyendo estilos: ${stderr || err.message}`)
      return
    }
    if (stdout.trim()) {
        console.log(`[watchStyles] Estilos reconstruidos exitosamente: ${stdout.trim()}`)
    } else {
        console.log(`[watchStyles] Estilos reconstruidos exitosamente.`)
    }
  })
}

watcher
  .on('add', filePath => rebuildStyles(filePath, 'add'))
  .on('change', filePath => rebuildStyles(filePath, 'change'))
  .on('unlink', filePath => rebuildStyles(filePath, 'unlink')) // Reconstruir incluso si un CSS es eliminado del directorio
  .on('error', error => console.error(`[watchStyles] Error del observador: ${error}`)) 