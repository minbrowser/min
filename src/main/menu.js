import { app, dialog, Menu, webContents } from 'electron'
import path from 'path'

import { sendIPCToWindow, openTabInWindow } from './windowUtils'
import { isDarwin, isLinux } from './utils'
import g from './global'
import settings from './settings'
import { destroyAllViews } from './viewManager'

const l = s => s // just a temporary stub for the i18n method

const buildAppMenu = (options = {}) => {
    const tabTaskActions = [
        {
            label: l('appMenuNewTab'),
            accelerator: 'CmdOrCtrl+t',
            click: (item, window, event) => {
                // keyboard shortcuts for these items are handled in the renderer
                if (!event.triggeredByAccelerator) {
                    sendIPCToWindow(window, 'addTab')
                }
            }
        },
        {
            label: l('appMenuDuplicateTab'),
            accelerator: 'shift+CmdOrCtrl+d',
            click: (item, window, event) => {
                if (!event.triggeredByAccelerator) {
                    sendIPCToWindow(window, 'duplicateTab')
                }
            }
        },
        {
            label: l('appMenuNewPrivateTab'),
            accelerator: 'shift+CmdOrCtrl+p',
            click: (item, window, event) => {
                if (!event.triggeredByAccelerator) {
                    sendIPCToWindow(window, 'addPrivateTab')
                }
            }
        },
        {
            label: l('appMenuNewTask'),
            accelerator: 'CmdOrCtrl+n',
            click: (item, window, event) => {
                if (!event.triggeredByAccelerator) {
                    sendIPCToWindow(window, 'addTask')
                }
            }
        }
    ]

    const personalDataItems = [
        {
            label: l('appMenuBookmarks'),
            accelerator: undefined,
            click: (item, window) => {
                sendIPCToWindow(window, 'showBookmarks')
            }
        },
        {
            label: l('appMenuHistory'),
            accelerator: undefined,
            click: (item, window) => {
                sendIPCToWindow(window, 'showHistory')
            }
        },
        {
            label: l('appMenuReadingList'),
            accelerator: undefined,
            click: (item, window) => {
                sendIPCToWindow(window, 'showReadingList')
            }
        }
    ]

    const quitAction = {
        label: l('appMenuQuit').replace('%n', app.name),
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
            app.quit()
        }
    }

    const template = [
        ...(options.secondary ? tabTaskActions : []),
        ...(options.secondary ? [{type: 'separator'}] : []),
        ...(options.secondary ? personalDataItems : []),
        ...(options.secondary ? [{type: 'separator'}] : []),
        ...(isDarwin
            ? [
                {
                    label: app.name,
                    submenu: [
                        {
                            label: l('appMenuAbout').replace('%n', app.name),
                            role: 'about'
                        },
                        {
                            type: 'separator'
                        },
                        {
                            label: l('appMenuPreferences'),
                            accelerator: 'CmdOrCtrl+,',
                            click: (item, window) => {
                                sendIPCToWindow(window, 'addTab', {
                                    url: path.join('file://', __dirname) + '/pages/settings/index.html'
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
                            label: l('appMenuHide').replace('%n', app.name),
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
                        quitAction
                    ]
                }
            ] : []),
        {
            label: l('appMenuFile'),
            submenu: [
                ...(!options.secondary ? tabTaskActions : []),
                ...(!options.secondary ? [{type: 'separator'}] : []),
                {
                    label: l('appMenuSavePageAs'),
                    accelerator: 'CmdOrCtrl+s',
                    click: (item, window) => {
                        sendIPCToWindow(window, 'saveCurrentPage')
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: l('appMenuPrint'),
                    accelerator: 'CmdOrCtrl+p',
                    click: (item, window) => {
                        sendIPCToWindow(window, 'print')
                    }
                },
                ...(isLinux ? [{type: 'separator'}] : []),
                ...(isLinux ? [quitAction] : [])
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
                    click: (item, window) => {
                        sendIPCToWindow(window, 'findInPage')
                    }
                },
                ...(!isDarwin ? [{type: 'separator'}] : []),
                ...(!isDarwin ? [{
                    label: l('appMenuPreferences'),
                    accelerator: 'CmdOrCtrl+,',
                    click: (item, window) => {
                        sendIPCToWindow(window, 'addTab', {
                            url: path.join('file://', __dirname) + '/pages/settings/index.html'
                        })
                    }
                }] : [])
            ]
        },
        {
            label: l('appMenuView'),
            submenu: [
                ...(!options.secondary ? personalDataItems : []),
                ...(!options.secondary ? [{type: 'separator'}] : []),
                {
                    label: l('appMenuZoomIn'),
                    accelerator: 'CmdOrCtrl+=',
                    click: (item, window) => {
                        sendIPCToWindow(window, 'zoomIn')
                    }
                },
                {
                    label: l('appMenuZoomOut'),
                    accelerator: 'CmdOrCtrl+-',
                    click: (item, window) => {
                        sendIPCToWindow(window, 'zoomOut')
                    }
                },
                {
                    label: l('appMenuActualSize'),
                    accelerator: 'CmdOrCtrl+0',
                    click: (item, window) => {
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
                    click: (item, window) => {
                        if (g.isFocusMode) {
                            g.isFocusMode = false
                            sendIPCToWindow(window, 'exitFocusMode')
                        } else {
                            g.isFocusMode = true
                            sendIPCToWindow(window, 'enterFocusMode')
                        }
                    }
                },
                {
                    label: l('appMenuFullScreen'),
                    accelerator: (() => {
                        if (isDarwin) {
                            return 'Ctrl+Command+F'
                        }

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
                    accelerator: (() => {
                        if (isDarwin) {
                            return 'Cmd+Alt+I'
                        }

                        return 'Ctrl+Shift+I'
                    })(),
                    click: (item, window) => {
                        sendIPCToWindow(window, 'inspectPage')
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: l('appMenuReloadBrowser'),
                    accelerator: undefined,
                    click: (item, focusedWindow) => {
                        if (focusedWindow) {
                            destroyAllViews()
                            focusedWindow.reload()
                        }
                    }
                },
                {
                    label: l('appMenuInspectBrowser'),
                    click: (item, focusedWindow) => {
                        if (focusedWindow) focusedWindow.toggleDevTools()
                    }
                }
            ]
        },
        ...(isDarwin ? [
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
                        click: (item, window) => {
                            if (g.mainWindow && !g.mainWindow.isFocused()) {
                                // a devtools window is focused, close it
                                const contents = webContents.getAllWebContents()
                                for (let i = 0; i < contents.length; i++) {
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
                        click: (item, window) => {
                            if (g.mainWindow) {
                                g.mainWindow.setAlwaysOnTop(item.checked)
                            }
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
            label: l('appMenuHelp'),
            role: 'help',
            submenu: [
                {
                    label: l('appMenuKeyboardShortcuts'),
                    click: () => {
                        openTabInWindow('https://github.com/minbrowser/min/wiki#keyboard-shortcuts')
                    }
                },
                {
                    label: l('appMenuReportBug'),
                    click: () => {
                        openTabInWindow('https://github.com/minbrowser/min/issues/new')
                    }
                },
                {
                    label: l('appMenuTakeTour'),
                    click: () => {
                        openTabInWindow('https://minbrowser.github.io/min/tour/')
                    }
                },
                {
                    label: l('appMenuViewGithub'),
                    click: () => {
                        openTabInWindow('https://github.com/minbrowser/min')
                    }
                },
                ...(!isDarwin ? [{type: 'separator'}] : []),
                ...(!isDarwin ? [{
                    label: l('appMenuAbout').replace('%n', app.name),
                    click: (item, window) => {
                        const info = [
                            'Min v' + app.getVersion(),
                            'Chromium v' + process.versions.chrome
                        ]
                        dialog.showMessageBox({
                            type: 'info',
                            title: l('appMenuAbout').replace('%n', app.name),
                            message: info.join('\n'),
                            buttons: [l('closeDialog')]
                        })
                    }
                }] : [])
            ]
        }
    ]
    return Menu.buildFromTemplate(template)
}

const createDockMenu = () => {
    // create the menu. based on example from https://github.com/electron/electron/blob/master/docs/tutorial/desktop-environment-integration.md#custom-dock-menu-macos
    if (isDarwin) {
        const template = [
            {
                label: l('appMenuNewTab'),
                click: (item, window) => {
                    sendIPCToWindow(window, 'addTab')
                }
            },
            {
                label: l('appMenuNewPrivateTab'),
                click: (item, window) => {
                    sendIPCToWindow(window, 'addPrivateTab')
                }
            },
            {
                label: l('appMenuNewTask'),
                click: (item, window) => {
                    sendIPCToWindow(window, 'addTask')
                }
            }
        ]

        const dockMenu = Menu.buildFromTemplate(template)
        app.dock.setMenu(dockMenu)
    }
}

export {
    buildAppMenu,
    createDockMenu
}
