// ==UserScript==
// @name         VinSolutions v4.2 - Angel (botones+ Estilos + Resaltado Dual)
// @namespace    http://tampermonkey.net/
// @version      v4.2
// @description  Abre popup 'Log Call', añade iconos de copiado (con estilo mejorado) y resalta palabras clave Y nombres de usuario.
// @author       Angel Torres
// @match        *://*.vinsolutions.com/CarDashboard/Pages/CRM/SoldLog.aspx*
// @match        *://*.vinsolutions.com/CarDashboard/Pages/LeadManagement/ActiveLeads_WorkList.aspx*
// @match        *://*.vinsolutions.com/CarDashboard/Pages/CRM/ActiveLeads.aspx*
// @match        *://*.vinsolutions.com/CarDashboard/Pages/LeadManagement/LogCallV2/LogCallV2.aspx*
// @match        *://*.coxautoinc.com/CarDashboard/Pages/CRM/SoldLog.aspx*
// @match        *://*.coxautoinc.com/CarDashboard/Pages/LeadManagement/ActiveLeads_WorkList.aspx*
// @match        *://*.coxautoinc.com/CarDashboard/Pages/CRM/ActiveLeads.aspx*
// @match        *://*.coxautoinc.com/CarDashboard/Pages/LeadManagement/LogCallV2/LogCallV2.aspx*
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @run-at       document-idle
// @updateURL    https://github.com/Angeltorx/Vin-V04-Angel/blob/main/vinsolutions-angel.user.js
// @downloadURL  https://github.com/Angeltorx/Vin-V04-Angel/blob/main/vinsolutions-angel.user.js
// ==/UserScript==

