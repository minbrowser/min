function buildAppMenu (options = {}) {
  const keyMap = userKeyMap(settings.get('keyMap'))

  function getFormattedKeyMapEntry (keybinding) {
    const value = keyMap[keybinding]

    if (value) {
      if (Array.isArray(value)) {
        // value is array if multiple entries are set
        return value[0].replace('mod', 'CmdOrCtrl')
      } else {
        return value.replace('mod', 'CmdOrCtrl')
      }
    }

    return null
  }
  var tabTaskActions = [
    {
      label: '➕ ' + l('appMenuNewTab'),
      accelerator: getFormattedKeyMapEntry('addTab'),
      click: function (item, window, event) {
        // keyboard shortcuts for these items are handled in the renderer
        if (!event.triggeredByAccelerator) {
          sendIPCToWindow(window, 'addTab')
        }
      }
    },
    {
      label: '🔒 ' + l('appMenuNewPrivateTab'),
      accelerator: getFormattedKeyMapEntry('addPrivateTab'),
      click: function (item, window, event) {
        if (!event.triggeredByAccelerator) {
          sendIPCToWindow(window, 'addPrivateTab')
        }
      }
    },
    {
      label: '📋' + l('appMenuNewTask'),
      accelerator: getFormattedKeyMapEntry('addTask'),
      click: function (item, window, event) {
        if (!event.triggeredByAccelerator) {
          sendIPCToWindow(window, 'addTask')
        }
      }
    },
    {
      label: '🖥️ ' + l('appMenuNewWindow'),
      accelerator: getFormattedKeyMapEntry('addWindow'),
      click: function () {
        if (isFocusMode) {
          showFocusModeDialog2()
        } else {
          createWindow()
        }
      }
    }
  ]

  var personalDataItems = [
    {
      label:'🔖 ' + l('appMenuBookmarks'),
      accelerator: getFormattedKeyMapEntry('showBookmarks'),
      click: function (item, window, event) {
        if (!event.triggeredByAccelerator) {
          sendIPCToWindow(window, 'showBookmarks')
        }
      }
    },
    {
      label: '🕘 '+l('appMenuHistory'),
      accelerator: getFormattedKeyMapEntry('showHistory'),
      click: function (item, window, event) {
        if (!event.triggeredByAccelerator) {
          sendIPCToWindow(window, 'showHistory')
        }
      }
    }
  ]

  var quitAction = {
    label: '❌ '+l('appMenuQuit').replace('%n', app.name),
    accelerator: getFormattedKeyMapEntry('quitMin'),
    click: function (item, window, event) {
      if (!event.triggeredByAccelerator) {
        app.quit()
      }
    }
  }

  var preferencesAction = {
    label: '⚙️ '+l('appMenuPreferences'),
    accelerator: 'CmdOrCtrl+,',
    click: function (item, window) {
      sendIPCToWindow(window, 'addTab', {
        url: 'min://app/pages/settings/index.html'
      })
    }
  }

  var template = [
    ...(options.secondary ? tabTaskActions : []),
    ...(options.secondary ? [{ type: 'separator' }] : []),
    ...(options.secondary ? personalDataItems : []),
    ...(options.secondary ? [{ type: 'separator' }] : []),
    ...(options.secondary ? [preferencesAction] : []),
    ...(options.secondary ? [{ type: 'separator' }] : []),
    ...(process.platform === 'darwin'
      ? [
        {
          label: app.name,
          submenu: [
            {
              label: 'ℹ️ '+l('appMenuAbout').replace('%n', app.name),
              role: 'about'
            },
            {
              type: 'separator'
            },
            preferencesAction,
            {
              label: 'Services',
              role: 'services',
              submenu: []
            },
            {
              type: 'separator'
            },
            {
              label: l('appMenuHide').replace('%n', app.name),
              accelerator: 'CmdOrCtrl+H',
              role: 'hide'
            },
            {
              label: l('appMenuHideOthers'),
              accelerator: 'CmdOrCtrl+Alt+H',
              role: 'hideothers'
            },
            {
              label: l('appMenuShowAll'),
              role: 'unhide'
            },
            {
              type: 'separator'
            },
            quitAction
          ]
        }
      ] : []),
    {
      label: '📝 '+l('appMenuFile'),
      submenu: [
        ...(!options.secondary ? tabTaskActions : []),
        ...(!options.secondary ? [{ type: 'separator' }] : []),
        {
          label: '📑 '+l('appMenuSavePageAs'),
          accelerator: 'CmdOrCtrl+s',
          click: function (item, window) {
            sendIPCToWindow(window, 'saveCurrentPage')
          }
        },
        {
          type: 'separator'
        },
        {
          label: '🖨️ '+l('appMenuPrint'),
          accelerator: 'CmdOrCtrl+p',
          click: function (item, window) {
            sendIPCToWindow(window, 'print')
          }
        },
        ...(!options.secondary && process.platform === 'linux' ? [{ type: 'separator' }] : []),
        ...(!options.secondary && process.platform === 'linux' ? [quitAction] : [])
      ]
    },
    {
      label: '✂️ '+l('appMenuEdit'),
      submenu: [
        {
          label: '↩️ '+l('appMenuUndo'),
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo'
        },
        {
          label: '↪️ '+l('appMenuRedo'),
          accelerator: 'Shift+CmdOrCtrl+Z',
          role: 'redo'
        },
        {
          type: 'separator'
        },
        {
          label: '🔪 '+l('appMenuCut'),
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        },
        {
          label: '📋 '+l('appMenuCopy'),
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: '📥 '+l('appMenuPaste'),
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        },
        {
          label: '📥➕ '+l('appMenuPasteAndMatchStyle'),
          accelerator: 'Shift+CmdOrCtrl+V',
          role: 'pasteAndMatchStyle'
        },
        {
          label: '✅ '+l('appMenuSelectAll'),
          accelerator: 'CmdOrCtrl+A',
          role: 'selectall'
        },
        {
          type: 'separator'
        },
        {
          label: '🔍 '+l('appMenuFind'),
          accelerator: 'CmdOrCtrl+F',
          click: function (item, window) {
            sendIPCToWindow(window, 'findInPage')
          }
        },
        ...(!options.secondary && process.platform !== 'darwin' ? [{ type: 'separator' }] : []),
        ...(!options.secondary && process.platform !== 'darwin' ? [preferencesAction] : [])
      ]
    },
    {
      label: '🖥️ '+l('appMenuView'),
      submenu: [
        ...(!options.secondary ? personalDataItems : []),
        ...(!options.secondary ? [{ type: 'separator' }] : []),
        {
          label: '🔍 '+l('appMenuZoomIn'),
          accelerator: 'CmdOrCtrl+Plus',
          click: function (item, window) {
            sendIPCToWindow(window, 'zoomIn')
          }
        },
        // Hidden item to enable shortcut on keyboards where = is on a different physical key than +
        {
          label: '🔍 '+l('appMenuZoomIn'),
          accelerator: 'CmdOrCtrl+=',
          click: function (item, window) {
            sendIPCToWindow(window, 'zoomIn')
          },
          visible: false
        },
        {
          label: '🔎 '+l('appMenuZoomOut'),
          accelerator: 'CmdOrCtrl+-',
          click: function (item, window) {
            sendIPCToWindow(window, 'zoomOut')
          }
        },
        {
          label: '⏺️ '+l('appMenuActualSize'),
          accelerator: 'CmdOrCtrl+0',
          click: function (item, window) {
            sendIPCToWindow(window, 'zoomReset')
          }
        },
        {
          type: 'separator'
        },
        {
          label: '🎯 '+l('appMenuFocusMode'),
          accelerator: undefined,
          type: 'checkbox',
          checked: false,
          click: function (item, window) {
            if (isFocusMode) {
              isFocusMode = false
              windows.getAll().forEach(win => sendIPCToWindow(win, 'exitFocusMode'))
            } else {
              isFocusMode = true
              windows.getAll().forEach(win => sendIPCToWindow(win, 'enterFocusMode'))

              // wait to show the message until the tabs have been hidden, to make the message less confusing
              setTimeout(function() {
                showFocusModeDialog1()
              }, 16);
            }
          }
        },
        {
          label: '📺 '+l('appMenuFullScreen'),
          accelerator: (function () {
            if (process.platform == 'darwin') { return 'Ctrl+Command+F' } else { return 'F11' }
          })(),
          role: 'togglefullscreen'
        }
      ]
    },
    {
      label:'<> '   +l('appMenuDeveloper'),
      submenu: [
        {
          label: '🛠️ '+l('appMenuInspectPage'),
          accelerator: (function () {
            if (process.platform == 'darwin') { return 'Cmd+Alt+I' } else { return 'Ctrl+Shift+I' }
          })(),
          click: function (item, window) {
            sendIPCToWindow(window, 'inspectPage')
          }
        },
        // this is defined a second time (but hidden) in order to provide two keyboard shortcuts
        {
          label: l('appMenuInspectPage'),
          visible: false,
          accelerator: 'f12',
          click: function (item, window) {
            sendIPCToWindow(window, 'inspectPage')
          }
        },
        ...(isDevelopmentMode || isDebuggingEnabled ?
          [
            {
              type: 'separator'
            },
            {
              label: '🔄 '+l('appMenuReloadBrowser'),
              accelerator: (isDevelopmentMode ? 'alt+CmdOrCtrl+R' : undefined),
              click: function (item, focusedWindow) {
                destroyAllViews()
                windows.getAll().forEach(win => win.close())
                createWindow()
              }
            },
            {
              label: '🕵️‍♂️ '+l('appMenuInspectBrowser'),
              accelerator: (function () {
                if (process.platform === 'darwin') { return 'Shift+Cmd+Alt+I' } else { return 'Ctrl+Shift+Alt+I' }
              })(),
              click: function (item, focusedWindow) {
                if (focusedWindow) getWindowWebContents(focusedWindow).toggleDevTools()
              }
            },
            {
              label: '🗃️ '+'Inspect Places Service',
              click: function (item, focusedWindow) {
                placesWindow.webContents.openDevTools({ mode: 'detach' })
              }
            }
          ] : [])
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
              if (windows.getAll().length > 0 && !windows.getAll().some(win => win.isFocused())) {
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
            label: l('appMenuAlwaysOnTop'),
            type: 'checkbox',
            checked: settings.get('windowAlwaysOnTop') || false,
            click: function (item, window) {
              windows.getAll().forEach(function(win) {
                win.setAlwaysOnTop(item.checked)
              })
              settings.set('windowAlwaysOnTop', item.checked)
            }
          },
          {
            type: 'separator'
          },
          {
            label: l('appMenuBringToFront'),
            role: 'front'
          }
        ]
      }
    ] : []),
    {
      label: '🆘 '+l('appMenuHelp'),
      role: 'help',
      submenu: [
        {
          label: '⌨️   '+l('appMenuKeyboardShortcuts'),
          click: function () {
            openTabInWindow('https://github.com/minbrowser/min/wiki#keyboard-shortcuts')
          }
        },
        {
          label: '🐞  '+l('appMenuReportBug'),
          click: function () {
            openTabInWindow('https://github.com/moodynooby/fireMin/new')
          }
        },
        {
          label: '🎓 '+l('appMenuTakeTour'),
          click: function () {
            openTabInWindow('https://vagabond-vacation-18e.notion.site/Tour-1fc18de2cb6a80e98f27e98e45792888?pvs=4')
          }
        },
        {
          label: l('appMenuViewGithub'),
          click: function () {
            openTabInWindow('https://github.com/moodynooby/fireMin')
          }
        },
        ...(process.platform !== 'darwin' ? [{ type: 'separator' }] : []),
        ...(process.platform !== 'darwin' ? [{
          label: 'ℹ️ '+l('appMenuAbout').replace('%n', app.name),
          click: function (item, window) {
            var info = [
              'FireMin v' + app.getVersion(),
              'Chromium v' + process.versions.chrome
            ]
            electron.dialog.showMessageBox({
              type: 'info',
              title: l('appMenuAbout').replace('%n', app.name),
              message: info.join('\n'),
              buttons: [l('closeDialog')]
            })
          }
        }] : [])
      ]
    },
    ...(options.secondary && process.platform !== 'darwin' ? [{ type: 'separator' }] : []),
    ...(options.secondary && process.platform !== 'darwin' ? [quitAction] : [])
  ]
  return Menu.buildFromTemplate(template)
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
      },
      {
        label: l('appMenuNewWindow'),
        click: function () {
          if (isFocusMode) {
            showFocusModeDialog2()
          } else {
            createWindow()
          }
        }
      }
    ]

    var dockMenu = Menu.buildFromTemplate(template)
    app.dock.setMenu(dockMenu)
  }
}
