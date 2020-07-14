;(() => {
  var icons = {}

  /* 
    The following icons are imported from Carbon: https://github.com/carbon-design-system/carbon/tree/master/packages/icons
    You can browser and search them in https://iconify.antfu.me/collection/carbon
    To add new icons, use the "Copy SVG" feature from the site above and add an entry to the following list
  */
  var iconList = [
    ['add', '<path d="M17 15V8h-2v7H8v2h7v7h2v-7h7v-2z" fill="currentColor"/>'],
    [
      'menu',
      '<path d="M4 24h24v2H4z" fill="currentColor"/><path d="M4 12h24v2H4z" fill="currentColor"/><path d="M4 18h24v2H4z" fill="currentColor"/><path d="M4 6h24v2H4z" fill="currentColor"/>',
    ],
    [
      'chevron-left',
      '<path d="M10 16L20 6l1.4 1.4l-8.6 8.6l8.6 8.6L20 26z" fill="currentColor"/>',
    ],
    [
      'close',
      '<path d="M24 9.4L22.6 8L16 14.6L9.4 8L8 9.4l6.6 6.6L8 22.6L9.4 24l6.6-6.6l6.6 6.6l1.4-1.4l-6.6-6.6L24 9.4z" fill="currentColor"/>',
    ],
    [
      'close-outline',
      '<path d="M16 2C8.2 2 2 8.2 2 16s6.2 14 14 14s14-6.2 14-14S23.8 2 16 2zm0 26C9.4 28 4 22.6 4 16S9.4 4 16 4s12 5.4 12 12s-5.4 12-12 12z" fill="currentColor"/><path d="M21.4 23L16 17.6L10.6 23L9 21.4l5.4-5.4L9 10.6L10.6 9l5.4 5.4L21.4 9l1.6 1.6l-5.4 5.4l5.4 5.4z" fill="currentColor"/>',
    ],
    [
      'overflow-menu-vertical',
      '<circle cx="16" cy="8" r="2" fill="currentColor"/><circle cx="16" cy="16" r="2" fill="currentColor"/><circle cx="16" cy="24" r="2" fill="currentColor"/>'
    ],
    [
      'new-tab',
      '<path d="M26 26H6V6h9V4H6a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-9h-2z" fill="currentColor"/><path d="M26 6V2h-2v4h-4v2h4v4h2V8h4V6h-4z" fill="currentColor"/>',
    ],
    [
      'close-outline',
      '<path d="M16 2C8.2 2 2 8.2 2 16s6.2 14 14 14s14-6.2 14-14S23.8 2 16 2zm0 26C9.4 28 4 22.6 4 16S9.4 4 16 4s12 5.4 12 12s-5.4 12-12 12z" fill="currentColor"/><path d="M21.4 23L16 17.6L10.6 23L9 21.4l5.4-5.4L9 10.6L10.6 9l5.4 5.4L21.4 9l1.6 1.6l-5.4 5.4l5.4 5.4z" fill="currentColor"/>',
    ],
    [
      'chevron-down',
      '<path d="M16 22L6 12l1.4-1.4l8.6 8.6l8.6-8.6L26 12z" fill="currentColor"/>'
    ],
    [
      'chevron-up',
      '<path d="M16 10l10 10l-1.4 1.4l-8.6-8.6l-8.6 8.6L6 20z" fill="currentColor"/>'
    ],
    [
      'chevron-right',
      '<path d="M22 16L12 26l-1.4-1.4l8.6-8.6l-8.6-8.6L12 6z" fill="currentColor"/>'
    ],
    [
      'star-filled',
      '<path d="M16 2l-4.55 9.22l-10.17 1.47l7.36 7.18L6.9 30l9.1-4.78L25.1 30l-1.74-10.13l7.36-7.17l-10.17-1.48z" fill="currentColor"/>',
    ],
    [
      'star',
      '<path d="M16 6.52l2.76 5.58l.46 1l1 .15l6.16.89l-4.38 4.3l-.75.73l.18 1l1.05 6.13l-5.51-2.89L16 23l-.93.49l-5.51 2.85l1-6.13l.18-1l-.74-.77l-4.42-4.35l6.16-.89l1-.15l.46-1L16 6.52M16 2l-4.55 9.22l-10.17 1.47l7.36 7.18L6.9 30l9.1-4.78L25.1 30l-1.74-10.13l7.36-7.17l-10.17-1.48z" fill="currentColor"/>'
    ],
    [
      'shield',
      '<path d="M16 4c-2.25 0-3.766.887-5.125 1.625C9.515 6.363 8.281 7 6 7H5v1c0 7.719 2.61 12.742 5.25 15.781c2.64 3.04 5.375 4.157 5.375 4.157l.375.125l.375-.125s2.734-1.094 5.375-4.125C24.39 20.78 27 15.745 27 8V7h-1c-2.27 0-3.516-.637-4.875-1.375C19.765 4.887 18.25 4 16 4zm0 2c1.75 0 2.754.613 4.156 1.375a12.52 12.52 0 0 0 4.782 1.469c-.192 6.765-2.43 11.066-4.688 13.656c-2.047 2.348-3.766 3.129-4.25 3.344c-.488-.219-2.203-1.02-4.25-3.375c-2.258-2.598-4.496-6.89-4.688-13.625a12.475 12.475 0 0 0 4.782-1.469C13.246 6.613 14.25 6 16 6z" fill="currentColor"/>'
    ],
    [
      'edit',
      '<path d="M2 26h28v2H2z" fill="currentColor"/><path d="M25.4 9c.8-.8.8-2 0-2.8l-3.6-3.6c-.8-.8-2-.8-2.8 0l-15 15V24h6.4l15-15zm-5-5L24 7.6l-3 3L17.4 7l3-3zM6 22v-3.6l10-10l3.6 3.6l-10 10H6z" fill="currentColor"/>'
    ],
    [
      'search',
      '<path d="M30 28.59L22.45 21A11 11 0 1 0 21 22.45L28.59 30zM5 14a9 9 0 1 1 9 9a9 9 0 0 1-9-9z" fill="currentColor"/>'
    ],
    [
      'copy',
      '<path d="M28 10v18H10V10h18m0-2H10a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2z" fill="currentColor"/><path d="M4 18H2V4a2 2 0 0 1 2-2h14v2H4z" fill="currentColor"/>'
    ],
    [
      'notebook',
      '<path d="M19 10h7v2h-7z" fill="currentColor"/><path d="M19 15h7v2h-7z" fill="currentColor"/><path d="M19 20h7v2h-7z" fill="currentColor"/><path d="M28 5H4a2.002 2.002 0 0 0-2 2v18a2.002 2.002 0 0 0 2 2h24a2.003 2.003 0 0 0 2-2V7a2.002 2.002 0 0 0-2-2zM4 7h11v18H4zm13 18V7h11l.002 18z" fill="currentColor"/>'
    ],
    [
      'earth-filled',
      '<path d="M16 2a14 14 0 1 0 14 14A14.016 14.016 0 0 0 16 2zM4.02 16.394l1.338.446L7 19.303v1.283a1 1 0 0 0 .293.707L10 24v2.377a11.994 11.994 0 0 1-5.98-9.983zM16 28a11.968 11.968 0 0 1-2.572-.285L14 26l1.805-4.512a1 1 0 0 0-.097-.926l-1.411-2.117a1 1 0 0 0-.832-.445h-4.93l-1.248-1.873L9.414 14H11v2h2v-2.734l3.868-6.77l-1.736-.992L14.277 7h-2.742L10.45 5.371A11.861 11.861 0 0 1 20 4.7V8a1 1 0 0 0 1 1h1.465a1 1 0 0 0 .832-.445l.877-1.316A12.033 12.033 0 0 1 26.894 11H22.82a1 1 0 0 0-.98.804l-.723 4.47a1 1 0 0 0 .54 1.055L25 19l.685 4.056A11.98 11.98 0 0 1 16 28z" fill="currentColor"/>'
    ],
    [
      'delete',
      '<path d="M12 12h2v12h-2z" fill="currentColor"/><path d="M18 12h2v12h-2z" fill="currentColor"/><path d="M4 6v2h2v20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8h2V6zm4 22V8h16v20z" fill="currentColor"/><path d="M12 2h8v2h-8z" fill="currentColor"/>'
    ],
    [
      'checkmark',
      '<path d="M13 24l-9-9l1.414-1.414L13 21.171L26.586 7.586L28 9L13 24z" fill="currentColor"/>'
    ],
    [
      'upload',
      '<path d="M6 17l1.41 1.41L15 10.83V30h2V10.83l7.59 7.58L26 17L16 7L6 17z" fill="currentColor"/><path d="M6 8V4h20v4h2V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v4z" fill="currentColor"/>'
    ],
    [
      'view-off',
      '<path d="M5.24 22.51l1.43-1.42A14.06 14.06 0 0 1 3.07 16C5.1 10.93 10.7 7 16 7a12.38 12.38 0 0 1 4 .72l1.55-1.56A14.72 14.72 0 0 0 16 5A16.69 16.69 0 0 0 1.06 15.66a1 1 0 0 0 0 .68a16 16 0 0 0 4.18 6.17z" fill="currentColor"/><path d="M12 15.73a4 4 0 0 1 3.7-3.7l1.81-1.82a6 6 0 0 0-7.33 7.33z" fill="currentColor"/><path d="M30.94 15.66a16.4 16.4 0 0 0-5.74-7.44L30 3.41L28.59 2L2 28.59L3.41 30l5.1-5.1A15.29 15.29 0 0 0 16 27a16.69 16.69 0 0 0 14.94-10.66a1 1 0 0 0 0-.68zM20 16a4 4 0 0 1-6 3.44L19.44 14a4 4 0 0 1 .56 2zm-4 9a13.05 13.05 0 0 1-6-1.58l2.54-2.54a6 6 0 0 0 8.35-8.35l2.87-2.87A14.54 14.54 0 0 1 28.93 16C26.9 21.07 21.3 25 16 25z" fill="currentColor"/>'
    ],
    [
      'time',
      '<path d="M16 30a14 14 0 1 1 14-14a14 14 0 0 1-14 14zm0-26a12 12 0 1 0 12 12A12 12 0 0 0 16 4z" fill="currentColor"/><path d="M20.59 22L15 16.41V7h2v8.58l5 5.01L20.59 22z" fill="currentColor"/>'
    ], 
    [
      'manage-protection',
      '<path d="M16 30l-6.176-3.293A10.982 10.982 0 0 1 4 17V4a2.002 2.002 0 0 1 2-2h20a2.002 2.002 0 0 1 2 2v13a10.982 10.982 0 0 1-5.824 9.707zM6 4v13a8.985 8.985 0 0 0 4.766 7.942L16 27.733l5.234-2.79A8.985 8.985 0 0 0 26 17V4z" fill="currentColor"/><path d="M16 25.277V6h8v10.805a7 7 0 0 1-3.7 6.173z" fill="currentColor"/>'
    ],
    [
      'folder',
      '<path d="M11.17 6l3.42 3.41l.58.59H28v16H4V6h7.17m0-2H4a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2H16l-3.41-3.41A2 2 0 0 0 11.17 4z" fill="currentColor"/>'
    ],
    [
      'download',
      '<path d="M26 15l-1.41-1.41L17 21.17V2h-2v19.17l-7.59-7.58L6 15l10 10l10-10z" fill="currentColor"/><path d="M26 24v4H6v-4H4v4a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-4z" fill="currentColor"/>'
    ],
    [
      'microphone',
      '<path d="M23 14v3a7 7 0 0 1-14 0v-3H7v3a9 9 0 0 0 8 8.94V28h-4v2h10v-2h-4v-2.06A9 9 0 0 0 25 17v-3z" fill="currentColor"/><path d="M16 22a5 5 0 0 0 5-5V7a5 5 0 0 0-10 0v10a5 5 0 0 0 5 5zM13 7a3 3 0 0 1 6 0v10a3 3 0 0 1-6 0z" fill="currentColor"/>'
    ],
    [
      'video',
      '<path d="M21 26H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h17a2 2 0 0 1 2 2v4.06l5.42-3.87A1 1 0 0 1 30 9v14a1 1 0 0 1-1.58.81L23 19.94V24a2 2 0 0 1-2 2zM4 8v16h17v-6a1 1 0 0 1 1.58-.81L28 21.06V10.94l-5.42 3.87A1 1 0 0 1 21 14V8z" fill="currentColor"/>'
    ],
    [
      'chat',
      '<path d="M17.74 30L16 29l4-7h6a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9v2H6a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4h20a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4h-4.84z" fill="currentColor"/><path d="M8 10h16v2H8z" fill="currentColor"/><path d="M8 16h10v2H8z" fill="currentColor"/>'
    ],
    [
      'launch',
      '<path d="M26 28H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9v2H6v20h20v-9h2v9a2 2 0 0 1-2 2z" fill="currentColor"/><path d="M21 2v2h5.59L18 12.59L19.41 14L28 5.41V11h2V2h-9z" fill="currentColor"/>'
    ],
    [
      'settings',
      '<path d="M27 16.76V16v-.77l1.92-1.68A2 2 0 0 0 29.3 11l-2.36-4a2 2 0 0 0-1.73-1a2 2 0 0 0-.64.1l-2.43.82a11.35 11.35 0 0 0-1.31-.75l-.51-2.52a2 2 0 0 0-2-1.61h-4.68a2 2 0 0 0-2 1.61l-.51 2.52a11.48 11.48 0 0 0-1.32.75l-2.38-.86A2 2 0 0 0 6.79 6a2 2 0 0 0-1.73 1L2.7 11a2 2 0 0 0 .41 2.51L5 15.24v1.53l-1.89 1.68A2 2 0 0 0 2.7 21l2.36 4a2 2 0 0 0 1.73 1a2 2 0 0 0 .64-.1l2.43-.82a11.35 11.35 0 0 0 1.31.75l.51 2.52a2 2 0 0 0 2 1.61h4.72a2 2 0 0 0 2-1.61l.51-2.52a11.48 11.48 0 0 0 1.32-.75l2.42.82a2 2 0 0 0 .64.1a2 2 0 0 0 1.73-1l2.28-4a2 2 0 0 0-.41-2.51zM25.21 24l-3.43-1.16a8.86 8.86 0 0 1-2.71 1.57L18.36 28h-4.72l-.71-3.55a9.36 9.36 0 0 1-2.7-1.57L6.79 24l-2.36-4l2.72-2.4a8.9 8.9 0 0 1 0-3.13L4.43 12l2.36-4l3.43 1.16a8.86 8.86 0 0 1 2.71-1.57L13.64 4h4.72l.71 3.55a9.36 9.36 0 0 1 2.7 1.57L25.21 8l2.36 4l-2.72 2.4a8.9 8.9 0 0 1 0 3.13L27.57 20z" fill="currentColor"/><path d="M16 22a6 6 0 1 1 6-6a5.94 5.94 0 0 1-6 6zm0-10a3.91 3.91 0 0 0-4 4a3.91 3.91 0 0 0 4 4a3.91 3.91 0 0 0 4-4a3.91 3.91 0 0 0-4-4z" fill="currentColor"/>'
    ],
    [
      'settings-adjust',
      '<path d="M30 8h-4.1c-.5-2.3-2.5-4-4.9-4s-4.4 1.7-4.9 4H2v2h14.1c.5 2.3 2.5 4 4.9 4s4.4-1.7 4.9-4H30V8zm-9 4c-1.7 0-3-1.3-3-3s1.3-3 3-3s3 1.3 3 3s-1.3 3-3 3z" fill="currentColor"/><path d="M2 24h4.1c.5 2.3 2.5 4 4.9 4s4.4-1.7 4.9-4H30v-2H15.9c-.5-2.3-2.5-4-4.9-4s-4.4 1.7-4.9 4H2v2zm9-4c1.7 0 3 1.3 3 3s-1.3 3-3 3s-3-1.3-3-3s1.3-3 3-3z" fill="currentColor"/>'
    ],
    [
      'information',
      '<path d="M17 22v-9h-4v2h2v7h-3v2h8v-2h-3z" fill="currentColor"/><path d="M16 7a1.5 1.5 0 1 0 1.5 1.5A1.5 1.5 0 0 0 16 7z" fill="currentColor"/><path d="M16 30a14 14 0 1 1 14-14a14 14 0 0 1-14 14zm0-26a12 12 0 1 0 12 12A12 12 0 0 0 16 4z" fill="currentColor"/>'
    ],
    [
      'terminal',
      '<path d="M26 4.01H6a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-20a2 2 0 0 0-2-2zm0 2v4H6v-4zm-20 20v-14h20v14z" fill="currentColor"/><path d="M10.76 16.18l2.82 2.83l-2.82 2.83l1.41 1.41l4.24-4.24l-4.24-4.24l-1.41 1.41z" fill="currentColor"/>'
    ],
    [
      'arrow-up-right',
      '<path d="M10 6v2h12.59L6 24.59L7.41 26L24 9.41V22h2V6H10z" fill="currentColor"/>'
    ]
  ]

  iconList.forEach(([name, svg]) => {
    icons[name] = { body: svg }
  })

  Iconify.addCollection({
    prefix: 'carbon',
    height: 32,
    width: 32,
    icons,
  })
})()
