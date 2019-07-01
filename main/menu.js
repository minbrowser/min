function createAppMenu () {
  var Menu = electron.Menu
  var MenuItem = electron.MenuItem

  var appName = app.getName()

  var tabTaskActions = [
    {
      label: l('appMenuNewTab'),
      accelerator: 'CmdOrCtrl+t',
      click: function (item, window) {
        sendIPCToWindow(window, 'addTab')
      }
    },
    {
      label: l('appMenuDuplicateTab'),
      accelerator: 'shift+CmdOrCtrl+d',
      click: function (item, window) {
        sendIPCToWindow(window, 'duplicateTab')
      }
    },
    {
      label: l('appMenuNewPrivateTab'),
      accelerator: 'shift+CmdOrCtrl+p',
      click: function (item, window) {
        sendIPCToWindow(window, 'addPrivateTab')
      }
    },
    {
      label: l('appMenuNewTask'),
      accelerator: 'CmdOrCtrl+n',
      click: function (item, window) {
        sendIPCToWindow(window, 'addTask')
      }
    }
  ]

  var personalDataItems = [
    {
      label: l('appMenuBookmarks'),
      accelerator: undefined,
      click: function (item, window) {
        sendIPCToWindow(window, 'showBookmarks')
      }
    },
    {
      label: l('appMenuHistory'),
      accelerator: undefined,
      click: function (item, window) {
        sendIPCToWindow(window, 'showHistory')
      }
    },
    {
      label: l('appMenuReadingList'),
      accelerator: undefined,
      click: function (item, window) {
        sendIPCToWindow(window, 'showReadingList')
      }
    }
  ]

  var template = [
    ...(process.platform === 'win32' ? tabTaskActions : []),
    ...(process.platform === 'win32' ? [{type: 'separator'}] : []),
    ...(process.platform === 'win32' ? personalDataItems : []),
    ...(process.platform === 'win32' ? [{type: 'separator'}] : []),
    ...(process.platform === 'darwin' ?
      [
        {
          label: appName,
          submenu: [
            {
              label: l('appMenuAbout').replace('%n', appName),
              role: 'about'
            },
            {
              type: 'separator'
            },
            {
              label: l('appMenuPreferences'),
              accelerator: 'CmdOrCtrl+,',
              click: function (item, window) {
                sendIPCToWindow(window, 'addTab', {
                  url: 'file://' + __dirname + '/pages/settings/index.html'
                })
              }
            },
            {
              label: 'Services',
              role: 'services',
              submenu: []
            },
            {
              type: 'separator'
            },
            {
              label: l('appMenuHide').replace('%n', appName),
              accelerator: 'CmdOrCtrl+H',
              role: 'hide'
            },
            {
              label: l('appMenuHideOthers'),
              accelerator: 'CmdOrCtrl+Shift+H',
              role: 'hideothers'
            },
            {
              label: l('appMenuShowAll'),
              role: 'unhide'
            },
            {
              type: 'separator'
            },
            {
              label: l('appMenuQuit').replace('%n', appName),
              accelerator: 'CmdOrCtrl+Q',
              click: function () {
                app.quit()
              }
            }
          ]
        }
      ] : []),
    {
      label: l('appMenuFile'),
      submenu: [
        ...(process.platform !== 'win32' ? tabTaskActions : []),
        ...(process.platform !== 'win32' ? [{type: 'separator'}] : []),
        {
          label: l('appMenuSavePageAs'),
          accelerator: 'CmdOrCtrl+s',
          click: function (item, window) {
            sendIPCToWindow(window, 'saveCurrentPage')
          }
        },
        {
          type: 'separator'
        },
        {
          label: l('appMenuPrint'),
          accelerator: 'CmdOrCtrl+p',
          click: function (item, window) {
            sendIPCToWindow(window, 'print')
          }
        }
      ]
    },
    {
      label: l('appMenuEdit'),
      submenu: [
        {
          label: l('appMenuUndo'),
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo'
        },
        {
          label: l('appMenuRedo'),
          accelerator: 'Shift+CmdOrCtrl+Z',
          role: 'redo'
        },
        {
          type: 'separator'
        },
        {
          label: l('appMenuCut'),
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        },
        {
          label: l('appMenuCopy'),
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: l('appMenuPaste'),
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        },
        {
          label: l('appMenuSelectAll'),
          accelerator: 'CmdOrCtrl+A',
          role: 'selectall'
        },
        {
          type: 'separator'
        },
        {
          label: l('appMenuFind'),
          accelerator: 'CmdOrCtrl+F',
          click: function (item, window) {
            sendIPCToWindow(window, 'findInPage')
          }
        },
        ...(process.platform !== 'darwin' ? [{type: 'separator'}] : []),
        ...(process.platform !== 'darwin' ? [{
          label: l('appMenuPreferences'),
          accelerator: 'CmdOrCtrl+,',
          click: function (item, window) {
            sendIPCToWindow(window, 'addTab', {
              url: 'file://' + __dirname + '/pages/settings/index.html'
            })
          }
        }] : [])
      ]
    },
    {
      label: l('appMenuView'),
      submenu: [
        ...(process.platform !== 'win32' ? personalDataItems : []),
        ...(process.platform !== 'win32' ? [{type: 'separator'}] : []),
        {
          label: l('appMenuZoomIn'),
          accelerator: 'CmdOrCtrl+=',
          click: function (item, window) {
            sendIPCToWindow(window, 'zoomIn')
          }
        },
        {
          label: l('appMenuZoomOut'),
          accelerator: 'CmdOrCtrl+-',
          click: function (item, window) {
            sendIPCToWindow(window, 'zoomOut')
          }
        },
        {
          label: l('appMenuActualSize'),
          accelerator: 'CmdOrCtrl+0',
          click: function (item, window) {
            sendIPCToWindow(window, 'zoomReset')
          }
        },
        {
          type: 'separator'
        },
        {
          label: l('appMenuFocusMode'),
          accelerator: undefined,
          type: 'checkbox',
          checked: false,
          click: function (item, window) {
            if (isFocusMode) {
              item.checked = false
              isFocusMode = false
              sendIPCToWindow(window, 'exitFocusMode')
            } else {
              item.checked = true
              isFocusMode = true
              sendIPCToWindow(window, 'enterFocusMode')
            }
          }
        },
        {
          label: l('appMenuFullScreen'),
          accelerator: (function () {
            if (process.platform == 'darwin')
              return 'Ctrl+Command+F'
            else
              return 'F11'
          })(),
          role: 'togglefullscreen'
        }
      ]
    },
    {
      label: l('appMenuDeveloper'),
      submenu: [
        {
          label: l('appMenuInspectPage'),
          accelerator: (function () {
            if (process.platform == 'darwin')
              return 'Cmd+Alt+I'
            else
              return 'Ctrl+Shift+I'
          })(),
          click: function (item, window) {
            sendIPCToWindow(window, 'inspectPage')
          }
        },
        {
          type: 'separator'
        },
        {
          label: l('appMenuReloadBrowser'),
          accelerator: undefined,
          click: function (item, focusedWindow) {
            if (focusedWindow) {
              destroyAllViews()
              focusedWindow.reload()
            }
          }
        },
        {
          label: l('appMenuInspectBrowser'),
          click: function (item, focusedWindow) {
            if (focusedWindow) focusedWindow.toggleDevTools()
          }
        }
      ]
    },
    ...(process.platform === 'darwin' ? [
      {
        label: l('appMenuWindow'),
        role: 'window',
        submenu: [
          {
            label: l('appMenuMinimize'),
            accelerator: 'CmdOrCtrl+M',
            role: 'minimize'
          },
          {
            label: l('appMenuClose'),
            accelerator: 'CmdOrCtrl+W',
            click: function (item, window) {
              if (!mainWindow.isFocused()) {
                // a devtools window is focused, close it
                var contents = webContents.getAllWebContents()
                for (var i = 0; i < contents.length; i++) {
                  if (contents[i].isDevToolsFocused()) {
                    contents[i].closeDevTools()
                    return
                  }
                }
              }
            // otherwise, this event will be handled in the main window
            }
          },
          {
            type: 'separator'
          }, {
            label: l('appMenuBringToFront'),
            role: 'front'
          }
        ]
      }
    ] : []),
    {
      label: l('appMenuHelp'),
      role: 'help',
      submenu: [
        {
          label: l('appMenuKeyboardShortcuts'),
          click: function () {
            openTabInWindow('https://github.com/minbrowser/min/wiki#keyboard-shortcuts')
          }
        },
        {
          label: l('appMenuReportBug'),
          click: function () {
            openTabInWindow('https://github.com/minbrowser/min/issues/new')
          }
        },
        {
          label: l('appMenuTakeTour'),
          click: function () {
            openTabInWindow('https://minbrowser.github.io/min/tour/')
          }
        },
        {
          label: l('appMenuViewGithub'),
          click: function () {
            openTabInWindow('https://github.com/minbrowser/min')
          }
        },
        ...(process.platform !== 'darwin' ? [{type: 'separator'}] : []),
        ...(process.platform !== 'darwin' ? [{
          label: l('appMenuAbout').replace('%n', appName),
          click: function (item, window) {
            var info = [
              'Min v' + app.getVersion(),
              'Chromium v' + process.versions.chrome
            ]
            electron.dialog.showMessageBox({
              type: 'info',
              title: l('appMenuAbout').replace('%n', appName),
              message: info.join('\n'),
              buttons: [l('closeDialog')]
            })
          }
        }] : [])
      ]
    }
  ]

  mainMenu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(mainMenu)
}

function createDockMenu () {
  // create the menu. based on example from https://github.com/electron/electron/blob/master/docs/tutorial/desktop-environment-integration.md#custom-dock-menu-macos
  if (process.platform === 'darwin') {
    var Menu = electron.Menu

    var template = [
      {
        label: l('appMenuNewTab'),
        click: function (item, window) {
          sendIPCToWindow(window, 'addTab')
        }
      },
      {
        label: l('appMenuNewPrivateTab'),
        click: function (item, window) {
          sendIPCToWindow(window, 'addPrivateTab')
        }
      },
      {
        label: l('appMenuNewTask'),
        click: function (item, window) {
          sendIPCToWindow(window, 'addTask')
        }
      }
    ]

    var dockMenu = Menu.buildFromTemplate(template)
    app.dock.setMenu(dockMenu)
  }
}