(function() {
    'use strict';

    const SCRIPT_PREFIX = "Tampermonkey (VinSolutions v4.0)";
    const currentPath = window.location.pathname;
    console.log(`${SCRIPT_PREFIX}: Script INICIANDO en -> ${window.location.href}`);

    // =================================================================================
    //  BLOQUE 1: LÓGICA PARA EL PANEL PRINCIPAL (Abrir Popup)
    // =================================================================================
    if (
        currentPath.includes('/CarDashboard/Pages/CRM/SoldLog.aspx') ||
        currentPath.includes('/CarDashboard/Pages/LeadManagement/ActiveLeads_WorkList.aspx') ||
        currentPath.includes('/CarDashboard/Pages/CRM/ActiveLeads.aspx')
    ) {
        console.log(`${SCRIPT_PREFIX} [MainPanel]: Detectada URL de panel principal.`);
        const LEFT_PANEL_VIEW_ITEM_LINK_CLASS = 'viewitemlink';
        const LEFT_PANEL_ID_EXTRACTION_REGEX = /top\.viewItemGCID\((\d+),\s*(\d+)\)/;

        function handleCustomerLinkClick_LeftPanel(event) {
            const linkElement = event.currentTarget;
            const href = linkElement.getAttribute('href');
            if (href) {
                const match = href.match(LEFT_PANEL_ID_EXTRACTION_REGEX);
                if (match && match[1] && match[2]) {
                    const globalCustomerID = match[1];
                    const autoLeadID = match[2];
                    const logCallUrl = `/CarDashboard/Pages/LeadManagement/LogCallV2/LogCallV2.aspx?AutoLeadID=${autoLeadID}&GlobalCustomerID=${globalCustomerID}&V2Redirect=2`;
                    try {
                        if (typeof top.OpenWindow === 'function') top.OpenWindow(logCallUrl, 'LogCallEdit');
                        else window.open(logCallUrl, 'LogCallEdit', 'width=800,height=650,resizable=yes,scrollbars=yes');
                    } catch (e) {
                        window.open(logCallUrl, 'LogCallEdit', 'width=800,height=650,resizable=yes,scrollbars=yes');
                    }
                }
            }
        }

        function attachListenersToLinks_LeftPanel() {
            document.querySelectorAll(`a.${LEFT_PANEL_VIEW_ITEM_LINK_CLASS}`).forEach(link => {
                if (!link.dataset.logCallListenerAttachedPanel) {
                    link.addEventListener('click', handleCustomerLinkClick_LeftPanel);
                    link.dataset.logCallListenerAttachedPanel = 'true';
                }
            });
        }
        const observer = new MutationObserver(() => {
            clearTimeout(window.leftPanelDebounce);
            window.leftPanelDebounce = setTimeout(attachListenersToLinks_LeftPanel, 500);
        });
        observer.observe(document.body, { childList: true, subtree: true });
        attachListenersToLinks_LeftPanel();
    }
    // =================================================================================
    //  BLOQUE 2: LÓGICA PARA EL POPUP (Copiado y Resaltado Dual)
    // =================================================================================
    else if (currentPath.includes('/CarDashboard/Pages/LeadManagement/LogCallV2/LogCallV2.aspx')) {
        console.log(`${SCRIPT_PREFIX} [Popup]: Detectada URL de LogCallV2 Popup.`);

        GM_addStyle(`
            /* Estilos para iconos de copiado */
            .copy-icon-vs-unified { cursor: pointer; margin-left: 6px; font-size: 0.85em; display: inline-block; user-select: none; vertical-align: middle; }
            .copy-icon-vs-unified:hover { opacity: 0.7; }
            /* Estilo para alinear nombre y botón */
            div#CustomerData h4 {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            /* Estilos para resaltado de palabras clave (amarillo) */
            .resaltado-clave-vinsol { background-color: #FFD700; color: #B22222; font-weight: bold; padding: 1px 3px; border-radius: 3px; }
            /* Estilos para resaltado de nombres de usuario (verde) */
            .resaltado-nombre-vinsol { background-color: #58b96f; color: #f7fdf9; font-weight: bold; padding: 1px 3px; border-radius: 3px; }
        `);

        // --- Lógica de Resaltado ---
        const palabrasClave = ['option', 'options', 'xchange', 'exchange', 'pitch', 'program', 'offer', 'showroom', 'interested', 'interest', 'trade'];
        const regexPalabras = new RegExp(`\\b(${palabrasClave.join('|')})\\b`, 'gi');
        const nombresClave = ['JAY', 'KIARA', 'CHLOE B', 'BECCA', 'JAZ', 'JJ', 'CHRIS', 'NEA', 'DANI', 'MARK A', 'ANIKA', 'JESS', 'CHLOE', 'JUAN', 'JEFF', 'DARIA', 'GABBY'];
        nombresClave.sort((a, b) => b.length - a.length);
        const regexNombres = new RegExp(`(${nombresClave.join('|')})`, 'gi');

        function resaltarContenido(elementos, regex, claseCss, dataAttribute) {
             elementos.forEach(elem => {
                if (elem.dataset[dataAttribute]) return;
                const originalHTML = elem.innerHTML;
                const nuevoHTML = originalHTML.replace(regex, match => `<span class="${claseCss}">${match}</span>`);
                if (nuevoHTML !== originalHTML) elem.innerHTML = nuevoHTML;
                elem.dataset[dataAttribute] = "true";
            });
        }

        // --- Lógica de Copiado ---
        function addCopyIcon(targetElement, textToCopy) {
            if (targetElement.dataset.copyIconAdded === 'true') return;
            const icon = document.createElement('span');
            icon.className = 'copy-icon-vs-unified';
            icon.textContent = '⧉';
            icon.title = `Copiar: ${textToCopy}`;
            icon.addEventListener('click', (e) => {
                e.stopPropagation(); e.preventDefault();
                GM_setClipboard(textToCopy);
                e.currentTarget.textContent = '✔';
                setTimeout(() => { if (document.body.contains(e.currentTarget)) e.currentTarget.textContent = '📋'; }, 1500);
            });
            targetElement.appendChild(icon);
            targetElement.dataset.copyIconAdded = 'true';
        }

        // --- Función Maestra para el Popup ---
        function runAllPopupEnhancements() {
            // Tarea 1: Añadir iconos de copiado
            const customerDataContainer = document.getElementById('CustomerData');
            if (customerDataContainer) {
                const nameElement = customerDataContainer.querySelector('h4[data-bind="text: fullName"]');
                if (nameElement) {
                    const customerName = nameElement.textContent.trim();
                    if (customerName && customerName.toLowerCase() !== "name unknown") addCopyIcon(nameElement, customerName);
                }
                customerDataContainer.querySelectorAll('span[data-bind*="maskPhoneNumber"]').forEach(span => {
                    const phoneNumber = span.textContent.trim();
                    if (phoneNumber) addCopyIcon(span, phoneNumber);
                });
            }

            // Tarea 2: Resaltar palabras clave y nombres
            const notasDesc = document.querySelectorAll('div#NotesAndHistory span[data-bind="text: Description"]');
            const notasNombres = document.querySelectorAll('div#NotesAndHistory span[data-bind*="AssociatedUserFullName"]');
            resaltarContenido(notasDesc, regexPalabras, 'resaltado-clave-vinsol', 'resaltadoClave');
            resaltarContenido(notasDesc, regexNombres, 'resaltado-nombre-vinsol', 'resaltadoNombre');
            resaltarContenido(notasNombres, regexNombres, 'resaltado-nombre-vinsol', 'resaltadoNombre');
        }

        // --- Observador Unificado para el Popup ---
        const popupObserver = new MutationObserver(() => {
            clearTimeout(window.vsPopupDebounce);
            window.vsPopupDebounce = setTimeout(runAllPopupEnhancements, 300);
        });
        popupObserver.observe(document.body, { childList: true, subtree: true });
        runAllPopupEnhancements();
        console.log(`${SCRIPT_PREFIX} [Popup]: Observador unificado iniciado.`);
    }
})();
