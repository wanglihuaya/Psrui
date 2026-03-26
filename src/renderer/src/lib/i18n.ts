import { useAtomValue } from 'jotai'
import { settingsAtom } from './settings'

const translations = {
  en: {
    // Title bar & General
    'app.title': 'PSRCHIVE Viewer',
    'app.settings': 'Settings',
    'app.help': 'Help',
    'app.about': 'About',
    'app.quit': 'Quit',

    // Menus
    'menu.file': 'File',
    'menu.view': 'View',
    'menu.tools': 'Tools',
    'menu.help': 'Help',
    'menu.openFile': 'Open File...',
    'menu.openFolder': 'Open Workspace...',
    'menu.closeFile': 'Close File',
    'menu.saveImage': 'Save Chart as Image...',
    'menu.saveArchive': 'Save Archive As...',
    'menu.revealInFinder': 'Reveal in Finder',
    'menu.newWindow': 'New Window',
    'menu.settings': 'Settings',

    // Sidebar & Navigation
    'nav.files': 'Files',
    'nav.archives': 'Archives',
    'nav.workspace': 'Workspace',
    'nav.openFile': 'Open File',
    'nav.openFolder': 'Open Folder',
    'nav.recent': 'Recent Files',
    'nav.noFiles': 'No files open',
    'nav.labels': 'Labels',
    'nav.metadata': 'Metadata',
    'nav.collapse': 'Collapse Sidebar',
    'nav.expand': 'Expand Sidebar',

    // Tab names
    'tabs.profile': 'Profile',
    'tabs.waterfall': 'Freq × Phase',
    'tabs.timePhase': 'Time × Phase',
    'tabs.bandpass': 'Bandpass',
    'tabs.psrcat': 'PSRCAT',

    // Metadata labels
    'meta.source': 'Source',
    'meta.telescope': 'Telescope',
    'meta.freq': 'Frequency',
    'meta.bw': 'Bandwidth',
    'meta.nchan': 'Channels',
    'meta.npol': 'Polarizations',
    'meta.nbin': 'Phase Bins',
    'meta.nsub': 'Sub-integrations',
    'meta.dm': 'DM',
    'meta.period': 'Period',
    'meta.site': 'Site',
    'meta.backend': 'Backend',

    // Settings
    'settings.title': 'Settings',
    'settings.general': 'General',
    'settings.appearance': 'Appearance',
    'settings.advanced': 'Advanced',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.colorscale': 'Chart Colorscale',
    'settings.defaultView': 'Default View',
    'settings.recentLimit': 'Recent Files Limit',
    'settings.backendPort': 'Backend Port',
    'settings.pythonPath': 'Python Path',
    'settings.showWelcome': 'Show Welcome Screen',
    'settings.save': 'Save',
    'settings.cancel': 'Cancel',
    'settings.close': 'Close',

    // Shortcuts
    'shortcuts.title': 'Keyboard Shortcuts',
    'shortcuts.open': 'Open File',
    'shortcuts.settings': 'Open Settings',
    'shortcuts.help': 'Show Help',
    'shortcuts.nextTab': 'Next Tab',
    'shortcuts.prevTab': 'Previous Tab',

    // Context menu
    'ctx.open': 'Open',
    'ctx.close': 'Close',
    'ctx.copyPath': 'Copy Path',
    'ctx.revealFinder': 'Reveal in Finder',
    'ctx.addLabel': 'Add Label',
    'ctx.removeLabel': 'Remove Label',

    // Status & Errors
    'status.ready': 'Ready',
    'status.loading': 'Loading data...',
    'status.backendOff': 'Backend Offline',
    'status.noFile': 'No file selected',
    'error.load': 'Failed to load archive',
    'error.backend': 'Cannot connect to backend server',
    'error.python': 'Python not found at specified path'
  },
  zh: {
    // Title bar & General
    'app.title': 'PSRCHIVE 查看器',
    'app.settings': '设置',
    'app.help': '帮助',
    'app.about': '关于',
    'app.quit': '退出',

    // Menus
    'menu.file': '文件',
    'menu.view': '视图',
    'menu.tools': '工具',
    'menu.help': '帮助',
    'menu.openFile': '打开文件...',
    'menu.openFolder': '打开工作区...',
    'menu.closeFile': '关闭文件',
    'menu.saveImage': '保存图表为图片...',
    'menu.saveArchive': '保存归档为...',
    'menu.revealInFinder': '在访达中显示',
    'menu.newWindow': '新建窗口',
    'menu.settings': '设置',

    // Sidebar & Navigation
    'nav.files': '文件',
    'nav.archives': '归档',
    'nav.workspace': '工作区',
    'nav.openFile': '打开文件',
    'nav.openFolder': '打开文件夹',
    'nav.recent': '最近文件',
    'nav.noFiles': '未打开文件',
    'nav.labels': '标签',
    'nav.metadata': '元数据',
    'nav.collapse': '收起侧栏',
    'nav.expand': '展开侧栏',

    // Tab names
    'tabs.profile': '轮廓图',
    'tabs.waterfall': '频率 × 相位',
    'tabs.timePhase': '时间 × 相位',
    'tabs.bandpass': '带通',
    'tabs.psrcat': 'PSRCAT 目录',

    // Metadata labels
    'meta.source': '波源',
    'meta.telescope': '望远镜',
    'meta.freq': '中心频率',
    'meta.bw': '带宽',
    'meta.nchan': '通道数',
    'meta.npol': '偏振数',
    'meta.nbin': '相位仓数',
    'meta.nsub': '子积分数',
    'meta.dm': '色散量',
    'meta.period': '周期',
    'meta.site': '站点',
    'meta.backend': '后端',

    // Settings
    'settings.title': '设置',
    'settings.general': '常规',
    'settings.appearance': '外观',
    'settings.advanced': '高级',
    'settings.language': '语言',
    'settings.theme': '主题',
    'settings.colorscale': '图表色阶',
    'settings.defaultView': '默认视图',
    'settings.recentLimit': '最近文件限制',
    'settings.backendPort': '后端端口',
    'settings.pythonPath': 'Python 路径',
    'settings.showWelcome': '显示欢迎界面',
    'settings.save': '保存',
    'settings.cancel': '取消',
    'settings.close': '关闭',

    // Shortcuts
    'shortcuts.title': '键盘快捷键',
    'shortcuts.open': '打开文件',
    'shortcuts.settings': '打开设置',
    'shortcuts.help': '显示帮助',
    'shortcuts.nextTab': '下个标签',
    'shortcuts.prevTab': '上个标签',

    // Context menu
    'ctx.open': '打开',
    'ctx.close': '关闭',
    'ctx.copyPath': '复制路径',
    'ctx.revealFinder': '在访达中显示',
    'ctx.addLabel': '添加标签',
    'ctx.removeLabel': '移除标签',

    // Status & Errors
    'status.ready': '就绪',
    'status.loading': '正在加载数据...',
    'status.backendOff': '后端掉线',
    'status.noFile': '未选择文件',
    'error.load': '加载存档失败',
    'error.backend': '无法连接到后端服务器',
    'error.python': '在指定路径下找不到 Python'
  }
}

export type TranslationKey = keyof typeof translations.en

export function useT() {
  const settings = useAtomValue(settingsAtom)
  const lang = settings.language

  return (key: TranslationKey) => {
    return translations[lang][key] || translations.en[key] || key
  }
}
