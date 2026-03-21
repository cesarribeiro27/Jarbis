'use client'

import { useTranslations } from 'next-intl'

/**
 * DashboardRail — Barra lateral direita de 6 ícones
 * Usada em:  app/dashboards/[id]/page.jsx
 *            app/dashboards/novo/page.jsx
 *            app/admin/lab/page.jsx
 *
 * Para calibrar visualmente: /admin/lab → aba "Barra Lateral"
 */
export default function DashboardRail({
  blocks = [],
  globalDateFilter = {},
  sidePanel,
  sidebarOpen,
  selectedBlockId,
  togglePanel,
  setSidebarOpen,
  setSidePanel,
  setShowAiPanel,
  onAutoLayout,
}) {
  const t = useTranslations('dashboardEditor')

  const filterCount =
    blocks.filter(b => b.type === 'filter' || b.type === 'slider').length +
    (globalDateFilter.dateFrom || globalDateFilter.dateTo ? 1 : 0)
  const commentsCount = blocks.reduce(
    (s, b) => s + (b.config?.annotations?.length || 0), 0
  )

  const railBtns = [
    {
      id: 'edit', label: t('rail.edit'),
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
      badge: null,
      active: sidePanel === 'config' && sidebarOpen && !!selectedBlockId,
      disabled: !selectedBlockId,
      onClick: () => selectedBlockId && togglePanel('config'),
    },
    {
      id: 'dados', label: t('rail.data'),
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5v5c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 10v5c0 1.66 3.58 3 8 3s8-1.34 8-3v-5" /></svg>,
      badge: null,
      active: sidePanel === 'dados' && sidebarOpen,
      disabled: false,
      onClick: () => togglePanel('dados'),
    },
    {
      id: 'filtros', label: t('rail.filters'),
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" /></svg>,
      badge: filterCount || null,
      active: sidePanel === 'filtros' && sidebarOpen,
      disabled: false,
      onClick: () => togglePanel('filtros'),
    },
    {
      id: 'config', label: t('rail.config'),
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" strokeWidth={1.5} /></svg>,
      badge: null,
      active: sidePanel === 'config' && sidebarOpen && !selectedBlockId,
      disabled: false,
      onClick: () => togglePanel('config'),
    },
    {
      id: 'comentarios', label: t('rail.notes'),
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" /></svg>,
      badge: commentsCount || null,
      active: sidePanel === 'comentarios' && sidebarOpen,
      disabled: false,
      onClick: () => togglePanel('comentarios'),
    },
    {
      id: 'ia', label: t('rail.ai'),
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
      badge: null,
      active: false,
      disabled: false,
      onClick: () => setShowAiPanel && setShowAiPanel(true),
    },
    {
      id: 'auto', label: 'Organizar',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h10M4 18h6" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 14l2 2 4-4" /></svg>,
      badge: null,
      active: false,
      disabled: !onAutoLayout,
      onClick: () => onAutoLayout && onAutoLayout(),
    },
  ]

  return (
    <div className="hidden sm:flex w-[72px] bg-white border-l border-gray-200/80 flex-col items-center py-2 gap-[3px] shrink-0">
      <div className="flex flex-col items-center gap-[3px] w-full mb-auto">
        {railBtns.map((btn) => (
          <button
            key={btn.id}
            onClick={btn.onClick}
            disabled={btn.disabled}
            title={btn.label}
            className={`relative flex flex-col items-center justify-center gap-[3px] w-[50px] py-[14px] rounded-[11px] transition-all duration-150 ${
              btn.active
                ? 'bg-[#ede9fe] text-[#7c3aed]'
                : btn.disabled
                ? 'text-gray-200 cursor-not-allowed'
                : 'text-[#9ca3af] hover:text-[#374151] hover:bg-[#f3f4f6]'
            }`}
          >
            {btn.badge != null && (
              <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] bg-violet-600 text-white rounded-full text-[8px] font-bold flex items-center justify-center px-0.5 leading-none">
                {btn.badge > 9 ? '9+' : btn.badge}
              </span>
            )}
            {btn.icon}
            <span className="text-[9px] font-semibold leading-none">{btn.label}</span>
          </button>
        ))}
      </div>
      <div className="w-8 h-px bg-gray-100 my-1" />
      <div className="flex flex-col items-center gap-[3px] w-full">
        <button
          title={t('rail.helpTitle')}
          className="flex flex-col items-center justify-center gap-[3px] w-[50px] py-[14px] rounded-[11px] text-[#9ca3af] hover:text-[#374151] hover:bg-[#f3f4f6] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={1.5}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" /></svg>
          <span className="text-[9px] font-semibold leading-none">{t('rail.help')}</span>
        </button>
        <button
          title={sidebarOpen ? t('rail.closePanel') : t('rail.openPanel')}
          onClick={() => { if (sidebarOpen) { setSidebarOpen(false); setSidePanel(null) } else if (sidePanel) setSidebarOpen(true) }}
          className="flex flex-col items-center justify-center gap-[3px] w-[50px] py-[14px] rounded-[11px] text-[#9ca3af] hover:text-[#374151] hover:bg-[#f3f4f6] transition-colors"
        >
          <svg className={`w-5 h-5 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
          <span className="text-[9px] font-semibold leading-none">{sidebarOpen ? t('rail.close') : t('rail.open')}</span>
        </button>
      </div>
    </div>
  )
}
