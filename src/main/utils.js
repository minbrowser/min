export const clamp = (n, min, max) => Math.max(Math.min(n, max), min)

export const isWindows = process.platform === 'win32'
export const isDarwin = process.platform === 'darwin'
export const isLinux = process.platform === 'linux'
